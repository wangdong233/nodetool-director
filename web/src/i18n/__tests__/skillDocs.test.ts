/**
 * r31b skill-body overlay — file contract tests.
 *
 * The zh translations in `locales/zh-CN/skillDocs/<slug>.md` are a display
 * overlay over the shipped SKILL.md bodies (agent instruction source stays
 * English on disk). These tests mechanically hold the overlay honest:
 *
 *  1. SUBSET — every doc slug must be a catalog `skills` key, so a skill that
 *     is renamed or removed upstream orphans its translation loudly instead
 *     of shipping dead weight.
 *  2. BODY — non-empty, and frontmatter-free: name/description already ship
 *     in the catalog overlay, and a leading `---` would parse as frontmatter.
 *  3. FIDELITY — against the English source body (r30 lesson: a styles block
 *     once shipped with opposite, fabricated content): the heading-level
 *     sequence must match paragraph-for-paragraph, the code-fence count must
 *     match, and every English inline `code` token (node types, parameter
 *     names, file names — the verbatim-preserved vocabulary) must appear in
 *     the translation. Missing or reordered structure is a finding, not a
 *     style nit.
 *  4. LANGUAGE — the prose must actually be Chinese (a mis-pasted English
 *     file would otherwise pass the structural checks).
 *
 * The checker is a pure function over directories so the failure modes are
 * prove-failed against deliberately invalid fixture trees before the real
 * tree is asserted clean. An absent docs directory is valid (the mechanism
 * ships before the first translation batch); only files that EXIST are
 * checked — the rollout is progressive by design.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import catalogZh from "../locales/zh-CN/catalog.json";

const webRoot = resolve(__dirname, "../../..");
const repoRoot = resolve(webRoot, "..");
const REAL_DOCS_DIR = join(webRoot, "src/i18n/locales/zh-CN/skillDocs");
const REAL_EN_SOURCES_DIR = join(repoRoot, "packages/system-skills");

/** The zh catalog skills block keys — the slugs a doc file may carry. */
const realCatalogSkills = Object.keys(
  (catalogZh as { skills: Record<string, unknown> }).skills
);

interface CheckContext {
  docsDir: string;
  catalogSkills: string[];
  enSourcesDir: string;
}

/** Strip YAML frontmatter and split the body into prose lines vs fenced blocks. */
function splitBody(text: string): { proseLines: string[]; fenceLines: number } {
  const lines = text.split(/\r?\n/);
  let start = 0;
  if (lines[0] === "---") {
    const close = lines.indexOf("---", 1);
    if (close !== -1) start = close + 1;
  }
  const proseLines: string[] = [];
  let fenceLines = 0;
  let inFence = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      fenceLines++;
      inFence = !inFence;
      continue;
    }
    if (!inFence) proseLines.push(line);
  }
  return { proseLines, fenceLines };
}

