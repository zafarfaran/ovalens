"""Chat endpoint — AI streaming responses and conversation CRUD."""

import json
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.config import get_settings
from app.db.engine import get_db_session
from app.dependencies import get_current_user, get_request_logger, rate_limit_chat_stream
from app.services.chat import ChatService

router = APIRouter(tags=["chat"])


# ─── Pydantic request/response models ────────────────────────────────────


class ChatStreamRequest(BaseModel):
    conversation_id: str | None = None
    client_id: str
    message: str
    tax_plan_mode: bool = False
    context_snippet_ids: list[str] | None = None


class CreateConversationRequest(BaseModel):
    client_id: str
    title: str | None = None


class UpdateConversationRequest(BaseModel):
    title: str | None = None
    status: str | None = None


# ─── Endpoints ────────────────────────────────────────────────────────────


@router.post(
    "/chat/stream",
    responses={
        413: {"description": "Message exceeds maximum length"},
        429: {
            "description": "Rate limit exceeded",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Rate limit exceeded. Try again later.",
                        },
                        "retry_after_seconds": 45,
                    }
                }
            },
        }
    },
)
async def chat_stream(
    body: ChatStreamRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
    _rate_limit: None = Depends(rate_limit_chat_stream),
):
    """SSE streaming endpoint for AI chat responses."""
    settings = get_settings()
    max_len = settings.chat_max_message_length
    if max_len > 0 and len(body.message) > max_len:
        raise HTTPException(
            status_code=413,
            detail=f"Message exceeds maximum length ({max_len} characters).",
        )
    logger.info(
        "Chat stream request",
        user_id=user_id,
        client_id=body.client_id,
        conversation_id=body.conversation_id,
        message_length=len(body.message),
    )

    service = ChatService(session)

    async def event_generator():
        async for event in service.stream_message(
            conversation_id=body.conversation_id,
            user_id=user_id,
            client_id=body.client_id,
            content=body.message,
            tax_plan_mode=body.tax_plan_mode,
            context_snippet_ids=body.context_snippet_ids,
        ):
            data = json.dumps(asdict(event))
            yield f"event: {event.type}\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/conversations")
async def list_conversations(
    client_id: str | None = None,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """List conversations, optionally filtered by client_id."""
    logger.info(
        "Listing conversations",
        user_id=user_id,
        client_id=client_id,
    )

    service = ChatService(session)
    conversations = await service.list_conversations(
        user_id=user_id,
        client_id=client_id,
    )

    return {
        "conversations": [
            {
                "id": c.id,
                "client_id": c.client_id,
                "title": c.title,
                "status": c.status,
                "last_message_preview": c.last_message_preview,
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "message_count": c.message_count,
                "unread": c.unread,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in conversations
        ]
    }


@router.post("/chat/conversations")
async def create_conversation(
    body: CreateConversationRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """Create a new conversation."""
    logger.info(
        "Creating conversation",
        user_id=user_id,
        client_id=body.client_id,
        title=body.title,
    )

    service = ChatService(session)
    conversation = await service.create_conversation(
        user_id=user_id,
        client_id=body.client_id,
        title=body.title,
    )

    return {
        "id": conversation.id,
        "title": conversation.title,
        "client_id": conversation.client_id,
    }


@router.get("/chat/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """Get messages for a conversation."""
    service = ChatService(session)
    conv = await service.get_conversation(conversation_id)
    if conv is None or conv.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    logger.info("Fetching messages", conversation_id=conversation_id)
    messages = await service.get_messages(conversation_id)

    return {
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "insights": m.insights,
                "dashboard_data": m.dashboard_data,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }


@router.patch("/chat/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    body: UpdateConversationRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """Update a conversation's title or status."""
    service = ChatService(session)
    conv = await service.get_conversation(conversation_id)
    if conv is None or conv.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    logger.info(
        "Updating conversation",
        conversation_id=conversation_id,
        title=body.title,
        status=body.status,
    )
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await service.update_conversation(conversation_id, **updates)
    return {"ok": True}


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """Soft-delete a conversation."""
    service = ChatService(session)
    conv = await service.get_conversation(conversation_id)
    if conv is None or conv.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    logger.info("Deleting conversation", conversation_id=conversation_id)
    await service.delete_conversation(conversation_id)
    return {"ok": True}
