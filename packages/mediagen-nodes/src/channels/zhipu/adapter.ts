/**
 * zhipu (BigModel v4) channel adapter.
 * Wire contract: director/research/01 §B.1 (media-gen-mcp zhipu.ts as L1 source).
 * Image: POST /paas/v4/images/generations (sync, data[].url|b64_json).
 * Video: POST /paas/v4/videos/generations → {id} → GET /paas/v4/async-result/{id}.
 */
import { MediagenChannelError, readJsonBody } from "../../mediagen-base.js";
import type { AdapterContext, ChannelAdapters, ImageParams, MediaBag, MediaInput, PollResult, VideoParams } from "../../adapters/types.js";

const DEFAULT_BASE_URL = "https://open.bigmodel.cn/api";

function authHeader(ctx: AdapterContext): Record<string, string> {
  const key = ctx.secrets.ZHIPU_API_KEY ?? "";
  if (!key) throw new MediagenChannelError("zhipu", "auth", "ZHIPU_API_KEY is required");
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
  // 1302 = platform concurrency limit; 429 = rate limit (both account-scoped).
  const errorBody = body.error as Record<string, unknown> | undefined;
  const quotaSignal = response.status === 429 || String(errorBody?.code ?? "") === "1302";
  if (quotaSignal) return new MediagenChannelError(channel, "quota", `HTTP ${response.status} ${detail}`, true, true);
  if (response.status >= 500) return new MediagenChannelError(channel, "network", `HTTP ${response.status} ${detail}`, true);
  return new MediagenChannelError(channel, "api", `HTTP ${response.status} ${detail}`);
}

function pickImagePayload(entry: Record<string, unknown>): { url?: string; b64?: string } {
  const data = Array.isArray(entry.data) && entry.data.length > 0 ? (entry.data[0] as Record<string, unknown>) : {};
  const url = typeof data.url === "string" ? data.url : undefined;
  const b64 = typeof data.b64_json === "string" ? data.b64_json : undefined;
  return { url, b64 };
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function resolveImageUrl(url: string | undefined, b64: string | undefined): Promise<PollResult> {
  if (b64) return { status: "done", kind: "bytes", data: decodeBase64(b64), mime: "image/png" };
  if (url) return { status: "done", kind: "url", url };
  return { status: "failed", code: "zhipu.empty_image", message: "response carried neither url nor b64_json" };
}

const zhipuImage = {
  kind: "image" as const,
  async submit(params: ImageParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const body: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      size: params.size,
      watermark_enabled: false,
    };
    if (params.image) {
      // i2i is not offered upstream for zhipu image models; reject loudly instead of dropping.
      throw new MediagenChannelError("zhipu", "params", "zhipu image generation is text-only");
    }
    const response = await postJson(ctx, `${DEFAULT_BASE_URL}/paas/v4/images/generations`, body);
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("zhipu", response, payload);
    const { url, b64 } = pickImagePayload(payload);
    return resolveImageUrl(url, b64);
  },
};

const zhipuVideo = {
  kind: "video" as const,
  async submit(params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<{ handle: string } | PollResult> {
    const model = String(params.model ?? "");
    const body: Record<string, unknown> = { model, prompt: params.prompt, fps: params.fps ?? 30 };
    if (params.size) body.size = params.size;
    // duration + keyframes are cogvideox-3 only (director/research/01 §B.1);
    // unsupported params are dropped silently — repo packs do not log in src/.
    if (params.duration !== undefined && model.includes("cogvideox-3")) body.duration = params.duration;
    const image = media.image as MediaInput | undefined;
    const keyframes = media.keyframes as MediaInput[] | undefined;
    if (image && keyframes) {
      throw new MediagenChannelError("zhipu", "params", "provide either image or keyframes, not both");
    }
    if (keyframes) {
      if (!model.includes("cogvideox-3")) {
        throw new MediagenChannelError("zhipu", "params", `keyframes are only supported by cogvideox-3 (got ${model})`);
      }
      const first = await keyframes[0].dataUri();
      const last = await keyframes[1].dataUri();
      body.image_url = [first, last];
    } else if (image) {
      body.image_url = image.uri ?? (await image.dataUri());
    }
    const response = await postJson(ctx, `${DEFAULT_BASE_URL}/paas/v4/videos/generations`, body);
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("zhipu", response, payload);
    const id = typeof payload.id === "string" ? payload.id : "";
    if (!id) return { status: "failed", code: "zhipu.no_task_id", message: "submit returned no task id" };
    return { handle: id };
  },
  async poll(handle: string, _params: VideoParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const response = await ctx.fetchFn(`${DEFAULT_BASE_URL}/paas/v4/async-result/${handle}`, {
      headers: authHeader(ctx),
      signal: ctx.signal,
    });
    const payload = await readJsonBody(response);
    if (!response.ok) throw await httpError("zhipu", response, payload);
    const status = String(payload.task_status ?? "");
    if (status === "SUCCESS") {
      const results = Array.isArray(payload.video_result) ? (payload.video_result as Array<Record<string, unknown>>) : [];
      const url = typeof results[0]?.url === "string" ? results[0].url : undefined;
      if (!url) return { status: "failed", code: "zhipu.no_video_url", message: "SUCCESS without video url" };
      return { status: "done", kind: "url", url, mime: "video/mp4" };
    }
    if (status === "FAIL") {
      return { status: "failed", code: "zhipu.task_failed", message: JSON.stringify(payload).slice(0, 300) };
    }
    return { status: "running" };
  },
};

export const zhipuAdapters: ChannelAdapters = { image: zhipuImage, video: zhipuVideo };
