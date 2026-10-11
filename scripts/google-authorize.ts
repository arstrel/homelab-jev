import { createServer } from "node:http";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import {
  AuthorizationError,
  authorizationSession,
  callbackCode,
  exchangeCode,
  readEnvironmentFile,
  saveRefreshToken,
} from "./google-oauth.js";

async function authorize() {
  const path = resolve(".env");
  const original = readEnvironmentFile(path);
  const credentials = parseEnv(original);
  const clientId = credentials.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = credentials.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret)
    throw new AuthorizationError(
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from the same Desktop client in .env.",
    );
  const port = 8765;
  const session = authorizationSession(clientId, port);
  const operation = new AbortController();
  let settle: (error?: unknown) => void = () => {};
  const finished = new Promise<void>((accept, reject) => {
    settle = (error) => (error ? reject(error) : accept());
  });
  let processing = false;
  const server = createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "default-src 'none'");
    let url: URL;
    try {
      url = new URL(request.url ?? "/", session.redirectUri);
    } catch {
      response.writeHead(400).end("Invalid callback URL.");
      return;
    }
    if (
      request.method !== "GET" ||
      url.origin !== new URL(session.redirectUri).origin ||
      url.pathname !== "/oauth2callback"
    ) {
      response.writeHead(404).end("Not found.");
      return;
    }
    let code: string;
    try {
      code = callbackCode(url, session.state);
    } catch (error) {
      response
        .writeHead(400)
        .end("Invalid or declined callback. Return to the terminal or retry authorization.");
      if (
        url.searchParams.getAll("state").length === 1 &&
        url.searchParams.get("state") === session.state
      )
        settle(error);
      return;
    }
    if (processing) {
      response.writeHead(409).end("Authorization is already being processed.");
      return;
    }
    processing = true;
    void (async () => {
      try {
        const token = await exchangeCode({
          clientId,
          clientSecret,
          code,
          verifier: session.verifier,
          redirectUri: session.redirectUri,
          signal: operation.signal,
        });
        operation.signal.throwIfAborted();
        saveRefreshToken(path, original, token);
        response.end(
          "Google authorization saved. You can close this tab and return to the terminal.",
        );
        settle();
      } catch (error) {
        response
          .writeHead(400)
          .end("Authorization failed. Return to the terminal for recovery instructions.");
        settle(error);
      }
    })();
  });
  const timeout = setTimeout(
    () =>
      settle(
        new AuthorizationError("Authorization timed out after ten minutes. Run the command again."),
      ),
    600000,
  );
  const interrupted = () =>
    settle(new AuthorizationError("Authorization cancelled. No new token was saved."));
  process.once("SIGINT", interrupted);
  process.once("SIGTERM", interrupted);
  try {
    server.on("error", () =>
      settle(
        new AuthorizationError(
          "Cannot listen on 127.0.0.1:8765. Close the other listener or authorization command and retry.",
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => {
      console.log("Open this URL in your browser and approve both permissions:");
      console.log(session.url);
      console.log(
        "If connected over SSH, first forward laptop port 8765 to the Mac mini; see docs/connections.md.",
      );
      console.log("Waiting up to ten minutes. Tokens will not be printed.");
    });
    await finished;
    console.log(
      "GOOGLE_REFRESH_TOKEN saved in .env with owner-only permissions. Run npm run build && npm run connections.",
    );
  } finally {
    operation.abort();
    clearTimeout(timeout);
    process.removeListener("SIGINT", interrupted);
    process.removeListener("SIGTERM", interrupted);
    await new Promise<void>((accept) => {
      const forced = setTimeout(() => server.closeAllConnections(), 1000);
      server.close(() => {
        clearTimeout(forced);
        accept();
      });
    });
  }
}

try {
  await authorize();
} catch (error) {
  console.error(
    error instanceof AuthorizationError
      ? error.message
      : "Google authorization failed. Check connectivity and environment-file permissions, then retry. Credentials were not printed.",
  );
  process.exitCode = 1;
}
