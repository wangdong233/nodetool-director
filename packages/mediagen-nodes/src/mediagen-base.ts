/**
 * mediagen-base: secrets resolution, media input normalization, the single
 * channel-call choke point (executeMediagenCall — M4 budget gate mounts here),
 * polling, safe downloads and structured errors.
 */
import { detectImageMime, loadMediaRefBytes, safeFetch } from "@nodetool-ai/runtime";
import type { ProcessingContext } from "@nodetool-ai/runtime";
import type { MediaInput, PollResult } from "./adapters/types.js";

/** Structured channel error. `quota` marks account-level quota rejections. */
export class MediagenChannelError extends Error {
  constructor(
    readonly channel: string,
    readonly code: "auth" | "params" | "quota" | "network" | "timeout" | "result" | "api",
    message: string,
    readonly retryable = false,
    readonly quota = false,
    readonly status?: number,
  ) {
    super(`[${channel}] ${code}: ${message}`);
    this.name = "MediagenChannelError";
  }
}

/** Resolve required channel secrets: node secrets first, env fallback, hard fail listing all missing. */
export function getChannelSecrets(
  channel: string,
  requiredKeys: readonly string[],
  secrets: Record<string, string> | undefined,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of requiredKeys) {
    const value = secrets?.[key] || process.env[key] || "";
    if (!value.trim()) missing.push(key);
    else resolved[key] = value.trim();
  }
  if (missing.length > 0) throw new MediagenChannelError(channel, "auth", `missing required settings: ${missing.join(", ")}`);
  return resolved;
}

/** Optional secret lookup (env chain, no throw) — e.g. hfspaces HF_TOKEN. */
export function optionalSecret(secrets: Record<string, string>, key: string): string | undefined {
  const value = secrets[key] || process.env[key] || "";
  return value.trim() ? value.trim() : undefined;
}

function encodeDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

const FALLBACK_INPUT_MIME = "application/octet-stream";

/** Lazily normalize a NodeTool media ref into uri/bytes/dataUri forms. */
export function resolveMediaInput(ref: unknown, context: ProcessingContext | undefined): MediaInput {
  if (typeof ref !== "object" || ref === null || Array.isArray(ref)) {
    throw new Error("A media reference is required");
  }
  const record = ref as Record<string, unknown>;
  const uri = typeof record.uri === "string" && /^https:\/\//.test(record.uri) ? record.uri : null;
  let cached: Uint8Array | null = null;
  const loadBytes = async (): Promise<Uint8Array> => {
    if (cached) return cached;
    const bytes = await loadMediaRefBytes(record, context);
    if (!bytes || bytes.length === 0) throw new Error("Could not resolve media-gen media input");
    cached = bytes;
    return bytes;
  };
  return {
    uri,
    bytes: loadBytes,
    dataUri: async () => {
      const bytes = await loadBytes();
      return encodeDataUri(bytes, detectImageMime(bytes) || FALLBACK_INPUT_MIME);
    },
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || /abort/i.test(error.message));
}

/**
 * The single choke point every channel call passes through. Normalizes thrown
 * errors into MediagenChannelError (abort errors pass through untouched so
 * cancellation keeps its semantics). The M4 budget gate wraps this function;
 * node code never bypasses it.
 */
export async function executeMediagenCall<T>(
  channel: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof MediagenChannelError) throw error;
    if (isAbortError(error)) throw error;
    if (error instanceof TypeError) {
      throw new MediagenChannelError(channel, "network", String(error), true);
    }
    throw new MediagenChannelError(channel, "result", error instanceof Error ? error.message : String(error));
  }
}

/** Sleep that honors an abort signal (raises on cancel). */
export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Poll loop with deadline + cooperative cancellation. Adapters own status mapping. */
export async function pollUntilDone(
  channel: string,
  poll: () => Promise<PollResult>,
  options: { intervalMs: number; timeoutMs: number; signal?: AbortSignal },
): Promise<Exclude<PollResult, { status: "running" }>> {
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    const result = await poll();
    if (result.status !== "running") return result;
    if (Date.now() >= deadline) {
      throw new MediagenChannelError(channel, "timeout", `poll exceeded ${options.timeoutMs}ms`);
    }
    await sleepWithSignal(options.intervalMs, options.signal);
  }
}

/** Download a provider result URL through safeFetch (SSRF-screened) with backoff for billed outputs. */
export async function safeDownload(
  channel: string,
  url: string,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; mime?: string }> {
  const delays = [0, 1000, 4000];
  let lastError: unknown;
  for (const delay of delays) {
    if (delay > 0) await sleepWithSignal(delay, signal);
    try {
      const response = await safeFetch(url, { signal });
      if (!response.ok) {
        lastError = new MediagenChannelError(channel, "network", `download HTTP ${response.status}`, response.status >= 500 || response.status === 429);
        if (response.status >= 500 || response.status === 429) continue;
        throw lastError;
      }
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.length === 0) {
        lastError = new MediagenChannelError(channel, "result", "downloaded empty payload", true);
        continue;
      }
      return { bytes: buffer };
    } catch (error) {
      if (error instanceof MediagenChannelError && !error.retryable) throw error;
      if (isAbortError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new MediagenChannelError(channel, "network", "download failed after retries");
}

/** Image ref with raw base64 payload (packages/AGENTS.md media-ref contract). */
export function imageRefFromBytes(bytes: Uint8Array): { type: "image"; uri: string; data: string; content_type: string } {
  const mime = detectImageMime(bytes) || "image/png";
  return { type: "image", uri: "", data: Buffer.from(bytes).toString("base64"), content_type: mime };
}

/** Video ref aligned with the minimax precedent (no mime sniffing). */
export function videoRefFromBytes(bytes: Uint8Array): { type: "video"; uri: string; data: string } {
  return { type: "video", uri: "", data: Buffer.from(bytes).toString("base64") };
}

/** JSON helper that surfaces channel error bodies without throwing on non-JSON. */
export async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
