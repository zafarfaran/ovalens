"use client";

import { memo, useMemo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

function isPipeTableRow(line: string): boolean {
  const cleaned = line.trim().replace(/^[-*+]\s+/, "").trim();
  const pipes = (cleaned.match(/\|/g) || []).length;
  return pipes >= 2;
}

function normalisePipeRow(raw: string): string {
  let line = raw.trim();
  line = line.replace(/^[-*+]\s+/, "").trim();
  if (!line.startsWith("|")) line = `| ${line}`;
  if (!line.endsWith("|")) line = `${line} |`;
  return line;
}

function rowToCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function cellsToRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function isSeparatorRow(row: string): boolean {
  return /^\|\s*:?[-—]{3,}:?\s*(\|\s*:?[-—]{3,}:?\s*)+\|?$/.test(row.trim());
}

function isPipeNoiseBullet(line: string): boolean {
  return /^\s*[-*+]\s*\|+\s*$/.test(line.trim());
}

function repairPipeTables(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();

    // Drop stray stream artefact lines that are just pipes.
    if (/^\|+\s*$/.test(current)) {
      continue;
    }
    // Drop list artefacts like "- |" produced by chunking.
    if (isPipeNoiseBullet(current)) {
      continue;
    }

    if (!isPipeTableRow(current)) {
      out.push(lines[i]);
      continue;
    }

    const block: string[] = [];
    while (i < lines.length) {
      const candidate = lines[i].trim();
      if (/^\|+\s*$/.test(candidate)) {
        i++;
        continue;
      }
      if (isPipeNoiseBullet(candidate)) {
        i++;
        continue;
      }
      if (!isPipeTableRow(candidate)) break;
      block.push(normalisePipeRow(candidate));
      i++;
    }
    i--; // compensate for outer loop increment

    if (block.length < 2) {
      out.push(...block);
      continue;
    }

    const rows = block.map(rowToCells);
    const maxCols = Math.max(...rows.map((r) => r.length), 2);
    const padded = rows.map((r) =>
      r.length >= maxCols ? r.slice(0, maxCols) : [...r, ...Array(maxCols - r.length).fill("")]
    );

    const header = cellsToRow(padded[0]);
    const hasSeparator = block.length >= 2 && isSeparatorRow(block[1]);
    // Make sure tables are isolated from surrounding list/paragraph context.
    if (out.length > 0 && out[out.length - 1].trim() !== "") {
      out.push("");
    }
    out.push(header);

    if (hasSeparator) {
      out.push(cellsToRow(Array(maxCols).fill("---")));
      for (let r = 2; r < padded.length; r++) {
        out.push(cellsToRow(padded[r]));
      }
    } else {
      out.push(cellsToRow(Array(maxCols).fill("---")));
      for (let r = 1; r < padded.length; r++) {
        out.push(cellsToRow(padded[r]));
      }
    }
    if (out.length > 0 && out[out.length - 1].trim() !== "") {
      out.push("");
    }
  }

  return out.join("\n");
}

function fixUnbalancedBoldMarkers(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const count = (line.match(/\*\*/g) || []).length;
      if (count % 2 === 0) return line;
      const trimmed = line.trim();

      // Trailing dangling bold marker, e.g. "Key Findings**"
      if (/\*\*$/.test(trimmed) && !/^\*\*/.test(trimmed)) {
        return line.replace(/\*\*\s*$/, "");
      }
      // Leading dangling bold marker, e.g. "**Mitchell Household..."
      if (/^\*\*/.test(trimmed) && !/\*\*$/.test(trimmed)) {
        return `${line}**`;
      }
      // Fallback: remove one dangling marker.
      return line.replace(/\*\*/, "");
    })
    .join("\n");
}

