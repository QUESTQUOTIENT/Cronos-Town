/**
 * features/token-launch/index.ts
 *
 * Public surface of the feature. This is the ONLY thing other modules import.
 * It wires the controller + view + state together and exposes a clean API.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, RpcPort, ToastPort, WalletPort } from '../../engine/ports';
import { TokenLaunchController, type TokenLaunchDependencies } from './controller';
import { initialTokenLaunchState } from './state';
import type { TokenLaunchElements, TokenLaunchState } from './types';
import { TokenLaunchView } from './view';

export interface TokenLaunchFeature {
  controller: TokenLaunchController;
  state: TokenLaunchState;
  view: TokenLaunchView;
}

export interface TokenLaunchBootstrap {
  bus: EventBus;
  wallet: WalletPort;
  rpc: RpcPort;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  elements: TokenLaunchElements;
}

export function createTokenLaunchFeature(bootstrap: TokenLaunchBootstrap): TokenLaunchFeature {
  const state: TokenLaunchState = { ...initialTokenLaunchState };
  const view = new TokenLaunchView(bootstrap.elements);
  const deps: TokenLaunchDependencies = {
    bus: bootstrap.bus,
    wallet: bootstrap.wallet,
    rpc: bootstrap.rpc,
    toast: bootstrap.toast,
    audit: bootstrap.audit,
    haptics: bootstrap.haptics,
  };
  const controller = new TokenLaunchController(deps, view, state);
  return { controller, state, view };
}

export * from './types';
