/**
 * features/editor/brushes.ts — World Studio brush engine (pure).
 *
 * Behavior-preserving port of `worldStudioBrushPoints`, `worldStudioDefaultSprite`,
 * and the edge-expansion logic from index.html. These produce the deterministic
 * tile coordinates the terrain painter writes; the DOM application stays in the
 * view layer.
 */
import type { WorldBounds } from '../../engine/world/bounds';
import type { StudioBrush } from './studio-state';

export interface Point {
  x: number;
  y: number;
}

export const MAP_BUILDER_CHUNK_SIZE = 16;

/** Deterministic brush point layout (mirrors `worldStudioBrushPoints`). */
export function brushPoints(brush: StudioBrush, x: number, y: number): Point[] {
  if (brush === 'fill') return Array.from({ length: 25 }, (_, index) => ({ x: x - 2 + (index % 5), y: y - 2 + Math.floor(index / 5) }));
  if (brush === 'rectangle') return Array.from({ length: 15 }, (_, index) => ({ x: x - 2 + (index % 5), y: y - 1 + Math.floor(index / 5) }));
  if (brush === 'circle')
    return Array.from({ length: 13 }, (_, index) => ({ x: x - 2 + (index % 5), y: y - 2 + Math.floor(index / 5) })).filter(
      (point) => (point.x - x) ** 2 + (point.y - y) ** 2 <= 5,
    );
  if (brush === 'path' || brush === 'auto-road') return Array.from({ length: 9 }, (_, index) => ({ x: x - 4 + index, y }));
  if (brush === 'auto-river') return Array.from({ length: 9 }, (_, index) => ({ x, y: y - 4 + index }));
  if (brush === 'auto-edge')
    return Array.from({ length: 9 }, (_, index) => ({ x: x - 1 + (index % 3), y: y - 1 + Math.floor(index / 3) })).filter(
      (point) => point.x === x - 1 || point.x === x + 1 || point.y === y - 1 || point.y === y + 1,
    );
  if (brush === 'auto-forest') return Array.from({ length: 13 }, (_, index) => ({ x: x - 3 + ((index * 5) % 7), y: y - 2 + ((index * 3) % 5) }));
  return [{ x, y }];
}

/** Default sprite per brush (mirrors `worldStudioDefaultSprite`). */
export function defaultBrushSprite(brush: StudioBrush, activeAsset: string, draftSprite = ''): string {
  if (brush === 'auto-road' || brush === 'path') return 'sprites/sandrock1.png';
  if (brush === 'auto-river') return 'sprites/arena_water.png';
  if (brush === 'auto-forest') return 'sprites/green_tree_small.png';
  return draftSprite || activeAsset || 'sprites/grass.png';
}

export type EdgeDirection = 'west' | 'east' | 'north' | 'south';

export const EDGE_DIRECTIONS: EdgeDirection[] = ['west', 'east', 'north', 'south'];

export function normalizeEdgeDirection(direction: string): EdgeDirection | '' {
  return (EDGE_DIRECTIONS as string[]).includes(direction) ? (direction as EdgeDirection) : '';
}

/** Expand the bounds by one chunk in a direction (mirrors `mapBuilderExpand`). */
export function expandBounds(bounds: WorldBounds, direction: EdgeDirection): WorldBounds {
  const next = { ...bounds };
  if (direction === 'west') next.minX -= MAP_BUILDER_CHUNK_SIZE;
  if (direction === 'east') next.maxX += MAP_BUILDER_CHUNK_SIZE;
  if (direction === 'north') next.minY -= MAP_BUILDER_CHUNK_SIZE;
  if (direction === 'south') next.maxY += MAP_BUILDER_CHUNK_SIZE;
  return next;
}

/** Place the player in the newly created chunk (mirrors the `editingExterior` branch). */
export function playerAfterExpand(
  player: Point,
  oldBounds: WorldBounds,
  newBounds: WorldBounds,
  direction: EdgeDirection,
): Point {
  let { x, y } = player;
  if (direction === 'west') x = newBounds.minX;
  if (direction === 'east') x = oldBounds.maxX + 1;
  if (direction === 'north') y = newBounds.minY;
  if (direction === 'south') y = oldBounds.maxY + 1;
  x = Math.max(newBounds.minX, Math.min(newBounds.maxX, x));
  y = Math.max(newBounds.minY, Math.min(newBounds.maxY, y));
  return { x, y };
}

/** Edge directions available at the cursor (mirrors `mapBuilderEdgeDirectionsAtCursor`). */
export function edgeDirectionsAtCursor(bounds: WorldBounds, cursor: Point, mode: 'exterior' | 'interior'): EdgeDirection[] {
  if (mode !== 'exterior') return [];
  const directions: EdgeDirection[] = [];
  if (cursor.x <= bounds.minX) directions.push('west');
  if (cursor.x >= bounds.maxX) directions.push('east');
  if (cursor.y <= bounds.minY) directions.push('north');
  if (cursor.y >= bounds.maxY) directions.push('south');
  return directions;
}

export function expansionMessage(direction: EdgeDirection): string {
  const dir = direction.toUpperCase();
  return `${dir} chunk added: ${MAP_BUILDER_CHUNK_SIZE}×${MAP_BUILDER_CHUNK_SIZE}. Add another chunk in any direction whenever you reach an edge.`;
}
