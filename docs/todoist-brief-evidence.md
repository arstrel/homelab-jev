# Todoist-aware brief evidence — October 21, 2026 (Pacific)

## Validation

The full offline gate passed 279 tests, Biome, TypeScript, compilation, compiled CLI checks, local links, OKF and strict OpenSpec validation. All 54 disposable PostgreSQL regression tests passed. Tests use synthetic SDK responses and controlled reads for project/task pagination, Retro exclusion, existing due fields, exact link boundaries, failed/incomplete reads, display limits and cancellation.

The application change-between-publications test saved one email decision, then renamed/moved its linked task and subsequently removed it from open results. Cached-only publication reflected each state, removed the already-tracked annotation after removal, called the task reader three times and kept inference/persistence at one original decision. Adapter tests independently verified changed responses without a stored inventory. These controlled cases establish behavior without changing live user tasks.

## Live publication and independent read-back

At 04:37:48Z UTC on October 22, the existing command published with ten conversations, seven days and `--max-new 0`. It reused all ten email decisions, made zero Jev requests and reported no classification/cap failure. The new Todoist section included **43 open tasks across eight active non-Retro projects**. All 43 were displayed, project/task pages were complete and no missing-project or display-size gaps were reported. The source read interval was 04:37:48.129Z–04:37:48.585Z.

The same dedicated Drive ID was updated with a new generation. Metadata/content inspection at 04:38:00Z confirmed the expected name/type, non-trashed state, sharing disabled, no non-owner permissions and a 10,168-byte artifact. Existing classification totals remained ten saved/completed decisions, six inferred, confirming no additional live classification.

A separate fresh Todoist read at 04:38:26Z required two read requests. Its rendered task section matched the published section exactly, including copied task titles, due values and project grouping, without printing private contents. It confirmed six Retro tasks excluded, no unknown-project omissions and complete page/display coverage for that read. No sampled email action had a matching explicit task link; already-tracked behavior is supported by the controlled tests, not a fabricated live match.

## Limits and effects

This is a timestamped API observation, not an atomic snapshot or continuing health guarantee. The brief retained incomplete Gmail coverage: 322 pending retrievals, 100 retries and unset complete evidence freshness at publication. New artifact generation did not advance Gmail freshness. Semantic task equivalence and completion are not inferred from links.

No live tasks were created, renamed, moved, completed or deleted to manufacture acceptance evidence. No Gmail mutations, collector deployment/configuration changes or scheduled prompt changes occurred. New Jev spend for this iteration: **$0**. Live content and local inspection captures remain private and ignored; this report contains aggregates only.
