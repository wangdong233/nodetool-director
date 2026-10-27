#!/usr/bin/env node
/**
 * plan-tsc-projects — Phase A of the tsc project-references extension
 * (fork-only, zero shared files). Builds the src import graph, condenses
 * it into strongly-connected components (iterative Tarjan — the same
 * implementation validated against this tree on 2026-10-21), layers the
 * condensation, and packs SCCs into projects of at most PROJECT_CAP files
 * in topological order. An SCC is only ever packed into the current-or-a-
 * later project than every SCC it depends on, so the project reference
 * graph is acyclic by construction — no source file moves.
 *
 * Spec gate: exits 3 when the largest SCC alone exceeds SCC_CAP (the
 * irreducible core is too big for the per-project memory target).
 *
 * Usage:
 *   node scripts/plan-tsc-projects.mjs            # report only
 *   node scripts/plan-tsc-projects.mjs --write    # also emit tsconfig.projects/
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const WEB = resolve(HERE, "..");
const SRC = join(WEB, "src");
const SCC_CAP = 700;
const PROJECT_CAP = 700;
const OUT_BASE = "node_modules/.cache/tsc-projects";

// ---- collect non-test, non-story source files ----
// .ts/.tsx are graph nodes; relatively-imported .json files (resolveJsonModule
// — the i18n locale catalogs) are nodes too, or TS6307 "not listed within the
// file list" fires for every catalog import. They have no outgoing edges, so
// dependency-first packing lands them below every importer.
const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "__tests__" || e.name === "__mocks__") continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if ((/\.(tsx?)$/.test(e.name) && !/\.test\.|\.spec\.|\.stories\.|\.d\.ts$/.test(e.name)) || /\.json$/.test(e.name)) files.push(p);
  }
})(SRC);
files.sort();
const n = files.length;
const idx = new Map(files.map((f, i) => [f, i]));
const relOf = (f) => relative(SRC, f);

// ---- import graph (relative specifiers, workspace files only) ----
// Three import forms: `… from "./x"` (incl. `export … from`), dynamic
// `import("./x")`, and SIDE-EFFECT `import "./x"` — the side-effect form
// has no `from` clause and cost us the first partition (TS6307: imported
// files floating into unreferenced projects).
const IMPORT_RE = /(?:import|export)[^'";]*?from\s*["'](\.[^"']+)["']|import\s*\(\s*["'](\.[^"']+)["']\s*\)|import\s*["'](\.[^"']+)["']/g;
const fileSet = new Set(files);
const adj = Array.from({ length: n }, () => []);
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec) continue;
    let r = null;
    for (const cand of [spec, `${spec}.ts`, `${spec}.tsx`, `${spec}/index.ts`, `${spec}/index.tsx`]) {
      const rr = resolve(dirname(f), cand);
      if (fileSet.has(rr)) { r = rr; break; }
    }
    if (r && r !== f) adj[idx.get(f)].push(idx.get(r));
  }
}

// ---- Tarjan SCC (iterative; validated against this tree) ----
const ids = new Array(n).fill(-1), low = new Array(n), on = new Array(n), stack = [];
let idc = 0;
const groups = [];
for (let root = 0; root < n; root++) {
  if (ids[root] !== -1) continue;
  const work = [[root, 0]];
  while (work.length) {
    const frame = work[work.length - 1];
    const v = frame[0];
    if (frame[1] === 0) { ids[v] = low[v] = idc++; stack.push(v); on[v] = true; }
    let recursed = false;
    for (let j = frame[1]; j < adj[v].length; j++) {
      const w = adj[v][j];
      if (ids[w] === -1) { frame[1] = j + 1; work.push([w, 0]); recursed = true; break; }
      if (on[w]) low[v] = Math.min(low[v], ids[w]);
    }
    if (recursed) continue;
    work.pop();
    if (low[v] === ids[v]) {
      const g = [];
      let w;
      do { w = stack.pop(); on[w] = false; g.push(w); } while (w !== v);
      groups.push(g);
    }
    if (work.length) {
      const p = work[work.length - 1][0];
      low[p] = Math.min(low[p], low[v]);
    }
  }
}
groups.sort((a, b) => b.length - a.length);
const biggest = groups[0]?.length ?? 0;

// ---- condensation ----
const comp = new Array(n);
groups.forEach((g, gi) => g.forEach((f) => (comp[f] = gi)));
const N = groups.length;
const compAdj = Array.from({ length: N }, () => new Set());
for (let v = 0; v < n; v++)
  for (const w of adj[v]) if (comp[v] !== comp[w]) compAdj[comp[v]].add(comp[w]);

// ---- topological order (Kahn) + longest-path depth ----
const indeg = new Array(N).fill(0);
for (let c = 0; c < N; c++) for (const d of compAdj[c]) indeg[d]++;
const topo = [];
const q = [];
for (let c = 0; c < N; c++) if (indeg[c] === 0) q.push(c);
while (q.length) {
  const c = q.shift();
  topo.push(c);
  for (const d of compAdj[c]) if (--indeg[d] === 0) q.push(d);
}
const depth = new Array(N).fill(0);
for (const c of topo) for (const d of compAdj[c]) depth[d] = Math.max(depth[d], depth[c] + 1);

// ---- pack SCCs into projects, dependency-first order, size-capped ----
// Kahn's topo over compAdj (edges c→d where c imports d) emits IMPORTERS
// first; packing must walk it REVERSED so every dependency is placed before
// anything that imports it — otherwise placement[d] reads -1 and the
// reference sets are garbage (the p-1.json bug). A project may absorb an
// SCC whose every dependency already sits in this or an earlier project;
// otherwise the SCC starts a new project. Leaf deps land in p00, the top
// consumers in the last project.
const placement = new Array(N).fill(-1);
const projects = []; // { files: [idx], refs: Set<projectIdx> }
for (const c of [...topo].reverse()) {
  let target = -1;
  for (let p = projects.length - 1; p >= 0; p--) {
    const deps = [...compAdj[c]].map((d) => placement[d]);
    if (deps.every((d) => d <= p) && projects[p].files.length + groups[c].length <= PROJECT_CAP) { target = p; break; }
  }
  if (target === -1) { projects.push({ files: [], refs: new Set() }); target = projects.length - 1; }
  projects[target].files.push(...groups[c]);
  placement[c] = target;
  for (const d of compAdj[c]) {
    const pd = placement[d];
    if (pd !== target) projects[target].refs.add(pd);
  }
}

// ---- report / gate ----
const sizes = projects.map((p) => p.files.length);
const report = {
  files: n,
  edges: adj.reduce((s, a) => s + a.length, 0),
  sccs: N,
  biggestScc: biggest,
  projects: projects.length,
  projectSizes: sizes,
  largestProject: Math.max(...sizes),
  gate: biggest > SCC_CAP ? `ABORT: largest SCC ${biggest} > ${SCC_CAP} — the irreducible core is too big; do not build this extension` : "OK"
};
console.error(JSON.stringify(report, null, 2));

// ---- emit tsconfig.projects/ ----
if (process.argv.includes("--write") && report.gate === "OK") {
  // Ambient declaration files (module augmentations like material-ui.d.ts,
  // vite-env, window shims) must be in EVERY project's program — they are
  // global, not graph nodes, and dropping them untyped theme.vars across
  // every boundary (1762 TS18048s in the first attempt).
  const ambient = [];
  (function walkAmbient(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "__tests__" || e.name === "__mocks__") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walkAmbient(p);
      else if (/\.d\.ts$/.test(e.name)) ambient.push(`../src/${relative(SRC, p)}`);
    }
  })(SRC);
  // Source files carrying module augmentations (`declare module`, e.g. the
  // custom MUI palette tokens) apply globally only in programs that contain
  // them. Downstream projects see just the emitted declarations of files
  // they import, so an augmentation file nobody imports directly vanishes
  // and every custom token use fails TS2339. Include augmentation carriers
  // in every project — the cost is a duplicated input, the alternative is
  // editing shared source files, which this extension promised not to do.
  const augmenting = [];
  for (const f of files) {
    if (!/\.tsx?$/.test(f)) continue;
    if (/^\s*(?:export\s+)?declare module\s+["']/m.test(readFileSync(f, "utf8"))) {
      augmenting.push(`../src/${relative(SRC, f)}`);
    }
  }
  const dir = join(WEB, "tsconfig.projects");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  projects.forEach((p, i) => {
    const name = `p${String(i).padStart(2, "0")}`;
    const members = p.files.map((f) => relOf(files[f])).sort();
    const cfg = {
      extends: "../tsconfig.json",
      compilerOptions: {
        composite: true,
        emitDeclarationOnly: true,
        declaration: true,
        noEmit: false,
        outDir: `../${OUT_BASE}/${name}`,
        tsBuildInfoFile: `../${OUT_BASE}/${name}/tsconfig.tsbuildinfo`,
        rootDir: "../src"
      },
      include: [...new Set([...members.map((m) => `../src/${m}`), ...ambient, ...augmenting])],
      references: [...p.refs].sort((a, b) => a - b).map((r) => ({ path: `./p${String(r).padStart(2, "0")}.json` }))
    };
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(cfg, null, 2) + "\n");
  });
  const solution = {
    files: [],
    references: projects.map((_, i) => ({ path: `./tsconfig.projects/p${String(i).padStart(2, "0")}.json` }))
  };
  writeFileSync(join(WEB, "tsconfig.fork.json"), JSON.stringify(solution, null, 2) + "\n");
  console.error(`wrote ${projects.length} project configs + tsconfig.fork.json`);
}
process.exit(report.gate === "OK" ? 0 : 3);
