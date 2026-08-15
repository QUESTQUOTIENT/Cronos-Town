/**
 * engine/world/camera.ts — exterior camera bounds + clamping (pure).
 *
 * Behavior-preserving port of `mapBuilderExteriorCameraBounds` and the camera
 * clamping inside `updatePlayer` from index.html. This is the math that keeps
 * the 20×14 viewport centered on the player while never panning past the world
 * edges (and accounting for the `WORLD_ORIGIN_X` horizontal offset).
 */
import { VIEW_COLUMNS, VIEW_ROWS, WORLD_ORIGIN_X } from './config';
import { clampPlayerPosition, normalizeWorldBounds, type WorldBounds } from './bounds';

export interface CameraBounds {
  minCamera: number;
  maxCamera: number;
  minCameraY: number;
  maxCameraY: number;
}

export function exteriorCameraBounds(bounds: WorldBounds): CameraBounds {
  const minCamera = Math.min(0, bounds.minX + WORLD_ORIGIN_X);
  const maxCamera = Math.max(minCamera, bounds.maxX + WORLD_ORIGIN_X - VIEW_COLUMNS + 1);
  const minCameraY = Math.min(0, bounds.minY);
  const maxCameraY = Math.max(minCameraY, bounds.maxY - VIEW_ROWS + 1);
  return { minCamera, maxCamera, minCameraY, maxCameraY };
}

export interface CameraResult {
  cameraX: number;
  cameraY: number;
  /** Player position clamped inside the playable rectangle. */
  clamped: { x: number; y: number };
}

/**
 * Compute the camera + clamped player position for a given player tile position.
 * Mirrors `updatePlayer` (exterior branch) without the DOM side effects.
 */
export function updateExteriorCamera(playerX: number, playerY: number, rawBounds?: Partial<WorldBounds> | null): CameraResult {
  const bounds = normalizeWorldBounds(rawBounds);
  const cameraBounds = exteriorCameraBounds(bounds);
  const virtualPlayerX = playerX + WORLD_ORIGIN_X;
  const desiredCameraX = virtualPlayerX - Math.floor(VIEW_COLUMNS / 2);
  const desiredCameraY = playerY - (VIEW_ROWS - 4);
  const cameraX = Math.max(cameraBounds.minCamera, Math.min(cameraBounds.maxCamera, desiredCameraX));
  const cameraY = Math.max(cameraBounds.minCameraY, Math.min(cameraBounds.maxCameraY, desiredCameraY));
  const clamped = clampPlayerPosition(playerX, playerY, bounds);
  return { cameraX, cameraY, clamped };
}
