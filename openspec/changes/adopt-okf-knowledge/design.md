# Design

## Context

See [proposal](proposal.md). The Node/Drizzle foundation is merged; sections 2–8 of the personal-brief change remain planned. Existing Markdown is the authoritative requirement and runbook material. Google OKF v0.2 is Markdown with YAML metadata and ordinary links, not a new database or runtime service.

## Goals / Non-Goals

**Goals:** Progressive disclosure, discoverable invariants, visible delivery/trust/freshness signals, traceable sources, a locally usable graph, and deterministic offline checks.

**Non-Goals:** Production knowledge serving, Knowledge Catalog, RAG integration, fabricated human verification, attested execution, or changes to email processing.

## Decisions

- Use one self-contained `knowledge/` bundle with grouped indexes and logs. Nearby module READMEs point into it. Co-located independent bundles would complicate identities and cross-links; converting all existing Markdown would violate OKF reserved-file and concept rules.
- Pin the normative specification and reference viewer to Google commit `ad30107c31c06aec8a7d5636e0d1058118604e6f`. Record both supplied Drive files and official sources. Keep private document contents and all credentials outside the bundle.
- Concepts start draft/unverified, with explicit UTC timestamps and `x_jev_delivery` distinguishing implemented/planned/mixed. The extension is local selection metadata, not an OKF standard field. Source snapshots use confined repo-relative paths and SHA-256 digests in `x_jev_sources`; source changes and expired review deadlines warn without silently refreshing metadata.
- Build the graph in TypeScript using YAML and Markdown parsers. Preserve unknown metadata; normalize verification mappings. OKF core checks and Jev's stricter publication policy have distinct diagnostics. Invalid local document links fail our check, although OKF consumers must tolerate unresolved links. Indices and logs are navigation documents, not graph concepts.
- Vendor Google's Apache-2.0 viewer assets with license and revision attribution. Fix both graph and navigation handling of root-relative, relative, and fragment links. Bundle pinned Cytoscape, marked, and DOMPurify locally; sanitize bodies and reject executable URL schemes. No CDN or external image loads.
- `npm run okf:visualize` builds an ignored HTML artifact, binds a read-only server to `127.0.0.1`, and launches the browser. `--no-open` supports SSH use with a forwarded port. Serve only generated HTML, never the repository or `.env`. `okf:check` joins existing offline gates; the production worker has no new dependency on the bundle.

## Risks / Trade-offs

- Draft prose can become stale → visible delivery state, pinned provenance, source-drift warnings, and current code/spec precedence.
- Human labels are advisory rather than authenticated → do not add human verification without a real review and do not use labels for authorization.
- Reference viewer has link bugs and unsanitized rendering → local fixes, security/path tests, browser verification, and retained upstream notices.
- A generated artifact can reveal curated repo knowledge → only committed public-safe concepts are included; loopback binding and confined paths prevent serving secrets.

## Migration Plan

No production migration or provider access. Install pinned development dependencies, build and inspect the bundle, run offline checks, and retain the existing pre-commit/pre-push workflow. Rollback removes the bundle and documentation tooling; production data is unaffected.

## Verification evidence

October 10, 2026: 25 concepts and 74 directed concept links checked; no source-drift warnings at completion. Full offline checks pass (59 tests, Biome, TypeScript, compiled CLI smoke, local links and strict OpenSpec validation). All 7 disposable PostgreSQL tests pass. Browser checks cover grouped index navigation, concept details, provenance/backlinks, combined search/type filters, and cross-document fragments. The default visualization command launches the host browser; `--no-open` also serves the page for SSH forwarding. Main preprocessing progress remains 13/45.
