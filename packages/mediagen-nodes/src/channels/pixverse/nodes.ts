/**
 * pixverse handwritten billing-confirm node pair (NOT manifest-factory nodes).
 *
 * Wire authority (L1): media-gen-mcp `src/providers/pixverse.ts` —
 * `create video --prompt --model --idempotency-key --no-wait
 * [--duration --quality --aspect-ratio --image --seed --audio|--no-audio]`,
 * `task status <id> --type video`, `account info` (pixverse.ts:761-798,
 * 1227-1233); status machine done=1 / retry={5,9,10} / failed={7,8} with the
 * 2/5/10s poll ladder (pixverse.ts:73-77, 1286-1316). Contract summary:
 * director/research/01 §B.6.
 *
 * Pair semantics (honest v1, stated plainly):
 * - Submit NEVER runs a billing command. It reads the balance, estimates from
 *   the L1 static rate table (ledger-first estimation from L1 is out of scope
 *   here — this pack has no cross-process ledger) and mints a confirm token.
 * - The token is `pvc.<issuedAtMs36>.<random16hex>` with NO signature. L1's
 *   gate mints an HMAC-signed pvc1 token bound to a params digest and persists
 *   single-use consumption (pixverse.ts:875-944) because both halves travel
 *   through one long-lived provider process that must defend the same token
 *   across calls. Here Submit and Confirm are separate workflow nodes in the
 *   same process, so the token only proves "the estimate was shown and
 *   approved within the TTL" — a signature adds nothing the minter itself
 *   could not forge anyway. Consequences kept visible instead of papered
 *   over: Confirm executes with ITS OWN params (the token is an approval +
 *   TTL gate, not a params binding — wire Submit's paramsDigest upstream or
 *   re-enter identical params), and a token can be pasted into several
 *   Confirm runs (no single-use ledger; billing safety comes from the
 *   deterministic idempotency key below instead).
 * - The idempotency key is sha256(token + canonical params) — deterministic,
 *   so an exit-7 (concurrency) or timeout retry of Confirm with the same
 *   inputs reuses the same CLI idempotency key. L1 instead retries in-process
 *   with 5/10/20s backoffs reusing one key (pixverse.ts:1246-1268); the
 *   deterministic key makes the workflow-level retry equivalent.
 */
import crypto from "node:crypto";
import { BaseNode, prop } from "@nodetool-ai/node-sdk";
import type { NodeClass } from "@nodetool-ai/node-sdk";
import type { ProcessingContext } from "@nodetool-ai/runtime";
import { collectTaskIds, parsePixverseRun, spawnPixverse } from "./cli.js";
import type { PixverseRunResult } from "./cli.js";
import { MediagenChannelError, safeDownload, sleepWithSignal, videoRefFromBytes } from "../../mediagen-base.js";

type Context = ProcessingContext & {
  storage?: { store?: (key: string, bytes: Uint8Array, mime?: string) => Promise<string> };
};
type SpawnOpts = { signal?: AbortSignal; timeoutMs?: number };

// ── Static wire constants (L1-sourced; the node subset, not the full catalog) ──

/** ~6 mainstream ids from the L1 video catalog (pixverse.ts:258-264, 25 models). */
export const PIXVERSE_VIDEO_MODELS: string[] = [
  "v6",
  "pixverse-c1",
  "seedance-2.5",
  "minimax-h3",
  "kling-3.0-pro",
  "veo-3.1-lite",
];

/** L1 static-rate quality keys 360/540/720/1080 (pixverse.ts:296-299); the mainstream CLI enum has no 480p (pixverse.ts:1186). */
export const PIXVERSE_VIDEO_QUALITIES: string[] = ["360p", "540p", "720p", "1080p"];

/** 4 common ratios — subset of the L1 aspect table (pixverse.ts:403). */
export const PIXVERSE_ASPECT_RATIOS: string[] = ["16:9", "9:16", "1:1", "4:3"];

/** L1 provider default model (pixverse.ts:1172). */
const DEFAULT_MODEL = "v6";
/** L1 videoConstraints default = 5s × 24fps (pixverse.ts:627-633); CLI range 1-15s (v6 full range). */
const DEFAULT_DURATION_SECONDS = 5;
const DEFAULT_QUALITY = "720p";
const DEFAULT_ASPECT_RATIO = "16:9";

/** L1 DEFAULT_CONFIRM_TTL_MS (pixverse.ts:81) — surfaced as expiresInSeconds: 600. */
const CONFIRM_TTL_MS = 600_000;
const CONFIRM_TTL_SECONDS = Math.round(CONFIRM_TTL_MS / 1000);

