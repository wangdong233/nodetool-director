/**
 * Per-channel budget gate: concurrency semaphores + daily call budgets.
 *
 * Every mediagen channel call passes through acquireChannelSlot before it
 * reaches the network (mediagen-base.executeMediagenCall). Defaults encode the
 * account-level quotas that are invisible per-process: hfspaces ZeroGPU is
 * serialized (maxConcurrent 1) because its GPU accounting is per account.
 *
 * Configuration (env): the daily limit is re-read on every acquire; the
 * concurrency capacity is resolved at the FIRST acquire per channel and
 * memoized — changing MEDIAGEN_MAX_CONCURRENT_<CHANNEL> on a running server
 * is a no-op until restart (tests reset via resetBudgetGate).
 *   MEDIAGEN_MAX_CONCURRENT_<CHANNEL>   max in-flight calls (0/absent = unlimited)
 *   MEDIAGEN_DAILY_LIMIT_<CHANNEL>      max calls per calendar day (0/absent = unlimited)
 * Daily counters persist to one small JSON file (atomic tmp+rename), reset on
 * date rollover. Override the path with MEDIAGEN_BUDGET_STATE_PATH (tests).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { MediagenChannelError } from "./mediagen-base.js";

interface BudgetState {
  date: string;
  counts: Record<string, number>;
}

const DEFAULT_MAX_CONCURRENT: Record<string, number> = {
  // ZeroGPU quota is accounted per HF account — serialize hfspaces globally.
  hfspaces: 1,
  // Gemini web is a single-page UI drive with one live session (S303):
  // serialize so a second node cannot navigate away from an unconsumed
  // video's result page (director/channels/92 §2).
  gemini: 1,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function statePath(): string {
  const override = process.env.MEDIAGEN_BUDGET_STATE_PATH;
  if (override) return override;
  const home = process.env.HOME || tmpdir();
  return join(home, ".local", "share", "nodetool", "mediagen-budget.json");
}

let cachedState: BudgetState | null = null;

function loadState(): BudgetState {
  if (cachedState && cachedState.date === today()) return cachedState;
  let parsed: BudgetState = { date: today(), counts: {} };
  try {
    const path = statePath();
    if (existsSync(path)) {
      parsed = JSON.parse(readFileSync(path, "utf8")) as BudgetState;
      if (parsed.date !== today()) parsed = { date: today(), counts: {} };
    }
  } catch {
    // Unreadable/corrupt state reads as a fresh day rather than blocking calls.
    parsed = { date: today(), counts: {} };
  }
  cachedState = parsed;
  return cachedState;
}

function persistState(state: BudgetState): void {
  const path = statePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp-${process.pid}-${Date.now().toString(36)}`;
    writeFileSync(tmp, JSON.stringify(state));
    renameSync(tmp, path);
  } catch {
    // Persistence is durability/observability, not gate correctness — the
    // in-memory counter already incremented.
  }
}

function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
}

function channelConfig(channel: string): { maxConcurrent?: number; dailyLimit?: number } {
  const upper = channel.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return {
    maxConcurrent: envNumber(`MEDIAGEN_MAX_CONCURRENT_${upper}`) ?? DEFAULT_MAX_CONCURRENT[channel],
    dailyLimit: envNumber(`MEDIAGEN_DAILY_LIMIT_${upper}`),
  };
}

/** FIFO semaphore with optional capacity. Capacity undefined/0 = unbounded. */
class FifoSemaphore {
  private active = 0;
  private waiters: Array<() => void> = [];

  constructor(private readonly capacity?: number) {}

  async acquire(): Promise<() => void> {
    if (this.capacity === undefined || this.capacity <= 0 || this.active < this.capacity) {
      this.active++;
      return this.makeRelease();
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
    return this.makeRelease();
  }

  private makeRelease(): () => void {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.active--;
      this.waiters.shift()?.();
    };
  }
}

const semaphores = new Map<string, FifoSemaphore>();
const inFlight = new Map<string, number>();

export interface ChannelSlot {
  release: () => void;
}

async function acquireSlot(channel: string): Promise<ChannelSlot> {
  const { maxConcurrent, dailyLimit } = channelConfig(channel);
  let semaphore = semaphores.get(channel);
  if (!semaphore) {
    semaphore = new FifoSemaphore(maxConcurrent);
    semaphores.set(channel, semaphore);
  }
  const release = await semaphore.acquire();
  // Check+increment must be one await-free synchronous stretch: with an await
  // between them, N concurrent callers can all pass the check before any
  // increments, admitting up to limit+N-1 (final-review Y2). Past this point
  // the JS event loop cannot interleave until persistState returns.
  const state = loadState();
  if (dailyLimit !== undefined && dailyLimit > 0) {
    const used = state.counts[channel] ?? 0;
    if (used >= dailyLimit) {
      release();
      throw new MediagenChannelError(
        channel,
        "quota",
        `daily limit reached: ${used}/${dailyLimit} calls today (resets at midnight UTC or raise MEDIAGEN_DAILY_LIMIT_${channel.toUpperCase()})`,
        false,
        true,
      );
    }
  }
  // Count at admission: an admitted call consumes the day's budget even if the
  // provider later fails — same accounting media-gen-mcp applies to credits.
  state.counts[channel] = (state.counts[channel] ?? 0) + 1;
  persistState(state);
  inFlight.set(channel, (inFlight.get(channel) ?? 0) + 1);
  let released = false;
  return {
    release: () => {
      if (released) return;
      released = true;
      inFlight.set(channel, Math.max(0, (inFlight.get(channel) ?? 1) - 1));
      release();
    },
  };
}

/** Test seam: current in-flight count for a channel. */
export function inFlightCount(channel: string): number {
  return inFlight.get(channel) ?? 0;
}

/** Test seam: today's admitted call count for a channel. */
export function admittedToday(channel: string): number {
  return loadState().counts[channel] ?? 0;
}

/** Test seam: drop cached state + semaphores (between tests). */
export function resetBudgetGate(): void {
  cachedState = null;
  semaphores.clear();
  inFlight.clear();
}

export const acquireChannelSlot = acquireSlot;
