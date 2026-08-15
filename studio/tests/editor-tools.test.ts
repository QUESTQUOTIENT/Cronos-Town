import { describe, expect, it } from 'vitest';

import { addToSelection, clearSelection, selectOne, selectedIds, toggleSelection, type SelectionItem } from '../src/features/editor/shared/selection';
import { snapPoint, snapRect, snapToGrid, snapTileToChunk, isOnGrid, TILE_GRID } from '../src/features/editor/shared/snapping';
import { align, boundingBox, resize, translate, type Transform2D } from '../src/features/editor/shared/transform';
import { Clipboard } from '../src/features/editor/shared/clipboard';

import { addKeyframe, addTrack, emptyTimeline, frameAtTime, setPlayhead, totalDuration, trackDuration, type AnimationTimeline } from '../src/features/editor/tools/animation-editor';

import { emptyTileMap, fillRect, resizeMap, setTile, tileAt, tileCount, usedTiles } from '../src/features/editor/tools/tile-editor';

import { EntityManager } from '../src/engine/entity/EntityManager';
import { CommandStack } from '../src/engine/commands/Command';
import { EntityEditor } from '../src/features/editor/tools/entity-editor';

import { DialogueEditor, QuestEditor } from '../src/features/editor/tools/graph-editors';

import { distribute, moveElement, placeElement, resizeElement, viewportSize, type UiElement } from '../src/features/editor/tools/ui-editor';

import { PrefabLibrary } from '../src/features/editor/tools/scene-editor';

import { WorldEditor, tileToChunk, CHUNK_SIZE } from '../src/features/editor/tools/world-editor';

describe('editor/shared — selection', () => {
  const a: SelectionItem = { scope: 'entity', id: '1' };
  const b: SelectionItem = { scope: 'entity', id: '2' };

  it('selectOne / addTo / toggle / clear', () => {
    let s = selectOne(a);
    expect(s.primary).toEqual(a);
    expect(s.items).toHaveLength(1);

    s = addToSelection(s, b);
    expect(s.items).toHaveLength(2);
    expect(s.primary).toEqual(a); // primary unchanged

    s = toggleSelection(s, a);
    expect(s.items.map((i) => i.id)).toEqual(['2']);
    expect(s.primary?.id).toBe('2'); // primary falls back

    expect(clearSelection().items).toEqual([]);
  });

  it('selectedIds filters by scope', () => {
    const s = addToSelection(selectOne(a), { scope: 'tile', id: 'x' });
    expect(selectedIds(s, 'entity')).toEqual(['1']);
    expect(selectedIds(s, 'tile')).toEqual(['x']);
  });
});

describe('editor/shared — snapping', () => {
  it('snaps to the 32px grid', () => {
    expect(snapToGrid(50)).toBe(64);
    expect(snapToGrid(15)).toBe(0);
    expect(snapPoint(50, 50)).toEqual({ x: 64, y: 64 });
    expect(TILE_GRID).toBe(32);
  });

  it('snapRect floors size at one grid step', () => {
    expect(snapRect({ x: 50, y: 50, width: 10, height: 10 })).toEqual({ x: 64, y: 64, width: 32, height: 32 });
  });

  it('snapTileToChunk + isOnGrid', () => {
    expect(snapTileToChunk(20, 16)).toBe(16);
    expect(isOnGrid(64)).toBe(true);
    expect(isOnGrid(63)).toBe(false);
  });
});

describe('editor/shared — transform', () => {
  const t: Transform2D = { x: 10, y: 10, width: 32, height: 32 };

  it('translate with snap', () => {
    expect(translate(t, 20, 0, { snap: true })).toEqual({ x: 32, y: 0, width: 32, height: 32 });
  });

  it('resize floors at zero / grid', () => {
    expect(resize(t, -10, -10).width).toBe(22);
    expect(resize(t, -100, 0).width).toBe(0);
  });

  it('align + boundingBox', () => {
    const objs = [{ x: 0, y: 0, width: 10, height: 10 }, { x: 50, y: 0, width: 10, height: 10 }];
    const aligned = align(objs, 'left');
    expect(aligned.map((o) => o.x)).toEqual([0, 0]);
    expect(boundingBox(objs)).toEqual({ x: 0, y: 0, width: 60, height: 10 });
  });
});

