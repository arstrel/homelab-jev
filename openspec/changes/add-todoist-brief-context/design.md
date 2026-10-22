# Design

## Context

See [proposal](proposal.md). The existing brief has a pure Markdown renderer, SDK-free use case, shared two-minute budget and one reserved Drive destination. The Todoist SDK already provides current project discovery and bounded authenticated transport; its task API supplies open items. No task inventory table is needed.

## Goals / Non-Goals

**Goals:** fresh read-only task context and visible exact-link associations in the existing artifact.

**Non-Goals:** semantic matching, automatic capture/completion, Retro interpretation, scheduler or collector changes.

## Decisions

- Add one small Todoist reader port to the existing use case and one SDK adapter. Read at most five pages of 100 projects and two pages of 100 open tasks. Use the shared budget/cancellation signal and existing five-second transport timeout; no new retries. Report remaining pages, unknown project IDs and output truncation as incomplete context, rather than treating the bounded sample as a complete inventory. Read failures discard partial contents and publish a fixed unavailable reason.
- Use runtime project names/IDs; exclude Retro by trimmed case-insensitive name and optional existing `TODOIST_RETRO_PROJECT_ID`. Omit tasks whose project is unavailable, completed/deleted tasks, and duplicate IDs. No text-based task-kind inference. Preserve existing Todoist due date/datetime/timezone as source values, with no date arithmetic or invented deadlines.
- Normalize supported explicit `https://mail.google.com/mail/u/0/#all|inbox|sent/<conversation>` links in task descriptions to exact source IDs. Other accounts/routes/hosts, bare IDs and matching words do not establish an association. Associate only returned open tasks, including multiple matching tasks; keep email classification/section unchanged and label Action entries as already tracked with task links. Absence of a link never proves absence of an existing task.
- Render project/task titles as escaped one-line data and construct task links from encoded IDs. Limit the Todoist section to 24 KiB and disclose omitted display items so the existing 64 KiB artifact limit remains safe. Descriptions are used locally for links, not published or sent to Jev. Fetch anew every invocation and store only the combined Drive artifact, not a database task copy.
- Missing token, API/validation/pagination failure yields explicitly unavailable Todoist context and exit 1 after an otherwise successful Drive publication. Cancellation/deadline aborts the command. Console reports fixed state/counts only, with no task titles/descriptions/project names. Existing inference cache identity is unchanged, since Todoist does not enter its questions.

## Risks / Trade-offs

- Live pagination is not an atomic Todoist snapshot → report the read interval and limit claims to returned state.
- Exact links miss unlinked/other-route equivalents → disclose this limitation; no semantic guessing.
- The bounded inventory can omit work → expose page, unknown-project and display gaps; Todoist remains authoritative.

## Migration Plan

No schema/dependency changes or collector deployment. Verify offline behavior and existing disposable database regression gates, then publish/read back against the same Drive ID with cached-only inference. Use controlled read responses for change-between-runs acceptance so live user tasks remain unchanged. Open a PR with sanitized evidence; planner prompt integration remains later work.
