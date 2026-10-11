import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { parseEnv } from "node:util";

export const googleScopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.file",
] as const;

export class AuthorizationError extends Error {}

export function authorizationSession(clientId: string, port: number) {
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(32).toString("base64url");
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: googleScopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return { url: url.href, verifier, state, redirectUri };
}

export function callbackCode(url: URL, expectedState: string): string {
  if (
    url.searchParams.getAll("state").length !== 1 ||
    url.searchParams.get("state") !== expectedState
  )
    throw new AuthorizationError("Callback state mismatch. Restart authorization.");
  if (url.searchParams.has("error"))
    throw new AuthorizationError(
      "Google authorization was declined. Restart and approve both scopes.",
    );
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.getAll("code").length !== 1)
    throw new AuthorizationError(
      "Google did not return an authorization code. Restart authorization.",
    );
  return code;
}

export async function exchangeCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  verifier: string;
  redirectUri: string;
  signal?: AbortSignal;
}): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      code_verifier: input.verifier,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
    signal: input.signal
      ? AbortSignal.any([input.signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!response.ok)
    throw new AuthorizationError(
      "Google rejected the code exchange. Check the Desktop client ID and secret, then restart authorization.",
    );
  const data: unknown = await response.json();
  if (!data || typeof data !== "object")
    throw new AuthorizationError("Google returned an invalid token response.");
  const token = "refresh_token" in data ? data.refresh_token : undefined;
  const scopes = "scope" in data && typeof data.scope === "string" ? data.scope.split(" ") : [];
  if (typeof token !== "string" || !/^[A-Za-z0-9_./+=-]+$/.test(token))
    throw new AuthorizationError(
      "Google did not return a usable refresh token. Restart authorization with consent.",
    );
  if (googleScopes.some((scope) => !scopes.includes(scope)))
    throw new AuthorizationError(
      "Both Gmail read-only and Drive file access are required. Restart and select both permissions.",
    );
  return token;
}

export function readEnvironmentFile(path: string): string {
  if (!lstatSync(path).isFile())
    throw new AuthorizationError("The environment file must be a regular file, not a symlink.");
  return readFileSync(path, { encoding: "utf8", flag: constants.O_RDONLY | constants.O_NOFOLLOW });
}

export function saveRefreshToken(path: string, original: string, token: string): void {
  if (!/^[A-Za-z0-9_./+=-]+$/.test(token))
    throw new AuthorizationError("Invalid refresh token format.");
  const assignment = `GOOGLE_REFRESH_TOKEN=${token}`;
  const pattern = /^(?:[ \t]*export[ \t]+|[ \t]*)GOOGLE_REFRESH_TOKEN[ \t]*=.*$/gm;
  const updated = pattern.test(original)
    ? original.replace(pattern, assignment)
    : `${original}${original.endsWith("\n") ? "" : "\n"}${assignment}\n`;
  const before = parseEnv(original);
  const after = parseEnv(updated);
  if (
    after.GOOGLE_REFRESH_TOKEN !== token ||
    [...new Set([...Object.keys(before), ...Object.keys(after)])].some(
      (key) => key !== "GOOGLE_REFRESH_TOKEN" && before[key] !== after[key],
    )
  )
    throw new AuthorizationError(
      "Unsupported environment-file layout. No credentials were changed.",
    );
  const temporary = `${path}.oauth-${randomBytes(8).toString("hex")}.tmp`;
  try {
    const file = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(file, updated, "utf8");
    } finally {
      closeSync(file);
    }
    if (readEnvironmentFile(path) !== original)
      throw new AuthorizationError(
        "The environment file changed during authorization. Restart with the updated file.",
      );
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}