/** L1 poll ladder "2s,5s,10s" (pixverse.ts:73) and status machine (pixverse.ts:75-77). */
const POLL_INTERVALS_MS = [2_000, 5_000, 10_000];
const POLL_CAP_MS = 900_000;
const STATUS_DONE = 1;
const STATUS_FAILED = new Set([7, 8]);

/** Account-info spawn budget (L1 accountInfo, pixverse.ts:763). */
const ACCOUNT_INFO_TIMEOUT_MS = 30_000;

/**
 * Static first estimate — ported verbatim from L1 staticVideoRates
 * (pixverse.ts:294-304): [silent, withAudio] credits/second. Only the two
 * native models have published rates; everything else estimates "unknown"
 * (missing ≠ free — L1's own rule).
 */
const STATIC_VIDEO_RATES: Record<string, Record<string, [number, number]>> = {
  v6: { "360": [4, 7], "540": [7, 9], "720": [9, 12], "1080": [18, 23] },
  "pixverse-c1": { "360": [6, 8], "540": [8, 10], "720": [10, 13], "1080": [19, 24] },
};

/**
 * Credits estimate. This node always submits `--audio` (the field set has no
 * audio switch and L1's default is audio-on, pixverse.ts:1214), so the
 * conservative with-audio rate (pair[1]) is the honest number — the same
 * choice L1's staticVideoRates makes.
 */
function estimateVideoCredits(model: string, quality: string, durationSeconds: number): number | null {
  const perModel = STATIC_VIDEO_RATES[model];
  if (!perModel) return null;
  const pair = perModel[quality.replace(/p$/, "")] ?? perModel["720"];
  return pair[1] * Math.max(1, Math.round(durationSeconds));
}

// ── Confirm token (unsigned, same-process trust — see file header) ──

const CONFIRM_TOKEN_RE = /^pvc\.([0-9a-z]+)\.([0-9a-f]{16})$/;

function mintConfirmToken(): string {
  return `pvc.${Date.now().toString(36)}.${crypto.randomBytes(8).toString("hex")}`;
}

function parseConfirmToken(token: string): { issuedAt: number } {
  const match = CONFIRM_TOKEN_RE.exec(token);
  if (!match) {
    throw new MediagenChannelError(
      "pixverse",
      "params",
      `confirm_token is malformed (expected pvc.<issuedAt36>.<rand16hex> from the Submit node's output): "${token.slice(0, 60)}"`,
    );
  }
  const issuedAt = parseInt(match[1], 36);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
    throw new MediagenChannelError("pixverse", "params", "confirm_token carries an invalid issue time");
  }
  return { issuedAt };
}

/** Deterministic CLI idempotency key: sha256(token + canonical params), 32 hex. */
function idempotencyKey(token: string, params: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(`${token}|${JSON.stringify(params)}`).digest("hex").slice(0, 32);
}

// ── Shared param handling (one validator keeps the pair's field sets honest) ──

interface VideoParams {
  model: string;
  prompt: string;
  durationSeconds: number;
  quality: string;
  aspectRatio: string;
  seed: number | null;
}

interface VideoParamSource {
  prompt?: unknown;
  model?: unknown;
  duration_seconds?: unknown;
  quality?: unknown;
  aspect_ratio?: unknown;
  seed?: unknown;
}

function optionalInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) {
    throw new MediagenChannelError("pixverse", "params", `expected an integer, got: ${String(value)}`);
  }
  return parsed;
}

function readVideoParams(source: VideoParamSource): VideoParams {
  const prompt = String(source.prompt ?? "").trim();
  if (!prompt) throw new MediagenChannelError("pixverse", "params", "prompt is required");
  const model = String(source.model ?? DEFAULT_MODEL);
  if (!PIXVERSE_VIDEO_MODELS.includes(model)) {
    throw new MediagenChannelError("pixverse", "params", `unsupported model "${model}" (supported: ${PIXVERSE_VIDEO_MODELS.join(", ")})`);
  }
  const durationSeconds = optionalInt(source.duration_seconds === undefined || source.duration_seconds === null || source.duration_seconds === ""
    ? DEFAULT_DURATION_SECONDS
    : source.duration_seconds) as number;
  // 1-15s is the v6 full range (L1 videoConstraints, pixverse.ts:627); narrower
  // models get rejected or adsorbed by the CLI itself (exit 6 surfaces here).
  if (durationSeconds < 1 || durationSeconds > 15) {
    throw new MediagenChannelError("pixverse", "params", "duration_seconds must be an integer between 1 and 15");
  }
  const quality = String(source.quality ?? DEFAULT_QUALITY);
  if (!PIXVERSE_VIDEO_QUALITIES.includes(quality)) {
    throw new MediagenChannelError("pixverse", "params", `unsupported quality "${quality}" (supported: ${PIXVERSE_VIDEO_QUALITIES.join(", ")})`);
  }
  const aspectRatio = String(source.aspect_ratio ?? DEFAULT_ASPECT_RATIO);
  if (!PIXVERSE_ASPECT_RATIOS.includes(aspectRatio)) {
    throw new MediagenChannelError("pixverse", "params", `unsupported aspect_ratio "${aspectRatio}" (supported: ${PIXVERSE_ASPECT_RATIOS.join(", ")})`);
  }
  const seed = optionalInt(source.seed);
  return { model, prompt, durationSeconds, quality, aspectRatio, seed };
}

