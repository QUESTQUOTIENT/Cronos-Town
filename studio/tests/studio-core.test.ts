import { describe, expect, it } from 'vitest';

import { EntityManager, type Component } from '../src/engine/entity/EntityManager';
import { SceneManager } from '../src/engine/scenes/SceneManager';
import { ProjectManager } from '../src/engine/projects/ProjectManager';
import { WorkspaceManager } from '../src/engine/workspaces/WorkspaceManager';

interface Position extends Component {
  type: 'position';
  x: number;
  y: number;
}
interface Npc extends Component {
  type: 'npc';
  name: string;
}

const pos = (x: number, y: number): Position => ({ type: 'position', x, y });
const npc = (name: string): Npc => ({ type: 'npc', name });

describe('engine/entity — ECS', () => {
  it('creates entities with monotonic ids', () => {
    const em = new EntityManager();
    expect(em.createEntity()).toBe(1);
    expect(em.createEntity()).toBe(2);
    expect(em.count).toBe(2);
  });

  it('adds/gets/removes components by type', () => {
    const em = new EntityManager();
    const e = em.createEntity();
    em.addComponent(e, pos(3, 4));
    expect(em.getComponent<Position>(e, 'position')).toEqual({ type: 'position', x: 3, y: 4 });
    expect(em.hasComponents(e, 'position')).toBe(true);
    em.removeComponent(e, 'position');
    expect(em.hasComponents(e, 'position')).toBe(false);
  });

  it('queries entities holding ALL types (AND semantics)', () => {
    const em = new EntityManager();
    const a = em.createEntity();
    const b = em.createEntity();
    const c = em.createEntity();
    em.addComponent(a, pos(0, 0));
    em.addComponent(a, npc('Alice'));
    em.addComponent(b, npc('Bob'));
    em.addComponent(c, pos(5, 5));

    expect(em.query('position', 'npc')).toEqual([a]);
    expect(em.query('npc').sort()).toEqual([a, b]);
    expect(em.query('position').sort()).toEqual([a, c]);
    expect(em.query()).toHaveLength(3);
  });

  it('destroyEntity removes from all indexes', () => {
    const em = new EntityManager();
    const e = em.createEntity();
    em.addComponent(e, pos(1, 1));
    em.addComponent(e, npc('x'));
    em.destroyEntity(e);
    expect(em.count).toBe(0);
    expect(em.query('position')).toHaveLength(0);
    expect(em.query('npc')).toHaveLength(0);
  });

  it('serialize/deserialize round-trips', () => {
    const em = new EntityManager();
    const a = em.createEntity();
    em.addComponent(a, pos(10, 20));
    em.addComponent(a, npc('Alice'));
    const snap = em.serialize();

    const em2 = new EntityManager();
    em2.deserialize(snap);
    expect(em2.count).toBe(1);
    expect(em2.getComponent<Position>(a, 'position')?.x).toBe(10);
    expect(em2.getComponent<Npc>(a, 'npc')?.name).toBe('Alice');
    // next id continues after the max restored id
    expect(em2.createEntity()).toBe(a + 1);
  });
});

describe('engine/scenes — SceneManager', () => {
  it('creates scenes with unique slugs', () => {
    const em = new EntityManager();
    const sm = new SceneManager(em);
    const s1 = sm.createScene('Main World');
    const s2 = sm.createScene('Main World');
    expect(s1.id).toBe('main-world');
    expect(s2.id).toBe('main-world-2');
    expect(sm.list()).toHaveLength(2);
    expect(sm.active?.id).toBe('main-world');
  });

  it('attaches entities to scenes and serializes them', () => {
    const em = new EntityManager();
    const sm = new SceneManager(em);
    const scene = sm.createScene('Test');
    const e = em.createEntity();
    em.addComponent(e, pos(1, 1));
    expect(sm.addEntity(scene.id, e)).toBe(true);
    expect(sm.addEntity(scene.id, e)).toBe(false); // no duplicate

    const snap = sm.serialize();
    expect(snap[0].entities).toHaveLength(1);
    expect(snap[0].entities[0].components).toContainEqual({ type: 'position', x: 1, y: 1 });
  });

  it('removeScene clears it and reassigns active', () => {
    const em = new EntityManager();
    const sm = new SceneManager(em);
    const a = sm.createScene('A');
    sm.createScene('B');
    sm.removeScene(a.id);
    expect(sm.list()).toHaveLength(1);
    expect(sm.active?.id).toBe('b');
  });
});

describe('engine/projects — ProjectManager', () => {
  it('creates + opens projects and tracks recents', () => {
    const em = new EntityManager();
    const scenes = new SceneManager(em);
    const pm = new ProjectManager(scenes, { now: () => 1000 });

    const p = pm.createProject('My Game', { author: 'Dev' });
    expect(p.id).toBe('my-game');
    expect(pm.current?.name).toBe('My Game');
    expect(pm.recentProjects()[0]?.id).toBe('my-game');
  });

  it('de-duplicates + caps recents', () => {
    const em = new EntityManager();
    const scenes = new SceneManager(em);
    const pm = new ProjectManager(scenes, { now: () => 1000, maxRecent: 2 });
    pm.createProject('A');
    pm.createProject('B');
    pm.createProject('C');
    pm.open('a');
    expect(pm.recentProjects().map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('serializeOpen includes scenes associated with the project', () => {
    const em = new EntityManager();
    const scenes = new SceneManager(em);
    const pm = new ProjectManager(scenes, { now: () => 1000 });
    pm.createProject('Game');
    const scene = scenes.createScene('Level 1');
    pm.addSceneToOpen(scene.id);
    const snap = pm.serializeOpen();
    expect(snap?.scenes).toHaveLength(1);
    expect(snap?.scenes[0].name).toBe('Level 1');
  });

  it('serializeOpen returns null when nothing is open', () => {
    const em = new EntityManager();
    const scenes = new SceneManager(em);
    const pm = new ProjectManager(scenes);
    expect(pm.serializeOpen()).toBeNull();
  });
});

describe('engine/workspaces — WorkspaceManager', () => {
  it('builds the canonical default workspaces', () => {
    const { workspace, created } = WorkspaceManager.buildDefaults();
    expect(created.map((w) => w.name)).toEqual(['Game', 'UI', 'Economy', 'AI', 'Assets']);
    expect(workspace.get('game')?.panels).toHaveLength(5);
    expect(workspace.get('ui')?.panels.map((p) => p.type)).toContain('inspector');
  });

  it('addPanel de-duplicates and activates', () => {
    const { workspace } = WorkspaceManager.buildDefaults();
    expect(workspace.hasPanelType('game', 'world')).toBe(true);
    workspace.addPanel('game', { id: 'world', title: 'World', type: 'world' });
    expect(workspace.get('game')?.panels).toHaveLength(5); // unchanged
  });

  it('activatePanel sets exactly one active', () => {
    const { workspace } = WorkspaceManager.buildDefaults();
    workspace.activatePanel('ui', 'layers');
    const ui = workspace.get('ui')!;
    expect(ui.panels.filter((p) => p.active).map((p) => p.id)).toEqual(['layers']);
  });

  it('removePanel + setActive', () => {
    const { workspace } = WorkspaceManager.buildDefaults();
    workspace.removePanel('game', 'world');
    expect(workspace.get('game')?.panels).toHaveLength(4);
    expect(workspace.setActive('ai')).toBe(true);
    expect(workspace.active?.name).toBe('AI');
  });
});
