# Helio Work Week Demo — Design

## Context

Helio is a UK tax planning assistant for financial advisers. The scaffolding is complete (monorepo with FastAPI backend, Next.js frontend, shared TS packages, Chrome extension skeleton). This design covers getting the **full end-to-end demo** working during the work week.

## Goal

A working demo where:
1. An adviser types income numbers or uploads a PDF tax return
2. The AI (Claude) analyses the data, runs real tax calculations
3. A dashboard renders with live tax summary, allowance tracking, alerts, and scenario modelling
4. The adviser asks "what if" questions in chat, and the dashboard updates in real time

## Key Design Decisions

### What to build for real
- **Tax engine**: Income tax calculator (England + Scotland), ANI calculator, NI calculator, HICBC calculator, salary sacrifice analyser. These produce the "wow" numbers.
- **AI tool calling**: Claude receives chat, calls calculators via FastAPI tool endpoints, returns structured results.
- **Dashboard**: 4 core cards (Tax Summary, Allowances Tracker, Alerts, Scenario Comparison) rendering real calculation output.
- **Chat panel**: Streaming responses from Claude with markdown rendering.
- **PDF extraction**: Server-side text extraction + AI-powered parsing into structured income data.

### What to fake or defer
- **Chrome extension**: Already scaffolded, skip for demo. The web app alone is the story.
- **Client persistence**: Use in-memory state or Zustand store. No database needed for demo.
- **Auth**: Skip entirely. Demo runs locally or on a preview URL.
- **Pension AA carry forward**: Complex edge case, defer to post-demo.
- **Bed & ISA calculator**: Defer. Less dramatic than PA taper + salary sacrifice.
- **CGT calculator**: Defer.
- **Dark mode, responsive, PDF export**: Skip.

### Architecture for the demo

```
Browser (Next.js)
  ├── Chat Panel → POST /api/chat → Claude with tools → streams response
  │                                    ├── tool: analyse_client → runs tax engine
  │                                    └── tool: run_scenario → runs what-if calc
  ├── Dashboard Panel → renders RelevantTaxData from state
  └── PDF Upload → POST /api/extract → PyMuPDF + Claude extraction
```

State flow:
1. User provides data (chat or PDF upload)
2. FastAPI sends to Claude with tax calculator tools
3. Claude calls tools, gets structured results
4. Results streamed back to frontend
5. Frontend parses tool results, updates dashboard state
6. Dashboard re-renders with new data

### The demo story

Use the "Mitchell household" example from the planning strategies doc:
- James Mitchell, employed, gross income ~£147k
- Personal Allowance fully lost (in the 60% trap)
- Ask "What if James salary sacrifices £50k?" — dashboard shows £24k annual saving
- This is the "jaw drop" moment that sells the concept

## Risks

1. **AI tool calling reliability** — Claude needs to consistently call the right tools with correct parameters. Mitigation: strict tool schemas, example messages in system prompt.
2. **Tax calculation accuracy** — The main cases (PA taper, basic/higher/additional rate, NI) must be correct for the demo to be credible. Mitigation: unit tests against known examples from HMRC.
3. **Integration complexity** — Chat + tools + dashboard state syncing across Python backend and React frontend. Mitigation: build and test each layer independently before connecting.
4. **PDF extraction quality** — Real tax returns have varied formats. Mitigation: focus on one format (SA100 or P60), use Claude to parse extracted text into structured data.

## Out of scope for work week
- FCA compliance / regulatory positioning
- Real user testing with advisers
- Production deployment
- Database / persistence layer
- Chrome extension functionality
- Marriage allowance, IHT, director remuneration optimiser
