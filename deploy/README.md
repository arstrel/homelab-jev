# Five-minute Gmail collector

The deployment tooling schedules the existing bounded `mail:sync` command every five minutes. It reads Gmail and writes collection evidence/progress to PostgreSQL. Classification, Todoist capture, Gmail changes and Drive publication stay manual or planned. No Redis service or database migration is added.

## Install after merge

Use a clean, reviewed checkout on the Mac mini. Fetch `origin/main` first using your configured Git authentication, then fast-forward main. The installer checks the local fetched ref; it does not authenticate GitHub reviews or fetch on your behalf.

```sh
git switch main
git pull --ff-only
nvm use
npm ci
npm run worker -- install --env-file /Users/artem/source/jev/.env
npm run worker -- status
```

The environment file must be a regular file owned by you, without group/other permissions (`chmod 600 .env`). Existing Google refresh credentials and DB settings are sufficient. It is referenced in place, never copied into a release. Changing credentials updates subsequent invocations; changing runtime/release paths requires reinstalling. Google Testing grants can expire; renew through the existing [authorization procedure](../docs/connections.md).

Installation requires a macOS GUI login session for your user. You can control that session over SSH once logged in. This is a user LaunchAgent, not a privileged boot daemon: after reboot it starts at login, and it cannot collect while the machine is asleep/off. StartInterval is a cadence, not a guarantee of delivery at exact five-minute boundaries. See [Apple's launchd documentation](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).

The default installation root is `~/Library/Application Support/Jev`. Pass `--root /absolute/path` on **every** command to use a different root. Releases must live outside the editable checkout. One collector label, `com.arstrel.jev.mail-sync`, is managed per user; multiple roots are not multiple independent collectors.

The installer:

1. Requires a clean checkout whose HEAD is an ancestor of fetched `origin/main`, and the exact Node patch in the selected commit's `.nvmrc`.
2. Archives the selected commit into `releases/<full-sha>`, installs locked dependencies with lifecycle scripts disabled, compiles with the existing build and prunes development dependencies. Existing releases are reused without rebuilding. `release.json` records revision and runtime; do not edit release contents.
3. Runs that candidate's DB-only `mail:status`; a non-ready schema or failed check stops deployment before the active job changes. Apply any necessary reviewed migrations explicitly using [migration operations](../docs/migrations.md).
4. Writes a private `~/Library/LaunchAgents/com.arstrel.jev.mail-sync.plist`, enables and loads it. It runs once immediately, then every 300 seconds. Failed activation attempts restore the prior configuration and prior loaded/stopped state; any failed restoration is reported.

`current.json` records the selected release, Node binary and environment path. The plist uses the resolved release directory directly, so a running process never switches code when the selected release changes. The Node binary must remain installed. Each run uses five discovery steps and up to twenty retrieval attempts, plus the existing 120-second provider budget, request pacing and PostgreSQL overlap lock. No KeepAlive restart loop or implicit migration runs. Bounded work and errors remain durable for later ticks.

## Start, stop and inspect

```sh
npm run worker -- stop
npm run worker -- start
npm run worker -- status
```

Stop disables future login activation and unloads the current job, sending termination through the CLI's existing cancellation path. Start rechecks runtime, credentials and schema, enables and loads it. Neither deletes evidence, checkpoints, pending jobs, task links or releases. A loaded job is not proof of complete collection: `status` separately reports release identity, loaded state and the candidate's DB-only collection diagnostic, including pending work and actual evidence freshness. Exit 0 from worker status means the diagnostic ran, not that the mailbox is caught up.

The logs are owner-only `logs/mail-sync.log` and `logs/mail-sync-error.log` under the installation root. They contain existing sanitized CLI reports, never task titles or message bodies. Inspect run reports for progress, rate limits and errors; `launchctl print "gui/$(id -u)/com.arstrel.jev.mail-sync"` also shows run count and last exit code. Sync exit 2 is unfinished capped work, exit 1 is failure/retry/cancellation, and exit 0 is complete scoped catch-up or overlap skip. Do not turn capped work into a crash-restart loop.

During maintenance, stop the worker before rotating/truncating logs; retain the evidence needed to diagnose a problem, then start it again. No automatic log retention is added here. If an interrupted installer leaves `.deployment-lock`, confirm no deployment command is running before removing **that empty lock directory only**. Never delete ledger rows to obtain passing freshness or replay results.

## Roll back

From a clean reviewed main checkout, select an earlier full commit SHA that is also on fetched `origin/main`:

```sh
npm run worker -- install --env-file /Users/artem/source/jev/.env --revision FULL_PREVIOUS_COMMIT_SHA
```

The same candidate runtime/schema preflight applies. An older release with incompatible migration history is refused; follow the migration recovery procedure instead of automatically reversing SQL. Release directories and the ledger remain intact. For a failed activation with unsuccessful restoration, stop the worker, inspect `current.json` and the plist privately, and reinstall the intended compatible release. Do not hand-edit a running release.

## Acceptance

See [collector observation evidence](../docs/mail-worker-evidence.md). After merge/activation, observe at least two scheduled invocations and record revision, run times and backlog progress. Verify overlap behavior with the existing lock tests and an authorized operational check when practical. Once complete scoped evidence is observed, confirm a subsequent no-change run advances `evidenceSyncedAt` without new versions/jobs. Keep unsupported-body/provider gaps visible. The [bounded observation procedure](../docs/mail-observation.md) defines acceptance and privacy rules; enabling a timer alone does not finish it.

Full classification/reconciliation/publication scheduling and release rollout remain in the [parent plan](../openspec/changes/add-personal-brief-preprocessing/tasks.md). [Native release concept](../knowledge/operations/native-releases.md) and [processing cycle](../knowledge/architecture/processing-cycle.md) describe that broader boundary.
