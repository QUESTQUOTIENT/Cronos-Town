/**
 * engine/input/mapping.ts — keyboard → movement/facing mappings (pure).
 *
 * Behavior-preserving port of the legacy input mappings from index.html:
 *  - the `movement` key → [dx, dy] table
 *  - key normalization (`event.key.length === 1 ? toLowerCase() : event.key`)
 *  - facing vector → cardinal direction name (`facingEdgeDirection`)
 *  - movement vector → sprite direction (`customizerPlayerDirection`)
 */

export type Vec2 = { x: number; y: number };

export type DirectionName = 'north' | 'south' | 'east' | 'west';
export type SpriteDirection = 'up' | 'down' | 'left' | 'right';

/** Movement table: WASD + arrow keys. */
export const MOVEMENT_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

/** Normalize a KeyboardEvent.key exactly like the legacy handler. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/** True if the normalized key is a movement key. */
export function isMovementKey(key: string): boolean {
  return key in MOVEMENT_KEYS;
}

/** Movement delta for a movement key (or null). */
export function movementFor(key: string): [number, number] | null {
  return MOVEMENT_KEYS[key] ?? null;
}

/** Facing vector → cardinal direction (used by Map Builder edge menu). */
export function facingEdgeDirection(facing: Vec2): DirectionName {
  if (facing.x < 0) return 'west';
  if (facing.x > 0) return 'east';
  if (facing.y < 0) return 'north';
  return 'south';
}

/** Movement vector → sprite direction (used by the customizer preview). */
export function movementSpriteDirection(dx: number, dy: number): SpriteDirection {
  if (dx < 0) return 'left';
  if (dx > 0) return 'right';
  if (dy < 0) return 'up';
  return 'down';
}
