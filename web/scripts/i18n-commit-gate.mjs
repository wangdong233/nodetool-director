// i18n commit gate — the mechanical checks that close the r26 audit holes.
// Usage: node scripts/i18n-commit-gate.mjs [--base <ref>]   (default: HEAD~1)
// Exits non-zero with a named finding on any failure. Prove-fail tested.
//
//  G1 SYNTAX  — every .ts/.tsx changed in the range must parse (esbuild).
//               Born from r26 F1: an import injected INSIDE a multi-line
//               import's braces shipped as a committed build-breaker whose
//               error COUNT happened to equal the baseline count.
//  G2 TSC-SET — tsc errors must be the SAME SET as the recorded baseline,
//               not merely the same count (counts can coincide).
//  G3 CLAIM   — the diff's mechanical wiring tuple (+i18n.t / -i18n.t /
//               +useTranslation / +bare-t), printed verbatim for the commit
//               message. Born from 4 claim-inflation incidents; anchor widened
//               for the useTranslation migration (B-R11).
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "HEAD~1";
const findings = [];

// ---- G1: syntax-check every changed OR untracked .ts/.tsx via esbuild ----
// `git diff` alone misses untracked files — a fresh breakage must not escape.
const tracked = execSync(`git diff --name-only ${BASE} -- "*.ts" "*.tsx"`, { cwd: webRoot, encoding: "utf8" })
  .split("\n").map(s => s.trim()).filter(Boolean);
const untracked = execSync(`git ls-files --others --exclude-standard -- "*.ts" "*.tsx"`, { cwd: webRoot, encoding: "utf8" })
  .split("\n").map(s => s.trim()).filter(Boolean);
const changed = [...new Set([...tracked, ...untracked])];
const esbuild = await import("esbuild");
for (const rel of changed) {
  if (rel.startsWith("src/") === false) continue;
  try {
    const src = readFileSync(join(webRoot, rel), "utf8");
    esbuild.transformSync(src, { loader: rel.endsWith(".tsx") ? "tsx" : "ts" });
  } catch (e) {
    findings.push(`G1-SYNTAX ${rel}: ${String(e.message).split("\n")[0]}`);
  }
}

