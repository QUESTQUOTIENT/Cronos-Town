import { describe, expect, it } from 'vitest';

import {
  COLUMNS,
  MAP_BUILDER_GRID_COLUMNS,
  VIEW_ASPECT_RATIO,
  VIEW_COLUMNS,
  VIEW_ROWS,
  WORLD_ORIGIN_X,
  WORLD_ROWS,
  WOLF_STREET_MIN_X,
} from '../src/engine/world/config';

import { clampPlayerPosition, defaultWorldBounds, normalizeWorldBounds } from '../src/engine/world/bounds';

import { exteriorCameraBounds, updateExteriorCamera } from '../src/engine/world/camera';

describe('engine/world/config — dimensions & 1:1 tile invariant', () => {
  it('viewport is 20×14 and aspect ratio matches the CSS constraint', () => {
    expect(VIEW_COLUMNS).toBe(20);
    expect(VIEW_ROWS).toBe(14);
    // CSS: --world-width: min(100vw, calc(100vh * 1.428571)); aspect-ratio: 20/14
    expect(VIEW_ASPECT_RATIO).toBeCloseTo(1.4285714285714286, 12);
  });

  it('world is 117 columns × 96 rows', () => {
    expect(COLUMNS).toBe(117);
    expect(WORLD_ROWS).toBe(96); // 27 + 32 + 32 + 5
  });

  it('origin and district constants', () => {
    expect(WORLD_ORIGIN_X).toBe(25);
    expect(WOLF_STREET_MIN_X).toBe(-22);
    expect(MAP_BUILDER_GRID_COLUMNS).toBe(20);
  });
});

describe('engine/world/bounds — playable rectangle', () => {
  it('default bounds span Wolf Street west → east edge, full height', () => {
    const b = defaultWorldBounds();
    expect(b).toEqual({ minX: -22, maxX: 116, minY: 0, maxY: 95 });
  });

  it('normalize clamps to finite integers and reorders inverted axes', () => {
    const b = normalizeWorldBounds({ minX: 40, maxX: 10, minY: 'x' as unknown as number, maxY: 8.9 });
    expect(b.minX).toBe(10);
    expect(b.maxX).toBe(40);
    expect(b.minY).toBe(0); // invalid 'x' -> fallback default
    expect(b.maxY).toBe(8);
  });

  it('normalize handles null/undefined via defaults', () => {
    expect(normalizeWorldBounds(null)).toEqual(defaultWorldBounds());
  });

  it('clampPlayerPosition keeps positions inside the rectangle', () => {
    const b = defaultWorldBounds();
    expect(clampPlayerPosition(999, -50, b)).toEqual({ x: 116, y: 0 });
    expect(clampPlayerPosition(5, 40, b)).toEqual({ x: 5, y: 40 });
  });
});

describe('engine/world/camera — camera bounds + clamping', () => {
  it('exterior camera bounds derive from world bounds + origin', () => {
    const b = defaultWorldBounds();
    const cb = exteriorCameraBounds(b);
    // minX(-22) + origin(25) = 3 -> min(0, 3) = 0
    expect(cb.minCamera).toBe(0);
    // maxX(116) + origin(25) - 20 + 1 = 122
    expect(cb.maxCamera).toBe(122);
    expect(cb.minCameraY).toBe(0);
    // maxY(95) - 14 + 1 = 82
    expect(cb.maxCameraY).toBe(82);
  });

  it('camera clamps at world edges and centers elsewhere', () => {
    // player at west edge (x=-22): desired camera = (-22+25) - 10 = -7 -> clamped to 0
    const west = updateExteriorCamera(-22, 48);
    expect(west.cameraX).toBe(0);

    // player in the middle: camera follows, not clamped
    const mid = updateExteriorCamera(50, 48);
    const desiredX = 50 + WORLD_ORIGIN_X - Math.floor(VIEW_COLUMNS / 2);
    expect(mid.cameraX).toBe(desiredX);

    // far east: desired = 116 + 25 - 10 = 131 -> clamped to 122
    const east = updateExteriorCamera(116, 48);
    expect(east.cameraX).toBe(122);
  });

  it('camera clamps player position inside bounds', () => {
    const out = updateExteriorCamera(999, -10);
    expect(out.clamped).toEqual({ x: 116, y: 0 });
  });
});
