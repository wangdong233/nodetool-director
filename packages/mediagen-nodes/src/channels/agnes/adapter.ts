/**
 * agnes (free AI relay) channel adapter.
 * Wire contract: media-gen-mcp src/providers/agnes.ts as L1 source (2026-07-11
 * curl-verified). Image: POST /images/generations (sync, data[].url|b64_json;
 * body.image is a string array for i2i). Video: POST /videos → {task_id|id} →
 * GET /videos/{taskId}.
 */
import { MediagenChannelError, readJsonBody } from "../../mediagen-base.js";
import type {
  AdapterContext,
  ChannelAdapters,
  ImageParams,
  MediaBag,
  MediaInput,
  PollResult,
  VideoParams,
} from "../../adapters/types.js";

const DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1";

// agnes.ts ALLOWED_NUM_FRAMES (8n+1, ≤441); 1080p caps at 241 (maxFramesFor).
const ALLOWED_NUM_FRAMES = new Set<number>([81, 121, 161, 241, 441]);
const DEFAULT_NUM_FRAMES = 121;
const MAX_FRAMES_1080P = 241;
const FRAME_RATE = 24; // only legal frame rate (agnes.ts videoConstraints)
const DEFAULT_RESOLUTION = "720p";

// agnes.ts STATUS_MAP: lowercase aliases → terminal states; unknown → running.
const STATUS_MAP: Record<string, "completed" | "failed"> = {
  completed: "completed",
  succeeded: "completed",
  success: "completed",
  failed: "failed",
  error: "failed",
  cancelled: "failed",
  canceled: "failed",
};

function authHeader(ctx: AdapterContext): Record<string, string> {
  const key = ctx.secrets.AGNES_API_KEY ?? "";
  if (!key) throw new MediagenChannelError("agnes", "auth", "AGNES_API_KEY is required");
  return { Authorization: `Bearer ${key}` };
}

async function postJson(ctx: AdapterContext, url: string, body: Record<string, unknown>): Promise<Response> {
  return ctx.fetchFn(url, {
    method: "POST",
    headers: { ...authHeader(ctx), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctx.signal,
  });
}

async function httpError(channel: string, response: Response, body: Record<string, unknown>): Promise<MediagenChannelError> {
  const detail = JSON.stringify(body).slice(0, 300);
  if (response.status === 401) return new MediagenChannelError(channel, "auth", `HTTP 401 ${detail}`);
  // 429 is the account-scoped rate limit agnes.ts learns per-model pacing from.
  if (response.status === 429) return new MediagenChannelError(channel, "quota", `HTTP 429 ${detail}`, true, true);
  if (response.status >= 500) return new MediagenChannelError(channel, "network", `HTTP ${response.status} ${detail}`, true);
  return new MediagenChannelError(channel, "api", `HTTP ${response.status} ${detail}`);
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function pickImagePayload(payload: Record<string, unknown>): { url?: string; b64?: string } {
  const data = Array.isArray(payload.data) && payload.data.length > 0 ? (payload.data[0] as Record<string, unknown>) : {};
  const url = typeof data.url === "string" ? data.url : undefined;
  const b64 = typeof data.b64_json === "string" ? data.b64_json : undefined;
  return { url, b64 };
}

/** MediaBag entries are a single input for scalar fields, an array for list fields. */
function singleInput(value: MediaInput | MediaInput[] | undefined): MediaInput | undefined {
  return value !== undefined && !Array.isArray(value) ? value : undefined;
}

function listInput(value: MediaInput | MediaInput[] | undefined): MediaInput[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

const agnesImage = {
  kind: "image" as const,
  async submit(params: ImageParams, media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const body: Record<string, unknown> = { model: params.model, prompt: params.prompt };
    if (params.size) body.size = params.size;
    const image = singleInput(media.image);
    if (image) {
      // Wire shape is image: string[] (agnes.ts L244: body.image = req.images).
      body.image = [image.uri ?? (await image.dataUri())];
    }
    const response = await postJson(ctx, `${DEFAULT_BASE_URL}/images/generations`, body);
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("agnes", response, payload);
    const { url, b64 } = pickImagePayload(payload);
    if (b64) return { status: "done", kind: "bytes", data: decodeBase64(b64), mime: "image/png" };
    if (url) return { status: "done", kind: "url", url };
    return { status: "failed", code: "agnes.empty_image", message: "response carried neither url nor b64_json" };
  },
};

const agnesVideo = {
  kind: "video" as const,
  async submit(params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<{ handle: string } | PollResult> {
    // Numeric-enum coercion: a String() cast would fail the API's integer schema.
    const numFrames = Number(params.num_frames ?? DEFAULT_NUM_FRAMES);
    if (!ALLOWED_NUM_FRAMES.has(numFrames)) {
      throw new MediagenChannelError("agnes", "params", `num_frames must be one of ${[...ALLOWED_NUM_FRAMES].join("/")}`);
    }
    const resolution = String(params.resolution ?? DEFAULT_RESOLUTION);
    if (resolution === "1080p" && numFrames > MAX_FRAMES_1080P) {
      // agnes.ts maxFramesFor: 1080p ≤ 241, 720p ≤ 441 (prevent API 400 upstream).
      throw new MediagenChannelError("agnes", "params", `1080p resolution supports at most ${MAX_FRAMES_1080P} frames (got ${numFrames})`);
    }
    const body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      num_frames: numFrames,
      frame_rate: FRAME_RATE,
      resolution,
      mode: "ti2vid",
    };
    if (params.ratio) body.ratio = params.ratio;
    if (params.seed) body.seed = params.seed; // mirrors agnes.ts truthy seed check (0 = unset)
    const image = singleInput(media.image);
    const keyframes = listInput(media.keyframes);
    if (image && keyframes) {
      throw new MediagenChannelError("agnes", "params", "provide either image or keyframes, not both");
    }
    if (keyframes && keyframes.length > 0) {
      body.mode = "keyframes";
      body.extra_body = {
        image: await Promise.all(keyframes.map((frame) => frame.uri ?? frame.dataUri())),
        mode: "keyframes",
      };
    } else if (image) {
      body.image = image.uri ?? (await image.dataUri());
    }
    const response = await postJson(ctx, `${DEFAULT_BASE_URL}/videos`, body);
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("agnes", response, payload);
    const id = typeof payload.task_id === "string" ? payload.task_id : typeof payload.id === "string" ? payload.id : "";
    if (!id) return { status: "failed", code: "agnes.no_task_id", message: "submit returned no task id" };
    return { handle: id };
  },
  async poll(handle: string, _params: VideoParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const response = await ctx.fetchFn(`${DEFAULT_BASE_URL}/videos/${handle}`, {
      headers: authHeader(ctx),
      signal: ctx.signal,
    });
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("agnes", response, payload);
    const status = STATUS_MAP[String(payload.status ?? "").toLowerCase()];
    if (status === "completed") {
      const url = typeof payload.url === "string" ? payload.url : "";
      if (!url) {
        // agnes.ts: completed without a url is a failed generation, not success.
        return { status: "failed", code: "agnes.completed_without_url", message: "completed without a url" };
      }
      return { status: "done", kind: "url", url, mime: "video/mp4" };
    }
    if (status === "failed") {
      const detail = payload.error
        ? typeof payload.error === "string"
          ? payload.error
          : JSON.stringify(payload.error)
        : JSON.stringify(payload).slice(0, 300);
      return { status: "failed", code: "agnes.task_failed", message: detail };
    }
    return { status: "running" };
  },
};

export const agnesAdapters: ChannelAdapters = { image: agnesImage, video: agnesVideo };
