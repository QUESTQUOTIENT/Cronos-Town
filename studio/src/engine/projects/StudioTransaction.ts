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
export type TransactionIntent = 'create' | 'modify' | 'delete' | 'migrate' | 'synchronize' | 'import' | 'export' | 'ai-generated' | 'plugin-generated' | 'collaboration' | 'runtime' | 'rollback';
export type TransactionState = 'draft' | 'preview' | 'approved' | 'committed' | 'rejected' | 'rolled-back' | 'merged' | 'replayed';
export type TransactionPolicy = 'requires-validation' | 'requires-preview' | 'requires-backup' | 'requires-approval' | 'requires-blockchain-approval' | 'rebuild-export' | 'requires-runtime-restart' | 'requires-multiplayer-sync';

export interface GraphDiff { addedNodes: string[]; removedNodes: string[]; addedEdges: string[]; removedEdges: string[]; }
export interface GraphRevision {
  id: string; parent: string | null; transactionId: string; timestamp: number; author: string; branch: string;
  annotation?: string; objectChanges: string[]; referenceChanges: string[]; graphDiff: GraphDiff;
}
export interface StudioBranch { id: string; name: string; head: string | null; createdFrom: string | null; }
export interface StudioTransaction {
  id: string; title: string; author: string; timestamp: number; domains: TransactionDomain[]; intent: TransactionIntent; branch: string;
  strategy: PropagationStrategy; state: TransactionState; policies: TransactionPolicy[];
  beforeSnapshot: StudioProjectSnapshot; afterSnapshot: StudioProjectSnapshot;
  validation: StudioDiagnostic[]; graphDiff: GraphDiff; impactSummary: Record<string, number>;
  revisionId?: string; rollbackTransaction?: string;
}

const edgeKey = (edge: { from: string; to: string; relation: string }) => `${edge.from}|${edge.relation}|${edge.to}`;
const policiesFor = (domains: TransactionDomain[]): TransactionPolicy[] => {
  const policies: TransactionPolicy[] = ['requires-validation'];
  if (domains.some((domain) => ['economy', 'blockchain', 'ai'].includes(domain))) policies.push('requires-preview', 'requires-backup');
  if (domains.includes('blockchain')) policies.push('requires-approval', 'requires-blockchain-approval', 'rebuild-export');
  if (domains.includes('runtime')) policies.push('requires-runtime-restart');
  if (domains.includes('export') && !policies.includes('rebuild-export')) policies.push('rebuild-export');
  return policies;
};

export class StudioTransactionEngine {
  private readonly transactions = new Map<string, StudioTransaction>();
  private readonly revisions: GraphRevision[] = [];
  private readonly branches = new Map<string, StudioBranch>([
    ['main', { id: 'main', name: 'Main', head: null, createdFrom: null }],
    ['economy', { id: 'economy', name: 'Economy', head: null, createdFrom: null }],
    ['narrative', { id: 'narrative', name: 'Narrative', head: null, createdFrom: null }],
    ['ui', { id: 'ui', name: 'UI', head: null, createdFrom: null }],
    ['blockchain', { id: 'blockchain', name: 'Blockchain', head: null, createdFrom: null }],
    ['ai', { id: 'ai', name: 'AI', head: null, createdFrom: null }],
    ['experimental', { id: 'experimental', name: 'Experimental', head: null, createdFrom: null }],
  ]);
  private sequence = 0;
  constructor(private readonly project: StudioProject, private readonly graph: ProjectGraph, private readonly now: () => number = () => Date.now()) {}

  draft(input: { title: string; author: string; domains: TransactionDomain[]; strategy?: PropagationStrategy; intent?: TransactionIntent; branch?: string }, producer: () => Record<string, number> = () => ({})): StudioTransaction {
    const branch = input.branch ?? 'main';
    if (!this.branches.has(branch)) throw new Error(`Unknown transaction branch: ${branch}`);
    const beforeSnapshot = this.project.snapshot();
    const beforeGraph = this.graph.serialize();
    const impactSummary = producer(); // producer may stage writes against the project
    const afterSnapshot = this.project.snapshot();
    const afterGraph = this.graph.serialize();
    // A draft must never leave canonical state mutated.
    this.project.restore(beforeSnapshot); this.graph.deserialize(beforeGraph);
    const validation = afterSnapshot.objects.flatMap((object) => validateStudioObject(object));
    const tx: StudioTransaction = {
      id: `tx-${++this.sequence}`, title: input.title, author: input.author, timestamp: this.now(), domains: [...input.domains], intent: input.intent ?? 'modify', branch, strategy: input.strategy ?? 'transactional', state: 'draft', policies: policiesFor(input.domains),
      beforeSnapshot, afterSnapshot, validation, graphDiff: this.diff(beforeGraph, afterGraph), impactSummary,
    };
    this.transactions.set(tx.id, tx);
    return this.copy(tx);
  }

