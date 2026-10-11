import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  confinedPath,
  digest,
  graph,
  loadBundle,
  markdownLinks,
  parseMarkdown,
  renderViewer,
  resolveLink,
  scriptJSON,
  trustTier,
} from "../../scripts/okf.js";
import { viewerHandler } from "../../scripts/okf-server.js";

const roots: string[] = [];
const now = new Date("2026-10-10T12:00:00Z");
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "jev-okf-test-"));
  roots.push(root);
  mkdirSync(resolve(root, "knowledge"));
  writeFileSync(resolve(root, "source.ts"), "export const ready = true;\n");
  writeFileSync(
    resolve(root, "knowledge/index.md"),
    '---\nokf_version: "0.2"\n---\n# Index\n[A](a.md)\n',
  );
  writeFileSync(
    resolve(root, "knowledge/a.md"),
    `---
type: Rule
title: Safe replay
description: Preserve state
status: draft
generated: {by: "process:test", at: "2026-10-10T10:00:00Z"}
stale_after: "2026-11-10T00:00:00Z"
x_jev_delivery: implemented
sources: [{resource: "https://example.com/source"}]
x_jev_sources: [{path: "source.ts", sha256: "${digest("export const ready = true;\n")}"}]
x_future: {nested: [a, b]}
---
# Safe replay
[Self fragment](#safe-replay)
[Home](/index.md)
`,
  );
  return root;
}
describe("OKF format and Jev publication policy", () => {
  it("accepts minimal concepts and unknown metadata without claiming Jev publication readiness", () => {
    const doc = parseMarkdown("custom.md", "---\ntype: Custom Type\nx_future: {a: 1}\n---\nBody");
    expect(doc.metadata.x_future).toEqual({ a: 1 });
    expect(trustTier(doc.metadata)).toBe("unverified");
    expect(doc.body).toBe("Body");
  });
  it("enforces required type and reserved-file semantics at every level", () => {
    expect(() => parseMarkdown("a.md", "# No type")).toThrow("type");
    expect(() => parseMarkdown("a.md", "---\ntype: 12\n---\nBody")).toThrow("type");
    expect(() => parseMarkdown("group/index.md", "---\nokf_version: '0.2'\n---\nBody")).toThrow(
      "reserved",
    );
    expect(() => parseMarkdown("log.md", "---\ntype: Rule\n---\nBody")).toThrow("reserved");
    expect(parseMarkdown("group/log.md", "# Log").reserved).toBe(true);
    expect(parseMarkdown("index.md", "---\nokf_version: '0.2'\n---\nIndex").reserved).toBe(true);
  });
  it("rejects malformed known metadata rather than crashing the viewer", () => {
    const root = fixture();
    const path = resolve(root, "knowledge/a.md");
    const content = readFileSync(path, "utf8").replace(
      "type: Rule",
      "type: Rule\ntags: nope\nverified: [nope]",
    );
    writeFileSync(path, content);
    expect(loadBundle(resolve(root, "knowledge"), root, now).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("tags"),
        expect.stringContaining("verified"),
      ]),
    );
  });
  it("rejects duplicate YAML keys and malformed frontmatter", () => {
    expect(() => parseMarkdown("a.md", "---\ntype: A\ntype: B\n---\nBody")).toThrow("YAML");
    expect(() => parseMarkdown("a.md", "---\ntype: A\nBody")).toThrow("unclosed");
  });
  it("normalizes bare verification mappings and exposes advisory trust tiers", () => {
    expect(trustTier({ verified: { by: "process:check", at: now.toISOString() } })).toBe(
      "machine-confirmed",
    );
    expect(trustTier({ verified: [{ by: "human:Artem", at: now.toISOString() }] })).toBe(
      "human-reviewed",
    );
  });
  it("validates a bundle without modifying its sources or timestamps", () => {
    const root = fixture();
    const before = readFileSync(resolve(root, "knowledge/a.md"), "utf8");
    const bundle = loadBundle(resolve(root, "knowledge"), root, now);
    expect(bundle.errors).toEqual([]);
    expect(bundle.warnings).toEqual([]);
    expect(readFileSync(resolve(root, "knowledge/a.md"), "utf8")).toBe(before);
    expect(bundle.documents.find((d) => d.id === "a")?.metadata.x_future).toEqual({
      nested: ["a", "b"],
    });
  });
  it("warns about source drift and review deadlines without making the bundle invalid", () => {
    const root = fixture();
    writeFileSync(resolve(root, "source.ts"), "changed");
    const bundle = loadBundle(resolve(root, "knowledge"), root, new Date("2026-12-01T00:00:00Z"));
    expect(bundle.errors).toEqual([]);
    expect(bundle.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("source changed"),
        expect.stringContaining("deadline expired"),
      ]),
    );
  });
  it("rejects timestamps without explicit timezones and broken local publishing links", () => {
    const root = fixture();
    const path = resolve(root, "knowledge/a.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace("2026-10-10T10:00:00Z", "2026-10-10T10:00:00") +
        "\n[Missing](missing.md)",
    );
    const bundle = loadBundle(resolve(root, "knowledge"), root, now);
    expect(bundle.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("timezone"),
        expect.stringContaining("unresolved"),
      ]),
    );
  });
  it("refuses symlink documents and source traversal or secret paths", () => {
    const root = fixture();
    writeFileSync(resolve(root, ".env"), "dummy fixture");
    symlinkSync(resolve(root, ".env"), resolve(root, "knowledge/linked.md"));
    expect(loadBundle(resolve(root, "knowledge"), root, now).errors).toEqual(
      expect.arrayContaining([expect.stringContaining("symlink")]),
    );
    expect(() => confinedPath(root, ".env")).toThrow("Unsafe");
    expect(() => confinedPath(root, "../elsewhere")).toThrow("Unsafe");
    symlinkSync(resolve(root, ".env"), resolve(root, "hidden-target"));
    // A non-hidden link must not bypass hidden-file checks either.
    expect(() => confinedPath(root, "hidden-target")).toThrow();
  });
});
describe("OKF links and graph", () => {
  it("extracts real Markdown links, including reference links, without code/image false positives", () => {
    expect(
      markdownLinks(
        "[A](/a.md) ![image](/image.png)\n`[code](/fake.md)`\n```md\n[Fake](/fake.md)\n```\n[Ref][r]\n\n[r]: ../other.md#heading",
      ),
    ).toEqual(["/a.md", "../other.md#heading"]);
  });
  it("resolves root, relative, encoded and fragment links and refuses escapes", () => {
    expect(resolveLink("group/a.md", "/other.md#heading")).toEqual({
      path: "other.md",
      fragment: "heading",
    });
    expect(resolveLink("group/a.md", "../other.md#heading")).toEqual({
      path: "other.md",
      fragment: "heading",
    });
    expect(resolveLink("group/a.md", "#here")).toEqual({ path: "group/a.md", fragment: "here" });
    expect(resolveLink("group/a.md", "../space%20name.md")).toEqual({
      path: "space name.md",
      fragment: "",
    });
    expect(resolveLink("a.md", "https://example.com")).toBeUndefined();
    expect(() => resolveLink("a.md", "../outside.md")).toThrow("escapes");
    expect(() => resolveLink("a.md", "%2e%2e/outside.md")).toThrow("escapes");
  });
  it("shares graph and navigation targets while keeping reserved pages out of nodes", () => {
    const root = fixture();
    const bundle = loadBundle(resolve(root, "knowledge"), root, now);
    bundle.documents.push(
      parseMarkdown("group/b.md", "---\ntype: Rule\n---\n[A](/a.md#safe-replay)\n[Same](../a.md)"),
    );
    const data = graph(bundle, now);
    expect(data.nodes.map((n) => n.data.id)).toEqual(["a", "group/b"]);
    expect(data.edges).toHaveLength(1);
    expect(data.navigation["group/b"]).toEqual({
      "/a.md#safe-replay": { id: "a", fragment: "safe-replay" },
      "../a.md": { id: "a", fragment: "" },
    });
    expect(data.navigation.index?.["a.md"]?.id).toBe("a");
    expect(data.navigation.a?.["/index.md"]?.id).toBe("index");
    expect(data.pages.index).toBeDefined();
    expect(graph(bundle, now)).toEqual(data);
  });
  it("keeps arbitrary concept identities distinct from generated edge IDs", () => {
    const root = fixture();
    const bundle = loadBundle(resolve(root, "knowledge"), root, now);
    bundle.documents.push(parseMarkdown("edge-0.md", "---\ntype: Rule\n---\n[A](/a.md)"));
    bundle.documents.push(parseMarkdown("__proto__.md", "---\ntype: Rule\n---\n[A](/a.md)"));
    const data = graph(bundle, now);
    expect(data.edges[0]?.data.id).not.toBe("edge-0");
    expect(Object.hasOwn(data.navigation, "__proto__")).toBe(true);
    const specialId = "__proto__";
    expect(data.navigation[specialId]?.["/a.md"]?.id).toBe("a");
  });
  it("embeds hostile content as data and builds a self-contained deterministic viewer", () => {
    expect(scriptJSON({ text: '</script><script>alert("x")</script>' })).not.toContain("<");
    const root = fixture();
    const bundle = loadBundle(resolve(root, "knowledge"), root, now);
    const html = renderViewer(bundle, process.cwd(), now);
    expect(html).toBe(renderViewer(bundle, process.cwd(), now));
    expect(html).not.toMatch(/<script\s+src=/i);
    expect(html).toContain("DOMPurify.sanitize");
    expect(html).toContain("frame");
    expect(html).not.toContain("__BUNDLE_DATA__");
  });
});
describe("viewer HTTP boundary", () => {
  function request(url: string, method = "GET", host = "127.0.0.1:8770") {
    let status = 0;
    let body: unknown;
    const response = {
      setHeader() {},
      writeHead(code: number) {
        status = code;
        return this;
      },
      end(value?: unknown) {
        body = value;
      },
    };
    viewerHandler("<html>curated</html>")(
      { url, method, headers: { host } } as IncomingMessage,
      response as unknown as ServerResponse,
    );
    return { status, body };
  }
  it("only serves the built page and supports HEAD", () => {
    expect(request("/viz.html")).toEqual({ status: 200, body: "<html>curated</html>" });
    expect(request("/", "HEAD")).toEqual({ status: 200, body: undefined });
    for (const path of ["/.env", "/../.env", "/src/config.ts", "/viz.html?file=.env"])
      expect(request(path).status).toBe(404);
    expect(request("/", "POST").status).toBe(404);
  });
  it("rejects non-loopback Host headers", () => {
    expect(request("/", "GET", "attacker.example").status).toBe(403);
  });
});
