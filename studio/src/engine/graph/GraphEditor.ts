/**
 * engine/graph/GraphEditor.ts — editable project graph (command-backed).
 *
 * Node/edge CRUD on the ProjectGraph as *commands*, so graph editing is
 * undoable/redoable automatically — the "visual graph editor" backing. Pure +
 * deterministic.
 */
import { ProjectGraph, type GraphNode, type NodeKind } from '../projects/ProjectGraph';
import { CommandStack, type Command, type CommandContext } from '../commands/Command';

interface GraphEditorContext extends CommandContext {
  graph: ProjectGraph;
}

export class GraphEditor {
  constructor(
    private readonly graph: ProjectGraph,
    private readonly stack: CommandStack,
  ) {}

  private ctx(): GraphEditorContext {
    return { graph: this.graph, world: this.graph };
  }

  /** Add a node (undoable). */
  addNode(node: GraphNode): void {
    const cmd: Command = {
      type: 'graph.add-node',
      label: `Add ${node.name}`,
      execute: (c) => (c as GraphEditorContext).graph.addNode(node),
      undo: (c) => (c as GraphEditorContext).graph.removeNode(node.id),
    };
    this.stack.execute(cmd, this.ctx());
  }

  /** Add an edge (undoable). */
  addEdge(from: string, to: string, relation: string): boolean {
    if (!this.graph.has(from) || !this.graph.has(to)) return false;
    const cmd: Command = {
      type: 'graph.add-edge',
      label: `Connect ${from} → ${to}`,
      execute: (c) => (c as GraphEditorContext).graph.addEdge(from, to, relation),
      undo: (c) => (c as GraphEditorContext).graph.removeEdge(from, to, relation),
    };
    this.stack.execute(cmd, this.ctx());
    return true;
  }

  /** Remove a node (undoable). */
  removeNode(id: string): boolean {
    if (!this.graph.has(id)) return false;
    const node = this.graph.get(id)!;
    const edges = [...this.graph.outgoing(id), ...this.graph.incoming(id)];
    const cmd: Command = {
      type: 'graph.remove-node',
      label: `Remove ${node.name}`,
      execute: (c) => (c as GraphEditorContext).graph.removeNode(id),
      undo: (c) => {
        const g = (c as GraphEditorContext).graph;
        g.addNode(node);
        for (const e of edges) g.addEdge(e.from, e.to, e.relation);
      },
    };
    this.stack.execute(cmd, this.ctx());
    return true;
  }

  /** Change a node's kind (undoable). */
  setKind(id: string, kind: NodeKind): boolean {
    const node = this.graph.get(id);
    if (!node) return false;
    const cmd: Command = {
      type: 'graph.set-kind',
      label: `Set ${node.name} kind`,
      execute: (c) => (c as GraphEditorContext).graph.addNode({ ...node, kind }),
      undo: (c) => (c as GraphEditorContext).graph.addNode(node),
    };
    this.stack.execute(cmd, this.ctx());
    return true;
  }

  undo(): boolean {
    return this.stack.undo(this.ctx()) !== null;
  }

  redo(): boolean {
    return this.stack.redo(this.ctx()) !== null;
  }

  get canUndo(): boolean {
    return this.stack.canUndo;
  }
}
