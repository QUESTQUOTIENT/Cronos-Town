/**
 * ui/components/graph/index.ts — the GraphNode / GraphEdge components (atomic).
 *
 * Maps a ProjectGraph (via GraphLayout) into node + edge render specs for the
 * visual node editor. Pure + testable; the DOM layer paints the specs.
 */
import type { ProjectGraph } from '../../../engine/projects/ProjectGraph';
import { layoutEdges, layoutGraph } from '../../../engine/graph/GraphLayout';

export interface GraphNodeSpec {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  depth: number;
  selected: boolean;
}

export interface GraphEdgeSpec {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GraphViewSpec {
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
  width: number;
  height: number;
}

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 40;

/** Build node/edge render specs from a ProjectGraph (selected id highlighted). */
export function buildGraphSpec(graph: ProjectGraph, selectedId: string | null = null, layerSpacing = 220, nodeSpacing = 60): GraphViewSpec {
  const { positions, width, height } = layoutGraph(graph, { layerSpacing, nodeSpacing });
  const edges = layoutEdges(graph, positions);
  return {
    nodes: positions.map((p) => ({
      id: p.node.id,
      name: p.node.name,
      kind: p.node.kind,
      x: p.x,
      y: p.y,
      depth: p.depth,
      selected: p.node.id === selectedId,
    })),
    edges: edges.map((e) => ({ ...e, y1: e.y1 + NODE_HEIGHT / 2, y2: e.y2 + NODE_HEIGHT / 2 })),
    width,
    height,
  };
}
