// i18n preflight — the mechanical checks every i18n commit must pass.
// Born from r21-r24 findings; runs in seconds, catches the classes fresh
// agents kept re-finding (frozen i18n.t, half-wired sibling attrs, strays).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/components", "src/studio", "src/hooks", "src/lib", "src/utils", "src/config", "src/stores"];
const SKIP = new Set(["__tests__", "stories", "demo", "i18n", "__mocks__", "node_modules"]);
const issues = { frozen: [], scanned: 0 };

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e) && !/\.test\./.test(e)) yield p;
  }
}

// r26 F6: precise scan. The previous line-based heuristic looked forward from
// `useMemo(` for a line ending in `]`, which (a) over-extended past blocks
// closed with `]);` and matched i18n.t calls from later code (128 false
// positives), and (b) stopped at an array literal's own `],` instead of the
// deps array (missing the already-correct StudioScriptPage memo). Scan the
// real source instead: find every useMemo( call, extract the full call with
// balanced parens (string-literal aware, so "/*" inside a URL no longer eats
// the rest of the file), take the trailing dep array, and require a
// languageVersion dep when the memo body calls i18n.t.

function matchForward(src, openPos, openCh, closeCh) {
  let depth = 0;
  for (let i = openPos; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === q) break;
        i++;
      }
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function matchBackward(src, closePos, openCh, closeCh) {
  let depth = 0;
  for (let i = closePos; i >= 0; i--) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i--;
      while (i >= 0) {
        if (src[i] === q && src[i - 1] !== "\\") break;
        i--;
      }
      continue;
    }
    if (c === closeCh) depth++;
    else if (c === openCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function frozenUseMemoIssues(src, relPath) {
  const issues = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === q) break;
        i++;
      }
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const j = src.indexOf("\n", i);
      i = j === -1 ? n : j;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const j = src.indexOf("*/", i + 2);
      i = j === -1 ? n : j + 2;
      continue;
    }
    if (src.startsWith("useMemo(", i)) {
      const openParen = i + "useMemo(".length - 1;
      const closeParen = matchForward(src, openParen, "(", ")");
      if (closeParen !== -1) {
        let k = closeParen - 1;
        while (k > openParen && /\s/.test(src[k])) k--;
        let depsText = null;
        let bodyEnd = closeParen;
        if (src[k] === "]") {
          const openBracket = matchBackward(src, k, "[", "]");
          if (openBracket !== -1) {
            depsText = src.slice(openBracket, k + 1);
            bodyEnd = openBracket;
          }
        }
        const body = src.slice(i, bodyEnd);
        // A memo with NO dep array recomputes every render — the locale can
        // never freeze, so only memos that HAVE deps are in scope here.
        if (depsText !== null && /i18n\.t\(/.test(body)) {
          const depsOk =
            /(^|[^\w$.])languageVersion($|[^\w$])/.test(depsText) ||
            /(^|[^\w$.])version($|[^\w$])/.test(depsText);
          if (!depsOk) {
            const line = src.slice(0, i).split("\n").length;
            issues.push(`${relPath}:${line} useMemo(i18n.t) deps lack languageVersion`);
          }
        }
      }
      i += "useMemo(".length;
      continue;
    }
    i++;
  }
  return issues;
}

for (const root of ROOTS) {
  for (const fp of walk(root)) {
    const src = readFileSync(fp, "utf8");
    issues.scanned++;
    issues.frozen.push(...frozenUseMemoIssues(src, relative(process.cwd(), fp)));
    // r27 F5: half-wired ternary arms (F4 pattern, 4th recurrence class) —
    // one arm i18n.t, the sibling a bare string literal. Same-line form;
    // multi-line splits are audited manually until this proves stable.
    for (let i = 0; i < src.split("\n").length; i++) {
      const ln = src.split("\n")[i];
      if (!ln.includes("i18n.t(")) continue;
      const m = ln.match(/[?:]\s*i18n\.t\([^)]*\)\s*:\s*"([^"\\]+)"|[?:]\s*"([^"\\]+)"\s*:\s*i18n\.t\(/);
      if (m) {
        const bare = m[1] ?? m[2];
        if (/[A-Za-z]{2}/.test(bare)) {
          issues.frozen.push(`${relative(process.cwd(), fp)}:${i + 1} half-wired ternary arm: ${JSON.stringify(bare)}`);
        }
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
