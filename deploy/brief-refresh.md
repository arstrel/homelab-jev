# Five-minute private brief refresh

This is a separate native LaunchAgent, `com.arstrel.jev.brief-refresh`. It invokes the merged compiled publisher with ten displayed conversations and a seven-day email window. The current template adds `--classify-pending` to preprocess up to ten due conversations within the durable $2 lifetime allowance, then publishes with `--max-new 0` and no Retro inference. See [automatic classification](../docs/automatic-mail-classification.md) for limits and report fields. No Redis, server or new dependency is involved. See [consumer handoff](../docs/scheduled-brief-handoff.md).

## Prepare a merged release

Use the exact Node version in the chosen merged commit. Fetch main with the configured Git credential helper first. Choose a full SHA on fetched `origin/main`, never the editable working tree or a feature-branch build. Keep releases outside the checkout. If that exact immutable release already exists with matching `release.json` metadata and runtime, reuse it without rebuilding.

For a new release, set absolute paths and a verified merged SHA, then prepare a temporary directory under the releases root:

```sh
(
set -eu
nvm use
JEV_REVISION=FULL_MERGED_COMMIT_SHA
JEV_RELEASE_ROOT="$HOME/Library/Application Support/Jev/releases"
JEV_RELEASE="$JEV_RELEASE_ROOT/$JEV_REVISION"
JEV_STAGE="$JEV_RELEASE_ROOT/.brief-prepare-$JEV_REVISION"
test "$(git rev-parse --verify "$JEV_REVISION^{commit}")" = "$JEV_REVISION"
git merge-base --is-ancestor "$JEV_REVISION" origin/main
test ! -e "$JEV_RELEASE"
test ! -e "$JEV_STAGE"
test "$(git show "$JEV_REVISION:.nvmrc")" = "$(node -p process.versions.node)"
mkdir -m 700 "$JEV_STAGE"
git archive --output="$JEV_STAGE/source.tar" "$JEV_REVISION"
tar -xf "$JEV_STAGE/source.tar" -C "$JEV_STAGE"
rm "$JEV_STAGE/source.tar"
(cd "$JEV_STAGE" && HUSKY=0 npm ci --include=dev --ignore-scripts --no-audit --no-fund && node scripts/build.mjs && npm prune --omit=dev --ignore-scripts --no-audit --no-fund)
# Continue only after all preparation succeeds.
node --input-type=module -e 'import {writeFileSync} from "node:fs"; writeFileSync(process.argv[1], JSON.stringify({revision:process.argv[2],nodeVersion:process.versions.node}), {mode:0o600,flag:"wx"})' "$JEV_STAGE/release.json" "$JEV_REVISION"
mv "$JEV_STAGE" "$JEV_RELEASE"
node --env-file=/absolute/private/.env "$JEV_RELEASE/dist/cli.js" mail:status
)
```

Treat this as a step-by-step operator procedure: stop on any failure, rather than pasting past a failed check. Require `schemaState: ready`; migrate explicitly if necessary. Keep Node installed at its pinned absolute path and `.env` an owner-only regular file. The release metadata is a local record of the selected commit/runtime, not proof of GitHub review. Do not edit a prepared release.

## Upgrade for automatic classification

Prepare a merged immutable release first. Before applying migration `0005_inference_allowance.sql`, stop both the collector and publisher; their previous runtimes reject a newer migration journal. Apply migrations explicitly using the prepared release and private environment, then update both jobs to that release. Use `npm run worker -- install` from the clean merged checkout for the collector, following [its runbook](README.md), and the publisher template below. Require `mail:status` schema readiness before resuming. Never delete or reset the allowance row during upgrades or rollback.

## Configure and activate

Copy the [plist template](com.arstrel.jev.brief-refresh.plist.example) to `~/Library/LaunchAgents/com.arstrel.jev.brief-refresh.plist`, replacing `@NODE@`, `@ENV_FILE@`, `@RELEASE@` and `@LOGS@` with absolute paths. XML-escape substituted paths (including `&`); do not substitute secret values. Use the resolved release directory directly. Preserve literal program arguments, `--max-new 0`, `--classify-pending`, the absence of `--retro-review`, interval 300 and no KeepAlive. Never point it at `dist` in the working checkout.

Before replacement, privately back up any existing publisher plist and note whether it was loaded/enabled. Create the logs directory with mode 700 and both log files with mode 600; set the plist to mode 600. Validate with `plutil -lint`. If replacing a loaded publisher, unload **that label only** before switching. Enable/bootstrap in the current user's GUI login session:

```sh
launchctl enable "gui/$(id -u)/com.arstrel.jev.brief-refresh"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.arstrel.jev.brief-refresh.plist"
launchctl print "gui/$(id -u)/com.arstrel.jev.brief-refresh"
```

Activation runs once immediately; subsequent invocations follow the five-minute timer while awake/logged in. If activation fails, unload the new publisher and restore a schema-compatible plist and loaded/enabled state. Collector changes belong to the coordinated migration upgrade above; do not overwrite the existing Drive file identity or allowance. Publisher release selection lives in its own plist, not collector `current.json`.

## Inspect, stop, resume and roll back

Preprocessing holds the existing PostgreSQL publisher lock for at most 70 seconds, then publication reacquires it with its usual two-minute deadline, bounded provider reads, owned file identity and read-back verification. Inspect the private `brief-refresh.log` and `brief-refresh-error.log`. `published: true` plus exit 1 means a confirmed **degraded** publication, not failure to upload or complete source coverage. Top-level `newRequests: 0` and `retro.reviewRequested: false` verify cached-only publication; inspect `preprocessing.newRequests` for hosted email calls and `preprocessing.budgetExhausted` for allowance exhaustion. A loaded label alone proves neither publication nor freshness.

```sh
launchctl disable "gui/$(id -u)/com.arstrel.jev.brief-refresh"
launchctl bootout "gui/$(id -u)/com.arstrel.jev.brief-refresh"
# Resume using enable + bootstrap above.
```

Stopping preserves the artifact and ledger; after 15 minutes consumers label the old publication stale and use their original direct-source routine. To disable inference, stop this publisher, remove `--classify-pending` from its private plist, validate and resume the same migration-aware release. Restoring an old release requires schema compatibility; do not downgrade past migration 0005. Do not overwrite collector configuration or reverse migrations automatically. Keep private logs and rotate them during stopped-worker maintenance; no automatic retention service is added.

Observe two automatic generations, including a five-minute timer invocation after the initial load. Independently read back the exact owned file, matching generation and current source context. Keep source gaps visible. Actual scheduled daily consumption is a separate acceptance check recorded in [evidence](../docs/scheduled-brief-evidence.md).

## Optional Todoist capture

After merging and deploying the capture-capable release, follow [the capture runbook](../docs/automatic-todoist-capture.md). Add the explicit JEV_CAPTURE_SINCE boundary and stable Retro ID to the private environment, then opt in with --capture-tasks while retaining --classify-pending --max-new 0. The default template enables classification only. Disable capture by removing that flag; keep the allowance, source links and ambiguous intents. See [activation evidence](../docs/automatic-capture-evidence.md) for the already active classifier.
