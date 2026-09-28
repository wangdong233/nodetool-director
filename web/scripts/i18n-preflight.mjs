// i18n preflight — the mechanical checks every i18n commit must pass.
// Born from r21-r24 findings; runs in seconds, catches the classes fresh
// agents kept re-finding (frozen i18n.t, half-wired sibling attrs, strays).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/components", "src/studio", "src/hooks", "src/lib", "src/utils", "src/config", "src/stores"];
const SKIP = new Set(["__tests__", "stories", "demo", "i18n", "__mocks__", "node_modules"]);
const issues = { frozen: [], wired_ok: 0, scanned: 0 };

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e) && !/\.test\./.test(e)) yield p;
  }
}

// 1. FROZEN: module-level or empty-dep-memo i18n.t (r21 F-1 class)
for (const root of ROOTS) {
  for (const fp of walk(root)) {
    const src = readFileSync(fp, "utf8");
    issues.scanned++;
    // strip comments for both checks
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // module scope: i18n.t before first component boundary heuristics — use line scan
    const lines = code.split("\n");
    let depth = 0, inComponent = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/useMemo\(/.test(l)) {
        // find the dep array end
        let j = i, depLine = "";
        while (j < lines.length && !/\],?\s*$/.test(depLine = lines[j])) j++;
        if (/\[\s*\]\s*,?\s*$/.test(depLine) || /\[\s*\]\s*\)/.test(depLine)) {
          for (let k = i; k <= j; k++) if (/i18n\.t\(/.test(lines[k])) {
            issues.frozen.push(`${relative(process.cwd(), fp)}:${i + 1} useMemo([]) i18n.t`); break;
          }
        }
        i = j;
      }
    }
  }
}
console.log(`scanned ${issues.scanned} files`);
if (issues.frozen.length) {
  console.error("FROZEN (must fix — add useAppLanguage().version to deps):");
  for (const f of issues.frozen) console.error("  " + f);
  process.exit(1);
}
console.log("preflight OK: no frozen i18n.t patterns");
