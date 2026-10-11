/**
 * siliconflow channel adapter.
 * Wire contract: media-gen-mcp providers/siliconflow.ts as the L1 source.
 * Image: POST /v1/images/generations (sync) → images[].url envelope (NOT
 * data[]); URLs live 1h, so the done url is handed to the factory's
 * safeDownload immediately.
 * Video: POST /v1/video/submit → {requestId} → POST /v1/video/status
 * {requestId} → status "Succeed" (results.videos[0].url) | "Failed".
 */
import { MediagenChannelError, readJsonBody } from "../../mediagen-base.js";
import type { AdapterContext, ChannelAdapters, ImageParams, MediaBag, MediaInput, PollResult, VideoParams } from "../../adapters/types.js";

const DEFAULT_BASE_URL = "https://api.siliconflow.cn";

/** i2i is Edit-family only (L1 S302): plain Edit takes exactly one image, 2509 up to three. */
const IMAGE_EDIT_MODELS = new Set(["Qwen/Qwen-Image-Edit", "Qwen/Qwen-Image-Edit-2509"]);

function authHeader(ctx: AdapterContext): Record<string, string> {
  const key = ctx.secrets.SILICONFLOW_API_KEY ?? "";
  if (!key) throw new MediagenChannelError("siliconflow", "auth", "SILICONFLOW_API_KEY is required");
  return { Authorization: `Bearer ${key}` };
}

async function postJson(ctx: AdapterContext, path: string, body: Record<string, unknown>): Promise<Response> {
  return ctx.fetchFn(`${DEFAULT_BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeader(ctx), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctx.signal,
  });
}

async function httpError(channel: string, response: Response, body: Record<string, unknown>): Promise<MediagenChannelError> {
  const detail = JSON.stringify(body).slice(0, 300);
  if (response.status === 401) return new MediagenChannelError(channel, "auth", `HTTP 401 ${detail}`);
  if (response.status === 429) {
    // TPM/IPM/IPD rate limits (IPD 400 images/day on the free tier is a daily
    // account quota). The L1 source never retries 429 — surface it as a
    // non-retryable quota error so callers back off instead of hammering.
    return new MediagenChannelError(channel, "quota", `HTTP 429 rate/quota limited ${detail}`, false, true, 429);
  }
  if (response.status >= 500) return new MediagenChannelError(channel, "network", `HTTP ${response.status} ${detail}`, true);
  return new MediagenChannelError(channel, "api", `HTTP ${response.status} ${detail}`);
}

/** Seed passthrough helper: the factory materializes unset int fields as 0 — treat 0 as "no seed". */
function optionalSeed(params: Record<string, unknown>): number | undefined {
  const seed = typeof params.seed === "number" && Number.isFinite(params.seed) ? Math.trunc(params.seed) : undefined;
  return seed !== undefined && seed !== 0 ? seed : undefined;
}

/** Image input wire shape: an https URI passes through, everything else localizes to a data: URI. */
async function imageWireValue(image: MediaInput): Promise<string> {
  return image.uri ?? (await image.dataUri());
}

/** The single image field this channel declares — a list value collapses to its first entry. */
function singleImage(media: MediaBag): MediaInput | undefined {
  const value = media.image;
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const siliconflowImage = {
  kind: "image" as const,
  async submit(params: ImageParams, media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const model = String(params.model ?? "Kwai-Kolors/Kolors");
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      image_size: params.image_size ?? "1024x1024",
    };
    const seed = optionalSeed(params);
    if (seed !== undefined) body.seed = seed; // verbatim, matching the L1 fan-out convention
    const image = singleImage(media);
    if (image) {
      if (!IMAGE_EDIT_MODELS.has(model)) {
        // S302 semantics: every non-Edit model rejects image inputs outright.
        throw new MediagenChannelError("siliconflow", "params", `model ${model} does not accept an image (image inputs: Qwen/Qwen-Image-Edit or Qwen/Qwen-Image-Edit-2509 only)`);
      }
      // Edit takes one image; 2509 takes up to three — a single image maps to
      // the same string shape on the wire for both.
      body.image = await imageWireValue(image);
    }
    const response = await postJson(ctx, "/v1/images/generations", body);
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("siliconflow", response, payload);
    // Envelope is images[].url (never data[]). Anomalous envelope → structured
    // failure (S400 semantics in the L1 source).
    const images = Array.isArray(payload.images) ? (payload.images as Array<Record<string, unknown>>) : [];
    const url = typeof images[0]?.url === "string" ? images[0].url : "";
    if (!url) {
      // The code rides in the message: the factory prefers message over code
      // when converting a failed result into an error.
      return { status: "failed", code: "siliconflow.envelope", message: `siliconflow.envelope: expected images[].url envelope: ${JSON.stringify(payload).slice(0, 200)}` };
    }
    // 1h URL TTL: return the url — the factory's safeDownload grabs it right away.
    return { status: "done", kind: "url", url };
  },
};

const siliconflowVideo = {
  kind: "video" as const,
  async submit(params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<{ handle: string } | PollResult> {
    const model = String(params.model ?? "Wan-AI/Wan2.2-T2V-A14B");
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      image_size: params.image_size ?? "1280x720",
    };
    const seed = optionalSeed(params);
    if (seed !== undefined) body.seed = seed;
    // Fixed 5s/24fps upstream (120 frames; I2V follows the input image ratio) —
    // no duration/fps fields to send.
    const image = singleImage(media);
    if (image) body.image = await imageWireValue(image); // I2V single first frame
    const response = await postJson(ctx, "/v1/video/submit", body);
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("siliconflow", response, payload);
    const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
    if (!requestId) return { status: "failed", code: "siliconflow.no_request_id", message: "siliconflow.no_request_id: submit returned no requestId" };
    return { handle: requestId };
  },
  async poll(handle: string, _params: VideoParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const response = await postJson(ctx, "/v1/video/status", { requestId: handle });
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("siliconflow", response, payload);
    const status = String(payload.status ?? "");
    if (status === "Succeed") {
      const results = typeof payload.results === "object" && payload.results !== null ? (payload.results as Record<string, unknown>) : {};
      const videos = Array.isArray(results.videos) ? (results.videos as Array<Record<string, unknown>>) : [];
      const url = typeof videos[0]?.url === "string" ? videos[0].url : "";
      if (!url) return { status: "failed", code: "siliconflow.no_video_url", message: "siliconflow.no_video_url: Succeed without a video url" };
      // Results are held 10 minutes and the url lives 1h — the factory downloads immediately.
      return { status: "done", kind: "url", url, mime: "video/mp4" };
    }
    if (status === "Failed") {
      const reason = typeof payload.reason === "string" ? payload.reason : JSON.stringify(payload).slice(0, 300);
      return { status: "failed", code: "siliconflow.task_failed", message: `siliconflow.task_failed: ${reason}` };
    }
    return { status: "running" };
  },
};

export const siliconflowAdapters: ChannelAdapters = { image: siliconflowImage, video: siliconflowVideo };
