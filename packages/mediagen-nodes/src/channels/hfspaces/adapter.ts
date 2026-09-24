/**
 * hfspaces channel adapter — free ZeroGPU quota over gradio REST + SSE.
 * Wire contract: media-gen-mcp src/providers/hfspaces.ts (L1 source, one-hop
 * verified 2026-09-24).
 *
 * Shape: POST https://{subdomain}.hf.space/gradio_api/call/{apiName} with
 * {data:[...]} (positional params in gradio signature order) → 200 {event_id};
 * then GET .../call/{apiName}/{event_id} consumed as a one-shot SSE stream —
 * gradio delivers queue/generating events, then a single "event: complete"
 * (JSON result array) or "event: error" frame and closes. The error frame with
 * data:null is the GPU accounting-layer reject (quota exhausted / anonymous
 * tier denied) — mapped to a structured quota failure advising HF_TOKEN.
 * Anonymous calls work (2min GPU/day per IP); HF_TOKEN is optional and raises
 * the quota and priority.
 */
import { isAbortError, MediagenChannelError, optionalSecret, readJsonBody } from "../../mediagen-base.js";
import type {
  AdapterContext,
  ChannelAdapters,
  ImageParams,
  MediaBag,
  MediaInput,
  PollResult,
  VideoParams,
} from "../../adapters/types.js";

const CHANNEL = "hfspaces";

/** Single SSE read budget — queue + generation can take minutes (L1 pollDeadlineMs). */
const SSE_READ_TIMEOUT_MS = 600_000;

interface HfTarget {
  subdomain: string;
  apiName: string;
  maxDurationSeconds: number;
}

// Per-target tables ported from HFSPACES_MODELS / HFSPACES_IMAGE_MODELS
// (hfspaces.ts L44-129). Param order below is the gradio signature order.
const VIDEO_TARGETS: Record<string, HfTarget> = {
  // prithivMLmods/Wan2.2-Fast: image must be a data:URI, duration ≤5s,
  // complete returns an EMBEDDED data:video/mp4;base64 payload.
  "wan22-i2v": { subdomain: "prithivmlmods-wan2-2-fast", apiName: "generate_video", maxDurationSeconds: 5 },
  // multimodalart MiniMax-H3 demo: t2v / i2v / first+last keyframes, 2-14s,
  // has audio; returns a FileData temp url. Resolution string is fixed by the Space UI.
  "minimax-h3": { subdomain: "multimodalart-minimax-h3", apiName: "generate", maxDurationSeconds: 14 },
};

const IMAGE_TARGETS: Record<string, { subdomain: string; apiName: string }> = {
  // tongyi-mai Z-Image-Turbo: t2i, size as the Space's reduced-ratio resolution string.
  "z-image-turbo": { subdomain: "tongyi-mai-z-image-turbo", apiName: "generate" },
};

/** Fixed resolution slot of the minimax-h3 signature (hfspaces.ts L83, U+00B7 separator). */
const MINIMAX_RESOLUTION = "960x544 · 16:9 fast";

function callUrl(target: { subdomain: string; apiName: string }, eventId?: string): string {
  const base = `https://${target.subdomain}.hf.space/gradio_api/call/${target.apiName}`;
  return eventId === undefined ? base : `${base}/${eventId}`;
}

function bearer(ctx: AdapterContext): string | undefined {
  return optionalSecret(ctx.secrets, "HF_TOKEN");
}

/** POST the positional data array; returns the event_id ("" when absent). */
async function postEventId(
  ctx: AdapterContext,
  target: { subdomain: string; apiName: string },
  data: unknown[],
): Promise<string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = bearer(ctx);
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await ctx.fetchFn(callUrl(target), {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
    signal: ctx.signal,
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 150);
    // Community Spaces drift (privatized/renamed) surfaces as 404 (hfspaces.ts L229, L365).
    if (response.status === 404) {
      throw new MediagenChannelError(
        CHANNEL,
        "params",
        `Space endpoint 404 (${target.subdomain} may have moved or been privatized; community Spaces drift is common — pick another model)`,
        false,
        false,
        404,
      );
    }
    throw new MediagenChannelError(
      CHANNEL,
      "network",
      `submit HTTP ${response.status}: ${detail}`,
      response.status >= 500,
      false,
      response.status,
    );
  }
  const payload = await readJsonBody(response);
  return typeof payload.event_id === "string" ? payload.event_id : "";
}

interface SseEvent {
  event: string;
  data: string | null;
}

/**
 * One-shot SSE consume: open the event stream and read line-wise to the first
 * complete/error frame. Both the outer signal and a read deadline abort the
 * in-flight fetch so a wedged stream cannot outlive its budget (L1 S6 review A).
 */
