// Round-10 browser evidence: creation-flow example chips in zh (显示即所发).
// One chromium launch; every flow is opened from the start page's entry card,
// the zh chips are read from the ACTIVE flow's Inspiration group (inactive
// tabs stay mounted but inert), one chip is clicked, and the textarea must
// then hold the SAME string the chip showed.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const SHOTS = ".round10-verify/shots";
mkdirSync(SHOTS, { recursive: true });

const FLOWS = [
  {
    id: "storyboard",
    headline: "你的故事是什么？",
    card: "分镜",
    shot: "storyboard-idea-zh.png",
    expected: [
      "十秒沙漠旅行预告：日出前的沙丘、峡谷里的盘山弯道，还有星空下的营地。",
      "一部短片的开场：关于海岸灯塔的最后一任守塔人。二十秒，没有对白，让海来说话。",
      "十五秒跑鞋发布：影棚揭晓、一个材质特写，最后走到天刚亮的街头。"
    ],
    click: "十五秒跑鞋发布：影棚揭晓、一个材质特写，最后走到天刚亮的街头。"
  },
  {
    id: "video",
    headline: "视频讲什么？",
    card: "视频",
    shot: "video-idea-zh.png",
    expected: [
      "十秒沙漠旅行预告：日出前的沙丘、峡谷里的盘山弯道，还有星空下的营地。",
      "一部短片的开场：关于海岸灯塔的最后一任守塔人。二十秒，没有对白，让海来说话。",
      "十五秒跑鞋发布：影棚揭晓、一个材质特写，最后走到天刚亮的街头。"
    ],
    click: "十秒沙漠旅行预告：日出前的沙丘、峡谷里的盘山弯道，还有星空下的营地。"
  },
  {
    id: "script",
    headline: "脚本讲什么？",
    card: "脚本",
    shot: "script-idea-zh.png",
    expected: [
      "一条六十秒的科普视频，讲潮汐钟是怎么工作的",
      "一档聊失败产品播客的开场白",
      "一段咖啡订阅服务的口播广告"
    ],
    click: "一条六十秒的科普视频，讲潮汐钟是怎么工作的"
  },
  {
    id: "image",
    headline: "想要什么图像？",
    card: "图像",
    shot: "image-idea-zh.png",
    expected: [
      "阳光洒落的厨房台面上，一只陶瓷手冲咖啡滤杯",
      "小提琴手的后台肖像，头顶一盏裸露的灯泡",
      "一部深海光缆纪录片的海报设计"
    ],
    click: "阳光洒落的厨房台面上，一只陶瓷手冲咖啡滤杯"
  },
  {
    id: "workflow",
    headline: "这个工作流要做什么？",
    card: "工作流",
    shot: "workflow-idea-zh.png",
    expected: [
      "总结 PDF 并发邮件",
      "从 CSV 批量生成产品图",
      "把 YouTube 链接转成一篇博客文章"
    ],
    click: "总结 PDF 并发邮件"
  }
];

// The Inspiration group of the flow that is actually on screen: inactive
// workspace tabs stay mounted with `inert`, so the group whose closest inert
// ancestor is null is the active flow's.
async function activeInspiration(page) {
  return page.evaluate(() => {
    const groups = Array.from(document.querySelectorAll("[aria-label='灵感']"));
    const active = groups.filter(
      (g) => g.closest("[inert]") === null && g.getBoundingClientRect().height > 0
    );
    if (active.length === 0) return { index: -1, chips: [] };
    const group = active[0];
    return {
      index: groups.indexOf(group),
      chips: Array.from(group.querySelectorAll("button")).map((b) =>
        b.textContent?.trim()
      )
    };
  });
}

const browser = await chromium.launch();
const evidence = [];
const failures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 120)));

  for (const flow of FLOWS) {
    const result = { flow: flow.id, chipsZh: [], inserted: null, ok: false, note: "" };
    try {
      await page.goto("http://localhost:3100/workspace", {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      await page.waitForTimeout(7000);
      await page.evaluate(async () => {
        await window.__nodetoolI18n.change("zh-CN");
      });
      await page.waitForTimeout(800);
      // Dismiss the onboarding checklist if it covers the surface.
      const qa = page.locator("[aria-label='关闭快速上手清单']").first();
      if ((await qa.count()) > 0) {
        await qa.click({ force: true });
        await page.waitForTimeout(600);
      }
      // A previous flow left its tab open, so the reload restored it; go
      // Home first, then click the flow's card in the guided-flows grid.
      const home = page.locator("[aria-label='首页']").first();
      if ((await home.count()) > 0) {
        await home.click({ force: true });
        await page.waitForTimeout(1500);
      }
      const card = page
        .locator("[aria-label='引导创作流程'] button")
        .filter({ hasText: flow.card })
        .first();
      await card.waitFor({ state: "visible", timeout: 15000 });
      await card.click({ timeout: 15000 });

      // The flow's own step-1 headline proves the right flow is on screen.
      await page
        .getByText(flow.headline, { exact: true })
        .first()
        .waitFor({ state: "visible", timeout: 30000 });
      await page.waitForTimeout(800);
      const { index, chips } = await activeInspiration(page);
      result.chipsZh = chips;
      if (index === -1) {
        failures.push(`${flow.id}: no active Inspiration group found`);
      }
      for (const want of flow.expected) {
        if (!chips.some((c) => c === want)) {
          failures.push(`${flow.id}: missing zh chip "${want}"; got ${JSON.stringify(chips)}`);
        }
      }
      // 显示即所发: click a chip, then a textarea must hold that same text.
      const chip = page
        .locator("[aria-label='灵感']")
        .nth(index)
        .getByText(flow.click, { exact: true })
        .first();
      await chip.scrollIntoViewIfNeeded();
      await chip.click({ timeout: 15000 });
      await page.waitForTimeout(600);
      const values = await page.locator("textarea").evaluateAll((els) =>
        els.map((e) => e.value)
      );
      result.inserted = values.find((v) => v === flow.click) ?? null;
      if (result.inserted !== flow.click) {
        failures.push(
          `${flow.id}: inserted text != chip text; textareas=${JSON.stringify(values)}`
        );
      } else {
        result.ok = true;
      }
      await page.screenshot({ path: `${SHOTS}/${flow.shot}` });
    } catch (cause) {
      result.note = String(cause).split("\n")[0];
      failures.push(`${flow.id}: ${result.note}`);
      try {
        await page.screenshot({ path: `${SHOTS}/${flow.shot}` });
      } catch { /* page may be gone */ }
    }
    evidence.push(result);
    console.log(JSON.stringify(result));
  }
} finally {
  await browser.close();
}
console.log("\n==== ROUND-10 EVIDENCE ====");
console.log(JSON.stringify(evidence, null, 1));
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
console.log("\nALL FLOWS VERIFIED (display === inserted, zh)");
