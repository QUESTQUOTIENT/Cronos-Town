import { describe, expect, it } from 'vitest';

import { ProjectGraph } from '../src/engine/projects/ProjectGraph';
import { EntityManager, type Component } from '../src/engine/entity/EntityManager';
import { AssetRegistry } from '../src/engine/assets/AssetRegistry';
import { Inspector } from '../src/engine/inspector/Inspector';
import { layoutEdges, layoutGraph } from '../src/engine/graph/GraphLayout';
import { inspectorSection, statusBar } from '../src/ui/components2';

describe('engine/projects/ProjectGraph — single source of truth', () => {
  it('exposes the full node-kind vocabulary', () => {
    const g = new ProjectGraph();
    const kinds = ['project', 'map', 'entity', 'quest', 'dialogue', 'ui-screen', 'panel', 'component', 'sprite', 'tileset', 'audio', 'automation', 'wallet', 'token', 'liquidity-pool', 'ai-agent', 'plugin', 'economy', 'asset', 'world'] as const;
    for (const k of kinds) g.addNode({ id: `n-${k}`, kind: k, name: k });
    expect(g.allNodes()).toHaveLength(kinds.length);
  });

  it('dependents + impact + safeToDelete analyze the graph', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'project', kind: 'project', name: 'Game' });
    g.addNode({ id: 'map', kind: 'map', name: 'Hometown' });
    g.addNode({ id: 'quest', kind: 'quest', name: 'Main Quest' });
    g.addNode({ id: 'entity', kind: 'entity', name: 'NPC' });
    g.addEdge('project', 'map', 'contains');
    g.addEdge('map', 'quest', 'contains');
    g.addEdge('quest', 'entity', 'requires');

    expect(g.dependents('map').map((n) => n.id)).toEqual(['project']);
    expect(g.impact('entity').map((n) => n.id).sort()).toEqual(['map', 'project', 'quest']);
    expect(g.safeToDelete('entity')).toBe(false); // quest depends on entity
    expect(g.safeToDelete('map')).toBe(false); // project depends on map
    expect(g.safeToDelete('project')).toBe(true); // nothing depends on project
  });

  it('deleteWithCheck blocks when dependents exist', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'a', kind: 'map', name: 'A' });
    g.addNode({ id: 'b', kind: 'map', name: 'B' });
    g.addEdge('a', 'b', 'ref');
    const blocked = g.deleteWithCheck('b');
    expect(blocked.deleted).toBe(false);
    expect(blocked.blocking?.map((n) => n.id)).toEqual(['a']);

    const ok = g.deleteWithCheck('a');
    expect(ok.deleted).toBe(true);
  });

  it('analyze returns references + dependents + impact + safety', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'P' });
    g.addNode({ id: 'm', kind: 'map', name: 'M' });
    g.addEdge('p', 'm', 'contains');
    const a = g.analyze('m');
    expect(a.references).toHaveLength(0);
    expect(a.dependents.map((n) => n.id)).toEqual(['p']);
    expect(a.safeToDelete).toBe(false);
  });
});