async function consumeSse(ctx: AdapterContext, url: string): Promise<SseEvent[]> {
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (ctx.signal?.aborted) controller.abort();
  else ctx.signal?.addEventListener("abort", onOuterAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SSE_READ_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    const token = bearer(ctx);
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await ctx.fetchFn(url, { method: "GET", headers, signal: controller.signal });
    if (!response.ok) {
      throw new MediagenChannelError(
        CHANNEL,
        "network",
        `SSE GET HTTP ${response.status} (gradio event may have expired; resubmit)`,
        response.status >= 500,
        false,
        response.status,
      );
    }
    const body = response.body;
    if (!body?.getReader) {
      throw new MediagenChannelError(CHANNEL, "network", "SSE response has no readable body", true);
    }
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: SseEvent[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // CRLF-normalize: the SSE spec allows \r\n line separators.
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        let event = "message";
        let data: string | null = null;
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) {
            const chunk = line.slice(5).trim();
            data = data === null ? chunk : `${data}\n${chunk}`;
          }
        }
        events.push({ event, data });
        if (event === "complete" || event === "error") {
          try {
            await reader.cancel();
          } catch {
            // Stream already closed by the server — nothing to cancel.
          }
          return events;
        }
        // queue / generating / unknown events: ignored, keep reading.
      }
    }
    return events;
  } catch (error) {
    if (timedOut && isAbortError(error)) {
      throw new MediagenChannelError(CHANNEL, "timeout", `SSE read exceeded ${SSE_READ_TIMEOUT_MS / 1000}s (queue + generation)`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    ctx.signal?.removeEventListener("abort", onOuterAbort);
  }
}

/** Fold the SSE events into a PollResult via the target's output extractor. */
function resolveSseEvents(events: SseEvent[], extract: (data: unknown[]) => PollResult): PollResult {
  for (const sse of events) {
    if (sse.event === "error") {
      // error + data:null (zero-latency, no text) is the GPU accounting-layer
      // reject — quota exhausted or anonymous tier denied (hfspaces.ts L242, L393).
      if (sse.data === null || sse.data === "null") {
        return {
          status: "failed",
          code: "hfspaces.zero_gpu_quota",
          quota: true,
          retryable: true,
          message:
            "ZeroGPU quota rejected (SSE error data:null) — set HF_TOKEN for the free-account daily quota and higher priority, or retry later",
        };
      }
      return {
        status: "failed",
        code: "hfspaces.space_error",
        message: `Space execution error: ${String(sse.data).slice(0, 200)}`,
      };
    }
    if (sse.event === "complete") {
      let payload: unknown[];
      try {
        payload = JSON.parse(String(sse.data ?? "[]")) as unknown[];
      } catch {
        payload = [];
      }
      return extract(payload);
    }
  }
  return { status: "failed", code: "hfspaces.no_terminal_event", message: "SSE stream ended without a complete/error event" };
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

/** wan22-i2v: complete data[0].video is an embedded data:video/mp4;base64 string (hfspaces.ts L51-58). */
function extractEmbeddedVideo(data: unknown[]): PollResult {
  const first = data[0];
  const value = typeof first === "object" && first !== null ? (first as Record<string, unknown>).video : first;
  if (typeof value === "string") {
    const match = /^data:[^;]+;base64,(.*)$/s.exec(value);
    if (match) return { status: "done", kind: "bytes", data: decodeBase64(match[1]), mime: "video/mp4" };
    if (/^https?:\/\//.test(value)) return { status: "done", kind: "url", url: value, mime: "video/mp4" };
  }
  return { status: "failed", code: "hfspaces.no_video", message: "complete event carried no embedded video (output shape drift)" };
}

/** FileData.url targets (minimax-h3): complete data[0].url is a temp hf URL (hfspaces.ts L89-92). */
function extractFileDataUrl(data: unknown[]): PollResult {
  const first = data[0];
  const url = typeof first === "object" && first !== null ? (first as Record<string, unknown>).url : first;
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    return { status: "done", kind: "url", url, mime: "video/mp4" };
  }
  return { status: "failed", code: "hfspaces.no_video_url", message: "complete event carried no video url (output shape drift)" };
}

/**
 * Defensive first-image-url walk (hfspaces.ts L253-267): Gallery / Image /
 * Imageslider components each nest the temp file url differently.
 */
function extractImageUrl(data: unknown[]): PollResult {
  const urls: string[] = [];
  const walk = (value: unknown): void => {
    if (!value) return;
    if (typeof value === "string") {
      if (/^https?:\/\//.test(value)) urls.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.url === "string") urls.push(record.url);
      else walk(record.image);
    }
  };
  walk(data);
  if (urls.length === 0) {
    return { status: "failed", code: "hfspaces.no_image_url", message: "complete event carried no image url (output shape drift)" };
  }
  // Prefer hf temp-file urls over unrelated strings the payload may carry.
  const hfUrls = urls.filter((url) => url.includes("/file=/") || url.includes(".hf.space") || url.includes("gradio_api"));
  return { status: "done", kind: "url", url: (hfUrls.length > 0 ? hfUrls : urls)[0] };
}

/** z-image-turbo resolution slot: "1024x1024 ( 1:1 )" — WxH plus the reduced ratio (hfspaces.ts L287-294). */
function toResolution(size: string | undefined): string {
  const match = /^(\d{2,4})x(\d{2,4})$/.exec((size ?? "1024x1024").trim());
  if (!match) return "1024x1024 ( 1:1 )";
  const width = Number(match[1]);
  const height = Number(match[2]);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const divisor = gcd(width, height) || 1;
  return `${width}x${height} ( ${width / divisor}:${height / divisor} )`;
}

/** gradio ImageData normalization: https input → {url}, bytes → {base64} (hfspaces.ts L341-353). */
async function toImageData(input: MediaInput): Promise<{ url: string } | { base64: string }> {
  if (input.uri) return { url: input.uri };
  const match = /^data:[^;]+;base64,(.*)$/s.exec(await input.dataUri());
  if (!match) {
    throw new MediagenChannelError(CHANNEL, "params", "image input could not be normalized to an ImageData payload");
  }
  return { base64: match[1] };
}

function clampDuration(value: unknown, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, value) : fallback;
}

function firstMedia(bag: MediaBag, name: string): MediaInput | undefined {
  const value = bag[name];
  return Array.isArray(value) ? value[0] : value;
}

const hfspacesImage = {
  kind: "image" as const,
  async submit(params: ImageParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    // z-image-turbo positional table (hfspaces.ts L295): prompt, resolution,
    // seed, steps, cfg, randomize_seed, negative-prompt list. The node exposes
    // no seed, so the wire defaults (seed 42, randomize, 8 steps) always hold.
    const target = IMAGE_TARGETS["z-image-turbo"];
    const data = [
      params.prompt,
      toResolution(typeof params.size === "string" ? params.size : undefined),
      42,
      8,
      3.0,
      true,
      [],
    ];
    const eventId = await postEventId(ctx, target, data);
    if (!eventId) return { status: "failed", code: "hfspaces.no_event_id", message: "submit returned no event_id" };
    const events = await consumeSse(ctx, callUrl(target, eventId));
    return resolveSseEvents(events, extractImageUrl);
  },
};

const hfspacesVideo = {
  kind: "video" as const,
  async submit(params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<{ handle: string } | PollResult> {
    const model = typeof params.model === "string" ? params.model : "";
    const target = VIDEO_TARGETS[model];
    if (!target) {
      return { status: "failed", code: "hfspaces.unknown_model", message: `unknown hfspaces video model "${model}"` };
    }
    let data: unknown[];
    if (model === "wan22-i2v") {
      const image = firstMedia(media, "image");
      if (!image) {
        return { status: "failed", code: "hfspaces.image_required", message: "wan22-i2v requires an image (first frame)" };
      }
      // 9 positional params (hfspaces.ts L50): the Space demands the image as
      // an embedded data:URI string, prompt, 4 Lightning steps, empty negative
      // prompt, duration ≤5s, two fixed 1.0 scales, seed 0 + randomize=true.
      data = [
        await image.dataUri(),
        params.prompt,
        4,
        "",
        clampDuration(params.duration_seconds, target.maxDurationSeconds, 5),
        1.0,
        1.0,
        0,
        true,
      ];
    } else {
      // minimax-h3 positional table (hfspaces.ts L79-88): prompt, first frame,
      // last frame, fixed resolution, duration ≤14s, steps, seed, fixed false.
      // keyframes[0] doubles as the first frame when no separate image is given.
      const keyframes = Array.isArray(media.keyframes) ? media.keyframes : [];
      const first = firstMedia(media, "image") ?? keyframes[0];
      const last = keyframes.length > 1 ? keyframes[1] : undefined;
      data = [
        params.prompt,
        first ? await toImageData(first) : null,
        last ? await toImageData(last) : null,
        MINIMAX_RESOLUTION,
        clampDuration(params.duration_seconds, target.maxDurationSeconds, 10),
        typeof params.steps === "number" && Number.isFinite(params.steps) ? params.steps : 10,
        typeof params.seed === "number" && Number.isFinite(params.seed) ? params.seed : 42,
        false,
      ];
    }
    const eventId = await postEventId(ctx, target, data);
    if (!eventId) return { status: "failed", code: "hfspaces.no_event_id", message: "submit returned no event_id" };
    // The handle carries the target: poll needs it to rebuild the Space event URL.
    return { handle: `${model}::${eventId}` };
  },
  async poll(handle: string, _params: VideoParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const separator = handle.indexOf("::");
    const model = separator >= 0 ? handle.slice(0, separator) : "";
    const eventId = separator >= 0 ? handle.slice(separator + 2) : handle;
    const target = VIDEO_TARGETS[model];
    if (!target) {
      return { status: "failed", code: "hfspaces.unknown_handle", message: `cannot resolve a hfspaces Space from handle "${handle}"` };
    }
    const events = await consumeSse(ctx, callUrl(target, eventId));
    return resolveSseEvents(events, model === "wan22-i2v" ? extractEmbeddedVideo : extractFileDataUrl);
  },
};

export const hfspacesAdapters: ChannelAdapters = { image: hfspacesImage, video: hfspacesVideo };
