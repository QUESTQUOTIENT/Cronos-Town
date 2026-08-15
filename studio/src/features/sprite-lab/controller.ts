/**
 * features/sprite-lab/controller.ts — use-cases (apply/reset/save/select).
 *
 * Faithful port of the legacy Sprite Lab flows from index.html. DOM application
 * (`applyCustomizerStyles`) is delegated to an injected handler; this module owns
 * the draft state (image/sheet/target) and the pure transitions.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { HapticsPort, ToastPort } from '../../engine/ports';
import type { CustomizerTarget } from './presets';
import { clampSheetDimension, CUSTOMIZER_TARGETS, DEFAULT_SHEET, normalizeTarget } from './presets';

export interface SpriteSheet {
  columns: number;
  rows: number;
}

export interface SpriteDraft {
  image: string;
  sheet: SpriteSheet;
}

export interface SpriteLabState {
  open: boolean;
  target: CustomizerTarget;
  draftImage: string;
  draftSheet: SpriteSheet;
  playerDirection: 'up' | 'down' | 'left' | 'right';
  playerFrame: number;
  sprites: Record<string, SpriteDraft>;
}

export interface SpriteLabDependencies {
  bus: EventBus;
  toast: ToastPort;
  haptics: HapticsPort;
  /** Apply the sprite registry to the DOM (mirrors applyCustomizerStyles). */
  applyStyles: (sprites: Record<string, SpriteDraft>) => void;
  /** Persist the sprite registry (mirrors saveCustomizerSprites). */
  persist: (sprites: Record<string, SpriteDraft>) => void;
}

export function initialState(): SpriteLabState {
  return {
    open: false,
    target: 'grass',
    draftImage: '',
    draftSheet: { ...DEFAULT_SHEET },
    playerDirection: 'down',
    playerFrame: 0,
    sprites: {},
  };
}

export class SpriteLabController {
  constructor(
    private readonly deps: SpriteLabDependencies,
    private readonly state: SpriteLabState,
  ) {}

  setTarget(target: string): void {
    this.state.target = normalizeTarget(target);
  }

  /** Whether the target is a sprite sheet (character/npc). */
  targetIsSheet(): boolean {
    return Boolean(CUSTOMIZER_TARGETS[this.state.target].spriteSheet);
  }

  /** Set the draft image (from a preset value or an uploaded data-URI). */
  setDraftImage(image: string, columns: number, rows: number): void {
    this.state.draftImage = image;
    this.state.draftSheet = { columns: clampSheetDimension(columns), rows: clampSheetDimension(rows) };
  }

  clearDraft(): void {
    this.state.draftImage = '';
    this.state.draftSheet = { ...DEFAULT_SHEET };
  }

  /** Apply the draft to the current target (mirrors applyCustomizerTarget). */
  applyDraft(): void {
    if (!this.state.draftImage) return;
    this.state.sprites[this.state.target] = { image: this.state.draftImage, sheet: { ...this.state.draftSheet } };
    this.deps.persist(this.state.sprites);
    this.deps.applyStyles(this.state.sprites);
    this.deps.haptics.effect('place');
  }

  /** Reset a single target's sprite (mirrors RESET ELEMENT). */
  resetTarget(target: string): void {
    const t = normalizeTarget(target);
    delete this.state.sprites[t];
    this.deps.persist(this.state.sprites);
    this.deps.applyStyles(this.state.sprites);
  }

  /** Reset all sprites (mirrors RESET ALL SPRITES). */
  resetAll(): void {
    this.state.sprites = {};
    this.deps.persist(this.state.sprites);
    this.deps.applyStyles(this.state.sprites);
  }

  save(): void {
    this.deps.persist(this.state.sprites);
    this.deps.toast.notify('💾 Sprite changes saved to this browser.', 'good');
  }

  spriteFor(target: CustomizerTarget): SpriteDraft | undefined {
    return this.state.sprites[target];
  }
}
