# Design

## Context

See [proposal](proposal.md). `runMailSync` already bounds calls, paces Gmail, holds a dedicated mailbox lock, saves retries and closes its connections. Only `deploy/README.md` exists for deployment. Node 24.21.0, compiled ESM and Docker PostgreSQL are established; Redis is unused.

## Goals / Non-Goals

**Goals:** a small native deployment wrapper around the existing command, with testable release and job-control behavior.

**Non-Goals:** a new orchestration loop, queue, migration, classification consumer, automatic task capture, Gmail read-state changes or release CI pipeline.

## Decisions

- Use a user LaunchAgent with `StartInterval: 300`, `RunAtLoad: true`, private logs and no KeepAlive restart loop. A GUI login session is required; SSH control targets that existing session. The job cannot run while the Mac is off/asleep or before login. See [Apple's launchd guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).
- Add `npm run worker -- install|start|stop|status`. Install requires a clean checkout whose HEAD is on fetched `origin/main`; an explicit revision can select an older ancestor for rollback. Local remote refs are an operator-maintained review boundary, not cryptographic review attestation. Build via `git archive`, locked dependency installation and the existing build, then remove development dependencies. Published release directories are never rebuilt in place.
- Store versioned releases and a stable `current.json` configuration under an explicit root (default `~/Library/Application Support/Jev`). Each plist points directly at its resolved release, so switching configuration cannot change code under an already-running process. Record exact runtime and revision; runtime updates require reinstalling. Keep secrets only in a separate owner-only environment file.
- Run the candidate's DB-only `mail:status` before switching; require `schemaState: ready`. Never migrate automatically. On failed bootstrap restore the prior configuration and attempt to restore its prior loaded state; preserve all releases/data for inspection.
- Use argument arrays rather than shell interpolation; XML-escape paths. Capture child failures and report fixed phases without raw provider output. Existing sync reports supply evidence freshness and backlog; launchd status is reported separately. Logs contain existing sanitized CLI output; rotation is an explicit operator procedure, not another service.
- Deliver and test tooling now; activate only a merged release. A bounded manual run from merged main can supply current collection observations, but cannot satisfy scheduled/no-change acceptance by itself.

## Risks / Trade-offs

- Login-dependent agent → document restart/login checks instead of silently installing a privileged daemon.
- Persistent unsupported mail → report real gaps; do not clear failed rows to manufacture freshness.
- Long-lived credentials and runtime paths can change → explicit status/reinstall instructions; no automatic consent or runtime upgrade.
- Partial deployment failure → keep previous release/configuration and expose restoration failures; do not touch the ledger.
- Logs accumulate → document private bounded rotation during maintenance; no email content is logged.

## Migration Plan

Merge the PR, fetch main, install its reviewed release with explicit environment file, then inspect recurring runs and backlog progress. Stop disables and unloads the agent. Roll back by installing a previous compatible ancestor; candidate schema checks can refuse that rollback. Full five-minute processing and parent rollout tasks remain open.
