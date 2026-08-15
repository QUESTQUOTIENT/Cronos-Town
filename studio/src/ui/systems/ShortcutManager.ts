/**
 * ui/systems/ShortcutManager.ts — keyboard shortcut management (pure).
 *
 * A shortcut is a key combo (with optional ctrl/meta/shift/alt) bound to an
 * action id, scoped to a context (so the same key can mean different things in
 * the editor vs the command palette). The manager resolves a key event to the
 * matching action deterministically.
 *
 * Pure: no DOM. The shell feeds it normalized key events.
 */

export interface Shortcut {
  id: string;
  /** Canonical key (e.g. 'k', 'z', 'ArrowUp', 'Escape', 'Enter'). */
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Scope this shortcut applies to (e.g. 'global', 'editor', 'palette'). */
  scope: string;
}

export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export class ShortcutManager {
  private readonly shortcuts: Shortcut[] = [];
  private activeScope = 'global';

  /** Register a shortcut (replaces a same-id shortcut). */
  register(shortcut: Shortcut): void {
    const idx = this.shortcuts.findIndex((s) => s.id === shortcut.id);
    if (idx >= 0) this.shortcuts[idx] = shortcut;
    else this.shortcuts.push(shortcut);
  }

  unregister(id: string): boolean {
    const idx = this.shortcuts.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.shortcuts.splice(idx, 1);
    return true;
  }

  setScope(scope: string): void {
    this.activeScope = scope;
  }

  get scope(): string {
    return this.activeScope;
  }

  /** Normalize a key to the canonical form (single chars lowercase, else as-is). */
  static normalizeKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  /** Resolve a key event to a matching shortcut id (or null). */
  resolve(event: KeyEventLike): string | null {
    const key = ShortcutManager.normalizeKey(event.key);
    const matches = this.shortcuts.filter(
      (s) =>
        s.key === key &&
        (s.ctrl ?? false) === Boolean(event.ctrlKey) &&
        (s.meta ?? false) === Boolean(event.metaKey) &&
        (s.shift ?? false) === Boolean(event.shiftKey) &&
        (s.alt ?? false) === Boolean(event.altKey),
    );
    // Prefer a scoped shortcut over a global one; else take the first registered.
    const scoped = matches.find((s) => s.scope === this.activeScope);
    return (scoped ?? matches[0])?.id ?? null;
  }

  /** All shortcuts in a scope. */
  inScope(scope: string): Shortcut[] {
    return this.shortcuts.filter((s) => s.scope === scope);
  }

  all(): Shortcut[] {
    return [...this.shortcuts];
  }
}
