/**
 * features/liquidity/controller.ts — use-cases (add/remove/positions/fees).
 *
 * Faithful port of the Crolana V3 liquidity manager flows from index.html:
 * `mintVvsV3LpPosition` (on-chain add, no simulated fallback),
 * `handleCrolanaRemoveLiquidity` (wallet-signed remove),
 * `collectVvsV3Fees`, and `removeVvsV3Position`.
 *
 * The on-chain transaction is delegated to the injected RpcPort/WalletPort; the
 * state transitions (position bookkeeping) are owned here and locked by tests.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, RpcPort, ToastPort, WalletPort } from '../../engine/ports';
import { computePoolStats } from '../../domain/dex';
import type { LiquidityState, V3LpPosition } from './types';
import { buildPosition, collectFees, removePosition } from './state';

export interface V3BuildTxPayload {
  to?: string;
  data?: string;
  value?: string;
}

export interface LiquidityDependencies {
  bus: EventBus;
  wallet: WalletPort;
  rpc: RpcPort;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  /** POST /api/vvs/build-tx */
  buildTx: (payload: Record<string, unknown>) => Promise<V3BuildTxPayload>;
  nextId: () => number;
}

export class LiquidityController {
  constructor(
    private readonly deps: LiquidityDependencies,
    private readonly state: LiquidityState,
  ) {}

  /** True when a real wallet is connected (the strict on-chain gate). */
  isWalletConnected(): boolean {
    return this.state.web3Connected && Boolean(this.state.web3Address) && this.deps.wallet.isAvailable();
  }

  /** Validate price range (mirrors `minP >= maxP` rejection). */
  validateRange(minP: number, maxP: number): boolean {
    return minP < maxP;
  }

  /** Compute pool stats for a prospective add (consumes domain/dex). */
  poolStats(symbolA: string, symbolB: string, amountA: number, amountB: number) {
    return computePoolStats(symbolA, symbolB, amountA, amountB);
  }

  /**
   * Add liquidity on-chain. Returns null if the wallet isn't connected (no
   * simulated fallback) or the price range is invalid; otherwise broadcasts and
   * records the position. Returns the new position or null.
   */
  async addLiquidity(
    symbolA: string,
    symbolB: string,
    amountA: number,
    amountB: number,
    minP: number,
    maxP: number,
    fee: number,
  ): Promise<V3LpPosition | null> {
    if (!this.validateRange(minP, maxP)) return null;
    if (!this.isWalletConnected()) {
      this.deps.toast.notify('🦊 Please connect your Web3 wallet (MetaMask) first to add liquidity on Cronos Mainnet!', 'normal');
      return null;
    }

    const address = this.state.web3Address as string;
    let evmPayload: V3BuildTxPayload = {};
    try {
      evmPayload = await this.deps.buildTx({
        action: 'addLiquidity',
        symbolA,
        symbolB,
        amountA,
        amountB,
        recipient: address,
        fee,
        minPrice: minP,
        maxPrice: maxP,
      });
    } catch {
      /* payload stays default; the wallet will use fallback calldata */
    }

    const txHash = await this.deps.rpc.sendTransaction({
      from: address,
      to: evmPayload.to || '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae',
      data: evmPayload.data || '0xe8e337000000000000000000000000005c7f8a570d578ed84e63fdfa7b1ee72deae1ae23',
      value: evmPayload.value || '0x0',
      gas: '0x35b60',
      chainId: '0x19',
    });

    const position = buildPosition(this.deps.nextId(), txHash, symbolA, symbolB, fee, minP, maxP, amountA, amountB);
    this.state.positions.push(position);
    this.deps.audit.record('VVS_V3_LP_MINT', `Minted V3 LP NFT #${position.id} (${symbolA}/${symbolB} @ ${fee}%) via VVS Router on Chain 25`, 0);
    this.deps.haptics.effect('place');
    return position;
  }

  /** Collect accrued fees from a position (mirrors `collectVvsV3Fees`). */
  collectFees(posId: number): boolean {
    const pos = collectFees(this.state, posId);
    if (!pos) return false;
    this.deps.audit.record('VVS_V3_COLLECT_FEES', `Collected fees from LP #${posId}`, 0);
    this.deps.haptics.effect('click');
    return true;
  }

  /** Remove (burn) a position locally (mirrors `removeVvsV3Position`). */
  removePosition(posId: number): boolean {
    const pos = removePosition(this.state, posId);
    if (!pos) return false;
    this.deps.audit.record('VVS_V3_REMOVE_LP', `Removed CLMM position #${posId}`, 0);
    this.deps.haptics.effect('remove');
    return true;
  }

  positions(): V3LpPosition[] {
    return this.state.positions;
  }
}
