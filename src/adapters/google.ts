import { google } from "googleapis";
import { ConfigurationError, type Environment } from "../config.js";

export function googleAuth(env: Environment) {
  const names = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"] as const;
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length) throw new ConfigurationError(missing);
  const client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN ?? "" });
  return client;
}
