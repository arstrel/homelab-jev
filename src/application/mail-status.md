# Mail observation boundary

The [diagnostic](../../docs/mail-observation.md) uses a separate SDK-free reader, not sync ownership. It validates and projects one read-only snapshot, strips unexpected fields and converts failed/malformed reads to fixed unavailable measurements. It never advances source freshness or treats pending classification jobs as missing mail evidence. See [OpenSpec](../../openspec/changes/add-mail-observation-pilot/design.md).
