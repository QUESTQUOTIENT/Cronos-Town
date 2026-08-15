import { describe, expect, it } from 'vitest';
import { ProjectGraph } from '../src/engine/projects/ProjectGraph';
import { StudioProject } from '../src/engine/projects/StudioProject';

describe('StudioProject — canonical studio ownership', () => {
  it('keeps authored objects and dependency graph in sync', () => {
    let tick = 10;
    const graph = new ProjectGraph();
    const project = new StudioProject(graph, () => ++tick);
    project.configureNetwork('cronos', 'Cronos', { chainId: 25, rpcUrl: 'https://evm.cronos.org', currency: 'CRO', gasToken: 'CRO' });
    project.configureToken('gold', 'Gold', { contract: '0xabc', networkId: 'cronos', decimals: 18, symbol: 'GOLD' });
    project.upsert({ id: 'shop', kind: 'economy', name: 'Shop Economy', data: { price: 5 }, references: ['gold'] });

    expect(graph.get('gold')?.kind).toBe('token');
    expect(graph.references('shop').map((node) => node.id)).toEqual(['gold']);
    expect(graph.impact('cronos').map((node) => node.id)).toEqual(['gold', 'shop']);

    project.upsert({ id: 'shop', kind: 'economy', name: 'Shop Economy', data: { price: 9 }, references: ['cronos'] });
    expect(graph.references('shop').map((node) => node.id)).toEqual(['cronos']);
  });

  it('validates network/token links and exports a JSON-safe portable snapshot', () => {
    const project = new StudioProject(new ProjectGraph(), () => 42);
    expect(() => project.configureToken('gold', 'Gold', { contract: 'x', networkId: 'missing', decimals: 18, symbol: 'GOLD' })).toThrow('Unknown network');
    expect(() => project.configureNetwork('bad', 'Bad', { chainId: 0, rpcUrl: 'nope', currency: 'X', gasToken: 'X' })).toThrow('chainId');

    project.configureNetwork('base', 'Base', { chainId: 8453, rpcUrl: 'https://mainnet.base.org', currency: 'ETH', gasToken: 'ETH' });
    const snapshot = project.snapshot();
    expect(snapshot.format).toBe('chronos-studio-project');
    expect(JSON.parse(JSON.stringify(snapshot)).objects[0].id).toBe('base');
  });
});
