/**
 * pixverse CLI transport — spawn the pinned official CLI
 * (`npx -y pixverse@1.4.3 <args…> --json`) behind the handwritten
 * confirm-node pair.
 *
 * Wire authority (L1): media-gen-mcp `src/providers/pixverse.ts` — pinned
 * 1.4.3 (pixverse.ts:69), `--json` appended to every invocation so stdout is
 * always JSON with errors/progress on stderr (pixverse.ts:217), exit codes
 * 0-7 (pixverse.ts:449-484, capabilities.json single table), task-id shapes
 * (pixverse.ts:488-505). Contract summary: director/research/01 §B.6.
 *
 * Deliberate deviations from L1 (scoped to this node pack, stated plainly):
 * - Bin resolution is simplified to `npx -y pixverse@1.4.3` only. L1 walks
 *   PIXVERSE_BIN → local node_modules/.bin → pinned npx (pixverse.ts:187-226)
 *   because media-gen-mcp also locks the CLI via optionalDependencies; this
 *   node pack ships no such lock, and a pinned npx invocation is the same
 *   deterministic form L1 uses as its own fallback (bare `npx pixverse` is
 *   forbidden there because npx re-resolves latest — same reasoning here).
 * - Windows: L1's transport only spawns Unix-shaped bins (research §B.6
 *   flags the defect). Here win32 spawns through `shell: true` so `npx`
 *   resolves to `npx.cmd`; `windowsHide` is set on every platform.
 * - `spawnPixverse` is the only process boundary and the only export the
 *   tests replace (vi.mock); every other function here is pure and stays
 *   real under test.
 */
import { spawn } from "node:child_process";
import type { SpawnOptions } from "node:child_process";
import { isAbortError, MediagenChannelError } from "../../mediagen-base.js";

/** L1 pixverse.ts:69 — pinned CLI version; upgrade is an explicit act there. */
export const PIXVERSE_PINNED_VERSION = "1.4.3";

/** Single-spawn hard cap (L1 SPAWN_TIMEOUT_MS, pixverse.ts:83). */
export const PIXVERSE_SPAWN_TIMEOUT_MS = 60_000;

/** Bounded capture: submit/status replies are small JSON documents. */
const STDOUT_CAP_CHARS = 256 * 1024;
const STDERR_CAP_CHARS = 8 * 1024;

type JsonRecord = Record<string, unknown>;

export interface PixverseSpawnResult {
  stdout: string;
  stderr: string;
  code: number;
}

export type PixverseRunResult =
  | { ok: true; payload: JsonRecord; recoveredFromTimeout?: boolean }
  | { ok: false; error: MediagenChannelError };

/** Full argv handed to `npx` (pinned package + `--json`, L1 pixverse.ts:217). */
export function buildPixverseArgs(args: readonly string[]): string[] {
  return ["-y", `pixverse@${PIXVERSE_PINNED_VERSION}`, ...args, "--json"];
}

/**
 * Raw spawn. Never called with billing arguments by tests — the node tests
 * vi.mock this export; the pure mapping in {@link parsePixverseRun} stays
 * real so exit-code semantics are still exercised.
 */
export async function spawnPixverse(
  args: readonly string[],
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<PixverseSpawnResult> {
  const timeoutMs = opts.timeoutMs ?? PIXVERSE_SPAWN_TIMEOUT_MS;
  const argv = buildPixverseArgs(args);
  // win32: `npx` is npx.cmd and is only reachable through a shell; L1's
  // Unix-only spawn shape is the documented Windows defect this fixes.
  const spawnOptions: SpawnOptions =
    process.platform === "win32"
      ? { shell: true, windowsHide: true, signal: opts.signal }
      : { windowsHide: true, signal: opts.signal };
  const child = spawn("npx", argv, spawnOptions);
  return new Promise<PixverseSpawnResult>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < STDOUT_CAP_CHARS) {
        stdout = (stdout + chunk.toString("utf8")).slice(0, STDOUT_CAP_CHARS);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < STDERR_CAP_CHARS) {
        stderr = (stderr + chunk.toString("utf8")).slice(0, STDERR_CAP_CHARS);
      }
    });
    child.once("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // An aborted caller signal surfaces here as Node's AbortError — reject
      // unchanged so cancellation keeps its semantics (mediagen-base passes
      // abort errors through untouched).
      if (isAbortError(error)) {
        reject(error);
        return;
      }
      reject(
        new MediagenChannelError("pixverse", "network", `failed to start the pixverse CLI: ${error.message}`),
      );
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new MediagenChannelError("pixverse", "timeout", `pixverse CLI exceeded ${Math.round(timeoutMs / 1000)}s and was killed`, true),
        );
        return;
      }
      resolve({ stdout, stderr, code: code ?? -1 });
    });
  });
}

