import { describe, expect, it } from 'vitest';

import { NotificationCenter, notificationState, notify, expire, unreadCount, markRead, dismiss } from '../src/ui/components/notification-center';
import { WindowController, windowReducer, windowState, isInteractive } from '../src/ui/components/window';
import { buildDockSpec, splitRect } from '../src/ui/components/dock';
import { buildTimelineSpec, playheadX } from '../src/ui/components/timeline';
import { buildGraphSpec } from '../src/ui/components/graph';
import { buildInspectorViewSpec } from '../src/ui/components/inspector';

import { WindowManager } from '../src/ui/systems/WindowManager';
import { addKeyframe, addTrack, emptyTimeline, type AnimationTimeline } from '../src/features/editor/tools/animation-editor';
import { ProjectGraph } from '../src/engine/projects/ProjectGraph';

import { Inspector } from '../src/engine/inspector/Inspector';
import { EntityManager } from '../src/engine/entity/EntityManager';
import { AssetRegistry } from '../src/engine/assets/AssetRegistry';

import { GraphEditor } from '../src/engine/graph/GraphEditor';
import { CommandStack } from '../src/engine/commands/Command';

import { ImportPipeline } from '../src/engine/assets/pipeline/importer';
import { AssetImporter } from '../src/engine/assets/AssetImporter';

describe('ui/components — NotificationCenter', () => {
  it('notify/markRead/dismiss/unread', () => {
    let s = notificationState(8000, 50);
    s = notify(s, 'n1', 'info', 'hi', 0);
    s = notify(s, 'n2', 'error', 'boom', 0);
    expect(unreadCount(s)).toBe(2);
    s = markRead(s, 'n1');
    expect(unreadCount(s)).toBe(1);
    s = dismiss(s, 'n2');
    expect(unreadCount(s)).toBe(0);
  });

  it('expire removes timed-out notifications', () => {
    let s = notificationState(100, 50);
    s = notify(s, 'n1', 'info', 'a', 0);
    const { state, removed } = expire(s, 200);
    expect(removed).toEqual(['n1']);
    expect(state.items).toHaveLength(0);
  });

  it('caps at maxItems (newest first)', () => {
    let s = notificationState(0, 2);
    s = notify(s, 'a', 'info', '1', 0);
    s = notify(s, 'b', 'info', '2', 0);
    s = notify(s, 'c', 'info', '3', 0);
    expect(s.items.map((n) => n.id)).toEqual(['c', 'b']);
  });

  it('NotificationCenter controller ticks + reports unread', () => {
    const nc = new NotificationCenter(100, 50);
    nc.push('a', 'info', 'msg', 0);
    expect(nc.unread).toBe(1);
    expect(nc.tick(200)).toEqual(['a']);
    expect(nc.unread).toBe(0);
  });
});

describe('ui/components — Window', () => {
  it('state machine transitions', () => {
    let s = windowState();
    expect(isInteractive(s)).toBe(true);
    s = windowReducer(s, { type: 'minimize' });
    expect(s.minimized).toBe(true);
    expect(isInteractive(s)).toBe(false);
    s = windowReducer(s, { type: 'restore' });
    expect(s.minimized).toBe(false);
    s = windowReducer(s, { type: 'maximize' });
    expect(s.maximized).toBe(true);
    s = windowReducer(s, { type: 'close' });
    expect(s.visible).toBe(false);
    expect(isInteractive(s)).toBe(false);
  });

  it('WindowController exposes snapshot + interactive', () => {
    const wc = new WindowController();
    expect(wc.interactive).toBe(true);
    wc.dispatch({ type: 'minimize' });
    expect(wc.interactive).toBe(false);
  });
});

