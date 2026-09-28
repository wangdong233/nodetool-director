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
//  G3 CLAIM   — the diff's actual `+.*i18n.t(` wiring count, printed for the
//               commit message. Born from 4 claim-inflation incidents.
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
let claim = 0;
try {
  const diff = execSync(`git diff ${BASE} -- "*.ts" "*.tsx"`, { cwd: webRoot, encoding: "utf8" });
  claim = (diff.match(/^\+.*i18n\.t\(/gm) || []).length;
} catch { /* empty diff */ }

console.log(`G3-CLAIM: ${claim} actual i18n.t additions in diff (${BASE}..HEAD) — paste this number, do not estimate`);
if (findings.length) {
  console.error("COMMIT GATE FAILED:");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("commit gate OK (G1 syntax / G2 tsc-set / G3 claim printed)");