/** Canonical params digest shared by the Submit output and the idempotency key. */
function paramsDigestOf(params: VideoParams): Record<string, unknown> {
  return {
    model: params.model,
    prompt: params.prompt,
    duration_seconds: params.durationSeconds,
    quality: params.quality,
    aspect_ratio: params.aspectRatio,
    seed: params.seed,
  };
}

/** Spawn + exit-code mapping. `spawnPixverse` is the mocked seam in tests. */
async function runJson(args: string[], opts: SpawnOpts = {}): Promise<PixverseRunResult> {
  return parsePixverseRun(await spawnPixverse(args, opts));
}

/** Poll `task status <id> --type video` on the 2/5/10s ladder to done/failed (cap 900s). */
async function pollVideoTask(taskId: string, signal?: AbortSignal): Promise<string> {
  const deadline = Date.now() + POLL_CAP_MS;
  let tick = 0;
  for (;;) {
    const run = await runJson(["task", "status", taskId, "--type", "video"], { signal });
    if (!run.ok) throw run.error;
    const task = run.payload;
    const statusCode = Number(task.status_code ?? task.status);
    if (statusCode === STATUS_DONE) {
      const videoUrl = task.video_url;
      if (typeof videoUrl === "string" && videoUrl) return videoUrl;
      throw new MediagenChannelError("pixverse", "result", `task ${taskId} reached done (status_code=1) without a video_url`);
    }
    if (STATUS_FAILED.has(statusCode)) {
      const label = typeof task.status === "string" ? `, ${task.status}` : "";
      throw new MediagenChannelError("pixverse", "result", `generation failed for task ${taskId} (status_code=${statusCode}${label})`);
    }
    // Retry codes {5, 9, 10} mean in-flight per the L1 status machine
    // (pixverse.ts:76); unknown codes are treated the same — poll to the cap
    // rather than guessing a terminal state.
    if (Date.now() >= deadline) {
      throw new MediagenChannelError(
        "pixverse",
        "timeout",
        `video task ${taskId} did not reach a terminal state within ${POLL_CAP_MS / 1000}s — it may still finish in the background; re-check with \`npx -y pixverse@1.4.3 task status ${taskId} --type video --json\``,
      );
    }
    await sleepWithSignal(POLL_INTERVALS_MS[Math.min(tick, POLL_INTERVALS_MS.length - 1)], signal);
    tick++;
  }
}

/** Output handles PixverseSubmitNode.process() emits. */
type PixverseSubmitNodeOutputs = { output: string };

/** Output handles PixverseConfirmNode.process() emits. */
type PixverseConfirmNodeOutputs = { output: { type: "video"; uri: string; data?: string } };

export class PixverseSubmitNode extends BaseNode {
  static readonly nodeType = "mediagen.video.PixverseSubmit";
  static readonly title = "Pixverse 提交确认(视频)";
  static readonly description =
    "First half of the PixVerse billing-confirm pair: reads the account " +
    "balance through the pixverse CLI, estimates the subscription-credit cost " +
    "and mints a confirm token. Never submits a generation.\n" +
    "Output is a JSON string: {needConfirm: true, provider: \"pixverse\", model, " +
    "estimatedCost, costSource: \"static\" | \"unknown\", currentBalance (omitted " +
    "when the account probe fails without an auth error), confirmToken, " +
    "expiresInSeconds: 600, paramsDigest: {model, prompt, duration_seconds, " +
    "quality, aspect_ratio, seed}}. Paste confirmToken into Pixverse 确认执行(视频) " +
    "and keep the params identical — the token is an approval + TTL gate, not a " +
    "params binding.\n" +
    "Estimates come from the published per-second rates for the native models " +
    "(v6, pixverse-c1); other models estimate \"unknown\" (missing does not mean " +
    "free).\n" +
    "Auth is handled by the CLI itself (login: npx -y pixverse@1.4.3 auth login, " +
    "30-day OAuth, or the PIXVERSE_ACCESS_KEY environment variable), so this " +
    "node declares no required settings.\n" +
    "pixverse, video, confirm, billing, credits, estimate, quota\n\n" +
    "Use cases:\n" +
    "- Gate a paid PixVerse video behind explicit approval\n" +
    "- Snapshot the balance next to the estimated cost\n" +
    "- Build a review step before any subscription credits are spent";
  static readonly metadataOutputTypes = { output: "str" };
  static readonly inlineFields: string[] = [];
  static readonly inputFields: string[] = ["prompt"];
  static readonly requiredSettings: string[] = [];
  static readonly autoSaveAsset = false;

