/**
 * features/wallet/controller.ts — use-case: connect the Cronos wallet.
 *
 * Faithful port of `connectCronosWallet` from index.html, including the
 * `selectedAddress`/`accounts[0]` fallback, chain-25 switch, PACK balance role
 * resolution (wallet eth_call, then public-RPC fallback), and status copy.
 */
import type { EventBus } from '../../engine/events/EventBus';
import { WalletEvents, type WalletConnectedEvent } from '../../engine/events/events';
import type { ToastPort } from '../../engine/ports';
import { formatPackBalance, packBalanceOfCalldata, parseRawBalance, roleForPack } from '../../domain/wallet';
import type { PackBalanceProvider, WalletState } from './types';
import type { WalletView } from './view';

const CRONOS_CHAIN_ID = '0x19';

export interface WalletDependencies {
  bus: EventBus;
  toast: ToastPort;
  /** Primary balance provider (the injected wallet's eth_call). */
  provider: PackBalanceProvider;
  /** Fallback provider (same-origin /rpc public RPC). */
  publicProvider: PackBalanceProvider;
  /** EIP-1193 access + chain switching. */
  ethereum: {
    isAvailable(): boolean;
    requestAccounts(): Promise<string[]>;
    fallbackAddress(): string | null;
    getChainId(): Promise<string | null>;
    switchToCronos(): Promise<void>;
    callBalance(address: string, data: string): Promise<string | null>;
  };
}

export class WalletController {
  constructor(
    private readonly deps: WalletDependencies,
    private readonly view: WalletView,
    private readonly state: WalletState,
  ) {}

  async connect(): Promise<string | null> {
    const { ethereum, bus, toast } = this.deps;

    if (!ethereum.isAvailable()) {
      this.view.setStatus('No compatible wallet found in this browser.');
      return null;
    }

    this.view.setStatus('Connecting wallet…');
    let accounts: string[] = [];
    try {
      accounts = await ethereum.requestAccounts();
    } catch (requestError) {
      const fallbackAddress = ethereum.fallbackAddress();
      if (fallbackAddress) {
        accounts = [fallbackAddress];
      } else {
        const message = requestError instanceof Error ? requestError.message : String(requestError);
        this.view.setStatus(`Wallet popup/RPC unavailable: ${message}. Check that the wallet is unlocked.`);
        return null;
      }
    }

    if (!accounts.length) {
      this.view.setStatus('No wallet account was selected.');
      return null;
    }

    const address = accounts[0];
    this.state.address = address;

    let chainId: string | null = null;
    let networkNotice = '';
    try {
      chainId = await ethereum.getChainId();
    } catch {
      networkNotice = 'Network could not be read from the wallet.';
    }

    if (chainId && chainId.toLowerCase() !== CRONOS_CHAIN_ID) {
      try {
        await ethereum.switchToCronos();
        chainId = await ethereum.getChainId();
      } catch {
        networkNotice = 'Please switch the wallet to Cronos Mainnet.';
      }
    }
    this.state.chainId = chainId;
    this.state.networkNotice = networkNotice;

    try {
      const rawBalance = await this.deps.provider.balanceOf(address);
      this.state.role = roleForPack(rawBalance);
      this.state.packBalance = formatPackBalance(rawBalance);
    } catch {
      try {
        const rawBalance = await this.deps.publicProvider.balanceOf(address);
        this.state.role = roleForPack(rawBalance);
        this.state.packBalance = formatPackBalance(rawBalance);
      } catch {
        this.state.packBalance = '0.00';
        this.state.role = 'Visitor';
      }
    }

    this.view.renderConnected(this.state);
    const event: WalletConnectedEvent = { address, chainId: chainId ?? CRONOS_CHAIN_ID };
    bus.emit(WalletEvents.Connected, event);
    toast.notify(`🦊 Web3 Wallet Connected (${address.slice(0, 6)}...) on Cronos Mainnet!`, 'good');
    return address;
  }

  /** Encode a balanceOf call for a given address (used by providers). */
  balanceOfCalldata(address: string): string {
    return packBalanceOfCalldata(address);
  }

  /** Parse a raw hex result into a BigInt (used by providers). */
  parseBalance(result: string | null): bigint {
    return parseRawBalance(result);
  }
}
