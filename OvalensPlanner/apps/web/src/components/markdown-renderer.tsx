"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════
   HELIO MARKDOWN RENDERER
   Custom zero-dependency markdown → JSX renderer
   designed for LLM chat output in a financial context.
   ═══════════════════════════════════════════════════ */

interface MarkdownRendererProps {
  content: string;
}

/* ─── Block types ─── */

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; content: string }
  | { type: "paragraph"; content: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "numbered-list"; items: string[] }
  | { type: "code-block"; lang: string; code: string }
  | { type: "blockquote"; content: string }
  | { type: "hr" }
  | { type: "kv-row"; label: string; value: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "empty" };

/* ─── Parse markdown string into blocks ─── */

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (!line.trim()) {
      blocks.push({ type: "empty" });
      i++;
      continue;
    }

    // Code block (``` fenced)
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code-block", lang, code: codeLines.join("\n") });
      continue;
    }

    // Heading (# ## ### ####)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Table (| header | header |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row.split("|").slice(1, -1).map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        // Skip separator row (| --- | --- |)
        const startRow = tableLines[1].includes("---") ? 2 : 1;
        const rows = tableLines.slice(startRow).map(parseRow);
        blocks.push({ type: "table", headers, rows });
      }
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    // Bullet list (- or * or +)
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullet-list", items });
      continue;
    }

    // Numbered list (1. 2. 3.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "numbered-list", items });
      continue;
    }

    // Key-value row (Label: £123 or Label: 27%)
    const kvMatch = line.match(/^(.+?):\s*(£[\d,.]+(?:\.\d+)?|[\d.]+%?)$/);
    if (kvMatch) {
      blocks.push({ type: "kv-row", label: kvMatch[1], value: kvMatch[2] });
      i++;
      continue;
    }

    // Paragraph (default)
    blocks.push({ type: "paragraph", content: line });
    i++;
  }

  return blocks;
}

/* ─── Inline markdown → JSX ─── */

function renderInline(text: string): React.ReactNode[] {
  // Order matters — process most specific patterns first
  // Pattern: **bold**, *italic*, `code`, £amounts, percentages, [links](url)
  const regex =
    /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|£[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    const full = match[0];

    if (match[2]) {
      // ***bold italic***
      parts.push(
        <strong key={key++} className="font-semibold italic text-slate-900 dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900 dark:text-white">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      // *italic*
      parts.push(
        <em key={key++} className="italic text-slate-600 dark:text-zinc-300">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // `inline code`
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded-md text-[11.5px] font-mono bg-slate-100 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 border border-slate-200/60 dark:border-zinc-700/60"
        >
          {match[5]}
        </code>
      );
    } else if (match[6] && match[7]) {
      // [link](url)
      parts.push(
        <a
          key={key++}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 dark:text-brand-400 underline decoration-brand-300/40 dark:decoration-brand-600/40 underline-offset-2 hover:decoration-brand-500 transition-colors"
        >
          {match[6]}
        </a>
      );
    } else if (full.startsWith("£")) {
      // Currency
      parts.push(
        <span key={key++} className="font-mono font-medium text-slate-900 dark:text-white">
          {full}
        </span>
      );
    } else if (/\d+(?:\.\d+)?%$/.test(full)) {
      // Percentage
      parts.push(
        <span key={key++} className="font-mono font-medium text-slate-900 dark:text-white">
          {full}
        </span>
      );
    }

    lastIndex = match.index + full.length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}

/* ─── Block → JSX renderers ─── */

function HeadingBlock({ level, content }: { level: 1 | 2 | 3 | 4; content: string }) {
  const styles: Record<number, string> = {
    1: "text-[16px] font-semibold text-slate-900 dark:text-white mt-4 mb-2 tracking-tight",
    2: "text-[14.5px] font-semibold text-slate-900 dark:text-white mt-3.5 mb-1.5 tracking-tight",
    3: "text-[13.5px] font-medium text-slate-800 dark:text-zinc-100 mt-3 mb-1",
    4: "text-[13px] font-medium text-slate-700 dark:text-zinc-200 mt-2.5 mb-1 uppercase tracking-wide text-[11px]",
  };

  return (
    <div className={styles[level]}>
      <span className="inline-flex items-center gap-2">
        {level <= 2 && (
          <span className="w-0.5 h-4 rounded-full bg-gradient-to-b from-brand-400 to-violet-400 flex-shrink-0" />
        )}
        {renderInline(content)}
      </span>
    </div>
  );
}

function BulletListBlock({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5 my-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2.5 items-start">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400/60 dark:bg-brand-500/50 mt-[7px]" />
          <span className="flex-1 leading-relaxed">{renderInline(item)}</span>
        </div>
      ))}
    </div>
  );
}