describe('ui/components — Dock', () => {
  it('buildDockSpec lays out windows into equal-width panels', () => {
    const wm = new WindowManager();
    wm.open({ id: 'a', title: 'A', type: 'panel', zone: 'left', tabGroup: 't1' });
    wm.open({ id: 'b', title: 'B', type: 'panel', zone: 'right', tabGroup: 't2' });
    const spec = buildDockSpec(wm, 400, 200);
    expect(spec.panels).toHaveLength(2);
    expect(spec.panels[0].rect.width).toBe(200);
    expect(spec.panels[1].rect.x).toBe(200);
  });

  it('splitRect splits a rect by ratio', () => {
    const { first, second } = splitRect({ x: 0, y: 0, width: 100, height: 50 }, 0.5);
    expect(first).toEqual({ x: 0, y: 0, width: 50, height: 50 });
    expect(second).toEqual({ x: 50, y: 0, width: 50, height: 50 });
  });
});

describe('ui/components — Timeline', () => {
  function timeline(): AnimationTimeline {
    let tl = emptyTimeline(8);
    tl = addTrack(tl, 'walk', 'Walk');
    tl = addKeyframe(tl, 'walk', { id: 'f1', frameIndex: 0, durationMs: 100 });
    tl = addKeyframe(tl, 'walk', { id: 'f2', frameIndex: 1, durationMs: 100 });
    return tl;
  }

  it('buildTimelineSpec positions keyframes cumulatively', () => {
    const spec = buildTimelineSpec(timeline());
    expect(spec.lanes).toHaveLength(1);
    expect(spec.durationMs).toBe(200);
    expect(spec.lanes[0].keyframes.map((k) => k.startMs)).toEqual([0, 100]);
    expect(spec.lanes[0].keyframes.map((k) => k.widthMs)).toEqual([100, 100]);
  });

  it('playheadX maps playhead to pixel x', () => {
    const tl = timeline();
    tl.playheadMs = 100;
    const spec = buildTimelineSpec(tl);
    expect(playheadX(spec, 400)).toBe(200);
  });
});

describe('ui/components — Graph + Inspector components', () => {
  it('buildGraphSpec maps the project graph to node/edge specs', () => {
    const g = new ProjectGraph();
    g.addNode({ id: 'p', kind: 'project', name: 'P' });
    g.addNode({ id: 'm', kind: 'map', name: 'M' });
    g.addEdge('p', 'm', 'contains');
    const spec = buildGraphSpec(g, 'm', 220, 60);
    expect(spec.nodes).toHaveLength(2);
    expect(spec.nodes.find((n) => n.id === 'm')?.selected).toBe(true);
    expect(spec.edges).toHaveLength(1);
    expect(spec.edges[0]).toMatchObject({ from: 'p', to: 'm' });
  });

  it('buildInspectorViewSpec flattens sections into rows', () => {
    const em = new EntityManager();
    const graph = new ProjectGraph();
    graph.addNode({ id: 'm1', kind: 'map', name: 'Hometown' });
    const assets = new AssetRegistry(() => 1);
    const inspector = new Inspector({ entities: em, graph, assets });
    const spec = inspector.inspect({ kind: 'node', id: 'm1' })!;
    const view = buildInspectorViewSpec(spec);
    expect(view.title).toBe('Hometown');
    expect(view.sections.some((s) => s.title === 'Properties')).toBe(true);
  });

  it('universal inspector includes history + events when provided', () => {
    const em = new EntityManager();
    const graph = new ProjectGraph();
    graph.addNode({ id: 'm1', kind: 'map', name: 'Hometown' });
    const assets = new AssetRegistry(() => 1);
    const inspector = new Inspector({
      entities: em, graph, assets,
      historyFor: (id) => (id === 'm1' ? ['Move Map', 'Create Map'] : []),
      eventsFor: (id) => (id === 'm1' ? ['map:modified'] : []),
    });
    const spec = inspector.inspect({ kind: 'node', id: 'm1' })!;
    expect(spec.sections.some((s) => s.title === 'History')).toBe(true);
    expect(spec.sections.some((s) => s.title === 'Events')).toBe(true);
    const history = spec.sections.find((s) => s.title === 'History')!;
    expect(history.fields.map((f) => f.value)).toEqual(['Move Map', 'Create Map']);
  });
});

