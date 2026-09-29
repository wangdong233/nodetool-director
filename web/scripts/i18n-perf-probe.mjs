/**
 * i18n performance probe — language-switch long-task + interaction-latency
 * lab proxy on the real workspace (audit condition 1 / B-12).
 *
 * Environment: dev-mode Vite on a 2015 Intel MBP (weak baseline machine,
 * same caveat as director/perf-baseline.md). One chromium launch, closed in
 * finally. Artifacts: director/migration-useTranslation/p3-shots/perf.json.
 *
 * Usage: node scripts/i18n-perf-probe.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "director", "migration-useTranslation", "p3-shots");
mkdirSync(OUT, { recursive: true });

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { base: BASE, env: "dev-mode vite, Intel MBP 2015 (weak baseline)" };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(90000);
    await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });
    await page.getByText("Workflows", { exact: true }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(2500); // settle

    // Long-task observer armed in-page
    await page.evaluate(() => {
      window.__longtasks = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longtasks.push({ start: e.startTime, dur: e.duration });
      }).observe({ entryTypes: ["longtask"] });
    });

    // ── 1. Language-switch long-task (3 flips, per-flip deltas) ─────────
    const flips = [];
    const flip = async (lang) => {
      const before = await page.evaluate(() => window.__longtasks.length);
      const t0 = Date.now();
      await page.evaluate((l) => window.__nodetoolI18n.change(l), lang);
      await page.waitForTimeout(1200); // re-render settle
      const after = await page.evaluate((n) => window.__longtasks.slice(n), before);
      const total = after.reduce((s, t) => s + t.dur, 0);
      flips.push({ to: lang, wallMs: Date.now() - t0, longtasks: after.length, longtaskTotalMs: Math.round(total), maxTaskMs: Math.round(Math.max(0, ...after.map((t) => t.dur))) });
    };
    await flip("zh-CN");
    await flip("en");
    await flip("zh-CN");
    report.languageSwitchFlips = flips;

    // ── 2. Interaction-latency lab proxy (INP stand-in) ─────────────────
    // Click a rail item repeatedly; measure input→next-paint via
    // event.timing + rAF after each click (closest lab proxy to INP).
    const taps = [];
    for (let i = 0; i < 6; i++) {
      const ms = await page.evaluate(async () => {
        const t0 = performance.now();
        document.querySelector('[aria-label="Notifications, no unread notifications"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return Math.round(performance.now() - t0);
      });
      taps.push(ms);
      await page.waitForTimeout(350);
    }
    taps.sort((a, b) => a - b);
    report.interactionProxyMs = { samples: taps, p75: taps[Math.floor(taps.length * 0.75)] };

    // ── 3. Dev boot context (informational) ────────────────────────────
    report.bootToRailMs = await page.evaluate(() => Math.round(performance.now()));
  } finally {
    await browser.close();
  }
  writeFileSync(join(OUT, "perf.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
};

run().catch((e) => { console.error("ERROR", e); process.exit(1); });