describe('editor/shared — clipboard', () => {
  it('copy/paste is type-scoped + deep-cloned', () => {
    const cb = new Clipboard();
    const data = { a: [1, 2] };
    cb.copy('entity', data);
    expect(cb.hasType('entity')).toBe(true);
    expect(cb.hasType('tile')).toBe(false);
    const pasted = cb.paste<typeof data>('entity')!;
    pasted.a.push(99);
    expect(data.a).toEqual([1, 2]); // isolated copy
    expect(cb.paste('tile')).toBeNull();
  });
});

describe('editor/tools — animation-editor', () => {
  it('builds a timeline, computes durations + resolves frames', () => {
    let tl: AnimationTimeline = emptyTimeline(8);
    tl = addTrack(tl, 'walk', 'Walk');
    tl = addKeyframe(tl, 'walk', { id: 'f1', frameIndex: 0, durationMs: 125 });
    tl = addKeyframe(tl, 'walk', { id: 'f2', frameIndex: 1, durationMs: 125 });
    expect(totalDuration(tl)).toBe(250);
    expect(trackDuration(tl.tracks[0])).toBe(250);
    expect(frameAtTime(tl.tracks[0], 0)).toBe(0);
    expect(frameAtTime(tl.tracks[0], 125)).toBe(1);
    expect(frameAtTime(tl.tracks[0], 250)).toBe(0); // loop wraps
    expect(frameAtTime(tl.tracks[0], 300)).toBe(0); // 300 % 250 = 50 → frame 0
    const capped = setPlayhead(tl, 999);
    expect(capped.playheadMs).toBe(250);
  });
});

describe('editor/tools — tile-editor', () => {
  it('edits tiles immutably', () => {
    let map = emptyTileMap(4, 4, 'grass');
    map = setTile(map, 1, 1, 'water');
    expect(tileAt(map, 1, 1)).toBe('water');
    expect(tileAt(map, 0, 0)).toBe('grass');
    map = fillRect(map, 2, 2, 2, 2, 'road'); // fill bottom-right, leaving water intact
    expect(tileCount(map, 'road')).toBe(4);
    expect(tileAt(map, 1, 1)).toBe('water'); // water preserved
    expect(usedTiles(map).sort()).toEqual(['grass', 'road', 'water']);
  });

  it('resizeMap preserves overlaps', () => {
    let map = emptyTileMap(2, 2, 'a');
    map = setTile(map, 1, 1, 'b');
    const resized = resizeMap(map, 4, 4, 'c');
    expect(tileAt(resized, 1, 1)).toBe('b');
    expect(tileAt(resized, 3, 3)).toBe('c');
    expect(resized.width).toBe(4);
  });
});

describe('editor/tools — entity-editor (command-backed, undoable)', () => {
  it('create/move/destroy are undoable', () => {
    const world = new EntityManager();
    const stack = new CommandStack();
    const editor = new EntityEditor(world, stack);

    const id = editor.create(3, 4);
    expect(world.getComponent<{ x: number } & { type: string }>(id, 'transform')?.x).toBe(3);

    editor.move(id, 10, 10);
    expect(world.getComponent<{ x: number } & { type: string }>(id, 'transform')?.x).toBe(10);

    editor.undo(); // undo move
    expect(world.getComponent<{ x: number } & { type: string }>(id, 'transform')?.x).toBe(3);

    editor.destroy(id);
    expect(world.count).toBe(0);
    editor.undo(); // undo destroy → restored
    expect(world.count).toBe(1);
  });
});