describe('engine/graph — GraphEditor (command-backed, undoable)', () => {
  it('addNode/addEdge/removeNode are undoable', () => {
    const graph = new ProjectGraph();
    const stack = new CommandStack();
    const editor = new GraphEditor(graph, stack);

    editor.addNode({ id: 'a', kind: 'map', name: 'A' });
    editor.addNode({ id: 'b', kind: 'map', name: 'B' });
    expect(graph.allNodes()).toHaveLength(2);
    expect(editor.addEdge('a', 'b', 'ref')).toBe(true);
    expect(graph.allEdges()).toHaveLength(1);

    editor.undo(); // undo edge
    expect(graph.allEdges()).toHaveLength(0);
    editor.undo(); // undo node b
    expect(graph.allNodes()).toHaveLength(1);
  });

  it('removeNode restores its edges on undo', () => {
    const graph = new ProjectGraph();
    const stack = new CommandStack();
    const editor = new GraphEditor(graph, stack);
    editor.addNode({ id: 'a', kind: 'map', name: 'A' });
    editor.addNode({ id: 'b', kind: 'map', name: 'B' });
    editor.addEdge('a', 'b', 'ref');
    editor.removeNode('b');
    expect(graph.allNodes()).toHaveLength(1);
    expect(graph.allEdges()).toHaveLength(0);
    editor.undo(); // restore b + edge
    expect(graph.allNodes()).toHaveLength(2);
    expect(graph.allEdges()).toHaveLength(1);
  });
});

describe('engine/assets/pipeline — ImportPipeline orchestrator', () => {
  it('imports a sprite + registers a graph node + dependency edges', () => {
    const registry = new AssetRegistry(() => 1);
    const graph = new ProjectGraph();
    // Pre-register a referenced asset so the dependency edge can form.
    graph.addNode({ id: 'grass', kind: 'sprite', name: 'Grass' });
    const pipeline = new ImportPipeline(registry, new AssetImporter(registry), graph);

    const outcome = pipeline.import({
      id: 'map1', kind: 'map', name: 'Hometown', source: 'sprites/map1.png',
      metadata: { references: ['grass'] },
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.hotReloaded).toBe(false);
    expect(outcome.references.map((r) => r.to)).toEqual(['grass']);
    expect(registry.has('map1')).toBe(true);
    expect(graph.has('map1')).toBe(true);
    expect(graph.allEdges().some((e) => e.from === 'map1' && e.to === 'grass')).toBe(true);
  });

  it('re-import hot-reloads (version bump + hotReloaded flag)', () => {
    const registry = new AssetRegistry(() => 1);
    const pipeline = new ImportPipeline(registry, new AssetImporter(registry));
    pipeline.import({ id: 's1', kind: 'sprite', name: 'S', source: 'x.png' });
    const again = pipeline.import({ id: 's1', kind: 'sprite', name: 'S', source: 'x.png' });
    expect(again.hotReloaded).toBe(true);
    expect(registry.get('s1')?.version).toBe(2);
  });

  it('rejects invalid input', () => {
    const registry = new AssetRegistry(() => 1);
    const pipeline = new ImportPipeline(registry, new AssetImporter(registry));
    const outcome = pipeline.import({ id: 'x', kind: 'audio', name: 'A', source: 'x.png' });
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBeTruthy();
  });

  it('deduplicate() aliases duplicate content', () => {
    const registry = new AssetRegistry(() => 1);
    const pipeline = new ImportPipeline(registry, new AssetImporter(registry));
    pipeline.import({ id: 'a', kind: 'sprite', name: 'A', source: 'data:image/png;base64,AA==' });
    pipeline.import({ id: 'b', kind: 'sprite', name: 'B', source: 'data:image/png;base64,AA==' });
    const dedup = pipeline.deduplicate();
    expect(dedup.removed).toBe(1);
    expect(dedup.aliases.get('b')).toBe('a');
  });
});