  preview(id: string): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || tx.state !== 'draft') return undefined;
    tx.state = 'preview'; return this.copy(tx);
  }

  approve(id: string): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || !['draft', 'preview'].includes(tx.state)) return undefined;
    tx.state = 'approved'; return this.copy(tx);
  }

  commit(id: string, approved = false): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || !['draft', 'preview', 'approved'].includes(tx.state)) return undefined;
    if (tx.validation.some((diagnostic) => diagnostic.severity === 'error')) { tx.state = 'rejected'; return this.copy(tx); }
    if (tx.policies.includes('requires-preview') && tx.state === 'draft') return undefined;
    if (tx.policies.includes('requires-approval') && tx.state !== 'approved' && !approved) return undefined;
    this.project.restore(tx.afterSnapshot);
    const branch = this.branches.get(tx.branch) as StudioBranch;
    const revision: GraphRevision = { id: `rev-${this.revisions.length + 1}`, parent: branch.head, transactionId: tx.id, timestamp: this.now(), author: tx.author, branch: tx.branch,
      objectChanges: this.changedObjects(tx.beforeSnapshot.objects, tx.afterSnapshot.objects), referenceChanges: tx.graphDiff.addedEdges.concat(tx.graphDiff.removedEdges), graphDiff: tx.graphDiff };
    this.revisions.push(revision); branch.head = revision.id; tx.revisionId = revision.id; tx.state = 'committed'; return this.copy(tx);
  }

  rollback(id: string, author = 'system'): StudioTransaction | undefined {
    const tx = this.transactions.get(id); if (!tx || tx.state !== 'committed') return undefined;
    const rollback = this.draft({ title: `Rollback: ${tx.title}`, author, domains: tx.domains, strategy: 'transactional', intent: 'rollback', branch: tx.branch }, () => { this.project.restore(tx.beforeSnapshot); return {}; });
    this.preview(rollback.id); this.approve(rollback.id);
    const committed = this.commit(rollback.id, true); if (committed) { tx.rollbackTransaction = committed.id; tx.state = 'rolled-back'; }
    return committed;
  }

  /** Replay re-stages a previously committed result as a new governed draft. */
  replay(id: string, author = 'system'): StudioTransaction | undefined {
    const source = this.transactions.get(id); if (!source) return undefined;
    const replay = this.draft({ title: `Replay: ${source.title}`, author, domains: source.domains, strategy: source.strategy, intent: source.intent, branch: source.branch }, () => { this.project.restore(source.afterSnapshot); return source.impactSummary; });
    const stored = this.transactions.get(replay.id) as StudioTransaction; stored.state = 'replayed'; return this.copy(stored);
  }

  createBranch(id: string, name: string, fromBranch = 'main'): StudioBranch {
    if (this.branches.has(id)) throw new Error(`Branch already exists: ${id}`);
    const source = this.branches.get(fromBranch); if (!source) throw new Error(`Unknown source branch: ${fromBranch}`);
    const branch: StudioBranch = { id, name, head: source.head, createdFrom: source.head }; this.branches.set(id, branch); return { ...branch };
  }

  /** Merge records a revision relationship after policy/validation has already occurred on source commits. */
  merge(sourceBranch: string, targetBranch: string, author: string, annotation = ''): GraphRevision {
    const source = this.branches.get(sourceBranch); const target = this.branches.get(targetBranch);
    if (!source || !target) throw new Error('Unknown branch.');
    const revision: GraphRevision = { id: `rev-${this.revisions.length + 1}`, parent: target.head, transactionId: `merge:${sourceBranch}:${targetBranch}`, timestamp: this.now(), author, branch: targetBranch, annotation: annotation || `Merged ${sourceBranch} into ${targetBranch}`, objectChanges: [], referenceChanges: [], graphDiff: { addedNodes: [], removedNodes: [], addedEdges: [], removedEdges: [] } };
    this.revisions.push(revision); target.head = revision.id; return JSON.parse(JSON.stringify(revision)) as GraphRevision;
  }

  all(): StudioTransaction[] { return [...this.transactions.values()].map((tx) => this.copy(tx)); }
  revisionsList(): GraphRevision[] { return this.revisions.map((revision) => JSON.parse(JSON.stringify(revision)) as GraphRevision); }
  branchesList(): StudioBranch[] { return [...this.branches.values()].map((branch) => ({ ...branch })); }

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