function normalizeMarkdown(input: string): string {
  let text = input.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");

  // Normalise quadruple/double-bold so it renders as bold (**** or ****** -> **).
  text = text.replace(/\*\*\*\*\*?/g, "**");

  // Break bold-numbered list items onto their own lines so they don't render as one blob.
  // e.g. "**1. X** ****2. Y****" -> "**1. X**\n**2. Y**" (after **** -> ** above).
  text = text.replace(/([^\n])(\*\*+\s*\d+\.)/g, "$1\n$2");
  // Convert bold-wrapped numbered items into plain markdown list items.
  text = text.replace(/^\s*\*\*\s*(\d+\.\s.*)\s*\*\*\s*$/gm, "$1");
  text = text.replace(/^\s*\*\*\s*(\d+\.\s+)/gm, "$1");

  // Put headings on their own lines and ensure heading marker spacing.
  text = text.replace(/([^\n])([ \t]*#{1,6}[ \t]+)/g, "$1\n$2");
  text = text.replace(/^([ \t]*#{1,6})([^\s#])/gm, "$1 $2");

  // Break ordered / bullet lists when they are glued to previous text.
  text = text.replace(/([^\n])([ \t]+\d{1,3}\.[ \t]+)/g, "$1\n$2");
  text = text.replace(/([^\n])([ \t]+[-*+][ \t]+)/g, "$1\n$2");

  // Ensure blockquotes and horizontal rules start on new lines.
  text = text.replace(/([^\n])([ \t]*>[ \t]+)/g, "$1\n$2");
  text = text.replace(/([^\n])([ \t]*(?:\*{3,}|-{3,}|_{3,})[ \t]*$)/gm, "$1\n$2");

  // Convert "###Title### 2. Next" style collapse into separate lines.
  text = text.replace(/(#{1,6}[^\n#]+?)\s*(?=#{1,6}\s)/g, "$1\n");
  // Fix sentence boundaries collapsed by token streaming: "...:Now" -> "...: Now"
  text = text.replace(/([:.;!?])([A-Z])/g, "$1 $2");

  text = fixUnbalancedBoldMarkers(text);

  // If stream chunk ends with an unclosed fenced block, close it for stable rendering.
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) {
    text += "\n```";
  }

  text = repairPipeTables(text);

  return text.trimEnd();
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-[16px] font-semibold text-slate-900 dark:text-white mt-4 mb-2 tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-white mt-3.5 mb-1.5 tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13.5px] font-medium text-slate-800 dark:text-zinc-100 mt-3 mb-1">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-medium text-slate-700 dark:text-zinc-200 mt-2.5 mb-1">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="leading-relaxed mb-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2.5 pl-3.5 border-l-2 border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-950/10 rounded-r-lg py-2 pr-3 italic text-slate-600 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => (
    <div className="my-4 flex items-center gap-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-700 to-transparent" />
    </div>
  ),
  pre: ({ children }) => (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-200/70 dark:border-zinc-800/70">
      <pre className="px-4 py-3 overflow-x-auto bg-slate-50 dark:bg-zinc-900/80">
        {children}
      </pre>
    </div>
  ),
  code: ({ className, children }) => {
    const lang = className?.replace("language-", "") || "";
    if (!className) {
      return (
        <code className="px-1.5 py-0.5 rounded-md text-[11.5px] font-mono bg-slate-100 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 border border-slate-200/60 dark:border-zinc-700/60">
          {children}
        </code>
      );
    }
    return (
      <code
        className="text-[12px] font-mono leading-relaxed text-slate-700 dark:text-zinc-300"
        data-language={lang || undefined}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 overflow-x-auto">
      <table className="w-full text-[12px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50/80 dark:bg-zinc-800/50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-zinc-300 border-b border-slate-200/70 dark:border-zinc-700/50">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-slate-700 dark:text-zinc-300 font-light border-b border-slate-100/80 dark:border-zinc-800/30">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a
      href={href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-600 dark:text-brand-400 underline decoration-brand-300/40 dark:decoration-brand-600/40 underline-offset-2 hover:decoration-brand-500 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-600 dark:text-zinc-300">{children}</em>
  ),
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const normalized = useMemo(() => normalizeMarkdown(content), [content]);

  return (
    <div className="text-[13px] font-light text-slate-700 dark:text-zinc-300 leading-[1.7]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});
