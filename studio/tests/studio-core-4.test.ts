import { describe, expect, it } from 'vitest';

import { EntityManager, type Component } from '../src/engine/entity/EntityManager';
import { COMPONENT_FACTORIES, COMPONENT_TYPES, isComponentType } from '../src/engine/components/Components';
import { SceneLoader, SceneRuntime, SceneSerializer, SceneTransitions } from '../src/engine/scenes/SceneRuntime';
import { SearchEngine } from '../src/engine/search/SearchEngine';
import { AutomationEngine } from '../src/engine/automation/AutomationEngine';
import { CommandStack } from '../src/engine/commands/Command';
import { CreateEntityCommand } from '../src/engine/commands/builtins';
import { ProjectGraph } from '../src/engine/projects/ProjectGraph';
import { AssetRegistry } from '../src/engine/assets/AssetRegistry';
import { buildPresetWorkspaces, findPreset, WORKSPACE_PRESETS } from '../src/engine/workspaces/presets';
import { StudioOS } from '../src/studio/StudioOS';

describe('engine/components — component library', () => {
  it('exposes all 13 canonical component types', () => {
    expect(COMPONENT_TYPES).toHaveLength(13);
    expect(COMPONENT_TYPES).toContain('transform');
    expect(COMPONENT_TYPES).toContain('quest');
    expect(COMPONENT_TYPES).toContain('interactable');
    expect(COMPONENT_TYPES).toContain('audio');
  });

  it('factories produce the correct default shapes', () => {
    expect(COMPONENT_FACTORIES.transform()).toEqual({ type: 'transform', x: 0, y: 0 });
    expect(COMPONENT_FACTORIES.npc()).toEqual({ type: 'npc', name: 'NPC' });
    expect(COMPONENT_FACTORIES.animation()).toEqual({ type: 'animation', sheet: '', columns: 4, rows: 4 });
    expect(COMPONENT_FACTORIES.inventory()).toEqual({ type: 'inventory', items: [] });
  });

  it('isComponentType validates', () => {
    expect(isComponentType('sprite')).toBe(true);
    expect(isComponentType('bogus')).toBe(false);
  });

  it('components are plain data usable with the EntityManager', () => {
    const em = new EntityManager();
    const e = em.createEntity();
    em.addComponent(e, COMPONENT_FACTORIES.transform());
    em.addComponent(e, { ...COMPONENT_FACTORIES.npc(), name: '@Flippy' });
    expect(em.query('transform', 'npc')).toEqual([e]);
    expect(em.getComponent<{ name: string } & Component>(e, 'npc')?.name).toBe('@Flippy');
  });
});

describe('engine/scenes — runtime (load/activate/transition)', () => {
  it('SceneSerializer + SceneLoader round-trip a scene', () => {
    const em = new EntityManager();
    const serializer = new SceneSerializer(em);
    const e = em.createEntity();
    em.addComponent(e, { type: 'transform', x: 1, y: 2 });

    const serialized = serializer.serialize('s1', 'Level 1', [e]);
    expect(serialized.entities).toHaveLength(1);

    const em2 = new EntityManager();
    const serializer2 = new SceneSerializer(em2);
    const loader = new SceneLoader(serializer2);
    expect(loader.status('s1')).toBe('idle');
    loader.load(serialized);
    expect(loader.status('s1')).toBe('active');
    expect(em2.getComponent<{ x: number } & Component>(e, 'transform')?.x).toBe(1);
  });

  it('SceneRuntime tracks active scene + live entities', () => {
    const em = new EntityManager();
    const rt = new SceneRuntime(em);
    const a = em.createEntity();
    const b = em.createEntity();
    rt.activate('s1', [a, b]);
    expect(rt.activeSceneId).toBe('s1');
    expect(rt.activeEntities()).toEqual([a, b]);
    expect(rt.liveActiveEntities()).toEqual([a, b]);

    em.destroyEntity(b);
    expect(rt.liveActiveEntities()).toEqual([a]); // destroyed entity filtered out
  });

  it('SceneTransitions advances deterministically out → in → done', () => {
    const t = new SceneTransitions();
    expect(t.state.phase).toBe('none');
    t.begin('a', 'b');
    expect(t.state).toEqual({ from: 'a', to: 'b', phase: 'out' });
    expect(t.advance()).toBe('in');
    expect(t.advance()).toBe('done');
    t.reset();
    expect(t.state.phase).toBe('none');
  });
});

describe('engine/search — SearchEngine', () => {
  function makeScope() {
    const em = new EntityManager();
    const e = em.createEntity();
    em.addComponent(e, { type: 'npc', name: '@Flippy' });
    const graph = new ProjectGraph();
    graph.addNode({ id: 'map-1', kind: 'map', name: 'Hometown' });
    graph.addNode({ id: 'npc-x', kind: 'entity', name: 'Flippy' });
    const assets = new AssetRegistry(() => 1);
    assets.register({ id: 's1', kind: 'sprite', name: 'Grass', source: 'x.png', metadata: {} });
    return new SearchEngine({
      graph,
      assets,
      entities: em,
      commands: [{ id: 'new-entity', label: 'New Entity' }],
      settings: { theme: 'gba-dark' },
    });
  }

  it('searches across all sources', () => {
    const s = makeScope();
    const all = s.search('');
    expect(all.some((r) => r.source === 'command')).toBe(true);
    expect(all.some((r) => r.source === 'node')).toBe(true);
    expect(all.some((r) => r.source === 'asset')).toBe(true);
    expect(all.some((r) => r.source === 'entity')).toBe(true);
    expect(all.some((r) => r.source === 'setting')).toBe(true);
  });

  it('filters by query case-insensitively', () => {
    const s = makeScope();
    expect(s.search('flippy').some((r) => r.title.includes('Flippy') || r.subtitle.includes('npc'))).toBe(true);
    expect(s.search('hometown').some((r) => r.title === 'Hometown')).toBe(true);
    expect(s.search('grass').some((r) => r.title === 'Grass')).toBe(true);
    expect(s.search('theme').some((r) => r.source === 'setting')).toBe(true);
  });

  it('respects the result limit', () => {
    const s = makeScope();
    expect(s.search('', 3)).toHaveLength(3);
  });
});

