/**
 * P3 session-switch verification — proves the useTranslation migration's
 * subscription claim on the real app, plus zh statics for the b17d shell.
 *
 * The in-session flip drives the app's own switch pipeline through the
 * dev-only window.__nodetoolI18n hook (same code path as the LanguageSetting
 * control: lazy catalog load + changeLanguage + subscriber re-render).
 *
 * Not part of any test suite: a bounded, one-shot browser probe run by the
 * i18n migration orchestrator. Single chromium launch, always closed in
 * finally. Artifacts land in director/migration-useTranslation/p3-shots/.
 *
 * Usage: node scripts/i18n-session-switch-verify.mjs [baseUrl]
 *   (default http://localhost:3100; API on 7777 must be up)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, "..", "..", "director", "migration-useTranslation", "p3-shots");
mkdirSync(SHOTS, { recursive: true });

const report = { base: BASE, steps: [], screenshots: [] };
let page;
const step = (name, ok, detail) => {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const shot = async (name) => {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshots.push(file);
};

const railProbe = async (label) =>
  (await page.getByText(label, { exact: true }).count()) > 0;

/** Flip through the app's own pipeline; resolves after re-render settles. */
const flip = async (lang) =>
  page.evaluate(
    (l) => window.__nodetoolI18n.change(l),
    lang
  );

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    page.setDefaultTimeout(25000);

    // ── A1. workspace boots in English ──────────────────────────────────
    await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });
    // Dev-server cold boot transforms the whole module graph — wait for the
    // rail to render (up to 90s on a cold cache) instead of sleeping.
    await page.getByText("Workflows", { exact: true }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
    const enRail = await railProbe("Workflows");
    step("A1 workspace boots, rail shows English 'Workflows'", enRail, `url=${page.url()}`);
    if (!enRail) { await shot("a1-fail-en-rail"); throw new Error("A1 probe missing"); }

    // ── A2. flip to zh in-session (no navigation) ───────────────────────
    const urlBefore = page.url();
    await flip("zh-CN");
    await page.waitForTimeout(2000); // lazy zh catalog + subscriber re-render
    const zhRail = await railProbe("工作流");
    const urlAfter = page.url();
    step("A2 no-remount flip: rail 'Workflows'→'工作流' live, url unchanged",
      zhRail && urlBefore === urlAfter, `url=${urlAfter}`);
    await shot("a2-workspace-zh");

    // ── A3. flip back to English through the same pipeline ─────────────
    await flip("en");
    await page.waitForTimeout(1500);
    const backEn = await railProbe("Workflows");
    step("A3 flip back: 工作流→'Workflows' live", backEn, `url=${page.url()}`);

    // ── B. zh statics for the b17d shell + models (persisted zh) ───────
    await page.evaluate(() => localStorage.setItem("nodetool-language", "zh-CN"));
    const latinLines = () =>
      page.evaluate(() =>
        document.body.innerText
          .split("\n")
          .map((l) => l.trim())
          .filter(
            (l) =>
              /[A-Za-z]{3,}/.test(l) &&
              l.split(" ").length >= 3 &&
              !/[一-鿿]/.test(l)
          )
      );
    const shellProbe = async (route, mustContain, name) => {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      // Every route boots the full app; wait past the splash (warm dev cache
      // still takes tens of seconds on this machine). The splash string is
      // localized — wait out BOTH language forms.
      await page.waitForFunction(
        () =>
          !document.body.innerText.includes("Loading NodeTool") &&
          !document.body.innerText.includes("正在加载 NodeTool"),
        { timeout: 90000, polling: 1000 }
      );
      await page.waitForTimeout(1500);
      const has = (await page.getByText(mustContain, { exact: false }).count()) > 0;
      const latin = await latinLines();
      step(
        `B ${name} zh probe '${mustContain}'`,
        has,
        `latin lines=${latin.length}${latin.length ? `: ${latin.slice(0, 6).join(" | ")}` : ""}`
      );
      await shot(`b-${name.replace(/[^a-z0-9]+/gi, "-")}`);
    };
    await shellProbe("/login", "登录", "login");
    await shellProbe("/studio", "做一支视频", "studio");
    await shellProbe("/models", "模型", "models");

    report.verdict = report.steps.every((s) => s.ok) ? "PASS" : "FAIL";
  } finally {
    await browser.close();
  }
};

run()
  .then(() => {
    writeFileSync(join(SHOTS, "session-switch-report.json"), JSON.stringify(report, null, 2));
    console.log(`VERDICT ${report.verdict ?? "FAIL"}`);
    process.exit(report.verdict === "PASS" ? 0 : 1);
  })
  .catch((err) => {
    report.error = String(err);
    try { writeFileSync(join(SHOTS, "session-switch-report.json"), JSON.stringify(report, null, 2)); } catch {}
    console.error("ERROR", err);
    process.exit(1);
  });
