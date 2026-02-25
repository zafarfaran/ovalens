# Multi-Agent Architecture Plan

> Breaking the monolithic Claude agent into specialised agents so each one does less, does it better, and hallucinates less.

---

## The Problem with One Agent Doing Everything

Right now, a single Claude instance receives one massive system prompt and is expected to:

1. Understand the adviser's intent (is this a question? a scenario? a tax analysis?)
2. Know which tools to call (dashboard? meeting notes? neither?)
3. Compute/populate the entire dashboard JSON structure (income, tax bands, NI, HICBC, allowances, observations)
4. Write a clear natural language explanation of the results
5. Handle follow-up context from the conversation history
6. Search meeting notes when historical context is needed
7. Handle ambiguity when data is missing

That's 7 different cognitive tasks in one turn. The system prompt alone is ~2,000 tokens of client context + tool instructions + a JSON example of the dashboard format. The result:

| Failure Mode | Why It Happens |
|-------------|---------------|
| Wrong numbers on dashboard | Claude invents figures instead of computing them |
| Inconsistent numbers between turns | No deterministic grounding — different "mental math" each time |
| Ignores meeting notes when relevant | Too many tools available, prompt is too long, Claude loses focus |
| Over-confident answers when data is missing | Claude fills gaps with plausible-sounding fabrications |
| Dashboard JSON malformed | Claude is simultaneously writing prose and structured JSON |
| Slow response times | One large model call doing everything sequentially |
| Unnecessary tool calls | Claude calls `generate_dashboard` even for simple "what does HICBC mean?" questions |

The fix: **give each agent ONE job, a tight system prompt, and only the tools it needs.**

---

## Proposed Architecture

```
                              ┌──────────────────────┐
                              │    Intent Router      │
                              │  (fast / cheap model) │
                              │                       │
                              │  Classifies message   │
                              │  into 1 of 5 intents  │
                              └──────────┬───────────┘
                                         │
              ┌──────────────┬───────────┼───────────┬──────────────┐
              ▼              ▼           ▼           ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐
     │    Tax     │  │  Scenario  │  │Research │  │  Data    │  │  Chat    │
     │  Analyst   │  │  Modeller  │  │ Agent   │  │ Gatherer │  │  Agent   │
     │            │  │            │  │         │  │          │  │          │
     │ compute_   │  │ model_     │  │ search_ │  │ (no LLM  │  │ (no      │
     │ tax_pos.   │  │ salary_    │  │ meeting │  │  tools)  │  │  tools)  │
     │ generate_  │  │ sacrifice  │  │ _notes  │  │          │  │          │
     │ dashboard  │  │ generate_  │  │         │  │ Asks     │  │ Answers  │
     │            │  │ dashboard  │  │         │  │ follow-  │  │ general  │
     │ Focused    │  │            │  │ Deep    │  │ up Qs    │  │ UK tax   │
     │ on numbers │  │ Runs       │  │ context │  │ to fill  │  │ questions│
     │ + dashboard│  │ engine 2x  │  │ search  │  │ gaps     │  │          │
     └──────┬─────┘  └──────┬─────┘  └────┬────┘  └────┬─────┘  └────┬─────┘
            │               │              │            │              │
            └───────────────┴──────────────┴────────────┴──────────────┘
                                         │
                              ┌──────────▼───────────┐
                              │   Response Composer   │
                              │  (optional — can be   │
                              │   the specialist)     │
                              │                       │
                              │  Takes structured     │
                              │  output + writes      │
                              │  adviser-friendly     │
                              │  explanation          │
                              └──────────────────────┘
```

---

## The Five Agents + Router

### Agent 0: Intent Router

**Purpose**: Classify the adviser's message and route to the right specialist. This is the gatekeeper that prevents the wrong agent from handling the wrong task.

**Model**: Haiku / cheap fast model — this is a classification task, not a reasoning task.

**System prompt** (~200 tokens — tiny):

