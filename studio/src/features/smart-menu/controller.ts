/**
 * features/smart-menu/controller.ts — SmartHouse PC menu state + dispatch.
 *
 * Faithful port of `openSmartMenu` / `closeSmartMenu` / the `data-smart-action`
 * dispatch table from index.html. The actual UI surface (AI endpoint, wallet,
 * flipsuite, battle-cards) is invoked via injected handlers; this module owns the
 * open/close/view/index state transitions.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { HapticsPort } from '../../engine/ports';
import type { SmartAction, SmartMenuState, SmartMenuView } from './types';
import { moveIndex } from './state';

export interface SmartMenuDependencies {
  bus: EventBus;
  haptics: HapticsPort;
  /** Open a sub-panel (ai / wallet / flipsuite). */
  openPanel: (view: SmartMenuView) => void;
  /** Open the party-cards modal (closes the smart menu first). */
  openBattleCardsParty: () => void;
}

export class SmartMenuController {
  constructor(
    private readonly deps: SmartMenuDependencies,
    private readonly state: SmartMenuState,
  ) {}

  open(): void {
    this.state.open = true;
    this.state.view = 'main';
    this.state.index = 0;
  }

  close(): void {
    this.state.open = false;
    this.state.view = 'main';
  }

  back(): void {
    this.state.view = 'main';
    this.state.index = 0;
  }

  focus(delta: number): void {
    this.state.index = moveIndex(this.state.index, delta);
  }

  /** Dispatch a `data-smart-action` value (mirrors the click handler table). */
  dispatch(action: string): void {
    const act = action as SmartAction;
    if (act === 'close') {
      this.close();
      return;
    }
    if (act === 'ai' || act === 'wallet' || act === 'flipsuite') {
      this.deps.openPanel(act);
      return;
    }
    if (act === 'battle-cards') {
      this.close();
      this.deps.openBattleCardsParty();
    }
  }
}
