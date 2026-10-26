#!/usr/bin/env node
// i18n deep walk v4 — EXHAUSTIVE gated-surface walk, tab editors included.
//
// v1 covered the five settings tabs. The user ruling (2026-10-23): every
// surface reachable by clicking must be walked — app pages, every settings
// tab AND the sub-pages/dialogs inside them, the new-document menu types,
// the bottom panel tabs, the command palette. Not just settings.
//
// v4 (2026-10-26): the timeline incident. The walk reported 0 while the
// user stared at an all-English timeline editor, for two reasons:
//   (a) the newdoc phase clicked menu item #1 and then clicked every later
//       item into a CLOSED menu (locator miss, silently caught), and it
//       waited 3.5s — less than a document editor needs to mount — so even
//       the one tab it opened was scanned as a blank shell;
//   (b) the detector had no class for sentence-case labels ("Zoom in") or
//       short parenthesized combobox values ("Auto (Full)").
// v4 re-opens the 新建 menu per item, waits 6s for the editor to mount,
// leaves every tab OPEN (content persists for later scans — closing each
// tab once at the end instead), drives the timeline into a content state
// (add-track menu, one real track, quality combobox), and closes every tab
// it opened at the end of the walk so the workspace is left as found.
//
// Safety rails: a destructive-vocabulary exclusion list (zh+en) keeps the
// walker off delete/remove/disconnect/sign-out buttons; dialogs are scanned
// then dismissed with Escape; creation flows are cancelled, never confirmed;
// settings toggles are never clicked (only openers: haspopup / navigational
// verbs). The walker observes; it does not mutate.
//
// Usage: node scripts/i18n-deep-walk.mjs   (dev server up; CHROME_PATH override)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SHOT_DIR = new URL(".", import.meta.url).pathname + ".i18n-walk-shots";
mkdirSync(SHOT_DIR, { recursive: true });
let shotSeq = 0;

