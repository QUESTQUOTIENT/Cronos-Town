import { describe, expect, it } from 'vitest';

import { defaultWorldBounds } from '../src/engine/world/bounds';
import {
  brushPoints,
  defaultBrushSprite,
  edgeDirectionsAtCursor,
  expandBounds,
  expansionMessage,
  MAP_BUILDER_CHUNK_SIZE,
  playerAfterExpand,
} from '../src/features/editor/brushes';

describe('features/editor/brushes — brush engine + expansion (legacy parity)', () => {
  it('paint produces a single point', () => {
    expect(brushPoints('paint', 10, 10)).toEqual([{ x: 10, y: 10 }]);
  });

  it('fill produces 25 points (5×5)', () => {
    expect(brushPoints('fill', 10, 10)).toHaveLength(25);
  });

  it('rectangle produces 15 points (5×3)', () => {
    expect(brushPoints('rectangle', 10, 10)).toHaveLength(15);
  });

  it('circle produces 13 candidates filtered to the radius', () => {
    const pts = brushPoints('circle', 10, 10);
    expect(pts.length).toBeLessThan(13);
    expect(pts).toContainEqual({ x: 10, y: 10 }); // center always included
  });

  it('path/auto-road produce a 9-wide horizontal line', () => {
    const pts = brushPoints('auto-road', 10, 10);
    expect(pts).toHaveLength(9);
    expect(pts[0]).toEqual({ x: 6, y: 10 });
    expect(pts[8]).toEqual({ x: 14, y: 10 });
  });

  it('auto-river produces a 9-tall vertical line', () => {
    const pts = brushPoints('auto-river', 10, 10);
    expect(pts).toHaveLength(9);
    expect(pts[0]).toEqual({ x: 10, y: 6 });
  });

  it('auto-edge produces only the perimeter (no center)', () => {
    const pts = brushPoints('auto-edge', 10, 10);
    expect(pts).not.toContainEqual({ x: 10, y: 10 });
  });

  it('auto-forest produces 13 scattered points', () => {
    expect(brushPoints('auto-forest', 10, 10)).toHaveLength(13);
  });

  it('defaultBrushSprite resolves per brush', () => {
    expect(defaultBrushSprite('auto-road', 'sprites/x.png')).toBe('sprites/sandrock1.png');
    expect(defaultBrushSprite('auto-river', 'x')).toBe('sprites/arena_water.png');
    expect(defaultBrushSprite('auto-forest', 'x')).toBe('sprites/green_tree_small.png');
    expect(defaultBrushSprite('paint', 'sprites/active.png')).toBe('sprites/active.png');
    expect(defaultBrushSprite('paint', '')).toBe('sprites/grass.png');
  });

  it('expandBounds shifts the correct edge by 16', () => {
    const b = defaultWorldBounds();
    expect(MAP_BUILDER_CHUNK_SIZE).toBe(16);
    expect(expandBounds(b, 'west').minX).toBe(b.minX - 16);
    expect(expandBounds(b, 'east').maxX).toBe(b.maxX + 16);
    expect(expandBounds(b, 'north').minY).toBe(b.minY - 16);
    expect(expandBounds(b, 'south').maxY).toBe(b.maxY + 16);
  });

  it('playerAfterExpand places the player in the new chunk', () => {
    const b = defaultWorldBounds();
    const west = expandBounds(b, 'west');
    expect(playerAfterExpand({ x: 5, y: 5 }, b, west, 'west')).toEqual({ x: west.minX, y: 5 });

    const east = expandBounds(b, 'east');
    expect(playerAfterExpand({ x: 5, y: 5 }, b, east, 'east')).toEqual({ x: b.maxX + 1, y: 5 });
  });

  it('edgeDirectionsAtCursor only reports edges in exterior mode', () => {
    const b = defaultWorldBounds();
    expect(edgeDirectionsAtCursor(b, { x: -22, y: 5 }, 'exterior')).toContain('west');
    expect(edgeDirectionsAtCursor(b, { x: 5, y: 5 }, 'interior')).toEqual([]);
    expect(edgeDirectionsAtCursor(b, { x: 50, y: 95 }, 'exterior')).toContain('south');
  });

  it('expansionMessage includes the chunk size + direction', () => {
    expect(expansionMessage('west')).toBe('WEST chunk added: 16×16. Add another chunk in any direction whenever you reach an edge.');
  });
});
