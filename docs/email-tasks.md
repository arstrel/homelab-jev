# Reviewed email tasks

This manual slice turns up to ten stored complete conversations into proposals, then creates only the tasks you explicitly approve. It uses the existing database and SDKs; no migration or schedule is added.

```sh
nvm use
npm run build
npm run mail:tasks -- preview
# Optional: sample beyond the first ten currently unlinked conversations.
npm run mail:tasks -- preview --offset 10
```

Requires `DB_URL` (or the existing `DB_*` fields), `JEV_API_KEY` and `TODOIST_API_TOKEN`. Google credentials are unused: this reads evidence already collected by [manual sync](mail-sync.md). Preview reads current active Todoist projects and sends minimized conversation subjects, bodies, timestamps, direction hints and project names/descriptions to hosted Jev. It makes no database or Todoist writes. Run it only when you intend that transfer; repeated previews can incur charges.

The JSON output shows a private review file and numbered proposals:

```json
{
  "file": ".cache/mail-tasks/<generated-id>.json",
  "candidates": [
    {
      "candidate": 1,
      "title": "Please send two dates for the boiler inspection.",
      "project": "Home & Admin",
      "source": "https://mail.google.com/mail/u/0/#all/<thread-id>"
    }
  ]
}
```

Read the titles, destinations and linked conversations. Then pass the **actual file path printed by preview** and just the candidate numbers you approve:

```sh
npm run mail:tasks -- apply .cache/mail-tasks/<generated-id>.json --approve 1,3
```

Apply does not call Jev or need its key. It rechecks stored evidence and current project name/ID, then creates the reviewed title/project with the Gmail link and a source marker in its description. It does not edit existing tasks, set dates, complete tasks or change Gmail. A changed source or missing/renamed destination is skipped; review a fresh preview. The check is against currently stored evidence, not a fresh Gmail read; synchronize first when that matters.

## Deliberate limits

- One task per conversation. Existing task links suppress later creates even if the remote task was completed or deleted. Other clients' tasks and cross-thread duplicates are not matched.
- Jev chooses from at most twelve normalized source sentences, each 8–180 characters, rather than inventing task prose. Sent messages and quoted `>` lines cannot supply titles; all replies remain available as context. FYI, noise, resolved/waiting and unclear actions should produce no proposal; human review remains necessary.
- Routing uses only current active projects. Unknown routing uses Inbox. Retro is excluded by case-insensitive name and, optionally, `TODOIST_RETRO_PROJECT_ID`; setting that ID also protects against later renaming. Reviewed Retro identities stay excluded during apply.
- The pinned model is `jev-1.13.0`, with sequential calls, no automatic retries, five-second SDK request timeouts and a 120-second command budget. Oversized inputs are skipped above 32 KiB without truncation. No calibrated automatic-capture threshold is claimed.
- An overlapping apply skips with `overlapping: true`. An uncertain create or database settlement stops the batch as `ambiguous`; a later apply refuses to recreate it. Inspect Todoist for the source marker and the saved `jev.write_intents` record before manual reconciliation. Do not delete that record and blindly rerun. Automated recovery is deferred.

Unlike aggregate diagnostics, this command deliberately prints **private task titles and Gmail links**. Review JSON is mode 600 inside ignored `.cache/mail-tasks/`; keep files and terminal output out of Git and shared logs, and remove review files when no longer needed. Neither review files nor model output are authorization for unattended capture.

Exit 0 means the bounded preview succeeded (possibly with no proposals), or selected tasks were created/already linked/suppressed, or an overlapping apply skipped. Exit 1 indicates a failed sample, stale/invalid selection, changed destination or uncertain create. Inspect the reported statuses. Pending classification jobs remain untouched. Collection catch-up, persisted triage/evaluation, full reconciliation, Drive handoff and deployment remain separate work.

Synthetic application/MSW and disposable PostgreSQL tests cover preview without writes, selected task creation, destination/evidence checks, request IDs, network uncertainty, atomic settlement and replay/overlap protection. They do not establish live routing quality or a successful real capture.
