"""Meeting notes search tool — full-text search (FTS5 on SQLite, tsvector on PostgreSQL)."""

from sqlalchemy import text

from app.config import get_settings
from app.core.logging import get_logger
from app.db.engine import async_session_factory

logger = get_logger(__name__)


async def execute_search_meeting_notes(tool_input: dict, *, context: dict | None = None) -> dict:
    """Search meeting notes by full-text, scoped to client_id from context."""
    query = tool_input.get("query", "").strip()
    client_id = (context or {}).get("client_id")
    limit = min(tool_input.get("limit", 5), 20)

    if not query:
        return {"success": False, "error": "query is required"}
    if not client_id:
        return {"success": False, "error": "client_id missing from context"}

    async with async_session_factory() as session:
        if get_settings().is_postgres:
            rows = await _search_postgres(session, query, client_id, limit)
        else:
            rows = await _search_sqlite(session, query, client_id, limit)

    results: list = []
    for row in rows:
        results.append(
            {
                "note_id": row.note_id,
                "subject": row.subject,
                "excerpt": row.excerpt,
                "meeting_date": str(row.meeting_date),
                "attendees": row.attendees,
                "summary": row.summary,
                "action_items": row.action_items,
            }
        )

    logger.info(
        "Meeting notes search completed",
        query=query,
        client_id=client_id,
        result_count=len(results),
    )

    return {
        "success": True,
        "results": results,
        "count": len(results),
    }


async def _search_postgres(session, query: str, client_id: str, limit: int):
    """PostgreSQL full-text search using tsvector and headline() for excerpt."""
    # Build tsquery from user query (plainto_tsquery for simple multi-word)
    result = await session.execute(
        text("""
            SELECT m.id AS note_id, m.subject,
                   ts_headline('english', m.summary, plainto_tsquery('english', :query),
                               'StartSel=** StopSel=** MaxFragments=1 MaxWords=40') AS excerpt,
                   m.meeting_date, m.attendees, m.summary, m.action_items
            FROM meeting_notes m
            WHERE m.client_id = :client_id
              AND m.search_vector @@ plainto_tsquery('english', :query)
            ORDER BY ts_rank(m.search_vector, plainto_tsquery('english', :query)) DESC
            LIMIT :limit
        """),
        {"query": query, "client_id": client_id, "limit": limit},
    )
    return result.fetchall()


async def _search_sqlite(session, query: str, client_id: str, limit: int):
    """SQLite FTS5 search with LIKE fallback."""
    try:
        result = await session.execute(
            text("""
                SELECT f.note_id, f.subject,
                       snippet(meeting_notes_fts, 3, '**', '**', '...', 40) as excerpt,
                       m.meeting_date, m.attendees, m.summary, m.action_items
                FROM meeting_notes_fts f
                JOIN meeting_notes m ON m.id = f.note_id
                WHERE meeting_notes_fts MATCH :query
                  AND f.client_id = :client_id
                ORDER BY rank
                LIMIT :limit
            """),
            {"query": query, "client_id": client_id, "limit": limit},
        )
        return result.fetchall()
    except Exception as e:
        logger.warning("FTS5 query failed, falling back to LIKE", error=str(e))
        like_pattern = f"%{query}%"
        result = await session.execute(
            text("""
                SELECT id as note_id, subject, summary as excerpt,
                       meeting_date, attendees, summary, action_items
                FROM meeting_notes
                WHERE client_id = :client_id
                  AND (subject LIKE :pattern OR summary LIKE :pattern)
                ORDER BY meeting_date DESC
                LIMIT :limit
            """),
            {"client_id": client_id, "pattern": like_pattern, "limit": limit},
        )
        return result.fetchall()
