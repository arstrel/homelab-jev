# Design

## Context

Stored complete evidence, TypeSafe finite-choice judgments and Todoist credentials already work. Reuse the existing PostgreSQL write-intent/task-link tables. This is an explicitly reviewed sample workflow, not the full obligation processor.

## Goals / Non-Goals

**Goals:** a useful manual preview/apply path with at most ten conversations, visible source-based titles/projects/links and simple duplicate prevention.

**Non-Goals:** scheduling, full-backlog acceptance, durable triage queues, automatic capture, multi-obligation/cross-thread matching, dates, task updates, dashboards or Drive artifacts.

## Decisions

- Jev chooses one short normalized sentence from a bounded list of source text, or none/unknown, plus a current allowed project. No free-form title generation is available in the pinned SDK. Preview uses minimized context under 32 KiB. Low-level validity is enforced in code; human approval supplies the capture decision, not an uncalibrated confidence threshold.
- Preview samples latest stored complete sources not already linked, with optional offset for sampling beyond the first ten. It writes a mode-600 JSON review file in ignored `.cache/mail-tasks/`; only proposals, not full bodies, are exported. Repeating preview can incur charges. This is a review artifact, not another task inventory.
- Apply takes the file and explicit indices, revalidates each source fingerprint/title and live project name/ID, and creates exactly that payload. No rerouting or new model call occurs after review. Retro is excluded by case-insensitive name, optional `TODOIST_RETRO_PROJECT_ID` and identities captured in the file. Missing/renamed destinations require a new preview.
- Use a dedicated PostgreSQL advisory lock during apply, source-scoped intent keys, stable request UUIDs and existing task links. Persist ambiguous intent before remote dispatch; atomically link task and settle intent after confirmed response. Any uncertain remote/settlement outcome stops this small batch and requires manual inspection; no automatic retry/reconciliation engine is added. Existing links suppress this slice even after task completion/deletion. One task per conversation is an explicit first-slice limit.
- Provider calls stay outside SQL transactions. Reuse the installed SDKs, generic deadline/cancellation budget and existing schemas; no migration. New CLI output intentionally contains proposed private task titles and links, unlike aggregate-only collection diagnostics; keep it out of Git/shared logs.

## Risks / Trade-offs

A source sentence can be awkward or model-selected incorrectly → show exact proposals for approval and skip unclear actions. Other clients can create similar tasks → this slice only deduplicates its own conversation links. Uncertain creates can require operator work → stop instead of hiding uncertainty or risking duplicate tasks. Partial Gmail coverage remains separate and does not block sampling complete stored evidence.
