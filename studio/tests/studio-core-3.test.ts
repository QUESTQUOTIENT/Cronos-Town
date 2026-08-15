import { describe, expect, it } from 'vitest';

import { CommandStack } from '../src/engine/commands/Command';
import {
  CreateEntityCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  SetComponentCommand,
  type EntityWorldLike,
} from '../src/engine/commands/builtins';

import { AssetRegistry } from '../src/engine/assets/AssetRegistry';
import { AssetImporter, validateImport } from '../src/engine/assets/AssetImporter';

import { ProjectGraph } from '../src/engine/projects/ProjectGraph';

import { SerializationRegistry } from '../src/engine/serialization/Versioned';

import { PluginRegistry, type Plugin, type PluginApi } from '../src/engine/plugins/PluginSystem';

import { clampSlider, selectedOption } from '../src/ui/primitives';
import { flattenTree, findNode, selectNode, toggleExpanded, type TreeNode } from '../src/ui/tree';

// --- a tiny in-memory ECS backing the commands -------------------------------
class MiniWorld implements EntityWorldLike {
  private next = 1;
  private comps = new Map<number, Map<string, unknown>>();
  createEntity(): number {
    const id = this.next++;
    this.comps.set(id, new Map());
    return id;
  }
  destroyEntity(id: number): void {
    this.comps.delete(id);
  }
  addComponent<T>(id: number, component: T): void {
    let bucket = this.comps.get(id);
    if (!bucket) {
      bucket = new Map();
      this.comps.set(id, bucket);
    }
    bucket.set((component as { type: string }).type, component);
  }
  removeComponent(id: number, type: string): void {
    this.comps.get(id)?.delete(type);
  }
  getComponent<T>(id: number, type: string): T | undefined {
    return this.comps.get(id)?.get(type) as T | undefined;
  }
  getComponents(id: number): Array<{ type: string }> {
    return [...(this.comps.get(id)?.values() ?? [])] as Array<{ type: string }>;
  }
  count(): number {
    return this.comps.size;
  }
}

const ctx = (world: MiniWorld) => ({ world });

describe('engine/commands — CommandStack + builtins', () => {
  it('execute/undo/redo a CreateEntityCommand', () => {
    const world = new MiniWorld();
    const stack = new CommandStack();
    stack.execute(new CreateEntityCommand(), ctx(world));
    expect(world.count()).toBe(1);
    expect(stack.canUndo).toBe(true);

    stack.undo(ctx(world));
    expect(world.count()).toBe(0);

    stack.redo(ctx(world));
    expect(world.count()).toBe(1);
  });

  it('MoveEntityCommand restores the previous transform on undo', () => {
    const world = new MiniWorld();
    const stack = new CommandStack();
    const id = world.createEntity();
    world.addComponent(id, { type: 'transform', x: 3, y: 3 });

    stack.execute(new MoveEntityCommand(id, { x: 10, y: 10 }), ctx(world));
    expect(world.getComponent<{ x: number }>(id, 'transform')?.x).toBe(10);

    stack.undo(ctx(world));
    expect(world.getComponent<{ x: number }>(id, 'transform')?.x).toBe(3);

    stack.redo(ctx(world));
    expect(world.getComponent<{ x: number }>(id, 'transform')?.x).toBe(10);
  });

  it('SetComponentCommand restores prior value or removes on undo', () => {
    const world = new MiniWorld();
    const stack = new CommandStack();
    const id = world.createEntity();

    stack.execute(new SetComponentCommand(id, { type: 'npc', name: 'Alice' }), ctx(world));
    expect(world.getComponent<{ name: string }>(id, 'npc')?.name).toBe('Alice');

    stack.undo(ctx(world));
    expect(world.getComponent(id, 'npc')).toBeUndefined(); // was absent -> removed

    stack.redo(ctx(world));
    expect(world.getComponent<{ name: string }>(id, 'npc')?.name).toBe('Alice');
  });

  it('DeleteEntityCommand restores components on undo', () => {
    const world = new MiniWorld();
    const stack = new CommandStack();
    const id = world.createEntity();
    world.addComponent(id, { type: 'npc', name: 'Bob' });

    stack.execute(new DeleteEntityCommand(id), ctx(world));
    expect(world.count()).toBe(0);

    stack.undo(ctx(world));
    expect(world.count()).toBe(1);
  });

  it('undo/redo labels are newest-first; capacity caps the stack', () => {
    const world = new MiniWorld();
    const stack = new CommandStack(2);
    for (let i = 0; i < 5; i += 1) stack.execute(new CreateEntityCommand(), ctx(world));
    expect(stack.undoDepth).toBe(2);
    expect(stack.undoLabels()).toHaveLength(2);
  });

  it('execute clears the redo stack', () => {
    const world = new MiniWorld();
    const stack = new CommandStack();
    stack.execute(new CreateEntityCommand(), ctx(world));
    stack.undo(ctx(world));
    expect(stack.canRedo).toBe(true);
    stack.execute(new CreateEntityCommand(), ctx(world));
    expect(stack.canRedo).toBe(false);
  });
});

