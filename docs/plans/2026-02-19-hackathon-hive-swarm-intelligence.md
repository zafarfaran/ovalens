# Hackathon Brainstorm: Local-First Hybrid AI
**Hackathon**: Google DeepMind x Cactus Compute x AI Tinkerers (One-Day, Six-City Global)
**Date**: 2026-02-19
**Team Size**: 2 people
**Devices**: Mix of MacBooks + phones
**Tech Stack**: FunctionGemma (local) + Cactus Compute (runtime) + Gemini APIs (cloud)
---

## Table of Contents
1. [Technology Research](#technology-research)
2. [All Ideas (23 Concepts)](#all-ideas)
3. [Selected Project: "Hive" Deep-Dive](#selected-project-hive)
4. [Technical Architecture](#technical-architecture)
5. [One-Day Build Plan](#one-day-build-plan)
6. [Demo Script](#demo-script)
7. [Judging Strategy](#judging-strategy)
---

## Technology Research

### FunctionGemma

- **What**: Gemma 3 270M fine-tuned for function calling on edge devices
- **Parameters**: 270M (tiny -- runs on phones)
- **Output format**: `<start_function_call>call:function_name{param1:value1}<end_function_call>`
- **On-device performance** (Samsung S25 Ultra, INT8): ~1,718 tok/s prefill, ~126 tok/s decode, 0.3s time-to-first-token
- **Model size**: 253 MB (Q4_K_M quantized), 288 MB (INT8)
- **RAM**: ~550 MB peak
- **Out-of-box accuracy**: ~58% on function calling (jumps to ~85% after fine-tuning)
- **Limitations**: Text-only, no vision/audio, intentionally undertrained for general use, weak at parallel function calls (39%)
- **Strength**: Fast, private, free, purpose-built for translating natural language into structured API calls

### Cactus Compute

- **What**: Low-latency AI inference engine for mobile/desktop
- **Core**: C/C++ with ARM-optimized kernels
- **Quantization**: INT4 and INT8 support
- **SDKs**: Flutter, React Native, Kotlin Multiplatform, Swift, Python, Rust
- **Mac M4 Pro performance** (Gemma 3 270M): 582 tok/s prefill, 77 tok/s decode, 76 MB RAM
- **Built-in**: Tool calling support, agentic workflows, cloud handoff

### Gemini APIs (Cloud Fallback)

- **Role**: Complex reasoning, multi-step planning, threat analysis
- **Context window**: Up to 2M tokens (Gemini 1.5 Pro)
- **Capabilities**: Multimodal (text + vision + audio), strong common-sense reasoning
- **Latency**: Network round-trip (100-2000ms depending on complexity)
- **Cost**: Per-token API pricing

### Hackathon Judging Criteria (from past DeepMind hackathons)

| Criterion | Weight | What Wins |
|-----------|--------|-----------|
| Innovation / Wow Factor | 30% | "I have never seen that before" |
| Technical Execution | 40% | Working demo, clean architecture |
| Beyond Chat Interfaces | Bonus | Games, physical devices, visualizations |
| Privacy Story | Bonus | Visible data-stays-local narrative |
| Visible Routing | Bonus | Audience can SEE local vs cloud decisions |

---

## All Ideas

### Category: Privacy & Security

**1. "Ghost Protocol" -- Privacy-Aware Intelligent Camera**
Real-time camera feed where a local model redacts sensitive content (faces, screens, documents) on-device before any frame is sent to cloud. Cloud performs rich scene understanding on the redacted feed. Split-screen demo: raw feed (local only) vs what the cloud sees (redacted).

**2. "Nightwatch" -- Privacy-by-Design Security Camera**
Home security where ALL video processing is on-device. Local model detects people, packages, vehicles and generates text descriptions. Only text summaries go to cloud ("unknown person at front door, 2:15 AM"). Cloud does risk assessment. Raw video never leaves the device.

**3. "Checkpoint" -- Real-Time Fact Armor**
While reading any article, the local model continuously extracts claims and flags suspicious ones against a local knowledge base. Complex claims escalate to cloud for deep verification with sources. What you read never leaves your device.

### Category: Communication & Language

**4. "Polyglot" -- Zero-Latency Translator with Cultural Bridge**
Local model handles real-time speech-to-text and basic translation instantly. Detects idioms and cultural references, routes to cloud for cultural context enrichment. Visible routing: green (local) vs blue (cloud) indicators.

**5. "Babel Fish" -- Live Sign Language Bridge**
Camera captures sign language. Local model recognizes common signs instantly and displays text/speaks aloud. Complex combinations escalate to cloud for contextual interpretation. Works fully offline for basic communication.

### Category: Creative & Entertainment

**6. "Conductor" -- Air-Conduct a Virtual Orchestra**
Wave hands in front of camera. Local model maps gestures to musical parameters in real-time via function calls (tempo, volume, instrument). Cloud handles complex composition requests ("make it more dramatic", "add a jazz bridge"). You conduct music from thin air.

**7. "Reflex" -- AI Game with Split Intelligence**
Real-time game where local model controls game mechanics at sub-100ms (enemy AI, difficulty, physics) while cloud generates narrative, puzzles, and world-building. Player experiences seamless intelligence at two speeds.

**8. "Mime" -- Body-to-Avatar in Real-Time**
Camera captures movements. Local model maps skeleton positions to a virtual character at 60fps via function calls. Cloud handles style transfer ("make me move like a ninja") and emotion enhancement.

**9. "Forge" -- Voice-to-UI Builder**
Speak what you want: "a login page with dark theme." Local model instantly generates structured wireframe via function calls. Cloud handles complex design requests. Iterate by voice in real-time.

### Category: Productivity & Intelligence

**10. "Arbiter" -- Split-Brain Debater (Thinking Fast vs Slow)**
Local model gives instant "gut reaction" with confidence score. Cloud provides slow, thorough analysis. UI shows Kahneman's System 1 vs System 2 side by side, highlighting agreements and disagreements.

**11. "Sentinel" -- Code Privacy Firewall**
Local model does instant, always-on code review as you type (private). Complex security issues escalate to cloud using sanitized/abstracted code patterns. Your proprietary code never leaves your machine.

**12. "Exocortex" -- Wearable Second Brain**
Continuously indexes everything you see/hear/read on-device. Local model searches on-device memory index for simple queries. Complex pattern queries escalate to cloud with anonymized summaries only.

**13. "Oracle" -- Predictive Intent Interface**
Local model predicts not just next word but full intent -- pre-rendering UI states, pre-fetching data, pre-composing responses. Speculatively computes 3-4 possible futures. Cloud handles the one you pick.

### Category: Sensing & Environment

**14. "Hive" -- Multi-Device Swarm Intelligence** (SELECTED)
3-4 devices form a local network. Each runs FunctionGemma via Cactus. Swarm fuses sensor data to collectively monitor a room. Cloud handles threat assessment when anomalies detected. See deep-dive below.

**15. "Radar" -- Real-Time Emotion Dashboard for Meetings**
Local model analyzes facial expressions and voice tone of meeting participants in real-time on-device. Private dashboard shows engagement, confusion, interest. Cloud provides strategic coaching. All biometric data stays local.

**16. "Doppler" -- Universal Sound Brain**
Phone listens continuously. Local model identifies sounds in real-time (doorbell, baby crying, glass breaking, smoke alarm) and triggers function calls. Cloud handles ambiguous sounds and pattern analysis. All raw audio stays local.

**17. "FieldGuide" -- Offline Nature Identifier**
Point camera at plant, insect, bird. Local model gives instant classification. Low confidence or dangerous species escalates to cloud for expert ID with safety warnings. Works fully offline.

**18. "Lens" -- AR Expert-on-Shoulder**
Point camera at anything (circuit board, engine, equation). Local model instantly identifies and overlays labels. Complex questions escalate to cloud. Like having an expert permanently looking over your shoulder.

### Category: Health & Wellness

**19. "Whisper Wall" -- Private Voice Journal with Emotional Intelligence**
Speak freely. Local model detects emotion, sentiment, stress on-device. All audio stays local. When concerning patterns detected over time, escalates anonymized emotional patterns to cloud for wellbeing recommendations.

**20. "Mirror" -- Real-Time Presentation Coach**
Camera analyzes body language, speaking pace, filler words, eye contact in real-time with instant overlay feedback. Cloud analyzes argument structure and persuasiveness after each segment.

### Category: Data & Analytics

**21. "Pulse" -- Live City Heartbeat**
Phone sensors (noise, movement, light, pressure) + public APIs create real-time "vitality score" for surroundings. Local model processes sensor data. Cloud adds city-wide analysis and anomaly detection. Beautiful live visualization.

### Category: Multi-Device

**22. "Phantom" -- Gesture-to-Action Controller**
Camera watches hand gestures. Local model instantly maps common gestures to device actions via function calls. Complex gesture sequences escalate to cloud. Zero-latency basic control.

**23. "TaxShield" -- Privacy-First Financial Advisor**
Financial data processed entirely on-device. Local model handles tax calculations. Complex planning scenarios escalate to cloud with anonymized numbers only. Split-screen shows what stays local vs what cloud sees.

---

## Selected Project: "Hive" -- Multi-Device Swarm Security Monitor

### Concept

Multiple devices (laptops + phones) form a sensor network, each watching a different zone of a room. Each device runs FunctionGemma locally to detect and classify movement. The swarm fuses detections across devices to track people moving through the space. When anomalies are detected (restricted zone entry, lingering, unusual patterns), the coordinator escalates to Gemini cloud for threat assessment. **Raw video never leaves any device** -- only structured text events flow between nodes.

### Why This Wins

1. **Nobody demos multi-device coordination** -- physically unique, unforgettable
2. **The routing is visceral** -- audience sees local processing on each device, data flowing between them, and the cloud escalation moment
3. **Privacy story writes itself** -- raw video stays on-device, only text events move
4. **Technical depth** -- mesh networking, sensor fusion, intelligent routing, cloud escalation
5. **Interactive demo** -- judges can walk through the monitored space themselves

### Hybrid Approach: Python Power Nodes + Web Light Nodes

**Laptops (Power Nodes)** -- Approach A:
- Python + Cactus Python SDK running FunctionGemma
- Webcam capture with OpenCV
- Full processing capability, reliable, easy to debug
- Connected to coordinator via WebSocket
**Phones (Light Nodes)** -- Approach C:
- Browser-based, zero installation -- just open a URL
- Camera access via WebRTC/getUserMedia
- FunctionGemma via Transformers.js (lighter, slower but functional)
- OR: send frames to coordinator for processing (simpler)
- Any device with a browser can join the swarm instantly
**Why both**: Laptops are your reliable workhorses for the demo. Phones are the "wow, anyone can join" moment -- invite a judge to open the URL on their phone and watch it join the swarm live.

---

## Technical Architecture

### System Overview

```
PHONE NODES (Browser)                    LAPTOP NODES (Python)
┌─────────────────────┐                  ┌─────────────────────────┐
│ Camera (getUserMedia)│                  │ Camera (OpenCV)         │
│ Transformers.js      │                  │ Cactus SDK              │
│ FunctionGemma (WASM) │                  │ FunctionGemma (native)  │
│ Motion detection     │                  │ Person detection        │
│ → Structured events  │                  │ → Structured events     │
└──────────┬──────────┘                  └───────────┬─────────────┘
           │ WebSocket                               │ WebSocket
           │ {type,zone,direction,confidence}         │ {type,zone,direction,confidence}
           v                                         v
┌────────────────────────────────────────────────────────────────────┐
│                     COORDINATOR SERVER                             │
│  (Python FastAPI on one laptop)                                    │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Event Fusion  │  │ Path Tracker │  │ Anomaly Detector         │ │
│  │ Correlate     │  │ Cross-device │  │ Lingering, restricted    │ │
│  │ detections    │  │ person paths │  │ zones, unusual patterns  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘ │
│         │                 │                        │               │
│         └────────┬────────┘                        │               │
│                  │                                 │               │
│    ┌─────────────v──────────┐    ┌─────────────────v────────────┐  │
│    │ LOCAL RESPONSE (90%)   │    │ CLOUD ESCALATION (10%)       │  │
│    │ Log event, update map  │    │ → Gemini API                 │  │
│    │ Track person movement  │    │ → Threat assessment          │  │
│    │ Normal activity        │    │ → Behavior pattern analysis  │  │
│    └────────────────────────┘    └──────────────────────────────┘  │
│                                                                    │
│  WebSocket broadcast to dashboard ──────────────────────────────── │
└────────────────────────────────────────────────────────────────────┘
           │
           v
┌────────────────────────────────────────────────────────────────────┐
│                       LIVE DASHBOARD                               │
│  (React web app, displayed on projector)                           │
│                                                                    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │
│  │ SPATIAL MAP       │ │ EVENT FEED       │ │ ROUTING PANEL      │ │
│  │ Room layout       │ │ Real-time log    │ │ Local: ████░ 90%  │ │
│  │ Device positions  │ │ of detections    │ │ Cloud: █░░░░ 10%  │ │
│  │ Person paths      │ │ across all nodes │ │                    │ │
│  │ Zone highlights   │ │ Color-coded by   │ │ Latency comparison │ │
│  │ Anomaly alerts    │ │ source device    │ │ Local: 12ms        │ │
│  └──────────────────┘ └──────────────────┘ │ Cloud: 847ms       │ │
│                                             └────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PRIVACY PANEL                                                │  │
│  │ [Device Camera Feed]  →  [Structured Event]  →  [Cloud Sees]│  │
│  │ (raw video, local)       {person, zone_A,        "movement   │  │
│  │                           east, 0.87}             in zone A" │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### FunctionGemma Tool Definitions

```python
# Tools registered with FunctionGemma on each node
tools = [
    {
        "name": "report_detection",
        "description": "Report a detected entity in the camera's zone",
        "parameters": {
            "type": "object",
            "properties": {
                "entity_type": {"type": "string", "enum": ["person", "vehicle", "package", "animal", "unknown"]},
                "zone_id": {"type": "string", "description": "The zone this device monitors"},
                "direction": {"type": "string", "enum": ["north", "south", "east", "west", "stationary"]},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "speed": {"type": "string", "enum": ["stationary", "slow", "normal", "fast"]},
                "description": {"type": "string", "description": "Brief text description of what was observed"}
            },
            "required": ["entity_type", "zone_id", "confidence"]
        }
    },
    {
        "name": "report_anomaly",
        "description": "Report unusual activity that may need attention",
        "parameters": {
            "type": "object",
            "properties": {
                "anomaly_type": {"type": "string", "enum": ["lingering", "restricted_zone", "unusual_movement", "object_left", "crowd"]},
                "zone_id": {"type": "string"},
                "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                "description": {"type": "string"}
            },
            "required": ["anomaly_type", "zone_id", "severity"]
        }
    },
    {
        "name": "report_clear",
        "description": "Report that the zone is clear with no activity",
        "parameters": {
            "type": "object",
            "properties": {
                "zone_id": {"type": "string"}
            },
            "required": ["zone_id"]
        }
    }
]
```

### Coordinator Tool Definitions (for Gemini Cloud Escalation)

```python
# Tools for Gemini cloud model
cloud_tools = [
    {
        "name": "assess_threat",
        "description": "Analyze a sequence of events across multiple zones for security threats",
        "parameters": {
            "type": "object",
            "properties": {
                "events": {"type": "array", "items": {"type": "object"}},
                "time_window_seconds": {"type": "number"},
                "zone_layout": {"type": "object", "description": "Spatial relationship between zones"}
            }
        }
    },
    {
        "name": "predict_movement",
        "description": "Predict where a tracked entity will move next based on behavior patterns",
        "parameters": {
            "type": "object",
            "properties": {
                "entity_path": {"type": "array", "description": "Ordered list of zone detections with timestamps"},
                "zone_layout": {"type": "object"}
            }
        }
    }
]
```

### Event Flow Example

```
T+0s   [Phone-A, Zone North] → report_detection{person, north, east, 0.87, normal}
T+0s   Coordinator: New person detected. Tracking ID: P1. Path: [north]
T+0s   Dashboard: Blue dot appears in Zone North, moving east
T+0s   Routing: LOCAL (normal activity)

T+3s   [Laptop-B, Zone East] → report_detection{person, east, south, 0.91, normal}
T+3s   Coordinator: P1 correlation (predicted from north→east). Path: [north, east]
T+3s   Dashboard: Blue dot moves to Zone East, trail line shown
T+3s   Routing: LOCAL (expected movement)

T+8s   [Laptop-B, Zone East] → report_anomaly{lingering, east, medium, "person stationary 5+ seconds"}
T+8s   Coordinator: Anomaly flag. P1 lingering in east zone.
T+8s   Dashboard: Dot turns yellow, pulse animation
T+8s   Routing: LOCAL (monitoring)

T+15s  [Laptop-B, Zone East] → report_anomaly{lingering, east, high, "person stationary 12+ seconds near restricted area"}
T+15s  Coordinator: ESCALATING TO CLOUD
T+15s  → Gemini API: assess_threat({events: [...last 20 events...], time_window: 30})
T+16s  ← Gemini: "Medium-risk pattern. Entity has been stationary near server room entrance
         for 12 seconds. Recommend: trigger alert and activate Zone East camera spotlight."
T+16s  Dashboard: Dot turns red. Cloud analysis panel appears. Alert notification.
T+16s  Routing panel: CLOUD indicator lights up, shows 847ms latency vs 12ms local
```

### Data Privacy Matrix

| Layer | What It Contains | Who Sees It |
|-------|-----------------|-------------|
| Device Camera | Raw video frames, faces, identifiable features | Device only (never transmitted) |
| Inter-Device Events | `{entity_type, zone_id, direction, confidence}` | Coordinator + other devices |
| Cloud Payload | Anonymized event sequence, zone layout, timestamps | Gemini API |
| Dashboard Display | Spatial map, colored dots, event feed, routing stats | Audience |

### Tech Stack
| Component | Technology | Why |
|-----------|-----------|-----|
| Laptop nodes | Python 3.11 + Cactus Python SDK + OpenCV | Reliable, fast, native FunctionGemma |
| Phone nodes | HTML/JS + Transformers.js + WebRTC camera | Zero install, any device joins |
| Coordinator | Python FastAPI + WebSocket | Fast to build, async-native |
| Dashboard | React + Next.js + WebSocket | Rich visualization, team's strength |
| Cloud | Gemini 1.5 Pro API | Complex reasoning, threat assessment |
| Communication | WebSocket over local WiFi | Simplest reliable option |
| Visualization | Canvas/SVG spatial map + Framer Motion | Smooth, impressive animations |
---

## One-Day Build Plan

### Phase 1: Foundation (Hours 0-2)

**Person 1 (Backend)**:
- Set up FastAPI WebSocket coordinator server
- Implement node registration and heartbeat protocol
- Build event ingestion and storage (in-memory)
- Test with mock events

**Person 2 (Frontend)**:
- Scaffold React dashboard with spatial map component
- WebSocket client connecting to coordinator
- Static room layout with device position markers
- Event feed panel (scrolling log)

### Phase 2: Intelligence (Hours 2-5)

**Person 1 (Backend)**:
- Integrate Cactus Python SDK with FunctionGemma on laptop nodes
- OpenCV webcam capture → frame description → FunctionGemma function calling
- Implement person detection + structured event generation
- Build coordinator fusion logic (cross-device correlation, path tracking)
- Implement anomaly detection rules (lingering, restricted zones, speed)

**Person 2 (Frontend)**:
- Animate person tracking on spatial map (moving dots, trail lines)
- Color coding: blue (normal) → yellow (monitoring) → red (alert)
- Routing panel showing local vs cloud percentages and latency
- Privacy panel: show "device view" vs "structured event" vs "cloud payload"
- Build phone node web page (camera + basic Transformers.js or frame-to-coordinator)

### Phase 3: Cloud Escalation (Hours 5-7)

**Person 1 (Backend)**:
- Integrate Gemini API for threat assessment
- Build escalation logic (confidence thresholds, anomaly severity)
- Implement cloud response → coordinator → dashboard pipeline
- Add "invite a device" endpoint (QR code / short URL for phone nodes)

**Person 2 (Frontend)**:
- Cloud escalation animation (visual "uplift" effect when data goes to cloud)
- Threat assessment panel that appears on escalation
- Latency comparison visualization (local 12ms vs cloud 847ms)
- Polish animations, transitions, overall visual quality

### Phase 4: Demo Polish (Hours 7-8)

**Both**:
- End-to-end rehearsal of demo flow
- Set up physical device positions for the demo room
- Test with real walking-through scenarios
- Prepare "invite a judge's phone" moment
- Handle edge cases (device disconnection, multiple people)
- Final visual polish

---

## Demo Script (5 minutes)

### Act 1: "The Setup" (60 seconds)
> "Every security camera system today sends your video to the cloud. Every frame of your life, uploaded to someone else's servers. What if the cameras were smart enough to process everything locally, and the cloud never saw a single frame?"

Show 3-4 devices on stage, each showing their camera feed. Point to the dashboard on the projector.

### Act 2: "The Swarm Awakens" (60 seconds)
> "Each of these devices runs FunctionGemma on Cactus Compute -- a 270-million parameter model doing function calling entirely on-device. Watch what happens when they work together."

Walk slowly through the monitored zones. The dashboard tracks movement across devices in real-time. Highlight: "See the blue dot? That's me. No video was transmitted -- just structured text: person, zone A, moving east."

### Act 3: "The Escalation" (90 seconds)
> "90% of the time, everything is handled locally. Zero latency, zero cloud cost, zero privacy risk. But watch what happens when something unusual occurs."

Linger suspiciously in a zone near a "restricted area." The dot turns yellow, then red. The cloud escalation fires.

> "For the first time, and ONLY now, a sanitized text summary -- no video, no faces, just zone movements and timestamps -- goes to Gemini for threat analysis."

Show the cloud response appearing on screen. Show the latency comparison: local 12ms vs cloud 847ms.

### Act 4: "Join the Swarm" (60 seconds)
> "And here's the magic -- this works on any device. Want to see?"

Show QR code. Invite a judge to scan it. Their phone opens a browser, camera activates, and within seconds their device appears as a new node on the dashboard.

> "Zero installation. Their phone is now part of the swarm. The system self-heals, self-configures, and every new device makes the swarm smarter."

### Act 5: "The Privacy Promise" (30 seconds)
Show the three-panel privacy view:
> "Left: raw camera feed -- this never leaves the device. Middle: the structured event that flows between devices -- just text. Right: what the cloud sees -- anonymized zone data. That's it. That's the future of security."

---

## Judging Strategy

### Hit Every Criteria

| Criterion | How Hive Scores |
|-----------|----------------|
| Innovation (30%) | Multi-device swarm with visible coordination -- nobody does this |
| Technical Execution (40%) | FunctionGemma + Cactus (native), WebSocket mesh, Gemini integration, working real-time demo |
| Beyond Chat (bonus) | Physical devices, spatial visualization, real-time tracking |
| Privacy (bonus) | Three-layer privacy panel, no raw data transmission |
| Visible Routing (bonus) | Local/cloud percentage bar, latency comparison, escalation animation |

### Key Differentiators

1. **Physical presence**: Multiple devices on stage is visceral and memorable
2. **Audience participation**: "Join the swarm" QR code moment
3. **The escalation moment**: Watching the system go from calm to alert to cloud is dramatic
4. **Privacy narrative**: In a world of cloud-everything, this is the counterargument

### Potential Judge Questions + Answers

**Q: How does this scale?**
A: Each device is independent -- adding devices is linear. The coordinator can run on any device. In production, you'd add a mesh protocol for coordinator failover.

**Q: What about false positives?**
A: The confidence threshold for cloud escalation is configurable. In our demo it's tuned for drama, but in production you'd want 95%+ confidence before escalating.

**Q: Why not just run everything on the cloud?**
A: Three reasons: (1) Privacy -- raw video never leaves devices. (2) Latency -- 12ms local vs 847ms cloud for 90% of operations. (3) Cost -- cloud inference for 4 cameras 24/7 is expensive. Local is free.

**Q: What if a device goes offline?**
A: The swarm self-heals. Other devices continue monitoring. The coordinator updates the spatial map. When the device reconnects, it rejoins automatically.

---

## Appendix: Sources

- [FunctionGemma -- Google DeepMind](https://deepmind.google/models/gemma/functiongemma/)
- [FunctionGemma on Hugging Face](https://huggingface.co/google/functiongemma-270m-it)
- [Cactus Compute -- GitHub](https://github.com/cactus-compute/cactus)
- [Cactus Compute SDK Docs](https://cactuscompute.com/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [FunctionGemma Fine-Tuning Guide](https://developers.googleblog.com/a-guide-to-fine-tuning-functiongemma/)
- [Hack The Edge Hackathon Winners (AMD + Liquid AI)](https://www.amd.com/en/developer/resources/technical-articles/2025/hack-the-edge-amd-and-liquid-ai-hackathon-recap.html)
- [On-Device LLMs in 2026](https://www.edge-ai-vision.com/2026/01/on-device-llms-in-2026-what-changed-what-matters-whats-next/)
- [Speculative Edge-Cloud Decoding (arxiv)](https://arxiv.org/abs/2505.21594)
