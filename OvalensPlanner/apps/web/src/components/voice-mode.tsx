"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { StatusPhase } from "@/hooks/useChat";

/* ─── Types ─── */

interface VoiceModeProps {
  onSend: (text: string) => void;
  status: StatusPhase;
  statusMessage: string;
  isStreaming: boolean;
  /** When provided, the dormant mic trigger is portaled into this element (inline in input bar). */
  triggerContainer?: HTMLElement | null;
}

type VoiceState =
  | "dormant"
  | "listening"
  | "processing"
  | "thinking"
  | "error";

/* ─── SpeechRecognition shims ─── */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechend: (() => void) | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ─── Status labels ─── */

const STATUS_LABELS: Partial<Record<StatusPhase, string>> = {
  understanding: "Understanding...",
  analyzing_income: "Analysing income...",
  checking_allowances: "Checking allowances...",
  calculating: "Calculating...",
  computing_tax: "Computing tax...",
  modelling_scenario: "Modelling scenario...",
  building_dashboard: "Building dashboard...",
  searching_notes: "Searching notes...",
  saving_observation: "Generating observations...",
  generating_response: "Responding...",
};

/* ─── Constants ─── */

const SILENCE_TIMEOUT_MS = 2000;
const ERROR_DISPLAY_MS = 2500;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

const SLIDE_TRANSITION = {
  type: "spring" as const,
  damping: 28,
  stiffness: 340,
  mass: 0.8,
};


/* ─── Ghost Whisper Voice Bar ─── */

