#!/usr/bin/env node
/**
 * bare-string-i18n audit — codebase-wide report of user-visible English that
 * is not routed through the i18n catalogs (the class of miss rounds 6-9 kept
 * surfacing via user screenshots: single-line JSX text, label-ish props, and
 * template literals inside components).
 *
 * REPORT-ONLY by design (the anti-slop backlog precedent): it inventories,
 * it does not gate. Classification is heuristic — every hit needs a human
 * verdict of (a) wire+translate / (b) data|term|proper-noun / (c) non-UI.
 *
 * Usage: node scripts/i18n-bare-audit.mjs [paths...]   (default: src)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOTS = process.argv.slice(2).length ? process.argv.slice(2) : ["src"];
const BASE = dirname(fileURLToPath(import.meta.url)) + "/..";

// ---- heuristics ------------------------------------------------------------
const LABEL_PROPS =
  /(?:^|[\s{,])(?:label|title|placeholder|helperText|aria-label|alt|tooltip|actionText|secondaryText|emptyText|description|countLabel|menuLabel|secondary|startHint|endHint)="([^"]{3,})"/g;

const JSX_TEXT = />([^<>{}"'\n]{3,120})</g;
const TERNARY_TEXT = /\?\s*"([A-Z][^"\n]{4,80})"\s*:/g;

const TERM_RE =
  /^(?:SVG|JSON|API|URL|HTML|CSS|PDF|PNG|MP4|MP3|JPG|WEBP|GLB|GPU|CPU|CLI|MCP|LLM|TTS|STT|JS|TS|3D|2D|RGB|HD|FPS|CSV|YAML|TOML|JSONL|HTTP|WS|UI|UX|ID|UUID|RGB|HSV|OKLCH|sRGB|v\d+|x\d+|\d+(?:\.\d+)?(?:px|ms|s|kB|MB|GB|%|fps)|[a-z0-9_-]+(?:\.[a-z0-9_-]+)+)$/;

const NOISE_RE =
  /(^[\s\d.,:;!?()+=[\]<>&|*/-]+$)|(^[a-z_.$-]+$)|(^[A-Za-z]+\.[A-Za-z])|(^node_)|^@|^npm:/;

const SKIP_DIRS = new Set([
  "__tests__", "node_modules", "i18n", "e2e_runner", "demo"
]);
const SKIP_FILES = /\.(?:test|spec|story|stories|d)\.[jt]sx?$|__tests__/;

const hits = [];
const classifyKind = (s) =>
  TERM_RE.test(s.trim()) ? "term"
  : NOISE_RE.test(s) ? "noise"
  : /^[A-Z]/.test(s) && /\s/.test(s) ? "sentence"   // likely user-visible
  : /\s/.test(s) ? "phrase"
  : "word";

function scanText(rel, kind, text) {
  const t = text.trim();
  if (t.length < 3) return;
  if (!/[A-Za-z]{3,}/.test(t)) return;
  if (/[一-鿿]/.test(t)) return;                 // zh content
  if (TERM_RE.test(t) || NOISE_RE.test(t)) return;
  hits.push({ file: rel, kind, text: t.slice(0, 110), cls: classifyKind(t) });
}

function scanFile(path) {
  const rel = relative(BASE, path);
  if (SKIP_FILES.test(rel)) return;
  const src = readFileSync(path, "utf8");
  // strip comments (rough, quote-aware not needed for report-only)
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const m of code.matchAll(LABEL_PROPS)) scanText(rel, "prop", m[1]);
  for (const m of code.matchAll(JSX_TEXT)) scanText(rel, "jsx", m[1]);
  for (const m of code.matchAll(TERNARY_TEXT)) scanText(rel, "ternary", m[1]);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(tsx|jsx)$/.test(entry)) scanFile(full);
  }
}

for (const root of ROOTS) walk(join(BASE, root));

// ---- report -----------------------------------------------------------------
const byClass = { sentence: [], phrase: [], word: [] };
for (const h of hits) byClass[h.cls]?.push(h);
const dirs = {};
for (const h of [...byClass.sentence, ...byClass.phrase]) {
  const d = h.file.split("/").slice(0, 3).join("/");
  dirs[d] = (dirs[d] ?? 0) + 1;
}

console.log(`# bare-string i18n audit (report-only)\n`);
console.log(
  `sentence-like: ${byClass.sentence.length} | phrase: ${byClass.phrase.length} | word: ${byClass.word.length}\n`
);
console.log(`## hot directories (sentence+phrase)\n`);
for (const [d, n] of Object.entries(dirs).sort((a, b) => b[1] - a[1]).slice(0, 18))
  console.log(`${String(n).padStart(4)}  ${d}`);
console.log(`\n## sentence-like hits (most likely user-visible)\n`);
for (const h of byClass.sentence.slice(0, 120))
  console.log(`${h.file}\t[${h.kind}]\t${h.text}`);
if (byClass.sentence.length > 120)
  console.log(`… +${byClass.sentence.length - 120} more`);
