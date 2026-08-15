/**
 * features/token-launch/view.ts
 *
 * Renders state into the DOM and reads form values. No logic lives here — it
 * only projects state and reports user intents back to the controller.
 */
import type { TokenLaunchElements, TokenLaunchForm, TokenLaunchState } from './types';

const DEFAULT_OUTPUT = 'Choose your token details, then prepare a Cronos launch plan.';

export class TokenLaunchView {
  private readonly elements: TokenLaunchElements;

  constructor(elements: TokenLaunchElements) {
    this.elements = elements;
  }

  readForm(): TokenLaunchForm {
    return {
      name: this.elements.name?.value.trim() || 'Wolf Street Token',
      symbol: this.elements.symbol?.value.trim().toUpperCase() || 'WOLF',
      supply: Number(this.elements.supply?.value || 1000000),
      tax: Number(this.elements.tax?.value || 0),
    };
  }

  setStatus(text: string): void {
    if (this.elements.status) this.elements.status.textContent = text;
  }

  setStatusHtml(html: string): void {
    if (this.elements.status) this.elements.status.innerHTML = html;
  }

  setOutput(text: string): void {
    if (this.elements.output) this.elements.output.textContent = text;
  }

  setDeployDisabled(disabled: boolean): void {
    if (this.elements.deployButton) this.elements.deployButton.disabled = disabled;
  }

  render(state: TokenLaunchState): void {
    this.setDeployDisabled(state.status === 'signing' || state.status === 'building' || state.status === 'pending');
  }

  resetToDefaultOutput(): void {
    this.setOutput(DEFAULT_OUTPUT);
  }
}
