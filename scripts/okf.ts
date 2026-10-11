import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { marked } from "marked";
import { parseDocument } from "yaml";

export type Metadata = Record<string, unknown>;
export interface Document {
  path: string;
  id: string;
  metadata: Metadata;
  body: string;
  reserved: boolean;
}
export interface Bundle {
  documents: Document[];
  errors: string[];
  warnings: string[];
}
const reservedNames = new Set(["index.md", "log.md"]);
const colors = ["#93c5fd", "#c4b5fd", "#6ee7b7", "#fcd34d", "#fda4af", "#67e8f9"];
const isoInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function object(value: unknown): Metadata | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Metadata)
    : undefined;
}
export function parseMarkdown(path: string, content: string): Document {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (/^---\r?\n/.test(content) && !match) throw new Error(`${path}: unclosed frontmatter`);
  let metadata: Metadata = {};
  if (match) {
    const yaml = parseDocument(match[1] ?? "", { uniqueKeys: true });
    if (yaml.errors.length) throw new Error(`${path}: invalid YAML`);
    metadata = object(yaml.toJS({ maxAliasCount: 20 })) ?? {};
    if (!object(yaml.toJS({ maxAliasCount: 20 })))
      throw new Error(`${path}: frontmatter must be a mapping`);
  }
  const reserved = reservedNames.has(basename(path));
  if (reserved) {
    if (match && !(path === "index.md" && Object.keys(metadata).every((k) => k === "okf_version")))
      throw new Error(`${path}: OKF reserved file cannot have concept frontmatter`);
  } else if (typeof metadata.type !== "string" || !metadata.type.trim()) {
    throw new Error(`${path}: OKF concept requires a nonempty string type`);
  }
  return {
    path,
    id: path.replace(/\.md$/, ""),
    metadata,
    body: content.slice(match?.[0].length ?? 0),
    reserved,
  };
}

// OKF accepts a single verification mapping as shorthand for a list.
export function verifications(metadata: Metadata): Metadata[] {
  const input = metadata.verified;
  return (Array.isArray(input) ? input : input === undefined ? [] : [input])
    .map(object)
    .filter((item): item is Metadata => !!item);
}
export function trustTier(metadata: Metadata): string {
  const events = verifications(metadata);
  return events.some((v) => typeof v.by === "string" && v.by.startsWith("human:"))
    ? "human-reviewed"
    : events.length
      ? "machine-confirmed"
      : "unverified";
}

export function markdownLinks(body: string): string[] {
  const result: string[] = [];
  marked.walkTokens(marked.lexer(body), (token) => {
    if (token.type === "link") result.push(token.href);
  });
  return [...new Set(result)];
}
export function resolveLink(
  from: string,
  href: string,
): { path: string; fragment: string } | undefined {
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) return undefined;
  const [rawPath = "", rawFragment = ""] = href.split("#", 2);
  let decoded: string;
  let fragment: string;
  try {
    decoded = decodeURIComponent(rawPath);
    fragment = decodeURIComponent(rawFragment);
  } catch {
    throw new Error(`Invalid encoded link: ${href}`);
  }
  if (/[\\\0?]/.test(decoded)) throw new Error(`Unsafe bundle link: ${href}`);
  const base = "/bundle";
  const target = !decoded
    ? resolve(base, from)
    : decoded.startsWith("/")
      ? resolve(base, decoded.slice(1))
      : resolve(base, dirname(from), decoded);
  if (!target.startsWith(`${base}/`)) throw new Error(`Link escapes bundle: ${href}`);
  return { path: relative(base, target).split(sep).join("/"), fragment };
}

