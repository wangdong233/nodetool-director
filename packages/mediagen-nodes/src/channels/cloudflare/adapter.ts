/**
 * cloudflare (Workers AI) channel adapter — image only.
 * Wire contract: media-gen-mcp providers/cloudflare.ts as the L1 source.
 * POST {base}/accounts/{accountId}/ai/run/{@cf/model}; Bearer API token plus
 * account id (both required). Two body families: JSON (flux-schnell / SDXL /
 * lucid / phoenix) and multipart FormData (flux-2 family — even for pure
 * text-to-image; references ride as binary input_image_N parts). Responses are
 * the v4 envelope {result:{image: bare base64}} or, as live-verified for
 * flux-schnell, a raw image/* binary body.
 */
import { detectImageMime } from "@nodetool-ai/runtime";
import { MediagenChannelError, readJsonBody } from "../../mediagen-base.js";
import type { AdapterContext, ChannelAdapters, ImageParams, MediaBag, MediaInput, PollResult } from "../../adapters/types.js";

const DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";

interface CfModelSpec {
  /** @cf/ full model id used in the REST path. */
  full: string;
  family: "json" | "multipart";
  steps?: { key: "steps" | "num_steps"; def: number; max: number };
  /** Live-verified 2026-09-23 (L1 source): flux-schnell's current schema rejects seed. */
  supportsSeed?: false;
  size?: { w: [number, number]; h: [number, number]; def: [number, number] };
  i2i: "sdxl-b64" | "flux2-multipart" | "none";
}

/** Simple name → spec, mirroring CLOUDFLARE_MODELS in media-gen-mcp providers/cloudflare.ts. */
const CF_MODELS: Record<string, CfModelSpec> = {
  "flux-schnell": { full: "@cf/black-forest-labs/flux-1-schnell", family: "json", steps: { key: "steps", def: 4, max: 8 }, supportsSeed: false, i2i: "none" },
  "flux-2-klein": { full: "@cf/black-forest-labs/flux-2-klein-4b", family: "multipart", size: { w: [256, 1920], h: [256, 1920], def: [1024, 768] }, i2i: "flux2-multipart" },
  "flux-2-dev": { full: "@cf/black-forest-labs/flux-2-dev", family: "multipart", steps: { key: "steps", def: 25, max: 50 }, size: { w: [256, 1920], h: [256, 1920], def: [1024, 768] }, i2i: "flux2-multipart" },
  "flux-2-klein-9b": { full: "@cf/black-forest-labs/flux-2-klein-9b", family: "multipart", size: { w: [256, 1920], h: [256, 1920], def: [1024, 768] }, i2i: "flux2-multipart" },
  "sdxl-lightning": { full: "@cf/bytedance/stable-diffusion-xl-lightning", family: "json", steps: { key: "num_steps", def: 20, max: 20 }, size: { w: [256, 2048], h: [256, 2048], def: [1024, 1024] }, i2i: "sdxl-b64" },
  "sdxl-base": { full: "@cf/stabilityai/stable-diffusion-xl-base-1.0", family: "json", steps: { key: "num_steps", def: 20, max: 20 }, size: { w: [256, 2048], h: [256, 2048], def: [1024, 1024] }, i2i: "sdxl-b64" },
  lucid: { full: "@cf/leonardo/lucid-origin", family: "json", steps: { key: "num_steps", def: 30, max: 40 }, size: { w: [0, 2500], h: [0, 2500], def: [1120, 1120] }, i2i: "none" },
  phoenix: { full: "@cf/leonardo/phoenix-1.0", family: "json", steps: { key: "num_steps", def: 25, max: 50 }, size: { w: [0, 2048], h: [0, 2048], def: [1024, 1024] }, i2i: "none" },
};

function toInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function clampInt(value: number, range: [number, number]): number {
  return Math.min(range[1], Math.max(range[0], value));
}

