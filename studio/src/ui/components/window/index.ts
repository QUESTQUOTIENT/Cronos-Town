/**
 * ui/components/window/index.ts — the Window component (atomic).
 */
import { isInteractive, windowReducer, windowState, type WindowAction, type WindowComponentState } from './states';

export { isInteractive, windowReducer, windowState };
export type { WindowAction, WindowComponentState };

export class WindowController {
  private state = windowState();

  get snapshot(): WindowComponentState {
    return { ...this.state };
  }

  dispatch(action: WindowAction): void {
    this.state = windowReducer(this.state, action);
  }

  get interactive(): boolean {
    return isInteractive(this.state);
  }
}