  @prop({
    type: "str",
    required: true,
    title: "Prompt",
    description: "Text prompt for the video. Route the same prompt into the Confirm node.",
  })
  declare prompt: any;

  @prop({
    type: "enum",
    default: DEFAULT_MODEL,
    title: "Model",
    description: "PixVerse video model. Only v6 and pixverse-c1 have published credit rates.",
    values: PIXVERSE_VIDEO_MODELS,
  })
  declare model: any;

  @prop({
    type: "int",
    default: DEFAULT_DURATION_SECONDS,
    min: 1,
    max: 15,
    title: "Duration (seconds)",
    description: "Video duration in seconds, 1-15 (v6 full range; narrower models are rejected by the CLI).",
  })
  declare duration_seconds: any;

  @prop({
    type: "enum",
    default: DEFAULT_QUALITY,
    title: "Quality",
    description: "Output quality tier (bills more credits per second as it rises).",
    values: PIXVERSE_VIDEO_QUALITIES,
  })
  declare quality: any;

  @prop({
    type: "enum",
    default: DEFAULT_ASPECT_RATIO,
    title: "Aspect ratio",
    description: "Output aspect ratio.",
    values: PIXVERSE_ASPECT_RATIOS,
  })
  declare aspect_ratio: any;

  @prop({
    type: "int",
    title: "Seed",
    description: "Optional reproducibility seed. Leave empty for a random draw.",
  })
  declare seed: any;

  async process(context?: Context): Promise<PixverseSubmitNodeOutputs> {
    const params = readVideoParams(this);
    // Zero-cost pre-check (L1 gateImpl, pixverse.ts:990-1004): an auth failure
    // fails early with the re-login path; any other probe failure leaves the
    // balance unknown without blocking the estimate.
    let currentBalance: number | undefined;
    const account = await runJson(["account", "info"], { signal: context?.signal, timeoutMs: ACCOUNT_INFO_TIMEOUT_MS });
    if (!account.ok) {
      if (account.error.code === "auth") throw account.error;
    } else {
      const credits = account.payload.credits;
      if (typeof credits === "object" && credits !== null && typeof (credits as Record<string, unknown>).total === "number") {
        currentBalance = (credits as Record<string, number>).total;
      }
    }
    const estimatedCost = estimateVideoCredits(params.model, params.quality, params.durationSeconds);
    return {
      output: JSON.stringify({
        needConfirm: true,
        provider: "pixverse",
        model: params.model,
        estimatedCost,
        costSource: estimatedCost == null ? "unknown" : "static",
        ...(currentBalance !== undefined ? { currentBalance } : {}),
        confirmToken: mintConfirmToken(),
        expiresInSeconds: CONFIRM_TTL_SECONDS,
        paramsDigest: paramsDigestOf(params),
      }),
    };
  }
}

export class PixverseConfirmNode extends BaseNode {
  static readonly nodeType = "mediagen.video.PixverseConfirm";
  static readonly title = "Pixverse 确认执行(视频)";
  static readonly description =
    "Second half of the PixVerse billing-confirm pair: consumes the confirm " +
    "token from Pixverse 提交确认(视频), submits the billed `create video` and " +
    "polls it to completion.\n" +
    "The token is proof of approval plus a 600s TTL gate — this node executes " +
    "with ITS OWN params, so route the Submit node's paramsDigest (or re-enter " +
    "identical params); changed params will not invalidate the token. The CLI " +
    "idempotency key is derived deterministically from token + params, so an " +
    "identical re-run (e.g. after a concurrency rejection, CLI exit 7) safely " +
    "reuses the same key instead of double-billing.\n" +
    "Auth is handled by the CLI itself (login: npx -y pixverse@1.4.3 auth " +
    "login, or the PIXVERSE_ACCESS_KEY environment variable), so this node " +
    "declares no required settings.\n" +
    "pixverse, video, confirm, execute, billing, credits\n\n" +
    "Use cases:\n" +
    "- Execute the generation the Submit node estimated\n" +
    "- Spend subscription credits only after an explicit approval step\n" +
    "- Retry safely after concurrency or timeout interruptions";
  static readonly metadataOutputTypes = { output: "video" };
  static readonly body = "content_card";
  static readonly inlineFields: string[] = [];
  static readonly inputFields: string[] = ["prompt"];
  static readonly requiredSettings: string[] = [];
  static readonly autoSaveAsset = true;

