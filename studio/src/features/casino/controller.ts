/**
 * features/casino/controller.ts — use-cases (play/claim/connect).
 *
 * Faithful port of the legacy `playCasinoSlots` / `playCasinoRoulette` /
 * `playCasinoCoinflip` / `claimCasinoDemoChips` / `connectCasinoWallet` /
 * `recordCasinoResult` from index.html, using the pure domain outcomes.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort, WalletPort } from '../../engine/ports';
import { playCoinflip, playRoulette, playSlots, type RandomInt } from '../../domain/casino';
import type { CasinoState } from './types';
import { normalizeGame, pushHistory, readBet } from './state';
import type { CasinoView } from './view';

export interface CasinoDependencies {
  bus: EventBus;
  wallet: WalletPort;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  randomInt: RandomInt;
  /** Persist credits + history (mirrors `saveCasinoState`). */
  persist: (state: CasinoState) => void;
  /** Bet/pick input elements (read directly, like the legacy code). */
  betSlots: { value: string };
  betRoulette: { value: string };
  betCoinflip: { value: string };
  roulettePick: { value: string };
  coinPick: { value: string };
}

export class CasinoController {
  constructor(
    private readonly deps: CasinoDependencies,
    private readonly view: CasinoView,
    private readonly state: CasinoState,
  ) {}

  /** The legacy crypto-backed random int (mirrors `casinoRandomInt`). */
  static cryptoRandomInt(max: number): number {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  private recordResult(game: string, bet: number, payout: number, result: string): void {
    this.state.history = pushHistory(this.state.history, { game, bet, payout, result, time: Date.now() });
    this.state.credits += payout;
    this.deps.persist(this.state);
    this.view.updateWalletLine(this.state);
    this.deps.haptics.effect('place');
    this.deps.audit.record('CASINO_WAGER', `CroVegas ${game} (${result})`, payout);
  }

  playSlots(): void {
    try {
      const bet = readBet(this.deps.betSlots, this.state.credits);
      this.state.credits -= bet;
      const { reels, payout } = playSlots(this.deps.randomInt, bet);
      this.view.setReels(reels);
      this.recordResult('slots', bet, payout, reels.join(' '));
      this.view.showSlotsResult(payout, reels);
    } catch (error) {
      this.view.showError(error instanceof Error ? error.message : String(error));
    }
  }

  playRoulette(): void {
    try {
      const bet = readBet(this.deps.betRoulette, this.state.credits);
      this.state.credits -= bet;
      const pick = this.deps.roulettePick.value;
      const { number, payout } = playRoulette(this.deps.randomInt, bet, pick);
      this.recordResult('roulette', bet, payout, `${number} ${number === 0 ? 'zero' : number <= 7 ? 'red' : 'black'}`);
      this.view.showRouletteResult(number, payout);
    } catch (error) {
      this.view.showError(error instanceof Error ? error.message : String(error));
    }
  }

  playCoinflip(): void {
    try {
      const bet = readBet(this.deps.betCoinflip, this.state.credits);
      this.state.credits -= bet;
      const pick = this.deps.coinPick.value;
      const { result, payout } = playCoinflip(this.deps.randomInt, bet, pick);
      this.view.setCoinResult(result);
      this.recordResult('coinflip', bet, payout, result);
      this.view.showCoinflipResult(result, payout);
    } catch (error) {
      this.view.showError(error instanceof Error ? error.message : String(error));
    }
  }

  claimDemoChips(): void {
    this.state.credits += 1000;
    this.deps.persist(this.state);
    this.view.updateWalletLine(this.state);
    this.deps.haptics.effect('place');
    this.deps.audit.record('CLAIM_DEMO_CHIPS', 'Casino Clerk demo chips claim', +1000);
    this.view.showChipsClaimed();
  }

  async connectWallet(): Promise<void> {
    try {
      const address = await this.deps.wallet.connect();
      this.state.walletAddress = address;
      this.view.updateWalletLine(this.state);
      this.view.showWalletConnected();
    } catch (error) {
      this.view.showError(error instanceof Error ? error.message : String(error));
    }
  }

  setGame(game: string): void {
    this.state.game = normalizeGame(game);
    this.view.showGame(this.state.game);
    this.view.setGameStatus(this.state.game);
  }
}