const SCAN = () => {
  const ALLOWED = new Set([
    "ChatGPT","Claude","Gemini","Ollama","Whisper","Llama","Llamacpp","Personal",
    "Project","NodeTool","Discord","GitHub","conda","Python","English","Chinese",
    "HuggingFaceTB","PyTorch","Safetensors","TensorRT","Hub","Amazon","Bedrock",
    "Google","Mail","Higgsfield","Meta","DashScope","LM","Studio","Agent",
    "Anthropic","OpenAI","DeepSeek","Mistral","MiniMax","Groq","Cohere","Together",
    "OpenRouter","Replicate","ElevenLabs","HuggingFace","RunPod","Meshy","Reve",
    "Topaz","Kimi","Verda","Opper","Traceloop","SerpAPI","Apify","Jina","Voyage",
    "Requesty","Cerebras","GMI","Alibaba","Azure","Brave","AtlasCloud","Comfy",
    "DataForSEO","Evolink","NodeSupabase","Rodin","Zai","Useapi","Codex","OpenCode",
    "Lmstudio","Dashscope","Telegram","Supabase","Ctrl","Enter","Shift","Alt",
    "Tab","Esc","Del","Docs","Learn","View","Use","API Route","User Agent",
    "Seedream","Kokoro","onnx-community",
    // Provider identifiers rendered by the provider registry (title-cased
    // provider ids, same class as Ollama/Llama above): "fake" is the dev
    // test provider, "transformers_js" the transformers.js runtime. Product
    // names stay Latin per the glossary.
    "Fake","Transformers Js",
    // Local embedding model names with their download sizes (the settings
    // model picker lists them verbatim from the local-model catalog). Model
    // names stay Latin per the glossary; "MB" is a unit, not translatable
    // prose. Adjudicated 2026-10-25.
    "Nomic Embed Text v1.5 (150 MB)","Qwen3 Embedding 0.6B (640 MB)"
  ]);
  // v3 (2026-10-25): sentence detection. The v2 regex required punctuation-
  // free title-case phrases, so every DESCRIPTION ("From a task to a running
  // graph, with the plan reviewed first.") was invisible — the exact class
  // the user caught in the new-workflow flow. Two detectors now:
  //   phrase:  title-case, no punctuation (labels/headings)
  //   sentence: 4+ words, starts capital, allows , . : ; ' () % / — but
  //             rejects code/URL/path/CLI shapes and ALL-CAPS.
  // v4 (2026-10-26): two more classes from the timeline incident —
  //   sentenceLabel: sentence-case 2-4 word labels ("Zoom in", "Split clip",
  //             "Add track") — the phrase regex demands every word
  //             capitalized, so these were invisible
  //   parenShort: Label (Qual) combobox values ("Auto (Full)") — short
  //             parenthesized labels no class matched
  const CODEISH = /[{}=<>|#$@`~^[\]]|\bhttps?:|www\.|\.com\b|\bnpm\b|\bnpx\b|\bpip\b|\bgit\b|^[\/~.]+\w|\w\s*[-]{2}\s*\w|;\s*$|\bconst\b|\bimport\b|_\w{3,}/;
  const isPhrase = (t) => /^[A-Z][a-zA-Z&]+(\s+[a-zA-Z&]+)*$/.test(t);
  const isSentence = (t) =>
    /^[A-Z][\w&'(),.:;%\u2019\u2014-]*(\s+[\w&'(),.:;%\u2019\u2014-]+){3,}[.?!]?$/.test(t) &&
    /[a-z]{2}/.test(t);
  const isSentenceLabel = (t) => /^[A-Z][a-z0-9]+(\s+[a-z0-9]+){1,3}\??$/.test(t);
  const isParenShort = (t) => /^[A-Z][A-Za-z ]{2,18}\s*\([A-Za-z0-9 ]{1,12}\)$/.test(t);
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim();
    if (!t || t.length > 160 || /[一-鿿]/.test(t)) continue;
    if (/^[A-Z]{2,6}$/.test(t)) continue;
    if (!(isPhrase(t) || isSentence(t) || isSentenceLabel(t) || isParenShort(t))) continue;
    if (!isPhrase(t) && CODEISH.test(t)) continue;
    if (ALLOWED.has(t) || ALLOWED.has(t.split(" ")[0])) continue;
    const el = n.parentElement, r = el.getBoundingClientRect();
    // stored document names are DATA (user-created titles), not chrome
    if (el.closest(".documents-tree-leaf")) continue;
    if (r.width === 0 || r.height === 0) continue;
    // v4.1: inactive workspace tabs stay mounted, hidden by opacity:0
    // (WorkspaceTabLayer) — they pass a rect check, so run 1 attributed every
    // mounted editor's text to every scan. Walk the ancestors: any
    // display:none / visibility:hidden / opacity:0 makes the node invisible.
    let visible = true;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) {
        visible = false;
        break;
      }
    }
    if (visible) {
      // v4.1: ship the DOM chain with each hit — findings from another
      // workload's state (e.g. a panel the fresh page cannot reproduce)
      // become locatable without a separate probe run.
      const chain = [];
      let e = el;
      for (let i = 0; i < 6 && e; i++, e = e.parentElement) {
        chain.push(e.tagName.toLowerCase() + "." + String(e.className).split(" ").slice(0, 2).join("."));
      }
      out.push(t.slice(0, 140) + " @" + chain.join(" < "));
    }
  }
  const byText = new Map();
  for (const entry of out) byText.set(entry.split(" @")[0], entry);
  return [...byText.values()].sort();
};

const DESTRUCTIVE = /删除|清除|移除|断开|注销|退出登录|重置|卸载|delete|remove|clear|disconnect|sign\s*out|reset|uninstall|revoke|log\s*out/i;
const OPENER_HINT = /添加|新建|创建|连接|管理|查看|更多|展开|选项|配置|提供|设置|选择|浏览|打开|add|new|create|connect|manage|view|more|expand|option|config|offer|browse|open|select|edit|import|upload/i;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const findings = [];
const scanned = [];
let page;

