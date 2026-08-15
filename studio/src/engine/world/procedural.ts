/**
 * engine/world/procedural.ts — procedural world generation (pure).
 *
 * Behavior-preserving port of the deterministic world layout from index.html:
 * the tile variant hash, the blocked-area filler, the tall-grass patch pattern,
 * and the full road-grid generation (lower town → shifted town → city grid →
 * jungle connection → CroVegas → Wolf Street → Liquidity Valley).
 *
 * The DOM side (creating tile/pond/forest `<div>`s) stays in the feature layer;
 * this module produces the *data* (road/blocked coordinate sets) that the
 * renderer consumes.
 */
import {
  CITY_ROWS,
  COLUMNS,
  CROVEGAS_END_X,
  CROVEGAS_FOREST_START_X,
  CROVEGAS_START_X,
  TOWN_OFFSET_ROWS,
  WORLD_ROWS,
  WOLF_STREET_MIN_X,
} from './config';

/** Deterministic tile variant hash (mirrors `hash` in index.html). */
export function tileHash(x: number, y: number): number {
  return (x * 17 + y * 31 + x * y * 7) % 6;
}

/** Add an x/y/width/height rectangle to a coordinate set (mirrors `addBlockedArea`). */
export function addBlockedArea(set: Set<string>, x: number, y: number, width: number, height: number): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      set.add(`${column},${row}`);
    }
  }
}

/**
 * The 14×20 tall-grass patch pattern in the lower town (mirrors `patch`).
 * `g` = tall grass; `.` = plain grass. Row 0 = top.
 */
export const TALL_GRASS_PATCH: string[] = [
  '....................',
  '....................',
  '..........gggggg....',
  '.........gggggggg...',
  '.........gggggggggg.',
  '.........gggggggggg.',
  '.........gggggggggg.',
  '.........gggggggggg.',
  '.........gggggggggg.',
  '.........gggggggggg.',
  '.........gggggggg...',
  '..........gggggg....',
  '....................',
  '....................',
];

/** True if (x, y) is tall grass, given the world y (mirrors the `patch` lookup). */
export function isTallGrass(x: number, y: number): boolean {
  const localPatchY = y - TOWN_OFFSET_ROWS;
  return TALL_GRASS_PATCH[localPatchY]?.[x] === 'g';
}

/**
 * Generate the full deterministic road-grid coordinate set (mirrors the road
 * construction in index.html, including the town shift by `townOffsetRows`).
 */
export function generateRoads(): Set<string> {
  const roads = new Set<string>();

  // Base lower-town roads (before the town shift).
  for (let y = 8; y <= 10; y += 1) {
    roads.add(`3,${y}`);
    roads.add(`4,${y}`);
    roads.add(`10,${y}`);
    roads.add(`11,${y}`);
    roads.add(`34,${y}`);
    roads.add(`35,${y}`);
    roads.add(`41,${y}`);
    roads.add(`42,${y}`);
  }
  for (let x = 3; x <= 42; x += 1) {
    roads.add(`${x},10`);
  }
  roads.add('10,7');
  roads.add('11,7');
  roads.add('34,7');
  roads.add('35,7');
  roads.add('41,7');
  roads.add('42,7');

  // Lower-town roads branch around the central pond and connect the new buildings.
  for (let y = 10; y <= 17; y += 1) {
    roads.add(`17,${y}`);
    roads.add(`18,${y}`);
  }
  for (let x = 17; x <= 20; x += 1) {
    roads.add(`${x},12`);
  }
  for (let x = 12; x <= 34; x += 1) {
    roads.add(`${x},17`);
  }
  for (let y = 17; y <= 26; y += 1) {
    roads.add(`12,${y}`);
    roads.add(`13,${y}`);
    roads.add(`22,${y}`);
    roads.add(`23,${y}`);
    roads.add(`33,${y}`);
    roads.add(`34,${y}`);
  }
  for (let x = 3; x <= 42; x += 1) {
    roads.add(`${x},26`);
  }

  // Move the existing town 32 rows down so the new jungle and city sit above it.
  const shiftedTownRoads = new Set<string>();
  roads.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    shiftedTownRoads.add(`${x},${y + TOWN_OFFSET_ROWS}`);
  });
  roads.clear();
  shiftedTownRoads.forEach((key) => roads.add(key));

  // The organized city road grid and its long jungle connection to the town.
  for (let y = 2; y <= 31; y += 1) {
    roads.add(`7,${y}`);
    roads.add(`8,${y}`);
    roads.add(`13,${y}`);
    roads.add(`14,${y}`);
    roads.add(`21,${y}`);
    roads.add(`22,${y}`);
    roads.add(`31,${y}`);
    roads.add(`32,${y}`);
    roads.add(`39,${y}`);
    roads.add(`40,${y}`);
  }
  for (const y of [2, 12, 22, 30]) {
    for (let x = 3; x <= 42; x += 1) roads.add(`${x},${y}`);
  }
  for (let y = 28; y <= TOWN_OFFSET_ROWS + 10; y += 1) {
    roads.add(`17,${y}`);
    roads.add(`18,${y}`);
  }

  // CroVegas sits east of the Exchange behind a short forest corridor.
  for (let x = 43; x <= CROVEGAS_START_X; x += 1) {
    roads.add(`${x},10`);
    roads.add(`${x},11`);
  }
  for (let y = 10; y <= 31; y += 1) {
    roads.add(`${CROVEGAS_START_X},${y}`);
    roads.add(`${CROVEGAS_START_X + 1},${y}`);
  }
  for (const y of [13, 14, 23, 24, 31]) {
    for (let x = CROVEGAS_START_X; x <= CROVEGAS_END_X; x += 1) roads.add(`${x},${y}`);
  }
  for (const x of [65, 66, 72, 73, 79, 80, 86, 87]) {
    for (let y = 13; y <= 31; y += 1) roads.add(`${x},${y}`);
  }

  // Wolf Street occupies the virtual west side of the Marketplace.
  for (let x = WOLF_STREET_MIN_X - 5; x <= 2; x += 1) {
    roads.add(`${x},10`);
    roads.add(`${x},11`);
  }
  for (const x of [-21, -20, -10, -9, 0, 1]) {
    for (let y = 2; y <= 31; y += 1) roads.add(`${x},${y}`);
  }
  for (const y of [15, 16, 24, 25, 31]) {
    for (let x = WOLF_STREET_MIN_X; x <= 2; x += 1) roads.add(`${x},${y}`);
  }

  // Liquidity Valley is west of the player's lower-town home. Its road
  // runs north through Wolf Street and reconnects with the Marketplace road
  // at the existing Wolf Street / Exchange junction.
  for (let y = 32; y <= 89; y += 1) {
    roads.add(`-10,${y}`);
    roads.add(`-9,${y}`);
  }
  for (let x = -20; x <= -3; x += 1) {
    roads.add(`${x},75`);
    roads.add(`${x},85`);
  }
  for (let x = -17; x <= -4; x += 1) roads.add(`${x},73`);

  return roads;
}

