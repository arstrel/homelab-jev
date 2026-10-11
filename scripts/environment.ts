import type { Environment } from "../src/config.js";

export const operationalKey =
  /^(DB_|JEV_|GOOGLE_|TODOIST_|GH_|GITHUB_TOKEN$|TYPESAFE_|TEST_DATABASE_URL$|JEV_TEST_DATABASE$)/;
export function offlineEnvironment(input: Environment): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(Object.entries(input).filter(([key]) => !operationalKey.test(key))),
    TZ: "UTC",
    OPENSPEC_TELEMETRY: "0",
    DO_NOT_TRACK: "1",
  };
}
