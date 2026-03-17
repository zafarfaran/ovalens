"""Chat service — orchestration layer for conversations and LLM streaming."""

import time
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.metrics import (
    record_chat_stream_completion,
    record_chat_stream_error,
    record_chat_stream_start,
    record_chat_time_to_first_token,
)
from app.db.models import (
    Client,
    Conversation,
    MeetingNote,
    Message,
    Observation,
    TaxProfile,
)
from app.services.llm.factory import get_llm_provider
from app.services.llm.types import (
    DashboardUpdateEvent,
    DoneEvent,
    ErrorEvent,
    StatusEvent,
    StatusPhase,
    StreamEvent,
    TokenEvent,
    ToolCallEvent,
    ToolResultEvent,
)
from app.services.system_prompt import build_system_prompt
from app.services.tools import execute_tool

logger = get_logger(__name__)


class ChatService:
    """Manages conversations, persists messages, and streams LLM responses."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Conversation CRUD
    # ------------------------------------------------------------------

    async def create_conversation(
        self,
        user_id: str,
        client_id: str | None = None,
        title: str | None = None,
    ) -> Conversation:
        """Create a new conversation row. client_id optional (chat without a client)."""
        if client_id:
            result = await self.session.execute(
                select(Client).where(Client.id == client_id).where(Client.user_id == user_id)
            )
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Client not found or access denied.",
                )
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            client_id=client_id or None,
            title=title or "New conversation",
            status="active",
            message_count=0,
            unread=False,
        )
        self.session.add(conversation)
        await self.session.commit()
        await self.session.refresh(conversation)
        logger.info(
            "conversation_created",
            conversation_id=conversation.id,
            client_id=client_id,
        )
        return conversation

    async def list_conversations(
        self,
        user_id: str,
        client_id: str | None = None,
    ) -> list[Conversation]:
        """List conversations for a user, excluding soft-deleted ones."""
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .where(Conversation.status != "deleted")
        )
        if client_id:
            stmt = stmt.where(Conversation.client_id == client_id)
        stmt = stmt.order_by(
            desc(Conversation.last_message_at),
            desc(Conversation.created_at),
        )
        result = await self.session.execute(stmt)
        conversations = list(result.scalars().all())
        logger.debug(
            "conversations_listed",
            client_id=client_id,
            count=len(conversations),
        )
        return conversations

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        """Fetch a single conversation by ID."""
        result = await self.session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            logger.warning(
                "conversation_not_found",
                conversation_id=conversation_id,
            )
        return conversation

    async def delete_conversation(self, conversation_id: str) -> None:
        """Soft-delete a conversation by setting status to 'deleted'."""
        await self.session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(status="deleted", updated_at=datetime.now(UTC))
        )
        await self.session.commit()
        logger.info(
            "conversation_deleted",
            conversation_id=conversation_id,
        )

    async def update_conversation(self, conversation_id: str, **kwargs) -> None:
        """Update arbitrary fields on a conversation."""
        kwargs["updated_at"] = datetime.now(UTC)
        await self.session.execute(
            update(Conversation).where(Conversation.id == conversation_id).values(**kwargs)
        )
        await self.session.commit()
        logger.debug(
            "conversation_updated",
            conversation_id=conversation_id,
            fields=list(kwargs.keys()),
        )

    # ------------------------------------------------------------------
    # Messages
    # ------------------------------------------------------------------

    async def get_messages(
        self,
        conversation_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Message]:
        """Return messages for a conversation ordered by created_at ASC."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        messages = list(result.scalars().all())
        logger.debug(
            "messages_loaded",
            conversation_id=conversation_id,
            count=len(messages),
        )
        return messages

    # ------------------------------------------------------------------
    # Stream (main flow)
    # ------------------------------------------------------------------

    async def stream_message(
        self,
        conversation_id: str | None,
        user_id: str,
        client_id: str | None,
        content: str,
        tax_plan_mode: bool = False,
        context_snippet_ids: list[str] | None = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Send a user message and stream the LLM assistant response.

        Steps:
        1. Auto-create conversation if conversation_id is empty/None
        2. Save user message
        3. Load conversation history (last 50)
        4. Load client tax context
        5. Build system prompt
        6. Format messages for LLM
        7. Call LLM provider stream_chat
        8. Iterate stream, accumulate tokens
        9. Save assistant message
        10. Update conversation cache
        11. Yield DoneEvent
        """
        stream_start = time.perf_counter()
        record_chat_stream_start()
        first_token_time: float | None = None

        # 1. Resolve or create conversation (avoid FK violation when client sends stale/missing id)
        if not conversation_id:
            conversation = await self.create_conversation(user_id, client_id)
            conversation_id = conversation.id
            logger.info(
                "conversation_auto_created",
                conversation_id=conversation_id,
            )
        else:
            existing = await self.get_conversation(conversation_id)
            if existing is None or existing.user_id != user_id:
                requested_id = conversation_id
                conversation = await self.create_conversation(user_id, client_id)
                conversation_id = conversation.id
                logger.info(
                    "conversation_not_found_or_denied_created_new",
                    requested_id=requested_id,
                    conversation_id=conversation_id,
                )

        # 2. Save user message (do not log raw content)
        user_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=content,
        )
        self.session.add(user_message)
        await self.session.commit()
        logger.info(
            "user_message_saved",
            conversation_id=conversation_id,
            message_id=user_message.id,
            content_length=len(content),
        )

        # 3. Load conversation history (last 50 messages)
        history = await self._load_history(conversation_id)

        # 4. Load client tax context
        client_context, tax_profile_obj = await self._load_client_context(client_id)

        # 5. Build system prompt with client context
        system_prompt = build_system_prompt(client_context, tax_plan_mode=tax_plan_mode)

        # 5b. Load and inject context snippets if provided
        external_context = ""
        if context_snippet_ids:
            external_context = await self._load_and_consume_snippets(context_snippet_ids)

        if external_context:
            system_prompt += external_context

        # 6. Format messages for LLM
        llm_messages = [{"role": m.role, "content": m.content} for m in history]

        # 7. Build tool context and optionally precompute the tax position.
        pension_contributions_by_year = None
        if tax_profile_obj and tax_profile_obj.pension_data:
            ch = tax_profile_obj.pension_data.get("contributions_history", {})
            if ch:
                pension_contributions_by_year = {
                    year: float(vals.get("personal", 0)) + float(vals.get("employer", 0))
                    for year, vals in ch.items()
                }

        tool_context = {
            "client_id": client_id or "",
            "pension_contributions_by_year": pension_contributions_by_year,
        }

        # 8. Call LLM provider
        provider = get_llm_provider()
        full_response = ""
        assistant_message_id = str(uuid.uuid4())
        dashboard_data: dict | None = None

        # If we have client tax inputs, precompute once so the UI always gets
        # deterministic tax cards even when the model skips the tool call.
        if client_context and tax_profile_obj and (tax_profile_obj.income_sources or []):
            client_info = client_context.get("client", {})
            precompute_input = {
                "income_sources": tax_profile_obj.income_sources or [],
                "region": client_info.get("region", "england"),
                "number_of_children": client_info.get("number_of_children", 0),
                "claims_child_benefit": client_info.get("claims_child_benefit", False),
                "tax_year": tax_profile_obj.tax_year,
            }
            yield StatusEvent(phase=StatusPhase.COMPUTING_TAX)
            yield ToolCallEvent(tool="compute_tax_position", tool_input=precompute_input)
            precomputed = await execute_tool(
                "compute_tax_position", precompute_input, context=tool_context
            )
            yield ToolResultEvent(tool="compute_tax_position", result=precomputed)
            if precomputed.get("success") and precomputed.get("dashboardData"):
                dashboard_data = precomputed.get("dashboardData")
                yield DashboardUpdateEvent(
                    data=precomputed["dashboardData"],
                    mode="reset",
                )
            # Move back to general "understanding" phase before model response.
            yield StatusEvent(phase=StatusPhase.UNDERSTANDING)

        # 9. Iterate the async generator
        logger.info(
            "llm_stream_started",
            conversation_id=conversation_id,
            history_length=len(llm_messages),
            has_client_context=client_context is not None,
        )
        # Always provide all tools — engine tools must always be available
        # so Claude never attempts to calculate tax numbers itself
        from app.services.llm.claude import (
            BASE_TOOLS,
            DASHBOARD_TOOLS,
            ENGINE_TOOLS,
            OBSERVATION_TOOLS,
            WEB_SEARCH_TOOL,
        )

        tools = list(BASE_TOOLS)
        tools.extend(ENGINE_TOOLS)
        tools.extend(DASHBOARD_TOOLS)
        tools.extend(OBSERVATION_TOOLS)
        tools.extend(WEB_SEARCH_TOOL)
        tool_names = [t.get("name") for t in tools]
        logger.info(
            "chat_tools_configured",
            tool_count=len(tools),
            tool_names=tool_names,
            has_web_search=any(t.get("type", "").startswith("web_search") for t in tools),
        )

        async for event in provider.stream_chat(
            llm_messages, system_prompt, tools=tools, tool_context=tool_context
        ):
            if isinstance(event, TokenEvent):
                if first_token_time is None:
                    first_token_time = time.perf_counter() - stream_start
                    record_chat_time_to_first_token(first_token_time)
                full_response += event.content
            elif isinstance(event, ToolResultEvent) and event.tool == "generate_dashboard":
                result = event.result
                if result.get("success"):
                    dashboard_data = result.get("dashboardData")
            elif isinstance(event, ErrorEvent):
                record_chat_stream_error()
                logger.error(
                    "llm_stream_error",
                    conversation_id=conversation_id,
                    code=event.code,
                )
            yield event

        # 9. Save assistant message with full_response and dashboard_data
        assistant_message = Message(
            id=assistant_message_id,
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            dashboard_data=dashboard_data,
        )
        self.session.add(assistant_message)
        logger.info(
            "assistant_message_saved",
            conversation_id=conversation_id,
            message_id=assistant_message_id,
            response_length=len(full_response),
        )

        # 10. Update conversation cache
        now = datetime.now(UTC)
        preview = full_response[:200] if full_response else ""

        # Load the conversation to check title
        conversation = await self.get_conversation(conversation_id)
        update_values: dict = {
            "last_message_preview": preview,
            "last_message_at": now,
            "message_count": Conversation.message_count + 2,
            "updated_at": now,
        }

        # Auto-update title if still "New conversation"
        if conversation and conversation.title == "New conversation":
            update_values["title"] = content[:80]

        await self.session.execute(
            update(Conversation).where(Conversation.id == conversation_id).values(**update_values)
        )
        await self.session.commit()
        duration_ms = round((time.perf_counter() - stream_start) * 1000, 2)
        logger.info(
            "conversation_cache_updated",
            conversation_id=conversation_id,
            duration_ms=duration_ms,
        )

        record_chat_stream_completion()

        # 11. Yield DoneEvent with conversation_id and message_id
        yield DoneEvent(
            conversation_id=conversation_id,
            message_id=assistant_message_id,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _load_history(self, conversation_id: str) -> list[Message]:
        """Load last 50 messages ordered by created_at."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(50)
        )
        result = await self.session.execute(stmt)
        messages = list(result.scalars().all())
        logger.debug(
            "history_loaded",
            conversation_id=conversation_id,
            count=len(messages),
        )
        return messages

    async def _load_client_context(
        self, client_id: str | None
    ) -> tuple[dict | None, TaxProfile | None]:
        """Load client, latest tax profile, and undismissed observations.

        Returns the dict structure expected by ``build_system_prompt()``
        and the raw TaxProfile object (for pension contribution history).
        When client_id is None (no client selected), returns (None, None).
        """
        if not client_id:
            return None, None
        # Load client
        result = await self.session.execute(select(Client).where(Client.id == client_id))
        client = result.scalar_one_or_none()
        if client is None:
            logger.warning(
                "client_not_found",
                client_id=client_id,
            )
            return None, None

        logger.info(
            "client_context_loading",
            client_id=client_id,
            household_id=client.household_id,
        )

        # Load latest tax profile (most recent by created_at)
        result = await self.session.execute(
            select(TaxProfile)
            .where(TaxProfile.client_id == client_id)
            .order_by(desc(TaxProfile.created_at))
            .limit(1)
        )
        tax_profile = result.scalar_one_or_none()

        # Load undismissed observations
        result = await self.session.execute(
            select(Observation)
            .where(Observation.client_id == client_id)
            .where(Observation.is_dismissed == False)  # noqa: E712
        )
        observations = list(result.scalars().all())

        # Load meeting notes — lightweight (dates + subjects only for the index)
        result = await self.session.execute(
            select(MeetingNote.meeting_date, MeetingNote.subject)
            .where(MeetingNote.client_id == client_id)
            .order_by(desc(MeetingNote.meeting_date))
            .limit(10)
        )
        meeting_notes = result.all()

        # Load household members (other clients in the same household)
        household_members = []
        if client.household_id:
            logger.info(
                "household_members_loading",
                household_id=client.household_id,
                client_id=client_id,
            )
            result = await self.session.execute(
                select(Client)
                .where(Client.household_id == client.household_id)
                .where(Client.id != client_id)
            )
            other_members = list(result.scalars().all())
            logger.info(
                "household_members_loaded",
                household_id=client.household_id,
                member_count=len(other_members),
            )

            for member in other_members:
                # Load their latest tax profile
                result = await self.session.execute(
                    select(TaxProfile)
                    .where(TaxProfile.client_id == member.id)
                    .order_by(desc(TaxProfile.created_at))
                    .limit(1)
                )
                member_tax_profile = result.scalar_one_or_none()

                member_info: dict = {
                    "id": member.id,
                    "first_name": member.first_name,
                    "last_name": member.last_name,
                    "region": member.region,
                    "employment_status": member.employment_status,
                    "is_spouse": member.id == client.spouse_id,
                    "number_of_children": member.number_of_children,
                    "claims_child_benefit": member.claims_child_benefit,
                    "notes": member.notes,
                }
                if member_tax_profile:
                    member_info["tax_profile"] = {
                        "tax_year": member_tax_profile.tax_year,
                        "total_income": member_tax_profile.total_income,
                        "adjusted_net_income": member_tax_profile.adjusted_net_income,
                        "total_tax": member_tax_profile.total_tax,
                        "effective_rate": member_tax_profile.effective_rate,
                        "marginal_rate": member_tax_profile.marginal_rate,
                        "pa_status": member_tax_profile.pa_status,
                        "in_pa_taper_zone": member_tax_profile.in_pa_taper_zone,
                        "hicbc_applies": member_tax_profile.hicbc_applies,
                        "income_sources": member_tax_profile.income_sources or [],
                    }
                household_members.append(member_info)

        # Build context dict
        context: dict = {
            "client": {
                "first_name": client.first_name,
                "last_name": client.last_name,
                "region": client.region,
                "employment_status": client.employment_status,
                "number_of_children": client.number_of_children,
                "claims_child_benefit": client.claims_child_benefit,
                "marital_status": client.marital_status,
                "notes": client.notes,
            },
        }

        if tax_profile:
            context["tax_profile"] = {
                "tax_year": tax_profile.tax_year,
                "total_income": tax_profile.total_income,
                "adjusted_net_income": tax_profile.adjusted_net_income,
                "total_tax": tax_profile.total_tax,
                "effective_rate": tax_profile.effective_rate,
                "marginal_rate": tax_profile.marginal_rate,
                "pa_status": tax_profile.pa_status,
                "in_pa_taper_zone": tax_profile.in_pa_taper_zone,
                "hicbc_applies": tax_profile.hicbc_applies,
                "income_sources": tax_profile.income_sources or [],
                "allowances": tax_profile.allowances or [],
                "pension_data": tax_profile.pension_data,
            }

        if household_members:
            context["household_members"] = household_members

        if observations:
            context["observations"] = [
                {
                    "severity": obs.severity,
                    "title": obs.title,
                    "description": obs.description,
                    "potential_saving": obs.potential_saving,
                }
                for obs in observations
            ]

        if meeting_notes:
            context["meeting_notes"] = [
                {
                    "date": note.meeting_date.strftime("%Y-%m-%d"),
                    "subject": note.subject,
                }
                for note in meeting_notes
            ]

        logger.info(
            "client_context_loaded",
            client_id=client_id,
            has_tax_profile=tax_profile is not None,
            observation_count=len(observations),
            meeting_note_count=len(meeting_notes),
            household_member_count=len(household_members),
        )
        return context, tax_profile

    async def _load_and_consume_snippets(self, snippet_ids: list[str]) -> str:
        """Load context snippets, mark as consumed, return formatted context."""
        from app.db.models import ContextSnippet

        result = await self.session.execute(
            select(ContextSnippet)
            .where(ContextSnippet.id.in_(snippet_ids))
            .where(ContextSnippet.is_consumed == False)  # noqa: E712
        )
        snippets = list(result.scalars().all())

        if not snippets:
            return ""

        # Mark as consumed
        for s in snippets:
            s.is_consumed = True
        await self.session.commit()

        # Format for the system prompt
        lines = ["\n\n## External Web Context\n"]
        lines.append("The adviser has captured the following web page(s) for reference:\n")
        for s in snippets:
            lines.append(f"### {s.source_title}")
            lines.append(f"**Source:** {s.source_url}")
            lines.append(f"**Captured:** {s.capture_type.replace('_', ' ')}\n")
            lines.append(s.cleaned_markdown)
            lines.append("")

        logger.info(
            "context_snippets_injected",
            count=len(snippets),
        )
        return "\n".join(lines)
