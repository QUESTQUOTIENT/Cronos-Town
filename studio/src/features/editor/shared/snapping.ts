/**
 * features/editor/shared/snapping.ts — grid snapping (pure).
 *
 * GBA-constrained snapping: the studio works on a 32-px logical tile grid (and
 * the 20×14 viewport). `snapToGrid` rounds a coordinate to the nearest grid
 * step; `snapRect` snaps a rectangle's origin + size to the grid (with a minimum
 * of one tile). Used by the tile editor, UI editor, and transform gizmos.
 */

export const TILE_GRID = 32; // logical px per tile

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Snap a scalar coordinate to the nearest grid step. */
export function snapToGrid(value: number, grid = TILE_GRID): number {
  return Math.round(value / grid) * grid;
}

/** Snap a point to the grid. */
export function snapPoint(x: number, y: number, grid = TILE_GRID): { x: number; y: number } {
  return { x: snapToGrid(x, grid), y: snapToGrid(y, grid) };
}

/** Snap a rectangle's origin + size to the grid (size floors at one grid step). */
export function snapRect(rect: RectLike, grid = TILE_GRID): RectLike {
  const x = snapToGrid(rect.x, grid);
  const y = snapToGrid(rect.y, grid);
  const width = Math.max(grid, snapToGrid(rect.width, grid));
  const height = Math.max(grid, snapToGrid(rect.height, grid));
  return { x, y, width, height };
}

/** Snap a tile coordinate (already integer tiles) to a chunk boundary. */
export function snapTileToChunk(tile: number, chunkSize = 16): number {
  return Math.floor(tile / chunkSize) * chunkSize;
}

/** Whether a point is on the grid (within epsilon). */
export function isOnGrid(value: number, grid = TILE_GRID, epsilon = 0.001): boolean {
  return Math.abs(value - snapToGrid(value, grid)) <= epsilon;
}
