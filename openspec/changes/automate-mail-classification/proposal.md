## Why

Scheduled briefs currently omit semantic preprocessing for newly collected mail. Ordinary nested HTML emails also remain in retrieval retries because the HTML parser shares an overly shallow MIME depth limit.

## What Changes

- Classify up to ten due, current evidence jobs before the scheduled brief refresh; reuse exact cached decisions and owner exclusions.
- Persist a lifetime $2 inference allowance with conservative reservations before requests, including an allowance for previous usage, crash/failed-call charges and no automatic reset.
- Back off failed jobs so one large or invalid conversation cannot block the queue.
- Separate bounded HTML layout depth from MIME nesting, use a complete MIME alternative when preferred plain text fails validation, preserve truthful coverage and drain existing retrieval retries.

## Capabilities

### New Capabilities

- `scheduled-mail-classification`: bounded persistent classification before publication and lifetime spending enforcement.
- `html-mail-coverage`: retrieve ordinary nested HTML layouts without hiding truncation or weakening byte limits.

### Modified Capabilities

None; this repository has no consolidated specs yet.

## Impact

Brief CLI/composition, PostgreSQL session and migration, Gmail body normalization, deployment template, offline and isolated database tests, operational/OKF documentation. Gmail and Todoist writes remain outside this iteration.