describe('engine/inspector — live inspector', () => {
  function scope() {
    const entities = new EntityManager();
    const graph = new ProjectGraph();
    const assets = new AssetRegistry(() => 1);
    const e = entities.createEntity();
    entities.addComponent(e, { type: 'transform', x: 3, y: 4 });
    entities.addComponent(e, { type: 'npc', name: '@Flippy' });
    graph.addNode({ id: 'm1', kind: 'map', name: 'Hometown', metadata: { theme: 'grass' } });
    graph.addNode({ id: 'q1', kind: 'quest', name: 'Main Quest' });
    graph.addEdge('q1', 'm1', 'requires');
    assets.register({ id: 's1', kind: 'sprite', name: 'Grass', source: 'x.png', metadata: { size: '32' } });
    return { entities, graph, assets, e };
  }

  it('inspects an entity (components section)', () => {
    const s = scope();
    const inspector = new Inspector(s);
    const spec = inspector.inspect({ kind: 'entity', id: s.e });
    expect(spec?.title).toBe(`Entity #${s.e}`);
    expect(spec?.sections[0].title).toBe('Components');
    expect(spec?.sections[0].fields.map((f) => f.label)).toEqual(['transform', 'npc']);
  });

  it('inspects a graph node (properties + references + dependencies)', () => {
    const s = scope();
    const inspector = new Inspector(s);
    const spec = inspector.inspect({ kind: 'node', id: 'm1' });
    expect(spec?.title).toBe('Hometown');
    expect(spec?.subtitle).toBe('map');
    const props = spec!.sections.find((sec) => sec.title === 'Properties')!;
    expect(props.fields.some((f) => f.label === 'theme' && f.value === 'grass')).toBe(true);
    const deps = spec!.sections.find((sec) => sec.title === 'Dependencies')!;
    expect(deps.fields.find((f) => f.label === 'dependents')?.value).toBe('1'); // q1 -> m1
    expect(deps.fields.find((f) => f.label === 'safe to delete')?.value).toBe('no');
  });

  it('inspects an asset (properties + metadata)', () => {
    const s = scope();
    const inspector = new Inspector(s);
    const spec = inspector.inspect({ kind: 'asset', id: 's1' });
    expect(spec?.title).toBe('Grass');
    expect(spec?.subtitle).toBe('sprite');
    expect(spec?.sections.some((sec) => sec.title === 'Metadata')).toBe(true);
  });

  it('returns null for unknown selections', () => {
    const s = scope();
    const inspector = new Inspector(s);
    expect(inspector.inspect({ kind: 'entity', id: 999 })).toBeNull();
    expect(inspector.inspect({ kind: 'node', id: 'nope' })).toBeNull();
    expect(inspector.inspect(null)).toBeNull();
  });
});

describe('engine/graph — GraphLayout', () => {
  it('lays out a layered DAG deterministically (project → map → quest)', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'P' });
    g.addNode({ id: 'm', kind: 'map', name: 'M' });
    g.addNode({ id: 'q', kind: 'quest', name: 'Q' });
    g.addEdge('p', 'm', 'contains');
    g.addEdge('m', 'q', 'contains');

    const { positions, width, height } = layoutGraph(g, { layerSpacing: 100, nodeSpacing: 40 });
    const byId = Object.fromEntries(positions.map((p) => [p.node.id, p]));
    expect(byId.p.depth).toBe(0);
    expect(byId.m.depth).toBe(1);
    expect(byId.q.depth).toBe(2);
    expect(byId.p.x).toBe(0);
    expect(byId.m.x).toBe(100);
    expect(byId.q.x).toBe(200);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('stacks multiple children in the same layer', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'P' });
    g.addNode({ id: 'a', kind: 'map', name: 'A' });
    g.addNode({ id: 'b', kind: 'map', name: 'B' });
    g.addEdge('p', 'a', 'contains');
    g.addEdge('p', 'b', 'contains');
    const { positions } = layoutGraph(g, { layerSpacing: 100, nodeSpacing: 40 });
    const a = positions.find((p) => p.node.id === 'a')!;
    const b = positions.find((p) => p.node.id === 'b')!;
    expect(a.depth).toBe(1);
    expect(b.depth).toBe(1);
    expect(a.y).not.toBe(b.y); // stacked
  });

  it('layoutEdges produces straight-line coords between positioned nodes', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'P' });
    g.addNode({ id: 'm', kind: 'map', name: 'M' });
    g.addEdge('p', 'm', 'contains');
    const { positions } = layoutGraph(g, { layerSpacing: 100, nodeSpacing: 40 });
    const edges = layoutEdges(g, positions);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from: 'p', to: 'm', x1: 0, x2: 100 });
  });

  it('tolerates cycles (no infinite loop)', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'a', kind: 'map', name: 'A' });
    g.addNode({ id: 'b', kind: 'map', name: 'B' });
    g.addEdge('a', 'b', 'ref');
    g.addEdge('b', 'a', 'ref');
    const { positions } = layoutGraph(g);
    expect(positions).toHaveLength(2);
  });
});

describe('ui/components2 — component specs', () => {
  it('inspectorSection builds rows from fields', () => {
    const sec = inspectorSection('s1', 'Props', [{ label: 'HP', value: '110', tone: 'teal' }]);
    expect(sec.kind).toBe('inspector-section');
    expect(sec.rows).toHaveLength(1);
    expect(sec.rows[0].label).toBe('HP');
    expect(sec.rows[0].tone).toBe('teal');
  });

  it('statusBar builds items', () => {
    const bar = statusBar('sb', [{ label: 'PROJECT', value: 'Game' }]);
    expect(bar.kind).toBe('status-bar');
    expect(bar.items).toHaveLength(1);
  });
});
