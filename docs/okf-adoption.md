# Open Knowledge Format in Jev

## Research and interpretation

Read both direct files in the [supplied Drive folder](https://drive.google.com/drive/folders/1ZBxep4-WIOnpdeunxu4qc1kgLnkNR5AP):

- [Google OKF v0.2 — Improving agents while saving tokens](https://docs.google.com/presentation/d/1RO9HIc8E3St8iPl-WEyN6YnIydgK0G20ByPwEGDLYPs/edit): slides and speaker notes.
- [google-okf-v0.2-talk-notes.md](https://drive.google.com/file/d/1X7iHOdl38GKGeA9sR-e4jZ4JkvM0buOo/view): detailed notes, adoption guidance and caveats.

Official sources checked:

- [Google repository](https://github.com/GoogleCloudPlatform/open-knowledge-format) and [v0.2 specification pinned to ad30107](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/ad30107c31c06aec8a7d5636e0d1058118604e6f/SPEC.md).
- [Google introduction](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing).
- [Google v0.2 trust signals](https://cloud.google.com/blog/products/data-analytics/okf-v0-2-adds-trust-signals/).
- [Google Knowledge Catalog integration](https://cloud.google.com/blog/products/data-analytics/scale-okf-bundles-across-an-organization-with-knowledge-catalog).
- [Reference viewer link issue](https://github.com/GoogleCloudPlatform/open-knowledge-format/issues/14), [path ambiguity](https://github.com/GoogleCloudPlatform/open-knowledge-format/issues/29), and [timestamp compatibility discussion](https://github.com/GoogleCloudPlatform/open-knowledge-format/issues/24).

OKF is a portable directory of Markdown concepts with YAML metadata and ordinary Markdown links. A concept requires a nonempty string `type`; its identity is its path without `.md`. `index.md` and `log.md` are reserved navigation files. Only the root index can have frontmatter, limited to `okf_version`. Timestamps explicitly include timezone offsets. Metadata supplies optional provenance, generation, verification, lifecycle and staleness signals. Unknown fields/types remain valid extensions.

This complements source search and OpenSpec. It is not another storage service, RAG engine, or replacement for Todoist/Drive/PostgreSQL. Knowledge Catalog is optional; Jev needs no Google Cloud catalog resource. No token-saving benchmark is claimed. Attested computations require real execution/receipt/attestation machinery; our existing tests and pure functions do not acquire that status by adding metadata.

## Coverage chosen from current source and plans

| Area and authoritative material | Why curate it | Bundle entry |
| --- | --- | --- |
| Product requirements and personal-brief specs | Repeated outcome, ownership, scope and routing decisions | [Product index](../knowledge/product/index.md) |
| `src/cli.ts`, application ports, domain boundary | Keep composition and pure policy boundaries explicit | [Layers](../knowledge/architecture/layers.md) |
| Gmail sync spec and ingestion repository | Cursor/replay safety can fail across stage boundaries | [Checkpoint invariant](../knowledge/architecture/gmail-checkpoints.md) |
| PostgreSQL schema/repositories and migrations | Ledger identity and transaction ownership | [Ledger](../knowledge/architecture/ledger.md) |
| Todoist sync spec, SDK header contract | Ambiguous remote outcomes, deduplication, user edits | [Write safety](../knowledge/architecture/remote-write-safety.md), [manual edits](../knowledge/architecture/manual-edits.md) |
| Typed processing spec | Model evidence, uncertainty, dates and thresholds | [Classification](../knowledge/architecture/classification-policy.md) |
| Retro spec and task-kind requirements | Avoid consuming reusable activities or broad goals | [Retro](../knowledge/architecture/retro-feedback.md) |
| Drive handoff spec and planner requirements | Artifact ownership and truthful freshness | [Planner handoff](../knowledge/architecture/planner-handoff.md) |
| Google OAuth scripts and provider adapters | Credential renewals and limits of diagnostic checks | [Provider index](../knowledge/providers/index.md) |
| Test runners, Git guards, CI and migration runbooks | Deterministic safe validation and release practices | [Operations index](../knowledge/operations/index.md) |
| Worker operations spec and deploy folder | Approved native runtime is still planned | [Native releases](../knowledge/operations/native-releases.md) |

The portable bundle is [knowledge/](../knowledge/index.md). Relevant source, scripts and deployment READMEs point to it; existing source/requirements remain authoritative. A single bundle avoids duplicate identities and converting unrelated Markdown into accidental concepts.

## Commands

```sh
nvm use 24
npm ci
npm run okf:check
npm run okf:build
npm run okf:visualize
```

`okf:visualize` builds `.cache/okf/viz.html`, starts a server at `http://127.0.0.1:8770/viz.html`, and launches the host browser. Ctrl-C stops it. Use `-- --port 8771` if needed. The graph supports search, type filters, layouts, node details, sources, backlinks, and a Read index button. Index/log pages are navigable but not concept nodes. The HTML can also be opened directly after `okf:build`.

For a Mac mini accessed over SSH:

```sh
# On the Mac mini, in the repo:
npm run okf:visualize -- --no-open
# On your laptop; substitute your normal SSH host alias:
ssh -N -L 8770:127.0.0.1:8770 mac-mini
```

Then open `http://127.0.0.1:8770/viz.html` on the laptop. The server binds loopback only, accepts the generated page only, and never serves `.env` or arbitrary repository paths. Libraries are pinned local development dependencies; no CDN or external image loading is needed. Google viewer assets retain their [license and revision notice](../tools/okf-viewer/NOTICE.md).

## Review policy

New concepts are draft/unverified, with actual generation timestamps and explicit review deadlines. No human verification is fabricated. OKF trust labels are advisory, not authenticated signatures or an access-control mechanism. `generated.at` marks meaningful concept changes; `verified` records a real review independently. Never advance either timestamp merely because a check ran.

Jev extensions `x_jev_delivery` and `x_jev_sources` distinguish implementation state and record repo-relative source paths plus SHA-256 snapshots. Snapshot paths are confined to regular repository files; hidden paths and traversal are refused. Source URLs identify the merged baseline where available; new local documentation/tooling is represented by repository snapshots and the pinned normative OKF specification until a reviewed commit exists. The viewer also lists the current repository snapshot paths. Source drift and expired review deadlines warn so you can inspect the change and update prose/provenance deliberately. They do not silently refresh dates or break unrelated changes.

`okf:check` runs offline in the normal Git/CI gate. It checks the core fields used by this bundle (it is not a complete general-purpose OKF conformance validator), plus a stricter local publication policy: titles/descriptions, delivery labels, provenance, source snapshots, and resolvable local document links. OKF itself permits missing optional metadata and requires consumers to tolerate broken links. These extra publishing checks are Jev policy, not additions to the standard. Unknown metadata is preserved. Viewer navigation and edges share resolved root-relative/relative/fragment links, correcting the pinned reference viewer's mismatch. Markdown is sanitized and data is safely embedded before rendering.

When source changes, read the relevant concept, revise its claims, update the source snapshot intentionally, and record a meaningful change or review. Keep private message data, tokens and feedback out of this bundle. An index-first agent should inspect only relevant documents, verify them against current code/specs/tests, and use normal repository search when needed. Do not replace runtime authorization or source evidence with document metadata.
