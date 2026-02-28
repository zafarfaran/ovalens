"""System prompt loader with client context injection."""

from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

_BASE_PROMPT: str | None = None
_SYSTEM_PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "system_prompt.xml"


def _load_base_prompt() -> str:
    """Load and cache the canonical system prompt for the API runtime."""
    global _BASE_PROMPT
    if _BASE_PROMPT is None:
        if not _SYSTEM_PROMPT_PATH.exists():
            raise FileNotFoundError(f"System prompt file not found: {_SYSTEM_PROMPT_PATH}")
        _BASE_PROMPT = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
        logger.info("System prompt loaded", path=str(_SYSTEM_PROMPT_PATH), length=len(_BASE_PROMPT))
    return _BASE_PROMPT


def build_system_prompt(
    client_context: dict | None = None,
    tax_plan_mode: bool = False,
) -> str:
    """Build the full system prompt with optional client context injection."""
    base = _load_base_prompt()

    if client_context:
        context_text = _format_client_context(client_context)
    else:
        context_text = (
            "No client currently selected. Ask the adviser which client they'd like to discuss."
        )

    prompt = base.replace("{{CLIENT_CONTEXT}}", context_text)

    has_household = bool(client_context and "household_members" in client_context)
    logger.info(
        "System prompt built",
        has_client=client_context is not None,
        tax_plan_mode=tax_plan_mode,
        has_household_members=has_household,
        household_member_count=len(client_context.get("household_members", []))
        if client_context
        else 0,
        length=len(prompt),
        context_keys=list(client_context.keys()) if client_context else [],
    )
    return prompt


def _format_client_context(ctx: dict) -> str:
    """Format client tax data as readable context for the LLM."""
    lines = []

    if "client" in ctx:
        c = ctx["client"]
        lines.append(f"**Client:** {c.get('first_name', '')} {c.get('last_name', '')}")
        lines.append(f"**Region:** {c.get('region', 'england').title()}")
        lines.append(f"**Employment status:** {c.get('employment_status', 'employed')}")
        if c.get("marital_status"):
            lines.append(f"**Marital status:** {c['marital_status']}")
        if c.get("number_of_children", 0) > 0:
            cb = "yes" if c.get("claims_child_benefit") else "no"
            lines.append(f"**Children:** {c['number_of_children']} (claims child benefit: {cb})")
        if c.get("notes"):
            lines.append(f"\n**Adviser Notes:**\n{c['notes']}")

    if "tax_profile" in ctx:
        tp = ctx["tax_profile"]
        lines.append(f"\n**Tax Year:** {tp.get('tax_year', '2025/26')}")
        lines.append(f"**Total Income:** £{tp.get('total_income', 0):,.2f}")
        lines.append(f"**Adjusted Net Income:** £{tp.get('adjusted_net_income', 0):,.2f}")
        lines.append(f"**Total Tax:** £{tp.get('total_tax', 0):,.2f}")
        lines.append(f"**Effective Rate:** {tp.get('effective_rate', 0):.1f}%")
        lines.append(f"**Marginal Rate:** {tp.get('marginal_rate', 0):.0f}%")
        lines.append(f"**Personal Allowance Status:** {tp.get('pa_status', 'full')}")

        if tp.get("in_pa_taper_zone"):
            lines.append("**Alert:** Client is in the PA taper zone (£100k-£125,140)")
        if tp.get("hicbc_applies"):
            lines.append("**Alert:** HICBC applies")

        if tp.get("income_sources"):
            lines.append("\n**Income Sources:**")
            for src in tp["income_sources"]:
                label = src.get("label", src.get("source_type", "Unknown"))
                lines.append(f"- {label}: £{src.get('gross_amount', 0):,.2f}")

        if tp.get("allowances"):
            lines.append("\n**Allowances:**")
            for a in tp["allowances"]:
                a_label = a.get("label", a.get("type", ""))
                a_rem = a.get("remaining", 0)
                a_lim = a.get("annual_limit", 0)
                lines.append(f"- {a_label}: £{a_rem:,.0f} remaining of £{a_lim:,.0f}")

        if tp.get("pension_data"):
            pd = tp["pension_data"]
            ch = pd.get("contributions_history")
            if ch:
                lines.append("\n**Pension Carry Forward (prior year contributions):**")
                for year, vals in sorted(ch.items()):
                    personal = vals.get("personal", 0)
                    employer = vals.get("employer", 0)
                    total = personal + employer
                    lines.append(
                        f"- {year}: £{total:,.0f} contributed "
                        f"(personal: £{personal:,.0f}, employer: £{employer:,.0f})"
                    )

    if "household_members" in ctx:
        lines.append("\n**Household Members:**")
        for member in ctx["household_members"]:
            relation = " (Spouse)" if member.get("is_spouse") else ""
            lines.append(
                f"\n**{member.get('first_name', '')} {member.get('last_name', '')}**{relation}"
            )
            lines.append(f"- Employment: {member.get('employment_status', 'unknown')}")
            lines.append(f"- Region: {member.get('region', 'england').title()}")
            if member.get("number_of_children", 0) > 0:
                cb = "yes" if member.get("claims_child_benefit") else "no"
                lines.append(f"- Children: {member['number_of_children']} (claims CB: {cb})")
            if member.get("notes"):
                lines.append(f"- Notes: {member['notes']}")
            if "tax_profile" in member:
                tp = member["tax_profile"]
                lines.append(f"- Total Income: £{tp.get('total_income', 0):,.2f}")
                lines.append(f"- ANI: £{tp.get('adjusted_net_income', 0):,.2f}")
                lines.append(f"- Total Tax: £{tp.get('total_tax', 0):,.2f}")
                lines.append(f"- Effective Rate: {tp.get('effective_rate', 0):.1f}%")
                lines.append(f"- Marginal Rate: {tp.get('marginal_rate', 0):.0f}%")
                lines.append(f"- PA Status: {tp.get('pa_status', 'full')}")
                if tp.get("income_sources"):
                    lines.append("- Income Sources:")
                    for src in tp["income_sources"]:
                        lbl = src.get("label", src.get("source_type", "Unknown"))
                        lines.append(f"  - {lbl}: £{src.get('gross_amount', 0):,.2f}")
            else:
                lines.append("- Tax profile: not yet computed")

    if "observations" in ctx:
        lines.append("\n**Current Observations:**")
        for obs in ctx["observations"]:
            sev = obs.get("severity", "info").upper()
            tit = obs.get("title", "")
            desc = obs.get("description", "")
            lines.append(f"- [{sev}] {tit}: {desc}")

    if "meeting_notes" in ctx:
        notes = ctx["meeting_notes"]
        lines.append(
            f"\n**Meeting Notes:** {len(notes)} notes on file "
            "(use search_meeting_notes tool to retrieve)"
        )
        lines.append("Recent topics:")
        for note in notes[:5]:
            lines.append(f"- {note.get('date', '')} — {note.get('subject', '')}")

    return "\n".join(lines)
