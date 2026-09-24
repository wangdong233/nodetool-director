/**
 * Channel registry — the ONE place a channel mounts (one import + one entry).
 * Adapters implement src/adapters/types.ts; manifest fragments live beside them.
 */
import type { ChannelAdapters } from "../adapters/types.js";
import { agnesAdapters } from "./agnes/adapter.js";
import { cloudflareAdapters } from "./cloudflare/adapter.js";
import { hfspacesAdapters } from "./hfspaces/adapter.js";
import { siliconflowAdapters } from "./siliconflow/adapter.js";
import { zhipuAdapters } from "./zhipu/adapter.js";

export interface ChannelRegistration {
  channel: string;
  adapters: ChannelAdapters;
}

export const CHANNELS: readonly ChannelRegistration[] = [
  { channel: "zhipu", adapters: zhipuAdapters },
  { channel: "agnes", adapters: agnesAdapters },
  { channel: "cloudflare", adapters: cloudflareAdapters },
  { channel: "siliconflow", adapters: siliconflowAdapters },
  { channel: "hfspaces", adapters: hfspacesAdapters },
];

const BY_CHANNEL = new Map(CHANNELS.map((registration) => [registration.channel, registration.adapters]));

export function getChannelAdapters(channel: string): ChannelAdapters {
  const adapters = BY_CHANNEL.get(channel);
  if (!adapters) throw new Error(`mediagen: unknown channel "${channel}" (registered: ${CHANNELS.map((c) => c.channel).join(", ")})`);
  return adapters;
}
