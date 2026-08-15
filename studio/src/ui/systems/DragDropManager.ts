/**
 * ui/systems/DragDropManager.ts — drag & drop state management (pure).
 *
 * Tracks a drag session: what's being dragged, over which drop target, and the
 * drop result. The DOM layer feeds pointer events; this module owns the state
 * transitions deterministically (drag start / over / drop / cancel) so docking
 * and asset dragging are testable.
 */

export interface DragPayload {
  id: string;
  kind: string;
  /** Arbitrary data carried with the drag. */
  data?: unknown;
}

export type DragPhase = 'idle' | 'dragging' | 'over' | 'dropped' | 'cancelled';

export interface DragState {
  phase: DragPhase;
  payload: DragPayload | null;
  targetId: string | null;
}

export class DragDropManager {
  private state: DragState = { phase: 'idle', payload: null, targetId: null };

  get current(): DragState {
    return { ...this.state };
  }

  /** Begin dragging a payload. */
  startDrag(payload: DragPayload): void {
    this.state = { phase: 'dragging', payload, targetId: null };
  }

  /** The pointer is over a drop target. */
  dragOver(targetId: string): void {
    if (this.state.phase !== 'dragging' && this.state.phase !== 'over') return;
    this.state = { ...this.state, phase: 'over', targetId };
  }

  /** The pointer left a drop target (no target under it). */
  dragOut(): void {
    if (this.state.phase !== 'over') return;
    this.state = { ...this.state, phase: 'dragging', targetId: null };
  }

  /** Drop onto the current target. Returns the payload + target, or null. */
  drop(): { payload: DragPayload; targetId: string } | null {
    if (this.state.phase !== 'over' || !this.state.payload || !this.state.targetId) {
      return null;
    }
    const result = { payload: this.state.payload, targetId: this.state.targetId };
    this.state = { phase: 'dropped', payload: null, targetId: null };
    return result;
  }

  /** Cancel the current drag. */
  cancel(): void {
    this.state = { phase: 'cancelled', payload: null, targetId: null };
  }

  reset(): void {
    this.state = { phase: 'idle', payload: null, targetId: null };
  }

  get isDragging(): boolean {
    return this.state.phase === 'dragging' || this.state.phase === 'over';
  }
}
