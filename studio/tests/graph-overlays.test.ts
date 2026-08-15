import { describe, expect, it } from 'vitest';
import { ProjectGraph } from '../src/engine/projects/ProjectGraph';
import { transactionGraphOverlays } from '../src/engine/graph/GraphOverlays';
import type { StudioTransaction } from '../src/engine/projects/StudioTransaction';

describe('transaction graph overlays', () => {
  it('marks preview graph additions and impacted domain nodes', () => {
    const graph = new ProjectGraph(); graph.addNode({ id: 'quest-a', kind: 'quest', name: 'Quest' }); graph.addNode({ id: 'new', kind: 'quest', name: 'New' });
    const tx = { id: 'tx', title: 'Narrative change', author: 'a', timestamp: 1, domains: ['narrative'], intent: 'modify', branch: 'narrative', strategy: 'preview', state: 'preview', policies: [], beforeSnapshot: { format: 'chronos-studio-project', version: 1, objects: [] }, afterSnapshot: { format: 'chronos-studio-project', version: 1, objects: [] }, validation: [], graphDiff: { addedNodes: ['new'], removedNodes: [], addedEdges: [], removedEdges: [] }, impactSummary: { quest: 1 } } as StudioTransaction;
    expect(transactionGraphOverlays(graph, tx)).toEqual(expect.arrayContaining([{ nodeId: 'new', tone: 'added', label: 'Added by transaction' }, { nodeId: 'quest-a', tone: 'preview', label: 'Narrative change impact' }]));
  });
});
