/**
 * features/editor/tools/world-editor.ts — world editor (chunk/region model, pure).
 *
 * Manages the world as a grid of chunks (16×16 tiles) so large worlds can be
 * edited regionally. Tracks which chunks exist, their bounds, and which are
 * "dirty" (need re-serialization). This is the world editor's data model; the
 * streaming runtime consumes the same chunk grid.
 */

export const CHUNK_SIZE = 16;

export interface Chunk {
  id: string;
  x: number;
  y: number;
  /** Serialized chunk data (opaque to this module). */
  data: unknown;
  dirty: boolean;
}

export interface WorldModel {
  chunks: Map<string, Chunk>;
}

export function chunkId(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function tileToChunk(tx: number, ty: number): { cx: number; cy: number } {
  return { cx: Math.floor(tx / CHUNK_SIZE), cy: Math.floor(ty / CHUNK_SIZE) };
}

export class WorldEditor {
  private readonly chunks = new Map<string, Chunk>();

  /** Add (or overwrite) a chunk. */
  setChunk(cx: number, cy: number, data: unknown): Chunk {
    const chunk: Chunk = { id: chunkId(cx, cy), x: cx, y: cy, data, dirty: true };
    this.chunks.set(chunk.id, chunk);
    return chunk;
  }

  getChunk(cx: number, cy: number): Chunk | undefined {
    return this.chunks.get(chunkId(cx, cy));
  }

  hasChunk(cx: number, cy: number): boolean {
    return this.chunks.has(chunkId(cx, cy));
  }

  markClean(cx: number, cy: number): void {
    const chunk = this.getChunk(cx, cy);
    if (chunk) chunk.dirty = false;
  }

  dirtyChunks(): Chunk[] {
    return [...this.chunks.values()].filter((c) => c.dirty);
  }

  list(): Chunk[] {
    return [...this.chunks.values()];
  }

  /** The chunk containing a tile coordinate. */
  chunkForTile(tx: number, ty: number): Chunk | undefined {
    const { cx, cy } = tileToChunk(tx, ty);
    return this.getChunk(cx, cy);
  }

  /** The set of chunks overlapping a tile rectangle. */
  chunksInRect(tx: number, ty: number, w: number, h: number): Chunk[] {
    const min = tileToChunk(tx, ty);
    const max = tileToChunk(tx + w - 1, ty + h - 1);
    const out: Chunk[] = [];
    for (let cx = min.cx; cx <= max.cx; cx += 1) {
      for (let cy = min.cy; cy <= max.cy; cy += 1) {
        const c = this.getChunk(cx, cy);
        if (c) out.push(c);
      }
    }
    return out;
  }
}
