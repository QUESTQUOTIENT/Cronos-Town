/**
 * engine/world/district.ts — district/zone detection (pure).
 *
 * Behavior-preserving port of the zone-detection logic inside `drawTownMap`
 * (the minimap's location readout) from index.html. Given a cursor position,
 * it resolves the district name using the world's district boundary constants.
 *
 * This is the shared district model used by the minimap, the HUD district badge,
 * and (in the modular app) any other consumer that needs to know "where am I?".
 */
import {
  CITY_ROWS,
  CROVEGAS_FOREST_START_X,
  CROVEGAS_START_X,
  JUNGLE_NAME,
  NEXT_CITY_NAME,
  TOWN_OFFSET_ROWS,
} from './config';

export type DistrictName =
  | 'CroVegas'
  | 'CroVegas Forest'
  | 'Liquidity Valley'
  | 'Wolf Street'
  | typeof JUNGLE_NAME
  | typeof NEXT_CITY_NAME
  | 'Cronos Town';

/**
 * Resolve the district name for a cursor position (mirrors the `zone` ternary in
 * `drawTownMap`). The order of checks matters and is preserved exactly.
 */
export function districtAt(cursorX: number, cursorY: number): DistrictName {
  if (cursorX >= CROVEGAS_START_X && cursorY < CITY_ROWS) return 'CroVegas';
  if (cursorX >= CROVEGAS_FOREST_START_X && cursorX < CROVEGAS_START_X && cursorY < CITY_ROWS) return 'CroVegas Forest';
  if (cursorX <= -3 && cursorY >= TOWN_OFFSET_ROWS && cursorY <= 89) return 'Liquidity Valley';
  if (cursorX < 0 && cursorY < CITY_ROWS) return 'Wolf Street';
  if (cursorY >= CITY_ROWS && cursorY < TOWN_OFFSET_ROWS) return JUNGLE_NAME;
  if (cursorY < CITY_ROWS) return NEXT_CITY_NAME;
  return 'Cronos Town';
}

/** The minimap location readout line (mirrors the `mapLocationEl` text). */
export function minimapLocationLine(
  zone: DistrictName,
  cursorX: number,
  cursorY: number,
  playerX: number,
  playerY: number,
): string {
  return `${zone} · Cursor: ${cursorX}, ${cursorY} · Player: ${playerX}, ${playerY}`;
}
