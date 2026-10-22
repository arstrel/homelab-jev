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

Pending specific approval of the real Retro payload export. Automatic approval review rejected sending recent private Retro text/current task titles to hosted Jev and replacing the private Drive brief under the broader spending approval alone. No live Retro inference or Drive update was performed by that rejected action. The existing collector, Todoist tasks, scheduled prompts and reset credits were not changed.