export function confinedPath(root: string, path: string): string {
  if (isAbsolute(path) || path.split(/[\\/]/).some((p) => p === ".." || p.startsWith(".")))
    throw new Error(`Unsafe source path: ${path}`);
  const base = realpathSync(root);
  const target = realpathSync(resolve(base, path));
  if (
    relative(base, target)
      .split(sep)
      .some((part) => part.startsWith("."))
  )
    throw new Error(`Unsafe resolved source path: ${path}`);
  if (!target.startsWith(`${base}${sep}`) || !lstatSync(target).isFile())
    throw new Error(`Source escapes repository or is not a file: ${path}`);
  return target;
}
export function digest(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function loadBundle(root: string, repoRoot: string, now = new Date()): Bundle {
  const documents: Document[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`Jev policy: symlink forbidden: ${entry.name}`);
        continue;
      }
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".md")) {
        const path = relative(root, full).split(sep).join("/");
        try {
          if (lstatSync(full).size > 256_000) throw new Error(`${path}: document too large`);
          documents.push(parseMarkdown(path, readFileSync(full, "utf8")));
        } catch (error) {
          errors.push(String(error));
        }
      }
    }
  }
  if (lstatSync(root).isSymbolicLink()) throw new Error("Bundle root must not be a symlink");
  visit(root);
  const paths = new Set(documents.map((d) => d.path));
  if (!paths.has("index.md")) errors.push("Jev policy: root index.md required");
  if (documents.find((d) => d.path === "index.md")?.metadata.okf_version !== "0.2")
    errors.push("Jev policy: root index must declare okf_version 0.2");
  for (const doc of documents) {
    const m = doc.metadata;
    if (!doc.reserved) {
      for (const field of ["title", "description"])
        if (typeof m[field] !== "string" || !(m[field] as string).trim())
          errors.push(`Jev policy: ${doc.path}: missing ${field}`);
      if (!["implemented", "planned", "mixed"].includes(String(m.x_jev_delivery)))
        errors.push(`Jev policy: ${doc.path}: x_jev_delivery required`);
      if (m.status !== undefined && !["draft", "stable", "deprecated"].includes(String(m.status)))
        errors.push(`OKF: ${doc.path}: invalid status`);
      if (
        m.tags !== undefined &&
        (!Array.isArray(m.tags) || m.tags.some((tag) => typeof tag !== "string"))
      )
        errors.push(`OKF: ${doc.path}: tags must be a string list`);
      if (
        m.verified !== undefined &&
        ((!Array.isArray(m.verified) && !object(m.verified)) ||
          (Array.isArray(m.verified) && m.verified.some((event) => !object(event))))
      )
        errors.push(`OKF: ${doc.path}: verified must contain event mappings`);
      const generated = object(m.generated);
      if (!generated) errors.push(`Jev policy: ${doc.path}: generated event required`);
      const events = [generated, ...verifications(m)].filter((v): v is Metadata => !!v);
      for (const event of events) {
        if (typeof event.by !== "string" || !event.by.trim())
          errors.push(`OKF: ${doc.path}: event actor required`);
        if (!validInstant(event.at))
          errors.push(`OKF: ${doc.path}: event needs ISO instant with timezone`);
      }
      if (m.stale_after !== undefined && !validInstant(m.stale_after))
        errors.push(`OKF: ${doc.path}: invalid stale_after`);
      if (typeof m.stale_after === "string" && now.getTime() >= Date.parse(m.stale_after))
        warnings.push(`${doc.path}: review deadline expired`);
      if (!Array.isArray(m.sources) || m.sources.length === 0)
        errors.push(`Jev policy: ${doc.path}: provenance sources required`);
      for (const source of Array.isArray(m.sources) ? m.sources : [])
        if (typeof object(source)?.resource !== "string")
          errors.push(`OKF: ${doc.path}: source resource required`);
      if (!Array.isArray(m.x_jev_sources) || !m.x_jev_sources.length)
        errors.push(`Jev policy: ${doc.path}: source snapshots required`);
      for (const snapshot of Array.isArray(m.x_jev_sources) ? m.x_jev_sources : []) {
        const source = object(snapshot);
        try {
          if (
            typeof source?.path !== "string" ||
            typeof source.sha256 !== "string" ||
            !/^[a-f\d]{64}$/.test(source.sha256)
          )
            throw new Error("Invalid snapshot");
          const content = readFileSync(confinedPath(repoRoot, source.path), "utf8");
          if (digest(content) !== source.sha256)
            warnings.push(`${doc.path}: source changed: ${source.path}`);
        } catch {
          errors.push(`Jev policy: ${doc.path}: invalid or unsafe source snapshot`);
        }
      }
    }
    const links = [...markdownLinks(doc.body)];
    if (typeof m.resource === "string") links.push(m.resource);
    for (const source of Array.isArray(m.sources) ? m.sources : []) {
      const resource = object(source)?.resource;
      if (typeof resource === "string") links.push(resource);
    }
    for (const href of links) {
      try {
        if (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^https?:\/\//i.test(href))
          throw new Error("Unsafe URL scheme");
        const target = resolveLink(doc.path, href);
        if (target && !paths.has(target.path))
          errors.push(`Jev policy: ${doc.path}: unresolved link ${href}`);
      } catch {
        errors.push(`Jev policy: ${doc.path}: unsafe link ${href}`);
      }
    }
  }
  return { documents, errors, warnings };
}
function validInstant(value: unknown): boolean {
  return typeof value === "string" && isoInstant.test(value) && Number.isFinite(Date.parse(value));
}