```
You are a message classifier for a UK tax planning tool.

Classify the adviser's message into exactly ONE intent:

- TAX_ANALYSIS: Adviser wants to see, review, or analyse a client's tax position, breakdown, or summary.
  Examples: "analyse Sarah's tax", "show me the tax breakdown", "what's Marcus's effective rate?"

- SCENARIO: Adviser asks "what if" questions or wants to model changes.
  Examples: "what if she increases pension sacrifice to 20k?", "model putting 15k more into pension", "compare options"

- RESEARCH: Adviser asks about past meetings, prior discussions, or needs historical context.
  Examples: "what did we discuss last time?", "check the meeting notes about pensions", "when did we last review their CGT?"

- DATA_NEEDED: The information needed to answer isn't available — data is missing from the client profile.
  Examples: (you determine this from context — if the client has no income sources, or the tax profile is empty)

- GENERAL: General UK tax knowledge, definitions, explanations, or casual conversation.
  Examples: "what is HICBC?", "explain the PA taper", "how does salary sacrifice work?", "thanks"

Respond with ONLY the intent label. Nothing else.
```

**Tools**: None — pure classification.

**Input**: The adviser's message + a brief summary of available client data (so it can detect DATA_NEEDED).

**Output**: One of `TAX_ANALYSIS | SCENARIO | RESEARCH | DATA_NEEDED | GENERAL`

**Why a separate router?**
- It's extremely cheap (Haiku = ~0.1x the cost of Sonnet)
- It's extremely fast (~200ms)
- It prevents the expensive specialist agents from being called for "what is HICBC?"
- It catches data gaps before the Tax Analyst tries to compute with missing inputs
- You can fine-tune routing logic without touching any specialist agent

---

### Agent 1: Tax Analyst

**Purpose**: Compute a client's tax position using the deterministic engine and present the results on the dashboard.

**When routed here**: Intent = `TAX_ANALYSIS`

**Model**: Sonnet (needs to interpret complex tax structures and write explanations)

**System prompt** (~500 tokens — focused):

```
You are Helio's Tax Analyst. Your ONLY job is to compute and explain a client's
UK tax position.

## Rules
1. ALWAYS call compute_tax_position first. Never calculate numbers yourself.
2. ALWAYS call generate_dashboard with the engine's output. Never modify the numbers.
3. After the dashboard is populated, write a brief (2-4 paragraph) explanation of
   the key findings, focusing on:
   - Total tax position and effective rate
   - Notable observations (PA taper, HICBC, high marginal rate)
   - The 2-3 most impactful planning opportunities
4. If the engine returns observations, reference them by name in your explanation.
5. Do NOT answer general tax knowledge questions — you are only for analysis.
6. Do NOT run scenarios — if the adviser asks "what if", say you'll hand off to
   the scenario modeller.

## Client Data
{{CLIENT_CONTEXT}}
```

**Tools** (2 only):
- `compute_tax_position` — calls the deterministic tax engine
- `generate_dashboard` — populates the Intelligence Panel with engine output

**Input**: Adviser message + client data context

**Output**: Dashboard update event + natural language explanation

