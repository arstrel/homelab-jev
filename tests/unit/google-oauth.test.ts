import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpResponse, http } from "msw";
import { afterEach, expect, it } from "vitest";
import {
  authorizationSession,
  callbackCode,
  exchangeCode,
  googleScopes,
  readEnvironmentFile,
  saveRefreshToken,
} from "../../scripts/google-oauth.js";
import { server } from "../setup.js";

const directories: string[] = [];
function environment(content: string) {
  const directory = mkdtempSync(join(tmpdir(), "jev-oauth-test-"));
  directories.push(directory);
  const path = join(directory, ".env");
  writeFileSync(path, content, { mode: 0o644 });
  return { path, directory };
}
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

it("requests offline consent with fresh state, S256 PKCE, and only the approved scopes", () => {
  const first = authorizationSession("fake-client", 8765);
  const second = authorizationSession("fake-client", 8765);
  const url = new URL(first.url);
  expect(url.origin).toBe("https://accounts.google.com");
  expect(url.searchParams.get("access_type")).toBe("offline");
  expect(url.searchParams.get("prompt")).toBe("consent");
  expect(url.searchParams.get("scope")).toBe(googleScopes.join(" "));
  expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:8765/oauth2callback");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("code_challenge")).toBe(
    createHash("sha256").update(first.verifier).digest("base64url"),
  );
  expect(first.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(second.state).not.toBe(first.state);
  expect(second.verifier).not.toBe(first.verifier);
  expect(first.url).not.toContain(first.verifier);
});

it("accepts only a single code with the expected callback state", () => {
  expect(callbackCode(new URL("http://127.0.0.1/?state=expected&code=fake-code"), "expected")).toBe(
    "fake-code",
  );
  for (const query of [
    "code=fake",
    "state=wrong&code=fake",
    "state=expected&state=wrong&code=fake",
    "state=expected&code=a&code=b",
    "state=expected",
    "state=expected&error=access_denied&error_description=secret",
  ])
    expect(() => callbackCode(new URL(`http://127.0.0.1/?${query}`), "expected")).toThrow();
});

const exchange = {
  clientId: "fake-client",
  clientSecret: "fake-secret",
  code: "fake-code",
  verifier: "fake-verifier",
  redirectUri: "http://127.0.0.1:8765/oauth2callback",
};
it("exchanges the code using matching client, redirect and verifier without sending a refresh grant", async () => {
  server.use(
    http.post("https://oauth2.googleapis.com/token", async ({ request }) => {
      const body = new URLSearchParams(await request.text());
      expect(Object.fromEntries(body)).toEqual({
        client_id: exchange.clientId,
        client_secret: exchange.clientSecret,
        code: exchange.code,
        code_verifier: exchange.verifier,
        redirect_uri: exchange.redirectUri,
        grant_type: "authorization_code",
      });
      return HttpResponse.json({
        refresh_token: "fake-refresh-token",
        scope: googleScopes.join(" "),
      });
    }),
  );
  expect(await exchangeCode(exchange)).toBe("fake-refresh-token");
});

it("sanitizes failed exchanges rather than exposing provider bodies", async () => {
  server.use(
    http.post("https://oauth2.googleapis.com/token", () =>
      HttpResponse.json(
        { error: "invalid_grant", error_description: "fake-secret fake-code" },
        { status: 400 },
      ),
    ),
  );
  await expect(exchangeCode(exchange)).rejects.toThrow("Google rejected the code exchange");
  await exchangeCode(exchange).catch((error: Error) => {
    expect(error.message).not.toContain("fake-secret");
    expect(error.message).not.toContain("fake-code");
  });
});

it("refuses incomplete consent and missing refresh tokens", async () => {
  for (const body of [
    { refresh_token: "fake-refresh", scope: googleScopes[0] },
    { scope: googleScopes.join(" ") },
    { refresh_token: "fake-refresh" },
  ]) {
    server.use(http.post("https://oauth2.googleapis.com/token", () => HttpResponse.json(body)));
    await expect(exchangeCode(exchange)).rejects.toThrow();
  }
});

it("cancels the token exchange when authorization is interrupted", async () => {
  const controller = new AbortController();
  let notifyStarted: () => void = () => {};
  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });
  server.use(
    http.post("https://oauth2.googleapis.com/token", async () => {
      notifyStarted();
      await new Promise<void>((resolve) =>
        controller.signal.addEventListener("abort", () => resolve(), { once: true }),
      );
      return HttpResponse.json({ refresh_token: "fake-refresh", scope: googleScopes.join(" ") });
    }),
  );
  const pending = exchangeCode({ ...exchange, signal: controller.signal });
  const rejected = expect(pending).rejects.toThrow();
  await started;
  controller.abort();
  await rejected;
});

it("replaces the token while preserving unrelated dotenv values and restricting file permissions", () => {
  const original =
    '# personal configuration\nDB_PASSWORD="fake # password"\nGOOGLE_CLIENT_SECRET=fake-secret\nGOOGLE_REFRESH_TOKEN=old\n';
  const { path, directory } = environment(original);
  saveRefreshToken(path, original, "fake-refresh");
  expect(readFileSync(path, "utf8")).toBe(
    original.replace("GOOGLE_REFRESH_TOKEN=old", "GOOGLE_REFRESH_TOKEN=fake-refresh"),
  );
  expect(statSync(path).mode & 0o777).toBe(0o600);
  expect(readdirSync(directory)).toEqual([".env"]);
});

it("appends a missing refresh token without changing other fields", () => {
  const original = "GOOGLE_CLIENT_SECRET=fake-secret";
  const { path } = environment(original);
  saveRefreshToken(path, original, "fake-refresh");
  expect(readFileSync(path, "utf8")).toBe(`${original}\nGOOGLE_REFRESH_TOKEN=fake-refresh\n`);
});

it("refuses concurrent environment edits and cleans up the private temporary file", () => {
  const { path, directory } = environment("DB_NAME=changed\n");
  expect(() => saveRefreshToken(path, "DB_NAME=original\n", "fake-refresh")).toThrow(
    "changed during authorization",
  );
  expect(readFileSync(path, "utf8")).toBe("DB_NAME=changed\n");
  expect(readdirSync(directory)).toEqual([".env"]);
});

it("refuses symlinked environment files and leaves their target untouched", () => {
  const { path, directory } = environment("DB_NAME=fake\n");
  const link = join(directory, ".env.link");
  symlinkSync(path, link);
  expect(() => readEnvironmentFile(link)).toThrow("not a symlink");
  expect(() => saveRefreshToken(link, "DB_NAME=fake\n", "fake-refresh")).toThrow("not a symlink");
  expect(readFileSync(path, "utf8")).toBe("DB_NAME=fake\n");
  expect(readdirSync(directory).sort()).toEqual([".env", ".env.link"]);
});

it("refuses token text inside another multiline dotenv value instead of corrupting it", () => {
  const original = 'OTHER="line one\nGOOGLE_REFRESH_TOKEN=inside-another-value\nline three"\n';
  const { path } = environment(original);
  expect(() => saveRefreshToken(path, original, "fake-refresh")).toThrow(
    "Unsupported environment-file layout",
  );
  expect(readFileSync(path, "utf8")).toBe(original);
});
