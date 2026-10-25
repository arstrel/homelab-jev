## 1. Static graph publication

- [x] 1.1 Add a PR-build/main-deploy Pages workflow and hosted-viewer documentation; verify that the artifact contains only the self-contained graph HTML and that navigation works at a project-site path.
- [x] 1.2 Run required gates, open a PR and inspect Copilot's summaries, threads and comments, fixing yellow/red findings within the three-loop limit.
- [x] 1.3 Enable GitHub Actions as the Pages source and verify the repository setting, or record the exact owner action needed if the token lacks permission.
- [x] 1.4 After merge, verify the Pages deployment and hosted graph, then record its live URL and result.

October 25 acceptance: merged PR #27 had green CI and Copilot approval with no findings. After the owner enabled Pages and reran the workflow, attempt 2 succeeded; public HTTP/browser readback verified the live graph and concept navigation. See [deployment evidence](../../../docs/okf-adoption.md#commands).
