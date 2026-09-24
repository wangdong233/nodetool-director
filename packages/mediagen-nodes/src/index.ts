import type { NodeClass } from "@nodetool-ai/node-sdk";
import { loadMediagenNodesFromManifest } from "./mediagen-factory.js";
import { loadMediagenManifest } from "./manifest.js";

export * from "./adapters/types.js";
export * from "./budget.js";
export * from "./manifest.js";
export * from "./mediagen-base.js";
export * from "./mediagen-factory.js";
export { CHANNELS } from "./channels/index.js";

export const MEDIAGEN_NODES: readonly NodeClass[] = loadMediagenNodesFromManifest(loadMediagenManifest());

export function registerMediagenNodes(registry: { register: (nodeClass: NodeClass) => void }): void {
  for (const nodeClass of MEDIAGEN_NODES) registry.register(nodeClass);
}
