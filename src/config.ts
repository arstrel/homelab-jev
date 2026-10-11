import { z } from "zod";

export type Environment = Readonly<Record<string, string | undefined>>;
const text = z.string().trim().min(1);
const port = z.coerce.number().int().min(1).max(65535);
const connection = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      !!url.hostname &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
});

export class ConfigurationError extends Error {
  constructor(fields: readonly string[]) {
    super(`Invalid or missing configuration: ${fields.join(", ")}. See docs/development.md.`);
    this.name = "ConfigurationError";
  }
}

function required<T>(schema: z.ZodType<T>, value: unknown, name: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ConfigurationError([name]);
  return result.data;
}

export function databaseUrl(env: Environment): string {
  if (env.DB_URL !== undefined) return required(connection, env.DB_URL, "DB_URL");
  const host = required(text, env.DB_HOST, "DB_HOST");
  if (!/^[a-zA-Z0-9.:-]+$/.test(host)) throw new ConfigurationError(["DB_HOST"]);
  const url = new URL("postgresql://localhost/");
  url.hostname = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  url.port = String(required(port, env.DB_PORT, "DB_PORT"));
  url.pathname = `/${encodeURIComponent(required(text, env.DB_NAME, "DB_NAME"))}`;
  url.username = required(text, env.DB_USER, "DB_USER");
  url.password = required(text, env.DB_PASSWORD, "DB_PASSWORD");
  return url.href;
}

export function workerConfiguration(env: Environment) {
  return {
    databaseUrl: databaseUrl(env),
    jevApiKey: required(text, env.JEV_API_KEY, "JEV_API_KEY"),
  };
}

// Never propagate provider errors or arbitrary objects into user-visible diagnostics.
export function diagnostic(error: unknown): string {
  return error instanceof ConfigurationError
    ? error.message
    : "Operation failed. Check connection permissions and service availability.";
}
