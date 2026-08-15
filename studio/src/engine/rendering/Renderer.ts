/**
 * engine/rendering/Renderer.ts — the rendering seam.
 *
 * This is the architectural contract that lets the *editor preview*, the *game
 * runtime*, and the *battle arena* all share one rendering pipeline. The legacy
 * app draws the world with absolutely-positioned `<div>` tiles + CSS transforms
 * (the `world.style.transform` camera pan and `playerEl.style.left/top`), plus a
 * `<canvas>` minimap (`drawTownMap`) and a `<canvas>` sprite-slicer.
 *
 * A `Renderer` implementation:
 *   - maps the world *data model* (bounds/camera/collision/procedural layout)
 *     into on-screen pixels,
 *   - knows nothing about game logic (no economy, no wallet, no quests),
 *   - is injected into features so they stay DOM-free and testable.
 *
 * The pure math (camera, bounds, tile placement) already lives in
 * engine/world/*; this interface is the *output* boundary the DOM adapters
 * implement.
 */

export interface TileRect {
  x: number; // tile column (world coords, before WORLD_ORIGIN_X offset)
  y: number; // tile row
  width: number; // in tiles
  height: number; // in tiles
}

export interface CameraViewport {
  /** Tile the top-left visible cell maps to. */
  originX: number;
  originY: number;
  columns: number;
  rows: number;
}

export interface RenderStyle {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
}

/** A primitive draw command (output of the pure layout → consumed by a DOM/canvas adapter). */
export type DrawCommand =
  | { kind: 'fill'; rect: TileRect; style: RenderStyle }
  | { kind: 'stroke'; rect: TileRect; style: RenderStyle };

/**
 * The renderer contract. A concrete `DomRenderer` implements this against the
 * live `<div>` grid; a `CanvasRenderer` implements it against a `<canvas>`; the
 * editor preview, game runtime, and arena all call the same methods.
 */
export interface Renderer {
  /** Clear the whole surface. */
  clear(): void;

  /** Draw the base terrain bands (mirrors the minimap district fills). */
  drawTerrainBands(commands: DrawCommand[]): void;

  /** Draw road cells (mirrors the minimap road pass). */
  drawRoads(commands: DrawCommand[]): void;

  /** Draw pond + forest + building footprints. */
  drawStructures(commands: DrawCommand[]): void;

  /** Draw the player marker. */
  drawPlayer(x: number, y: number): void;

  /** Draw the camera viewport outline + cursor. */
  drawCamera(cameraX: number, cameraY: number, cursorX: number, cursorY: number): void;
}

/**
 * Pure layout: convert the world data model into draw commands. This is the
 * testable half of rendering — a concrete adapter just executes the commands.
 * Faithful to the geometry in `drawTownMap`.
 */
export interface MinimapLayoutInput {
  columns: number;
  worldRows: number;
  tileWidth: number;
  tileHeight: number;
  worldOriginX: number;
  cityRows: number;
  jungleRows: number;
  townOffsetRows: number;
  crovegasForestStartX: number;
  crovegasStartX: number;
  crovegasEndX: number;
  roads: Set<string>;
  ponds: Array<{ x: number; y: number; width: number; height: number }>;
  buildings: Array<{ x: number; y: number; width: number; height: number; kind: 'casino' | 'market' | 'exchange' | 'other' }>;
}

export const MINIMAP_COLORS = {
  base: '#8cbe63',
  city: '#91b878',
  forestBand: '#4f8250',
  crovegas: '#9b6b89',
  road: '#c5a36d',
  pond: '#5d9eaa',
  pondStroke: '#2f5c68',
  bush: '#8fbd5b',
  tree: '#347348',
  casino: '#593d83',
  market: '#d19b4f',
  exchange: '#497d8d',
  building: '#bd7659',
  buildingStroke: '#4c4035',
  player: '#fff3ad',
  playerCore: '#b83f3b',
  cursor: '#f4c867',
  camera: '#e7eef0',
} as const;

/**
 * Produce the minimap draw commands from the world data model. This mirrors the
 * band/fill/stroke sequence in `drawTownMap` and is fully testable without a DOM.
 */
export function layoutMinimap(input: MinimapLayoutInput): DrawCommand[] {
  const { columns, worldRows, tileWidth, tileHeight, worldOriginX, cityRows, jungleRows, townOffsetRows } = input;
  const commands: DrawCommand[] = [];
  const rect = (x: number, y: number, w: number, h: number): TileRect => ({ x, y, width: w, height: h });

  // base + bands
  commands.push({ kind: 'fill', rect: rect(0, 0, columns, worldRows), style: { fill: MINIMAP_COLORS.base } });
  commands.push({ kind: 'fill', rect: rect(0, 0, columns, cityRows), style: { fill: MINIMAP_COLORS.city } });
  commands.push({
    kind: 'fill',
    rect: rect(input.crovegasForestStartX + worldOriginX, 0, input.crovegasStartX - input.crovegasForestStartX, cityRows),
    style: { fill: MINIMAP_COLORS.forestBand },
  });
  commands.push({
    kind: 'fill',
    rect: rect(input.crovegasStartX + worldOriginX, 0, input.crovegasEndX - input.crovegasStartX + 1, cityRows),
    style: { fill: MINIMAP_COLORS.crovegas },
  });
  commands.push({ kind: 'fill', rect: rect(0, cityRows, columns, jungleRows), style: { fill: MINIMAP_COLORS.forestBand } });
  commands.push({ kind: 'fill', rect: rect(0, townOffsetRows, columns, worldRows - townOffsetRows), style: { fill: MINIMAP_COLORS.base } });

  // roads
  for (const key of input.roads) {
    const [x, y] = key.split(',').map(Number);
    commands.push({ kind: 'fill', rect: rect(x + worldOriginX, y, 1, 1), style: { fill: MINIMAP_COLORS.road } });
  }

  // ponds
  for (const p of input.ponds) {
    commands.push({ kind: 'fill', rect: rect(p.x + worldOriginX, p.y, p.width, p.height), style: { fill: MINIMAP_COLORS.pond } });
    commands.push({ kind: 'stroke', rect: rect(p.x + worldOriginX, p.y, p.width, p.height), style: { stroke: MINIMAP_COLORS.pondStroke, lineWidth: 2 } });
  }

  // buildings
  for (const b of input.buildings) {
    const fill =
      b.kind === 'casino' ? MINIMAP_COLORS.casino :
      b.kind === 'market' ? MINIMAP_COLORS.market :
      b.kind === 'exchange' ? MINIMAP_COLORS.exchange :
      MINIMAP_COLORS.building;
    commands.push({ kind: 'fill', rect: rect(b.x + worldOriginX, b.y, b.width, b.height), style: { fill } });
    commands.push({ kind: 'stroke', rect: rect(b.x + worldOriginX, b.y, b.width, b.height), style: { stroke: MINIMAP_COLORS.buildingStroke, lineWidth: 2 } });
  }

  // (player + camera + cursor are drawn last by the adapter via drawPlayer/drawCamera)
  void tileWidth;
  void tileHeight;
  return commands;
}
