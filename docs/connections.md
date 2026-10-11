# Independent worker connections

ChatGPT's connected Google/Todoist applications do not supply authorization to this Node process. Keep the worker's credentials in ignored `.env` (dummy names are in [the example](../.env.example)). Never include that file in a checkout export, fixture, CI secret set or worker logs. `GH_TOKEN` is only developer GitHub authorization and is not a worker credential.

## Google OAuth

Create a personal Google Cloud project, enable Gmail API and Google Drive API, configure the OAuth consent screen and a desktop application client. Authorize your own Google account with `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/drive.file`, requesting offline access. Store its client ID, client secret and resulting refresh token as `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. Handle the browser grant/token exchange privately; never paste credentials into this chat or committed files. The worker requires a refresh token in both Testing and Production. With the Gmail scope, Testing authorizations and refresh tokens expire after seven days; switching to Production removes that particular limit, not all possible token expiry/revocation.

### Obtain the refresh token

1. In Google Cloud, select `homelab-jev`, enable **Gmail API** and **Google Drive API**, and open **Google Auth Platform**.
2. Under **Audience**, use **External**. While publishing status is **Testing**, add the personal Google account you will authorize under **Test users**. Production is unnecessary for the initial grant; it is needed to avoid the seven-day testing expiry for unattended operation.
3. Under **Data Access**, declare `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/drive.file`.
4. Under **Clients**, create/select a **Desktop app** client. Put that same client's ID and secret into the ignored `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. A refresh token from a different client, including OAuth Playground's default client, will not work with these credentials.
5. If your browser is on your laptop and commands run on the Mac mini, first run this on the **laptop**, substituting your existing SSH hostname if different:

   ```sh
   ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:8765:127.0.0.1:8765 artem@mac-mini
   ```

   Keep that terminal open. It forwards the browser's local callback to the mini. Skip this tunnel if the browser and authorization command run on the same computer.

6. In a separate terminal on the **Mac mini**:

   ```sh
   cd /Users/artem/source/jev
   nvm use
   npm run google:authorize
   ```

7. Open the printed Google URL in your browser. Sign in with the personal account listed as a test user. If Google shows an unverified-app warning for your own project, review the client and requested permissions before continuing. Select **both** Gmail read-only and Drive file access, then approve. The browser redirects to `http://127.0.0.1:8765/oauth2callback` through the tunnel if present. No redirect-URI registration is required for this Desktop loopback flow.
8. Wait for the terminal to report `GOOGLE_REFRESH_TOKEN saved in .env`. The helper replaces/appends that variable, preserves unrelated values, makes `.env` owner-readable/writable (`0600`), and never prints the code or tokens. Then run:

   ```sh
   npm run build
   npm run connections
   ```

The helper reads client credentials directly from `.env`, uses fresh random state and S256 PKCE, binds only to `127.0.0.1:8765`, and closes its temporary listener after completion, cancellation, or a ten-minute timeout. It only exchanges authorization credentials; it does not read email or write Drive files. The token exchange has a ten-second deadline and no automatic retries. It refuses incomplete scope grants, symlinked environment files, or concurrent edits to `.env`. An invalid callback state is rejected without exchanging a code. The printed sign-in URL contains the public client ID and temporary authorization parameters, not the client secret or tokens; treat it as part of your private setup session.

If the browser reports connection refused, check the SSH tunnel and whether the command is still waiting. For `redirect_uri_mismatch`, verify the credentials belong to a Desktop client. For `invalid_grant` during a later connection check, rerun authorization using the same client; an authorization code or access token is not a refresh token. Changing declared scopes in Cloud Console alone does not update an existing grant: rerun authorization after a scope change. Stop the SSH tunnel with Ctrl-C when finished.

For long-running use, provide a public homepage and privacy-policy URL in **Branding**, then switch **Audience** to **In production** and authorize again. Personal-use apps can be exempt from verification, but still require the production branding fields and may display an unverified-app warning. Publish accurate data-use descriptions, including any email excerpts sent to TypeSafe AI; do not promise provider retention or training behavior without checking it.

Sources: [desktop OAuth and PKCE](https://developers.google.com/identity/protocols/oauth2/native-app), [testing expiry](https://support.google.com/cloud/answer/15549945?hl=en), [branding requirements](https://support.google.com/cloud/answer/15549049?hl=en), [personal-use verification exception](https://support.google.com/cloud/answer/13464323?hl=en).

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
