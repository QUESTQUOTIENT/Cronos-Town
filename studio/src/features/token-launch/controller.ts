/**
 * features/token-launch/controller.ts
 *
 * The use-cases (prepare / connect / deploy). This is a faithful port of the
 * legacy `prepareTokenLaunch`, `connectTokenLaunchWallet`, and
 * `deployTokenLaunch` — identical copy, identical control flow, identical
 * on-chain confirmation guarantees (no fake tx hashes, success only after the
 * deployed contract address is read from the receipt).
 */
import type { EventBus } from '../../engine/events/EventBus';
import {
  TokenLaunchEvents,
  type TokenDeployedEvent,
  type TokenDeployFailedEvent,
  type TokenPlanPreparedEvent,
} from '../../engine/events/events';
import type { AuditPort, HapticsPort, RpcPort, ToastPort, WalletPort } from '../../engine/ports';
import type { TokenDeployBuild, TokenLaunchState } from './types';
import { readForm } from './state';
import type { TokenLaunchView } from './view';

const CRONOS_CHAIN_ID = '0x19';

export interface TokenLaunchDependencies {
  bus: EventBus;
  wallet: WalletPort;
  rpc: RpcPort;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
}

export class TokenLaunchController {
  private readonly deps: TokenLaunchDependencies;
  private readonly view: TokenLaunchView;
  private readonly state: TokenLaunchState;

  constructor(deps: TokenLaunchDependencies, view: TokenLaunchView, state: TokenLaunchState) {
    this.deps = deps;
    this.view = view;
    this.state = state;
  }

  prepare(): void {
    const { name, symbol, supply } = readForm(this.state);
    this.state.form = { ...this.state.form, name, symbol, supply };
    this.view.setOutput(
      `CRONOS TOKEN LAUNCH PLAN\n\n` +
        `Name: ${name}\nSymbol: ${symbol}\nInitial supply: ${supply}\nDecimals: 18\n` +
        `Network: Cronos Mainnet (chain 25)\n\nNEXT STEPS\n` +
        `1. Review the token name, symbol, and supply.\n` +
        `2. Deploy only an audited token factory or verified contract.\n` +
        `3. Test transfers and ownership before a public launch.\n` +
        `4. Publish the contract address and token risks clearly.\n` +
        `5. Never promise profit to the community.`,
    );
    this.view.setStatus(
      'Launch plan prepared locally. Connect your wallet and press 🚀 DEPLOY TO CRONOS MAINNET to deploy your ERC-20 token on-chain.',
    );
    const event: TokenPlanPreparedEvent = { name, symbol, supply, tax: this.state.form.tax };
    this.deps.bus.emit(TokenLaunchEvents.PlanPrepared, event);
  }

