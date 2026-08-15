/**
 * engine/graph/GraphLayout.ts — pure layered graph layout.
 *
 * The testable half of the visual project graph: given nodes + edges, compute
 * deterministic 2-D positions using a layered (Sugiyama-lite) approach — assign
 * depth by longest-path from roots, then stack nodes in each layer. The DOM layer
 * renders these positions; the layout math is pure + deterministic.
 */
import type { ProjectGraph, GraphNode } from '../projects/ProjectGraph';

export interface GraphPosition {
  node: GraphNode;
  x: number;
  y: number;
  /** Depth (layer) of the node in the DAG. */
  depth: number;
  /** Index within its layer. */
  layerIndex: number;
}

export interface GraphLayoutResult {
  positions: GraphPosition[];
  width: number;
  height: number;
}

export interface GraphLayoutOptions {
  /** Horizontal spacing between layers (px). */
  layerSpacing?: number;
  /** Vertical spacing between nodes in a layer (px). */
  nodeSpacing?: number;
}

export function layoutGraph(graph: ProjectGraph, options: GraphLayoutOptions = {}): GraphLayoutResult {
  const layerSpacing = options.layerSpacing ?? 240;
  const nodeSpacing = options.nodeSpacing ?? 70;

  // Roots = nodes with no incoming edges.
  const incoming = new Map<string, number>();
  for (const edge of graph.allEdges()) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }
  const nodes = graph.allNodes();
  const roots = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);

  // Longest-path depth from any root.
  const depth = new Map<string, number>();
  const visit = (id: string, d: number): void => {
    const current = depth.get(id) ?? -1;
    if (d <= current) return;
    depth.set(id, d);
    for (const edge of graph.outgoing(id)) visit(edge.to, d + 1);
  };
  for (const root of roots) visit(root.id, 0);
  // Any nodes not reached from a root (cycles / detached) get depth 0.
  for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, 0);

  // Group nodes by depth, preserving insertion order.
  const layers = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const layer = layers.get(d) ?? [];
    layer.push(n);
    layers.set(d, layer);
  }

  const positions: GraphPosition[] = [];
  let maxLayerHeight = 0;
  for (const [d, layerNodes] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
    maxLayerHeight = Math.max(maxLayerHeight, layerNodes.length * nodeSpacing);
    layerNodes.forEach((node, index) => {
      positions.push({ node, x: d * layerSpacing, y: index * nodeSpacing, depth: d, layerIndex: index });
    });
  }

  const maxDepth = Math.max(0, ...positions.map((p) => p.depth));
  return {
    positions,
    width: maxDepth * layerSpacing + layerSpacing,
    height: maxLayerHeight,
  };
}

/** Deterministic edge list for rendering (from/to + a straight-line description). */
export function layoutEdges(graph: ProjectGraph, positions: GraphPosition[]): Array<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }> {
  const byId = new Map(positions.map((p) => [p.node.id, p]));
  const edges: Array<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }> = [];
  for (const edge of graph.allEdges()) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
    edges.push({ from: edge.from, to: edge.to, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return edges;
}
