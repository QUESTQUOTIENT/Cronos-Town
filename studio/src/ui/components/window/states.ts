/**
 * ui/components/window/states.ts — Window component state machine.
 *
 * A dockable Window has a minimization/maximization state, a focus state, and a
 * docking state (docked vs floating/detached). The state machine owns the legal
 * transitions (a floating window can dock; a maximized window can restore; etc.).
 */

export interface WindowComponentState {
  minimized: boolean;
  maximized: boolean;
  focused: boolean;
  floating: boolean;
  visible: boolean;
}

export function windowState(): WindowComponentState {
  return { minimized: false, maximized: false, focused: false, floating: false, visible: true };
}

export type WindowAction =
  | { type: 'focus'; value: boolean }
  | { type: 'minimize' }
  | { type: 'restore' }
  | { type: 'maximize' }
  | { type: 'toggle-floating'; value: boolean }
  | { type: 'close' }
  | { type: 'open' };

export function windowReducer(state: WindowComponentState, action: WindowAction): WindowComponentState {
  switch (action.type) {
    case 'focus':
      return { ...state, focused: action.value };
    case 'minimize':
      return { ...state, minimized: true, maximized: false, focused: false };
    case 'restore':
      return { ...state, minimized: false, maximized: false, focused: true };
    case 'maximize':
      return { ...state, maximized: true, minimized: false };
    case 'toggle-floating':
      return { ...state, floating: action.value };
    case 'close':
      return { ...state, visible: false, focused: false };
    case 'open':
      return { ...state, visible: true, focused: true, minimized: false };
  }
}

/** Whether a window can be interacted with (visible + not minimized). */
export function isInteractive(state: WindowComponentState): boolean {
  return state.visible && !state.minimized;
}