  async connectWallet(): Promise<void> {
    this.state.status = 'connecting';
    this.view.render(this.state);
    try {
      const address = await this.deps.wallet.connect();
      this.state.walletAddress = address;
      this.state.status = 'idle';
      this.view.setStatus(
        `Cronos wallet connected: ${address.slice(0, 6)}…${address.slice(-4)}. You can now deploy your ERC-20 token on-chain.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.status = 'idle';
      this.state.lastError = message;
      this.view.setStatus(`Wallet connection failed: ${message}`);
    } finally {
      this.view.render(this.state);
    }
  }

  async deploy(): Promise<void> {
    const { wallet, rpc, toast, audit, haptics, bus } = this.deps;

    if (!wallet.isAvailable() || !this.state.walletAddress) {
      this.view.setStatus('❌ Connect your Cronos wallet first before deploying a token.');
      toast.notify('🦊 Connect your Web3 wallet (MetaMask) first to deploy a token on Cronos Mainnet!', 'normal');
      try {
        await this.connectWallet();
      } catch {
        /* handled in connectWallet */
      }
      if (!wallet.isAvailable() || !this.state.walletAddress) return;
    }

    const { name, symbol, supply, tax } = readForm(this.state);

    if (!name || !symbol || !Number.isFinite(supply) || supply < 1) {
      this.view.setStatus('❌ Please fill in a valid token name, symbol, and initial supply.');
      return;
    }
    if (symbol.length > 10 || !/^[A-Z0-9]+$/.test(symbol)) {
      this.view.setStatus('❌ Symbol must be 1-10 uppercase letters/numbers.');
      return;
    }

    this.state.status = 'building';
    this.view.render(this.state);
    this.view.setStatus('⏳ Building ERC-20 deployment transaction via Token Foundry OS…');

    let deployPayload: TokenDeployBuild;
    try {
      const res = await fetch('/api/token-launch/build-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, symbol, supply, tax, owner: this.state.walletAddress }),
      });
      deployPayload = (await res.json()) as TokenDeployBuild;
      if (!res.ok || !deployPayload?.success) {
        throw new Error(deployPayload?.error || `Token Foundry HTTP ${res.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.status = 'failed';
      this.state.lastError = message;
      this.view.render(this.state);
      this.view.setStatus(`❌ Token Foundry error: ${message}`);
      return;
    }

    let txHash: string;
    try {
      this.state.status = 'signing';
      this.view.render(this.state);
      this.view.setStatus('🔄 CONFIRMING DEPLOYMENT… Please sign the ERC-20 deployment in your Web3 wallet.');
      toast.notify('🚀 Please confirm ERC-20 deployment in Web3 Wallet…', 'normal');

      txHash = await rpc.sendTransaction({
        from: this.state.walletAddress as string,
        to: null,
        data: deployPayload.data,
        value: deployPayload.value || '0x0',
        gas: deployPayload.gas || '0x3d0900',
        chainId: CRONOS_CHAIN_ID,
      });

      if (!txHash) throw new Error('No transaction hash returned by wallet.');

      this.state.status = 'pending';
      this.view.render(this.state);
      this.view.setStatusHtml(
        `⏳ <strong style="color:#79f2c0;">PENDING ON CRONOS MAINNET…</strong> TX: ` +
          `<a href="https://cronoscan.com/tx/${txHash}" target="_blank" style="color:#f3d575; text-decoration:underline;">` +
          `${txHash.slice(0, 10)}…${txHash.slice(-6)}</a>`,
      );
      toast.notify(`⚡ Real-World ERC-20 deployment broadcast! TX: ${txHash.slice(0, 8)}…`, 'good');
      bus.emit(TokenLaunchEvents.DeployPending, { txHash, symbol });

      const receipt = await rpc.waitForReceipt(txHash).catch(() => null);
      if (!receipt || !receipt.contractAddress) {
        this.state.status = 'failed';
        this.view.setStatus(
          '⚠️ Deployment broadcast but the deployed contract address is not confirmed yet. Check Cronoscan for the receipt.',
        );
        return;
      }

      const contractAddress = receipt.contractAddress;
      this.state.status = 'confirmed';
      this.state.deployed = { name, symbol, contractAddress, txHash };
      this.view.render(this.state);

      this.view.setOutput(
        `✅ TOKEN DEPLOYED ON CRONOS MAINNET (CHAIN 25)\n\n` +
          `Name: ${deployPayload.tokenName || name}\n` +
          `Symbol: ${deployPayload.symbol || symbol}\n` +
          `Decimals: ${deployPayload.decimals || 18}\n` +
          `Initial supply: ${supply}\n` +
          `Transfer tax: ${tax}%\n` +
          `Contract: ${contractAddress}\n` +
          `TX: ${txHash}`,
      );
      this.view.setStatusHtml(
        `🚀 <strong style="color:#79f2c0;">TOKEN DEPLOYED ON CRONOS MAINNET!</strong> ` +
          `<a href="https://cronoscan.com/address/${contractAddress}" target="_blank" style="color:#f3d575; text-decoration:underline;">` +
          `${contractAddress.slice(0, 10)}…${contractAddress.slice(-6)}</a>`,
      );
      toast.notify(`🚀 ${deployPayload.symbol || symbol} deployed at ${contractAddress.slice(0, 8)}…`, 'good');
      audit.record(
        'TOKEN_LAUNCH_DEPLOY',
        `Deployed ${deployPayload.symbol || symbol} (${name}) at ${contractAddress} — TX ${txHash}`,
        0,
      );
      haptics.effect('place');

      const event: TokenDeployedEvent = { name, symbol, contractAddress, txHash };
      bus.emit(TokenLaunchEvents.DeployConfirmed, event);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as { code?: number }).code;
      if (code === 4001 || message.includes('reject') || message.includes('denied')) {
        this.state.status = 'rejected';
        this.view.setStatus('❌ Cancelled — Deployment rejected in wallet.');
        toast.notify('❌ Deployment rejected in wallet.', 'error');
      } else if (message.includes('eth_getBlockByNumber') || message.includes('RPC') || message.includes('HTTP client error')) {
        this.state.status = 'failed';
        this.state.lastError = message;
        this.view.setStatusHtml(
          `⚠️ <strong style="color:#f3d575;">METAMASK CRONOS RPC ERROR:</strong> Your wallet's Cronos RPC is failing. ` +
            `Please click 🛠️ REPAIR RPC to fix!`,
        );
        toast.notify('⚠️ MetaMask RPC error! Opening repair guide…', 'error');
      } else {
        this.state.status = 'failed';
        this.state.lastError = message;
        this.view.setStatus(`❌ Deployment error: ${message}`);
        toast.notify(`❌ Deployment error: ${message}`, 'error');
      }
      const failedEvent: TokenDeployFailedEvent = { error: message };
      bus.emit(TokenLaunchEvents.DeployFailed, failedEvent);
    } finally {
      this.view.render(this.state);
    }
  }
}
