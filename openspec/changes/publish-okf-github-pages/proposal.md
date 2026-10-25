## Why

The OKF graph currently requires a local build or an SSH tunnel to the Mac mini. Publish the existing static viewer on GitHub Pages so the project's public engineering knowledge is one click away.

## What Changes

- Build the existing viewer in GitHub Actions, checking PR builds and deploying merged `main` commits.
- Publish only the generated HTML as the site's index, with a link from the README.
- Document GitHub Pages setup and the public artifact's scope.

## Capabilities

No application behavior changes. This is documentation deployment tooling; `skip_specs: true` applies.

## Impact

One GitHub Actions workflow, README and OKF maintenance documentation. Reuse the existing builder and bundled libraries; no dependencies, credentials, Mac mini deployment or application changes.
