/**
 * gemini channel adapter — image (inline) + video (submit→handle→poll).
 *
 * Wire/UI contract: media-gen-mcp src/providers/gemini-web.ts (MIT) as the L1
 * source, ported per director/channels/92 (adversarial final plan):
 * - sessions map is module-level (single registry instance per process) with
 *   a 10-minute TTL sweep (stale entries from timed-out polls must not pin
 *   S303 forever)
 * - S303 (un-consumed live video session) fails fast as a quota error
 * - the factory's pollUntilDone owns the deadline (manifest timeoutSeconds);
 *   the inline image path self-limits via its own pollUntilDone
 * - cancellation: ctx.signal threads through every sleep
 */
import { MediagenChannelError, pollUntilDone, sleepWithSignal } from "../../mediagen-base.js";
import type { AdapterContext, ChannelAdapters, ImageParams, MediaBag, PollResult, VideoParams } from "../../adapters/types.js";
import {
  CdpGeminiTransport,
  DEFAULT_GEMINI_CDP_PORT,
  EXPR_CANVAS_GRAB,
  EXPR_FOCUS_INPUT,
  EXPR_LOGIN,
  EXPR_POLL_IMAGE,
  EXPR_POLL_VIDEO,
  exprClickModeItem,
  exprClickSend,
  exprFetchB64,
  exprOpenToolsMenu,
  type GeminiTransport,
} from "./transport.js";

const CHANNEL = "gemini";
const NAV_SETTLE_MS = 4_000;
const MENU_SETTLE_MS = 1_000;
const MODE_SETTLE_MS = 1_500;
const TYPE_SETTLE_MS = 600;
const IMAGE_DEADLINE_MS = 180_000;
const SESSION_TTL_MS = 10 * 60_000;

/** Test seam: swap the transport factory (vitest stubs this). */
const productionTransportFactory = (): GeminiTransport =>
  new CdpGeminiTransport(Number(process.env.GEMINI_CDP_PORT) || DEFAULT_GEMINI_CDP_PORT);
let transportFactory: () => GeminiTransport = productionTransportFactory;

export function setGeminiTransportFactory(factory: () => GeminiTransport): void {
  transportFactory = factory;
}

/** Test seam: restore the production transport factory between tests. */
export function resetGeminiTransportFactoryForTest(): void {
  transportFactory = productionTransportFactory;
}

export interface GeminiSession {
  kind: "video";
  createdAt: number;
}

const sessions = new Map<string, GeminiSession>();
let sessionSeq = 0;

/** Test seam: the live-session registry (S303/TTL sweep assertions). */
export function geminiSessionsForTest(): ReadonlyMap<string, GeminiSession> {
  return sessions;
}

/** Test seam: drop all live sessions so each test owns its registry state. */
export function clearGeminiSessionsForTest(): void {
  sessions.clear();
}

function assertNoLiveSession(): void {
  for (const [id, sess] of sessions) {
    if (Date.now() - sess.createdAt > SESSION_TTL_MS) {
      sessions.delete(id); // stale sweep
      continue;
    }
    throw new MediagenChannelError(
      CHANNEL,
      "quota",
      `S303: 已有未取件的视频会话 ${id}(单页 UI 驱动,新提交会导航走其产物页使订阅配额沉没)。先完成/超时当前视频再提交下一条`,
      false,
      true,
    );
  }
}

function decodeBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

interface PollPayload {
  __err?: string;
  ready?: boolean;
  err?: string | null;
  src?: string | null;
}

interface FetchedPayload {
  __err?: string;
  b64?: string;
  contentType?: string;
}

async function ensureFreshChat(t: GeminiTransport, signal?: AbortSignal): Promise<void> {
  await t.open();
  await t.navigate("https://gemini.google.com/app");
  await sleepWithSignal(NAV_SETTLE_MS, signal);
  const login = (await t.eval(EXPR_LOGIN)) as { __err?: string; logged?: boolean };
  if (login?.__err) throw new MediagenChannelError(CHANNEL, "network", `登录态探测失败: ${login.__err}`, true);
  if (!login?.logged) {
    throw new MediagenChannelError(
      CHANNEL,
      "auth",
      "S102: Chrome 未登录 Google 账号(无账号徽章) — 在渠道 Chrome 里登录一次(每机一次)",
    );
  }
}

async function enterMode(t: GeminiTransport, kind: "image" | "video", signal?: AbortSignal): Promise<void> {
  const menu = (await t.eval(exprOpenToolsMenu())) as { __err?: string; ok?: boolean; visibleLabels?: string[] };
  if (menu?.__err) throw new MediagenChannelError(CHANNEL, "network", `打开工具菜单失败: ${menu.__err}`, true);
  if (!menu?.ok) {
    throw new MediagenChannelError(
      CHANNEL,
      "auth",
      `S101: 未找到「上传和工具」菜单按钮(UI 改版或页面未就绪;可见标签:${JSON.stringify(menu?.visibleLabels ?? []).slice(0, 300)})`,
    );
  }
  await sleepWithSignal(MENU_SETTLE_MS, signal);
  const item = (await t.eval(exprClickModeItem(kind))) as { __err?: string; ok?: boolean; menuText?: string };
  if (item?.__err) throw new MediagenChannelError(CHANNEL, "network", `点击模式菜单项失败: ${item.__err}`, true);
  if (!item?.ok) {
    throw new MediagenChannelError(
      CHANNEL,
      "auth",
      `S101: 工具菜单中未找到「${kind === "image" ? "制作图片" : "制作视频"}」入口(菜单文本:${String(item?.menuText ?? "").slice(0, 200)})`,
    );
  }
  await sleepWithSignal(MODE_SETTLE_MS, signal);
}