describe('engine/automation — AutomationEngine', () => {
  it('runs a command workflow to completion (undoable via the stack)', () => {
    const world = { count: 0, createEntity() { this.count += 1; return this.count; }, destroyEntity(id: number) { this.count -= 1; void id; }, addComponent() {}, removeComponent() {}, getComponent() { return undefined; } };
    const stack = new CommandStack();
    const engine = new AutomationEngine(stack);
    engine.register({
      id: 'w1', name: 'Spawn 3',
      steps: [
        { id: 's1', kind: 'command', command: new CreateEntityCommand() },
        { id: 's2', kind: 'command', command: new CreateEntityCommand() },
        { id: 's3', kind: 'command', command: new CreateEntityCommand() },
      ],
    });
    const result = engine.run('w1', { world });
    expect(result.status).toBe('completed');
    expect(result.stepsRun).toBe(3);
    expect(world.count).toBe(3);

    // Undo the whole workflow via the shared stack.
    stack.undo({ world });
    stack.undo({ world });
    stack.undo({ world });
    expect(world.count).toBe(0);
  });

  it('pauses on a failing trigger and resumes when it passes', () => {
    const stack = new CommandStack();
    const engine = new AutomationEngine(stack);
    let gate = false;
    engine.register({
      id: 'w2', name: 'Gated',
      steps: [
        { id: 't1', kind: 'trigger', condition: () => gate },
        { id: 's1', kind: 'command', command: new CreateEntityCommand() },
      ],
    });
    const world = { count: 0, createEntity() { this.count += 1; return this.count; }, destroyEntity() {}, addComponent() {}, removeComponent() {}, getComponent() { return undefined; } };
    const ctx = { world };

    const paused = engine.run('w2', ctx);
    expect(paused.status).toBe('paused');
    expect(world.count).toBe(0);

    gate = true;
    const done = engine.run('w2', ctx);
    expect(done.status).toBe('completed');
    expect(world.count).toBe(1);
  });
});

describe('engine/workspaces/presets', () => {
  it('defines 7 presets (Game/UI/Economy/AI/Assets/Scripting/Animation)', () => {
    expect(WORKSPACE_PRESETS.map((p) => p.name)).toEqual(['Game Design', 'UI Design', 'Economy', 'AI', 'Assets', 'Scripting', 'Animation']);
    expect(findPreset('economy')?.panels.map((p) => p.type)).toEqual(['token', 'liquidity', 'market', 'wallet']);
  });

  it('buildPresetWorkspaces creates them all (first active)', () => {
    const { workspace, created } = buildPresetWorkspaces();
    expect(created.map((c) => c.name)).toEqual(['Game Design', 'UI Design', 'Economy', 'AI', 'Assets', 'Scripting', 'Animation']);
    expect(workspace.list()).toHaveLength(7);
    expect(workspace.active?.name).toBe('Game Design');
    expect(workspace.get('economy')?.panels).toHaveLength(4);
  });
});

describe('studio/StudioOS — composition root', () => {
  it('boots with all systems wired + a starter project/scene/graph', () => {
    const os = new StudioOS();
    expect(os.projects.current?.name).toBe('Cronos Town');
    expect(os.scenes.list()).toHaveLength(1);
    expect(os.graph.allNodes().length).toBeGreaterThanOrEqual(5); // project + map + quest + entity + sprite
    expect(os.graph.allEdges().length).toBeGreaterThanOrEqual(4); // contains/contains/requires/references
    expect(os.workspaces.list()).toHaveLength(7);
  });

  it('settings are searchable via the SearchEngine', () => {
    const os = new StudioOS();
    os.setSetting('chain-id', '25');
    expect(os.getSetting('chain-id')).toBe('25');
    const results = os.search.search('chain-id');
    expect(results.some((r) => r.source === 'setting' && r.id === 'chain-id')).toBe(true);
  });

  it('snapshot() serializes project + graph + assets + scenes', () => {
    const os = new StudioOS();
    const snap = os.snapshot();
    expect(snap.project).not.toBeNull();
    expect(snap.graph.nodes.length).toBeGreaterThanOrEqual(5);
    expect(snap.scenes).toHaveLength(1);
  });

  it('loadPlugin registers into the plugin registry', () => {
    const os = new StudioOS();
    const plugin = { manifest: { id: 'test', name: 'Test', version: '1.0.0' }, activate: () => {} };
    expect(os.loadPlugin(plugin)).toBeNull();
    expect(os.plugins.list()).toHaveLength(1);
  });

  it('exposes the component type list', () => {
    const os = new StudioOS();
    expect(os.componentTypes).toContain('transform');
    expect(os.componentTypes).toHaveLength(13);
  });
});
