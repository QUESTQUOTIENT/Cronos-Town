/**
 * engine/adapters/browser-wallet.ts
 *
 * Concrete EIP-1193 adapter. Mirrors the legacy behavior exactly:
 *  - ensureDexWallet(): require window.ethereum, request accounts, lock to chain 0x19
 *  - eth_sendTransaction with explicit gas / chainId
 *  - waitForDexReceipt(): poll same-origin /rpc then the injected wallet, 60 x 1s
 */
import type { Receipt, RpcPort, SendTransactionParams, WalletPort } from '../ports';

const CRONOS_CHAIN_ID = '0x19';

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export class BrowserWallet implements WalletPort, RpcPort {
  private address: string | null = null;

  private provider(): EthereumProvider {
    if (!window.ethereum) throw new Error('Install a Cronos-compatible wallet first.');
    return window.ethereum;
  }

  isAvailable(): boolean {
    return Boolean(window.ethereum);
  }

  getAddress(): string | null {
    return this.address;
  }

  async connect(): Promise<string> {
    const ethereum = this.provider();
    const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];
    if (!accounts?.length) throw new Error('No wallet account was selected.');

    let chainId = (await ethereum.request({ method: 'eth_chainId' })) as string;
    if (chainId.toLowerCase() !== CRONOS_CHAIN_ID) {
      try {
        await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CRONOS_CHAIN_ID }] });
        chainId = (await ethereum.request({ method: 'eth_chainId' })) as string;
      } catch {
        throw new Error('Switch your wallet to Cronos Mainnet (chain 25).');
      }
    }
    if (chainId.toLowerCase() !== CRONOS_CHAIN_ID) throw new Error('The DEX is locked to Cronos Mainnet.');

    this.address = accounts[0];
    return this.address;
  }

  async sendTransaction(params: SendTransactionParams): Promise<string> {
    const ethereum = this.provider();
    const txParams = {
      from: params.from,
      ...(params.to ? { to: params.to } : {}),
      data: params.data,
      value: params.value,
      gas: params.gas,
      chainId: params.chainId,
    };
    return (await ethereum.request({ method: 'eth_sendTransaction', params: [txParams] })) as string;
  }

  async waitForReceipt(txHash: string): Promise<Receipt | null> {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      let receipt: Receipt | null = null;
      try {
        receipt = await this.publicRpcReceipt(txHash);
      } catch {
        try {
          const ethereum = this.provider();
          receipt = (await ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          })) as Receipt | null;
        } catch {
          receipt = null;
        }
      }
      if (receipt) return receipt;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    throw new Error('Transaction confirmation timed out.');
  }

  private async publicRpcReceipt(txHash: string): Promise<Receipt | null> {
    const query = new URLSearchParams({ method: 'eth_getTransactionReceipt', params: JSON.stringify([txHash]) });
    const response = await fetch(`/rpc?${query.toString()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`RPC GET HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || 'RPC error');
    return (payload.result as Receipt | null) ?? null;
  }
}
