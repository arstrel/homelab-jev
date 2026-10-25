## Context

The public repository already builds a self-contained viewer through `npm run okf:build`. Its graph, Markdown, CSS and pinned libraries are embedded; it needs neither a backend nor project credentials.

## Goals / Non-Goals

Provide a stable hosted graph while retaining the local viewer. Application runtime and knowledge correctness are outside this deployment change.

## Decisions

- Use GitHub's Pages artifact/deployment actions. Copy only `.cache/okf/viz.html` to a dedicated artifact directory as `index.html`; never upload the checkout or the entire cache.
- Build PRs with read-only repository permission. Grant Pages/OIDC write permissions only to a separate deployment job restricted to `main`.
- Build every merged commit so source-drift indicators reflect that checkout. Keep existing warnings visible rather than refreshing knowledge metadata mechanically.
- Reuse the existing builder instead of adding a site generator or changing its CLI.

## Risks / Trade-offs

- Public publication → include only the already-public curated bundle and embedded viewer; builds receive no application secrets.
- Initial Pages configuration or token scope may need repository-owner action → document the exact setting and report readiness separately from live deployment.

## Migration Plan

Enable GitHub Pages with GitHub Actions as its source. Merge the reviewed workflow, observe its deployment and open the hosted graph. Disable Pages or revert the workflow to stop publishing; local commands remain available.
