# Gmail observation evidence

Status: **pending migration preparation and live synchronization**. A read-only preflight succeeded and reported `migration-required`. No operational migration or live synchronization has been performed. Tooling and synthetic checks do not complete parent task 2.4. Follow the [manual observation procedure](mail-observation.md).

## Session record

| Item | Observation |
| --- | --- |
| Reviewed commit / runtime | Pending |
| Target privately verified / backup reviewed | Pending; never include connection details |
| Schema readiness before / after | Read-only preflight: `migration-required`; after deployment pending |
| Configured mail window | Pending |
| Session start / finish / duration | Pending |
| Budget | At most 20 manual sync invocations or 60 minutes; per-run 5 discovery steps and 20 retrieval attempts |
| Outcome / limitations | Pending |

## Run record

Read-only preflight at **2026-10-19T02:38:23.853Z**, Node **24.21.0**, build from base `d129ab6` plus this uncommitted implementation: `mail:status` exited 2, `schemaState` was `migration-required`, all sync/backlog measurements were null, and provider calls were zero. This checks the new diagnostic against the configured database; it is not an observation of Gmail synchronization or a reviewed-release live pilot. The final implementation commit must be recorded for any later session.

No live sync runs are recorded yet. For each actual invocation record time/duration, phase, exit/fixed reasons, discovery/evidence timestamps, queued/attempted/acknowledged counts, new versions/jobs, pending/retrying/partial/missing/excluded counts and recovery/gap indicators. Never commit identifiers or message contents.

## Acceptance matrix

| Behavior | Evidence |
| --- | --- |
| Read-only diagnostics, schema readiness, aggregate consistency | Synthetic tests; live diagnostic observed `migration-required` (aggregate values unavailable) |
| Bootstrap / history catch-up | Synthetic tests; live observation pending |
| Retry without new mail | Synthetic tests; live observation pending |
| Later strict no-change run advances evidence freshness without new versions/jobs | Synthetic sync tests; live observation pending |
| Expired-anchor and mapped-thread recovery | Synthetic tests only; do not force a live expiry |
| No Jev calls or Gmail/Todoist/Drive writes from the executed collection path | Command boundary; no live sync session claimed |
| Five-minute scheduling / classifier quality | Outside this change; not demonstrated |

Parent 2.4 and change task 3.1 remain open. A live result with persistent partial bodies, changing mail, unavailable credentials or an exhausted session budget must retain its incomplete/failed label and pending work.
