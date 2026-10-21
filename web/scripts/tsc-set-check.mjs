#!/usr/bin/env node
/**
 * tsc-set-check — the G2 error-set comparator as a standalone tool, so the
 * same comparison runs locally (quiet window) and in CI (16GB runner), one
 * semantics everywhere. The commit gate's G2 embedded this logic; the box
 * cannot host the full-project run with the dev stack resident (measured
 * live set 3.7-4GB — docs/tsc-project-references-postmortem.md), so CI is
 * the primary host and this script is its contract.
 *
 * Usage (from web/):
 *   node scripts/tsc-set-check.mjs                    # vs scripts/i18n-tsc-baseline.txt
 *   node scripts/tsc-set-check.mjs -p tsconfig.smoke.json --baseline /tmp/bl.txt
 *   node scripts/tsc-set-check.mjs --update           # rewrite baseline from this run
 *
 * Exit 0 = error set matches baseline. Exit 1 = drift (added/removed printed).
 * Exit 3 = aborted (compiler died / not found / OOM) — NEVER a pass.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : dflt;
};
const project = flag("-p", "tsconfig.json");
const baselineFile = resolve(webRoot, flag("--baseline", join("scripts", "i18n-tsc-baseline.txt")));
const update = args.includes("--update");
const heapMb = parseInt(process.env.TSC_SET_HEAP_MB || "7000", 10);
// The compiler lives in the HOISTED root node_modules (web/ has no
// typescript of its own). Resolution order: the local tsc6 shim (present on
// the dev box, an untracked 2-line wrapper naming the v6 channel), then the
// standard bin/tsc, then lib/tsc.js directly — a fresh CI `npm ci` has only
// the last two.
const tsRoot = join(webRoot, "..", "node_modules", "typescript");
const tscCandidates = [
  join(tsRoot, "bin", "tsc6"),
  join(tsRoot, "bin", "tsc"),
  join(tsRoot, "lib", "tsc.js")
];
const tscBin = tscCandidates.find((p) => existsSync(p));
if (!tscBin) {
  console.error(`ABORTED: no typescript compiler under ${tsRoot} — run npm ci first.`);
  process.exit(3);
}

const out = await new Promise((res) => {
  const child = spawn(process.execPath,
    ["--max-old-space-size=" + heapMb, tscBin, "--noEmit", "-p", project],
    { cwd: webRoot, stdio: ["pipe", "pipe", "pipe"] });
  let buf = "";
  child.stdout.on("data", (d) => { buf += d; });
  child.stderr.on("data", (d) => { buf += d; });
  child.on("close", (code, signal) => res(buf + (signal ? `\n(signal ${signal})` : "")));
});
// Module-resolution DISCRIMINATOR: a failed compiler LOAD produces the
// module-not-found text with NO "error TS" lines at all. Genuine TS2307s
// ("Cannot find module 'x' or its corresponding type declarations") arrive
// as normal error lines and must flow into the set comparison, not abort —
// the first CI run caught real drift this way.
const hasTsErrors = /^.*error TS\d+/m.test(out);
if (!hasTsErrors && /Cannot find module|MODULE_NOT_FOUND/.test(out)) {
  console.error("ABORTED: compiler output contains module-resolution failures — never a pass.");
  console.error("tail of compiler output:\n" + out.split("\n").slice(-12).join("\n"));
  process.exit(3);
}
if (/\(signal |FATAL ERROR|JavaScript heap out of memory/.test(out)) {
  console.error("ABORTED: compiler died (signal/OOM) — the error set is incomplete; never a pass.");
  console.error(out.split("\n").slice(-6).join("\n"));
  process.exit(3);
}

const errLine = (l) => {
  const m = l.match(/^(.+?)\(\d+,\d+\): error (TS\d+)/);
  return m ? `${m[1].replace(/\\/g, "/")} ${m[2]}` : null;
};
const current = [...new Set(out.split("\n").map(errLine).filter(Boolean))].sort();

if (update) {
  writeFileSync(baselineFile, current.join("\n") + (current.length ? "\n" : ""));
  console.log(`baseline updated: ${current.length} errors recorded in ${baselineFile}`);
  process.exit(0);
}
if (!existsSync(baselineFile)) {
  console.error(`ABORTED: baseline ${baselineFile} does not exist — record one with --update first.`);
  process.exit(3);
}
const baseline = readFileSync(baselineFile, "utf8").split("\n").filter(Boolean);
const added = current.filter((x) => !baseline.includes(x));
const removed = baseline.filter((x) => !current.includes(x));
if (added.length || removed.length) {
  if (added.length) {
    console.error(`NEW ERRORS (${added.length}):`);
    added.forEach((e) => console.error("  + " + e));
  }
  if (removed.length) {
    console.error(`BASELINE ERRORS GONE (${removed.length}) — refresh the baseline only after review:`);
    removed.forEach((e) => console.error("  - " + e));
  }
  console.error(`::error::tsc-set-check drift on ${project}: +${added.length} / -${removed.length}`);
  process.exit(1);
}
console.log(`tsc-set-check OK: ${project} error set matches baseline (${current.length} errors).`);
