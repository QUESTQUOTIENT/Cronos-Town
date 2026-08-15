/**
 * features/casino/view.ts — DOM projection only (no logic).
 */
import type { CasinoElements, CasinoGame, CasinoState } from './types';
import { rouletteColor } from '../../domain/casino';

export class CasinoView {
  constructor(private readonly elements: CasinoElements) {}

  private setStatus(text: string): void {
    if (this.elements.status) this.elements.status.textContent = text;
  }

  /** Mirror `createCasinoRouletteBoard` — render the 0–14 board cells. */
  buildRouletteBoard(onPick: (value: string) => void): void {
    const board = this.elements.rouletteBoard;
    if (!board) return;
    board.replaceChildren();
    for (let number = 0; number <= 14; number += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `casino-roulette-cell${number === 0 ? '' : number <= 7 ? ' red' : ' black'}`;
      cell.textContent = String(number);
      cell.addEventListener('click', () => onPick(number === 0 ? 'zero' : number <= 7 ? 'red' : 'black'));
      board.appendChild(cell);
    }
  }

  setReels(reels: readonly string[]): void {
    this.elements.reelEls.forEach((reel, index) => {
      reel.textContent = reels[index];
    });
  }

  setCoinResult(result: 'heads' | 'tails'): void {
    if (this.elements.coinResult) {
      this.elements.coinResult.innerHTML = `<div class="casino-reel">${result === 'heads' ? 'H' : 'T'}</div>`;
    }
  }

  showGame(game: CasinoGame): void {
    this.elements.gameButtons.forEach((button) =>
      button.classList.toggle('selected', button.dataset.casinoGame === game),
    );
    if (this.elements.slotsPanel) this.elements.slotsPanel.hidden = game !== 'slots';
    if (this.elements.roulettePanel) this.elements.roulettePanel.hidden = game !== 'roulette';
    if (this.elements.coinflipPanel) this.elements.coinflipPanel.hidden = game !== 'coinflip';
  }

  setGameStatus(game: CasinoGame): void {
    this.setStatus(
      game === 'slots'
        ? 'Three matching symbols win demo chips.'
        : game === 'roulette'
          ? 'Pick red, black, or zero. The wheel uses the CroVegas 0–14 table.'
          : 'Pick heads or tails and flip for a 2× demo-chip payout.',
    );
  }

  updateWalletLine(state: CasinoState): void {
    if (!this.elements.walletLine) return;
    const credits = state.credits.toLocaleString('en-US');
    const wallet = state.walletAddress ? `WALLET ${state.walletAddress.slice(0, 6)}…${state.walletAddress.slice(-4)}` : 'NO WALLET CONNECTED';
    this.elements.walletLine.innerHTML = `<strong>DEMO CHIPS:</strong> ${credits} · ${wallet}`;
  }

  /** Render the win/loss message for a game (mirrors the legacy status lines). */
  showSlotsResult(payout: number, reels: readonly string[]): void {
    this.setStatus(
      payout
        ? `WIN! ${reels.join(' ')} paid ${payout} demo chips.`
        : `No match this time: ${reels.join(' ')}. Try another cabinet.`,
    );
  }

  showRouletteResult(number: number, payout: number): void {
    const color = rouletteColor(number);
    this.setStatus(
      payout
        ? `The wheel landed on ${number} ${color}. You won ${payout} demo chips!`
        : `The wheel landed on ${number} ${color}. No win this spin.`,
    );
  }

  showCoinflipResult(result: 'heads' | 'tails', payout: number): void {
    this.setStatus(
      payout
        ? `${result.toUpperCase()}! You won ${payout} demo chips.`
        : `${result.toUpperCase()} this time. Better luck on the next flip.`,
    );
  }

  showError(message: string): void {
    this.setStatus(message);
  }

  showChipsClaimed(): void {
    this.setStatus('The casino clerk added 1,000 demo chips. No real CRO was spent.');
  }

  showWalletConnected(): void {
    this.setStatus('Cronos wallet connected. The cabinets remain in safe demo mode.');
  }
}
