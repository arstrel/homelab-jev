# Proposal

## Why

Read-only investigation of retained mail gaps found valid UTF-8 body data longer than Gmail's declared byte count. Exact size equality incorrectly marks these complete bodies unsupported and leaves them pending indefinitely.

## What Changes

- Accept delivered body data longer than its declared size while retaining short-read detection and every actual-byte/transport/decoding limit.
- Add synthetic inline/external-body regressions and an understated-metadata size-limit test.
- Record sanitized live diagnosis and read-only verification; leave full collection acceptance open.

## Capabilities

No requirement changes. This repairs valid complete-body decoding under the existing mail-evidence contract; specification deltas are intentionally skipped.

## Impact

One Gmail normalization check, adapter regressions and relevant runbook/OKF evidence. No new packages, migrations, services, changed limits or Jev calls.
