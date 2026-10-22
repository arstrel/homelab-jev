import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { collectionPlist, manageWorker, workerLabel } from "../../scripts/mail-worker.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "jev-worker-test-"));
  directories.push(directory);
  const cwd = join(directory, "editable repo");
  const root = join(directory, "installed & releases");
  const home = join(directory, "home");
  mkdirSync(join(cwd, "scripts"), { recursive: true });
  mkdirSync(home);
  writeFileSync(join(cwd, ".nvmrc"), process.versions.node);
  writeFileSync(join(cwd, ".gitignore"), ".env\n");
  writeFileSync(join(cwd, "package.json"), '{"name":"worker-fixture","type":"module"}');
  writeFileSync(
    join(cwd, "scripts/build.mjs"),
    `import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('dist');writeFileSync('dist/cli.js', 'console.log(JSON.stringify({schemaState:process.env.SCHEMA_STATE||"ready",evidenceSyncedAt:null,retrievals:{pending:1}}))');`,
  );
  const run = (tool: string, args: string[], at = cwd) => {
    const result = spawnSync(tool, args, {
      cwd: at,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    });
    return { status: result.status, stdout: result.stdout ?? "" };
  };
  const git = (args: string[]) => {
    const result = run("git", args);
    if (result.status) throw new Error("Fixture git failed");
    return result.stdout.trim();
  };
  git(["init", "-q"]);
  git(["add", "."]);
  git([
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "fixture",
  ]);
  const revision = git(["rev-parse", "HEAD"]);
  git(["update-ref", "refs/remotes/origin/main", revision]);
  const envFile = join(cwd, ".env");
  writeFileSync(envFile, "SCHEMA_STATE=ready\nFAKE_SECRET=do-not-print\n", { mode: 0o600 });
  const state = { loaded: false, disabled: false, failBootstrap: false };
  const calls: Array<{ tool: string; args: string[]; cwd: string }> = [];
  const host = {
    home,
    cwd,
    platform: "darwin",
    uid: process.getuid?.() ?? 0,
    exec(tool: string, args: string[], at: string) {
      calls.push({ tool, args, cwd: at });
      if (tool === "/bin/launchctl") {
        if (args[0] === "print")
          return {
            status: args[1]?.includes(workerLabel) ? (state.loaded ? 0 : 1) : 0,
            stdout: "",
          };
        if (args[0] === "disable") state.disabled = true;
        if (args[0] === "enable") state.disabled = false;
        if (args[0] === "bootout") state.loaded = false;
        if (args[0] === "bootstrap") {
          state.loaded = true;
          if (state.failBootstrap) {
            state.failBootstrap = false;
            return { status: 1, stdout: "FAKE_SECRET=do-not-print" };
          }
        }
        return { status: 0, stdout: "" };
      }
      // No packages are needed by this fixture. Git archive/tar, compilation and
      // candidate CLI execution are real; installation never reaches a registry.
      if (tool.endsWith("/npm")) return { status: 0, stdout: "" };
      return run(tool, args, at);
    },
  };
  const options = { root, envFile };
  return {
    directory,
    cwd,
    root,
    home,
    revision,
    git,
    state,
    calls,
    host,
    options,
    worker: (command: "install" | "start" | "stop" | "status") =>
      manageWorker(command, options, host),
  };
}

it("renders literal escaped paths and a paced collection-only five-minute agent", () => {
  const f = fixture();
  const plist = collectionPlist(
    {
      revision: f.revision,
      node: process.execPath,
      nodeVersion: process.versions.node,
      release: f.root,
      envFile: f.options.envFile,
    },
    join(f.root, "logs"),
  );
  expect(plist).toContain("<integer>300</integer>");
  expect(plist).toContain("<key>RunAtLoad</key><true/>");
  expect(plist).toContain("installed &amp; releases");
  expect(plist).toContain("<string>mail:sync</string>");
  expect(plist).not.toMatch(/KeepAlive|mail:classify|mail:tasks|db:migrate|do-not-print/);
  if (process.platform === "darwin") {
    const path = join(f.directory, "agent.plist");
    writeFileSync(path, plist);
    expect(spawnSync("/usr/bin/plutil", ["-lint", path]).status).toBe(0);
  }
});

it("builds only committed source into an independent release and reuses it without rebuilding", () => {
  const f = fixture();
  expect(f.worker("install")).toMatchObject({
    installed: true,
    revision: f.revision,
    intervalSeconds: 300,
  });
  const release = join(f.root, "releases", f.revision);
  expect(existsSync(join(release, ".env"))).toBe(false);
  expect(existsSync(join(release, ".git"))).toBe(false);
  const built = readFileSync(join(release, "dist/cli.js"), "utf8");
  f.worker("install");
  expect(f.calls.filter((c) => c.args[0] === "ci")).toHaveLength(1);
  expect(f.calls.find((c) => c.args[0] === "prune")?.args).toContain("--omit=dev");
  writeFileSync(join(f.cwd, "scripts/build.mjs"), "throw new Error('edited checkout')");
  expect(readFileSync(join(release, "dist/cli.js"), "utf8")).toBe(built);
  expect(f.worker("status")).toMatchObject({
    loaded: true,
    collection: { schemaState: "ready", evidenceSyncedAt: null, retrievals: { pending: 1 } },
  });
});

