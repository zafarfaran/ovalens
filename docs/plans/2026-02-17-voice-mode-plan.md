# Voice Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a floating orb voice interface to the fullscreen Intelligence Panel that listens via the Web Speech API, shows thinking status updates, and sends transcribed speech through the existing chat pipeline.

**Architecture:** A self-contained `<VoiceMode>` overlay component in `voice-mode.tsx` receives `sendMessage`, `status`, `statusMessage`, and `isStreaming` as props. It manages its own `SpeechRecognition` instance and animation state. CSS keyframes in `globals.css` handle the orb's float, breathe, and pulse animations. Integration into `page.tsx` is minimal — one state variable, one button, one conditional render.

**Tech Stack:** React 18, framer-motion, Web Speech API (`SpeechRecognition`), CSS keyframes, Tailwind CSS

**Design doc:** `docs/plans/2026-02-17-voice-mode-design.md`

---

### Task 1: Add Orb CSS Keyframes to globals.css

**Files:**
- Modify: `helio/apps/web/src/app/globals.css` (append before the `/* ── Theme transition ──` section at line 511)

**Step 1: Add the orb animation keyframes**

Add these keyframes and utility classes just before the `/* ── Theme transition ──` comment (line 511):

```css
/* ── Voice orb animations (GPU-composited) ── */

@keyframes orb-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes orb-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes orb-breathe-float {
  0% { transform: translateY(0px) scale(1); }
  25% { transform: translateY(-4px) scale(1.03); }
  50% { transform: translateY(-8px) scale(1.05); }
  75% { transform: translateY(-4px) scale(1.03); }
  100% { transform: translateY(0px) scale(1); }
}

@keyframes orb-thinking {
  0% { transform: translateY(0px) scale(1); }
  25% { transform: translateY(-5px) scale(1.08); }
  50% { transform: translateY(-3px) scale(0.95); }
  75% { transform: translateY(-6px) scale(1.06); }
  100% { transform: translateY(0px) scale(1); }
}

@keyframes orb-ring-pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes orb-ring-pulse-delayed {
  0% { transform: scale(1); opacity: 0.3; }
  100% { transform: scale(2.6); opacity: 0; }
}

@keyframes orb-glow-shift {
  0%, 100% { box-shadow: 0 0 60px 20px rgba(92, 124, 250, 0.3), 0 0 120px 40px rgba(139, 92, 246, 0.15); }
  33% { box-shadow: 0 0 60px 20px rgba(139, 92, 246, 0.3), 0 0 120px 40px rgba(59, 130, 246, 0.15); }
  66% { box-shadow: 0 0 60px 20px rgba(59, 130, 246, 0.3), 0 0 120px 40px rgba(92, 124, 250, 0.15); }
}

@keyframes orb-error-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.orb-idle {
  animation: orb-breathe-float 3s ease-in-out infinite;
}

.orb-listening {
  animation: orb-breathe-float 2.5s ease-in-out infinite;
}

.orb-thinking {
  animation: orb-thinking 0.8s ease-in-out infinite;
}

.orb-error {
  animation: orb-error-shake 0.5s ease-in-out;
}

.orb-ring {
  animation: orb-ring-pulse 2s ease-out infinite;
}

.orb-ring-delayed {
  animation: orb-ring-pulse-delayed 2s ease-out 0.6s infinite;
}

.orb-glow-shift {
  animation: orb-glow-shift 3s ease-in-out infinite;
}
```

**Step 2: Verify the CSS file still parses**

