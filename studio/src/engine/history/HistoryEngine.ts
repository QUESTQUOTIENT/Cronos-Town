/**
 * engine/history/HistoryEngine.ts — snapshot-based undo/redo (pure).
 *
 * Behavior-preserving generalization of the legacy World Studio history from
 * index.html (`worldStudioSnapshot` / `worldStudioRecordHistory` /
 * `worldStudioUndo` / `worldStudioRedo`). Semantics kept exactly:
 *
 *   - `record(snapshot)` pushes to the undo stack, caps it at `capacity`
 *     (legacy default 40, oldest entry shifted off), and CLEARS the redo stack.
 *   - `undo(current)` pops the undo stack; if empty returns `null`; otherwise
 *     it pushes `current` onto the redo stack and returns the popped snapshot.
 *   - `redo(current)` pops the redo stack; if empty returns `null`; otherwise
 *     it pushes `current` onto the undo stack and returns the popped snapshot.
 *
 * The editor (World Studio), the game, and the app share this one engine. Each
 * consumer supplies its own snapshot shape and a deep-clone function.
 */

export type DeepClone<T> = (value: T) => T;

/** The legacy deep-clone (mirrors `JSON.parse(JSON.stringify(...))`). */
export function jsonDeepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface UndoRedoResult<T> {
  /** The snapshot to restore, or `null` when the stack was empty. */
  restore: T | null;
}

export class HistoryEngine<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  constructor(
    private readonly capacity = 40,
    private readonly clone: DeepClone<T> = jsonDeepClone,
  ) {}

  /** Number of entries available to undo. */
  get undoDepth(): number {
    return this.undoStack.length;
  }

  /** Number of entries available to redo. */
  get redoDepth(): number {
    return this.redoStack.length;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Record a snapshot as the current state. Deep-clones it (like the legacy
   * `worldStudioSnapshot`), pushes onto the undo stack, caps at `capacity`, and
   * clears the redo stack. Mirrors `worldStudioRecordHistory`.
   */
  record(snapshot: T): void {
    this.undoStack.push(this.clone(snapshot));
    if (this.undoStack.length > this.capacity) this.undoStack.shift();
    this.redoStack = [];
  }

  /**
   * Undo: returns the previous snapshot to restore (or null if nothing to undo).
   * The caller passes the *current* snapshot so it can be pushed onto the redo
   * stack. Mirrors `worldStudioUndo`.
   */
  undo(current: T): UndoRedoResult<T> {
    const restore = this.undoStack.pop();
    if (restore === undefined) return { restore: null };
    this.redoStack.push(this.clone(current));
    return { restore };
  }

  /**
   * Redo: returns the next snapshot to restore (or null if nothing to redo).
   * Mirrors `worldStudioRedo`.
   */
  redo(current: T): UndoRedoResult<T> {
    const restore = this.redoStack.pop();
    if (restore === undefined) return { restore: null };
    this.undoStack.push(this.clone(current));
    return { restore };
  }

  /** Drop all history and redo entries. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

/** A value + timestamp, used by the timeline view of a feature's history. */
export interface HistoryEntry<T> {
  id: string;
  at: number;
  value: T;
}

/** The legacy casino-history shape (bounded ring, `slice(-25)`). */
export interface CasinoHistoryEntry {
  game: string;
  bet: number;
  payout: number;
  result: string;
  time: number;
}
