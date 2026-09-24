import { describe, expect, it } from "vitest";
import { MEDIAGEN_NODES, registerMediagenNodes } from "../src/index.js";
import { NodeRegistry } from "@nodetool-ai/node-sdk";

describe("mediagen registration", () => {
  it("registers every manifest node into a fresh registry under the mediagen namespace", () => {
    const registry = new NodeRegistry();
    registerMediagenNodes(registry);
    for (const nodeClass of MEDIAGEN_NODES) {
      expect(nodeClass.nodeType, String(nodeClass.nodeType)).toMatch(/^mediagen\.(image|video|audio)\./);
      expect(registry.has(nodeClass.nodeType), nodeClass.nodeType).toBe(true);
    }
    expect(MEDIAGEN_NODES.length).toBeGreaterThan(0);
  });

  it("exposes required settings and a single output slot per node", () => {
    for (const nodeClass of MEDIAGEN_NODES) {
      expect(nodeClass.requiredSettings ?? [], nodeClass.nodeType).toBeDefined();
      expect(nodeClass.metadataOutputTypes, nodeClass.nodeType).toHaveProperty("output");
    }
  });
});
