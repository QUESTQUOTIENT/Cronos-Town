/**
 * engine/world/collision.ts — walkability & Map Builder geometry (pure).
 *
 * Behavior-preserving port of the legacy collision + Map Builder geometry helpers
 * from index.html. All live game state (the `roads`/`blocked` sets, the editor's
 * removal/replacement records, custom object lists) is supplied via a context
 * object so these functions stay pure and testable. The feature layer passes the
 * real values; the decision math is unchanged.
 */
import { VIEW_COLUMNS, VIEW_ROWS } from './config';
import type { WorldBounds } from './bounds';

/** A Map Builder object with a footprint (plain data). */
export interface FootprintObject {
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  solid?: unknown;
  kind?: string;
  objectKind?: string;
  type?: string;
  label?: string;
  sprite?: string;
}

export interface ExteriorCollisionContext {
  bounds: WorldBounds;
  cityRows: number;
  townOffsetRows: number;
  columns: number;
  worldRows: number;
  /** True if (x, y) is on a road. */
  isRoad: (x: number, y: number) => boolean;
  /** True if (x, y) is blocked by a native object that is NOT removed. */
  isBlocked: (x: number, y: number) => boolean;
  /** True if (x, y) is blocked by a placed studio object. */
  isCustomBlocked: (x: number, y: number) => boolean;
}

export interface InteriorCollisionContext {
  /**
   * True if (x, y) is NOT natively walkable — i.e. blocked by a native interior
   * fixture and NOT covered by a Map Builder removal. Mirrors
   * `interiorBlocked.has(key) && !mapBuilderInteriorCellIsRemoved(x, y)`.
   */
  isBlocked: (x: number, y: number) => boolean;
  /** True if (x, y) is blocked by a placed studio object. */
  isCustomBlocked: (x: number, y: number) => boolean;
}

/** Exterior walkability (mirrors `canWalkOutside`). */
export function canWalkOutside(x: number, y: number, ctx: ExteriorCollisionContext): boolean {
  const inJunglePassage = y >= ctx.cityRows && y < ctx.townOffsetRows;
  const onJungleRoad = ctx.isRoad(x, y);
  const isExpandedCell = x < 0 || x >= ctx.columns || y < 0 || y >= ctx.worldRows;
  const blockedByNativeObject = ctx.isBlocked(x, y);
  const blockedByStudioObject = ctx.isCustomBlocked(x, y);
  return (
    x >= ctx.bounds.minX && x <= ctx.bounds.maxX &&
    y >= ctx.bounds.minY && y <= ctx.bounds.maxY &&
    !blockedByNativeObject &&
    !blockedByStudioObject &&
    (isExpandedCell || !inJunglePassage || onJungleRoad)
  );
}

/** Interior walkability (mirrors `canWalkInside`). */
export function canWalkInside(x: number, y: number, ctx: InteriorCollisionContext): boolean {
  const blockedByStudioObject = ctx.isCustomBlocked(x, y);
  return (
    x >= 0 && x < VIEW_COLUMNS &&
    y >= 0 && y < VIEW_ROWS &&
    !ctx.isBlocked(x, y) &&
    !blockedByStudioObject
  );
}

/** Point-in-footprint test (mirrors `mapBuilderPointIsInside`). */
export function pointIsInside(x: number, y: number, object?: FootprintObject | null): boolean {
  return (
    x >= Number(object?.x) && x < Number(object?.x) + Math.max(1, Number(object?.width) || 1) &&
    y >= Number(object?.y) && y < Number(object?.y) + Math.max(1, Number(object?.height) || 1)
  );
}

/** Solid-object heuristic (mirrors `mapBuilderCustomObjectIsSolid`). */
export function customObjectIsSolid(object?: FootprintObject | null): boolean {
  if (!object) return false;
  if (typeof object.solid === 'boolean') return object.solid;
  if (object.kind === 'npc' || object.objectKind === 'npc' || object.type === 'npc') return true;
  const text = `${object.label || ''} ${object.sprite || ''}`.toLowerCase();
  if (/(road|path)/.test(text)) return false;
  return (
    Number(object.width || 1) > 1 ||
    Number(object.height || 1) > 1 ||
    /(tree|bush|rock|stone|water|pond|house|building|hospital|pc|table|mailbox|replacement)/.test(text)
  );
}

/**
 * A placed studio object blocks a cell if it is solid, covers the cell, and is
 * not the (preserved) outside door of a building it replaces. Mirrors
 * `mapBuilderCustomObjectBlocksCell`.
 */
export function customObjectBlocksCell(
  object: FootprintObject,
  x: number,
  y: number,
  replacementDoor?: { x: number; y: number } | null,
): boolean {
  if (!customObjectIsSolid(object)) return false;
  if (replacementDoor && x === replacementDoor.x && y === replacementDoor.y) return false;
  return pointIsInside(x, y, object);
}

/**
 * A removal record covers a cell if the cell falls inside the record's footprint.
 * Mirrors the geometry inside `mapBuilderCellIsCoveredByRemoved`.
 */
export function removalCoversCell(
  record: FootprintObject,
  x: number,
  y: number,
): boolean {
  if (!record) return false;
  return (
    x >= Number(record.x) && x < Number(record.x) + Math.max(1, Number(record.width) || 1) &&
    y >= Number(record.y) && y < Number(record.y) + Math.max(1, Number(record.height) || 1)
  );
}
