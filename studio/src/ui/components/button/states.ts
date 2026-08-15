/**
 * ui/components/button/states.ts — Button state machine (pure).
 *
 * A Button has explicit states: enabled/disabled, hovered, pressed, focused,
 * and a loading flag. The state machine owns the transitions so the view never
 * re-implements them.
 */

export interface ButtonState {
  disabled: boolean;
  loading: boolean;
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
}

export function initialState(): ButtonState {
  return { disabled: false, loading: false, hovered: false, pressed: false, focused: false };
}

export type ButtonAction =
  | { type: 'disable' }
  | { type: 'enable' }
  | { type: 'set-loading'; value: boolean }
  | { type: 'hover'; value: boolean }
  | { type: 'press'; value: boolean }
  | { type: 'focus'; value: boolean }
  | { type: 'reset' };

/** Pure reducer: apply an action to the Button state. */
export function buttonReducer(state: ButtonState, action: ButtonAction): ButtonState {
  switch (action.type) {
    case 'disable':
      return { ...state, disabled: true };
    case 'enable':
      return { ...state, disabled: false };
    case 'set-loading':
      return { ...state, loading: action.value, disabled: action.value };
    case 'hover':
      return { ...state, hovered: action.value };
    case 'press':
      return { ...state, pressed: action.value };
    case 'focus':
      return { ...state, focused: action.value };
    case 'reset':
      return initialState();
  }
}

/** True if the button can receive clicks (not disabled/loading). */
export function isClickable(state: ButtonState): boolean {
  return !state.disabled && !state.loading;
}
