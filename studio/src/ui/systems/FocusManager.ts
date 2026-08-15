/**
 * ui/systems/FocusManager.ts — keyboard focus management (pure state).
 *
 * Tracks which UI element has focus, supports a focus stack (for modal/panel
 * push-pop), and exposes the current focus target + history. The DOM layer
 * wires real focus events; this module owns the focus *model* so panels can
 * restore focus deterministically.
 */

export interface FocusableTarget {
  id: string;
  /** The panel/workspace that owns the target. */
  scope: string;
}

export class FocusManager {
  private current: FocusableTarget | null = null;
  private readonly stack: FocusableTarget[] = [];
  private readonly history: FocusableTarget[] = [];

  /** Set focus to a target, pushing the previous one onto the history. */
  focus(target: FocusableTarget): void {
    if (this.current && this.current.id !== target.id) {
      this.history.push(this.current);
      if (this.history.length > 100) this.history.shift();
    }
    this.current = target;
  }

  /** Push a focus scope (e.g. open a modal) — remembers where focus was. */
  push(target: FocusableTarget): void {
    this.stack.push(target);
    this.focus(target);
  }

  /** Pop a focus scope — returns to the previous focus target. */
  pop(): FocusableTarget | null {
    const popped = this.stack.pop();
    if (!popped) return null;
    const previous = this.stack[this.stack.length - 1] ?? this.history[this.history.length - 1] ?? null;
    this.current = previous;
    return previous;
  }

  /** The currently focused target (or null). */
  get focused(): FocusableTarget | null {
    return this.current;
  }

  /** Whether a given target is focused. */
  isFocused(id: string): boolean {
    return this.current?.id === id;
  }

  /** Recent focus history (oldest → newest). */
  focusHistory(): FocusableTarget[] {
    return [...this.history];
  }

  clear(): void {
    this.current = null;
    this.stack.length = 0;
    this.history.length = 0;
  }
}