/** Per-model size resolution with clamping (the L1 source clamps the same way). */
function resolveSize(spec: CfModelSpec, params: ImageParams): { w: number; h: number } {
  if (!spec.size) {
    // flux-schnell has no size parameters (fixed output) — width/height are
    // dropped silently; the caller never puts them on the wire.
    return { w: 1024, h: 1024 };
  }
  return {
    w: clampInt(toInt(params.width) ?? spec.size.def[0], spec.size.w),
    h: clampInt(toInt(params.height) ?? spec.size.def[1], spec.size.h),
  };
}

/** Bare base64 payload of a data: URI (SDXL img2img wants image_b64 without the prefix). */
function bareBase64(dataUri: string): string {
  const comma = dataUri.indexOf(",");
  return comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
}

/** Cloudflare v4 envelope error code (7003 shape) pulled from a raw text body, as the L1 source does. */
function extractCfCode(body: string): number | undefined {
  const match = /"code"\s*:\s*(\d+)/.exec(body);
  return match ? Number(match[1]) : undefined;
}

async function readTextBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/** The single image field this channel declares — a list value collapses to its first entry. */
function singleImage(media: MediaBag): MediaInput | undefined {
  const value = media.image;
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function requireCredentials(ctx: AdapterContext): { token: string; accountId: string } {
  const token = ctx.secrets.CLOUDFLARE_API_TOKEN ?? "";
  const accountId = ctx.secrets.CLOUDFLARE_ACCOUNT_ID ?? "";
  if (!token || !accountId) {
    throw new MediagenChannelError("cloudflare", "auth", "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
  }
  return { token, accountId };
}

const cloudflareImage = {
  kind: "image" as const,
  async submit(params: ImageParams, media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    const { token, accountId } = requireCredentials(ctx);
    const model = String(params.model ?? "flux-schnell");
    const spec = CF_MODELS[model];
    // The factory's enum field already filters to manifest models; guard anyway
    // so an unknown id fails loudly instead of building a bogus URL.
    if (!spec) throw new MediagenChannelError("cloudflare", "params", `unknown model ${model}`);

    const prompt = params.prompt;
    // The factory materializes unset int fields as 0 — treat 0 as "no seed"
    // (prop-default rule); an explicit seed of 0 is indistinguishable here.
    const seed = toInt(params.seed);
    const hasSeed = seed !== undefined && seed !== 0;
    const steps = toInt(params.steps);
    const image = singleImage(media);

    let body: FormData | string;
    let contentType: string | undefined;
    if (spec.family === "multipart") {
      // flux-2 family: multipart even for pure text-to-image. Reference images
      // must be binary file parts (input_image_0..3, ≤4, each <512×512); the
      // single image field maps to input_image_0.
      const form = new FormData();
      const size = resolveSize(spec, params);
      form.set("prompt", prompt);
      form.set("width", String(size.w));
      form.set("height", String(size.h));
      if (hasSeed) form.set("seed", String(seed));
      if (spec.steps) {
        // Only flux-2-dev consumes steps; the klein variants are fixed at 4
        // steps upstream and must not receive a steps field.
        form.set(spec.steps.key, String(clampInt(steps ?? spec.steps.def, [1, spec.steps.max])));
      }
      if (image) {
        const bytes = await image.bytes();
        // new Uint8Array(bytes) re-wraps as Uint8Array<ArrayBuffer> so the
        // value satisfies BlobPart under the TS 6 ArrayBuffer generics.
        form.set("input_image_0", new Blob([new Uint8Array(bytes)], { type: detectImageMime(bytes) ?? "image/png" }), "ref_0.png");
      }
      body = form; // fetch derives the multipart boundary content-type itself
    } else {
      const json: Record<string, unknown> = { prompt };
      if (spec.steps) json[spec.steps.key] = clampInt(steps ?? spec.steps.def, [1, spec.steps.max]);
      if (hasSeed) {
        if (spec.supportsSeed === false) {
          // flux-schnell quirk (live-verified schema drift): seed is rejected
          // by the current schema — dropped silently rather than failing the call.
        } else {
          json.seed = seed;
        }
      }
      if (spec.size) {
        const size = resolveSize(spec, params);
        json.width = size.w;
        json.height = size.h;
      }
      // flux-schnell: no size spec, so width/height never reach the wire.
      if (image) {
        if (spec.i2i !== "sdxl-b64") {
          throw new MediagenChannelError("cloudflare", "params", `model ${model} does not accept an image (image inputs: SDXL models via image_b64, flux-2 models via multipart reference parts)`);
        }
        json.image_b64 = bareBase64(await image.dataUri());
      }
      body = JSON.stringify(json);
      contentType = "application/json";
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (contentType) headers["Content-Type"] = contentType;
    const response = await ctx.fetchFn(`${DEFAULT_BASE_URL}/accounts/${accountId}/ai/run/${spec.full}`, {
      method: "POST",
      headers,
      body,
      signal: ctx.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new MediagenChannelError("cloudflare", "auth", `HTTP ${response.status} (check API token scope: Workers AI Read + Edit)`);
    }
    if (response.status === 429) {
      const text = await readTextBody(response);
      const cfCode = extractCfCode(text);
      if (cfCode === 3036) {
        // Daily 10,000-neuron free allocation exhausted (resets 00:00 UTC):
        // account-scoped and NOT retryable — retrying only burns the same wall.
        throw new MediagenChannelError("cloudflare", "quota", `daily neuron quota exhausted (cf 3036; resets 00:00 UTC)`, false, true, 429);
      }
      // 3040 = transient capacity overrun (retryable), plain 429 = rate limit.
      throw new MediagenChannelError("cloudflare", "network", `HTTP 429 rate/capacity${cfCode !== undefined ? ` (cf ${cfCode})` : ""}`, true, false, 429);
    }
    if (response.status >= 500) {
      throw new MediagenChannelError("cloudflare", "network", `HTTP ${response.status}`, true);
    }
    if (!response.ok) {
      const text = await readTextBody(response);
      const cfCode = extractCfCode(text);
      throw new MediagenChannelError("cloudflare", "api", `HTTP ${response.status}${cfCode !== undefined ? ` (cf ${cfCode})` : ""}: ${text.slice(0, 180)}`);
    }

    const responseContentType = response.headers?.get?.("content-type") ?? "";
    if (responseContentType.startsWith("image/")) {
      // Live-verified (L1 source, 2026-09-23): flux-schnell returns a raw JPEG
      // binary body even with Accept: application/json — trust the response mime.
      const data = new Uint8Array(await response.arrayBuffer());
      return { status: "done", kind: "bytes", data, mime: responseContentType.split(";")[0] };
    }
    const payload = await readJsonBody(response);
    if (payload.success === false) {
      const errors = Array.isArray(payload.errors) ? (payload.errors as Array<Record<string, unknown>>) : [];
      const first = errors[0];
      const cfCode = typeof first?.code === "number" ? first.code : undefined;
      throw new MediagenChannelError("cloudflare", "api", `envelope success=false${cfCode !== undefined ? ` (cf ${cfCode})` : ""}: ${JSON.stringify(first?.message ?? errors).slice(0, 180)}`);
    }
    const result = typeof payload.result === "object" && payload.result !== null ? (payload.result as Record<string, unknown>) : {};
    const image64 = typeof result.image === "string" ? result.image : typeof payload.image === "string" ? payload.image : "";
    if (!image64) {
      throw new MediagenChannelError("cloudflare", "result", `response carried no image: ${JSON.stringify(payload).slice(0, 200)}`);
    }
    const data = new Uint8Array(Buffer.from(image64, "base64"));
    // L1 source defaults the sniffed mime to jpeg (schnell's official output format).
    return { status: "done", kind: "bytes", data, mime: detectImageMime(data) ?? "image/jpeg" };
  },
};

export const cloudflareAdapters: ChannelAdapters = { image: cloudflareImage };
