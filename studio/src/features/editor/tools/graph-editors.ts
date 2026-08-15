/**
 * features/editor/tools/graph-editors.ts — dialogue + quest graph editors (pure).
 *
 * Editing operations over the dialogue/quest graph models from
 * `engine/graph/GraphEditors`: add/remove/connect nodes, rename, and re-validate.
 * Both editors share the same immutable-update shape — the visual node editor
 * renders these graphs and calls these ops.
 */
import type { DialogueGraph, DialogueNode, QuestGraph, QuestNode } from '../../../engine/graph/GraphEditors';
import { validateGraph } from '../../../engine/graph/GraphEditors';

let counter = 0;
export function nextNodeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

// --- Dialogue editor ---------------------------------------------------------

export class DialogueEditor {
  private graph: DialogueGraph;

  constructor(graph: DialogueGraph) {
    this.graph = graph;
  }

  get current(): DialogueGraph {
    return this.graph;
  }

  addNode(node: DialogueNode): DialogueGraph {
    this.graph = { ...this.graph, nodes: [...this.graph.nodes, node] };
    return this.graph;
  }

  removeNode(id: string): DialogueGraph {
    this.graph = {
      ...this.graph,
      nodes: this.graph.nodes.filter((n) => n.id !== id),
      edges: this.graph.edges.filter((e) => e.from !== id && e.to !== id),
    };
    if (this.graph.start === id && this.graph.nodes.length > 0) this.graph.start = this.graph.nodes[0].id;
    return this.graph;
  }

  connect(from: string, to: string, index = 0): DialogueGraph {
    this.graph = { ...this.graph, edges: [...this.graph.edges, { from, to, index }] };
    return this.graph;
  }

  validate() {
    return validateGraph(this.graph);
  }
}

// --- Quest editor ------------------------------------------------------------

export class QuestEditor {
  private graph: QuestGraph;

  constructor(graph: QuestGraph) {
    this.graph = graph;
  }

  get current(): QuestGraph {
    return this.graph;
  }

  addNode(node: QuestNode): QuestGraph {
    this.graph = { ...this.graph, nodes: [...this.graph.nodes, node] };
    return this.graph;
  }

  removeNode(id: string): QuestGraph {
    this.graph = {
      ...this.graph,
      nodes: this.graph.nodes.filter((n) => n.id !== id),
      edges: this.graph.edges.filter((e) => e.from !== id && e.to !== id),
    };
    if (this.graph.start === id && this.graph.nodes.length > 0) this.graph.start = this.graph.nodes[0].id;
    return this.graph;
  }

  connect(from: string, to: string): QuestGraph {
    this.graph = { ...this.graph, edges: [...this.graph.edges, { from, to }] };
    return this.graph;
  }

  validate() {
    return validateGraph(this.graph);
  }
}