/** L1 parity: first JSON object from mixed text (pixverse.ts:412-422). */
export function extractJson(text: string): JsonRecord | undefined {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as JsonRecord;
  } catch {
    // fall through to the brace scan
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as JsonRecord;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** L1 parity (video shapes): video_ids[], video_id, id, items[].video_id|id (pixverse.ts:488-505). */
export function collectTaskIds(obj: unknown): string[] {
  if (typeof obj !== "object" || obj === null) return [];
  const record = obj as JsonRecord;
  const ids: string[] = [];
  if (Array.isArray(record.video_ids)) ids.push(...record.video_ids.map(String));
  for (const key of ["video_id", "id"]) {
    if (record[key] != null) ids.push(String(record[key]));
  }
  if (Array.isArray(record.items)) {
    for (const item of record.items) {
      if (typeof item !== "object" || item === null) continue;
      for (const key of ["video_id", "id"]) {
        const value = (item as JsonRecord)[key];
        if (value != null) ids.push(String(value));
      }
    }
  }
  return [...new Set(ids)];
}

/** L1 parity: OAuth Authorize URL rides stderr in --json mode (pixverse.ts:425-428). */
function extractAuthorizeUrl(stderr: string): string | undefined {
  const match = /(https:\/\/app\.pixverse\.ai\/oauth\/authorize\?\S+)/i.exec(stderr ?? "");
  return match ? match[1] : undefined;
}

/** L1 parity: prefer the JSON error field, else a one-line stderr excerpt (pixverse.ts:443). */
function stderrExcerpt(stderr: string, errJson: JsonRecord | undefined): string {
  if (typeof errJson?.error === "string" && errJson.error) return errJson.error;
  const cleaned = (stderr ?? "")
    .trim()
    .split("\n")
    .filter((line) => !line.startsWith("npm "))
    .join(" ")
    .slice(0, 200);
  return cleaned || "(empty stderr)";
}

/**
 * Exit-code mapping — the single 0-7 table (L1 mapCliFailure, pixverse.ts:435-485):
 * 0 ok; 2 TIMEOUT with partial recovery when a task id already came back;
 * 3 AUTH; 4 QUOTA (not retryable); 5 generation failure with partial-batch
 * payloads as first-class results; 6 params; 7 CONCURRENCY (retryable,
 * account-scoped); 1/others generic with a 500047 task-not-found special.
 */
export function parsePixverseRun(result: PixverseSpawnResult): PixverseRunResult {
  if (result.code === 0) {
    const payload = extractJson(result.stdout);
    if (payload === undefined) {
      return {
        ok: false,
        error: new MediagenChannelError("pixverse", "result", `CLI exited 0 but stdout was not JSON: ${result.stdout.slice(0, 160)}`),
      };
    }
    return { ok: true, payload };
  }
  const out = extractJson(result.stdout);
  const errJson = extractJson(result.stderr);
  const message = stderrExcerpt(result.stderr, errJson);
  switch (result.code) {
    case 3: {
      // L1 pixverse.ts:456-463 — OAuth expiry has no silent refresh; surface
      // the stderr Authorize URL plus the re-login path.
      const url = extractAuthorizeUrl(result.stderr);
      return {
        ok: false,
        error: new MediagenChannelError(
          "pixverse",
          "auth",
          `authentication expired or invalid (CLI exit 3): ${message}` +
            `${url ? ` Authorize URL: ${url}` : ""}` +
            ` — re-login with \`npx -y pixverse@${PIXVERSE_PINNED_VERSION} auth login\` (30-day OAuth) or set PIXVERSE_ACCESS_KEY`,
        ),
      };
    }
    case 4:
      // L1 pixverse.ts:465 — credits/subscription exhausted: account-scoped, retrying now cannot help.
      return {
        ok: false,
        error: new MediagenChannelError("pixverse", "quota", `insufficient credits/subscription quota (CLI exit 4): ${message}`, false, true),
      };
    case 7:
      // L1 pixverse.ts:476 — concurrency slots full (Standard = 3): retryable,
      // and the deterministic idempotency key makes an identical re-run safe.
      return {
        ok: false,
        error: new MediagenChannelError(
          "pixverse",
          "quota",
          `concurrency limit reached (CLI exit 7): ${message} — retry after in-flight tasks finish; identical inputs reuse the same idempotency key`,
          true,
          true,
        ),
      };
    case 6:
      // L1 pixverse.ts:474 — parameter rejection, never retried.
      return {
        ok: false,
        error: new MediagenChannelError("pixverse", "params", `parameter validation failed (CLI exit 6): ${message}`),
      };
    case 2: {
      // L1 pixverse.ts:450-453 — the submit may have landed before the CLI's
      // own wait timed out; a task id in the payload recovers into polling.
      const payload = out ?? errJson;
      if (collectTaskIds(payload).length > 0) {
        return { ok: true, payload: { ...payload, __recoveredFromTimeout: true }, recoveredFromTimeout: true };
      }
      return {
        ok: false,
        error: new MediagenChannelError("pixverse", "result", `CLI wait timeout (exit 2): ${message} — the task may still be running; re-check with task status`),
      };
    }
    case 5: {
      // L1 pixverse.ts:466-471 — since 1.4.0 a partial batch can succeed;
      // items/failed_ids payloads are first-class results for the caller.
      const payload = out ?? errJson;
      if (payload && (Array.isArray(payload.items) || Array.isArray(payload.failed_ids))) {
        return { ok: true, payload };
      }
      return {
        ok: false,
        error: new MediagenChannelError("pixverse", "result", `generation failed (CLI exit 5): ${message}`),
      };
    }
    default: {
      // L1 pixverse.ts:478-483 — internal code 500047 = task gone.
      if (typeof errJson?.code === "number" && errJson.code === 500047) {
        return {
          ok: false,
          error: new MediagenChannelError("pixverse", "result", `task not found or no longer available (internal code 500047): ${message}`),
        };
      }
      return {
        ok: false,
        error: new MediagenChannelError("pixverse", "result", `CLI exited ${result.code}: ${message}`),
      };
    }
  }
}