async function typeAndSend(t: GeminiTransport, prompt: string, signal?: AbortSignal): Promise<void> {
  const focus = (await t.eval(EXPR_FOCUS_INPUT)) as { __err?: string; ok?: boolean; stage?: string };
  if (focus?.__err) {
    // Page-side exception ≠ missing input area — classify transient, same as
    // every other probe's __err branch (R4 Y1).
    throw new MediagenChannelError(CHANNEL, "network", `聚焦输入区执行失败: ${focus.__err}`, true);
  }
  if (!focus?.ok) {
    throw new MediagenChannelError(CHANNEL, "auth", `S101: 输入区未找到 rich-textarea(页面形态异常:${focus?.stage ?? "?"})`);
  }
  await t.insertText(prompt);
  await sleepWithSignal(TYPE_SETTLE_MS, signal);
  let send: { __err?: string; ok?: boolean; stage?: string };
  try {
    send = (await t.eval(exprClickSend())) as { __err?: string; ok?: boolean; stage?: string };
  } catch (e) {
    if (e instanceof MediagenChannelError && e.retryable) {
      // The click may have landed before the transport dropped — a blind
      // caller-side retry could submit (and bill) a second generation.
      // Ambiguous submit: never auto-retryable (R4 Y2).
      throw ambiguousSubmitError(
        "S103: 发送点击后连接断开——提交结果不确定(可能已开始生成/计费)。先到页面确认是否已提交,勿自动重试",
      );
    }
    throw e;
  }
  if (send?.__err) {
    throw new MediagenChannelError(CHANNEL, "network", `点击发送执行失败: ${send.__err}`, true);
  }
  if (!send?.ok) {
    throw new MediagenChannelError(CHANNEL, "network", `发送按钮未找到/不可点(${send?.stage ?? "?"});prompt 可能未进输入框`, true);
  }
}

function mapPageError(errText: string): MediagenChannelError {
  const quota = /上限|limit/i.test(errText);
  return new MediagenChannelError(
    CHANNEL,
    quota ? "quota" : "result",
    `S400: 页面报错: ${errText}${quota ? "(疑似配额窗口耗尽 —— 5h 滚动刷新)" : ""}`,
    false,
    quota,
  );
}

/** Marks the ambiguous-submit error (the click may have landed) — the video
 * submit path seeds an S303 guard session before rethrowing it (R5 Y2). */
interface AmbiguousSubmit {
  ambiguousSubmit?: boolean;
}

function ambiguousSubmitError(message: string): MediagenChannelError & AmbiguousSubmit {
  const err: MediagenChannelError & AmbiguousSubmit = new MediagenChannelError(CHANNEL, "network", message, false);
  err.ambiguousSubmit = true;
  return err;
}

async function fetchReadyArtifact(t: GeminiTransport, kind: "image" | "video", src: string | null): Promise<PollResult> {
  const fetched = (await t.eval(
    kind === "image" ? EXPR_CANVAS_GRAB : exprFetchB64(String(src)),
    60_000,
  )) as FetchedPayload;
  if (fetched?.__err || !fetched?.b64) {
    // A page-side fetch hiccup (usercontent CDN 429/5xx, transient decode
    // error) must not sink an already-billed, page-ready artifact — the
    // paid-output-retry rule. Retryable → both poll loops return running and
    // the next tick retries, bounded by the manifest deadline (R3 F1).
    throw new MediagenChannelError(
      CHANNEL,
      "network",
      `S200: 产物下载失败: ${fetched?.__err ?? "空 b64"}(下个轮询 tick 重试)`,
      true,
    );
  }
  const mime = fetched.contentType || (kind === "image" ? "image/jpeg" : "video/mp4");
  return { status: "done", kind: "bytes", data: decodeBase64(fetched.b64), mime };
}

