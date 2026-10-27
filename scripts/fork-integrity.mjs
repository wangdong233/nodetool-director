#!/usr/bin/env node
/**
 * fork-integrity — protects fork change-points from upstream merges.
 *
 * Three layers (docs/fork-branches.md §4):
 *   1. markers   — `fork:begin:<id>`/`fork:end:<id>` blocks and `fork:<id>`
 *                  single-line tags wrapped around each protected change.
 *   2. index     — docs/fork-index.yaml records per-feature files, marker
 *                  counts (the baseline) and anchor symbols.
 *   3. scanner   — this file.
 *
 * Modes:
 *   node scripts/fork-integrity.mjs check
 *       Count markers per feature across the tree, compare against the
 *       index baseline, verify every anchor symbol still exists. Exit 1 on
 *       any drop, unbalanced block, or unregistered marker.
 *   node scripts/fork-integrity.mjs survival <base> <head>
 *       Merge-time audit: for every file fork commits touched since <base>,
 *       measure how many of OUR added lines still exist at <head>. Automates
 *       the manual "diff <(git show main:path) path" roll-back check and
 *       also guards unmarked legacy fixes. Exit 1 when a file falls below
 *       the survival floor.
 *   node scripts/fork-integrity.mjs update-baseline
 *       Rewrite the marker-count baseline from the working tree after an
 *       intentional change. Review the diff before committing.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const INDEX_PATH = join(ROOT, "docs", "fork-index.yaml");
const [mode, a, b, c] = process.argv.slice(2);

if (!mode || !["check", "survival", "update-baseline"].includes(mode)) {
  console.error("usage: fork-integrity.mjs check | survival <upstream-base> <fork-tip> <result> | update-baseline");
  process.exit(2);
}

// ---------- minimal YAML reader (flat two-level, this file's schema only) ----
function parseIndex(text) {
  const features = {};
  let feature = null;
  let section = null;
  for (const raw of text.split("\n")) {
    if (/^\s*#/.test(raw) || !raw.trim()) continue;
    const top = /^  ([a-z0-9\/_-]+):\s*$/.exec(raw);
    if (top) { feature = top[1]; features[feature] = { files: {}, anchors: {} }; section = null; continue; }
    if (!feature) continue;
    const kv = /^    ([a-z-]+):\s*(.+)$/.exec(raw);
    if (kv) {
      const key = kv[1];
      let val = kv[2].trim().replace(/^["']|["']$/g, "");
      if (key === "files" || key === "anchors") { section = key; continue; }
      features[feature][key] = val === "true" ? true : val === "false" ? false : val;
      continue;
    }
    const item = /^      ([^:]+):\s*(.+)$/.exec(raw);
    if (item && section) {
      features[feature][section][item[1].trim().replace(/^["']|["']$/g, "")] = item[2].trim();
    }
  }
  return features;
}

function loadIndex() {
  return parseIndex(readFileSync(INDEX_PATH, "utf8"));
}

// ---------- marker scan ------------------------------------------------------
const BEGIN_RE = /fork:begin:([a-z0-9/_-]+)/g;
const END_RE = /fork:end:([a-z0-9/_-]+)/g;
const LINE_RE = /(?:^|[^:])fork:([a-z0-9/_-]+)(?::|\s|$)/g;
const SKIP = new Set(["node_modules", "dist", ".git", ".tsc-batch", "coverage"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|json|yaml|yml|md|sh)$/.test(e.name) || e.name.endsWith(".mjs")) out.push(p);
  }
  return out;
}

function scanMarkers() {
  const counts = {}; // feature -> { begin, end, line }
  const unbalanced = [];
  for (const file of walk(ROOT)) {
    const rel = file.slice(ROOT.length + 1);
    if (rel.startsWith("docs/") || rel.startsWith("scripts/fork-integrity")) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(BEGIN_RE)) {
      const f = m[1];
      counts[f] ??= { begin: 0, end: 0, line: 0, files: new Set() };
      counts[f].begin++; counts[f].files.add(rel);
    }
    for (const m of src.matchAll(END_RE)) {
      const f = m[1];
      counts[f] ??= { begin: 0, end: 0, line: 0, files: new Set() };
      counts[f].end++; counts[f].files.add(rel);
    }
    for (const m of src.matchAll(LINE_RE)) {
      // `fork:begin:<id>` / `fork:end:<id>` also satisfy LINE_RE with the
      // prefix captured, and package.json carries the npm script names
      // (fork:integrity…) — skip the reserved vocabulary; feature ids never
      // use these words.
      if (["begin", "end", "integrity"].includes(m[1])) continue;
      const f = m[1];
      counts[f] ??= { begin: 0, end: 0, line: 0, files: new Set() };
      counts[f].line++; counts[f].files.add(rel);
    }
  }
  for (const [f, c] of Object.entries(counts)) {
    if (c.begin !== c.end) unbalanced.push(`${f}: ${c.begin} begin vs ${c.end} end`);
  }
  return { counts, unbalanced };
}

function runCheck() {
  const index = loadIndex();
  const { counts, unbalanced } = scanMarkers();
  const findings = [];
  for (const u of unbalanced) findings.push(`UNBALANCED ${u}`);

  for (const [id, feat] of Object.entries(index)) {
    if (feat.status === "pending-merge") continue; // pack not on master yet
    const base = feat.markers ?? "0";
    const have = counts[id] ? counts[id].begin + counts[id].line : 0;
    const want = parseInt(base, 10);
    if (have < want) findings.push(`MARKER-DROP ${id}: baseline ${want}, found ${have} — a protected change-point was lost in a merge`);
    for (const [relFile, symbol] of Object.entries(feat.anchors ?? {})) {
      let content;
      try { content = readFileSync(join(ROOT, relFile), "utf8"); }
      catch { findings.push(`ANCHOR-GONE ${id}: file ${relFile} disappeared`); continue; }
      if (!content.includes(symbol)) findings.push(`ANCHOR-GONE ${id}: '${symbol}' no longer in ${relFile}`);
    }
  }
  for (const id of Object.keys(counts)) {
    if (!index[id]) findings.push(`UNREGISTERED marker feature '${id}' — add it to docs/fork-index.yaml (or remove the marker)`);
  }
  if (findings.length) {
    console.error(`fork-integrity: ${findings.length} finding(s)`);
    findings.forEach((f) => console.error("  " + f));
    process.exit(1);
  }
  const total = Object.values(counts).reduce((n, c) => n + c.begin + c.line, 0);
  console.log(`fork-integrity OK: ${Object.keys(index).length} features, ${total} markers, all anchors present`);
}

// ---------- survival audit ---------------------------------------------------
// Usage: survival <upstream-base> <fork-tip> <result>
//   upstream-base  merge-base of upstream and the fork line (upstream's tip at merge time)
//   fork-tip       our branch immediately BEFORE the merge
//   result         the merge commit (or any later head) to audit
// "Our lines" are the additions fork-tip made on top of upstream-base; the
// audit measures how many still exist in result. Automates the manual
// `diff <(git show main:path) path` roll-back check and also guards legacy
// fixes that predate the marker system.
function runSurvival(upstreamBase, forkTip, result) {
  if (!upstreamBase || !forkTip || !result) {
    console.error("survival needs <upstream-base> <fork-tip> <result>");
    process.exit(2);
  }
  const FLOOR = 0.9;
  const git = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" });
  // Code files only: upstream legitimately reshuffles generated manifests and
  // example documents, and those churn lines are evolution, not merge damage.
  const CODE = /\.(ts|tsx|mjs|css|scss)$/;
  const index = loadIndex();
  const forkOwned = Object.values(index)
    .filter((f) => f.kind === "extension" && f.status === "active")
    .flatMap((f) => Object.keys(f.files ?? {}));
  const files = git(`diff --name-only ${upstreamBase} ${forkTip}`)
    .trim().split("\n").filter(Boolean).filter((f) => CODE.test(f));
  const findings = [];
  for (const file of files) {
    let diff;
    try { diff = git(`diff ${upstreamBase} ${forkTip} --unified=0 -- ${JSON.stringify(file)}`); }
    catch { continue; }
    const added = [...diff.split("\n")]
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
      .map((l) => l.slice(1).trim())
      .filter((l) => l.length > 3);
    if (added.length < 8) continue; // below noise floor
    let headContent = "";
    const existsAtResult = (() => {
      try { headContent = execSync(`git show ${result}:${file}`, { cwd: ROOT, encoding: "utf8" }); return true; }
      catch { return false; }
    })();
    if (!existsAtResult) {
      if (forkOwned.some((p) => file.startsWith(p))) {
        findings.push(`SURVIVAL-0 ${file}: gone at ${result}, but the fork index marks it protected`);
      }
      continue;
    }
    const survived = added.filter((l) => headContent.includes(l)).length;
    const ratio = survived / added.length;
    if (ratio < FLOOR) {
      findings.push(`SURVIVAL ${file}: ${survived}/${added.length} fork-added lines survive (${(ratio * 100).toFixed(0)}%) — check for a roll-back in the merge`);
    }
  }
  if (findings.length) {
    console.error(`fork-integrity survival: ${findings.length} finding(s) auditing ${result}`);
    findings.forEach((f) => console.error("  " + f));
    process.exit(1);
  }
  console.log(`fork-integrity survival OK: ${files.length} files above the ${FLOOR * 100}% floor`);
}

function runUpdateBaseline() {
  const index = loadIndex();
  const { counts } = scanMarkers();
  const lines = readFileSync(INDEX_PATH, "utf8").split("\n");
  const out = lines.map((line) => {
    const m = /^  ([a-z0-9\/_-]+):\s*$/.exec(line);
    if (!m) return line;
    const id = m[1];
    const have = counts[id] ? counts[id].begin + counts[id].line : 0;
    return line; // counts rewritten below via markers line replacement
  });
  // simpler: rewrite the `markers:` line per feature block
  let feature = null;
  const rewritten = out.map((line) => {
    const top = /^  ([a-z0-9\/_-]+):\s*$/.exec(line);
    if (top) { feature = top[1]; return line; }
    const mk = /^    markers: .*$/.exec(line);
    if (mk && feature) {
      const have = counts[feature] ? counts[feature].begin + counts[feature].line : 0;
      return `    markers: ${have}`;
    }
    return line;
  });
  writeFileSync(INDEX_PATH, rewritten.join("\n"));
  console.log("baseline rewritten from working tree");
}

if (mode === "check") runCheck();
else if (mode === "survival") runSurvival(a, b, c);
else runUpdateBaseline();
