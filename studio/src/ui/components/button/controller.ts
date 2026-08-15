/**
 * ui/components/button/controller.ts — Button controller.
 *
 * Owns the Button's state transitions + click gating. The view renders state;
 * the controller applies actions and decides whether a click should fire.
 */
import { buttonReducer, initialState, isClickable, type ButtonState } from './states';

export class ButtonController {
  private state: ButtonState = initialState();
  private clickHandler: (() => void) | null = null;

  get snapshot(): ButtonState {
    return { ...this.state };
  }

  dispatch(action: Parameters<typeof buttonReducer>[1]): void {
    this.state = buttonReducer(this.state, action);
  }

  /** Bind the click handler (the controller gates it on isClickable). */
  onClick(handler: () => void): void {
    this.clickHandler = handler;
  }

  /** Attempt a click: fires only if the button is clickable. */
  tryClick(): boolean {
    if (!isClickable(this.state)) return false;
    this.clickHandler?.();
    return true;
  }

  setLoading(loading: boolean): void {
    this.dispatch({ type: 'set-loading', value: loading });
  }

  setDisabled(disabled: boolean): void {
    this.dispatch(disabled ? { type: 'disable' } : { type: 'enable' });
  }
}
