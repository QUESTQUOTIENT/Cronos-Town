/**
 * engine/world/bounds.ts — playable-area bounds (pure).
 *
 * Behavior-preserving port of the legacy Map Builder bounds logic from
 * index.html (`defaultMapEditorBounds`, `ensureMapBuilderBounds`, and the
 * player-position clamping inside `updatePlayer`).
 */
import { COLUMNS, WORLD_ROWS, WOLF_STREET_MIN_X } from './config';

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Default playable rectangle (Wolf Street west boundary → east edge, top → bottom). */
export function defaultWorldBounds(): WorldBounds {
  return { minX: WOLF_STREET_MIN_X, maxX: COLUMNS - 1, minY: 0, maxY: WORLD_ROWS - 1 };
}

/** Coerce a possibly-invalid bounds object to finite, integer, ordered values. */
export function normalizeWorldBounds(raw?: Partial<WorldBounds> | null): WorldBounds {
  const fallback = defaultWorldBounds();
  if (!raw || typeof raw !== 'object') return fallback;
  const keys = ['minX', 'maxX', 'minY', 'maxY'] as const;
  const out: WorldBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  for (const key of keys) {
    const value = Number(raw[key]);
    out[key] = Number.isFinite(value) ? Math.trunc(value) : fallback[key];
  }
  if (out.minX > out.maxX) [out.minX, out.maxX] = [out.maxX, out.minX];
  if (out.minY > out.maxY) [out.minY, out.maxY] = [out.maxY, out.minY];
  return out;
}

/** Clamp a player position inside the playable rectangle (saved/loaded positions). */
export function clampPlayerPosition(x: number, y: number, bounds: WorldBounds): { x: number; y: number } {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
  };
}
