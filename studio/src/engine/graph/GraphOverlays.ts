/** Transaction/revision-aware graph overlay specs for any renderer. */
import type { ProjectGraph } from '../projects/ProjectGraph';
import type { StudioTransaction, TransactionDomain } from '../projects/StudioTransaction';

export type GraphOverlayTone = 'narrative' | 'economy' | 'blockchain' | 'ui' | 'audio' | 'ai' | 'world' | 'runtime' | 'export' | 'preview' | 'added' | 'removed';
export interface GraphOverlay { nodeId: string; tone: GraphOverlayTone; label: string; }

const toneForDomain = (domain: TransactionDomain): GraphOverlayTone => domain;
export function transactionGraphOverlays(graph: ProjectGraph, transaction: StudioTransaction): GraphOverlay[] {
  const overlays: GraphOverlay[] = [];
  const primary = transaction.state === 'preview' ? 'preview' : toneForDomain(transaction.domains[0] ?? 'runtime');
  for (const node of graph.allNodes()) {
    if (transaction.graphDiff.addedNodes.includes(node.id)) overlays.push({ nodeId: node.id, tone: 'added', label: 'Added by transaction' });
    else if (transaction.graphDiff.removedNodes.includes(node.id)) overlays.push({ nodeId: node.id, tone: 'removed', label: 'Removed by transaction' });
    else if (transaction.impactSummary[node.kind] || transaction.graphDiff.addedEdges.concat(transaction.graphDiff.removedEdges).some((edge) => edge.includes(node.id))) overlays.push({ nodeId: node.id, tone: primary, label: `${transaction.title} impact` });
  }
  return overlays;
}