it("rejects dirty and unreviewed checkouts before preparing a release", () => {
  const f = fixture();
  writeFileSync(join(f.cwd, "untracked"), "dirty");
  expect(() => f.worker("install")).toThrow("clean reviewed checkout");
  f.git(["add", "."]);
  f.git([
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "not on main",
  ]);
  expect(() => f.worker("install")).toThrow("reviewed HEAD check");
  expect(f.calls.some((c) => c.args[0] === "bootstrap")).toBe(false);
});

it("rejects schema-incompatible candidates without stopping the active job or migrating", () => {
  const f = fixture();
  f.worker("install");
  const before = readFileSync(join(f.root, "current.json"), "utf8");
  f.calls.length = 0;
  writeFileSync(f.options.envFile, "SCHEMA_STATE=incompatible\n");
  expect(() => f.worker("install")).toThrow("schema is not ready");
  expect(f.state.loaded).toBe(true);
  expect(f.calls.some((c) => c.args[0] === "bootout" || c.args.includes("db:migrate"))).toBe(false);
  expect(readFileSync(join(f.root, "current.json"), "utf8")).toBe(before);
});

it("stops persistently and restarts without removing release or evidence state", () => {
  const f = fixture();
  f.worker("install");
  expect(f.worker("stop")).toEqual({ stopped: true });
  expect(f.state).toMatchObject({ disabled: true, loaded: false });
  expect(f.worker("status")).toMatchObject({ configured: true, loaded: false });
  expect(f.worker("start")).toMatchObject({ started: true });
  expect(f.state).toMatchObject({ disabled: false, loaded: true });
  expect(existsSync(join(f.root, "releases", f.revision))).toBe(true);
});

it("restores the previous active job after uncertain activation without exposing child output", () => {
  const f = fixture();
  f.worker("install");
  const before = readFileSync(join(f.root, "current.json"), "utf8");
  f.state.failBootstrap = true;
  expect(() => f.worker("install")).toThrow("previous configuration restored");
  expect(f.state.loaded).toBe(true);
  expect(readFileSync(join(f.root, "current.json"), "utf8")).toBe(before);
  expect(existsSync(join(f.root, ".deployment-lock"))).toBe(false);
});

it("refuses exposed credentials, deployment overlap and releases inside the checkout", () => {
  const f = fixture();
  chmodSync(f.options.envFile, 0o644);
  expect(() => f.worker("install")).toThrow("owner-only");
  chmodSync(f.options.envFile, 0o600);
  mkdirSync(join(f.root, ".deployment-lock"));
  expect(() => f.worker("install")).toThrow("Another worker deployment");
  expect(() =>
    manageWorker("install", { ...f.options, root: join(f.cwd, "..misleading") }, f.host),
  ).toThrow("outside the editable checkout");
});

it("reports unconfigured state and refuses unsupported hosts", () => {
  const f = fixture();
  expect(f.worker("status")).toEqual({ configured: false, loaded: false });
  expect(() => manageWorker("status", f.options, { ...f.host, platform: "linux" })).toThrow(
    "requires macOS",
  );
});

it("can select an earlier compatible reviewed release without rebuilding it", () => {
  const f = fixture();
  f.worker("install");
  writeFileSync(join(f.cwd, "new-file"), "new reviewed release");
  f.git(["add", "."]);
  f.git([
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "next release",
  ]);
  f.git(["update-ref", "refs/remotes/origin/main", f.git(["rev-parse", "HEAD"])]);
  f.worker("install");
  expect(manageWorker("install", { ...f.options, revision: f.revision }, f.host)).toMatchObject({
    revision: f.revision,
  });
  expect(f.worker("status")).toMatchObject({ revision: f.revision, loaded: true });
  expect(f.calls.filter((c) => c.args[0] === "ci")).toHaveLength(2);
});

it("leaves the first failed activation stopped while retaining its prepared release", () => {
  const f = fixture();
  f.state.failBootstrap = true;
  expect(() => f.worker("install")).toThrow("previous configuration restored");
  expect(f.state).toMatchObject({ loaded: false, disabled: true });
  expect(existsSync(join(f.root, "current.json"))).toBe(false);
  expect(existsSync(join(f.home, "Library/LaunchAgents", `${workerLabel}.plist`))).toBe(false);
  expect(existsSync(join(f.root, "releases", f.revision))).toBe(true);
});

it("sanitizes malformed candidate diagnostics before replacing a job", () => {
  const f = fixture();
  const host = {
    ...f.host,
    exec(tool: string, args: string[], cwd: string) {
      return args.includes("mail:status")
        ? { status: 0, stdout: "FAKE_SECRET=do-not-print" }
        : f.host.exec(tool, args, cwd);
    },
  };
  expect(() => manageWorker("install", f.options, host)).toThrow("invalid report");
  expect(f.state.loaded).toBe(false);
  expect(existsSync(join(f.root, "current.json"))).toBe(false);
});
