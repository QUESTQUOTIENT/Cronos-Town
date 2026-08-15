import { describe, expect, it } from 'vitest';
import { ProjectGraph } from '../src/engine/projects/ProjectGraph';
import { StudioProject } from '../src/engine/projects/StudioProject';
import { StudioTransactionEngine } from '../src/engine/projects/StudioTransaction';

describe('StudioTransactionEngine', () => {
  it('stages canonical changes, previews graph diff, and only mutates on commit', () => {
    const graph = new ProjectGraph();
    const project = new StudioProject(graph, () => 1);
    const transactions = new StudioTransactionEngine(project, graph, () => 10);
    const tx = transactions.draft({ title: 'Create chapter', author: 'creator', domains: ['narrative'] }, () => {
      project.upsert({ id: 'chapter-1', kind: 'story', name: 'Chapter 1', data: {}, references: [] });
      return { story: 1 };
    });
    expect(project.get('chapter-1')).toBeUndefined();
    expect(tx.graphDiff.addedNodes).toEqual(['chapter-1']);
    expect(transactions.preview(tx.id)?.state).toBe('preview');
    expect(transactions.commit(tx.id)?.state).toBe('committed');
    expect(project.get('chapter-1')?.name).toBe('Chapter 1');
    expect(transactions.revisionsList()[0].objectChanges).toContain('chapter-1');
  });

  it('requires explicit approval for blockchain transactions and can roll them back', () => {
    const graph = new ProjectGraph(); const project = new StudioProject(graph, () => 1);
    const transactions = new StudioTransactionEngine(project, graph, () => 10);
    const tx = transactions.draft({ title: 'Add network', author: 'creator', domains: ['blockchain'] }, () => {
      project.configureNetwork('net', 'Net', { chainId: 1, rpcUrl: 'https://rpc.example', currency: 'ETH', gasToken: 'ETH' }); return { network: 1 };
    });
    expect(transactions.commit(tx.id)).toBeUndefined();
    transactions.preview(tx.id); transactions.approve(tx.id);
    expect(transactions.commit(tx.id)?.state).toBe('committed');
    const rollback = transactions.rollback(tx.id, 'creator');
    expect(rollback?.state).toBe('committed');
    expect(project.get('net')).toBeUndefined();
  });
});
