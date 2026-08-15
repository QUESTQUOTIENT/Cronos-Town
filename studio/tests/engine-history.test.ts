import { describe, expect, it } from 'vitest';

import { HistoryEngine, jsonDeepClone } from '../src/engine/history/HistoryEngine';

interface WorldState {
  exterior: string[];
  bounds: { minX: number; maxX: number };
}

function world(exterior: string[]): WorldState {
  return { exterior, bounds: { minX: -22, maxX: 116 } };
}

describe('engine/history — snapshot undo/redo (legacy semantics)', () => {
  it('record then undo restores the previous snapshot', () => {
    const h = new HistoryEngine<WorldState>();
    h.record(world(['a']));
    h.record(world(['a', 'b']));

    const res = h.undo(world(['a', 'b', 'c']));
    expect(res.restore).toEqual(world(['a', 'b']));
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(true);
  });

  it('undo on empty stack returns null', () => {
    const h = new HistoryEngine<WorldState>();
    expect(h.undo(world(['a'])).restore).toBeNull();
    expect(h.redo(world(['a'])).restore).toBeNull();
  });

  it('redo restores the future snapshot', () => {
    const h = new HistoryEngine<WorldState>();
    h.record(world(['a']));
    h.record(world(['a', 'b']));
    h.undo(world(['a', 'b', 'c'])); // back to ['a','b']
    const res = h.redo(world(['a', 'b'])); // forward to ['a','b','c']
    expect(res.restore).toEqual(world(['a', 'b', 'c']));
  });

  it('record clears the redo stack (legacy behavior)', () => {
    const h = new HistoryEngine<WorldState>();
    h.record(world(['a']));
    h.record(world(['a', 'b']));
    h.undo(world(['a', 'b', 'c'])); // redo depth now 1
    expect(h.canRedo).toBe(true);
    h.record(world(['a', 'b', 'd'])); // new record clears redo
    expect(h.canRedo).toBe(false);
  });

  it('caps the undo stack at capacity (default 40), shifting oldest', () => {
    const h = new HistoryEngine<number>(40);
    for (let i = 0; i < 50; i += 1) h.record(i);
    expect(h.undoDepth).toBe(40);
    // Undo all the way: the oldest surviving entry is 10 (50 - 40)
    let last: number | null = null;
    while (h.canUndo) {
      const r = h.undo(last as unknown as number);
      last = r.restore;
    }
    expect(last).toBe(10);
  });

  it('respects a custom capacity', () => {
    const h = new HistoryEngine<number>(5);
    for (let i = 0; i < 10; i += 1) h.record(i);
    expect(h.undoDepth).toBe(5);
  });

  it('deep-clones snapshots on record (no shared mutation)', () => {
    const h = new HistoryEngine<WorldState>();
    const state = world(['a']);
    h.record(state);
    state.exterior.push('mutated');
    const res = h.undo(world(['x']));
    expect(res.restore?.exterior).toEqual(['a']); // unaffected by later mutation
  });

  it('jsonDeepClone produces an independent deep copy', () => {
    const original = { a: [1, 2], b: { c: 3 } };
    const copy = jsonDeepClone(original);
    copy.a.push(99);
    copy.b.c = 999;
    expect(original).toEqual({ a: [1, 2], b: { c: 3 } });
  });

  it('clear empties both stacks', () => {
    const h = new HistoryEngine<number>();
    h.record(1);
    h.record(2);
    h.undo(2);
    h.clear();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });
});
