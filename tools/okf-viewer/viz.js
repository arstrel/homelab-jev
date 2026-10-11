// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// Jev modifications: local libraries, safe rendering, navigation, and delivery signals.
(function () {
  const bundle = window.BUNDLE;
  const bundleName = window.BUNDLE_NAME;
  document.title = `${bundleName} — OKF Viewer`;
  document.getElementById("bundle-name").textContent = bundleName;
  document.getElementById("bundle-summary").textContent = `${bundle.nodes.length} concepts · ${bundle.edges.length} links`;

  // Populate type filter
  const typeSelect = document.getElementById("filter-type");
  for (const t of bundle.types) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  }

  // Build reverse-link index for backlinks
  const backlinks = Object.create(null);
  for (const edge of bundle.edges) {
    const { source, target } = edge.data;
    (backlinks[target] ||= []).push(source);
  }

  // Look up node label/type by id
  const nodeIndex = Object.create(null);
  for (const n of bundle.nodes) nodeIndex[n.data.id] = n.data;
  Object.assign(nodeIndex, bundle.pages);
  document.getElementById("index").addEventListener("click", () => showDetail("index"));

  const cy = cytoscape({
    container: document.getElementById("graph"),
    elements: [...bundle.nodes, ...bundle.edges],
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          "label": "data(graph_label)",
          "color": "#0f172a",
          "font-size": 14,
          "text-valign": "bottom",
          "text-margin-y": 4,
          "text-wrap": "wrap",
          "text-max-width": 120,
          "width": "data(size)",
          "height": "data(size)",
          "border-width": 1,
          "border-color": "#0f172a",
        },
      },
      {
        selector: "node[?stale]",
        style: {
          "border-width": 2,
          "border-color": "#b91c1c",
          "border-style": "dashed",
        },
      },
      {
        selector: 'node[status = "deprecated"]',
        style: {
          "opacity": 0.55,
        },
      },
      {
        selector: "node:selected",
        style: {
          "border-width": 3,
          "border-color": "#f59e0b",
        },
      },
      {
        selector: "edge",
        style: {
          "width": 1.5,
          "line-color": "#cbd5e1",
          "target-arrow-color": "#cbd5e1",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "arrow-scale": 0.9,
        },
      },
      {
        selector: "edge:selected",
        style: {
          "line-color": "#f59e0b",
          "target-arrow-color": "#f59e0b",
          "width": 2.5,
        },
      },
      {
        selector: ".dim",
        style: { "opacity": 0.15 },
      },
    ],
    layout: { name: "cose", animate: false, padding: 45, nodeRepulsion: 40000, idealEdgeLength: 100, nodeDimensionsIncludeLabels: true },
    wheelSensitivity: 0.2,
  });

  cy.on("tap", "node", (evt) => showDetail(evt.target.id()));
  cy.on("tap", (evt) => {
    if (evt.target === cy) clearSelection();
  });

  document.getElementById("layout").addEventListener("change", (e) => {
    cy.layout({ name: e.target.value, animate: false, padding: 30 }).run();
  });

  document.getElementById("reset").addEventListener("click", () => {
    cy.fit(null, 30);
    clearSelection();
  });

  function applyFilters() {
    const q = document.getElementById("search").value.trim().toLowerCase();
    const t = document.getElementById("filter-type").value;
    cy.nodes().forEach((n) => {
      const d = n.data();
      const hay = `${d.label} ${d.id} ${(d.tags || []).join(" ")}`.toLowerCase();
      n.toggleClass("dim", Boolean((q && !hay.includes(q)) || (t && d.type !== t)));
    });
    cy.edges().forEach((edge) => edge.toggleClass("dim", edge.source().hasClass("dim") || edge.target().hasClass("dim")));
  }
  document.getElementById("search").addEventListener("input", applyFilters);
  document.getElementById("filter-type").addEventListener("change", applyFilters);

  function clearSelection() {
    cy.elements().unselect();
    document.getElementById("detail-empty").hidden = false;
    document.getElementById("detail-content").hidden = true;
  }

  function showDetail(conceptId, fragment = "") {
    const data = nodeIndex[conceptId];
    if (!data) return;
    cy.elements().unselect();
    const node = cy.getElementById(conceptId);
    if (node.length) node.select();

    document.getElementById("detail-empty").hidden = true;
    const content = document.getElementById("detail-content");
    content.hidden = false;
    document.querySelector(".frontmatter").hidden = data.type === "Navigation";

    const chip = document.getElementById("detail-type");
    chip.textContent = data.type;
    chip.style.background = data.color;

    document.getElementById("detail-title").textContent = data.label;
    document.getElementById("detail-id").textContent = conceptId;
    document.getElementById("detail-description").textContent = data.description || "—";

    const resourceEl = document.getElementById("detail-resource");
    resourceEl.innerHTML = "";
    if (typeof data.resource === "string" && /^https?:\/\//i.test(data.resource)) {
      const a = document.createElement("a");
      a.href = data.resource;
      a.textContent = data.resource;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "external";
      resourceEl.appendChild(a);
    } else {
      resourceEl.textContent = "—";
    }

    const tagsEl = document.getElementById("detail-tags");
    tagsEl.innerHTML = "";
    if (data.tags && data.tags.length) {
      for (const t of data.tags) {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tagsEl.appendChild(span);
      }
    } else {
      tagsEl.textContent = "—";
    }

    // v0.2 signal badges: status, trust tier, staleness.
    const badgesEl = document.getElementById("detail-badges");
    badgesEl.innerHTML = "";
    const status = data.status || "navigation";
    if (data.x_jev_delivery) badgesEl.appendChild(makeBadge(data.x_jev_delivery, "delivery"));
    if (data.drift && data.drift.length) badgesEl.appendChild(makeBadge("source changed — review needed", "stale"));
    badgesEl.appendChild(makeBadge(status, "status-" + status));
    const tier = data.trust_tier || "unverified";
    badgesEl.appendChild(makeBadge(tier.replace(/-/g, " "), "trust-" + tier));
    if (data.stale) {
      const label = data.stale_after ? `stale (since ${data.stale_after})` : "stale";
      badgesEl.appendChild(makeBadge(label, "stale"));
    } else if (data.stale_after) {
      badgesEl.appendChild(makeBadge(`stale after ${data.stale_after}`, "fresh"));
    }

    document.getElementById("detail-generated").textContent = formatActorEvent(data.generated);

    const verifiedEl = document.getElementById("detail-verified");
    const verified = data.verified || [];
    if (verified.length) {
      verifiedEl.textContent = verified.map(formatActorEvent).join("; ");
    } else {
      verifiedEl.textContent = "—";
    }

    const sourcesEl = document.getElementById("detail-sources");
    sourcesEl.innerHTML = "";
    const sources = data.sources || [];
    if (sources.length) {
      const ul = document.createElement("ul");
      ul.className = "sources-list";
      for (const s of sources) {
        const li = document.createElement("li");
        const label = s.title || s.resource || s.id || "source";
        if (s.resource && /^https?:\/\//.test(s.resource)) {
          const a = document.createElement("a");
          a.href = s.resource;
          a.textContent = label;
          a.target = "_blank";
          a.rel = "noopener";
          a.className = "external";
          li.appendChild(a);
        } else {
          li.textContent = s.resource ? `${label} (${s.resource})` : label;
        }
        ul.appendChild(li);
      }
      sourcesEl.appendChild(ul);
    } else {
      sourcesEl.textContent = "—";
    }

    if (data.x_jev_sources?.length) {
      const snapshots = document.createElement("p");
      snapshots.className = "muted";
      snapshots.textContent = "Current repository snapshots: " + data.x_jev_sources.map((s) => s.path).join(", ");
      sourcesEl.appendChild(snapshots);
    }

    const body = bundle.bodies[conceptId] || "";
    const html = marked.parse(body, { breaks: false, gfm: true });
    const bodyEl = document.getElementById("detail-body");
    bodyEl.innerHTML = DOMPurify.sanitize(html, { FORBID_TAGS: ["img", "style", "form", "iframe"], FORBID_ATTR: ["style", "id", "name"] });
    const headings = [...bodyEl.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const counts = Object.create(null);
    for (const heading of headings) {
      const base = heading.textContent.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");
      const count = counts[base] || 0;
      counts[base] = count + 1;
      heading.id = count ? `${base}-${count}` : base;
    }
    rewriteInternalLinks(bodyEl, conceptId);
    if (fragment) headings.find((h) => h.id === fragment)?.scrollIntoView();
    else document.getElementById("detail").scrollTop = 0;

    const bl = backlinks[conceptId] || [];
    const blSection = document.getElementById("detail-backlinks");
    const blList = document.getElementById("backlinks-list");
    blList.innerHTML = "";
    if (bl.length) {
      blSection.hidden = false;
      for (const src of bl) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = nodeIndex[src]?.label || src;
        a.dataset.target = src;
        a.addEventListener("click", () => showDetail(src));
        li.appendChild(a);
        const muted = document.createElement("span");
        muted.className = "muted";
        muted.textContent = ` (${src})`;
        li.appendChild(muted);
        blList.appendChild(li);
      }
    } else {
      blSection.hidden = true;
    }


  }

  function makeBadge(text, cls) {
    const span = document.createElement("span");
    span.className = "badge " + cls;
    span.textContent = text;
    return span;
  }

  function formatActorEvent(event) {
    if (!event || !event.by) return "—";
    return event.at ? `${event.by} · ${event.at}` : String(event.by);
  }

  function rewriteInternalLinks(root, conceptId) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      const target = bundle.navigation[conceptId]?.[href];
      if (target && nodeIndex[target.id]) {
        a.className = "internal";
        a.setAttribute("href", `#${target.id}`);
        a.addEventListener("click", (e) => { e.preventDefault(); showDetail(target.id, target.fragment); });
      } else if (/^https?:\/\//i.test(href)) {
        a.className = "external";
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      } else {
        a.removeAttribute("href");
        a.title = "Unresolved link";
      }
    });
  }

  // Auto-show the first node (a dataset if available, else first concept)
  const initial =
    bundle.nodes.find((n) => n.data.type === "BigQuery Dataset") ||
    bundle.nodes[0];
  if (initial) showDetail("index");
})();
