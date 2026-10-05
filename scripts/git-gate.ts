import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Any non-ignored repository file can affect discovery, imports or configuration.
// Using the complete Git file set also covers new tooling without an allowlist update.
export const validationInput = (path: string) =>
  !/^(node_modules\/|dist\/|coverage\/|\.git\/|\.husky\/_\/)/.test(path);

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}
const paths = (value: string) => value.split("\0").filter(Boolean).filter(validationInput);
export function guard(mode: "commit" | "push", cwd: string, input = "") {
  const head = git(cwd, "rev-parse", "HEAD").trim();
  if (mode === "push") {
    for (const line of input.trim().split("\n").filter(Boolean)) {
      const fields = line.trim().split(/\s+/);
      if (fields.length !== 4) throw new Error("Malformed pre-push reference input");
      const sha = fields[1];
      if (sha && !/^0+$/.test(sha) && sha !== head)
        throw new Error(
          "Push target differs from current HEAD. Check out the target, clean validation inputs and push separately.",
        );
    }
  }
  const dirty = paths(git(cwd, "diff", "--name-only", "-z", ...(mode === "push" ? ["HEAD"] : [])));
  const untracked = paths(git(cwd, "ls-files", "--others", "--exclude-standard", "-z"));
  if (dirty.length || untracked.length)
    throw new Error(
      `Validation inputs must ${mode === "commit" ? "be fully staged" : "match HEAD"}: ${[...new Set([...dirty, ...untracked])].join(", ")}. Review and stage explicitly; no files were staged or stashed.`,
    );
  const files = paths(git(cwd, "ls-files", "-z"));
  const hash = createHash("sha256");
  for (const file of [...new Set(files)].sort()) {
    hash.update(file);
    try {
      hash.update(readFileSync(`${cwd}/${file}`));
    } catch {
      hash.update("<deleted>");
    }
  }
  // Include index, mode changes and HEAD, not just file bytes.
  hash.update(git(cwd, "ls-files", "--stage", "-z"));
  hash.update(head);
  return hash.digest("hex");
}
export function gate(mode: "commit" | "push", cwd: string, input: string, checks: () => void) {
  const before = guard(mode, cwd, input);
  checks();
  if (guard(mode, cwd, input) !== before)
    throw new Error("Validation inputs changed during checks. Review changes and retry.");
}
