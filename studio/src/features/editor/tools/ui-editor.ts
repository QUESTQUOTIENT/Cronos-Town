/**
 * features/editor/tools/ui-editor.ts — UI editor (pure, GBA-constrained).
 *
 * A Figma-style editor bounded by GBA constraints: elements live on the 20×14
 * viewport, snap to the 32px tile grid, and can be aligned/distributed. Elements
 * are plain rectangles + a type; the renderer draws them; this module owns the
 * layout math.
 */
import { snapRect, TILE_GRID } from '../shared/snapping';
import { align, boundingBox, translate, type Transform2D } from '../shared/transform';

export interface UiElement extends Transform2D {
  id: string;
  type: string;
  name: string;
}

export const VIEWPORT_COLUMNS = 20;
export const VIEWPORT_ROWS = 14;

export function viewportSize(): { width: number; height: number } {
  return { width: VIEWPORT_COLUMNS * TILE_GRID, height: VIEWPORT_ROWS * TILE_GRID };
}

/** Place a new element, snapped to the grid + clamped to the viewport. */
export function placeElement(el: UiElement): UiElement {
  const snapped = snapRect(el);
  const vp = viewportSize();
  return {
    ...el,
    ...snapped,
    x: Math.min(snapped.x, vp.width - snapped.width),
    y: Math.min(snapped.y, vp.height - snapped.height),
  };
}

export function moveElement(el: UiElement, dx: number, dy: number): UiElement {
  return placeElement({ ...el, ...translate(el, dx, dy, { snap: true }) });
}

export function resizeElement(el: UiElement, dw: number, dh: number): UiElement {
  const snapped = snapRect({ ...el, width: el.width + dw, height: el.height + dh });
  return { ...el, ...snapped };
}

/** Distribute elements evenly along an axis (equal gaps). */
export function distribute(elements: UiElement[], axis: 'x' | 'y'): UiElement[] {
  if (elements.length <= 2) return elements.map((e) => ({ ...e }));
  const sorted = [...elements].sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpan = axis === 'x' ? last.x - first.x : last.y - first.y;
  const gap = totalSpan / (sorted.length - 1);
  return sorted.map((el, i) => {
    const offset = Math.round(i * gap);
    return axis === 'x' ? { ...el, x: first.x + offset } : { ...el, y: first.y + offset };
  });
}

/** Alignment + bounding-box helpers (re-exported for the inspector). */
export { align, boundingBox };
export { TILE_GRID };
