/**
 * features/editor/shared/clipboard.ts — editor clipboard (pure).
 *
 * Copy/paste of editor objects with serialization. Objects are tagged by type so
 * paste can be scoped (copy an entity → paste an entity; copy a tile → paste a
 * tile). Supports deep-copy isolation (pasted objects get fresh ids).
 */

export interface ClipboardItem<T = unknown> {
  type: string;
  data: T;
}

export class Clipboard {
  private item: ClipboardItem | null = null;

  /** Copy an item (replaces any existing clipboard content). */
  copy(type: string, data: unknown): void {
    this.item = { type, data: JSON.parse(JSON.stringify(data)) };
  }

  /** Paste if the clipboard type matches the expected type. */
  paste<T>(expectedType: string): T | null {
    if (!this.item || this.item.type !== expectedType) return null;
    return JSON.parse(JSON.stringify(this.item.data)) as T;
  }

  /** Peek the current clipboard type (or null). */
  get type(): string | null {
    return this.item?.type ?? null;
  }

  /** Whether the clipboard holds a given type. */
  hasType(type: string): boolean {
    return this.item?.type === type;
  }

  clear(): void {
    this.item = null;
  }
}
