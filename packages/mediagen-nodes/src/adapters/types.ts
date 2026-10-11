/**
 * MediaGen channel adapter contracts.
 *
 * Adapters translate a normalized parameter bag into channel-specific HTTP
 * calls. They never touch node/registry APIs — the factory owns those. All
 * timestamps/durations are milliseconds unless suffixed otherwise.
 */

export interface AdapterContext {
  /** Cooperative cancellation from the workflow runner (context.signal). */
  signal?: AbortSignal;
  /** Resolved channel secrets (required keys guaranteed present by mediagen-base). */
  secrets: Record<string, string>;
  /** Fetch implementation (global fetch in prod; stubbed in tests). */
  fetchFn: typeof fetch;
}

/** Normalized media input, resolved lazily by mediagen-base from a NodeTool media ref. */
export interface MediaInput {
  /** https URI when the ref carried one (never fetched locally). */
  readonly uri: string | null;
  /** Raw bytes (loaded via loadMediaRefBytes when no uri). */
  readonly bytes: () => Promise<Uint8Array>;
  /** data: URI form (base64 of bytes). */
  readonly dataUri: () => Promise<string>;
}

export type ImageParams = Record<string, unknown> & { prompt: string };

export type AudioParams = Record<string, unknown> & { text: string };

export type VideoParams = Record<string, unknown> & { prompt: string };

/**
 * Discriminated poll/result union. `quota: true` marks account-level quota
 * rejections (hfspaces H201, cloudflare 3036, zhipu 1302) — the budget gate
 * (M4) keys off the same flag.
 */
export type PollResult =
  | { status: "running" }
  | { status: "done"; kind: "bytes"; data: Uint8Array; mime?: string }
  | { status: "done"; kind: "url"; url: string; mime?: string }
  | { status: "failed"; code: string; retryable?: boolean; quota?: boolean; message?: string };

export interface VideoAdapter {
  kind: "video";
  /** Submit the job; returns a handle or an immediate failure. */
  submit(params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<{ handle: string } | PollResult>;
  /** Poll once; adapters own interval pacing via the manifest (factory loops). */
  poll(handle: string, params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<PollResult>;
}

/** Media inputs keyed by field name; list fields carry arrays. */
export type MediaBag = Record<string, MediaInput | MediaInput[]>;

export interface ImageAdapter {
  kind: "image";
  /** Synchronous image generation: must resolve to a done/failed PollResult. */
  submit(params: ImageParams, media: MediaBag, ctx: AdapterContext): Promise<PollResult>;
}

export interface AudioAdapter {
  kind: "audio";
  /** Synchronous audio generation (TTS/music): must resolve to a done/failed PollResult. */
  submit(params: AudioParams, media: MediaBag, ctx: AdapterContext): Promise<PollResult>;
}

export interface ChannelAdapters {
  image?: ImageAdapter;
  video?: VideoAdapter;
  audio?: AudioAdapter;
}