**What this agent does NOT do**:
- Answer "what is HICBC?" (that's the Chat Agent)
- Run what-if scenarios (that's the Scenario Agent)
- Search meeting notes (that's the Research Agent)
- Ask for missing data (that's the Data Gatherer)

---

### Agent 2: Scenario Modeller

**Purpose**: Model "what-if" scenarios by running the tax engine multiple times with different inputs and presenting the comparison.

**When routed here**: Intent = `SCENARIO`

**Model**: Sonnet

**System prompt** (~500 tokens — focused):

```
You are Helio's Scenario Modeller. Your ONLY job is to model tax planning
scenarios — "what if" questions about pension contributions, salary sacrifice,
income restructuring, and similar.

## Rules
1. ALWAYS call model_salary_sacrifice (or compute_tax_position twice) to get
   exact before/after numbers. Never estimate savings yourself.
2. ALWAYS call generate_dashboard with the comparison data so the Scenarios tab
   updates.
3. After the tool calls, write a clear comparison:
   - What changed (inputs)
   - Tax impact (savings by category: IT, NI, HICBC)
   - Net pay impact (what the client "gives up" in take-home)
   - Pension impact (what goes into the pot)
   - Effective relief rate
4. If the adviser's request is ambiguous (e.g., "optimise the pension"), propose
   2-3 specific scenarios to model rather than guessing.
5. Always reference exact numbers from the engine output — never round or approximate.

## Client Data
{{CLIENT_CONTEXT}}

## Current Tax Position
{{CURRENT_POSITION}}
```

**Tools** (3 only):
- `compute_tax_position` — for custom scenarios that aren't salary sacrifice
- `model_salary_sacrifice` — the purpose-built scenario tool
- `generate_dashboard` — populates the Scenarios tab

**Key design choice**: This agent receives the **current tax position** as part of its context (pre-computed by the Tax Analyst or loaded from the DB). It doesn't re-analyse from scratch — it only computes the delta.

**What this agent does NOT do**:
- Initial tax analysis (that's the Tax Analyst)
- Meeting note searches
- General questions
- Data gathering

---

### Agent 3: Research Agent

**Purpose**: Find relevant historical context from meeting notes, prior conversations, and client history.

**When routed here**: Intent = `RESEARCH`

**Model**: Sonnet (or Haiku — meeting note search is not complex)

**System prompt** (~300 tokens — focused):

```
You are Helio's Research Agent. Your ONLY job is to search the client's
meeting notes and conversation history to find relevant context.

## Rules
1. ALWAYS use the search_meeting_notes tool. Never fabricate meeting content.
2. Search with multiple relevant keywords — try different phrasings if the first
   search returns no results.
3. Present results chronologically with dates, subjects, and key points.
4. If you find action items from past meetings, highlight whether they've been
   completed or are still pending.
5. If the search returns no results, say so clearly — never make up historical context.
6. You may search up to 3 times with different queries to be thorough.

## Client
{{CLIENT_NAME}} ({{CLIENT_ID}})
```

**Tools** (1 only):
- `search_meeting_notes` — FTS search over the meeting_notes table

**What this agent does NOT do**:
- Tax computation
- Dashboard updates
- Scenarios
- General tax knowledge

**Why a separate research agent?**
Currently, `search_meeting_notes` is one of the tools available to the monolithic agent, but it's rarely used because the agent is busy thinking about dashboard JSON and tax numbers. A dedicated research agent will actually use the tool well — it has nothing else to do.

---

### Agent 4: Data Gatherer

**Purpose**: Handle situations where the client's data is incomplete. Instead of the Tax Analyst hallucinating numbers, the Data Gatherer asks the adviser for the missing information.

**When routed here**: Intent = `DATA_NEEDED`

**Model**: Haiku (this is just structured conversation — no complex reasoning)

**System prompt** (~400 tokens — focused):

```
You are Helio's Data Gathering Agent. Your job is to help the adviser
fill in missing client information before a tax analysis can be performed.

## Rules
1. Review what data is available and what's missing.
2. Ask SPECIFIC questions — never ask vague "tell me about the client" questions.
3. Group related questions together (don't ask one at a time).
4. Prioritise the most important missing data first:
   - Income sources (type + amount) — can't analyse without this
   - Employment status + region — affects tax bands
   - Pension contributions — affects ANI and PA taper
   - Number of children / CB — affects HICBC
5. When the adviser provides data, confirm what you've recorded and ask about
   the next gap.
6. Once you have enough data for a basic analysis, say: "I now have enough
   to run an initial tax analysis. Shall I proceed?"

## Current Client Data
{{CLIENT_CONTEXT}}

## Missing Fields
{{MISSING_FIELDS}}
```

**Tools**: None (or optionally a `update_client_data` tool to write back to the DB)

**What this agent does NOT do**:
- Tax computation
- Dashboard updates
- Meeting note searches
- Scenarios

**How the router detects DATA_NEEDED**:
Before routing, the orchestrator checks the client's `tax_profile`. If `income_sources` is empty, `total_income` is 0, or key fields are null, the intent is overridden to `DATA_NEEDED` regardless of what the adviser asked. This prevents the Tax Analyst from running `compute_tax_position` with garbage inputs.

---

### Agent 5: Chat Agent (General Conversation)

**Purpose**: Handle everything that isn't a structured tax analysis — general UK tax knowledge, definitions, casual conversation, and follow-up questions.

**When routed here**: Intent = `GENERAL`

**Model**: Sonnet (or Haiku for simple definitional questions)

**System prompt** (~300 tokens — focused):

```
You are Helio, a UK tax planning assistant for financial advisers.

## Rules
1. Answer UK tax questions clearly and concisely.
2. Use the client's context if it helps make the answer more relevant.
3. If the adviser asks something that requires a tax computation, say:
   "Let me run the numbers for you" and the system will route to the analyst.
4. If the adviser asks about past meetings, say:
   "Let me check the meeting notes" and the system will route to research.
5. You can reference tax rates, thresholds, and rules from memory — this is
   general knowledge, not client-specific computation.
6. Keep answers adviser-appropriate — assume professional tax knowledge.

## Client Context (for reference only)
{{CLIENT_CONTEXT}}
```

**Tools**: None

**What this agent does NOT do**:
- Tax computation (no tools)
- Dashboard updates (no tools)
- Meeting note searches (no tools)
- Scenario modelling (no tools)

This is the lightest agent — it just talks. No tool calls, no structured output, no dashboard updates. It handles "what is the PA taper?", "thanks, that's helpful", "can you explain that in simpler terms?", etc.

---

## How They Work Together

### Example 1: "Analyse Marcus's tax position"

```
Step 1: Intent Router
  Input: "Analyse Marcus's tax position"
  + Data check: Marcus has income_sources, total_income > 0 ✓
  Output: TAX_ANALYSIS

Step 2: Tax Analyst Agent
  System prompt: Focused tax analysis prompt + Marcus's client context
  Tools: [compute_tax_position, generate_dashboard]
  
  → Claude calls compute_tax_position({
      income_sources: [{type: "employment", gross: 145000}, ...],
      pension: 18000, region: "england", children: 2, cb: true
    })
  → Engine returns exact figures
  → Claude calls generate_dashboard({mode: "reset", taxData: {engine output}})
  → Dashboard updates
  → Claude writes: "Marcus's total tax liability is £55,481 with a 28.4%
     effective rate. Three key findings..."

Step 3: Stream to frontend
  Events: status → tool_call → tool_result → dashboard_update → tokens → done
```

### Example 2: "What if Marcus puts 30k into pension?"

```
Step 1: Intent Router
  Input: "What if Marcus puts 30k into pension?"
  Output: SCENARIO

Step 2: Scenario Modeller Agent
  System prompt: Scenario modelling prompt + Marcus's context + current position
  Tools: [model_salary_sacrifice, compute_tax_position, generate_dashboard]
  
  → Claude calls model_salary_sacrifice({
      current_gross: 145000, current_sacrifice: 6000,
      proposed_sacrifice: 30000, other_income: [...],
      region: "england", children: 2, cb: true
    })
  → Engine runs twice, returns comparison
  → Claude calls generate_dashboard with comparison data
  → Scenarios tab updates
  → Claude writes: "Increasing sacrifice to £30k saves £9,600/yr in tax..."

Step 3: Stream to frontend
```

### Example 3: "What did we discuss about Marcus's pension last time?"

```
Step 1: Intent Router
  Input: "What did we discuss about Marcus's pension last time?"
  Output: RESEARCH

Step 2: Research Agent
  System prompt: Research prompt + client ID
  Tools: [search_meeting_notes]
  
  → Claude calls search_meeting_notes({query: "pension"})
  → Gets results from FTS
  → Maybe calls again: search_meeting_notes({query: "salary sacrifice pension contribution"})
  → Claude writes: "In the meeting on 15 January 2026, you discussed..."

Step 3: Stream to frontend (no dashboard update — just text)
```

### Example 4: "What is the personal allowance taper?"

```
Step 1: Intent Router
  Input: "What is the personal allowance taper?"
  Output: GENERAL

Step 2: Chat Agent
  System prompt: General knowledge prompt + light client context
  Tools: [] (none)
  
  → Claude writes: "The personal allowance taper applies when your adjusted
     net income exceeds £100,000. For every £2 over £100k, you lose £1 of
     your £12,570 PA. This creates a 62% marginal rate zone between
     £100k and £125,140..."

Step 3: Stream to frontend (no dashboard update — just text)
```

### Example 5: "Analyse this new client" (empty profile)

```
Step 1: Intent Router
  Input: "Analyse this new client"
  + Data check: Client has no income_sources, total_income = 0 ✗
  Output: DATA_NEEDED (override — not enough data)

Step 2: Data Gatherer Agent
  System prompt: Data gathering prompt + list of missing fields
  Tools: [] (or update_client_data)
  
  → Claude writes: "I don't have enough information to run a tax analysis
     yet. Could you tell me:
     1. What are their main income sources and amounts?
     2. Are they employed, self-employed, or a company director?
     3. Which region are they based in? (England/Scotland)
     4. Do they make any pension contributions?
     5. Do they have children and claim Child Benefit?"

Step 3: Stream to frontend (no dashboard — just questions)
```

---

## Orchestration Implementation

### Where It Lives

```
services/
├── agents/
│   ├── __init__.py           # Agent registry
│   ├── router.py             # Intent Router — classifies messages
│   ├── tax_analyst.py        # Agent 1 — tax analysis
│   ├── scenario_modeller.py  # Agent 2 — what-if scenarios
│   ├── research.py           # Agent 3 — meeting note search
│   ├── data_gatherer.py      # Agent 4 — missing data handler
│   ├── chat.py               # Agent 5 — general conversation
│   └── prompts/
│       ├── router.py         # Router system prompt
│       ├── tax_analyst.py    # Tax Analyst system prompt
│       ├── scenario.py       # Scenario system prompt
│       ├── research.py       # Research system prompt
│       ├── data_gatherer.py  # Data Gatherer system prompt
│       └── chat.py           # Chat Agent system prompt
├── orchestrator.py           # NEW — replaces the current "call Claude once" flow
├── llm/
│   ├── claude.py             # Stays — but now used BY agents, not directly by chat service
│   ├── types.py              # Stays — stream events
│   └── ...
├── tools/
│   ├── __init__.py           # Tool registry — stays
│   ├── tax_engine.py         # NEW — compute_tax_position, model_salary_sacrifice
│   ├── dashboard.py          # Enhanced — validates engine output
│   └── meeting_notes.py      # Stays
├── chat.py                   # Simplified — delegates to orchestrator
└── system_prompt.py          # DEPRECATED — each agent has its own prompt
```

### The Orchestrator

This replaces the current `ChatService.stream_message()` → `ClaudeProvider.stream_chat()` direct call.

```python
# services/orchestrator.py — pseudocode

class AgentOrchestrator:
    """Routes messages to specialist agents and streams their responses."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.router = IntentRouter()           # Uses Haiku
        self.tax_analyst = TaxAnalystAgent()    # Uses Sonnet + tax tools
        self.scenario = ScenarioAgent()         # Uses Sonnet + scenario tools
        self.research = ResearchAgent()         # Uses Sonnet/Haiku + search tool
        self.data_gatherer = DataGathererAgent()# Uses Haiku, no tools
        self.chat = ChatAgent()                 # Uses Sonnet/Haiku, no tools

    async def handle_message(
        self,
        message: str,
        client_context: dict,
        conversation_history: list[dict],
        tax_plan_mode: bool,
    ) -> AsyncGenerator[StreamEvent, None]:
        
        # Step 1: Check data completeness
        data_complete = self._check_data_completeness(client_context)
        
        # Step 2: Route intent
        if not data_complete and tax_plan_mode:
            intent = "DATA_NEEDED"
        else:
            intent = await self.router.classify(
                message=message,
                client_has_data=data_complete,
                tax_plan_mode=tax_plan_mode,
            )
        
        # Step 3: Dispatch to specialist
        agent = self._get_agent(intent)
        agent_context = self._build_agent_context(intent, client_context)
        
        async for event in agent.run(
            message=message,
            context=agent_context,
            history=conversation_history,
        ):
            yield event
    
    def _get_agent(self, intent: str):
        return {
            "TAX_ANALYSIS": self.tax_analyst,
            "SCENARIO": self.scenario,
            "RESEARCH": self.research,
            "DATA_NEEDED": self.data_gatherer,
            "GENERAL": self.chat,
        }[intent]
    
    def _check_data_completeness(self, ctx: dict) -> bool:
        """Check if we have enough data for tax analysis."""
        tp = ctx.get("tax_profile", {})
        return bool(
            tp.get("income_sources")
            and tp.get("total_income", 0) > 0
        )
    
    def _build_agent_context(self, intent: str, ctx: dict) -> dict:
        """Build a focused context for each agent — only what it needs."""
        if intent == "TAX_ANALYSIS":
            # Full client data for computation
            return {
                "client": ctx["client"],
                "tax_profile": ctx["tax_profile"],
                "observations": ctx.get("observations", []),
            }
        elif intent == "SCENARIO":
            # Client data + current position (for comparison)
            return {
                "client": ctx["client"],
                "tax_profile": ctx["tax_profile"],
                "current_position": ctx.get("current_position"),
            }
        elif intent == "RESEARCH":
            # Just client identity for scoping searches
            return {
                "client_id": ctx["client"]["id"],
                "client_name": f"{ctx['client']['first_name']} {ctx['client']['last_name']}",
            }
        elif intent == "DATA_NEEDED":
            # What we have and what we're missing
            return {
                "client": ctx["client"],
                "tax_profile": ctx.get("tax_profile", {}),
                "missing": self._detect_missing_fields(ctx),
            }
        else:  # GENERAL
            # Light context for reference
            return {"client": ctx.get("client")}
```

### The Agent Base Class

Each specialist follows the same interface:

```python
# services/agents/__init__.py — pseudocode

class BaseAgent:
    """Base class for all specialist agents."""
    
    def __init__(self, model: str, tools: list[dict], system_prompt_builder):
        self.model = model
        self.tools = tools
        self.build_system_prompt = system_prompt_builder
    
    async def run(
        self,
        message: str,
        context: dict,
        history: list[dict],
    ) -> AsyncGenerator[StreamEvent, None]:
        """Run the agent and stream events."""
        system_prompt = self.build_system_prompt(context)
        
        # Build messages — agent gets the conversation history
        # plus the new message
        messages = self._format_history(history) + [
            {"role": "user", "content": message}
        ]
        
        # Call Claude with this agent's specific model, tools, and prompt
        provider = ClaudeProvider(model_override=self.model)
        async for event in provider.stream_chat(
            messages=messages,
            system_prompt=system_prompt,
            tools=self.tools,
            tool_context=context,
        ):
            yield event
```

---

## What Changes in Each File

| File | Current State | Change |
|------|--------------|--------|
| `services/chat.py` | Directly calls ClaudeProvider | Delegates to `AgentOrchestrator` |
| `services/system_prompt.py` | One monolithic prompt | **Deprecated** — each agent has its own prompt module |
| `services/llm/claude.py` | Called directly by ChatService | Called by agents via BaseAgent — add `model_override` param |
| `services/llm/types.py` | 7 event types | Add `RoutingEvent` (tells frontend which agent is handling) |
| `services/tools/__init__.py` | 2 tools registered | Add `compute_tax_position`, `model_salary_sacrifice` |
| **`services/orchestrator.py`** | **Doesn't exist** | **Create — the multi-agent router + dispatcher** |
| **`services/agents/*.py`** | **Don't exist** | **Create — 5 specialist agents + base class** |
| **`services/agents/prompts/*.py`** | **Don't exist** | **Create — focused prompts for each agent** |
| `config.py` | One model setting | Add `router_model` (Haiku) vs `agent_model` (Sonnet) settings |

---

## Model Selection per Agent

| Agent | Model | Why | Cost per call |
|-------|-------|-----|--------------|
| Intent Router | Haiku | Classification only — no reasoning needed | ~$0.001 |
| Tax Analyst | Sonnet | Needs to interpret complex tax structures | ~$0.015 |
| Scenario Modeller | Sonnet | Needs to explain comparisons clearly | ~$0.015 |
| Research Agent | Haiku | Just searching and summarising results | ~$0.002 |
| Data Gatherer | Haiku | Structured conversation, no reasoning | ~$0.001 |
| Chat Agent | Sonnet | General knowledge needs good reasoning | ~$0.010 |

**Total cost per request**: Router ($0.001) + one specialist (~$0.010-$0.015) = **~$0.011-$0.016**

This is roughly the same as the current single Sonnet call (~$0.015), because the router is so cheap and only one specialist runs per turn. But the quality is dramatically better because each specialist is focused.

---

## Cross-Agent Context: How Agents Share State

The agents don't call each other directly. They share state through the **database** and the **orchestrator's context builder**.

```
Database (source of truth):
├── tax_profiles.cached_summary    ← Tax Analyst writes this after computing
├── tax_profiles.income_sources    ← Data Gatherer updates this with new info
├── observations                   ← Tax Analyst creates these from engine output
├── conversations.dashboard_data   ← Latest dashboard JSON
└── messages                       ← Full conversation history (all agents)

Orchestrator builds context FROM the DB:
├── client_context                 ← Read from clients + tax_profiles
├── current_position               ← Read from cached_summary (for Scenario Agent)
├── observations                   ← Read from observations table
└── conversation_history           ← Read from messages table
```

The key insight: **the Tax Analyst doesn't need to know what the Scenario Agent did in the last turn.** It reads the current tax_profile from the DB. If the Scenario Agent modelled a change, the Tax Analyst sees the current position from the DB, not from the scenario.

Conversation history is shared across agents (via the `messages` table), so any agent can reference what was said previously.

---

## Handling Agent Transitions Within a Conversation

Sometimes the adviser's intent shifts mid-conversation:

```
Turn 1: "Analyse Marcus's tax position"     → TAX_ANALYSIS → Tax Analyst
Turn 2: "What if he puts 30k into pension?"  → SCENARIO → Scenario Modeller
Turn 3: "Did we discuss this last time?"     → RESEARCH → Research Agent
Turn 4: "Thanks, let's go with option 2"    → GENERAL → Chat Agent
Turn 5: "Show me the updated dashboard"      → TAX_ANALYSIS → Tax Analyst
```

Each turn, the router classifies fresh. The specialist gets the full conversation history, so it can read what happened in previous turns even though a different agent handled them.

The key is: **conversation history is agent-agnostic.** Messages are stored as `{role: "user" | "assistant", content: "..."}`. The specialist doesn't know (or care) that a different agent wrote the previous assistant message.

---

## Frontend Changes

### New SSE Event: `routing`

Add a new event type so the frontend can show which agent is handling the request:

```typescript
// New event
interface RoutingEvent {
  type: "routing";
  intent: "TAX_ANALYSIS" | "SCENARIO" | "RESEARCH" | "DATA_NEEDED" | "GENERAL";
  agent: string;  // Human-readable: "Tax Analyst", "Scenario Modeller", etc.
}
```

The `ThinkingIndicator` component can use this to show:

```
🔍 Understanding your question...        (router classifying)
📊 Tax Analyst computing position...      (tax_analyst running)
🔄 Scenario Modeller comparing options... (scenario running)
📝 Searching meeting notes...             (research running)
```

### No Other Frontend Changes Needed

The specialist agents emit the same `StreamEvent` types as the current monolithic agent:
- `StatusEvent` — phase indicators
- `TokenEvent` — streaming text
- `ToolCallEvent` / `ToolResultEvent` — tool execution
- `DashboardUpdateEvent` — dashboard data
- `DoneEvent` — completion

The frontend doesn't need to know about the multi-agent architecture. It sees the same event stream. The only new event is `routing`, which is optional UI polish.

---

## Implementation Order

### Phase 1: Refactor Without Changing Behaviour
1. Create `services/agents/` directory
2. Move the current monolithic prompt into `agents/prompts/chat.py` as-is
3. Create `BaseAgent` class wrapping `ClaudeProvider`
4. Create a single "LegacyAgent" that behaves exactly like today
5. Create `orchestrator.py` that always routes to the LegacyAgent
6. Update `chat.py` to use the orchestrator
7. **Test: everything works exactly the same as before**

### Phase 2: Add the Intent Router
8. Create `agents/router.py` with the classification prompt
9. Wire the router into the orchestrator
10. Create the Chat Agent (handles `GENERAL` — no tools, just conversation)
11. Route `GENERAL` to Chat Agent, everything else to LegacyAgent
12. **Test: general questions are cheaper and faster, tax analysis unchanged**

### Phase 3: Split the Tax Analyst
13. Create `agents/tax_analyst.py` with focused prompt + tax tools
14. Create `agents/prompts/tax_analyst.py`
15. Route `TAX_ANALYSIS` to Tax Analyst (requires deterministic engine to be built)
16. **Test: dashboard numbers are deterministic, explanations are focused**

### Phase 4: Split the Scenario Modeller
17. Create `agents/scenario_modeller.py` with comparison prompt + scenario tools
18. Create `agents/prompts/scenario.py`
19. Route `SCENARIO` to Scenario Modeller
20. **Test: what-if questions produce side-by-side comparisons**

### Phase 5: Split Research + Data Gatherer
21. Create `agents/research.py` with search-focused prompt
22. Create `agents/data_gatherer.py` with data collection prompt
23. Route `RESEARCH` and `DATA_NEEDED` respectively
24. **Test: meeting note queries are thorough, empty profiles get questioned**

### Phase 6: Polish
25. Add `RoutingEvent` to the SSE stream
26. Update `ThinkingIndicator` with agent-specific messages
27. Add model selection config (Haiku for router + data gatherer + research)
28. Add logging/metrics per agent (which agents are used most, latency per agent)

---

## How This Connects to the Other Plans

| Plan | Dependency |
|------|-----------|
| **Deterministic Tax Engine** | Phase 3 requires the tax engine to be built. The Tax Analyst agent calls `compute_tax_position` instead of generating numbers. |
| **Dashboard Enhancement** | The richer dashboard data shape (6 tabs, tables, scenarios) is what the Tax Analyst and Scenario Modeller populate. The agents produce the data, the dashboard displays it. |
| **Multi-Agent** (this plan) | Requires the engine (for Tax Analyst tools) and the enhanced data shape (for dashboard updates). But Phases 1-2 can be done independently. |

**Recommended build order**:
1. Deterministic Tax Engine (pure Python, no AI dependency)
2. Multi-Agent Phases 1-2 (refactor + router — works with current tools)
3. Multi-Agent Phase 3 (Tax Analyst — requires engine)
4. Dashboard Enhancement (requires new data shape from engine)
5. Multi-Agent Phases 4-6 (Scenario Modeller, Research, polish)

---

## The Before/After

| Dimension | Single Agent (now) | Multi-Agent (proposed) |
|-----------|-------------------|----------------------|
| System prompt size | ~2,000 tokens (everything) | ~200-500 tokens per agent |
| Tools available | All tools always | Only relevant tools per agent |
| Hallucination risk | High — doing 7 jobs at once | Low — each agent does 1 job |
| Cost per request | ~$0.015 (one Sonnet call) | ~$0.012-0.016 (Haiku router + one specialist) |
| Latency | ~3-5s (one large call) | ~3-5s (200ms router + specialist) |
| "What is HICBC?" cost | ~$0.015 (full Sonnet + all tools) | ~$0.003 (Haiku router + Haiku/Sonnet chat, no tools) |
| Tax analysis quality | Claude invents numbers | Engine computes, agent explains |
| Scenario modelling | Claude guesses before/after | Engine runs twice, agent compares |
| Meeting note search | Rarely used (agent is distracted) | Always used (agent has nothing else) |
| Missing data handling | Claude fabricates plausible data | System catches gaps, asks questions |
| Debugging | "Why did it do that?" (opaque) | "Which agent handled it? What was its prompt?" (traceable) |
