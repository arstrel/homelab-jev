# Five-minute collector evidence — October 21, 2026

## Delivery boundary

The collector tooling wraps existing `mail:sync`; it introduces no new provider behavior, database migration or model call. Native activation requires a merged reviewed release. This report separates offline packaging/control checks from manual live collection and recurring-operation acceptance.

## Offline verification

The final commit and push gates passed all 245 offline tests, including eleven deployment cases, and all 50 disposable PostgreSQL tests. Deployment tests exercise real Git archive extraction and candidate compilation/execution with a tiny offline fixture; dependency installation and launchctl are faked. Native macOS also validated rendered XML with `plutil`. Existing application/MSW and disposable PostgreSQL tests remain the evidence for pacing, session ownership, atomic progress and replay. These are not proof of an installed recurring job or live classifier quality.

A separate real packaging smoke check archived merged main `d072023c91b9c3f6b58d277f63ed553b5bf9e29b` into a temporary directory, installed its locked dependencies with lifecycle scripts disabled, built it, pruned development dependencies, then passed compiled help and operational DB-only status using the separate environment path. The initial offline-only installation found one uncached package; normal locked installation completed successfully. This verifies the packaging sequence, not an installed production agent.

## Live collection

Dates below are UTC on October 22 (October 21 Pacific). The operational schema was ready; the collection source/migrations were unchanged from merged main. The first run used the normal compiled checkout command; the second ran the isolated production-dependencies-only archive. Both used five maximum discovery steps and twenty maximum retrieval attempts. No migration or new scheduled job was installed.

| Observation | Baseline 03:14:16Z | Run 1, discovery 03:14:35Z | Run 2, discovery 03:18:31Z |
| --- | --- | --- | --- |
| Retrieval attempts | — | 20 | 20 |
| New complete evidence versions / exact jobs | — | 19 / 19 | 20 / 20 |
| New partial-body observations | — | 1 | 0 |
| Pending retrievals | 409 | 542 | 522 |
| Pending exact-bound classification jobs | 526 | 545 | 565 |
| Evidence freshness | null | null | null |
| Discovery caught up | Previously checked Oct 19 | Yes | Yes |
| New provider failure / throttling reported | — | None | None |
| Sync exit | — | 1: partial-body, retry-pending | 1: retry-pending |

The first discovery queued 209 references (deduplicated/overlapping), including newer mail received while collection was idle; net pending work therefore rose despite nineteen successful retrievals. The second discovered no changes and reduced the backlog by twenty. Earlier unresolved partial/provider work remains; neither run completed evidence catch-up or the strict no-change freshness pair. These are bounded session observations, not a current-state promise or independent account-wide write audit. Both reports returned zero downstream provider writes.

At the manual-run observation, the current user's GUI launchd domain was available and the worker reported `configured: false, loaded: false`. Subsequent activation is recorded below. No useful Todoist capture or classifier-quality result follows from these collection reads.

## Recurring-operation acceptance

After PR #18 merged, reviewed release `ae4477994fa7558717e451c31d2f01a0c2f6f349` was installed under the private user Application Support root using Node 24.21.0. The enabled LaunchAgent runs at load and every 300 seconds. A startup invocation and the next automatic invocation were observed, without manually triggering the second.

| Discovery observation (UTC, Oct 22) | Retrieval attempts | Complete versions/jobs | Partial bodies | Pending retrievals |
| --- | --- | --- | --- | --- |
| 03:35:59.254Z | 20 | 17 / 17 | 3 | 506 |
| 03:41:36.561Z | 20 | 18 / 18 | 2 | 488 |

A concurrent manual invocation skipped with zero retrieval attempts and exit 0. Both automatic runs retained partial-body/retry-pending gaps and null evidence freshness; neither reported a new provider error or recognized throttle. The job was idle between invocations without a crash-restart loop and remained loaded at the 03:42:42Z check. Configuration/plist/logs were mode 600 under a mode-700 root. These are timestamped observations, not current health guarantees.

The collector is active independently of the editable checkout. Full catch-up/no-change acceptance and the broader classification/reconciliation/publication cycle remain unfinished. Parent task 2.4 and overall rollout stay open. Follow [deployment](../deploy/README.md) and [observation](mail-observation.md).

Jev calls/spend for this collection deliverable: zero.
