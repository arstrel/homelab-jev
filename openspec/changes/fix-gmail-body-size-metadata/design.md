# Design

## Context

See proposal.md. The decoder currently requires `body.size === decodedBytes.length`. Actual reads found fully decodable payloads with understated metadata. Three sampled prior provider failures now read successfully; a sampled oversized body still exceeds existing coverage limits.

## Goals / Non-Goals

Restore supported decoding without losing short-read detection or changing fingerprints for already accepted material. Full backlog drainage, retry policy, classification and raising body/HTML limits are separate work.

## Decisions

Reject a provided size only when it exceeds delivered decoded bytes. Continue preflighting declared size and independently bounding actual base64-decoded bytes, aggregate text bytes and transport responses. Removing all size validation would also admit short reads; keeping exact equality rejects the observed complete data.

## Risks / Trade-offs

Understated metadata no longer proves corruption; delivered full data and fatal text decoding determine the accepted text. Shorter-than-declared data remains unsupported, since it may be truncated. Existing limits still prevent underreported metadata from bypassing byte caps. Validate with synthetic cases and repeat only read-only diagnosis against the two affected conversations.

## Migration Plan

No migration or operational write. Existing pending work can retry after deployment. No stored evidence is rewritten; reverting code restores the previous conservative rejection.
