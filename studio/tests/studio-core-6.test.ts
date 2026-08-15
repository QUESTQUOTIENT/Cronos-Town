import { describe, expect, it } from 'vitest';

import { FocusManager } from '../src/ui/systems/FocusManager';
import { ShortcutManager } from '../src/ui/systems/ShortcutManager';
import { WindowManager } from '../src/ui/systems/WindowManager';
import { DragDropManager } from '../src/ui/systems/DragDropManager';

import { packAtlas } from '../src/engine/assets/pipeline/atlas';
import { deduplicateAssets, resolveAlias } from '../src/engine/assets/pipeline/dedup';
import { extractReferences, referencedBy } from '../src/engine/assets/pipeline/dependency-analysis';

import { CommandLog, EventMonitor, Profiler } from '../src/engine/debugger/Debugger';

describe('ui/systems — FocusManager', () => {
  it('focuses and tracks history', () => {
    const fm = new FocusManager();
    fm.focus({ id: 'a', scope: 'editor' });
    fm.focus({ id: 'b', scope: 'editor' });
    expect(fm.focused?.id).toBe('b');
    expect(fm.isFocused('b')).toBe(true);
    expect(fm.focusHistory().map((t) => t.id)).toEqual(['a']);
  });

  it('push/pop restores the previous focus', () => {
    const fm = new FocusManager();
    fm.focus({ id: 'panel', scope: 'ui' });
    fm.push({ id: 'modal', scope: 'overlay' });
    expect(fm.focused?.id).toBe('modal');
    const restored = fm.pop();
    expect(restored?.id).toBe('panel');
    expect(fm.focused?.id).toBe('panel');
  });
});

describe('ui/systems — ShortcutManager', () => {
  it('resolves scoped shortcuts over global ones', () => {
    const sm = new ShortcutManager();
    sm.register({ id: 'global-save', key: 's', ctrl: true, scope: 'global' });
    sm.register({ id: 'editor-save', key: 's', ctrl: true, scope: 'editor' });
    sm.setScope('editor');
    expect(sm.resolve({ key: 's', ctrlKey: true })).toBe('editor-save');
    sm.setScope('global');
    expect(sm.resolve({ key: 's', ctrlKey: true })).toBe('global-save');
  });

  it('normalizes single-char keys and matches modifiers', () => {
    const sm = new ShortcutManager();
    sm.register({ id: 'palette', key: 'k', ctrl: true, scope: 'global' });
    expect(sm.resolve({ key: 'K', ctrlKey: true })).toBe('palette'); // case-insensitive
    expect(sm.resolve({ key: 'k' })).toBeNull(); // ctrl missing
  });

  it('unregister removes a shortcut', () => {
    const sm = new ShortcutManager();
    sm.register({ id: 'x', key: 'x', scope: 'global' });
    expect(sm.unregister('x')).toBe(true);
    expect(sm.resolve({ key: 'x' })).toBeNull();
  });
});

