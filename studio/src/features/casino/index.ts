/**
 * features/casino/index.ts — public surface of the casino feature.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort, WalletPort } from '../../engine/ports';
import type { RandomInt } from '../../domain/casino';
import { CasinoController } from './controller';
import { initialState } from './state';
import type { CasinoElements, CasinoState } from './types';
import { CasinoView } from './view';

export interface CasinoFeature {
  controller: CasinoController;
  state: CasinoState;
  view: CasinoView;
}

export interface CasinoBootstrap {
  bus: EventBus;
  wallet: WalletPort;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  randomInt: RandomInt;
  persist: (state: CasinoState) => void;
  elements: CasinoElements;
}

export function createCasinoFeature(bootstrap: CasinoBootstrap): CasinoFeature {
  const state = initialState();
  const view = new CasinoView(bootstrap.elements);
  const controller = new CasinoController(
    {
      bus: bootstrap.bus,
      wallet: bootstrap.wallet,
      toast: bootstrap.toast,
      audit: bootstrap.audit,
      haptics: bootstrap.haptics,
      randomInt: bootstrap.randomInt,
      persist: bootstrap.persist,
      betSlots: bootstrap.elements.betSlots ?? { value: '25' },
      betRoulette: bootstrap.elements.betRoulette ?? { value: '25' },
      betCoinflip: bootstrap.elements.betCoinflip ?? { value: '25' },
      roulettePick: bootstrap.elements.roulettePick ?? { value: 'red' },
      coinPick: bootstrap.elements.coinPick ?? { value: 'heads' },
    },
    view,
    state,
  );
  return { controller, state, view };
}

export * from './types';
