/**
 * features/liquidity/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, RpcPort, ToastPort, WalletPort } from '../../engine/ports';
import { LiquidityController, type V3BuildTxPayload } from './controller';
import { initialState } from './state';
import type { LiquidityState } from './types';

export interface LiquidityFeature {
  controller: LiquidityController;
  state: LiquidityState;
}

export interface LiquidityBootstrap {
  bus: EventBus;
  wallet: WalletPort;
  rpc: RpcPort;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  buildTx: (payload: Record<string, unknown>) => Promise<V3BuildTxPayload>;
  nextId: () => number;
}

export function createLiquidityFeature(bootstrap: LiquidityBootstrap): LiquidityFeature {
  const state = initialState();
  const controller = new LiquidityController(
    {
      bus: bootstrap.bus,
      wallet: bootstrap.wallet,
      rpc: bootstrap.rpc,
      toast: bootstrap.toast,
      audit: bootstrap.audit,
      haptics: bootstrap.haptics,
      buildTx: bootstrap.buildTx,
      nextId: bootstrap.nextId,
    },
    state,
  );
  return { controller, state };
}

export * from './types';