function headingLevels(proseLines: string[]): number[] {
  return proseLines
    .map((line) => /^(#{1,6})\s/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1].length);
}

function inlineCodeTokens(proseLines: string[]): string[] {
  // Pair backticks over the JOINED prose, not per line: an English inline code
  // span may wrap across source lines (`he sets\nthe case down…`), and a
  // per-line regex then pairs the closing tick of the wrapped span with the
  // opening tick of the next span — extracting the gap BETWEEN two real code
  // spans as a phantom token (caught on short-film at birth). Document-wide
  // sequential pairing keeps every real span intact; spans that themselves
  // contain a newline are skipped by the caller rather than guessed.
  const tokens: string[] = [];
  for (const m of proseLines.join("\n").matchAll(/`([^`]+)`/g)) {
    tokens.push(m[1]);
  }
  return tokens;
}

function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, " ");
}

/** CJK share of non-whitespace prose characters. */
function cjkRatio(proseLines: string[]): number {
  const prose = proseLines.join("").replace(/\s/g, "");
  if (!prose) return 0;
  const cjk = prose.match(/[一-鿿　-〿＀-￯]/g)?.length ?? 0;
  return cjk / prose.length;
}

/**
 * Pure contract checker: returns one finding string per violation in the
 * docs directory. Missing directory → no docs → no findings (valid state).
 */
function collectSkillDocIssues(ctx: CheckContext): string[] {
  const issues: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(ctx.docsDir).filter((e) => e.endsWith(".md")).sort();
  } catch {
    return issues;
  }
  for (const entry of entries) {
    const slug = entry.slice(0, -3);
    const tag = `${slug}: `;
    if (!ctx.catalogSkills.includes(slug)) {
      issues.push(`ORPHAN ${tag}not a catalog skills key`);
      continue;
    }
    const zhRaw = readFileSync(join(ctx.docsDir, entry), "utf8");
    const zhText = zhRaw.trim();
    if (!zhText) {
      issues.push(`EMPTY ${tag}body is empty`);
      continue;
    }
    if (zhText.split(/\r?\n/)[0] === "---") {
      issues.push(`FRONTMATTER ${tag}frontmatter is forbidden (name/description live in the catalog overlay)`);
      continue;
    }
    const enPath = join(ctx.enSourcesDir, slug, "SKILL.md");
    let enRaw: string;
    try {
      enRaw = readFileSync(enPath, "utf8");
    } catch {
      issues.push(`NO_EN_SOURCE ${tag}no packages/system-skills/${slug}/SKILL.md to translate`);
      continue;
    }
    const en = splitBody(enRaw);
    const zh = splitBody(zhRaw);
    const enHeadings = headingLevels(en.proseLines);
    const zhHeadings = headingLevels(zh.proseLines);
    if (enHeadings.join(",") !== zhHeadings.join(",")) {
      issues.push(`HEADINGS ${tag}level sequence [${enHeadings}] → zh [${zhHeadings}] — a paragraph was dropped, added, or fabricated`);
    }
    if (en.fenceLines !== zh.fenceLines) {
      issues.push(`FENCES ${tag}${en.fenceLines} fence lines in en vs ${zh.fenceLines} in zh — a code block was dropped or added`);
    }
    const zhFlat = normalizeSpace(zhText);
    for (const token of inlineCodeTokens(en.proseLines)) {
      if (token.length > 48 || /\n/.test(token)) continue; // wrapped mega-spans are skipped, not guessed
      if (!zhFlat.includes(normalizeSpace(token))) {
        issues.push(`TOKEN ${tag}verbatim inline code \`${token}\` missing from the translation`);
      }
    }
    const ratio = cjkRatio(zh.proseLines);
    if (ratio < 0.2) {
      issues.push(`NOT_ZH ${tag}prose is only ${(ratio * 100).toFixed(1)}% CJK — this does not look like a translation`);
    }
  }
  return issues;
}

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const target = join(root, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

describe("skillDocs file contract — failure modes (prove-fail fixtures)", () => {
  let fixtureRoot: string;

  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(__dirname, "skilldocs-fixture-"));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("reports every deliberate violation, and nothing else", () => {
    const catalogSkills = [
      "valid-one",
      "ghost",
      "misaligned",
      "tokendrop",
      "englishonly",
      "emptyone",
      "frontone"
    ];
    writeTree(fixtureRoot, {
      // The English sources the fidelity checks translate against.
      "en/valid-one/SKILL.md":
        "---\nname: valid-one\ndescription: d\n---\n# Title\n\nUse `nodetool.video.Trim` here.\n\n```js\nconst x = 1;\n```\n\n## Section\n中文译文段落在另一份文件里。\n",
      "en/misaligned/SKILL.md":
        "---\nname: misaligned\ndescription: d\n---\n## One\n\nProse.\n\n### Two\n\nMore.\n",
      "en/tokendrop/SKILL.md":
        "---\nname: tokendrop\ndescription: d\n---\n# T\n\nKeep `find_model` and `memory_save` inline.\n",
      "en/englishonly/SKILL.md":
        "---\nname: englishonly\ndescription: d\n---\n# T\n\nAll English source.\n",
      // The docs directory under test.
      "docs/valid-one.md":
        "# 标题\n\n这里使用 `nodetool.video.Trim`。\n\n```js\nconst x = 1;\n```\n\n## 小节\n译文正文，全角标点。\n",
      "docs/orphan.md": "# 没有对应技能\n\n这段不该存在。\n",
      "docs/ghost.md": "# 幽灵\n\n目录里没有这个技能的英文源。\n",
      "docs/misaligned.md": "## 一\n\n译文。\n\n## 二\n\n另一段。\n",
      "docs/tokendrop.md": "# 标题\n\n两个内联代码记号都丢了。\n",
      "docs/englishonly.md": "# Title\n\nEntirely English prose, no translation at all.\n",
      "docs/emptyone.md": "   \n",
      "docs/frontone.md": "---\nname: frontone\n---\n\n正文。\n"
    });
    const issues = collectSkillDocIssues({
      docsDir: join(fixtureRoot, "docs"),
      catalogSkills,
      enSourcesDir: join(fixtureRoot, "en")
    });
    expect(issues).toHaveLength(8);
    expect(issues.some((i) => i.startsWith("ORPHAN orphan:"))).toBe(true);
    expect(issues.some((i) => i.startsWith("NO_EN_SOURCE ghost:"))).toBe(true);
    expect(issues.some((i) => i.startsWith("HEADINGS misaligned:"))).toBe(true);
    expect(issues.some((i) => i.startsWith("TOKEN tokendrop:"))).toBe(true);
    expect(issues.some((i) => i.startsWith("TOKEN tokendrop:") && i.includes("memory_save"))).toBe(true);
    expect(issues.some((i) => i.startsWith("NOT_ZH englishonly:"))).toBe(true);
    expect(issues.some((i) => i.startsWith("EMPTY emptyone:"))).toBe(true);
    expect(issues.some((i) => i.startsWith("FRONTMATTER frontone:"))).toBe(true);
    // The one valid doc produced no finding.
    expect(issues.every((i) => !i.startsWith("ORPHAN valid-one:") && !i.includes("valid-one"))).toBe(true);
  });

  it("an absent docs directory is a valid (empty) overlay", () => {
    expect(
      collectSkillDocIssues({
        docsDir: join(fixtureRoot, "does-not-exist"),
        catalogSkills: ["valid-one"],
        enSourcesDir: join(fixtureRoot, "en")
      })
    ).toEqual([]);
  });
});

describe("skillDocs file contract — the real tree", () => {
  it("every shipped translation satisfies subset, body, fidelity, and language", () => {
    expect(realCatalogSkills.length).toBeGreaterThan(0);
    const issues = collectSkillDocIssues({
      docsDir: REAL_DOCS_DIR,
      catalogSkills: realCatalogSkills,
      enSourcesDir: REAL_EN_SOURCES_DIR
    });
    expect(issues).toEqual([]);
  });

  it("the zh catalog skills keys match the shipped system-skills directories", () => {
    // The subset check anchors on the catalog; if the catalog itself drifted
    // from the packages/system-skills directory set, translations could be
    // silently unkeyable. Pin the two sets to each other.
    const shipped = readdirSync(REAL_EN_SOURCES_DIR, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() &&
          existsSync(join(REAL_EN_SOURCES_DIR, d.name, "SKILL.md"))
      )
      .map((d) => d.name)
      .sort();
    expect(realCatalogSkills.slice().sort()).toEqual(shipped);
  });
});
