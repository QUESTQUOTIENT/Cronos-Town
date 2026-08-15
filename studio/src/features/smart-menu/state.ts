/**
 * features/smart-menu/state.ts — pure state + reducers.
 */
import type { SmartMenuState } from './types';
import { SMART_OPTION_COUNT } from './types';

export function initialState(): SmartMenuState {
  return { open: false, view: 'main', index: 0 };
}

/** Move the highlighted option by delta (wraps), mirrors the legacy index math. */
export function moveIndex(index: number, delta: number): number {
  return (index + delta + SMART_OPTION_COUNT) % SMART_OPTION_COUNT;
}
