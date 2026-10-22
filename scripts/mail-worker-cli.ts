import { manageWorker, type WorkerCommand, type WorkerOptions } from "./mail-worker.js";

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help") {
    console.log(
      "Usage: npm run worker -- install|start|stop|status [--root PATH]\nInstall: [--env-file PATH] [--revision COMMIT]\nSee deploy/README.md. No implicit migrations or model calls.",
    );
  } else {
    if (!["install", "start", "stop", "status"].includes(command))
      throw new Error("Invalid worker command.");
    const options: WorkerOptions = {};
    const seen = new Set<string>();
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i],
        value = args[i + 1];
      if (
        !flag ||
        !value ||
        !["--root", ...(command === "install" ? ["--env-file", "--revision"] : [])].includes(
          flag,
        ) ||
        seen.has(flag)
      )
        throw new Error("Invalid worker options; see --help.");
      seen.add(flag);
      if (flag === "--root") options.root = value;
      if (flag === "--env-file") options.envFile = value;
      if (flag === "--revision") options.revision = value;
    }
    console.log(JSON.stringify(manageWorker(command as WorkerCommand, options), null, 2));
  }
} catch (error) {
  console.error(
    (error instanceof Error && error.message.startsWith("Worker ")) ||
      (error instanceof Error &&
        /^(Invalid worker|Install |Use |Another worker)/.test(error.message))
      ? (error as Error).message
      : "Worker operation failed; inspect deploy/README.md and private local configuration.",
  );
  process.exitCode = 1;
}