function NumberedListBlock({ items }: { items: string[] }) {
  return (
    <div className="space-y-2 my-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2.5 items-start">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-[10px] font-medium mt-0.5">
            {i + 1}
          </span>
          <span className="flex-1 leading-relaxed">{renderInline(item)}</span>
        </div>
      ))}
    </div>
  );
}

function CodeBlockElement({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-200/70 dark:border-zinc-800/70">
      {lang && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 dark:bg-zinc-800/80 border-b border-slate-200/50 dark:border-zinc-700/50">
          <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {lang}
          </span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
          </span>
        </div>
      )}
      <pre className="px-4 py-3 overflow-x-auto bg-slate-50 dark:bg-zinc-900/80">
        <code className="text-[12px] font-mono leading-relaxed text-slate-700 dark:text-zinc-300">
          {code}
        </code>
      </pre>
    </div>
  );
}

function BlockquoteBlock({ content }: { content: string }) {
  return (
    <div className="my-2.5 pl-3.5 border-l-2 border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-950/10 rounded-r-lg py-2 pr-3">
      <div className="text-slate-600 dark:text-zinc-400 italic leading-relaxed">
        {renderInline(content)}
      </div>
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-150 dark:border-zinc-800/50 last:border-0">
      <span className="text-slate-500 dark:text-zinc-400">{renderInline(label)}</span>
      <span className="font-mono font-medium text-slate-900 dark:text-white text-[12px] tabular-nums">
        {value}
      </span>
    </div>
  );
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-zinc-800/50">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium text-slate-600 dark:text-zinc-300 border-b border-slate-200/70 dark:border-zinc-700/50"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-slate-100/80 dark:border-zinc-800/30 last:border-0 hover:bg-slate-50/40 dark:hover:bg-zinc-800/20 transition-colors"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-slate-700 dark:text-zinc-300 font-light"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main renderer ─── */

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  // Collapse consecutive empty blocks
  const rendered = blocks.reduce<React.ReactNode[]>((acc, block, i) => {
    if (block.type === "empty") {
      // Only add spacer if previous wasn't also empty
      const prevBlock = blocks[i - 1];
      if (prevBlock && prevBlock.type !== "empty") {
        acc.push(<div key={i} className="h-1.5" />);
      }
      return acc;
    }

    switch (block.type) {
      case "heading":
        acc.push(<HeadingBlock key={i} level={block.level} content={block.content} />);
        break;
      case "paragraph":
        acc.push(
          <p key={i} className="leading-relaxed">
            {renderInline(block.content)}
          </p>
        );
        break;
      case "bullet-list":
        acc.push(<BulletListBlock key={i} items={block.items} />);
        break;
      case "numbered-list":
        acc.push(<NumberedListBlock key={i} items={block.items} />);
        break;
      case "code-block":
        acc.push(<CodeBlockElement key={i} lang={block.lang} code={block.code} />);
        break;
      case "blockquote":
        acc.push(<BlockquoteBlock key={i} content={block.content} />);
        break;
      case "kv-row":
        acc.push(<KVRow key={i} label={block.label} value={block.value} />);
        break;
      case "table":
        acc.push(<TableBlock key={i} headers={block.headers} rows={block.rows} />);
        break;
      case "hr":
        acc.push(
          <div key={i} className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-700 to-transparent" />
          </div>
        );
        break;
    }
    return acc;
  }, []);

  return (
    <div className="text-[13px] font-light text-slate-700 dark:text-zinc-300 leading-[1.7]">
      {rendered}
    </div>
  );
});
