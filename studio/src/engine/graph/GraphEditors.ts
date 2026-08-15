/**
 * engine/graph/GraphEditors.ts — graph-native editor data models.
 *
 * Dialogue, quest, and automation editors all edit *graphs*: typed nodes with
 * typed edges. This module defines the node/edge shapes and validation rules for
 * each, so a visual node editor can render + validate them generically. Pure +
 * serializable — the "visual graph workflows" backing.
 */

// --- Dialogue graph ----------------------------------------------------------

export type DialogueNode =
  | { id: string; kind: 'line'; speaker: string; text: string }
  | { id: string; kind: 'choice'; prompt: string; options: string[] }
  | { id: string; kind: 'branch'; condition: string }
  | { id: string; kind: 'end' };

export interface DialogueEdge {
  from: string;
  to: string;
  /** For choice nodes, the option index (0-based); else 0. */
  index?: number;
}

export interface DialogueGraph {
  kind: 'dialogue';
  start: string;
  nodes: DialogueNode[];
  edges: DialogueEdge[];
}

// --- Quest graph -------------------------------------------------------------

export type QuestNode =
  | { id: string; kind: 'objective'; title: string; description: string }
  | { id: string; kind: 'reward'; label: string; amount: number }
  | { id: string; kind: 'gate'; condition: string }
  | { id: string; kind: 'complete' };

export interface QuestGraph {
  kind: 'quest';
  start: string;
  nodes: QuestNode[];
  edges: Array<{ from: string; to: string }>;
}

// --- Automation graph --------------------------------------------------------

export type AutomationNode =
  | { id: string; kind: 'trigger'; label: string; condition?: string }
  | { id: string; kind: 'action'; label: string }
  | { id: string; kind: 'branch'; condition: string };

export interface AutomationGraph {
  kind: 'automation';
  start: string;
  nodes: AutomationNode[];
  edges: Array<{ from: string; to: string }>;
}

// --- Validation --------------------------------------------------------------

export type GraphKind = 'dialogue' | 'quest' | 'automation';

export interface GraphValidationIssue {
  nodeId: string | null;
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  issues: GraphValidationIssue[];
}

/** Validate a dialogue/quest/automation graph for structural integrity. */
export function validateGraph(graph: DialogueGraph | QuestGraph | AutomationGraph): GraphValidationResult {
  const issues: GraphValidationIssue[] = [];
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (ids.has(node.id)) issues.push({ nodeId: node.id, message: 'Duplicate node id.' });
    ids.add(node.id);
  }
  if (!graph.nodes.some((n) => n.id === graph.start)) {
    issues.push({ nodeId: null, message: `Start node "${graph.start}" does not exist.` });
  }
  for (const edge of graph.edges) {
    if (!ids.has(edge.from)) issues.push({ nodeId: null, message: `Edge from unknown node "${edge.from}".` });
    if (!ids.has(edge.to)) issues.push({ nodeId: null, message: `Edge to unknown node "${edge.to}".` });
  }
  // No dangling nodes reachable from start → warn on unreachable nodes.
  const reachable = new Set<string>([graph.start]);
  const queue = [graph.start];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const edge of graph.edges) {
      if (edge.from === current && !reachable.has(edge.to)) {
        reachable.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  for (const node of graph.nodes) {
    if (!reachable.has(node.id)) issues.push({ nodeId: node.id, message: `Unreachable node "${node.id}".` });
  }
  return { valid: issues.length === 0, issues };
}

/** Count nodes by kind (for the inspector / toolbar summary). */
export function nodeKindCounts(graph: DialogueGraph | QuestGraph | AutomationGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
  return counts;
}
