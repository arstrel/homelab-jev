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