/** Forest-top / forest-bottom band (mirrors the `forestTop`/`forestBottom` constants). */
export const FOREST_TOP = CITY_ROWS - 1;
export const FOREST_BOTTOM = TOWN_OFFSET_ROWS - 1;

/** A building's footprint + mailbox (the fields the blocked generator needs). */
export interface BuildingFootprint {
  x: number;
  y: number;
  width: number;
  height: number;
  mailboxX: number;
  mailboxY: number;
}

export interface Pond {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PondData {
  main: Pond;
  valley: Pond;
  city: Pond[];
}

/** The ponds (mirrors `pondData`, `liquidityValleyPondData`, `cityPondData`). */
export const PONDS: PondData = {
  main: { x: 20, y: 13 + TOWN_OFFSET_ROWS, width: 6, height: 4 },
  valley: { x: -18, y: 85, width: 4, height: 3 },
  city: [
    { x: 16, y: 5, width: 4, height: 3 },
    { x: 24, y: 5, width: 4, height: 3 },
    { x: 24, y: 18, width: 5, height: 3 },
  ],
};

/**
 * Generate the full deterministic blocked-cell set (mirrors the blocked/forest/
 * jungle/CroVegas-forest generation in index.html). Buildings, ponds, forest
 * pieces, jungle trees/bushes, and the CroVegas forest corridor all contribute.
 */
export function generateBlocked(
  buildings: BuildingFootprint[],
  ponds: PondData,
  roads: Set<string>,
): Set<string> {
  const blocked = new Set<string>();

  buildings.forEach((building) => {
    addBlockedArea(blocked, building.x, building.y, building.width, building.height);
    blocked.add(`${building.mailboxX},${building.mailboxY}`);
  });

  addBlockedArea(blocked, ponds.main.x, ponds.main.y, ponds.main.width, ponds.main.height);
  addBlockedArea(blocked, ponds.valley.x, ponds.valley.y, ponds.valley.width, ponds.valley.height);
  ponds.city.forEach((p) => addBlockedArea(blocked, p.x, p.y, p.width, p.height));

  // Only the east side of Liquidity Valley is a stone boundary (gap at y=75).
  for (let y = 64; y <= 94; y += 1) {
    if (y !== 75) blocked.add(`-2,${y}`);
  }

  // Liquidity Valley greenery (bush/tree), skipping roads + existing blocks.
  for (let y = 66; y <= 87; y += 4) {
    for (let x = -19; x <= -3; x += 4) {
      if (roads.has(`${x},${y}`) || blocked.has(`${x},${y}`)) continue;
      blocked.add(`${x},${y}`);
    }
  }

  // Forest top/bottom rock bands (clear corridor x=16..19).
  for (let x = 0; x < COLUMNS; x += 2) {
    if (x >= 16 && x <= 19) continue;
    blocked.add(`${x},${FOREST_TOP}`);
    blocked.add(`${x},${FOREST_BOTTOM}`);
  }

  // Forest side rocks + the two central stone slabs.
  for (let y = CITY_ROWS; y < TOWN_OFFSET_ROWS; y += 2) {
    blocked.add(`0,${y}`);
    blocked.add(`${COLUMNS - 1},${y}`);
    blocked.add(`16,${y}`);
    blocked.add(`19,${y}`);
  }

  // Bottom stone-slab boundary.
  const bottomBoundaryY = WORLD_ROWS - 1;
  for (let x = 0; x < COLUMNS; x += 1) {
    blocked.add(`${x},${bottomBoundaryY}`);
  }

  // Jungle trees/bushes (main passage x=15..20 stays clear).
  for (let y = CITY_ROWS; y < TOWN_OFFSET_ROWS - 1; y += 3) {
    for (let x = 1 + (y % 3); x < COLUMNS - 1; x += 4) {
      const onMainPassage = x >= 15 && x <= 20;
      if (onMainPassage || roads.has(`${x},${y}`) || blocked.has(`${x},${y}`)) continue;
      blocked.add(`${x},${y}`);
    }
  }

  // Compact forest corridor between the Exchange district and CroVegas.
  for (let y = 2; y <= 29; y += 4) {
    for (let x = CROVEGAS_FOREST_START_X; x < CROVEGAS_START_X; x += 3) {
      if (roads.has(`${x},${y}`) || roads.has(`${x},${y + 1}`)) continue;
      blocked.add(`${x},${y}`);
    }
  }

  return blocked;
}
