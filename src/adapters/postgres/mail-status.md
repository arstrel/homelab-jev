# Read-only mail diagnostics

One short repeatable-read, read-only transaction compares managed migration history, checks required columns and reads aggregate counters/state. It acquires no advisory lock, fetches no message payloads and never calls migration setup. Unknown failure strings collapse to a fixed category in SQL. Finally destroys the observing connection, including after failure. See [operations](../../../docs/mail-observation.md) and [OpenSpec](../../../openspec/changes/add-mail-observation-pilot/design.md).