Run from the project root:
```bash
cd helio && npx tailwindcss --content "apps/web/src/**/*.tsx" --output /dev/null 2>&1 || echo "CSS OK"
```

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/globals.css
git commit -m "feat(web): add voice orb CSS keyframe animations"
```

---

### Task 2: Create VoiceMode Component

**Files:**
- Create: `helio/apps/web/src/components/voice-mode.tsx`

**Context:** This is the main component. It renders an absolute overlay with a centered orb. It manages `SpeechRecognition` lifecycle and maps the `status` prop (from the SSE stream) to orb visual states.

**Step 1: Create the component file**

Create `helio/apps/web/src/components/voice-mode.tsx` with this complete implementation:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StatusPhase } from "@/hooks/useChat";
import { IconMic, IconStop } from "@/components/icons";

/* ─── Types ─── */

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  status: StatusPhase;
  statusMessage: string;
  isStreaming: boolean;
}

type OrbState = "idle" | "listening" | "processing" | "thinking" | "responding" | "error";

/* ─── SpeechRecognition type shim ─── */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

/* ─── Status → label mapping for the orb ─── */

const STATUS_LABELS: Partial<Record<StatusPhase, string>> = {
  understanding: "Understanding your question...",
  analyzing_income: "Analysing income sources...",
  checking_allowances: "Checking allowance status...",
  calculating: "Running tax calculations...",
  computing_tax: "Computing tax position...",
  building_dashboard: "Building dashboard...",
  searching_notes: "Searching meeting notes...",
  generating_response: "Generating response...",
};

/* ─── Component ─── */

export function VoiceMode({ isOpen, onClose, onSend, status, statusMessage, isStreaming }: VoiceModeProps) {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldRestartRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive orb state from chat status
  useEffect(() => {
    if (!isOpen) return;

    if (status === "idle" && !isStreaming) {
      // AI finished responding — go back to listening
      if (orbState === "thinking" || orbState === "responding") {
        setOrbState("listening");
        shouldRestartRef.current = true;
      }
    } else if (status === "generating_response") {
      setOrbState("responding");
    } else if (status !== "idle" && status !== "complete") {
      setOrbState("thinking");
    }
  }, [status, isStreaming, isOpen, orbState]);

  // Start/stop recognition based on orbState
  useEffect(() => {
    if (!isOpen) return;

    if (orbState === "listening" && shouldRestartRef.current) {
      shouldRestartRef.current = false;
      startRecognition();
    }
  }, [orbState, isOpen]);

  // Feature detection
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
    }
  }, []);

  // Start recognition when voice mode opens
  useEffect(() => {
    if (isOpen && supported) {
      setOrbState("listening");
      setTranscript("");
      setInterimTranscript("");
      setErrorMessage("");
      startRecognition();
    }
    return () => {
      stopRecognition();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [isOpen, supported]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition: SpeechRecognitionInstance = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onstart = () => {
      setOrbState("listening");
      setInterimTranscript("");
      setErrorMessage("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        setOrbState("processing");
      }

      if (final) {
        setTranscript(final);
        setInterimTranscript("");
        setOrbState("thinking");
        onSend(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        // No speech detected — restart silently
        shouldRestartRef.current = true;
        setOrbState("listening");
        return;
      }

      if (event.error === "aborted") return;

      setOrbState("error");
      setErrorMessage(
        event.error === "not-allowed"
          ? "Microphone access denied"
          : "Couldn't hear that. Try again."
      );

      // Auto-recover after 2s
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          setOrbState("listening");
          shouldRestartRef.current = true;
        }
      }, 2000);
    };

    recognition.onend = () => {
      // Auto-restart if we're still in voice mode and not streaming
      if (shouldRestartRef.current && !isStreaming) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  }, [onSend, isStreaming]);

  const stopRecognition = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopRecognition();
    onClose();
  }, [stopRecognition, onClose]);

  // Determine display text
  const displayText =
    orbState === "error"
      ? errorMessage
      : orbState === "processing"
        ? interimTranscript
        : orbState === "thinking" || orbState === "responding"
          ? statusMessage || STATUS_LABELS[status] || "Thinking..."
          : orbState === "listening"
            ? "Listening..."
            : "";

  // Orb CSS class
  const orbAnimClass =
    orbState === "error"
      ? "orb-error"
      : orbState === "thinking"
        ? "orb-thinking"
        : orbState === "listening" || orbState === "processing"
          ? "orb-listening"
          : "orb-idle";

  // Orb gradient based on state
  const orbGradient =
    orbState === "error"
      ? "from-red-500 to-red-600"
      : orbState === "thinking"
        ? "from-brand-500 via-violet-500 to-blue-500"
        : "from-brand-400 to-violet-500";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md"
        >
          {/* Unsupported browser fallback */}
          {!supported ? (
            <div className="text-center px-8">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <IconMic className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Voice not supported</p>
              <p className="text-white/40 text-xs font-light max-w-xs">
                Your browser doesn&apos;t support speech recognition. Try Chrome, Safari, or Edge.
              </p>
              <button
                onClick={handleClose}
                className="mt-6 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Transcript / last spoken text */}
              <AnimatePresence mode="wait">
                {transcript && (orbState === "thinking" || orbState === "responding") && (
                  <motion.div
                    key="transcript"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="mb-8 max-w-md text-center"
                  >
                    <p className="text-white/50 text-xs font-light">&ldquo;{transcript}&rdquo;</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The Orb */}
              <div className="relative">
                {/* Pulse rings (visible when listening) */}
                {(orbState === "listening" || orbState === "processing") && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-brand-400/20 orb-ring" />
                    <div className="absolute inset-0 rounded-full bg-violet-400/10 orb-ring-delayed" />
                  </>
                )}

                {/* Glow (visible when thinking) */}
                {orbState === "thinking" && (
                  <div className="absolute -inset-8 rounded-full orb-glow-shift" />
                )}

                {/* Main orb sphere */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${orbGradient} ${orbAnimClass} shadow-2xl`}
                  style={{
                    boxShadow:
                      orbState === "error"
                        ? "0 0 60px 20px rgba(239, 68, 68, 0.3)"
                        : orbState === "thinking"
                          ? undefined // handled by orb-glow-shift
                          : "0 0 60px 20px rgba(92, 124, 250, 0.25), 0 0 120px 40px rgba(139, 92, 246, 0.1)",
                  }}
                >
                  {/* Inner shine */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {orbState === "listening" || orbState === "idle" ? (
                      <IconMic className="w-8 h-8 text-white/80" />
                    ) : orbState === "error" ? (
                      <IconStop className="w-7 h-7 text-white/80" />
                    ) : (
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ scaleY: [0.4, 1, 0.4] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                            className="w-1 h-5 rounded-full bg-white/70 origin-center"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Status text */}
              <AnimatePresence mode="wait">
                {displayText && (
                  <motion.p
                    key={displayText}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`mt-6 text-sm font-light ${
                      orbState === "error"
                        ? "text-red-400"
                        : orbState === "processing"
                          ? "text-white/40"
                          : "text-white/60"
                    }`}
                  >
                    {displayText}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={handleClose}
                className="mt-10 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/50 hover:text-white/70 text-xs font-light transition-all duration-200 border border-white/5 hover:border-white/10 backdrop-blur-sm"
              >
                Press Esc or tap to close
              </motion.button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Verify the file compiles**

Run from the project root:
```bash
cd helio && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20
```

Note: There may be pre-existing TS errors in the project. Only check that `voice-mode.tsx` has no NEW errors.

**Step 3: Commit**

```bash
git add helio/apps/web/src/components/voice-mode.tsx
git commit -m "feat(web): add VoiceMode floating orb component with Web Speech API"
```

---

### Task 3: Wire VoiceMode into page.tsx

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx`

**Context:** We need to: (1) import VoiceMode, (2) add a `voiceModeOpen` state, (3) add a mic button in the fullscreen panel header, (4) render the VoiceMode overlay conditionally.

**Step 1: Add the import**

At the top of `page.tsx`, add the VoiceMode import after the existing component imports (after line 12, the TaxComputationBreakdown import):

```tsx
import { VoiceMode } from "@/components/voice-mode";
```

**Step 2: Add the state variable**

After the existing `isListening` state (line 357), add:

```tsx
const [voiceModeOpen, setVoiceModeOpen] = useState(false);
```

**Step 3: Add the voice mode button in the fullscreen panel header**

In the panel header's button group (around line 1193-1208), insert a voice mode button **before** the fullscreen toggle button but only when in fullscreen mode. Find this block:

```tsx
                    <div className="flex items-center gap-1.5">
                      <button className="text-[11px] font-light text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors">
                        Export <IconArrowRight className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => setPanelMode(panelMode === "fullscreen" ? "sidebar" : "fullscreen")}
```

Replace with:

```tsx
                    <div className="flex items-center gap-1.5">
                      <button className="text-[11px] font-light text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors">
                        Export <IconArrowRight className="w-2.5 h-2.5" />
                      </button>
                      {panelMode === "fullscreen" && (
                        <button
                          onClick={() => setVoiceModeOpen(true)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all"
                          title="Voice mode"
                        >
                          <IconMic className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setPanelMode(panelMode === "fullscreen" ? "sidebar" : "fullscreen")}
```

**Step 4: Render the VoiceMode overlay**

Inside the `<motion.aside>` for the Intelligence Panel, just before its closing `</motion.aside>` tag, add the VoiceMode component. Find the closing of the panel (after all panel content, the last `</div>` inside the aside):

Add this just before `</motion.aside>`:

```tsx
              {/* Voice mode overlay (fullscreen only) */}
              {panelMode === "fullscreen" && (
                <VoiceMode
                  isOpen={voiceModeOpen}
                  onClose={() => setVoiceModeOpen(false)}
                  onSend={(text) => {
                    setVoiceModeOpen(false);
                    sendMessage(text);
                  }}
                  status={status}
                  statusMessage={statusMessage}
                  isStreaming={isStreaming}
                />
              )}
```

**Important note on `onSend`:** We close voice mode and send the message. The orb handles the thinking state internally while it's open, but when the user speaks, the message gets sent through the normal chat pipeline. Since voice mode is an overlay *inside* the panel's `<motion.aside>`, it will be positioned correctly within the fullscreen panel.

**Wait — design revision:** Looking at the design again, the user wants the orb to STAY open and show status updates while AI thinks. So `onSend` should NOT close voice mode. Correct implementation:

```tsx
              {panelMode === "fullscreen" && (
                <VoiceMode
                  isOpen={voiceModeOpen}
                  onClose={() => setVoiceModeOpen(false)}
                  onSend={(text) => {
                    sendMessage(text);
                  }}
                  status={status}
                  statusMessage={statusMessage}
                  isStreaming={isStreaming}
                />
              )}
```

**Step 5: Verify the page compiles**

```bash
cd helio && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): wire VoiceMode overlay into fullscreen Intelligence Panel"
```

---

### Task 4: Manual Testing & Polish

**Files:**
- Possibly modify: `helio/apps/web/src/components/voice-mode.tsx` (if fixes needed)
- Possibly modify: `helio/apps/web/src/app/globals.css` (if animation tweaks needed)

**Step 1: Start the dev server**

```bash
cd helio && npm run dev --workspace=apps/web
```

**Step 2: Test the voice mode flow**

Open Chrome (best Web Speech API support) and navigate to the chat page. Test:

1. Dashboard must exist to see the panel — send a tax query first (e.g. "What's my tax position?")
2. Click the fullscreen button on the Intelligence Panel
3. Verify the mic button appears in the panel header (only in fullscreen mode)
4. Click the mic button — verify:
   - Overlay appears with backdrop blur
   - Orb fades in with spring animation
   - Browser asks for microphone permission (first time)
   - "Listening..." text appears below orb
   - Orb has floating + breathing animation
   - Pulse rings radiate outward
5. Speak a question — verify:
   - Interim transcript appears below orb as faint text
   - On final recognition, orb transitions to thinking state
   - Status text updates as SSE phases arrive
   - Orb animation changes to faster thinking morph
6. When AI finishes responding — verify:
   - Orb returns to listening state automatically
   - User can ask a follow-up without re-activating
7. Press Escape — verify overlay closes
8. Try in sidebar mode — verify mic button is NOT shown

**Step 3: Fix any issues found during testing**

Apply fixes as needed to the component or CSS.

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(web): polish voice mode after manual testing"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `globals.css` | CSS keyframes for orb float, breathe, pulse, glow, shake |
| 2 | `voice-mode.tsx` (new) | Self-contained VoiceMode overlay with SpeechRecognition |
| 3 | `page.tsx` | Wire in: import, state, button, render |
| 4 | Testing & polish | Manual testing flow, fix any issues |

Total: 3 files touched, 1 new file created.
