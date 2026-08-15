/**
 * Governed mutation foundation. Transactions own the before/after revisions;
 * callers may draft and preview changes, but canonical state changes only on
 * commit. This is intentionally independent of any editor surface.
 */
import type { ProjectGraph } from './ProjectGraph';
import type { StudioProject, StudioProjectSnapshot, StudioObject } from './StudioProject';
import { validateStudioObject, type StudioDiagnostic } from './StudioSchemas';
import type { PropagationStrategy } from './StudioPropagation';

export type TransactionDomain = 'narrative' | 'economy' | 'blockchain' | 'world' | 'ui' | 'audio' | 'ai' | 'runtime' | 'export';
export type TransactionState = 'draft' | 'previewed' | 'committed' | 'rolled-back' | 'rejected';
export type TransactionPolicy = 'requires-validation' | 'requires-preview' | 'requires-backup' | 'requires-approval' | 'rebuild-export';

export interface GraphDiff { addedNodes: string[]; removedNodes: string[]; addedEdges: string[]; removedEdges: string[]; }
export interface GraphRevision {
  id: string; parent: string | null; transactionId: string; timestamp: number; author: string;
  objectChanges: string[]; referenceChanges: string[]; graphDiff: GraphDiff;
}
export interface StudioTransaction {
  id: string; title: string; author: string; timestamp: number; domains: TransactionDomain[];
  strategy: PropagationStrategy; state: TransactionState; policies: TransactionPolicy[];
  beforeSnapshot: StudioProjectSnapshot; afterSnapshot: StudioProjectSnapshot;
  validation: StudioDiagnostic[]; graphDiff: GraphDiff; impactSummary: Record<string, number>;
  revisionId?: string; rollbackTransaction?: string;
}

const edgeKey = (edge: { from: string; to: string; relation: string }) => `${edge.from}|${edge.relation}|${edge.to}`;
const policiesFor = (domains: TransactionDomain[]): TransactionPolicy[] => {
  const policies: TransactionPolicy[] = ['requires-validation'];
  if (domains.some((domain) => ['economy', 'blockchain', 'ai'].includes(domain))) policies.push('requires-preview', 'requires-backup');
  if (domains.includes('blockchain')) policies.push('requires-approval', 'rebuild-export');
  if (domains.includes('export') && !policies.includes('rebuild-export')) policies.push('rebuild-export');
  return policies;
};

export class StudioTransactionEngine {
  private readonly transactions = new Map<string, StudioTransaction>();
  private readonly revisions: GraphRevision[] = [];
  private sequence = 0;
  constructor(private readonly project: StudioProject, private readonly graph: ProjectGraph, private readonly now: () => number = () => Date.now()) {}

  draft(input: { title: string; author: string; domains: TransactionDomain[]; strategy?: PropagationStrategy }, producer: () => Record<string, number> = () => ({})): StudioTransaction {
    const beforeSnapshot = this.project.snapshot();
    const beforeGraph = this.graph.serialize();
    const impactSummary = producer(); // producer may stage writes against the project
    const afterSnapshot = this.project.snapshot();
    const afterGraph = this.graph.serialize();
    // A draft must never leave canonical state mutated.
    this.project.restore(beforeSnapshot); this.graph.deserialize(beforeGraph);
    const validation = afterSnapshot.objects.flatMap((object) => validateStudioObject(object));
    const tx: StudioTransaction = {
      id: `tx-${++this.sequence}`, title: input.title, author: input.author, timestamp: this.now(), domains: [...input.domains], strategy: input.strategy ?? 'transactional', state: 'draft', policies: policiesFor(input.domains),
      beforeSnapshot, afterSnapshot, validation, graphDiff: this.diff(beforeGraph, afterGraph), impactSummary,
    };
    this.transactions.set(tx.id, tx);
    return this.copy(tx);
  }

  preview(id: string): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || tx.state !== 'draft') return undefined;
    tx.state = 'previewed'; return this.copy(tx);
  }

  commit(id: string, approved = false): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || !['draft', 'previewed'].includes(tx.state)) return undefined;
    if (tx.validation.some((diagnostic) => diagnostic.severity === 'error')) { tx.state = 'rejected'; return this.copy(tx); }
    if (tx.policies.includes('requires-approval') && !approved) return undefined;
    this.project.restore(tx.afterSnapshot);
    const previousRevision = this.revisions[this.revisions.length - 1];
    const revision: GraphRevision = { id: `rev-${this.revisions.length + 1}`, parent: previousRevision?.id ?? null, transactionId: tx.id, timestamp: this.now(), author: tx.author,
      objectChanges: this.changedObjects(tx.beforeSnapshot.objects, tx.afterSnapshot.objects), referenceChanges: tx.graphDiff.addedEdges.concat(tx.graphDiff.removedEdges), graphDiff: tx.graphDiff };
    this.revisions.push(revision); tx.revisionId = revision.id; tx.state = 'committed'; return this.copy(tx);
  }

  rollback(id: string, author = 'system'): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || tx.state !== 'committed') return undefined;
    const rollback = this.draft({ title: `Rollback: ${tx.title}`, author, domains: tx.domains, strategy: 'transactional' }, () => { this.project.restore(tx.beforeSnapshot); return {}; });
    const committed = this.commit(rollback.id, true); if (committed) { tx.rollbackTransaction = committed.id; tx.state = 'rolled-back'; }
    return committed;
  }

  all(): StudioTransaction[] { return [...this.transactions.values()].map((tx) => this.copy(tx)); }
  revisionsList(): GraphRevision[] { return this.revisions.map((revision) => JSON.parse(JSON.stringify(revision)) as GraphRevision); }

  private diff(before: { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string; relation: string }> }, after: { nodes: Array<{ id: string }>; edges: Array<{ from: string; to: string; relation: string }> }): GraphDiff {
    const beforeNodes = new Set(before.nodes.map((node) => node.id)); const afterNodes = new Set(after.nodes.map((node) => node.id));
    const beforeEdges = new Set(before.edges.map(edgeKey)); const afterEdges = new Set(after.edges.map(edgeKey));
    return { addedNodes: [...afterNodes].filter((id) => !beforeNodes.has(id)), removedNodes: [...beforeNodes].filter((id) => !afterNodes.has(id)), addedEdges: [...afterEdges].filter((id) => !beforeEdges.has(id)), removedEdges: [...beforeEdges].filter((id) => !afterEdges.has(id)) };
  }
  private changedObjects(before: StudioObject[], after: StudioObject[]): string[] {
    const prior = new Map(before.map((object) => [object.id, JSON.stringify(object)]));
    const ids = new Set([...before.map((object) => object.id), ...after.map((object) => object.id)]);
    return [...ids].filter((id) => prior.get(id) !== JSON.stringify(after.find((object) => object.id === id)));
  }
  private copy(tx: StudioTransaction): StudioTransaction { return JSON.parse(JSON.stringify(tx)) as StudioTransaction; }
}
