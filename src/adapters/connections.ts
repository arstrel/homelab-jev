import { diagnostic, type Environment } from "../config.js";
import { checkDrive } from "./drive.js";
import { checkGmail } from "./gmail.js";
import { googleAuth } from "./google.js";
import { checkJev } from "./jev.js";
import { checkTodoist } from "./todoist.js";

export async function checkConnections(env: Environment) {
  const deadline = setTimeout(() => {
    console.error("Connection checks exceeded their 30-second deadline.");
    process.exit(1);
  }, 30000);
  deadline.unref();
  try {
    const checks = [
      {
        provider: "Jev",
        configured: !!env.JEV_API_KEY,
        check: () => checkJev(env.JEV_API_KEY ?? ""),
      },
      {
        provider: "Todoist",
        configured: !!env.TODOIST_API_TOKEN,
        check: () => checkTodoist(env.TODOIST_API_TOKEN ?? ""),
      },
      {
        provider: "Google Gmail/Drive",
        configured:
          !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET && !!env.GOOGLE_REFRESH_TOKEN,
        check: async () => {
          const auth = googleAuth(env);
          await checkGmail(auth);
          await checkDrive(auth);
        },
      },
    ];
    for (const { provider, configured, check } of checks) {
      if (!configured) {
        console.log(`${provider}: authorization missing; see docs/connections.md`);
        process.exitCode = 1;
        continue;
      }
      try {
        await check();
        console.log(`${provider}: bounded read-only connection check passed`);
      } catch (error) {
        console.error(`${provider}: ${diagnostic(error)}`);
        process.exitCode = 1;
      }
    }
  } finally {
    clearTimeout(deadline);
  }
}
