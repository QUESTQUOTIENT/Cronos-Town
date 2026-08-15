import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { HapticsPort } from '../src/engine/ports';
import { createSmartMenuFeature } from '../src/features/smart-menu';

function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}

describe('features/smart-menu — state transitions + dispatch (legacy parity)', () => {
  it('opens to the main view with index 0', () => {
    const f = createSmartMenuFeature({
      bus: new EventBus(), haptics: noopHaptics(),
      openPanel: () => {}, openBattleCardsParty: () => {},
    });
    f.controller.open();
    expect(f.state.open).toBe(true);
    expect(f.state.view).toBe('main');
    expect(f.state.index).toBe(0);
  });

  it('close resets to main', () => {
    const f = createSmartMenuFeature({
      bus: new EventBus(), haptics: noopHaptics(),
      openPanel: () => {}, openBattleCardsParty: () => {},
    });
    f.controller.open();
    f.controller.close();
    expect(f.state.open).toBe(false);
    expect(f.state.view).toBe('main');
  });

  it('dispatch routes ai/wallet/flipsuite to openPanel', () => {
    const calls: string[] = [];
    const f = createSmartMenuFeature({
      bus: new EventBus(), haptics: noopHaptics(),
      openPanel: (v) => calls.push(v), openBattleCardsParty: () => {},
    });
    f.controller.dispatch('ai');
    f.controller.dispatch('wallet');
    f.controller.dispatch('flipsuite');
    expect(calls).toEqual(['ai', 'wallet', 'flipsuite']);
  });

  it('dispatch "battle-cards" closes the menu then opens the party modal', () => {
    const order: string[] = [];
    const f = createSmartMenuFeature({
      bus: new EventBus(), haptics: noopHaptics(),
      openPanel: () => {}, openBattleCardsParty: () => order.push('party'),
    });
    f.controller.open();
    f.controller.dispatch('battle-cards');
    expect(f.state.open).toBe(false);
    expect(order).toEqual(['party']);
  });

  it('dispatch "close" closes the menu', () => {
    const f = createSmartMenuFeature({
      bus: new EventBus(), haptics: noopHaptics(),
      openPanel: () => {}, openBattleCardsParty: () => {},
    });
    f.controller.open();
    f.controller.dispatch('close');
    expect(f.state.open).toBe(false);
  });

  it('focus wraps around the 5 options', () => {
    const f = createSmartMenuFeature({
      bus: new EventBus(), haptics: noopHaptics(),
      openPanel: () => {}, openBattleCardsParty: () => {},
    });
    f.controller.open();
    expect(f.state.index).toBe(0);
    f.controller.focus(1);
    expect(f.state.index).toBe(1);
    f.controller.focus(-2);
    expect(f.state.index).toBe(4); // 1 - 2 = -1 -> wraps to 4
    f.controller.focus(1);
    expect(f.state.index).toBe(0); // 4 + 1 -> wraps to 0
  });
});
