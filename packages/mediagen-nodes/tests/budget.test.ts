import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import {
  acquireChannelSlot,
  admittedToday,
  inFlightCount,
  MediagenChannelError,
  resetBudgetGate,
} from "../src/index.js";

// Config provenance: M4 design (director/03-M3方案 §3 M4 预埋 + iterations/01)
// — hfspaces defaults to maxConcurrent 1 (ZeroGPU per-account accounting),
// every other channel unlimited unless MEDIAGEN_* env raises a cap.

beforeEach(() => {
  resetBudgetGate();
  // Same worker shares the state file across tests — reset it too, not just
  // the in-memory cache (the gate itself must keep reading it back).
  writeFileSync(process.env.MEDIAGEN_BUDGET_STATE_PATH!, JSON.stringify({ date: new Date().toISOString().slice(0, 10), counts: {} }));
});

afterEach(() => {
  delete process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU;
  delete process.env.MEDIAGEN_DAILY_LIMIT_ZHIPU;
  delete process.env.MEDIAGEN_MAX_CONCURRENT_HFSPACES;
});

describe("mediagen budget gate", () => {
  it("admits unlimited concurrent calls for unconfigured channels", async () => {
    const slots = await Promise.all([acquireChannelSlot("zhipu"), acquireChannelSlot("zhipu"), acquireChannelSlot("zhipu")]);
    expect(inFlightCount("zhipu")).toBe(3);
    for (const slot of slots) slot.release();
    expect(inFlightCount("zhipu")).toBe(0);
  });

  it("serializes hfspaces to one in-flight call by default", async () => {
    const first = await acquireChannelSlot("hfspaces");
    let secondResolved = false;
    const secondPromise = acquireChannelSlot("hfspaces").then((slot) => {
      secondResolved = true;
      return slot;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(secondResolved).toBe(false);
    expect(inFlightCount("hfspaces")).toBe(1);
    first.release();
    const second = await secondPromise;
    expect(secondResolved).toBe(true);
    second.release();
  });

  it("serializes gemini to one in-flight call by default (single-page UI drive)", async () => {
    // The image path creates no session, so this semaphore is the only
    // in-process guard keeping a second concurrent image node from
    // navigating /app away from a generating image (video has S303).
    const first = await acquireChannelSlot("gemini");
    let secondResolved = false;
    const secondPromise = acquireChannelSlot("gemini").then((slot) => {
      secondResolved = true;
      return slot;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(secondResolved).toBe(false);
    expect(inFlightCount("gemini")).toBe(1);
    first.release();
    const second = await secondPromise;
    expect(secondResolved).toBe(true);
    second.release();
  });

  it("honors MEDIAGEN_MAX_CONCURRENT_<CHANNEL> for an otherwise-unbounded channel (R11 Y3)", async () => {
    process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU = "1"; // zhipu has NO built-in default
    resetBudgetGate();
    const first = await acquireChannelSlot("zhipu");
    let secondResolved = false;
    const secondPromise = acquireChannelSlot("zhipu").then((slot) => {
      secondResolved = true;
      return slot;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(secondResolved).toBe(false); // env knob actually applies
    first.release();
    (await secondPromise).release();
    delete process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU;
    resetBudgetGate();
  });

  it("treats a non-numeric MEDIAGEN_MAX_CONCURRENT value as unset (R12 Y2)", async () => {
    // If the Number.isFinite guard regressed to Math.trunc(Number(raw)),
    // "abc" → NaN capacity parks every caller forever — a silent full-channel
    // deadlock. Unset must mean unlimited: two concurrent admissions proceed.
    process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU = "abc";
    resetBudgetGate();
    const a = await acquireChannelSlot("zhipu");
    const b = await acquireChannelSlot("zhipu");
    expect(inFlightCount("zhipu")).toBe(2);
    a.release();
    b.release();
    delete process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU;
    resetBudgetGate();
  });

  it("keeps a built-in default when the env value is garbage (R13 Y1)", async () => {
    // On a defaulted channel, "garbage treated as unset" vs "treated as 0"
    // differ: unset must fall back to the BUILT-IN default (1), not unlimited
    // — this is the S303 backstop for gemini/hfspaces.
    process.env.MEDIAGEN_MAX_CONCURRENT_HFSPACES = "abc";
    resetBudgetGate();
    const first = await acquireChannelSlot("hfspaces");
    let secondResolved = false;
    const secondPromise = acquireChannelSlot("hfspaces").then((slot) => {
      secondResolved = true;
      return slot;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(secondResolved).toBe(false); // built-in default 1 still enforced
    first.release();
    (await secondPromise).release();
    delete process.env.MEDIAGEN_MAX_CONCURRENT_HFSPACES;
    resetBudgetGate();
  });

  it("reads a corrupt state file as a fresh day instead of rejecting every call (R14 Y2)", async () => {
    const corruptPath = process.env.MEDIAGEN_BUDGET_STATE_PATH!;
    require("node:fs").writeFileSync(corruptPath, "{not json");
    resetBudgetGate();
    const slot = await acquireChannelSlot("zhipu"); // must not throw SyntaxError
    expect(inFlightCount("zhipu")).toBe(1);
    slot.release();
  });

  it("admits calls even when the state file cannot be persisted (R14 Y2)", async () => {
    // Unwritable parent dir: persistence is observability, not gate
    // correctness. Restore the path — the file-level beforeEach re-seeds it.
    const originalPath = process.env.MEDIAGEN_BUDGET_STATE_PATH;
    process.env.MEDIAGEN_BUDGET_STATE_PATH = "/definitely-not-writable-root/nodetool-x/state.json";
    try {
      resetBudgetGate();
      const slot = await acquireChannelSlot("zhipu");
      slot.release();
    } finally {
      process.env.MEDIAGEN_BUDGET_STATE_PATH = originalPath;
      resetBudgetGate();
    }
  });

  it("treats a negative MEDIAGEN_MAX_CONCURRENT value as unset on a defaulted channel (R17 Y2)", async () => {
    // Dropping the `value >= 0` half would make "-1" → capacity -1 →
    // unbounded, silently disarming the gemini serialization on a typo.
    process.env.MEDIAGEN_MAX_CONCURRENT_GEMINI = "-1";
    resetBudgetGate();
    const first = await acquireChannelSlot("gemini");
    let secondResolved = false;
    const secondPromise = acquireChannelSlot("gemini").then((slot) => {
      secondResolved = true;
      return slot;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(secondResolved).toBe(false); // built-in default 1 still enforced
    first.release();
    (await secondPromise).release();
    delete process.env.MEDIAGEN_MAX_CONCURRENT_GEMINI;
    resetBudgetGate();
  });

  it("treats MEDIAGEN_MAX_CONCURRENT=0 as unlimited, not as a total deadlock (R18 Y4)", { timeout: 5000 }, async () => {
    // 0 is the documented "unlimited" value; dropping the capacity<=0 clause
    // parks every caller forever. The mutant makes this test time out red.
    process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU = "0";
    resetBudgetGate();
    const a = await acquireChannelSlot("zhipu");
    const b = await acquireChannelSlot("zhipu");
    expect(inFlightCount("zhipu")).toBe(2);
    a.release();
    b.release();
    delete process.env.MEDIAGEN_MAX_CONCURRENT_ZHIPU;
    resetBudgetGate();
  });

  it("releases the semaphore slot when the daily limit rejects (no permanent jam, R20 Y1)", { timeout: 5000 }, async () => {
    // The limit check runs AFTER acquire(); dropping the release() would
    // park every later call on capacity-1 channels for the process lifetime
    // — even after UTC rollover.
    process.env.MEDIAGEN_DAILY_LIMIT_HFSPACES = "1";
    resetBudgetGate();
    const first = await acquireChannelSlot("hfspaces"); // admits and counts 1/1
    first.release();
    await expect(acquireChannelSlot("hfspaces")).rejects.toThrow(/daily limit/);
    delete process.env.MEDIAGEN_DAILY_LIMIT_HFSPACES; // NO resetBudgetGate: the live gate must not be jammed
    const after = await acquireChannelSlot("hfspaces"); // would hang if the rejection leaked the slot
    after.release();
    resetBudgetGate();
  });

  it("enforces the configured daily limit with a structured quota error", async () => {
    process.env.MEDIAGEN_DAILY_LIMIT_ZHIPU = "2";
    resetBudgetGate();
    const a = await acquireChannelSlot("zhipu");
    a.release();
    const b = await acquireChannelSlot("zhipu");
    b.release();
    await expect(acquireChannelSlot("zhipu")).rejects.toThrow(MediagenChannelError);
    try {
      await acquireChannelSlot("zhipu");
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError.code).toBe("quota");
      expect(channelError.quota).toBe(true);
      expect(channelError.message).toContain("daily limit reached: 2/2");
    }
  });

  it("holds the daily limit under a concurrent burst (final-review Y2)", async () => {
    process.env.MEDIAGEN_DAILY_LIMIT_ZHIPU = "2";
    resetBudgetGate();
    writeFileSync(process.env.MEDIAGEN_BUDGET_STATE_PATH!, JSON.stringify({ date: new Date().toISOString().slice(0, 10), counts: {} }));
    const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => acquireChannelSlot("zhipu")));
    const admitted = attempts.filter((r) => r.status === "fulfilled");
    const rejected = attempts.filter((r) => r.status === "rejected");
    expect(admitted.length).toBe(2);
    expect(rejected.length).toBe(18);
    expect(admittedToday("zhipu")).toBe(2);
    for (const r of admitted) r.value.release();
  });

  it("counts admissions and persists them to the state file", async () => {
    const slot = await acquireChannelSlot("agnes");
    slot.release();
    expect(admittedToday("agnes")).toBe(1);
    const state = JSON.parse(readFileSync(process.env.MEDIAGEN_BUDGET_STATE_PATH!, "utf8")) as {
      date: string;
      counts: Record<string, number>;
    };
    expect(state.counts.agnes).toBe(1);
    expect(state.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it("resets the day's counters on date rollover", async () => {
    const slot = await acquireChannelSlot("agnes");
    slot.release();
    expect(admittedToday("agnes")).toBe(1);
    // Simulate a stale file from yesterday: next load must start fresh.
    resetBudgetGate();
    writeFileSync(
      process.env.MEDIAGEN_BUDGET_STATE_PATH!,
      JSON.stringify({ date: "2000-01-01", counts: { agnes: 99 } }),
    );
    expect(admittedToday("agnes")).toBe(0);
  });

  it("releases the semaphore slot when the wrapped call throws", async () => {
    process.env.MEDIAGEN_MAX_CONCURRENT_HFSPACES = "1";
    resetBudgetGate();
    const { executeMediagenCall } = await import("../src/index.js");
    await expect(
      executeMediagenCall("hfspaces", async () => {
        throw new TypeError("fetch failed");
      }),
    ).rejects.toThrow(/fetch failed/);
    expect(inFlightCount("hfspaces")).toBe(0);
    // The slot came back — a second call must be admitted.
    await expect(executeMediagenCall("hfspaces", async () => "ok")).resolves.toBe("ok");
  });
});
