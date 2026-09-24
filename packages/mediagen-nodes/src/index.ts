import type { NodeClass } from "@nodetool-ai/node-sdk";
import { CHANNELS } from "./channels/index.js";
import { loadMediagenNodesFromManifest } from "./mediagen-factory.js";
import { loadChannelManifest } from "./manifest.js";

export * from "./adapters/types.js";
export * from "./manifest.js";
export * from "./mediagen-base.js";
export * from "./mediagen-factory.js";
export { CHANNELS } from "./channels/index.js";

function loadAllEntries() {
  const entries = [];
  for (const registration of CHANNELS) {
    entries.push(...loadChannelManifest(registration.channel));
  }
  return entries;
}

export const MEDIAGEN_NODES: readonly NodeClass[] = loadMediagenNodesFromManifest(loadAllEntries());

export function registerMediagenNodes(registry: { register: (nodeClass: NodeClass) => void }): void {
  for (const nodeClass of MEDIAGEN_NODES) registry.register(nodeClass);
}
