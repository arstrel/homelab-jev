import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadBundle, renderViewer } from "./okf.js";

export function checkedBundle(root = process.cwd()) {
  const bundle = loadBundle(resolve(root, "knowledge"), root);
  for (const warning of bundle.warnings) console.warn(`OKF warning: ${warning}`);
  if (bundle.errors.length) throw new Error(bundle.errors.join("\n"));
  console.log(`OKF: ${bundle.documents.filter((d) => !d.reserved).length} concepts checked`);
  return bundle;
}
export function buildViewer(root = process.cwd()) {
  const html = renderViewer(checkedBundle(root), root);
  const directory = resolve(root, ".cache/okf");
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, "viz.html");
  writeFileSync(path, html, { mode: 0o600 });
  console.log(`OKF viewer: ${path}`);
  return html;
}
