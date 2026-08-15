import { describe, expect, it } from 'vitest';

import { Scheduler } from '../src/engine/runtime/Scheduler';
import { Time } from '../src/engine/runtime/Time';
import { AnimationRuntime } from '../src/engine/runtime/AnimationRuntime';
import { computeStreaming, streamState } from '../src/engine/runtime/Streaming';
import { WorldEditor } from '../src/features/editor/tools/world-editor';
import { addKeyframe, addTrack, emptyTimeline, type AnimationTimeline } from '../src/features/editor/tools/animation-editor';

describe('engine/runtime — Scheduler', () => {
  it('runs tasks in phase order (update → physics → render → late)', () => {
    const s = new Scheduler();
    const order: string[] = [];
    s.register({ id: 'r', phase: 'render', run: () => order.push('r') });
    s.register({ id: 'p', phase: 'physics', run: () => order.push('p') });
    s.register({ id: 'u', phase: 'update', run: () => order.push('u') });
    s.register({ id: 'l', phase: 'late', run: () => order.push('l') });
    const report = s.run();
    expect(order).toEqual(['u', 'p', 'r', 'l']);
    expect(report.order).toEqual(['u', 'p', 'r', 'l']);
  });

  it('register replaces a same-id task; unregister removes', () => {
    const s = new Scheduler();
    const calls: string[] = [];
    s.register({ id: 'x', phase: 'update', run: () => calls.push('v1') });
    s.register({ id: 'x', phase: 'update', run: () => calls.push('v2') });
    s.run();
    expect(calls).toEqual(['v2']);
    expect(s.unregister('x')).toBe(true);
    expect(s.unregister('x')).toBe(false);
  });
});

describe('engine/runtime — Time', () => {
  it('advances elapsed/delta with time scale', () => {
    const t = new Time(16);
    t.advance(100);
    expect(t.now.elapsedMs).toBe(100);
    t.setTimeScale(2);
    t.advance(100);
    expect(t.now.elapsedMs).toBe(300); // 100 + 100*2
    expect(t.now.deltaMs).toBe(200);
  });

  it('fixedStepDue drains a fixed-step accumulator', () => {
    const t = new Time(16);
    expect(t.fixedStepDue(10)).toBe(false);
    expect(t.fixedStepDue(10)).toBe(true); // accumulated 20 >= 16
    expect(t.fixedStepDue(10)).toBe(false); // accumulated 4
  });
});

describe('engine/runtime — AnimationRuntime', () => {
  function timeline(): AnimationTimeline {
    let tl = emptyTimeline(8);
    tl = addTrack(tl, 'walk', 'Walk');
    tl = addKeyframe(tl, 'walk', { id: 'f1', frameIndex: 0, durationMs: 100 });
    tl = addKeyframe(tl, 'walk', { id: 'f2', frameIndex: 1, durationMs: 100 });
    return tl;
  }

  it('resolves frames as it advances; loops', () => {
    const rt = new AnimationRuntime();
    const tl = timeline();
    rt.play();
    expect(rt.advance(0, tl).get('walk')).toBe(0);
    expect(rt.advance(100, tl).get('walk')).toBe(1);
    expect(rt.advance(150, tl).get('walk')).toBe(0); // 250 → loop → 50 → frame 0
  });

  it('paused playback does not advance time', () => {
    const rt = new AnimationRuntime();
    const tl = timeline();
    // not playing
    expect(rt.advance(100, tl).get('walk')).toBe(0);
    expect(rt.advance(100, tl).get('walk')).toBe(0); // time never advances
  });
});

describe('engine/runtime — Streaming', () => {
  it('loads chunks in radius and unloads out-of-range', () => {
    const world = new WorldEditor();
    // 5×5 chunk grid centered on (0,0)
    for (let cx = -2; cx <= 2; cx += 1) {
      for (let cy = -2; cy <= 2; cy += 1) {
        world.setChunk(cx, cy, {});
      }
    }
    const state = streamState();
    // Camera at tile (0,0) → chunk (0,0), radius 1 → loads (0,0) + 8 neighbors.
    const r1 = computeStreaming(state, world, 0, 0, 1);
    expect(r1.toLoad).toHaveLength(9);

    // Move camera far away → old chunks unload, new load.
    const r2 = computeStreaming(state, world, 40, 40, 1);
    expect(r2.toUnload.length).toBeGreaterThan(0);
    expect(r2.toLoad.length).toBeGreaterThan(0);
  });

  it('does not load chunks that do not exist', () => {
    const world = new WorldEditor();
    world.setChunk(0, 0, {});
    const state = streamState();
    const r = computeStreaming(state, world, 0, 0, 1);
    expect(r.toLoad).toEqual(['0,0']); // only the existing chunk
  });
});
