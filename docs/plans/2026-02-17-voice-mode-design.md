# Voice Mode — Design

> Fullscreen floating orb voice interface with real speech-to-text for hands-free tax advisory conversations.

---

## Scope

Add a voice mode to the fullscreen Intelligence Panel. A floating orb/sphere UI listens via the browser's Web Speech API, shows thinking status updates from the existing `StatusPhase` system, and sends transcribed speech through `sendMessage`. The orb stays active for follow-up questions.

---

## Architecture

**Approach: Overlay Component** — a new `voice-mode.tsx` file rendered as a portal/overlay on top of the fullscreen panel. Self-contained with props for chat integration. Keeps page.tsx from growing further.

---

## 1. Component Interface

```typescript
// helio/apps/web/src/components/voice-mode.tsx

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  status: StatusPhase;
  statusMessage: string;
  isStreaming: boolean;
}
```

---

## 2. Visual States

The orb cycles through these states based on recognition + chat status:

| State | Visual | Status Text |
|-------|--------|-------------|
| **Idle/Listening** | Gentle float + breathe pulse, brand-to-violet gradient glow | "Listening..." |
| **Processing speech** | Orb contracts slightly, transcript text appears below | Shows interim transcript |
| **Thinking** | Orb morphs faster, glow intensifies, ripple effect | Status from `statusMessage` (e.g. "Computing tax position...") |
| **Responding** | Orb settles, soft steady glow | "Responding..." then fades |
| **Error** | Red flash, slight shake | "Couldn't hear that. Try again." |

---

## 3. Orb Design

- **Size:** ~120px diameter sphere
- **Position:** Center of viewport, with subtle `translateY` float animation (3s ease-in-out infinite, ±8px)
- **Gradient:** Radial gradient from `brand-500` center to `violet-500` edge, with soft outer glow (`box-shadow`)
- **Breathing:** Scale oscillation 1.0 → 1.05 → 1.0 (2s loop)
- **Listening active:** Concentric ring pulses radiating outward (like existing `mic-pulse-ring`)
- **Thinking:** Scale pulses faster (0.8s), glow color shifts through brand → violet → blue cycle
- **Float + breathe:** Gentle bob up/down ±8px, feels alive and organic

---

## 4. Interaction Flow

1. User clicks **mic/voice button** in the fullscreen panel header (next to maximize/minimize buttons)
2. Overlay appears with backdrop blur, orb fades in from center
3. `SpeechRecognition` starts automatically — orb enters listening state
4. User speaks → interim results shown below orb as faint text
5. On final result, transcript is sent via `onSend(transcript)`
6. Orb transitions to thinking state, showing `statusMessage` from the SSE stream
7. When `status` returns to `idle`, orb returns to listening state for follow-up
8. User taps orb or presses Escape to exit voice mode

---

## 5. Web Speech API Integration

```typescript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;   // One utterance at a time
recognition.interimResults = true; // Show partial results
recognition.lang = 'en-GB';
```

- `onresult`: capture final transcript, call `onSend(transcript)`
- `onerror`: show error state, auto-restart after 2s
- `onend`: if still in voice mode and not streaming, restart listening
- Feature detection: if `SpeechRecognition` not available, show "Voice not supported" message

---

## 6. Layout

```
┌─────────────────────────────────────────────┐
│  Fullscreen Panel (behind, dimmed)          │
│                                             │
│              ╭──────────╮                   │
│              │          │                   │
│              │   ◉ Orb  │  ← floating,      │
│              │          │    breathing       │
│              ╰──────────╯                   │
│                                             │
│          "Computing tax position..."        │
│                                             │
│              [ × Close ]                    │
└─────────────────────────────────────────────┘
```

---

## 7. Styling

- Backdrop: `bg-black/40 backdrop-blur-md` overlay
- Orb container: centered with flexbox
- Status text: `text-sm font-light text-white/70` below the orb
- Transcript text: `text-xs text-white/40` for interim results
- Close button: minimal, bottom of overlay
- All animations via framer-motion + CSS keyframes
- Follows existing glass-morphism aesthetic

---

## 8. Integration with page.tsx

- Add `const [voiceModeOpen, setVoiceModeOpen] = useState(false)` state
- Add mic button to fullscreen panel header (only visible in fullscreen mode)
- Render `<VoiceMode>` conditionally: `voiceModeOpen && panelMode === "fullscreen"`
- Pass `sendMessage`, `status`, `statusMessage`, `isStreaming` as props

---

## 9. Browser Compatibility

Web Speech API is supported in:
- Chrome (desktop + Android) — full support
- Safari (macOS + iOS) — full support with `webkitSpeechRecognition`
- Edge — full support
- Firefox — NOT supported

Show a graceful fallback message in unsupported browsers.
