/**
 * engine/assets/pipeline/atlas.ts — sprite atlas packing (pure).
 *
 * Packs sprites into a texture atlas using a deterministic shelf (row) packer,
 * producing a UV rect per sprite. The renderer consumes these UVs; the packing
 * math is pure + testable (no actual image decoding).
 */

export interface AtlasInput {
  id: string;
  width: number;
  height: number;
}

export interface AtlasRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasResult {
  width: number;
  height: number;
  rects: AtlasRect[];
  /** Packed area / atlas area (utilization, 0..1). */
  utilization: number;
}

export interface AtlasOptions {
  /** Padding between sprites (px). */
  padding?: number;
  /** Max atlas width before wrapping to a new row. */
  maxWidth?: number;
}

/** Pack sprites into rows (shelves), tallest-in-row determines row height. */
export function packAtlas(sprites: AtlasInput[], options: AtlasOptions = {}): AtlasResult {
  const padding = options.padding ?? 2;
  const maxWidth = options.maxWidth ?? 512;

  // Sort tallest-first for a compact pack (deterministic tiebreak by id).
  const sorted = [...sprites].sort((a, b) => b.height - a.height || a.id.localeCompare(b.id));

  const rects: AtlasRect[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let atlasWidth = 0;

  for (const sprite of sorted) {
    if (cursorX + sprite.width > maxWidth && cursorX > 0) {
      // wrap to a new row
      cursorY += rowHeight + padding;
      cursorX = 0;
      rowHeight = 0;
    }
    rects.push({ id: sprite.id, x: cursorX, y: cursorY, width: sprite.width, height: sprite.height });
    cursorX += sprite.width + padding;
    rowHeight = Math.max(rowHeight, sprite.height);
    atlasWidth = Math.max(atlasWidth, cursorX - padding);
  }
  const atlasHeight = cursorY + rowHeight;

  const usedArea = sprites.reduce((sum, s) => sum + s.width * s.height, 0);
  const atlasArea = atlasWidth * atlasHeight;
  const utilization = atlasArea > 0 ? Math.min(1, usedArea / atlasArea) : 0;

  return { width: Math.max(1, atlasWidth), height: Math.max(1, atlasHeight), rects, utilization };
}