// ---- G2: tsc error SET vs baseline snapshot ----
// Baseline is only created/refreshed on a clean run — a failing gate must
// never poison the snapshot (probe-pollution lesson from this script's birth).
if (findings.length === 0) {
const baselineFile = join(webRoot, "scripts", "i18n-tsc-baseline.txt");
const current = (() => {
  try {
    const out = execSync("npx tsc --noEmit -p tsconfig.json 2>&1", { cwd: webRoot, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return out;
  } catch (e) {
    return String(e.stdout || e.message);
  }
})();
const errLine = l => { const m = l.match(/^(.+?)\(\d+,\d+\): error (TS\d+)/); return m ? `${m[1]} ${m[2]}` : null; };
const currentSet = [...new Set(current.split("\n").map(errLine).filter(Boolean))].sort();
if (!existsSync(baselineFile)) {
  writeFileSync(baselineFile, currentSet.join("\n") + "\n");
  console.log(`G2: baseline snapshot created (${currentSet.length} errors) — commit it`);
} else {
  const baseSet = readFileSync(baselineFile, "utf8").split("\n").filter(Boolean);
  const added = currentSet.filter(x => !baseSet.includes(x));
  const removed = baseSet.filter(x => !currentSet.includes(x));
  if (added.length || removed.length) {
    if (added.length) findings.push(`G2-TSC-SET new errors:\n    ${added.join("\n    ")}`);
    if (removed.length) console.log(`G2: ${removed.length} baseline errors no longer present — refresh the snapshot deliberately`);
  }
}
}

// ---- G3: mechanical wiring count for the commit message ----
// mig-P1 (B-R11): anchor widened — migration batches replace `i18n.t(` with
// hook-captured `t(`, so the legacy counter alone reads 0 and the
// anti-inflation gate idles. Print the full tuple.
let legacyAdded = 0, hookAdded = 0, legacyRemoved = 0, bareTAdded = 0;
try {
  const diff = execSync(`git diff ${BASE} -- "*.ts" "*.tsx"`, { cwd: webRoot, encoding: "utf8" });
  legacyAdded = (diff.match(/^\+.*i18n\.t\(/gm) || []).length;
  legacyRemoved = (diff.match(/^-.*i18n\.t\(/gm) || []).length;
  hookAdded = (diff.match(/^\+.*useTranslation\(/gm) || []).length;
  bareTAdded = (diff.match(/^\+.*(?<![\w.$])t\(/gm) || []).length;
} catch { /* empty diff */ }

// ---- G4: dangling-ref check (src→dict direction) ----
// The dead-key guard only walks dict→src. A full-literal `ns:key.path` in
// source whose key is missing from the dictionaries silently falls back to
// defaultValue (English renders, guard stays green). Two incidents: r25
// studio keys, d6-merge prune. Template forms (ns:prefix.${…}) are excluded
// by construction — the regex requires the full path before the quote.
{
  const dicts = {}; // ns -> Set of flattened key paths
  for (const ns of ["common","nav","settings","home","editor","timeline","sketch","storyboard","ui","ui2","appbuilder","catalog","tools","game"]) {
    try {
      const raw = JSON.parse(readFileSync(join(webRoot, "src/i18n/locales/en", `${ns}.json`), "utf8"));
      const flat = (o, p) => { for (const [k, v] of Object.entries(o)) { v && typeof v === "object" ? flat(v, `${p}${k}.`) : dicts[ns].add(`${p}${k}`); } };
      dicts[ns] = new Set(); flat(raw, "");
    } catch { /* missing ns file — parity guard owns that */ }
  }
  let allSrc = "";
  for (const rel of changed) {
    if (rel.startsWith("src/")) allSrc += readFileSync(join(webRoot, rel), "utf8");
  }
  if (!allSrc) { // fall back to whole-tree sweep when diff is empty
    const { readdirSync, statSync } = await import("node:fs");
    const walk = (dir) => { for (const e of readdirSync(dir)) { if (["__tests__","node_modules","__snapshots__","demo","__mocks__","i18n","e2e_runner"].includes(e)) continue; const p = join(dir, e); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(e) && !/\.test\./.test(e)) allSrc += readFileSync(p, "utf8"); } };
    for (const root of ["src/components","src/studio","src/hooks","src/lib","src/utils","src/config","src/stores"]) walk(join(webRoot, root));
  }
  const seen = new Set();
  for (const m of allSrc.matchAll(/["'`]([a-z0-9]+):([a-zA-Z0-9_.]+)["'`]/g)) {
    const ns = m[1], path = m[2];
    if (!dicts[ns]) continue;
    if (path.endsWith(".")) continue; // dynamic template prefix (`ns:sub.${…}`)
    const id = `${ns}:${path}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (dicts[ns].has(path)) continue;
    // apostrophe-bearing legacy slugs (`weCouldn't…`) truncate at the ' in the
    // path class — a dict key that starts with the truncated path is a match.
    let prefixMatch = false;
    for (const k of dicts[ns]) { if (k.startsWith(path)) { prefixMatch = true; break; } }
    if (!prefixMatch) findings.push(`G4-DANGLING ${id} referenced in src but missing from en/${ns}.json`);
  }
}

console.log(`G3-CLAIM tuple (${BASE}..HEAD) — paste verbatim, do not estimate:`);
console.log(`  +i18n.t(=${legacyAdded}  -i18n.t(=${legacyRemoved}  +useTranslation(=${hookAdded}  +bare-t(=${bareTAdded}`);
if (findings.length) {
  console.error("COMMIT GATE FAILED:");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("commit gate OK (G1 syntax / G2 tsc-set / G3 claim printed)");
