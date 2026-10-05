# Independent worker connections

ChatGPT's connected Google/Todoist applications do not supply authorization to this Node process. Keep the worker's credentials in ignored `.env` (dummy names are in [the example](../.env.example)). Never include that file in a checkout export, fixture, CI secret set or worker logs. `GH_TOKEN` is only developer GitHub authorization and is not a worker credential.

## Google OAuth

Create a personal Google Cloud project, enable Gmail API and Google Drive API, configure the OAuth consent screen and a desktop application client. Authorize your own Google account with `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/drive.file`, requesting offline access. Store its client ID, client secret and resulting refresh token as `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. Handle the browser grant/token exchange privately; never paste credentials into this chat or committed files. Testing-mode grants may need reauthorization; check the client consent configuration when a refresh token expires.

Gmail uses API **v1**. Read-only supports profile/history/messages/threads and bodies; metadata scope alone cannot read bodies. No label/send permission is requested. Drive uses API **v3**. `drive.file` supports files created by or explicitly opened/shared with this application, including its dedicated future handoff artifact; it does not grant visibility of every existing Markdown file. The daily GPT task retains its own broader connected-source context. A future existing-file integration must explicitly select/authorize those files or justify a separate read scope.

The foundation check reads Gmail's profile and a bounded Drive file listing, discarding returned IDs/content. It does not create a file or read email bodies. The APIs use 5-second request timeouts and disabled application-request retries. OAuth token refresh may involve Google's own transport; the whole check is additionally bounded by the connection-command deadline.

Sources: [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app).

## Todoist

For this personal worker, obtain the personal API token from your Todoist integration settings and store it as `TODOIST_API_TOKEN`. This token can act on your account; application policy will limit managed task writes in Section 4. Alternatively register a Todoist OAuth app: `data:read` permits observation, while later task creation and updates need `data:read_write`; `task:add` alone cannot reconcile existing tasks. Do not request deletion scopes for the first release. An OAuth grant with expiring access tokens requires a future refresh flow; this foundation accepts an already valid token and does not implement that flow.

The retained SDK **15.3.1** targets the unified `/api/v1/` API. Its `addTask(args, requestId)` forwards the caller-supplied identity in `X-Request-Id`; an offline MSW test verifies the actual header. Do not assume the SDK generates a durable identity automatically. Section 4 must save a UUID before writing, reuse it on retries and reconcile source markers after ambiguous responses. A connection read cannot demonstrate write idempotency; the controlled write lifecycle remains in Section 4.

The check reads at most one project page and discards names/content. Transport requests have a 5-second abort bound; the SDK's retry behavior remains bounded by the overall connection deadline. Source: [Todoist API, authorization and request identities](https://developer.todoist.com/api/v1/).

## Jev and running checks

`JEV_API_KEY` is passed explicitly to the retained TypeSafe SDK **0.6.0**, rather than using its alternative environment names. The foundation lists available models using `/v1/models`, with a 5-second timeout, zero retries and SDK logging disabled. It does not send email or consume classification requests. Model choice and calibration are Section 3 work.

```sh
nvm use
npm run build
npm run db:check
npm run connections
```

Checks print only provider names and fixed success/failure/missing-authorization messages, with a nonzero exit when any required connection is unavailable. No credentials, connection strings, project names, mailbox addresses, model response bodies or provider exceptions are printed. These commands are explicit live checks and are excluded from hooks and CI.
