/**
 * features/editor/shared/transform.ts — transform operations (pure).
 *
 * Translate / resize / align operations on editor objects, with optional grid
 * snapping. Used by the transform gizmos and every tool that moves things.
 */

export interface Transform2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformOptions {
  /** Snap the result to the grid. */
  snap?: boolean;
  grid?: number;
}

/** Translate an object by (dx, dy), optionally snapping. */
export function translate(t: Transform2D, dx: number, dy: number, options: TransformOptions = {}): Transform2D {
  const next = { ...t, x: t.x + dx, y: t.y + dy };
  if (options.snap) {
    const grid = options.grid ?? 32;
    next.x = Math.round(next.x / grid) * grid;
    next.y = Math.round(next.y / grid) * grid;
  }
  return next;
}

/** Resize an object, keeping its origin fixed. */
export function resize(t: Transform2D, dw: number, dh: number, options: TransformOptions = {}): Transform2D {
  const next = { ...t, width: Math.max(0, t.width + dw), height: Math.max(0, t.height + dh) };
  if (options.snap) {
    const grid = options.grid ?? 32;
    next.width = Math.max(grid, Math.round(next.width / grid) * grid);
    next.height = Math.max(grid, Math.round(next.height / grid) * grid);
  }
  return next;
}

export type AlignAxis = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

/** Align a set of objects along an axis (mutates a copy; returns new array). */
export function align(objects: Transform2D[], axis: AlignAxis): Transform2D[] {
  if (objects.length === 0) return [];
  const copies = objects.map((o) => ({ ...o }));
  let reference: number;
  switch (axis) {
    case 'left': reference = Math.min(...copies.map((o) => o.x)); break;
    case 'right': reference = Math.max(...copies.map((o) => o.x + o.width)); break;
    case 'centerX': reference = Math.min(...copies.map((o) => o.x + o.width / 2)); break;
    case 'top': reference = Math.min(...copies.map((o) => o.y)); break;
    case 'bottom': reference = Math.max(...copies.map((o) => o.y + o.height)); break;
    case 'centerY': reference = Math.min(...copies.map((o) => o.y + o.height / 2)); break;
  }
  for (const o of copies) {
    if (axis === 'left') o.x = reference;
    else if (axis === 'right') o.x = reference - o.width;
    else if (axis === 'centerX') o.x = reference - o.width / 2;
    else if (axis === 'top') o.y = reference;
    else if (axis === 'bottom') o.y = reference - o.height;
    else o.y = reference - o.height / 2;
  }
  return copies;
}

/** The bounding box of a set of objects. */
export function boundingBox(objects: Transform2D[]): Transform2D | null {
  if (objects.length === 0) return null;
  const minX = Math.min(...objects.map((o) => o.x));
  const minY = Math.min(...objects.map((o) => o.y));
  const maxX = Math.max(...objects.map((o) => o.x + o.width));
  const maxY = Math.max(...objects.map((o) => o.y + o.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
