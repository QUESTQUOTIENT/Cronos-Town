/**
 * features/wallet/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { ToastPort } from '../../engine/ports';
import { WalletController } from './controller';
import { initialState } from './state';
import type { WalletElements, WalletState } from './types';
import { WalletView } from './view';

export interface WalletFeature {
  controller: WalletController;
  state: WalletState;
  view: WalletView;
}

export interface WalletBootstrapEthereum {
  isAvailable(): boolean;
  requestAccounts(): Promise<string[]>;
  fallbackAddress(): string | null;
  getChainId(): Promise<string | null>;
  switchToCronos(): Promise<void>;
  callBalance(address: string, data: string): Promise<string | null>;
}

export interface WalletBootstrap {
  bus: EventBus;
  toast: ToastPort;
  elements: WalletElements;
  ethereum: WalletBootstrapEthereum;
  provider: { balanceOf(address: string): Promise<bigint> };
  publicProvider: { balanceOf(address: string): Promise<bigint> };
}

export function createWalletFeature(bootstrap: WalletBootstrap): WalletFeature {
  const state = initialState();
  const view = new WalletView(bootstrap.elements);
  const controller = new WalletController(
    {
      bus: bootstrap.bus,
      toast: bootstrap.toast,
      provider: bootstrap.provider,
      publicProvider: bootstrap.publicProvider,
      ethereum: bootstrap.ethereum,
    },
    view,
    state,
  );
  return { controller, state, view };
}

export * from './types';
