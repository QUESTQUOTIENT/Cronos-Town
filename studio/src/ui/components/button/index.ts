/**
 * ui/components/button/index.ts — the Button component (atomic ownership barrel).
 *
 * The reference implementation of the atomic component pattern: one folder owns
 * tokens, states, controller, and (in the DOM adapter) its view. Other components
 * follow the same shape.
 */
export { resolveButtonTokens, BUTTON_TONES, type ButtonTokens } from './tokens';
export { buttonReducer, initialState, isClickable, type ButtonState, type ButtonAction } from './states';
export { ButtonController } from './controller';
