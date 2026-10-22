# Five-minute private brief refresh

This is a separate native LaunchAgent, `com.arstrel.jev.brief-refresh`. It invokes the existing merged compiled publisher with ten conversations, a seven-day email window and **zero new inference**. It does not change the collector's release/configuration. No database migration, Redis, server or new dependency is involved. See [consumer handoff](../docs/scheduled-brief-handoff.md).

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

## Configure and activate

Copy the [plist template](com.arstrel.jev.brief-refresh.plist.example) to `~/Library/LaunchAgents/com.arstrel.jev.brief-refresh.plist`, replacing `@NODE@`, `@ENV_FILE@`, `@RELEASE@` and `@LOGS@` with absolute paths. XML-escape substituted paths (including `&`); do not substitute secret values. Use the resolved release directory directly. Preserve literal program arguments, `--max-new 0`, the absence of `--retro-review`, interval 300 and no KeepAlive. Never point it at `dist` in the working checkout.

Before replacement, privately back up any existing publisher plist and note whether it was loaded/enabled. Create the logs directory with mode 700 and both log files with mode 600; set the plist to mode 600. Validate with `plutil -lint`. If replacing a loaded publisher, unload **that label only** before switching. Enable/bootstrap in the current user's GUI login session:

```sh
launchctl enable "gui/$(id -u)/com.arstrel.jev.brief-refresh"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.arstrel.jev.brief-refresh.plist"
launchctl print "gui/$(id -u)/com.arstrel.jev.brief-refresh"
```

Activation runs once immediately; subsequent invocations follow the five-minute timer while awake/logged in. If activation fails, unload the new publisher and restore the previous plist and loaded/enabled state. Do not touch `com.arstrel.jev.mail-sync`, its `current.json`, database rows or the existing Drive file. Publisher release selection lives in its own plist, not collector `current.json`.

## Inspect, stop, resume and roll back

The publisher uses its existing PostgreSQL overlap lock, two-minute deadline, bounded provider reads, owned file identity and read-back verification. Inspect the private `brief-refresh.log` and `brief-refresh-error.log`. `published: true` plus exit 1 means a confirmed **degraded** publication, not failure to upload or complete source coverage. Zero `newRequests`/token usage and `retro.reviewRequested: false` verify no hosted calls. A loaded label alone proves neither publication nor freshness.

```sh
launchctl disable "gui/$(id -u)/com.arstrel.jev.brief-refresh"
launchctl bootout "gui/$(id -u)/com.arstrel.jev.brief-refresh"
# Resume using enable + bootstrap above.
```

Stopping preserves the artifact and ledger; after 15 minutes consumers label the old publication stale and use their original direct-source routine. For a compatible rollback, stop this publisher, restore the prior private plist/release path, validate and resume. Do not overwrite collector configuration or reverse migrations automatically. Keep private logs and rotate them during stopped-worker maintenance; no automatic retention service is added.

Observe two automatic generations, including a five-minute timer invocation after the initial load. Independently read back the exact owned file, matching generation and current source context. Keep source gaps visible. Actual scheduled daily consumption is a separate acceptance check recorded in [evidence](../docs/scheduled-brief-evidence.md).
