# Retro brief verification evidence

Recorded October 22, 2026 for `add-retro-planning-brief`. This is development evidence, not calibrated model accuracy or scheduled planner acceptance. No Todoist task mutation is implemented by this feature.

## Deterministic checks

Full offline checks passed: 310 tests, TypeScript, Biome, compiled CLI smoke tests, document links, OKF and strict OpenSpec validation. Disposable PostgreSQL regression checks passed all 54 tests. No schema or dependency change was needed. Fixtures contain invented feedback/tasks only.

## Live synthetic Jev development set

The committed [twelve examples](../tests/fixtures/retro-evaluation.ts) cover specific setup completion, backup waiting, rowing, broad study goals, ambiguous setup, future plans, negation, quoted claims, hostile instructions, unrelated activity and partial progress. Requests used production builders, adapter, strict validation and review rules with pinned `jev-1.13.0`.

The first run produced the intended conservative outcome on 8/12 examples. It retained uncertainty on four positive cases. Wording was clarified for practical next actions, reusable sessions and independent questions; thresholds were not lowered. The second run matched the intended outcome on 10/12 examples. All four task kinds matched the development expectations. Specific access/backup completion produced review suggestions, rowing remained available, and partial access work produced progress. Waiting and chapter study remained uncertain (minimum decision confidence 0.61 and 0.82). Ambiguity, plans, negation, quotes, hostile instructions and unrelated activity produced no completion suggestion.

These examples were used to adjust wording: they are not held out, repeated stochastic results may differ, and 10/12 is not a classifier accuracy estimate. Broad goals/recurring preservation, malformed results and forced unsafe model choices are also covered by deterministic policy tests; that does not prove semantic task-kind correctness in the wild. Conservative uncertainty remains a useful unresolved result.

Both synthetic runs together used 26 inference attempts and returned 28,420 input / 4,022 output tokens. At the [published pinned-model input price](https://docs.typesafe.ai/models), checked October 22 ($0.042 per million input tokens, output free), estimated cost was $0.001194. This is returned usage and a price estimate, not a billing receipt. The implementation session has a 150-attempt ceiling within the owner's total $2 allowance.

## Private source publication

The owner explicitly approved recent Retro export, current task-title export and private Drive publication. The bounded source read found 12 Retro tasks and scanned comments on ten. Ten feedback records were selected and two omitted; no undated records, unread attachments or foreign/unknown authors were reported. Coverage therefore remained explicitly incomplete. All 43 current open tasks across eight active non-Retro projects were displayed and supplied as candidate titles.

A normal compiled-command entry point first published fresh source context with `--max-new 0`. It made zero Jev requests, marked interpretation not requested, and exposed ten uncached email cases as capped. Independent read-back confirmed the same owned Markdown file, matching generation and owner-only sharing. This was a degraded but confirmed publication, not a successful email classification or cache-hit claim.

The final Retro-only check used the production application use case, PostgreSQL ownership/publication repository, Todoist/Jev adapters and Drive writer. A local verification harness deliberately supplied an empty email sample after reading the real bounded selection, and refused email inference. The published artifact labels that verification scope: empty email sections do not imply no outstanding email. This kept hosted inputs within the approved Retro text and current task titles, without introducing a production CLI option or changing application code. The zero-call refresh was performed first so the final private artifact retains the Jev review results.

Jev made 15 requests: five task-kind batches for 43 task titles and ten feedback judgments. Returned task-kind choices were finite 19, reusable 12, broad goal 6 and unknown 6; these are unverified model choices, not a reviewed inventory mapping. All ten feedback suggestions stayed **Uncertain — review**, with minimum decision confidence 0.20–0.79, below the provisional 0.85 threshold. Five weak candidate associations and three excerpt choices did not establish supported matches. No threshold was relaxed. This demonstrates conservative bounded operation, not useful-match accuracy or a successful completion/reconciliation pilot.

The final publication reported `published: true` with exit 1 because source coverage was incomplete. Read-back verified the same existing file identity, expected name/type, matching generation and uploaded content. The final artifact was 18,717 bytes, contained the Retro source/review sections and remained private with one user-owner permission and no further permission pages. The prior zero-call artifact was 12,363 bytes. No sharing settings were changed.

The real Retro check returned 48,254 input / 6,950 output tokens, estimated $0.002027. Combined with both synthetic runs, this feature used 41 attempts and returned 76,674 input / 10,972 output tokens: approximately **$0.003220**, within the existing $2 allowance. Private read-back captures and provider payloads remain ignored local artifacts; no private feedback, titles or identifiers are committed here.

Todoist/Retro tasks, Gmail, the installed collector, scheduled prompts and reset credits were not changed. Only the owned Drive artifact and its existing publication metadata were updated. Full source coverage, calibrated matching quality, automatic reconciliation and real scheduled planner consumption remain unverified future work.