describe('engine/assets — AssetRegistry + AssetImporter', () => {
  it('registers assets with incrementing versions', () => {
    const reg = new AssetRegistry(() => 1000);
    const a = reg.register({ id: 's1', kind: 'sprite', name: 'Grass', source: 'sprites/grass.png', metadata: {} });
    expect(a.version).toBe(1);
    const b = reg.register({ id: 's1', kind: 'sprite', name: 'Grass', source: 'sprites/grass.png', metadata: {} });
    expect(b.version).toBe(2);
    expect(b.createdAt).toBe(1000);
  });

  it('filters by kind + counts', () => {
    const reg = new AssetRegistry(() => 1);
    reg.register({ id: 's1', kind: 'sprite', name: 'A', source: 'x.png', metadata: {} });
    reg.register({ id: 'a1', kind: 'audio', name: 'B', source: 'y.mp3', metadata: {} });
    expect(reg.byKind('sprite')).toHaveLength(1);
    expect(reg.count({ kind: 'audio' })).toBe(1);
    expect(reg.kinds().sort()).toEqual(['audio', 'sprite']);
  });

  it('serialize/deserialize round-trips', () => {
    const reg = new AssetRegistry(() => 1);
    reg.register({ id: 's1', kind: 'sprite', name: 'A', source: 'x.png', metadata: {} });
    const snap = reg.serialize();
    const reg2 = new AssetRegistry(() => 1);
    reg2.deserialize(snap);
    expect(reg2.get('s1')?.name).toBe('A');
  });

  it('validateImport enforces sprite/audio extensions', () => {
    expect(validateImport({ id: 'a', kind: 'sprite', name: 'A', source: 'x.png' })).toBeNull();
    expect(validateImport({ id: 'a', kind: 'sprite', name: 'A', source: 'x.exe' })).not.toBeNull();
    expect(validateImport({ id: 'a', kind: 'sprite', name: 'A', source: 'data:image/png;base64,AA==' })).toBeNull();
    expect(validateImport({ id: 'a', kind: 'audio', name: 'A', source: 'x.mp3' })).toBeNull();
    expect(validateImport({ id: 'a', kind: 'audio', name: 'A', source: 'x.png' })).not.toBeNull();
  });

  it('importer registers new assets and touches existing ones', () => {
    const reg = new AssetRegistry(() => 1);
    const importer = new AssetImporter(reg);
    const r1 = importer.import({ id: 's1', kind: 'sprite', name: 'A', source: 'x.png' });
    expect(r1.ok).toBe(true);
    const r2 = importer.import({ id: 's1', kind: 'sprite', name: 'A', source: 'x.png', metadata: { tag: 'x' } });
    expect(r2.ok).toBe(true);
    expect(reg.get('s1')?.version).toBe(2);
  });

  it('importer rejects invalid input', () => {
    const reg = new AssetRegistry(() => 1);
    const importer = new AssetImporter(reg);
    const r = importer.import({ id: '', kind: 'sprite', name: 'A', source: 'x.png' });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});

describe('engine/projects — ProjectGraph', () => {
  it('adds nodes + typed edges', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'Game' });
    g.addNode({ id: 'm', kind: 'map', name: 'Hometown' });
    expect(g.addEdge('p', 'm', 'contains')).toBe(true);
    expect(g.addEdge('p', 'missing', 'contains')).toBe(false);
    expect(g.outgoing('p')).toHaveLength(1);
    expect(g.incoming('m')).toHaveLength(1);
  });

  it('references + reachable traverse the graph', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'Game' });
    g.addNode({ id: 'm', kind: 'map', name: 'Hometown' });
    g.addNode({ id: 'e', kind: 'entity', name: 'NPC' });
    g.addEdge('p', 'm', 'contains');
    g.addEdge('m', 'e', 'contains');
    expect(g.references('p').map((n) => n.id)).toEqual(['m']);
    expect(g.reachable('p').map((n) => n.id)).toEqual(['m', 'e']);
  });

  it('removeNode also removes touching edges', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'a', kind: 'map', name: 'A' });
    g.addNode({ id: 'b', kind: 'map', name: 'B' });
    g.addEdge('a', 'b', 'ref');
    g.removeNode('b');
    expect(g.allEdges()).toHaveLength(0);
  });

  it('search matches id or name case-insensitively', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'npc-flippy', kind: 'entity', name: 'Flippy' });
    g.addNode({ id: 'map-1', kind: 'map', name: 'Hometown' });
    expect(g.search('flip').map((n) => n.id)).toEqual(['npc-flippy']);
    expect(g.search('home').map((n) => n.id)).toEqual(['map-1']);
  });

  it('serialize/deserialize round-trips', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'a', kind: 'map', name: 'A' });
    g.addNode({ id: 'b', kind: 'map', name: 'B' });
    g.addEdge('a', 'b', 'ref');
    const snap = g.serialize();
    const g2 = new ProjectGraph();
    g2.deserialize(snap);
    expect(g2.allNodes()).toHaveLength(2);
    expect(g2.allEdges()).toHaveLength(1);
  });
});

