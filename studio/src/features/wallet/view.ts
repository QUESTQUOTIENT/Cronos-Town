/**
 * features/wallet/view.ts — DOM projection only.
 */
import type { WalletElements, WalletState } from './types';

export class WalletView {
  constructor(private readonly elements: WalletElements) {}

  setStatus(text: string): void {
    if (this.elements.status) this.elements.status.textContent = text;
  }

  renderConnected(state: WalletState): void {
    if (!state.address) return;
    const notice = state.networkNotice ? `${state.networkNotice} ` : '';
    this.setStatus(
      `${notice}${state.address.slice(0, 6)}…${state.address.slice(-4)} · ${state.packBalance} PACK · ${state.role}`,
    );
  }
}
