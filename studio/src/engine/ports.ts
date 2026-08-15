/**
 * engine/ports.ts
 *
 * Ports = the interfaces a feature depends on. Features program against these,
 * never against concrete implementations. `main.ts` supplies real adapters,
 * tests supply fakes. This is the seam that keeps features isolated and testable.
 */

/** Non-blocking notification surface (maps to createToastNotification). */
export interface ToastPort {
  notify(message: string, tone: 'normal' | 'good' | 'error'): void;
}

/** Immutable economy audit ledger (maps to window.__EconomyAuditLog.record). */
export interface AuditPort {
  record(event: string, detail: string, amount: number): void;
}

/** Haptic / SFX feedback (maps to triggerHapticFeedback / worldStudioPlayEffect). */
export interface HapticsPort {
  effect(name: 'place' | 'click' | 'door' | 'remove'): void;
}

/** EIP-1193 browser wallet access (maps to window.ethereum / ensureDexWallet). */
export interface WalletPort {
  isAvailable(): boolean;
  getAddress(): string | null;
  /** Prompts for accounts and (in dev) throws if no wallet/account is selected. */
  connect(): Promise<string>;
}

export interface SendTransactionParams {
  from: string;
  /** `null` => contract creation. */
  to: string | null;
  data: string;
  value: string;
  gas: string;
  chainId: string;
}

/** Transaction broadcasting + receipt polling (maps to eth_sendTransaction + waitForDexReceipt). */
export interface RpcPort {
  sendTransaction(params: SendTransactionParams): Promise<string>;
  waitForReceipt(txHash: string): Promise<Receipt | null>;
}

export interface Receipt {
  contractAddress?: string;
}
