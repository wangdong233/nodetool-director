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
