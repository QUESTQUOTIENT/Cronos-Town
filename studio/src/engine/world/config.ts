/**
 * engine/world/config.ts — world dimensions and district constants (pure).
 *
 * Behavior-preserving port of the legacy world constants from index.html.
 * These encode the critical 1:1 tile grid — `viewColumns`/`viewRows` form the
 * 20:14 viewport whose aspect ratio (1.428571…) is enforced by the CSS
 * `--world-width: min(100vw, calc(100vh * 1.428571)); aspect-ratio: 20 / 14;`
 * so every tile stays a 1:1 square (no horizontal/vertical stretching).
 */

/** Visible tile grid (the GBA-style viewport). */
export const VIEW_COLUMNS = 20;
export const VIEW_ROWS = 14;

/** Total exterior world width in tiles. */
export const COLUMNS = 117;

/** Horizontal offset of world origin (negative coords exist west of home). */
export const WORLD_ORIGIN_X = 25;

/** District boundary constants (used by camera + procedural world build). */
export const WOLF_STREET_MIN_X = -22;
export const CROVEGAS_FOREST_START_X = 45;
export const CROVEGAS_START_X = 60;
export const CROVEGAS_END_X = 90;

export const JUNGLE_NAME = 'Cro Springs';
export const NEXT_CITY_NAME = 'WolfsCity';

/** Procedural row bands. */
export const CITY_ROWS = 32;
export const JUNGLE_ROWS = 32;
export const TOWN_OFFSET_ROWS = CITY_ROWS + JUNGLE_ROWS;
/** Leave room for the lower-town building exits before the final boundary. */
export const BOTTOM_EXTENSION_ROWS = 5;

/** Total exterior world height in tiles = 27 + townOffsetRows + bottomExtensionRows. */
export const WORLD_ROWS = 27 + TOWN_OFFSET_ROWS + BOTTOM_EXTENSION_ROWS;

/** The enforced viewport aspect ratio (20 / 14). */
export const VIEW_ASPECT_RATIO = VIEW_COLUMNS / VIEW_ROWS;

/** Map Builder grid dimensions. */
export const MAP_BUILDER_GRID_COLUMNS = 20;
