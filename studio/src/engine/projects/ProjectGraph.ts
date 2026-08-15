/**
 * engine/projects/ProjectGraph.ts — the unified project graph.
 *
 * Every asset, map, quest, UI screen, automation, and dialogue becomes a node in
 * one graph, with typed edges ("references", "contains", "depends-on"). This is
 * what lets search, history, references, and exports work *across* every system —
 * the "single project graph" the studio platform needs.
 *
 * Pure + deterministic. Serializable.
 */

export type NodeKind =
  | 'project' | 'world' | 'map' | 'entity' | 'ui-screen' | 'panel' | 'component'
  | 'asset' | 'sprite' | 'tileset' | 'audio'
  | 'quest' | 'dialogue' | 'economy' | 'wallet' | 'token' | 'liquidity-pool'
  | 'automation' | 'ai-agent' | 'plugin';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

export class ProjectGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges: GraphEdge[] = [];

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    // Remove any edges touching the node.
    for (let i = this.edges.length - 1; i >= 0; i -= 1) {
      const e = this.edges[i];
      if (e.from === id || e.to === id) this.edges.splice(i, 1);
    }
  }

  addEdge(from: string, to: string, relation: string): boolean {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return false;
    this.edges.push({ from, to, relation });
    return true;
  }

  /** Remove an edge by (from, to, relation). Returns true if one was removed. */
  removeEdge(from: string, to: string, relation: string): boolean {
    const idx = this.edges.findIndex((e) => e.from === from && e.to === to && e.relation === relation);
    if (idx === -1) return false;
    this.edges.splice(idx, 1);
    return true;
  }

  get(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  nodesByKind(kind: NodeKind): GraphNode[] {
    return [...this.nodes.values()].filter((n) => n.kind === kind);
  }

  /** All nodes (insertion order). */
  allNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  /** All edges (insertion order). */
  allEdges(): GraphEdge[] {
    return [...this.edges];
  }

  /** Outgoing edges from a node. */
  outgoing(id: string): GraphEdge[] {
    return this.edges.filter((e) => e.from === id);
  }

  /** Incoming edges to a node. */
  incoming(id: string): GraphEdge[] {
    return this.edges.filter((e) => e.to === id);
  }

  /** Nodes directly referenced by `id` (via outgoing edges). */
  references(id: string): GraphNode[] {
    return this.outgoing(id)
      .map((e) => this.nodes.get(e.to))
      .filter((n): n is GraphNode => Boolean(n));
  }

  /** Breadth-first reachable nodes from a starting id (excluding itself). */
  reachable(id: string): GraphNode[] {
    const seen = new Set<string>([id]);
    const queue = [id];
    const result: GraphNode[] = [];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const edge of this.outgoing(current)) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        const node = this.nodes.get(edge.to);
        if (node) {
          result.push(node);
          queue.push(edge.to);
        }
      }
    }
    return result;
  }

  /** Case-insensitive search over node id/name. */
  search(query: string): GraphNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.allNodes();
    return this.allNodes().filter((n) => n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q));
  }

  /** Nodes that depend on `id` (direct dependents, via incoming edges). */
  dependents(id: string): GraphNode[] {
    return this.incoming(id)
      .map((e) => this.nodes.get(e.from))
      .filter((n): n is GraphNode => Boolean(n));
  }

  /** Impact analysis: every node transitively dependent on `id`. */
  impact(id: string): GraphNode[] {
    const seen = new Set<string>([id]);
    const queue = [id];
    const result: GraphNode[] = [];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const edge of this.incoming(current)) {
        if (seen.has(edge.from)) continue;
        seen.add(edge.from);
        const node = this.nodes.get(edge.from);
        if (node) {
          result.push(node);
          queue.push(edge.from);
        }
      }
    }
    return result;
  }

  /** A node is safe to delete if nothing depends on it (no incoming edges). */
  safeToDelete(id: string): boolean {
    return this.incoming(id).length === 0;
  }

  /**
   * Delete a node, returning the set of nodes that WOULD be orphaned/cascade.
   * Returns `{ deleted: true }` on success, or `{ deleted: false, blocking }`
   * if the node has dependents (caller decides whether to cascade).
   */
  deleteWithCheck(id: string): { deleted: boolean; blocking?: GraphNode[] } {
    const blockers = this.dependents(id);
    if (blockers.length > 0) return { deleted: false, blocking: blockers };
    this.removeNode(id);
    return { deleted: true };
  }

  /** A dependency dump for a node: { references, dependents, impact }. */
  analyze(id: string): {
    references: GraphNode[];
    dependents: GraphNode[];
    impact: GraphNode[];
    safeToDelete: boolean;
  } {
    return {
      references: this.references(id),
      dependents: this.dependents(id),
      impact: this.impact(id),
      safeToDelete: this.safeToDelete(id),
    };
  }

  /** Serialize to a JSON-safe graph (nodes + edges). */
  serialize(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return { nodes: this.allNodes(), edges: [...this.edges] };
  }

  /** Restore from a `serialize()` snapshot. */
  deserialize(snapshot: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.nodes.clear();
    this.edges.length = 0;
    for (const node of snapshot.nodes) this.nodes.set(node.id, node);
    for (const edge of snapshot.edges) {
      if (this.nodes.has(edge.from) && this.nodes.has(edge.to)) this.edges.push(edge);
    }
  }
}