  @prop({
    type: "str",
    required: true,
    title: "Confirm token",
    description: "confirmToken pasted from the Submit node's JSON output (valid for 600 seconds).",
  })
  declare confirm_token: any;

  @prop({
    type: "str",
    required: true,
    title: "Prompt",
    description: "The same prompt that was estimated. Part of the idempotency key.",
  })
  declare prompt: any;

  @prop({
    type: "enum",
    default: DEFAULT_MODEL,
    title: "Model",
    description: "PixVerse video model — keep identical to the Submit step.",
    values: PIXVERSE_VIDEO_MODELS,
  })
  declare model: any;

  @prop({
    type: "int",
    default: DEFAULT_DURATION_SECONDS,
    min: 1,
    max: 15,
    title: "Duration (seconds)",
    description: "Video duration in seconds, 1-15 — keep identical to the Submit step.",
  })
  declare duration_seconds: any;

  @prop({
    type: "enum",
    default: DEFAULT_QUALITY,
    title: "Quality",
    description: "Output quality tier — keep identical to the Submit step.",
    values: PIXVERSE_VIDEO_QUALITIES,
  })
  declare quality: any;

  @prop({
    type: "enum",
    default: DEFAULT_ASPECT_RATIO,
    title: "Aspect ratio",
    description: "Output aspect ratio — keep identical to the Submit step.",
    values: PIXVERSE_ASPECT_RATIOS,
  })
  declare aspect_ratio: any;

  @prop({
    type: "int",
    title: "Seed",
    description: "Optional reproducibility seed — keep identical to the Submit step.",
  })
  declare seed: any;

  async process(context?: Context): Promise<PixverseConfirmNodeOutputs> {
    const params = readVideoParams(this);
    const token = parseConfirmToken(String(this.confirm_token ?? "").trim());
    if (Date.now() - token.issuedAt > CONFIRM_TTL_MS) {
      throw new MediagenChannelError(
        "pixverse",
        "params",
        `confirm_token expired (TTL ${CONFIRM_TTL_SECONDS}s) — re-run Pixverse 提交确认(视频) with the same params to mint a fresh token`,
      );
    }
    const idem = idempotencyKey(String(this.confirm_token).trim(), paramsDigestOf(params));
    // L1 submit shape (pixverse.ts:1227-1233); this pack is text-to-video and
    // always audio-on, so no --image and an explicit --audio.
    const args = [
      "create",
      "video",
      "--prompt",
      params.prompt,
      "--model",
      params.model,
      "--idempotency-key",
      idem,
      "--no-wait",
      "--duration",
      String(params.durationSeconds),
      "--quality",
      params.quality,
      "--aspect-ratio",
      params.aspectRatio,
      ...(params.seed !== null ? ["--seed", String(params.seed)] : []),
      "--audio",
    ];
    const submitted = await runJson(args, { signal: context?.signal });
    if (!submitted.ok) throw submitted.error;
    const ids = collectTaskIds(submitted.payload);
    if (ids.length === 0) {
      throw new MediagenChannelError(
        "pixverse",
        "result",
        `submit response carried no task id: ${JSON.stringify(submitted.payload).slice(0, 200)}`,
      );
    }
    const videoUrl = await pollVideoTask(ids[0], context?.signal);
    const { bytes } = await safeDownload("pixverse", videoUrl, context?.signal);
    if (context?.storage?.store) {
      // Keep the receiver: storage adapters are class methods — detaching
      // `store` loses `this` (mediagen-factory toMediaOutput precedent).
      const key = `mediagen-video-pixverse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const uri = await context.storage.store(key, bytes, "video/mp4");
      return { output: { type: "video", uri } };
    }
    return { output: videoRefFromBytes(bytes) };
  }
}

export const PIXVERSE_NODES: readonly NodeClass[] = [PixverseSubmitNode, PixverseConfirmNode];
