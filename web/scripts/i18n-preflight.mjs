// i18n preflight — the mechanical checks every i18n commit must pass.
// Born from r21-r24 findings; runs in seconds, catches the classes fresh
// agents kept re-finding (frozen i18n.t, half-wired sibling attrs, strays).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

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
        // mig-P1 (B-R3): dual-form anchor — post useTranslation migration the
        // freeze class survives as a closure-captured fixed-t, so a bare `t(`
        // with deps lacking `t` is the same defect. i18n.t form stays checked
        // for the exempt (event-phase/global) surface.
        const T_CALL = /(?<![\w.$])(?:i18n\.)?t\(/;
        if (depsText !== null && T_CALL.test(body)) {
          const depsOk =
            /(^|[^\w$.])languageVersion($|[^\w$])/.test(depsText) ||
            /(^|[^\w$.])version($|[^\w$])/.test(depsText) ||
            /(^|[^\w$.])t($|[^\w$])/.test(depsText);
          if (!depsOk) {
            const line = src.slice(0, i).split("\n").length;
            issues.push(`${relPath}:${line} useMemo(t-call) deps lack t/languageVersion`);
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
    // mig-P1 (B-R3): dual-form — `cond ? t(...) : "bare"` after migration.
    const T_LINE = /(?<![\w.$])(?:i18n\.)?t\(/;
    const T_TERN = /[?:]\s*(?:i18n\.)?t\([^)]*\)\s*:\s*"([^"\\]+)"|[?:]\s*"([^"\\]+)"\s*:\s*(?:i18n\.)?t\(/;
    for (let i = 0; i < src.split("\n").length; i++) {
      const ln = src.split("\n")[i];
      if (!T_LINE.test(ln)) continue;
      const m = ln.match(T_TERN);
      if (m) {
        const bare = m[1] ?? m[2];
        if (/[A-Za-z]{2}/.test(bare)) {
          issues.frozen.push(`${relative(process.cwd(), fp)}:${i + 1} half-wired ternary arm: ${JSON.stringify(bare)}`);
        }
      }
    }
  }
}
// ---- key-composition check (2026-10-20 root cause RC-1) ---------------------
// A template-key consumer like t(`settings:sidebar.${item.labelKey}`) composes
// a namespace prefix onto the value it receives. Feeding it a value that is
// already namespace-qualified (`settings:general.secAppearance`) resolves a
// nonexistent key and silently falls back to English — the exact defect that
// hid every General heading for weeks. Two passes over the whole tree: first
// collect which props any template consumer prefix-composes, then flag
// qualified values assigned to those props ANYWHERE. Same-file scanning can
// never see this class: the defect had the consumer in SettingsSidebar.tsx and
// the qualified labelKey values in SettingsMenu.tsx.
{
  const COMPOSED_RE = /\bt\(\s*`([a-z]+):([a-zA-Z]+)\.\$\{([^}]+)\}`/g;
  const rxEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const files = [];
  const collect = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
      const p2 = join(d, e.name);
      if (e.isDirectory()) collect(p2);
      else if (/\.(tsx|ts)$/.test(e.name)) files.push(p2);
    }
  };
  collect(join(process.cwd(), "src"));
  // pass 1: prop -> template-consumer sites that prefix it
  const consumers = new Map();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(COMPOSED_RE)) {
      const [, ns, sub, expr] = m;
      const prop = expr.split(".").pop()
        .replace(/\s*\?\?\s*.*/, "").replace(/\??$/, "").trim();
      if (!prop) continue;
      if (!consumers.has(prop)) consumers.set(prop, []);
      consumers.get(prop).push({ ns, sub, file: f, rel: relative(process.cwd(), f) });
    }
  }
  // pass 2: qualified values fed to those props, in any file the value can
  // reach — same file, or one import hop in either direction (the RC-1 flow
  // was SettingsMenu.tsx building the sections array and passing it into the
  // SettingsSidebar.tsx consumer through props). Unrelated files sharing the
  // prop NAME under the bare-key convention (data_types.ts labelKey) cannot
  // receive the value, so they are not findings.
  const importsCache = new Map();
  const resolveSpec = (fromFile, spec) => {
    for (const cand of [spec, `${spec}.ts`, `${spec}.tsx`, `${spec}/index.ts`, `${spec}/index.tsx`]) {
      const r = resolve(dirname(fromFile), cand);
      if (existsSync(r) && statSync(r).isFile()) return r;
    }
    return null;
  };
  const importsOf = (f) => {
    if (importsCache.has(f)) return importsCache.get(f);
    const src = readFileSync(f, "utf8");
    const set = new Set();
    for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      const r = resolveSpec(f, m[1]);
      if (r) set.add(r);
    }
    importsCache.set(f, set);
    return set;
  };
  // Does f import a binding from `target` and render it as a JSX tag? That is
  // the props-passing shape: the assignment file builds the object array and
  // hands it to the consumer component (SettingsMenu → <SettingsSidebar
  // sections={…}>). A plain helper import (Help.tsx → data_types.ts functions)
  // moves no props, so it is not a flow edge for this defect class.
  const rendersImport = (f, target) => {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/import\s+([^"';]+?)\s+from\s+["'](\.[^"']+)["']/g)) {
      if (resolveSpec(f, m[2]) !== target) continue;
      const clause = m[1].trim();
      const names = new Set();
      const def = /^(\w+)\b/.exec(clause);
      if (def && !clause.startsWith("{")) names.add(def[1]);
      for (const nm of clause.matchAll(/\b([A-Z]\w*)\b/g)) names.add(nm[1]);
      for (const nm of clause.matchAll(/\b\w+\s+as\s+([A-Z]\w*)/g)) names.add(nm[1]);
      for (const name of names) {
        if (new RegExp(`<${name}[\\s/>]`).test(src)) return true;
      }
    }
    return false;
  };
  const composed = new Map(); // "file|value|prop" -> consumer sites
  if (consumers.size) {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const [prop, sites] of consumers) {
        const re = new RegExp(
          `(?:^|[\\s{,])${rxEscape(prop)}:\\s*["']([a-z][a-z0-9_-]*:[^"']+)["']`, "g"
        );
        for (const v of src.matchAll(re)) {
          const reachable = sites.filter((s) =>
            s.file === f ||
            importsOf(s.file).has(f) ||
            (importsOf(f).has(s.file) && rendersImport(f, s.file))
          );
          if (!reachable.length) continue;
          const key = `${relative(process.cwd(), f)}|${v[1]}|${prop}`;
          if (!composed.has(key)) composed.set(key, []);
          composed.get(key).push(...reachable.map((s) =>
            `${s.rel} (composes ${s.ns}:${s.sub}.${v[1]})`
          ));
        }
      }
    }
  }
  if (composed.size) {
    console.error("KEY-COMPOSITION (must fix — feed bare keys or drop the prefix):");
    for (const [key, sites] of composed) {
      const [file, value, prop] = key.split("|");
      console.error(`  ${file}: '${value}' (${prop}) → template key at ${[...new Set(sites)].join("; ")}`);
    }
    process.exit(1);
  }
}
console.log(`scanned ${issues.scanned} files`);
if (issues.frozen.length) {
  console.error("FROZEN (must fix — add useAppLanguage().version to deps):");
  for (const f of issues.frozen) console.error("  " + f);
  process.exit(1);
}
console.log("preflight OK: no frozen i18n.t patterns");
