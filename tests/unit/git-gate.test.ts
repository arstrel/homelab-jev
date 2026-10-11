import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gate, guard } from "../../scripts/git-gate.js";

let cwd: string;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const file = () => join(cwd, "src/input.ts");
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "jev-gate-"));
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "core.hooksPath", "/dev/null");
  mkdirSync(join(cwd, "src"));
  writeFileSync(file(), "baseline");
  git("add", ".");
  git("commit", "-m", "fixture");
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));
describe("commit gate disposable repositories", () => {
  it("accepts staged content and runs full checks", () => {
    writeFileSync(file(), "staged");
    git("add", ".");
    let checked = false;
    gate("commit", cwd, "", () => {
      checked = true;
    });
    expect(checked).toBe(true);
  });
  it("rejects partial staging without changing index or worktree", () => {
    writeFileSync(file(), "staged");
    git("add", ".");
    writeFileSync(file(), "unstaged");
    expect(() => guard("commit", cwd)).toThrow(/fully staged/);
    expect(git("show", ":src/input.ts")).toBe("staged");
    expect(readFileSync(file(), "utf8")).toBe("unstaged");
  });
  it("rejects unstaged tracked files", () => {
    writeFileSync(file(), "dirty");
    expect(() => guard("commit", cwd)).toThrow(/fully staged/);
  });
  it("rejects relevant untracked files, allowing ignored secrets", () => {
    writeFileSync(join(cwd, ".gitignore"), ".env\n");
    git("add", ".gitignore");
    writeFileSync(join(cwd, ".env"), "fake");
    expect(() => guard("commit", cwd)).not.toThrow();
    writeFileSync(join(cwd, "src/extra.ts"), "new");
    expect(() => guard("commit", cwd)).toThrow(/extra/);
  });
  it("rejects changes during validation, including newly staged changes", () => {
    expect(() =>
      gate("commit", cwd, "", () => {
        writeFileSync(file(), "changed");
        git("add", ".");
      }),
    ).toThrow(/changed during/);
  });
});
describe("push gate disposable repositories", () => {
  const input = (sha: string) => `refs/heads/main ${sha} refs/heads/main ${"0".repeat(40)}\n`;
  it("accepts only current HEAD and blocks staged or unstaged input", () => {
    const sha = git("rev-parse", "HEAD");
    expect(() => guard("push", cwd, input(sha))).not.toThrow();
    writeFileSync(file(), "dirty");
    git("add", ".");
    expect(() => guard("push", cwd, input(sha))).toThrow(/match HEAD/);
  });
  it("rejects a mismatched target", () =>
    expect(() => guard("push", cwd, input("1".repeat(40)))).toThrow(/differs/));
  it("blocks relevant untracked files", () => {
    writeFileSync(join(cwd, "src/extra.ts"), "new");
    expect(() => guard("push", cwd, input(git("rev-parse", "HEAD")))).toThrow(/extra/);
  });
  it("propagates database check failures", () =>
    expect(() =>
      gate("push", cwd, input(git("rev-parse", "HEAD")), () => {
        throw new Error("database check failed");
      }),
    ).toThrow(/database check failed/));
});
