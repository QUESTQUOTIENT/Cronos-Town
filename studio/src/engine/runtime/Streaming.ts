/**
 * engine/runtime/Streaming.ts — world streaming (pure).
 *
 * Region-based streaming: given a camera position, compute which chunks should
 * be loaded (within a radius), which are newly needed, and which can be unloaded.
 * Consumes the world-editor chunk grid. Deterministic.
 */
import { WorldEditor, tileToChunk } from '../../features/editor/tools/world-editor';

export interface StreamState {
  loaded: Set<string>;
}

export function streamState(): StreamState {
  return { loaded: new Set() };
}

export interface StreamingResult {
  toLoad: string[];
  toUnload: string[];
  loaded: string[];
}

/**
 * Compute load/unload diffs for a camera tile position + radius (in chunks).
 * The runtime would call world.setChunk/getChunk for each toLoad/toUnload id.
 */
export function computeStreaming(
  state: StreamState,
  world: WorldEditor,
  cameraTileX: number,
  cameraTileY: number,
  radiusChunks = 2,
): StreamingResult {
  const { cx, cy } = tileToChunk(cameraTileX, cameraTileY);
  const wanted = new Set<string>();
  for (let dx = -radiusChunks; dx <= radiusChunks; dx += 1) {
    for (let dy = -radiusChunks; dy <= radiusChunks; dy += 1) {
      const x = cx + dx;
      const y = cy + dy;
      if (world.hasChunk(x, y)) wanted.add(`${x},${y}`);
    }
  }
  const toLoad = [...wanted].filter((id) => !state.loaded.has(id));
  const toUnload = [...state.loaded].filter((id) => !wanted.has(id));

  for (const id of toLoad) state.loaded.add(id);
  for (const id of toUnload) state.loaded.delete(id);

  return { toLoad, toUnload, loaded: [...state.loaded].sort() };
}
