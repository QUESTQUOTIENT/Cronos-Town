/**
 * features/editor/tools/tile-editor.ts — tile editor (pure).
 *
 * Tile-palette + placement state: a tileset (a grid of tile ids), a palette of
 * selectable tiles, and a paint operation that stamps a tile onto a grid. This is
 * the data model behind the map/tile editor; the renderer draws it.
 */

export interface TileMap {
  width: number;
  height: number;
  /** tile id per cell (row-major). */
  tiles: string[];
}

export function emptyTileMap(width: number, height: number, defaultTile = 'grass'): TileMap {
  return { width, height, tiles: new Array(width * height).fill(defaultTile) };
}

export function tileAt(map: TileMap, x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return map.tiles[y * map.width + x];
}

export function setTile(map: TileMap, x: number, y: number, tile: string): TileMap {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return map;
  const tiles = [...map.tiles];
  tiles[y * map.width + x] = tile;
  return { ...map, tiles };
}

/** Paint a rectangle of tiles (fill). */
export function fillRect(map: TileMap, x: number, y: number, w: number, h: number, tile: string): TileMap {
  let next = map;
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      next = setTile(next, x + dx, y + dy, tile);
    }
  }
  return next;
}

/** The unique tile ids used in a map (for the palette). */
export function usedTiles(map: TileMap): string[] {
  return [...new Set(map.tiles)];
}

/** Count of a given tile in the map. */
export function tileCount(map: TileMap, tile: string): number {
  return map.tiles.filter((t) => t === tile).length;
}

/** Resize a map (preserving overlapping tiles, filling new cells). */
export function resizeMap(map: TileMap, width: number, height: number, defaultTile = 'grass'): TileMap {
  const tiles = new Array(width * height).fill(defaultTile);
  for (let y = 0; y < Math.min(map.height, height); y += 1) {
    for (let x = 0; x < Math.min(map.width, width); x += 1) {
      tiles[y * width + x] = map.tiles[y * map.width + x];
    }
  }
  return { width, height, tiles };
}
