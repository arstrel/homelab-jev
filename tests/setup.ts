import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

// Fail rather than silently using credentials inherited from the user's shell.
for (const key of Object.keys(process.env))
  if (/^(DB_|JEV_API_KEY$|GOOGLE_|TODOIST_|GH_TOKEN$|GITHUB_TOKEN$|TYPESAFE_)/.test(key))
    throw new Error(
      "Tests cannot inherit operational configuration; use npm run test or npm run check.",
    );
process.env.TZ = "UTC";
process.loadEnvFile = () => {
  throw new Error("Environment files are forbidden in deterministic tests");
};
export const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
