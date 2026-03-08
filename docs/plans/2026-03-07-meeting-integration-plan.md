# Meeting Integration MVP Plan

**Goal:** Build a scalable, provider-agnostic meeting orchestration flow where Ovalens owns scheduling and note workflow, while Google Meet is the first meeting provider.

**Architecture:** Add a dedicated `Calendar & Meetings` settings area, create meetings from Ovalens with Google Calendar + Meet as the first provider, support manual per-meeting agent attachment in the MVP, and normalize meeting output into the existing `MeetingNote` pipeline so chat, search, timelines, and reporting continue to work through one retrieval system.

**Tech Stack:** Next.js/React, FastAPI, SQLAlchemy, existing meeting-notes retrieval pipeline

---

## Existing Foundation

- Settings UI already exists in `D:/Projects/ovalens/OvalensPlanner/apps/web/src/app/settings/page.tsx`, but calendar and meeting controls are currently mixed into generic integrations.
- Meeting notes already have storage and retrieval in `D:/Projects/ovalens/OvalensPlanner/apps/api/app/db/models.py`, `D:/Projects/ovalens/OvalensPlanner/apps/api/app/services/tools/meeting_notes.py`, and `D:/Projects/ovalens/OvalensPlanner/apps/api/app/routers/clients.py`.
- There is an in-progress signal for external-source idempotency in `D:/Projects/ovalens/OvalensPlanner/apps/api/alembic/versions/004_meeting_notes_source_source_id.py`.

## Phase 1: Product Surface

- Expand the settings IA in `D:/Projects/ovalens/OvalensPlanner/apps/web/src/app/settings/page.tsx` to add a dedicated `Calendar & Meetings` section.
- Include controls for:
  - Google Calendar connection state
  - default meeting duration
  - default conference provider
  - note-agent default behavior
  - transcription and consent preferences
  - meeting templates
- Add a user-facing flow to create a meeting from the client or workspace context, likely near `D:/Projects/ovalens/OvalensPlanner/apps/web/src/app/chat/page.tsx`.

## Phase 2: Backend Meeting Orchestration

- Introduce a first-class meeting record in the API with provider metadata and sync status.
- Add API endpoints for:
  - creating a meeting from Ovalens
  - persisting external calendar and provider IDs
  - toggling agent participation per meeting
  - capturing sync or attachment failures without losing the meeting record
- Reuse the external ID pattern implied by `D:/Projects/ovalens/OvalensPlanner/apps/api/alembic/versions/004_meeting_notes_source_source_id.py` for idempotent provider sync.

## Phase 3: Note Ingestion Path

- Define the path from completed meeting to normalized `MeetingNote` creation or update.
- Ensure imported or generated notes map into the current retrieval path in `D:/Projects/ovalens/OvalensPlanner/apps/api/app/services/tools/meeting_notes.py`.
- Preserve retryability for partial failures so calendar success does not block note import retries, and note import failure does not orphan the meeting.

## Phase 4: Meeting Workspace

- Add an Ovalens meeting detail or workspace view showing:
  - event details
  - attendees
  - Meet link
  - agenda or template
  - agent status
  - generated summary and actions
  - links to prior meeting notes
- Connect this to the existing timeline and reporting surfaces, including `D:/Projects/ovalens/OvalensPlanner/apps/web/src/components/charts/meeting-notes-timeline.tsx`.

## Phase 5: Safe Rollout

1. Ship Google Calendar + Meet creation first.
2. Ship manual agent attach next.
3. Add post-meeting note generation or import after the scheduling flow is stable.
4. Add optional rule-based auto-join after consent, failure states, and observability are proven.
5. Leave multi-provider support as an adapter layer on top of the same meeting domain model.

## Key Design Constraints

- Do not build native video conferencing in the MVP.
- Treat Google Meet as a provider, not the core domain concept.
- Prefer hybrid enrollment: manual now, optional rules later.
- Design every sync step for partial-failure recovery and idempotency.

## Suggested Validation

- Confirm the exact meeting-creation entrypoint in the web app before implementation.
- Validate whether the current untracked `source` and `source_id` migration should be adopted as the external sync foundation.
- Define the smallest meeting domain model that supports future Zoom and Teams without overbuilding v1.
