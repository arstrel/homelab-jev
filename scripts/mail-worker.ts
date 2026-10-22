import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { offlineEnvironment } from "./environment.js";

export const workerLabel = "com.arstrel.jev.mail-sync";
export interface WorkerConfig {
  revision: string;
  node: string;
  nodeVersion: string;
  release: string;
  envFile: string;
}
export interface WorkerOptions {
  root?: string;
  envFile?: string;
  revision?: string;
}
export type WorkerCommand = "install" | "start" | "stop" | "status";
interface CommandResult {
  status: number | null;
  stdout: string;
}
interface WorkerHost {
  home: string;
  cwd: string;
  uid: number;
  platform: string;
  exec(command: string, args: string[], cwd: string): CommandResult;
}

function execute(command: string, args: string[], cwd: string): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...offlineEnvironment(process.env),
      PATH: `${dirname(process.execPath)}:${process.env.PATH ?? "/usr/bin:/bin"}`,
      HUSKY: "0",
      NODE_ENV: "production",
    },
    timeout: 300_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { status: result.error ? null : result.status, stdout: result.stdout ?? "" };
}
function requireSuccess(result: CommandResult, phase: string) {
  if (result.status !== 0)
    throw new Error(`Worker ${phase} failed; inspect the deployment runbook.`);
  return result.stdout.trim();
}
function atomicWrite(path: string, content: string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, content, { mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}
function xml(value: string) {
  if (!isAbsolute(value) || [...value].some((c) => c.charCodeAt(0) < 32))
    throw new Error("Invalid worker path.");
  return value.replace(/[&<>"']/g, (c) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[c] ?? c;
  });
}
export function collectionPlist(config: WorkerConfig, logs: string) {
  const args = [
    config.node,
    `--env-file=${config.envFile}`,
    join(config.release, "dist/cli.js"),
    "mail:sync",
    "--max-pages",
    "5",
    "--max-threads",
    "20",
  ];
  // All paths are literal program arguments; launchd does not invoke a shell.
  const strings = args.map(
    (arg, i) =>
      `<string>${i === 1 ? `--env-file=${xml(config.envFile)}` : i === 0 || i === 2 ? xml(arg) : arg}</string>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${workerLabel}</string>
<key>ProgramArguments</key><array>${strings.join("")}</array>
<key>WorkingDirectory</key><string>${xml(config.release)}</string>
<key>StartInterval</key><integer>300</integer>
<key>RunAtLoad</key><true/>
<key>ProcessType</key><string>Background</string>
<key>ExitTimeOut</key><integer>30</integer>
<key>Umask</key><integer>63</integer>
<key>StandardOutPath</key><string>${xml(join(logs, "mail-sync.log"))}</string>
<key>StandardErrorPath</key><string>${xml(join(logs, "mail-sync-error.log"))}</string>
</dict></plist>\n`;
}
function privateEnvironment(path: string, uid: number) {
  const file = lstatSync(path);
  if (!file.isFile() || file.uid !== uid || (file.mode & 0o077) !== 0)
    throw new Error("Worker environment must be an owner-only regular file (chmod 600).");
}

export function manageWorker(
  command: WorkerCommand,
  options: WorkerOptions,
  overrides: Partial<WorkerHost> = {},
) {
  const host: WorkerHost = {
    home: homedir(),
    cwd: process.cwd(),
    uid: process.getuid?.() ?? -1,
    platform: process.platform,
    exec: execute,
    ...overrides,
  };
  if (host.platform !== "darwin") throw new Error("Worker control requires macOS.");
  const root = resolve(options.root ?? join(host.home, "Library/Application Support/Jev"));
  const currentPath = join(root, "current.json");
  const agent = join(host.home, "Library/LaunchAgents", `${workerLabel}.plist`);
  const domain = `gui/${host.uid}`;
  const target = `${domain}/${workerLabel}`;
  const call = (tool: string, args: string[], cwd = host.cwd) => host.exec(tool, args, cwd);
  const launch = (args: string[]) => call("/bin/launchctl", args);
  const checkedLaunch = (args: string[]) => requireSuccess(launch(args), "launchctl");
  const loaded = () => {
    const result = launch(["print", target]);
    if (result.status === null) throw new Error("Worker launchctl is unavailable.");
    return result.status === 0;
  };
  const readConfig = (): WorkerConfig | undefined =>
    existsSync(currentPath)
      ? (JSON.parse(readFileSync(currentPath, "utf8")) as WorkerConfig)
      : undefined;
  const observation = (config: WorkerConfig) => {
    privateEnvironment(config.envFile, host.uid);
    if (
      requireSuccess(call(config.node, ["--version"]), "runtime check") !== `v${config.nodeVersion}`
    )
      throw new Error("Worker runtime changed; reinstall with the pinned Node version.");
    const result = call(
      config.node,
      [`--env-file=${config.envFile}`, join(config.release, "dist/cli.js"), "mail:status"],
      config.release,
    );
    const text = requireSuccess(result, "schema/status preflight");
    try {
      const report: unknown = JSON.parse(text);
      if (!report || typeof report !== "object" || !("schemaState" in report)) throw new Error();
      return report as { schemaState: string };
    } catch {
      throw new Error("Worker status returned an invalid report.");
    }
  };
  if (command === "status") {
    const config = readConfig();
    return config
      ? {
          configured: true,
          revision: config.revision,
          nodeVersion: config.nodeVersion,
          loaded: loaded(),
          collection: observation(config),
        }
      : { configured: false, loaded: loaded() };
  }
  requireSuccess(launch(["print", domain]), "GUI session check (log into macOS first)");
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const lock = join(root, ".deployment-lock");
  try {
    mkdirSync(lock, { mode: 0o700 });
  } catch {
    throw new Error("Another worker deployment is in progress; inspect .deployment-lock.");
  }
  try {
    if (command === "stop") {
      checkedLaunch(["disable", target]);
      if (loaded()) checkedLaunch(["bootout", target]);
      return { stopped: true };
    }
    if (command === "start") {
      const config = readConfig();
      if (!config) throw new Error("Install the worker first.");
      if (observation(config).schemaState !== "ready")
        throw new Error("Worker schema is not ready.");
      checkedLaunch(["enable", target]);
      if (!loaded()) checkedLaunch(["bootstrap", domain, agent]);
      return { started: true, revision: config.revision };
    }
    const git = (args: string[]) => call("git", args);
    if (options.revision && !/^[a-f0-9]{40}$/.test(options.revision))
      throw new Error("Invalid worker revision; use a full commit SHA.");
    if (requireSuccess(git(["status", "--porcelain"]), "checkout check"))
      throw new Error("Install from a clean reviewed checkout after merging and fetching main.");
    const head = requireSuccess(git(["rev-parse", "HEAD"]), "revision lookup");
    requireSuccess(
      git(["merge-base", "--is-ancestor", head, "origin/main"]),
      "reviewed HEAD check",
    );
    const revision = requireSuccess(
      git(["rev-parse", "--verify", `${options.revision ?? head}^{commit}`]),
      "revision lookup",
    );
    if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Invalid worker revision.");
    requireSuccess(
      git(["merge-base", "--is-ancestor", revision, "origin/main"]),
      "reviewed revision check",
    );
    const repo = realpathSync(host.cwd);
    const rootRelative = relative(repo, realpathSync(root));
    if (
      !rootRelative ||
      (rootRelative !== ".." && !rootRelative.startsWith(`..${sep}`) && !isAbsolute(rootRelative))
    )
      throw new Error("Worker releases must live outside the editable checkout.");
    const envFile = resolve(options.envFile ?? join(repo, ".env"));
    privateEnvironment(envFile, host.uid);
    const expectedNode = requireSuccess(git(["show", `${revision}:.nvmrc`]), "runtime lookup");
    if (process.versions.node !== expectedNode)
      throw new Error(`Use the release's pinned Node ${expectedNode}.`);
    const releases = join(root, "releases");
    mkdirSync(releases, { recursive: true, mode: 0o700 });
    const config: WorkerConfig = {
      revision,
      node: process.execPath,
      nodeVersion: expectedNode,
      release: join(releases, revision),
      envFile,
    };
    if (!existsSync(config.release)) {
      const staging = mkdtempSync(join(releases, ".prepare-"));
      try {
        const archive = join(staging, "source.tar");
        requireSuccess(git(["archive", `--output=${archive}`, revision]), "source archive");
        requireSuccess(call("/usr/bin/tar", ["-xf", archive, "-C", staging]), "archive extraction");
        rmSync(archive);
        const npm = join(dirname(process.execPath), "npm");
        requireSuccess(
          call(
            npm,
            ["ci", "--include=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
            staging,
          ),
          "dependency installation",
        );
        requireSuccess(call(process.execPath, ["scripts/build.mjs"], staging), "compilation");
        requireSuccess(
          call(
            npm,
            ["prune", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
            staging,
          ),
          "production dependency pruning",
        );
        writeFileSync(
          join(staging, "release.json"),
          JSON.stringify({ revision, nodeVersion: expectedNode }),
          { mode: 0o600, flag: "wx" },
        );
        renameSync(staging, config.release);
      } finally {
        rmSync(staging, { recursive: true, force: true });
      }
    } else {
      const metadata = JSON.parse(readFileSync(join(config.release, "release.json"), "utf8"));
      if (metadata.revision !== revision || metadata.nodeVersion !== expectedNode)
        throw new Error("Existing worker release metadata does not match.");
    }
    if (observation(config).schemaState !== "ready")
      throw new Error("Worker schema is not ready; migrate explicitly before installation.");
    const logs = join(root, "logs");
    mkdirSync(logs, { recursive: true, mode: 0o700 });
    for (const file of ["mail-sync.log", "mail-sync-error.log"])
      writeFileSync(join(logs, file), "", { flag: "a", mode: 0o600 });
    mkdirSync(dirname(agent), { recursive: true, mode: 0o700 });
    const previous = readConfig();
    const previousPlist = existsSync(agent) ? readFileSync(agent, "utf8") : undefined;
    const wasLoaded = loaded();
    if (wasLoaded) checkedLaunch(["bootout", target]);
    try {
      atomicWrite(agent, collectionPlist(config, logs));
      checkedLaunch(["enable", target]);
      checkedLaunch(["bootstrap", domain, agent]);
      atomicWrite(currentPath, JSON.stringify(config, null, 2));
    } catch {
      let restored = true;
      if (loaded()) restored = launch(["bootout", target]).status === 0;
      if (previousPlist) atomicWrite(agent, previousPlist);
      else rmSync(agent, { force: true });
      if (previous) atomicWrite(currentPath, JSON.stringify(previous, null, 2));
      else rmSync(currentPath, { force: true });
      if (wasLoaded) restored = launch(["bootstrap", domain, agent]).status === 0 && restored;
      else restored = launch(["disable", target]).status === 0 && restored;
      throw new Error(
        restored
          ? "Worker activation failed; previous configuration restored."
          : "Worker activation failed; previous configuration needs manual recovery.",
      );
    }
    return { installed: true, revision, nodeVersion: expectedNode, intervalSeconds: 300 };
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}