describe('ui/systems — WindowManager', () => {
  it('opens/focuses/closes windows and tracks the active one', () => {
    const wm = new WindowManager();
    wm.open({ id: 'a', title: 'A', type: 'panel', zone: 'left', tabGroup: 't1' });
    wm.open({ id: 'b', title: 'B', type: 'panel', zone: 'right', tabGroup: 't2' });
    expect(wm.active?.id).toBe('b');
    wm.focus('a');
    expect(wm.active?.id).toBe('a');
    wm.close('a');
    expect(wm.active?.id).toBe('b'); // falls back to last remaining
  });

  it('docks + tab groups', () => {
    const wm = new WindowManager();
    wm.open({ id: 'a', title: 'A', type: 'panel', zone: 'left', tabGroup: 't1' });
    wm.open({ id: 'b', title: 'B', type: 'panel', zone: 'left', tabGroup: 't1' });
    wm.open({ id: 'c', title: 'C', type: 'panel', zone: 'bottom', tabGroup: 't2' });
    expect(wm.tabGroups().get('t1')?.map((w) => w.id)).toEqual(['a', 'b']);
    expect(wm.inZone('left')).toHaveLength(2);
    expect(wm.inZone('bottom')).toHaveLength(1);

    wm.moveToTab('c', 't1');
    expect(wm.tabGroups().get('t1')?.map((w) => w.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('ui/systems — DragDropManager', () => {
  it('tracks drag → over → drop lifecycle', () => {
    const dm = new DragDropManager();
    expect(dm.isDragging).toBe(false);
    dm.startDrag({ id: 'sprite', kind: 'asset' });
    expect(dm.isDragging).toBe(true);
    dm.dragOver('canvas');
    expect(dm.current.phase).toBe('over');
    const drop = dm.drop();
    expect(drop).toEqual({ payload: { id: 'sprite', kind: 'asset' }, targetId: 'canvas' });
    expect(dm.isDragging).toBe(false);
  });

  it('cancel resets to cancelled phase', () => {
    const dm = new DragDropManager();
    dm.startDrag({ id: 'x', kind: 'y' });
    dm.cancel();
    expect(dm.current.phase).toBe('cancelled');
  });

  it('drop without a target returns null', () => {
    const dm = new DragDropManager();
    dm.startDrag({ id: 'x', kind: 'y' });
    expect(dm.drop()).toBeNull(); // phase still 'dragging', no target
  });
});

describe('engine/assets/pipeline — atlas', () => {
  it('packs sprites into rows and reports UV rects + utilization', () => {
    const result = packAtlas([
      { id: 'a', width: 32, height: 32 },
      { id: 'b', width: 32, height: 32 },
      { id: 'c', width: 64, height: 32 },
    ], { padding: 0, maxWidth: 512 });
    expect(result.rects).toHaveLength(3);
    // all on one row (total width 128 <= 512)
    expect(result.rects.map((r) => r.y)).toEqual([0, 0, 0]);
    expect(result.width).toBe(128);
    expect(result.height).toBe(32);
    expect(result.utilization).toBeCloseTo(1, 6);
  });

  it('wraps to a new row when exceeding maxWidth', () => {
    const result = packAtlas([
      { id: 'a', width: 300, height: 32 },
      { id: 'b', width: 300, height: 32 },
    ], { padding: 0, maxWidth: 500 });
    // 300 + 300 > 500 -> second sprite wraps
    expect(result.rects[1].y).toBeGreaterThan(0);
    expect(result.height).toBe(64);
  });

  it('sorts tallest-first for a compact pack', () => {
    const result = packAtlas([
      { id: 'short', width: 64, height: 16 },
      { id: 'tall', width: 32, height: 64 },
    ], { padding: 0, maxWidth: 512 });
    const tall = result.rects.find((r) => r.id === 'tall')!;
    const short = result.rects.find((r) => r.id === 'short')!;
    expect(tall.y).toBe(0);
    expect(short.y).toBe(0); // fits on the same row next to tall
    expect(result.height).toBe(64);
  });
});

describe('engine/assets/pipeline — dedup', () => {
  it('collapses identical content into a canonical asset + aliases', () => {
    const result = deduplicateAssets([
      { id: 'a', source: 'data:x' },
      { id: 'b', source: 'data:x' },
      { id: 'c', source: 'data:y' },
    ]);
    expect(result.canonical.size).toBe(2);
    expect(result.aliases.get('b')).toBe('a');
    expect(result.removed).toBe(1);
    expect(resolveAlias('b', result.aliases)).toBe('a');
    expect(resolveAlias('c', result.aliases)).toBe('c');
  });
});

describe('engine/assets/pipeline — dependency-analysis', () => {
  it('extracts explicit + metadata references', () => {
    const refs = extractReferences([
      { id: 'map1', references: ['sprite1'], metadata: { tiles: ['grass', 'stone'] } },
    ]);
    expect(refs).toHaveLength(3);
    expect(refs[0]).toEqual({ from: 'map1', to: 'sprite1', source: 'explicit' });
    expect(refs.find((r) => r.to === 'grass')?.source).toBe('metadata');
  });

  it('referencedBy builds the reverse index', () => {
    const refs = extractReferences([
      { id: 'map1', references: ['sprite1'] },
      { id: 'map2', metadata: { sprites: ['sprite1'] } },
    ]);
    expect(referencedBy('sprite1', refs).sort()).toEqual(['map1', 'map2']);
  });
});

describe('engine/debugger — CommandLog / EventMonitor / Profiler', () => {
  it('CommandLog records execute/undo/redo in order', () => {
    const log = new CommandLog(() => 1);
    log.record('execute', 'Move');
    log.record('undo', 'Move');
    log.record('redo', 'Move');
    expect(log.all().map((e) => e.direction)).toEqual(['execute', 'undo', 'redo']);
    expect(log.entriesFor('Move')).toHaveLength(3);
  });

  it('EventMonitor counts distinct events', () => {
    const mon = new EventMonitor(() => 1);
    mon.record('quest:completed', { id: 'q1' });
    mon.record('quest:completed', { id: 'q2' });
    mon.record('asset:imported', { id: 'a1' });
    expect(mon.counts().get('quest:completed')).toBe(2);
    expect(mon.filter('asset:imported')).toHaveLength(1);
  });

  it('Profiler computes rolling min/max/avg/last per phase', () => {
    const prof = new Profiler();
    prof.record('render', 10);
    prof.record('render', 20);
    prof.record('render', 30);
    prof.record('physics', 5);
    const render = prof.stats().find((s) => s.phase === 'render')!;
    expect(render.count).toBe(3);
    expect(render.min).toBe(10);
    expect(render.max).toBe(30);
    expect(render.avg).toBe(20);
    expect(render.last).toBe(30);
    expect(prof.totals().get('render')).toBe(60);
  });
});
