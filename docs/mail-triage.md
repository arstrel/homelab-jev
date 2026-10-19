# Manual Jev triage preview

Build with pinned Node, then explicitly inspect a bounded sample:

```sh
nvm use
npm run build
npm run mail:classify -- --max-jobs 5 --model jev-1.13.0
```

Configuration requires `JEV_API_KEY` and the normal `DB_URL`/`DB_*` fields. Google, Todoist and Drive configuration is unused. Apply reviewed collection migrations and collect evidence using the existing [sync procedure](mail-sync.md) first. Preview never migrates storage. The [observation report](mail-observation-evidence.md) records real collection progress and outstanding coverage gaps.

The command reads the oldest pending jobs in availability/ID order, up to `--max-jobs` (default 5, range 1–20), and validates each exact fingerprint-bound evidence version. A newer conversation version is never substituted. Legacy unbound or malformed evidence remains a visible failed sample. Direction hints use the latest source observation matched to the exact message IDs and fall back to unknown. The read-only transaction finishes before Jev calls.

## Questions and output

Each complete conversation supplies separate finite choices:

| Judgment | Choices |
| --- | --- |
| Kind | personal, notification, newsletter, unknown |
| Attention | action, fyi, noise, unknown |
| Lifecycle evidence | request, waiting, resolution-suggested, none, unknown |

An automated notification can require action. A lifecycle result is evidence for review; it cannot complete a task. Unknown is a valid semantic result, independent of operational failure. Policy `mail-triage/v1` contains the actual [trusted criteria](../src/domain/mail-triage.ts); email remains untrusted data, even when it contains apparent instructions. Finite outputs limit effects but do not guarantee resistance to semantic misclassification.

The JSON report contains sample ordinals, validated choices/confidence/probabilities, requested/returned model, policy version, token usage, duration and fixed failures. It never prints message content, subjects, addresses, source/job IDs, fingerprints, credentials or raw errors. `selectionFailure` means the batch could not be read; per-sample failures distinguish invalid evidence/results, oversized input, provider errors and cancellation. Exit 0 means every selected sample was judged (or the selection was empty); exit 1 means a failure. Neither exit establishes classification accuracy or complete mailbox coverage.

## Bounds, privacy and replay

The Jev request contains conversation subjects, body text, timestamps, local ordinal references and direction hints. Dedicated source IDs, address lists, labels, history anchors and attachment contents are omitted; body text itself can still contain personal information. The serialized state is capped at 32 KiB; larger conversations are reported as `input-too-large`, not silently shortened. Text is sent to the hosted TypeSafe API only when this command is explicitly run. Keep real per-sample results outside tracked artifacts.

Calls are sequential, have a five-second SDK timeout, zero automatic retries and disabled SDK logging. The command shares the existing 120-second cancellation/deadline budget and stops starting calls after cancellation. SIGINT/SIGTERM closes the budget and database pool. Existing database connection/statement limits remain active. Provider failure retains all jobs.

The command performs **no database or task writes**. It does not store classifications/corrections, mark jobs complete, select Todoist destinations, generate titles/dates, create tasks, or activate a schedule. Repeating preview deliberately calls Jev again and may incur charges. Sampling beyond the first bounded jobs and a replay-safe persisted processing stage belong to subsequent work.

## Model and evaluation boundary

The initial supported setting is explicit revision `jev-1.13.0`; a live synthetic request confirmed that requesting this version is supported and that the provider returns the same identity. Mutable `jev-latest`/`jev-preview` aliases are rejected. All results are labelled `uncalibrated`: a versioned setting and schema-valid output do not establish quality. Model/policy calibration, 100–200 corrected representative examples, held-out evaluation, candidate matching, routing, thresholds and capture remain pending. Parent task 3.1 therefore remains open.

Runtime schemas reject unknown answer/choice/probability keys, invalid confidence/probabilities, mismatched model identity and invalid token counts. No probability is treated as an automatic-capture threshold. See the provider's [SDK documentation](https://docs.typesafe.ai/sdk/javascript) and [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13); implementation uses the repository's pinned SDK 0.6.0 rather than assuming current online examples match it.

Offline unit/MSW tests cover hostile state separation, malformed results, uncertainty, bounds, cancellation, timeout and no retries. Disposable PostgreSQL tests exercise historical binding, missing/corrupt evidence, stable bounded ordering, observation fallback and unchanged stored jobs/results. Live smoke evidence is separate from deterministic gates and does not establish classifier quality.

## Live smoke evidence

On October 19, 2026, synthetic API calls exposed the provider's resolved revision `jev-1.13.0`; a subsequent explicit-revision request succeeded. After explicit approval to transfer one real conversation to TypeSafe, the compiled preview selected and judged one complete stored version, exited 0 and returned the expected model identity with valid typed answers. The report measured 156 ms inside the application, 3,526 input tokens and 143 output tokens. API monetary cost was not measured. Before/after comparison confirmed that pending jobs, stored classification records and synchronization state were unchanged. The per-sample result stays outside tracked files; no accuracy, routing or automatic-capture claim follows from one smoke check.