describe('editor/tools — graph editors (dialogue/quest)', () => {
  it('dialogue editor add/remove/connect + validation', () => {
    const editor = new DialogueEditor({
      kind: 'dialogue', start: 'n1',
      nodes: [{ id: 'n1', kind: 'line', speaker: 'A', text: 'hi' }],
      edges: [],
    });
    editor.addNode({ id: 'n2', kind: 'end' });
    editor.connect('n1', 'n2');
    expect(editor.validate().valid).toBe(true);

    // removeNode also cleans up connected edges (graph hygiene), so it stays valid.
    editor.removeNode('n2');
    expect(editor.validate().valid).toBe(true);
    expect(editor.current.nodes).toHaveLength(1);
    expect(editor.current.edges).toHaveLength(0);
  });

  it('quest editor add/connect + validation', () => {
    const editor = new QuestEditor({
      kind: 'quest', start: 'o1',
      nodes: [{ id: 'o1', kind: 'objective', title: 'X', description: 'y' }],
      edges: [],
    });
    editor.addNode({ id: 'c1', kind: 'complete' });
    editor.connect('o1', 'c1');
    expect(editor.validate().valid).toBe(true);
  });
});

describe('editor/tools — ui-editor (GBA-constrained)', () => {
  const el: UiElement = { id: 'e1', type: 'panel', name: 'Menu', x: 50, y: 50, width: 60, height: 40 };

  it('placeElement snaps + clamps to the viewport', () => {
    const vp = viewportSize();
    expect(vp).toEqual({ width: 640, height: 448 }); // 20×32, 14×32
    const placed = placeElement(el);
    expect(placed.x).toBe(64);
    expect(placed.y).toBe(64);
    expect(placed.width).toBe(64); // snapped to grid
    expect(placed.height).toBe(32);
  });

  it('moveElement snaps; distribute equalizes gaps', () => {
    const moved = moveElement(el, 10, 0);
    expect(moved.x).toBe(64); // 50 + 10 = 60 → snap 64
    const els = [
      { ...el, id: 'a', x: 0 },
      { ...el, id: 'b', x: 100 },
      { ...el, id: 'c', x: 200 },
    ];
    const dist = distribute(els, 'x');
    expect(dist[1].x).toBe(100); // evenly between 0 and 200
  });

  it('resizeElement snaps size', () => {
    const resized = resizeElement(el, 5, 5);
    expect(resized.width).toBe(64); // 65 → snap 64
  });
});

describe('editor/tools — scene-editor (prefabs)', () => {
  it('save + instantiate a prefab with deep-cloned components', () => {
    const world = new EntityManager();
    const lib = new PrefabLibrary();
    const e = world.createEntity();
    world.addComponent(e, { type: 'npc', name: 'Bob' });

    lib.saveFromEntity('prefab-npc', 'NPC', e, world);
    const inst = lib.instantiate('prefab-npc', world);
    expect(inst).not.toBeNull();
    expect(world.getComponent<{ name: string } & { type: string }>(inst!, 'npc')?.name).toBe('Bob');
    // Mutating the instance doesn't affect the prefab.
    world.addComponent(inst!, { type: 'npc', name: 'Changed' });
    const inst2 = lib.instantiate('prefab-npc', world);
    expect(world.getComponent<{ name: string } & { type: string }>(inst2!, 'npc')?.name).toBe('Bob');
  });
});

describe('editor/tools — world-editor (chunks)', () => {
  it('maps tiles to chunks + dirty tracking', () => {
    expect(CHUNK_SIZE).toBe(16);
    expect(tileToChunk(20, 20)).toEqual({ cx: 1, cy: 1 });
    expect(tileToChunk(15, 15)).toEqual({ cx: 0, cy: 0 });

    const world = new WorldEditor();
    world.setChunk(0, 0, { tiles: [] });
    world.setChunk(1, 0, { tiles: [] });
    expect(world.dirtyChunks()).toHaveLength(2);
    world.markClean(0, 0);
    expect(world.dirtyChunks()).toHaveLength(1);
    expect(world.chunkForTile(10, 5)?.id).toBe('0,0');
    expect(world.chunksInRect(0, 0, 32, 16).map((c) => c.id).sort()).toEqual(['0,0', '1,0']);
  });
});
