import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort, WalletPort } from '../src/engine/ports';
import { createCasinoFeature, type CasinoElements } from '../src/features/casino';

function noopAudit(): AuditPort {
  return { record: () => {} };
}
function noopToast(): ToastPort {
  return { notify: () => {} };
}
function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}
function noopWallet(): WalletPort {
  return {
    isAvailable: () => false,
    getAddress: () => null,
    connect: async () => {
      throw new Error('no wallet');
    },
  };
}

function makeElements(overrides: Partial<CasinoElements> = {}): CasinoElements {
  const mkEl = () => {
    const el: Record<string, unknown> = { textContent: '', innerHTML: '', hidden: false };
    return {
      textContent: '',
      innerHTML: '',
      hidden: false,
      dataset: {},
      classList: { toggle: () => {} },
      replaceChildren: () => {},
      appendChild: () => {},
      addEventListener: () => {},
      set type(_v: string) {
        /* noop */
      },
      value: '',
    } as unknown as HTMLElement;
  };
  return {
    gameButtons: [],
    slotsPanel: mkEl(),
    roulettePanel: mkEl(),
    coinflipPanel: mkEl(),
    status: mkEl(),
    walletLine: mkEl(),
    reelEls: [mkEl(), mkEl(), mkEl()],
    betSlots: { value: '25' } as unknown as HTMLInputElement,
    betRoulette: { value: '25' } as unknown as HTMLInputElement,
    betCoinflip: { value: '25' } as unknown as HTMLInputElement,
    roulettePick: { value: 'red' } as unknown as HTMLSelectElement,
    coinPick: { value: 'heads' } as unknown as HTMLSelectElement,
    rouletteBoard: mkEl(),
    coinResult: mkEl(),
    ...overrides,
  };
}

const predictableRandom = (values: number[]) => (max: number) => (values.shift() ?? 0) % max;

describe('features/casino — full play flows (legacy parity)', () => {
  it('slots: triple 7️⃣ pays 20× and updates credits/history/audit', () => {
    const auditCalls: Array<[string, string, number]> = [];
    const audit: AuditPort = { record: (t, d, a) => auditCalls.push([t, d, a]) };
    let persisted: { credits: number } | null = null;

    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit,
      haptics: noopHaptics(),
      randomInt: predictableRandom([4, 4, 4]),
      persist: (s) => {
        persisted = { credits: s.credits };
      },
      elements: makeElements(),
    });

    expect(feature.state.credits).toBe(1000);
    feature.controller.playSlots();

    // 1000 - 25 bet + 25*20 payout = 1475
    expect(feature.state.credits).toBe(1475);
    expect(feature.state.history).toHaveLength(1);
    expect(feature.state.history[0].payout).toBe(500);
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0][2]).toBe(500);
    expect(persisted?.credits).toBe(1475);
  });

  it('slots: no match pays 0 and deducts only the bet', () => {
    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([0, 1, 2]),
      persist: () => {},
      elements: makeElements(),
    });
    feature.controller.playSlots();
    expect(feature.state.credits).toBe(975); // 1000 - 25
  });

  it('roulette: zero hit pays 14×', () => {
    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([0]), // number 0
      persist: () => {},
      elements: makeElements({ roulettePick: { value: 'zero' } as unknown as HTMLSelectElement }),
    });
    feature.controller.playRoulette();
    // 1000 - 25 + 25*14 = 1325
    expect(feature.state.credits).toBe(1325);
  });

  it('roulette: red miss pays 0', () => {
    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([12]), // black
      persist: () => {},
      elements: makeElements({ roulettePick: { value: 'red' } as unknown as HTMLSelectElement }),
    });
    feature.controller.playRoulette();
    expect(feature.state.credits).toBe(975);
  });

  it('coinflip: win pays 2×, loss pays 0', () => {
    const win = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([0]), // heads
      persist: () => {},
      elements: makeElements({ coinPick: { value: 'heads' } as unknown as HTMLSelectElement }),
    });
    win.controller.playCoinflip();
    expect(win.state.credits).toBe(1025); // 1000 - 25 + 50

    const lose = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([1]), // tails
      persist: () => {},
      elements: makeElements({ coinPick: { value: 'heads' } as unknown as HTMLSelectElement }),
    });
    lose.controller.playCoinflip();
    expect(lose.state.credits).toBe(975);
  });

  it('bet validation: over-balance throws and is surfaced without changing credits', () => {
    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([0]),
      persist: () => {},
      elements: makeElements({ betSlots: { value: '5000' } as unknown as HTMLInputElement }),
    });
    feature.controller.playSlots();
    expect(feature.state.credits).toBe(1000); // unchanged
    expect(feature.state.history).toHaveLength(0);
  });

  it('claimDemoChips adds exactly 1000', () => {
    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom([]),
      persist: () => {},
      elements: makeElements(),
    });
    feature.controller.claimDemoChips();
    expect(feature.state.credits).toBe(2000);
  });

  it('history caps at 25 entries', () => {
    const feature = createCasinoFeature({
      bus: new EventBus(),
      wallet: noopWallet(),
      toast: noopToast(),
      audit: noopAudit(),
      haptics: noopHaptics(),
      randomInt: predictableRandom(Array(30).fill(0)),
      persist: () => {},
      elements: makeElements({ coinPick: { value: 'heads' } as unknown as HTMLSelectElement }),
    });
    for (let i = 0; i < 30; i += 1) feature.controller.playCoinflip();
    expect(feature.state.history).toHaveLength(25);
  });
});
