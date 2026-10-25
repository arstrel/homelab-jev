# Classification activation and capture verification

October 25, 2026. Private backups, provider identities and detailed receipts remain ignored under `.cache/automatic-capture/`.

## Merged classifier activation

Prepared immutable merged release `7f7cda11d08c85673a5744ea1c2c0a37bfffe7c1` on Node 24.21.0 before stopping jobs. Created a mode-600 custom PostgreSQL backup of `jev` and `jev_migrations` (2,859,824 bytes) and validated its restore catalog. Stopped both native jobs, explicitly applied reviewed migration 0005 and required schema readiness. Activated both collector and publisher at **17:58:59 UTC** on the same immutable release; the publisher has `--classify-pending --max-new 0`, interval 300 and no Retro inference.

At the subsequent actual timer invocation, both labels reported two runs since bootstrap. The collector's 18:04:11 UTC report had zero retrievals, zero pending/retrying gaps, `discoveryCaughtUp: true`, `evidenceComplete: true`, advanced evidence freshness and exit 0. The publisher's second report classified ten pending conversations with zero preprocessing failures, published a new generation and retained explicit sample/Retro gaps. This is timer evidence, not a Run-now probe.

An independent Google Drive read at **18:17:22 UTC** matched the exact owned publication's generation to its private publisher log. PostgreSQL showed evidence freshness at **18:14:22 UTC** and allowance usage of **$0.018451744** including the initial $0.01 provision, against the unchanged $2 ceiling. Publication remains degraded while some displayed mail is uncached and Retro source coverage is incomplete; a fresh generation does not imply full classification or Retro coverage.

PR #23's final Copilot review on `da1a463` reported no open issues after fix loop 1/3. The merged code's two medium findings were resolved and required CI passed. This closes its pending review follow-up; the parent general automation rollout remains open.

## Capture shadow check

The new capture code read 43 current open tasks and 15 recent completed candidates, excluding Retro. Two recent classified conversations went through pinned-model matching with the shared durable allowance. Returned outcomes were `none` and `review`, using 21,031 input tokens. It created/edited/completed **zero Todoist tasks** and did not persist a task inventory or promote those results to capture authorization. Private source material is omitted here.

Synthetic offline tests and disposable PostgreSQL cover actual creation mechanics, source-time boundaries, current evidence selection, reference/semantic matches, review gating, persistent mappings, three rolling creation admissions including ambiguous intents, same-lock overlap, uncertain writes and capture annotations. These are implementation checks, not calibrated accuracy or proof of a useful real capture. The new opt-in capture stage is not deployed before review/merge; [activation and limits](automatic-todoist-capture.md) specify the next operational step.

## Capture activation after PR #25

At **19:21:58 UTC on October 25**, the publisher was switched to reviewed merged release `aed7df6d25cec07caf6db40b3088452275827484` with `--capture-tasks --classify-pending --max-new 0`, the verified stable Retro exclusion ID and source-time boundary **2026-10-25T19:21:58.673Z**. A fresh private PostgreSQL backup (2,890,477 bytes) passed restore-catalog validation. The collector and migration journal were unchanged; no migration, allowance reset or historical backfill was performed. Private rollback copies preserve the previous environment and publisher plist.

By **19:27:57 UTC**, launchd reported two completed invocations after activation, including the actual five-minute timer run. The timer report published successfully, classified ten conversations without failure, and completed capture with zero failures/ambiguities. Independent readback matched the exact reserved Drive identity, generation, ownership, owner-only sharing and capture counters.

There were **zero stored sources received since the activation boundary**, so capture selected zero conversations, made zero hosted capture calls and created zero task intents/links. This confirms enablement, the no-backfill boundary and publication wiring; it does **not** establish successful real task creation or matching quality. The bounded inventory contained 43 open and 15 recent completed matching candidates, excluding Retro. The three-intent rolling daily cap and unchanged $2 lifetime allowance remain in force; recorded total allowance use at verification was **$0.041810926**.

Gmail discovery and complete-evidence freshness were **19:26:10 UTC**, with zero pending/retrying retrievals or recorded retrieval failures. All ten displayed email judgments were cached, and current Todoist context was complete. A separate classification backlog of 929 jobs continued draining. Publication remained explicitly degraded because Retro coverage was incomplete; no Retro inference was requested. A successful generation does not imply complete classification or Retro coverage.

Activation inspection also identified the inherited unconditional “No tasks were created or completed” header. A follow-up template correction makes capture-enabled publications refer to the capture outcomes while preserving the no-write statement for publication without capture. A regression covers a successful create; this presentation correction is prepared for review and is not part of the active release above.

## Publisher presentation follow-up after PR #26

The publisher was updated to reviewed merged release `9e891ec4f8992a3d9a76dabab7adb84c343f23e6` on October 25. Independent owned-file readback at **19:41:26 UTC** confirmed the corrected capture-aware header and capture counters, preserving the file identity and owner-only sharing. This initial publication was a deployment/load-run check; a later log observation at **19:48:44 UTC** contained two completed invocations, including the subsequent timer publication. Capture still selected zero conversations and recorded no task effects. The collector, migration journal, lifetime allowance and source-time boundary were preserved. This closes the presentation deployment follow-up described above, not useful capture or classifier quality acceptance.
