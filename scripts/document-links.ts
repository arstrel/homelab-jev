import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// The dedicated OKF checker resolves knowledge/ links against its bundle root.
function markdown(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((item) => {
    const path = `${root}/${item.name}`;
    if (
      [
        "node_modules",
        ".git",
        ".agents",
        "dist",
        "coverage",
        ".husky",
        ".cache",
        "knowledge",
      ].includes(item.name)
    )
      return [];
    return item.isDirectory() ? markdown(path) : path.endsWith(".md") ? [path] : [];
  });
}
let checked = 0;
for (const file of markdown(".")) {
  const content = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1]?.split("#")[0]?.split(/\s+"/)[0];
    if (!target || /^(https?:|mailto:|app:|codex:)/.test(target)) continue;
    if (!existsSync(resolve(dirname(file), decodeURIComponent(target))))
      throw new Error(`Broken local link in ${file}: ${target}`);
    checked++;
  }
}
console.log(`Local document links: ${checked} checked`);
