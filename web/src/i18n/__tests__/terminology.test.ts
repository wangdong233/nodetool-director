import { readFileSync } from "node:fs";
import { join } from "node:path";
import terminology from "../terminology.json";

// r30a contract: terminology.json is the machine-readable master table the
// 30b LQA batches correct against. Structural guarantees only (parseable,
// non-empty zh per entry, enum grades, glossary cross-link) — translation
// quality itself is judged by the LQA rounds, not here.

type Entry = {
  zh?: string;
  zh_by_domain?: Record<string, string>;
  domain?: string;
  grade?: string;
  note?: string;
  variants_seen?: unknown;
};

const GRADES = new Set(["A", "B", "C", "clean"]);

describe("terminology master table (r30a)", () => {
  const terms = (terminology as { terms: Record<string, Entry> }).terms;

  it("parses with a non-empty terms map", () => {
    expect(terms).toBeTruthy();
    expect(Object.keys(terms).length).toBeGreaterThanOrEqual(100);
  });

  it("every entry carries a non-empty zh or a fully non-empty zh_by_domain", () => {
    for (const [key, entry] of Object.entries(terms)) {
      const hasSingle = typeof entry.zh === "string" && entry.zh.length > 0;
      const hasDomain =
        entry.zh_by_domain !== undefined &&
        entry.zh_by_domain !== null &&
        typeof entry.zh_by_domain === "object" &&
        Object.keys(entry.zh_by_domain).length > 0 &&
        Object.values(entry.zh_by_domain).every(
          (z) => typeof z === "string" && z.length > 0
        );
      if (!hasSingle && !hasDomain) {
        throw new Error(`terminology "${key}" has no usable zh value`);
      }
      // Never both a bare zh and a domain map on one entry — ambiguous shape.
      if (hasSingle && hasDomain) {
        throw new Error(`terminology "${key}" carries both zh and zh_by_domain`);
      }
    }
  });

  it("every entry has a domain, a valid grade, a note, and a variants_seen array", () => {
    for (const [key, entry] of Object.entries(terms)) {
      expect(typeof entry.domain).toBe("string");
      expect((entry.domain as string).length).toBeGreaterThan(0);
      expect(GRADES.has(entry.grade as string)).toBe(true);
      expect(typeof entry.note).toBe("string");
      expect((entry.note as string).length).toBeGreaterThan(0);
      expect(Array.isArray(entry.variants_seen)).toBe(true);
      expect((entry.variants_seen as unknown[]).length).toBeGreaterThan(0);
      for (const v of entry.variants_seen as unknown[]) {
        expect(typeof v).toBe("string");
        expect((v as string).length).toBeGreaterThan(0);
      }
    }
  });

  it("keep_latin is a non-empty list of non-empty strings", () => {
    const keep = (terminology as { keep_latin: unknown[] }).keep_latin;
    expect(Array.isArray(keep)).toBe(true);
    expect(keep.length).toBeGreaterThanOrEqual(10);
    for (const v of keep) {
      expect(typeof v).toBe("string");
      expect((v as string).length).toBeGreaterThan(0);
    }
  });

  it("glossary.md cross-links terminology.json (discoverability contract)", () => {
    const glossary = readFileSync(
      join(__dirname, "..", "glossary.md"),
      "utf-8"
    );
    expect(glossary).toContain("terminology.json");
  });
});
