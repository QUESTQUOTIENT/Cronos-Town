import { describe, expect, it } from 'vitest';

import { COLUMNS, VIEW_COLUMNS, VIEW_ROWS, WORLD_ROWS, CITY_ROWS, TOWN_OFFSET_ROWS } from '../src/engine/world/config';
import { defaultWorldBounds } from '../src/engine/world/bounds';
import {
  canWalkInside,
  canWalkOutside,
  customObjectBlocksCell,
  customObjectIsSolid,
  pointIsInside,
  removalCoversCell,
  type ExteriorCollisionContext,
  type InteriorCollisionContext,
} from '../src/engine/world/collision';

function makeExteriorCtx(overrides: Partial<ExteriorCollisionContext> = {}): ExteriorCollisionContext {
  const blocked = new Set<string>();
  const roads = new Set<string>();
  return {
    bounds: defaultWorldBounds(),
    cityRows: CITY_ROWS,
    townOffsetRows: TOWN_OFFSET_ROWS,
    columns: COLUMNS,
    worldRows: WORLD_ROWS,
    isRoad: (x, y) => roads.has(`${x},${y}`),
    isBlocked: (x, y) => blocked.has(`${x},${y}`),
    isCustomBlocked: () => false,
    ...overrides,
  };
}

describe('engine/world/collision — exterior walkability', () => {
  it('open town cell is walkable', () => {
    expect(canWalkOutside(50, 10, makeExteriorCtx())).toBe(true);
  });

  it('native blocked object blocks the cell', () => {
    const ctx = makeExteriorCtx();
    ctx.isBlocked = (x, y) => x === 50 && y === 10;
    expect(canWalkOutside(50, 10, ctx)).toBe(false);
  });

  it('studio object blocks the cell', () => {
    const ctx = makeExteriorCtx();
    ctx.isCustomBlocked = (x, y) => x === 50 && y === 10;
    expect(canWalkOutside(50, 10, ctx)).toBe(false);
  });

  it('jungle passage requires a road', () => {
    // jungle band is [cityRows, townOffsetRows) = [32, 64)
    const y = CITY_ROWS + 1;
    const offRoad = makeExteriorCtx();
    expect(canWalkOutside(50, y, offRoad)).toBe(false);

    const onRoad = makeExteriorCtx();
    onRoad.isRoad = (x, yy) => x === 50 && yy === y;
    expect(canWalkOutside(50, y, onRoad)).toBe(true);
  });

  it('outside bounds is not walkable', () => {
    expect(canWalkOutside(200, 200, makeExteriorCtx())).toBe(false);
    expect(canWalkOutside(-23, 10, makeExteriorCtx())).toBe(false);
  });
});

describe('engine/world/collision — interior walkability', () => {
  function makeInteriorCtx(overrides: Partial<InteriorCollisionContext> = {}): InteriorCollisionContext {
    const blocked = new Set<string>();
    return {
      // isBlocked = blocked by a native fixture (and not removed)
      isBlocked: (x, y) => blocked.has(`${x},${y}`),
      isCustomBlocked: () => false,
      ...overrides,
    };
  }

  it('open interior cell is walkable', () => {
    expect(canWalkInside(5, 5, makeInteriorCtx())).toBe(true);
  });

  it('native fixture blocks the cell', () => {
    const ctx = makeInteriorCtx();
    ctx.isBlocked = (x, y) => x === 5 && y === 5;
    expect(canWalkInside(5, 5, ctx)).toBe(false);
  });

  it('studio object blocks the cell', () => {
    const ctx = makeInteriorCtx();
    ctx.isCustomBlocked = (x, y) => x === 5 && y === 5;
    expect(canWalkInside(5, 5, ctx)).toBe(false);
  });

  it('out-of-viewport is not walkable', () => {
    expect(canWalkInside(-1, 5, makeInteriorCtx())).toBe(false);
    expect(canWalkInside(VIEW_COLUMNS, 5, makeInteriorCtx())).toBe(false);
    expect(canWalkInside(5, VIEW_ROWS, makeInteriorCtx())).toBe(false);
  });
});

describe('engine/world/collision — Map Builder geometry', () => {
  it('pointIsInside footprint', () => {
    expect(pointIsInside(10, 6, { x: 10, y: 6, width: 2, height: 2 })).toBe(true);
    expect(pointIsInside(11, 7, { x: 10, y: 6, width: 2, height: 2 })).toBe(true);
    expect(pointIsInside(12, 6, { x: 10, y: 6, width: 2, height: 2 })).toBe(false);
    expect(pointIsInside(10, 6, undefined)).toBe(false);
  });

  it('customObjectIsSolid heuristics', () => {
    expect(customObjectIsSolid({ solid: false })).toBe(false);
    expect(customObjectIsSolid({ solid: true })).toBe(true);
    expect(customObjectIsSolid({ kind: 'npc' })).toBe(true);
    expect(customObjectIsSolid({ label: 'Road', width: 1, height: 1 })).toBe(false);
    expect(customObjectIsSolid({ label: 'Tree', width: 1, height: 1 })).toBe(true);
    expect(customObjectIsSolid({ width: 2, height: 1 })).toBe(true);
    expect(customObjectIsSolid({ label: 'Grass', width: 1, height: 1 })).toBe(false);
    expect(customObjectIsSolid(undefined)).toBe(false);
  });

  it('customObjectBlocksCell respects replacement door carve-out', () => {
    const obj = { label: 'House', x: 10, y: 6, width: 4, height: 4, solid: true };
    expect(customObjectBlocksCell(obj, 11, 8)).toBe(true);
    expect(customObjectBlocksCell(obj, 10, 8, { x: 10, y: 8 })).toBe(false); // door cell preserved
    expect(customObjectBlocksCell(obj, 20, 20)).toBe(false);
  });

  it('removalCoversCell footprint', () => {
    expect(removalCoversCell({ x: 5, y: 5, width: 3, height: 2 }, 6, 6)).toBe(true);
    expect(removalCoversCell({ x: 5, y: 5, width: 3, height: 2 }, 8, 5)).toBe(false);
  });
});
