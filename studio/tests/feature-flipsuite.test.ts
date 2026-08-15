import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../src/engine/ports';
import { createFlipsuiteFeature } from '../src/features/flipsuite';

function noopAudit(): AuditPort {
  return { record: () => {} };
}
function noopToast(): ToastPort {
  return { notify: () => {} };
}
function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}

const noChecks = () => ({
  wallet: () => false,
  dex: () => false,
  token: () => false,
  hodl: () => false,
  casino: () => false,
});

describe('features/flipsuite — economy flows (legacy parity)', () => {
  it('claimAirdrop awards +150 chips / +50 xp once per day', () => {
    const f = createFlipsuiteFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      currentDay: () => 'Day 1',
      questChecks: noChecks(),
      walletConnected: () => false,
      persist: () => {},
      elements: { xpReadout: null, tierReadout: null, airdropStatus: null, status: { textContent: '' } },
    });
    f.controller.claimAirdrop();
    expect(f.state.chips).toBe(150);
    expect(f.state.xp).toBe(50);
    expect(f.state.airdropClaimedDay).toBe('Day 1');

    // second claim same day is blocked
    const before = { chips: f.state.chips, xp: f.state.xp };
    f.controller.claimAirdrop();
    expect(f.state.chips).toBe(before.chips);
    expect(f.state.xp).toBe(before.xp);
  });

  it('convertXp converts at 1 XP = 2 Chips and requires min 10 XP', () => {
    const f = createFlipsuiteFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      currentDay: () => 'Day 1',
      questChecks: noChecks(),
      walletConnected: () => false,
      persist: () => {},
      elements: { xpReadout: null, tierReadout: null, airdropStatus: null, status: { textContent: '' } },
    });
    // below 10 XP is blocked
    f.controller.awardXp(5);
    f.controller.convertXp();
    expect(f.state.chips).toBe(0); // unchanged
    expect(f.state.xp).toBe(5);

    f.controller.awardXp(15); // 20 xp total
    f.controller.convertXp();
    expect(f.state.chips).toBe(40); // 20 * 2
    expect(f.state.xp).toBe(0);
  });

  it('claimQuest awards xp/chips once per quest id', () => {
    const f = createFlipsuiteFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      currentDay: () => 'Day 1',
      questChecks: { wallet: () => true },
      walletConnected: () => false,
      persist: () => {},
      elements: { xpReadout: null, tierReadout: null, airdropStatus: null, status: { textContent: '' } },
    });
    // 'wallet' quest = Citizen Sovereignty (xp 250, chips 100)
    expect(f.controller.claimQuest('wallet')).toBe(true);
    expect(f.state.xp).toBe(250);
    expect(f.state.chips).toBe(100);

    // cannot claim twice
    expect(f.controller.claimQuest('wallet')).toBe(false);
    expect(f.state.xp).toBe(250);
  });

  it('claimQuest fails when the check is not met', () => {
    const f = createFlipsuiteFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      currentDay: () => 'Day 1',
      questChecks: { wallet: () => false },
      walletConnected: () => false,
      persist: () => {},
      elements: { xpReadout: null, tierReadout: null, airdropStatus: null, status: { textContent: '' } },
    });
    expect(f.controller.claimQuest('wallet')).toBe(false);
  });

  it('totalScore includes the +500 wallet bonus; tier reflects it', () => {
    const f = createFlipsuiteFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      currentDay: () => 'Day 1',
      questChecks: noChecks(),
      walletConnected: () => true,
      persist: () => {},
      elements: { xpReadout: null, tierReadout: null, airdropStatus: null, status: { textContent: '' } },
    });
    expect(f.controller.totalScore()).toBe(500);
    expect(f.controller.tier()).toBe('CITIZEN 🏛️'); // 500 is not >500, so CITIZEN (200 < 500)
  });
});
