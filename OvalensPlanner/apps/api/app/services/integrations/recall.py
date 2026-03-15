"""Recall AI integration client and webhook verification helpers."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RecallBotCreateResult:
    bot_id: str
    raw: dict[str, Any]


class RecallClient:
    """Minimal Recall API client for creating meeting bots."""

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.recall_api_key:
            raise HTTPException(status_code=500, detail="RECALL_API_KEY is not configured")
        self.api_key = settings.recall_api_key
        self.base_url = settings.recall_api_base_url.rstrip("/")

    async def create_bot(
        self,
        *,
        meeting_url: str,
        webhook_url: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> RecallBotCreateResult:
        payload: dict[str, Any] = {
            "meeting_url": meeting_url,
        }
        if webhook_url:
            payload["webhook_url"] = webhook_url
        if metadata:
            payload["metadata"] = metadata

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    f"{self.base_url}/bot/",
                    headers={
                        "Authorization": f"Token {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )
        except httpx.TimeoutException as e:
            logger.error("recall_create_bot_timeout", error=str(e))
            raise HTTPException(
                status_code=502,
                detail="Recall AI request timed out. Try again or use a scheduled meeting.",
            ) from e
        except httpx.RequestError as e:
            logger.error("recall_create_bot_network_error", error=str(e))
            raise HTTPException(
                status_code=502,
                detail=f"Cannot reach Recall AI: {str(e)}",
            ) from e

        if response.status_code >= 400:
            try:
                err_body = response.json()
                msg = err_body.get("detail") or err_body.get("message") or response.text[:200]
            except Exception:
                msg = response.text[:200]
            logger.error(
                "recall_create_bot_failed",
                status_code=response.status_code,
                body=response.text[:500],
            )
            raise HTTPException(
                status_code=502,
                detail=f"Recall AI error ({response.status_code}): {msg}",
            )

        try:
            data = response.json()
        except Exception as e:
            logger.error("recall_create_bot_invalid_json", text=response.text[:300])
            raise HTTPException(
                status_code=502,
                detail="Recall AI returned invalid response",
            ) from e
        bot_id = str(data.get("id") or data.get("bot_id") or "").strip()
        if not bot_id:
            logger.error("recall_create_bot_invalid_response", response=data)
            raise HTTPException(status_code=502, detail="Recall response missing bot id")
        return RecallBotCreateResult(bot_id=bot_id, raw=data)

    async def create_async_transcript(
        self,
        recording_id: str,
        *,
        language_code: str = "en",
        use_separate_streams_when_available: bool = False,
    ) -> str:
        """Kick off async transcription for a recording. Returns transcript artifact id.
        See https://docs.recall.ai/reference/create_async_transcript and
        https://github.com/recallai/sample-apps/tree/main/bot_async_transcription
        """
        body: dict[str, Any] = {
            "provider": {
                "recallai_async": {
                    "language_code": language_code,
                }
            }
        }
        if use_separate_streams_when_available:
            body["diarization"] = {"use_separate_streams_when_available": True}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}/recording/{recording_id}/create_transcript/",
                    headers={
                        "Authorization": f"Token {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(body),
                )
        except httpx.TimeoutException as e:
            logger.error("recall_create_transcript_timeout", recording_id=recording_id, error=str(e))
            raise HTTPException(
                status_code=502,
                detail="Recall AI create transcript request timed out.",
            ) from e
        except httpx.RequestError as e:
            logger.error("recall_create_transcript_network_error", recording_id=recording_id, error=str(e))
            raise HTTPException(status_code=502, detail=f"Cannot reach Recall AI: {str(e)}") from e
        if response.status_code >= 400:
            _raise_recall_error(response, "create_transcript")
        data = response.json()
        transcript_id = str(data.get("id") or "").strip()
        if not transcript_id:
            raise HTTPException(status_code=502, detail="Recall returned no transcript id")
        return transcript_id

    async def get_transcript_by_id(self, transcript_id: str) -> list[dict[str, Any]]:
        """Fetch transcript by artifact id (GET transcript/{id}/ then download_url). Returns list of chunks."""
        headers = {"Authorization": f"Token {self.api_key}"}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                art_resp = await client.get(
                    f"{self.base_url}/transcript/{transcript_id}/",
                    headers=headers,
                )
                if art_resp.status_code == 404:
                    raise HTTPException(status_code=404, detail="Transcript not found")
                if art_resp.status_code >= 400:
                    _raise_recall_error(art_resp, "transcript retrieve")
                artifact = art_resp.json()
                download_url = (artifact.get("data") or {}).get("download_url") if isinstance(artifact, dict) else None
                if not download_url:
                    raise HTTPException(status_code=502, detail="Transcript artifact has no download_url")
                down_resp = await client.get(download_url, headers=headers)
                if down_resp.status_code >= 400:
                    raise HTTPException(status_code=502, detail="Failed to download transcript content")
                data = down_resp.json()
        except HTTPException:
            raise
        except httpx.RequestError as e:
            logger.error("recall_get_transcript_by_id_error", transcript_id=transcript_id, error=str(e))
            raise HTTPException(status_code=502, detail=f"Cannot reach Recall AI: {str(e)}") from e
        return _parse_transcript_to_chunks(data)

    async def get_bot_transcript(self, bot_id: str) -> list[dict[str, Any]]:
        """Fetch transcript for a bot (bot retrieve → transcript id → get_transcript_by_id)."""
        headers = {"Authorization": f"Token {self.api_key}"}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                bot_resp = await client.get(
                    f"{self.base_url}/bot/{bot_id}/",
                    headers=headers,
                )
                if bot_resp.status_code == 404:
                    raise HTTPException(status_code=404, detail="Bot not found")
                if bot_resp.status_code >= 400:
                    _raise_recall_error(bot_resp, "bot retrieve")
                bot_data = bot_resp.json()
                transcript_id = _extract_transcript_id_from_bot(bot_data)
                if not transcript_id:
                    raise HTTPException(
                        status_code=404,
                        detail="Transcript not ready yet. Wait a few minutes after the meeting ends.",
                    )
        except HTTPException:
            raise
        except httpx.RequestError as e:
            logger.error("recall_get_transcript_network_error", bot_id=bot_id, error=str(e))
            raise HTTPException(status_code=502, detail=f"Cannot reach Recall AI: {str(e)}") from e
        return await self.get_transcript_by_id(transcript_id)


def _raise_recall_error(response: httpx.Response, context: str) -> None:
    try:
        err_body = response.json()
        msg = err_body.get("detail") or err_body.get("message") or response.text[:200]
        if isinstance(msg, list):
            msg = " ".join(str(m) for m in msg[:3])
    except Exception:
        msg = response.text[:200]
    raise HTTPException(
        status_code=502,
        detail=f"Recall AI error ({response.status_code}): {msg}",
    )


def _extract_transcript_id_from_bot(bot_data: dict[str, Any]) -> str | None:
    recordings = bot_data.get("recordings") or []
    for rec in recordings:
        if not isinstance(rec, dict):
            continue
        shortcuts = rec.get("media_shortcuts") or {}
        transcript = shortcuts.get("transcript") if isinstance(shortcuts, dict) else None
        if isinstance(transcript, dict) and transcript.get("id"):
            return str(transcript["id"])
    return None


def _parse_transcript_to_chunks(data: Any) -> list[dict[str, Any]]:
    """Normalize Recall transcript JSON to list of {speaker, text, ts_start, ts_end}."""
    chunks: list[dict[str, Any]] = []

    # Recall async transcript: list of { participant: { name }, words: [ { text, start_timestamp: { relative }, end_timestamp: { relative } } ] }
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            participant = item.get("participant") or {}
            speaker = participant.get("name") if isinstance(participant, dict) else None
            words = item.get("words") or []
            if not words:
                continue
            texts = []
            ts_start = None
            ts_end = None
            for w in words:
                if not isinstance(w, dict):
                    continue
                t = w.get("text") or w.get("word") or ""
                if t:
                    texts.append(t)
                st = w.get("start_timestamp") or w.get("start_timestamp_seconds")
                et = w.get("end_timestamp") or w.get("end_timestamp_seconds")
                if isinstance(st, dict) and st.get("relative") is not None:
                    ts_start = st["relative"] if ts_start is None else ts_start
                elif isinstance(st, (int, float)):
                    ts_start = st if ts_start is None else ts_start
                if isinstance(et, dict) and et.get("relative") is not None:
                    ts_end = et["relative"]
                elif isinstance(et, (int, float)):
                    ts_end = et
            if texts:
                chunks.append({
                    "speaker": speaker,
                    "text": " ".join(texts),
                    "ts_start": ts_start,
                    "ts_end": ts_end,
                })
        return chunks

    if not isinstance(data, dict):
        return chunks
    paragraphs = data.get("paragraphs") or data.get("segments") or data.get("utterances") or []
    if not paragraphs and "words" in data:
        words = data["words"]
        if words and isinstance(words, list):
            texts = [w.get("text") or w.get("word") or "" for w in words if w.get("text") or w.get("word")]
            if texts:
                chunks.append({
                    "speaker": (words[0].get("speaker") or words[0].get("speaker_name")) if words else None,
                    "text": " ".join(texts),
                    "ts_start": words[0].get("start") or words[0].get("start_time") or words[0].get("start_time_seconds"),
                    "ts_end": words[-1].get("end") or words[-1].get("end_time") or words[-1].get("end_time_seconds") if words else None,
                })
    for para in paragraphs:
        if not isinstance(para, dict):
            continue
        text = (para.get("text") or para.get("content") or "").strip()
        if not text and "words" in para:
            wlist = para.get("words") or []
            text = " ".join(str(w.get("text") or w.get("word") or "") for w in wlist).strip()
        if not text:
            continue
        speaker = para.get("speaker") or para.get("speaker_name") or para.get("participant") or para.get("name")
        ts_start = para.get("start") or para.get("start_time") or para.get("start_time_seconds")
        ts_end = para.get("end") or para.get("end_time") or para.get("end_time_seconds")
        chunks.append({"speaker": speaker, "text": text, "ts_start": ts_start, "ts_end": ts_end})
    if not chunks and data.get("text"):
        chunks.append({"speaker": None, "text": data["text"], "ts_start": None, "ts_end": None})
    return chunks


def verify_recall_webhook_signature(raw_body: bytes, headers: dict[str, str]) -> tuple[bool, str]:
    """Verify Recall webhook signature using HMAC SHA-256.

    Expected headers:
    - x-recall-signature: hex digest or "v1=<hex>"
    - x-recall-timestamp: unix seconds (optional but recommended)
    """

    settings = get_settings()
    secret = (settings.recall_webhook_secret or "").strip()
    if not secret:
        return False, "missing_webhook_secret"

    signature = (
        headers.get("x-recall-signature")
        or headers.get("X-Recall-Signature")
        or headers.get("recall-signature")
        or ""
    ).strip()
    timestamp = (
        headers.get("x-recall-timestamp")
        or headers.get("X-Recall-Timestamp")
        or headers.get("recall-timestamp")
        or ""
    ).strip()
    if not signature:
        return False, "missing_signature"
    if signature.startswith("v1="):
        signature = signature[3:]

    tolerance = max(30, int(settings.recall_webhook_tolerance_seconds))
    if not timestamp:
        return False, "missing_timestamp"
    try:
        ts_value = int(timestamp)
    except ValueError:
        return False, "invalid_timestamp"
    if abs(int(time.time()) - ts_value) > tolerance:
        return False, "timestamp_out_of_window"

    signed_payload = raw_body if not timestamp else f"{timestamp}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return False, "signature_mismatch"
    return True, "ok"