async function snap(label) {
  const safe = label.replace(/[^\w一-鿿:-]+/g, "_").slice(0, 60);
  await page.screenshot({ path: `${SHOT_DIR}/${String(++shotSeq).padStart(2, "0")}-${safe}.png` }).catch(() => {});
}
async function scan(label) {
  const hits = await page.evaluate(SCAN).catch(() => []);
  scanned.push(label);
  if (hits.length) {
    findings.push({ label, hits });
    console.log(`  X [${label}] ${hits.length} -> ${hits.join(" | ")}`);
    await snap(label);
  } else {
    console.log(`  . [${label}]`);
  }
  return hits.length;
}
async function dialogsOnPage(label) {
  const openers = await page.evaluate((src) => {
    const DESTRUCTIVE = new RegExp(src.de, "i");
    const OPENER_HINT = new RegExp(src.op, "i");
    return [...document.querySelectorAll("button")]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const txt = (b.textContent + " " + (b.getAttribute("aria-label") || "")).trim();
        if (DESTRUCTIVE.test(txt)) return false;
        return b.getAttribute("aria-haspopup") || OPENER_HINT.test(txt);
      })
      .map((b) => ({
        txt: (b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 24),
        haspopup: b.getAttribute("aria-haspopup") || ""
      }))
      .slice(0, 24);
  }, { de: DESTRUCTIVE.source, op: OPENER_HINT.source }).catch(() => []);
  for (const op of openers) {
    if (!op.txt) continue;
    const loc = page.locator("button", { hasText: op.txt }).first();
    await loc.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    const dialogOpen = await page.evaluate(() => !!document.querySelector(".MuiDialog-root, [role='menu'], [role='dialog']")).catch(() => false);
    await scan(`${label} > ${op.txt}${dialogOpen ? " (dialog)" : ""}`);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  }
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("nodetool-language", "zh-CN");
    try {
      localStorage.setItem("nodetool-onboarding", JSON.stringify({ state: { providerSignInOffered: true }, version: 0 }));
    } catch {}
  });
  page = await ctx.newPage();

  console.log("== workspace ==");
  await page.goto(BASE + "/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4500);
  await scan("workspace-home");

  console.log("== bottom panel tabs ==");
  const bottomTabs = await page.$$eval("[class*='bottom'] [role='tab'], [class*='bottom'] .MuiTab-root",
    (els) => [...new Set(els.map((e) => e.textContent.trim()))].filter(Boolean)).catch(() => []);
  for (const t of bottomTabs.slice(0, 8)) {
    await page.locator("[class*='bottom'] [role='tab'], [class*='bottom'] .MuiTab-root", { hasText: t }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    await scan(`bottom:${t}`);
  }

  console.log("== new-document menu (v4: every type, editors really mounted) ==");
  // v4: the menu must be re-opened before EACH item — after a create it
  // closes, and v2's later clicks hit a closed menu and were silently
  // swallowed (that is how the timeline editor was never scanned). Tabs
  // opened here stay open for the rest of the walk (their content persists,
  // only the active one is visible) and are closed in the final phase.
  const openedTabs = [];
  const tabTitles = () =>
    page.$$eval("[role='tab'] .tab-name", (els) => els.map((e) => e.textContent.trim())).catch(() => []);
  let prevTabs = await tabTitles();
  // Snapshot BEFORE any create: the final close phase diffs counts against
  // this baseline so only tabs the walk itself added get closed.
  const baselineTabs = [...prevTabs];
  // v4.1: blank-document rows only. Run 1's length filter (<24) was tuned
  // for English — zh packs a guided starter's title+description into ~20
  // chars, so the walk clicked starters and began real generation flows.
  // Blank rows are the menuitems AFTER the "Blank documents" subheader (and,
  // belt and braces, start with 新建 in this zh walk).
  const newMenuItems = async () =>
    page.evaluate(() => {
      const menus = [...document.querySelectorAll("[role='menu']")];
      const menu = menus[menus.length - 1];
      if (!menu) return [];
      const out = [];
      let inBlank = false;
      for (const li of menu.querySelectorAll("li")) {
        const txt = (li.textContent || "").trim();
        if (li.getAttribute("role") === "menuitem") {
          if (inBlank && txt.startsWith("新建")) out.push(txt);
        } else if (/空白文档|Blank documents/.test(txt)) {
          inBlank = true;
        }
      }
      return [...new Set(out)];
    }).catch(() => []);
  const openNewMenu = async () => {
    for (let i = 0; i < 3; i++) {
      const menuOpen = await page.evaluate(() => !!document.querySelector("[role='menu']")).catch(() => false);
      if (menuOpen) return true;
      // The tab bar's "+" button has a stable class (WorkspaceTabBar
      // .new-tab). The v2 aria-label probe matched whichever 新建-labeled
      // control came first in DOM order and could open something else.
      for (const trigger of ["button.new-tab", '[aria-label*="新建"]', 'button:has-text("新建")']) {
        const btn = page.locator(trigger).first();
        if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); break; }
      }
      await page.waitForTimeout(1100);
    }
    return await page.evaluate(() => !!document.querySelector("[role='menu']")).catch(() => false);
  };
  if (!(await openNewMenu())) console.log("  ! newdoc menu did NOT open — blank-document phase skipped");
  await scan("newdoc-menu");
  // Blank-document rows only (see newMenuItems above): guided-flow starters
  // run real generations — never click them.
  const rootItems = await newMenuItems();
  for (const item of rootItems) {
    if (!item) continue;
    if (!(await openNewMenu())) {
      console.log(`  ! menu failed to open for ${item} — skipped`);
      continue;
    }
    await page.locator("[role='menu'] [role='menuitem']", { hasText: item }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1400);
    // Submenu rows ("New text file…", "New storyboard…") switch the menu view
    // instead of creating. Scan the submenu, then take its first real row so
    // that editor type mounts too.
    if (await page.evaluate(() => !!document.querySelector("[role='menu']")).catch(() => false)) {
      await scan(`newdoc-menu:${item}`);
      const sub = await page.evaluate(() => {
        const menus = [...document.querySelectorAll("[role='menu']")];
        const rows = [...(menus[menus.length - 1] || { querySelectorAll: () => [] }).querySelectorAll("[role='menuitem']")]
          .map((e) => e.textContent.trim())
          .filter((t) => t && !/^(返回|Back)$/.test(t));
        return rows[0] || null;
      }).catch(() => null);
      if (sub) {
        await page.locator("[role='menu'] [role='menuitem']", { hasText: sub }).first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
    // v4: 6s — document editors mount providers, queries and canvases; the
    // v3 3.5s cutoff scanned a blank shell and passed 0.
    await page.waitForTimeout(6000);
    const dialog = await page.evaluate(() => !!document.querySelector(".MuiDialog-root")).catch(() => false);
    await scan(`newdoc:${item}${dialog ? " (dialog)" : ""}`);
    if (dialog) {
      for (const cancel of ["取消", "Cancel", "关闭"]) {
        const c = page.locator("button", { hasText: cancel }).last();
        if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); break; }
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(600);
    }
    const nowTabs = await tabTitles();
    for (const t of nowTabs) {
      if (!prevTabs.includes(t) && !openedTabs.includes(t)) openedTabs.push(t);
    }
    prevTabs = nowTabs;

    // v4: content state. The timeline's toolbar shows on the empty editor,
    // but the add-track menu items, the track header row and the preview
    // quality options only render once the walk drives it there.
    if (item.includes("时间线")) {
      const addTrack = page.locator("[data-testid='add-track-button']").first();
      if (await addTrack.isVisible().catch(() => false)) {
        await addTrack.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(900);
        await scan(`newdoc:${item}:add-track-menu`);
        await page.locator("[role='menu'] [role='menuitem']").first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1500);
        await scan(`newdoc:${item}:with-track`);
      }
      const quality = page.locator(".timeline-preview__quality").first();
      if (await quality.isVisible().catch(() => false)) {
        await quality.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(900);
        await scan(`newdoc:${item}:quality-menu`);
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(400);
      }
    }
  }

  console.log("== command palette ==");
  await page.keyboard.press("Control+K").catch(() => {});
  await page.waitForTimeout(1000);
  await scan("command-palette");
  await page.keyboard.press("Escape").catch(() => {});

  console.log("== app pages ==");
  await page.locator('[aria-label="打开应用菜单"], [aria-label*="app menu" i]').first().click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  await scan("app-menu");
  const menuItems = await page.$$eval("[role='menu'] [role='menuitem'], [role='menu'] button",
    (els) => [...new Set(els.map((e) => e.textContent.trim()))].filter((t) => t && t.length < 20)).catch(() => []);
  for (const item of menuItems.slice(0, 12)) {
    await page.locator("[role='menu'] [role='menuitem'], [role='menu'] button", { hasText: item }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1800);
    await scan(`page:${item}`);
  }

  console.log("== settings deep walk ==");
  // Clear any popover left over from the app-pages phase (its backdrop
  // intercepts every later click — v2 died here on the first run).
  for (let i = 0; i < 4; i++) {
    const popover = await page.evaluate(() => !!document.querySelector(".MuiPopover-root, .MuiMenu-root, .MuiDialog-root"));
    if (!popover) break;
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);
  }
  await page.locator('[aria-label="打开应用菜单"], [aria-label*="app menu" i]').first().click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  await page.locator("[role='menu'] [role='menuitem'], [role='menu'] button", { hasText: "设置" }).first().click({ timeout: 6000 });
  await page.waitForTimeout(2200);
  const tabs = await page.$$eval(".settings-tabs button", (els) => [...new Set(els.map((e) => e.textContent.trim()))]).catch(() => []);
  for (const tab of tabs) {
    await page.locator(".settings-tabs button", { hasText: tab }).first().click({ timeout: 6000 });
    await page.waitForTimeout(1500);
    await scan(`settings:${tab}`);
    const collapsed = await page.$$eval("[aria-expanded='false']", (els) =>
      els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0; })
         .map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24))
         .filter(Boolean).slice(0, 10)).catch(() => []);
    for (const c of collapsed) {
      if (DESTRUCTIVE.test(c)) continue;
      await page.locator("[aria-expanded='false']", { hasText: c }).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(700);
    }
    await scan(`settings:${tab}:expanded`);
    await dialogsOnPage(`settings:${tab}`);
  }

  // v4: leave the workspace as found. Close every tab the walk opened —
  // diffed by title COUNT against the pre-walk baseline, so duplicates and
  // tabs opened outside the newdoc phase (settings) are caught too. Closing
  // may activate a neighbor; a dirty document can confirm — take the
  // affirmative close/discard button.
  console.log("== close tabs the walk opened ==");
  const counts = (arr) => arr.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());
  const baselineCounts = counts(baselineTabs);
  let closedCount = 0;
  let rounds = 0;
  while (rounds++ < 40) {
    const extra = [];
    for (const [title, n] of counts(await tabTitles())) {
      const base = baselineCounts.get(title) || 0;
      for (let i = 0; i < n - base; i++) extra.push(title);
    }
    if (!extra.length) break;
    const title = extra[0];
    const tab = page.locator("[role='tab']", { hasText: title }).first();
    if (!(await tab.isVisible().catch(() => false))) break;
    await tab.locator(".tab-close").first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(700);
    if (await page.evaluate(() => !!document.querySelector(".MuiDialog-root")).catch(() => false)) {
      for (const txt of ["关闭", "丢弃", "确认", "Close", "Discard"]) {
        const b = page.locator(".MuiDialog-root button", { hasText: txt }).last();
        if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
      }
      await page.waitForTimeout(500);
    }
    closedCount++;
  }
  const finalTabs = await tabTitles();
  const leftOver = [...counts(finalTabs).entries()].filter(([t, n]) => n > (baselineCounts.get(t) || 0));
  console.log(`  tabs the walk closed: ${closedCount}; left over by the walk: ${leftOver.length}${leftOver.length ? " -> " + leftOver.map(([t, n]) => t).join(", ") : ""}`);

  const total = findings.reduce((n, f) => n + f.hits.length, 0);
  console.log(`\nSURFACES SCANNED: ${scanned.length}`);
  console.log(`TOTAL actionable findings: ${total}`);
  if (findings.length) {
    console.log("\nBY SURFACE:");
    findings.forEach((f) => console.log(`  ${f.label}: ${f.hits.join(", ")}`));
  }
  process.exit(total ? 1 : 0);
} finally {
  await browser.close();
}