export function graph(bundle: Bundle, now = new Date()) {
  const concepts = bundle.documents.filter((d) => !d.reserved);
  const types = [...new Set(concepts.map((d) => String(d.metadata.type)))].sort();
  const ids = new Set(concepts.map((d) => d.id));
  const edges: { data: { id: string; source: string; target: string } }[] = [];
  const navigation: Record<
    string,
    Record<string, { id: string; fragment: string }>
  > = Object.create(null);
  for (const doc of bundle.documents) {
    const documentNavigation: Record<string, { id: string; fragment: string }> =
      Object.create(null);
    navigation[doc.id] = documentNavigation;
    for (const href of markdownLinks(doc.body)) {
      const target = resolveLink(doc.path, href);
      if (!target || !bundle.documents.some((d) => d.path === target.path)) continue;
      const id = target.path.replace(/\.md$/, "");
      documentNavigation[href] = { id, fragment: target.fragment };
      if (
        ids.has(doc.id) &&
        ids.has(id) &&
        id !== doc.id &&
        !edges.some((e) => e.data.source === doc.id && e.data.target === id)
      ) {
        let edgeId = `edge-${edges.length}`;
        while (ids.has(edgeId) || edges.some((edge) => edge.data.id === edgeId)) edgeId += "-";
        edges.push({ data: { id: edgeId, source: doc.id, target: id } });
      }
    }
  }
  return {
    nodes: concepts.map((d) => ({
      data: {
        ...d.metadata,
        id: d.id,
        label: String(d.metadata.title ?? d.id),
        graph_label: basename(d.id).replace(/-/g, " "),
        type: String(d.metadata.type),
        color: colors[types.indexOf(String(d.metadata.type)) % colors.length],
        size: 28,
        status: d.metadata.status ?? "stable",
        trust_tier: trustTier(d.metadata),
        verified: verifications(d.metadata),
        stale:
          typeof d.metadata.stale_after === "string" &&
          now.getTime() >= Date.parse(d.metadata.stale_after),
        drift: bundle.warnings.filter((w) => w.startsWith(`${d.path}: source changed`)),
      },
    })),
    edges,
    types,
    navigation,
    bodies: Object.fromEntries(bundle.documents.map((d) => [d.id, d.body])),
    pages: Object.fromEntries(
      bundle.documents
        .filter((d) => d.reserved)
        .map((d) => [d.id, { id: d.id, label: d.id, type: "Navigation" }]),
    ),
    warnings: bundle.warnings,
  };
}
export function scriptJSON(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function renderViewer(bundle: Bundle, repoRoot: string, now = new Date()): string {
  if (bundle.errors.length) throw new Error(bundle.errors.join("\n"));
  let html = readFileSync(resolve(repoRoot, "tools/okf-viewer/viz.html"), "utf8");
  const library = (path: string) =>
    readFileSync(resolve(repoRoot, path), "utf8").replace(/<\/script/gi, "<\\/script");
  const libraries = [
    "node_modules/cytoscape/dist/cytoscape.min.js",
    "node_modules/marked/lib/marked.umd.js",
    "node_modules/dompurify/dist/purify.min.js",
  ]
    .map((p) => `<script>${library(p)}</script>`)
    .join("\n");
  html = html.replace("<!--__LOCAL_LIBRARIES__-->", () => libraries);
  html = html.replace("/*__VIZ_CSS__*/", () => library("tools/okf-viewer/viz.css"));
  html = html.replace("__BUNDLE_NAME__", () => scriptJSON("Jev knowledge"));
  html = html.replace("__BUNDLE_DATA__", () => scriptJSON(JSON.stringify(graph(bundle, now))));
  return html.replace("/*__VIZ_JS__*/", () => library("tools/okf-viewer/viz.js"));
}