describe('engine/serialization — Versioned', () => {
  it('migrates from an old version through the migration chain', () => {
    const reg = new SerializationRegistry<{ v: number }>(3);
    reg.registerMigration(1, (p) => ({ v: (p as { v: number }).v + 10 }));
    reg.registerMigration(2, (p) => ({ v: (p as { v: number }).v * 2 }));
    const out = reg.unwrap({ version: 1, payload: { v: 1 } });
    // v1 -> v2: v=11; v2 -> v3: v=22
    expect(out).toEqual({ v: 22 });
  });

  it('returns the payload unchanged at the current version', () => {
    const reg = new SerializationRegistry<{ v: number }>(1);
    expect(reg.unwrap({ version: 1, payload: { v: 7 } })).toEqual({ v: 7 });
  });

  it('returns null when a migration is missing', () => {
    const reg = new SerializationRegistry<{ v: number }>(3);
    reg.registerMigration(1, (p) => ({ v: (p as { v: number }).v + 1 }));
    // missing v2->v3 migration
    expect(reg.unwrap({ version: 1, payload: { v: 1 } })).toBeNull();
  });

  it('wrap produces the current-version envelope', () => {
    const reg = new SerializationRegistry<{ v: number }>(2);
    expect(reg.wrap({ v: 5 })).toEqual({ version: 2, payload: { v: 5 } });
  });
});

describe('engine/plugins — PluginRegistry', () => {
  function makePlugin(id: string, activated: string[]): Plugin {
    return {
      manifest: { id, name: id, version: '1.0.0' },
      activate(api: PluginApi) {
        activated.push(id);
        api.registerPanel(`panel-${id}`, `${id} panel`, id);
        return () => activated.push(`${id}:cleanup`);
      },
    };
  }

  it('loads + activates plugins in order, deactivates with cleanup', () => {
    const reg = new PluginRegistry();
    const calls: string[] = [];
    expect(reg.load(makePlugin('a', calls))).toBeNull();
    expect(reg.load(makePlugin('b', calls))).toBeNull();
    expect(reg.load(makePlugin('a', calls))).not.toBeNull(); // duplicate

    const api: PluginApi = { emit: () => {}, registerCommand: () => {}, registerPanel: () => {} };
    reg.activateAll(api);
    expect(calls).toEqual(['a', 'b']);

    reg.deactivate('a');
    expect(calls).toContain('a:cleanup');
  });

  it('unload removes a plugin', () => {
    const reg = new PluginRegistry();
    reg.load(makePlugin('a', []));
    expect(reg.list()).toHaveLength(1);
    expect(reg.unload('a')).toBe(true);
    expect(reg.list()).toHaveLength(0);
    expect(reg.unload('a')).toBe(false);
  });

  it('rejects manifests missing id/name/version', () => {
    const reg = new PluginRegistry();
    const bad = { manifest: { id: '', name: '', version: '' }, activate: () => {} };
    expect(reg.load(bad)).not.toBeNull();
  });
});

describe('ui/primitives + ui/tree', () => {
  it('clampSlider clamps + steps correctly', () => {
    expect(clampSlider(5, 0, 10, 1)).toBe(5);
    expect(clampSlider(15, 0, 10, 1)).toBe(10);
    expect(clampSlider(-3, 0, 10, 1)).toBe(0);
    expect(clampSlider(0.5, 0, 1, 0.1)).toBeCloseTo(0.5, 6);
  });

  it('selectedOption falls back to the first option', () => {
    const opts = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    expect(selectedOption(opts, 'b')).toBe('b');
    expect(selectedOption(opts, 'zzz')).toBe('a');
  });

  it('flattenTree respects expanded state', () => {
    const tree: TreeNode = { id: 'root', label: 'Root', expanded: true, children: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', expanded: false, children: [{ id: 'b1', label: 'B1' }] },
    ] };
    const flat = flattenTree(tree);
    // root, a, b are visible; b1 is hidden (b collapsed)
    expect(flat.map((f) => f.node.id)).toEqual(['root', 'a', 'b']);
    expect(flat[2].depth).toBe(1);
  });

  it('findNode + toggleExpanded + selectNode', () => {
    const tree: TreeNode = { id: 'root', label: 'Root', children: [{ id: 'a', label: 'A' }] };
    expect(findNode(tree, 'a')?.label).toBe('A');
    expect(findNode(tree, 'zzz')).toBeNull();

    const toggled = toggleExpanded(tree, 'root');
    expect(toggled.expanded).toBe(false);

    const selected = selectNode(tree, 'a');
    expect(selected.children?.[0].selected).toBe(true);
  });
});