const geminiImage = {
  kind: "image" as const,
  async submit(params: ImageParams, _media: MediaBag, ctx: AdapterContext): Promise<PollResult> {
    assertNoLiveSession();
    const t = transportFactory();
    try {
      await ensureFreshChat(t, ctx.signal);
      await enterMode(t, "image", ctx.signal);
      await typeAndSend(t, String(params.prompt ?? ""), ctx.signal);
      // Inline adapters get no factory deadline — self-limit to 180s.
      return await pollUntilDone(
        CHANNEL,
        async () => {
          try {
            const poll = (await t.eval(EXPR_POLL_IMAGE)) as PollPayload;
            if (poll?.err) throw mapPageError(poll.err);
            if (poll?.ready) {
              // return AWAIT, not a bare return: a bare `return promise` in a
              // try block rejects THROUGH the catch (only return await is
              // caught), which silently disabled this loop's self-heal for
              // four review rounds (R5 R1).
              return await fetchReadyArtifact(t, "image", poll.src ?? null);
            }
            return { status: "running" };
          } catch (e) {
            if (e instanceof MediagenChannelError && e.retryable) {
              // Same self-heal policy as the video poll (R2 F2): the transport
              // nulls its connection on an eval failure — reconnect so the
              // next tick can find the already-submitted generation instead
              // of sinking it on the first WS drop. A retryable failure of
              // the reconnect itself is also just "try again next tick";
              // only environment-down errors (S100/S101/S102) escape.
              try {
                await t.open();
              } catch (reopen) {
                if (!(reopen instanceof MediagenChannelError && reopen.retryable)) throw reopen;
              }
              return { status: "running" };
            }
            throw e;
          }
        },
        { intervalMs: 4_000, timeoutMs: IMAGE_DEADLINE_MS, signal: ctx.signal },
      );
    } finally {
      // Every adapter entry point opens its own CDP connection; a live WS
      // handle pins the event loop (cdp.ts) — dispose on every exit path.
      t.dispose?.();
    }
  },
};

const geminiVideo = {
  kind: "video" as const,
  async submit(params: VideoParams, media: MediaBag, ctx: AdapterContext): Promise<{ handle: string } | PollResult> {
    if (media.image || media.keyframes || media.images) {
      throw new MediagenChannelError(CHANNEL, "params", "S301: gemini 网页渠道当前仅支持文生视频(无底图/关键帧上传通道)");
    }
    assertNoLiveSession();
    const t = transportFactory();
    try {
      await ensureFreshChat(t, ctx.signal);
      await enterMode(t, "video", ctx.signal);
      try {
        await typeAndSend(t, String(params.prompt ?? ""), ctx.signal);
      } catch (e) {
        if (e instanceof MediagenChannelError && (e as MediagenChannelError & AmbiguousSubmit).ambiguousSubmit) {
          // The click may have landed: a video may already be generating on
          // the page. Seed a session so S303 mechanically blocks a blind
          // resubmit (which would navigate /app and sink the quota) until
          // the TTL sweep or a manual poll consumes it (R5 Y2).
          const guard = `gemini-ambiguous-${++sessionSeq}-${Date.now().toString(36)}`;
          sessions.set(guard, { kind: "video", createdAt: Date.now() });
        }
        throw e;
      }
      const handle = `gemini-${++sessionSeq}-${Date.now().toString(36)}`;
      sessions.set(handle, { kind: "video", createdAt: Date.now() });
      return { handle };
    } finally {
      t.dispose?.();
    }
  },
  async poll(handle: string, _params: VideoParams, _media: MediaBag, _ctx: AdapterContext): Promise<PollResult> {
    const sess = sessions.get(handle);
    if (!sess) {
      return {
        status: "failed",
        code: "gemini.stale_handle",
        message: "会话不存在(伪 handle 仅进程内有效;进程重启后无法取件)",
      };
    }
    const t = transportFactory();
    try {
      await t.open(); // idempotent reconnect after WS drop
      const poll = (await t.eval(EXPR_POLL_VIDEO)) as PollPayload;
      // Deliberate, reviewed divergence from L1 (R14 Y1): L1 checks err
      // first, but the err regex scans the whole chat body — after a retried
      // generation the page can hold STALE error text while the new video is
      // ready. Ready-first delivers the billed artifact instead of failing
      // S400 on leftovers; the both-set case is pinned in tests.
      if (poll?.ready) {
        // Fetch BEFORE releasing the session: a retryable failure inside the
        // artifact fetch (the longest eval) must land in the catch → running
        // path with the session intact, so the next tick retries instead of
        // degrading to a false stale_handle (R2 F1).
        const artifact = await fetchReadyArtifact(t, "video", poll.src ?? null);
        sessions.delete(handle);
        return artifact;
      }
      if (poll?.err) {
        sessions.delete(handle);
        throw mapPageError(poll.err);
      }
      // A probe-internal __err flake lands here with the ordinary running
      // return: the next poll tick retries, the factory deadline bounds it.
      return { status: "running" };
    } catch (error) {
      if (error instanceof MediagenChannelError && error.retryable) {
        // S103-class transient (WS drop / page context destroyed): the
        // transport self-heals on the next open(), so retry within this run
        // instead of sinking the quota-consumed video (92 §3 amendment).
        return { status: "running" };
      }
      // Terminal poll failure (auth / result / non-retryable): the video is
      // unrecoverable — release the single-session slot now, not at TTL.
      sessions.delete(handle);
      throw error;
    } finally {
      t.dispose?.();
    }
  },
};

export const geminiAdapters: ChannelAdapters = { image: geminiImage, video: geminiVideo };