export function VoiceMode({ onSend, status, statusMessage, isStreaming, triggerContainer }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("dormant");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [supported, setSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [toggleMode, setToggleMode] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const holdingRef = useRef(false);
  const sentRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const transcriptRef = useRef("");
  const voiceStateRef = useRef<VoiceState>("dormant");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Keep refs in sync for use in callbacks that would otherwise capture stale closures
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  // Feature detection
  useEffect(() => {
    if (!getSpeechRecognitionCtor()) setSupported(false);
  }, []);

  // Return to dormant when AI finishes responding
  useEffect(() => {
    if (voiceState !== "thinking") return;
    if ((status === "idle" || status === "complete") && !isStreaming) {
      setVoiceState("dormant");
    }
  }, [status, isStreaming, voiceState]);

  // Auto-clear error state
  useEffect(() => {
    if (voiceState === "error") {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setVoiceState("dormant"), ERROR_DISPLAY_MS);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [voiceState]);

  /* ── Audio level metering for visual feedback ── */

  const startAudioMetering = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Mic access may have been granted to SpeechRecognition but not getUserMedia — non-critical
    }
  }, []);

  const stopAudioMetering = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
    setAudioLevel(0);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  /* ── Send transcript to chat ── */

  const submitTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sentRef.current) return;
      sentRef.current = true;
      setVoiceState("thinking");
      setTranscript("");
      onSend(trimmed);
      stopAudioMetering();
    },
    [onSend, stopAudioMetering]
  );

  /* ── Reset silence timer — called whenever speech activity is detected ── */

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const currentState = voiceStateRef.current;
      if (currentState !== "listening" && currentState !== "processing") return;

      const text = transcriptRef.current.trim();
      if (text) {
        submitTranscript(text);
      }
      // Stop recognition — the onend handler will clean up
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    }, SILENCE_TIMEOUT_MS);
  }, [submitTranscript]);

  /* ── Start recognition ── */

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    sentRef.current = false;
    retryCountRef.current = 0;
    setTranscript("");
    setErrorMessage("");

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState("listening");
      startAudioMetering();
    };

    recognition.onaudiostart = () => {
      resetSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0].transcript;
        if (result.isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }

      const combined = (finalText + " " + interimText).trim();
      setTranscript(combined);
      transcriptRef.current = combined;

      if (combined) {
        setVoiceState("processing");
        resetSilenceTimer();
      }
    };

    recognition.onspeechend = () => {
      // Speech stopped — give a shorter window before auto-sending
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = transcriptRef.current.trim();
        if (text && !sentRef.current) {
          submitTranscript(text);
        }
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
      }, 800);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error;

      // These are benign — ignore
      if (err === "aborted") return;

      if (err === "no-speech") {
        // Retry a couple of times before giving up
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          retryCountRef.current++;
          setTimeout(() => {
            if (voiceStateRef.current === "listening" || voiceStateRef.current === "processing") {
              if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* ignore */ }
              }
              recognitionRef.current = null;
              startRecognition();
            }
          }, RETRY_DELAY_MS);
          return;
        }
        setErrorMessage("No speech detected — try again");
        setVoiceState("error");
        stopAudioMetering();
        return;
      }

      if (err === "not-allowed" || err === "service-not-allowed") {
        setErrorMessage("Microphone access denied");
      } else if (err === "network") {
        setErrorMessage("Network error — check connection");
      } else if (err === "audio-capture") {
        setErrorMessage("No microphone found");
      } else {
        setErrorMessage("Voice recognition failed");
      }
      setVoiceState("error");
      stopAudioMetering();
    };

    recognition.onend = () => {
      // If user is still holding V, this was an unexpected end — try to restart
      if (holdingRef.current && !sentRef.current) {
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          retryCountRef.current++;
          setTimeout(() => {
            if (holdingRef.current) startRecognition();
          }, RETRY_DELAY_MS);
          return;
        }
      }

      // Toggle mode: if we haven't sent yet, don't auto-dismiss
      if (toggleMode && !sentRef.current && !holdingRef.current) {
        const text = transcriptRef.current.trim();
        if (text) {
          submitTranscript(text);
        } else if (voiceStateRef.current !== "error" && voiceStateRef.current !== "thinking") {
          setVoiceState("dormant");
        }
      }

      // Push-to-talk mode: stopRecognition handles submission
      if (!holdingRef.current && !toggleMode) {
        if (voiceStateRef.current !== "error" && voiceStateRef.current !== "thinking") {
          setVoiceState("dormant");
        }
      }

      stopAudioMetering();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setErrorMessage("Could not start voice input");
      setVoiceState("error");
    }
  }, [startAudioMetering, stopAudioMetering, resetSilenceTimer, submitTranscript, toggleMode]);

  /* ── Stop recognition (push-to-talk release) ── */

  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const text = transcriptRef.current.trim();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }

    if (text && !sentRef.current) {
      submitTranscript(text);
    } else if (!sentRef.current) {
      setVoiceState("dormant");
    }
    recognitionRef.current = null;
  }, [submitTranscript]);

  /* ── Toggle mode (click mic button) ── */

  const handleToggle = useCallback(() => {
    if (isStreaming) return;
    if (voiceState === "thinking") return;

    if (voiceState === "dormant" || voiceState === "error") {
      setToggleMode(true);
      holdingRef.current = false;
      startRecognition();
    } else {
      // Currently listening — stop and send
      setToggleMode(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const text = transcriptRef.current.trim();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      recognitionRef.current = null;
      if (text && !sentRef.current) {
        submitTranscript(text);
      } else {
        setVoiceState("dormant");
      }
    }
  }, [isStreaming, voiceState, startRecognition, submitTranscript]);

  /* ── Push-to-talk (hold V key) ── */

  useEffect(() => {
    if (!supported) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "v" && e.key !== "V") return;
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (isStreaming) return;
      if (voiceStateRef.current === "thinking") return;

      // If toggle mode is active, cancel it
      if (toggleMode) {
        setToggleMode(false);
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch { /* ignore */ }
          recognitionRef.current = null;
        }
      }

      holdingRef.current = true;
      startRecognition();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "v" && e.key !== "V") return;
      if (!holdingRef.current) return;

      holdingRef.current = false;
      setToggleMode(false);
      stopRecognition();
    };

    // Handle edge case: window loses focus while V is held
    const onBlur = () => {
      if (holdingRef.current) {
        holdingRef.current = false;
        setToggleMode(false);
        stopRecognition();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [supported, isStreaming, toggleMode, startRecognition, stopRecognition]);

  /* ── Cleanup on unmount ── */

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (!supported) return null;

  const isVisible = voiceState !== "dormant";

  const displayText =
    voiceState === "error"
      ? errorMessage
      : voiceState === "processing"
        ? transcript || "Listening..."
        : voiceState === "listening"
          ? transcript || "Listening..."
          : voiceState === "thinking"
            ? statusMessage || STATUS_LABELS[status] || "Thinking..."
            : "";

  // Dynamic bar width based on audio level (listening/processing)
  const isActive = voiceState === "listening" || voiceState === "processing";
  const barScale = isActive ? 1 + audioLevel * 0.06 : 1;

  return (
    <>
      {/* ── Dormant mic trigger ── */}
      {voiceState === "dormant" && !isStreaming && (() => {
        const trigger = (
          <motion.button
            key="mic-trigger"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleToggle}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-transparent text-slate-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200 group/mic"
            title="Click to speak or hold V"
          >
            {/* Mic icon */}
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>

            {/* "V" shortcut badge — top-right corner, hidden on mobile (no keyboard) */}
            <span className="hidden md:flex absolute -top-1 -right-1 items-center justify-center w-[14px] h-[14px] rounded-[4px] bg-slate-200/80 dark:bg-zinc-700/80 text-[8px] font-semibold leading-none text-slate-500 dark:text-zinc-400 group-hover/mic:bg-brand-100 dark:group-hover/mic:bg-brand-900/50 group-hover/mic:text-brand-600 dark:group-hover/mic:text-brand-400 transition-colors duration-200">
              V
            </span>
          </motion.button>
        );
        return triggerContainer ? createPortal(trigger, triggerContainer) : (
          <div className="fixed bottom-5 right-6 z-50">{trigger}</div>
        );
      })()}

      {/* ── Whisper bar ── */}
      <AnimatePresence>
        {isVisible && (
          <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <motion.div
            key="whisper-bar"
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: barScale }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={SLIDE_TRANSITION}
            className="pointer-events-auto"
          >
            <div
              className={`
                flex items-center gap-2.5 px-4 py-2.5
                rounded-full backdrop-blur-2xl border
                shadow-lg shadow-black/10
                min-w-[220px] max-w-[420px]
                ${voiceState === "error"
                  ? "bg-red-950/70 border-red-500/25"
                  : voiceState === "thinking"
                    ? "bg-slate-950/75 border-brand-500/20"
                    : "bg-slate-950/70 border-white/[0.08]"
                }
              `}
            >
              {/* ── Left indicator ── */}
              <div className="flex-shrink-0 relative flex items-center justify-center w-5 h-5">
                {isActive ? (
                  <>
                    {/* Audio-reactive ring */}
                    <motion.div
                      animate={{
                        scale: [1, 1.4 + audioLevel * 1.2, 1],
                        opacity: [0.4, 0.1, 0.4],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-brand-400/30"
                    />
                    {/* Core dot — pulses with audio */}
                    <motion.div
                      animate={{
                        scale: 1 + audioLevel * 0.4,
                      }}
                      transition={{ duration: 0.1 }}
                      className="w-2.5 h-2.5 rounded-full bg-brand-400"
                    />
                  </>
                ) : voiceState === "thinking" ? (
                  <div className="flex gap-[2.5px] items-center h-full">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [0.35, 1, 0.35] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeInOut",
                        }}
                        className="w-[2.5px] h-3.5 rounded-full bg-brand-400/80 origin-center"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                )}
              </div>

              {/* ── Text ── */}
              <p
                className={`
                  text-[12px] font-light leading-snug flex-1 min-w-0
                  ${voiceState === "error"
                    ? "text-red-300/90"
                    : voiceState === "processing"
                      ? "text-white/80"
                      : voiceState === "listening"
                        ? "text-white/50"
                        : "text-white/50"
                  }
                `}
              >
                <span className="block truncate">{displayText}</span>
              </p>

              {/* ── Right actions ── */}
              {isActive && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Cancel button */}
                  <button
                    onClick={() => {
                      sentRef.current = true;
                      if (recognitionRef.current) {
                        try { recognitionRef.current.abort(); } catch { /* ignore */ }
                        recognitionRef.current = null;
                      }
                      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                      setTranscript("");
                      setVoiceState("dormant");
                      setToggleMode(false);
                      stopAudioMetering();
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/10 transition-colors"
                    title="Cancel"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {/* Send button — appears when there's text */}
                  {transcript.trim() && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => {
                        if (recognitionRef.current) {
                          try { recognitionRef.current.stop(); } catch { /* ignore */ }
                          recognitionRef.current = null;
                        }
                        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                        submitTranscript(transcriptRef.current);
                        setToggleMode(false);
                      }}
                      className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white hover:bg-brand-400 transition-colors"
                      title="Send now"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  )}

                  {/* Key hint */}
                  {!toggleMode && (
                    <span className="text-[10px] font-mono text-white/20 tracking-wide">
                      V
                    </span>
                  )}
                </div>
              )}

              {/* ── Thinking shimmer overlay ── */}
              {voiceState === "thinking" && (
                <motion.div
                  className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-brand-400/[0.06] to-transparent"
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
