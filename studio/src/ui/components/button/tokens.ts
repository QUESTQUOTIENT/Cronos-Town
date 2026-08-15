/**
 * ui/components/button/tokens.ts — Button design tokens.
 *
 * Atomic ownership: every component owns its own tokens, states, view, and
 * controller — no cross-component coupling. These are the Button-specific tokens
 * derived from the global theme (a component should never hard-code hex).
 */
import type { ComponentTone } from '../../components';

export interface ButtonTokens {
  borderColor: string;
  color: string;
  background: string;
  radius: string;
  padding: string;
}

export const BUTTON_TONES: Record<ComponentTone, { border: string; color: string }> = {
  default: { border: 'teal', color: 'teal' },
  primary: { border: 'teal', color: 'teal' },
  gold: { border: 'gold', color: 'gold' },
  danger: { border: 'red', color: 'red' },
  success: { border: 'green', color: 'green' },
};

export const BUTTON_RADIUS = '4px';
export const BUTTON_PADDING = '6px 10px';

/** Resolve a Button's tokens from the global palette + its tone. */
export function resolveButtonTokens(
  tone: ComponentTone,
  palette: Record<string, string>,
): ButtonTokens {
  const t = BUTTON_TONES[tone] ?? BUTTON_TONES.default;
  return {
    borderColor: palette[t.border],
    color: palette[t.color],
    background: palette.glassDeep ?? palette.bg,
    radius: BUTTON_RADIUS,
    padding: BUTTON_PADDING,
  };
}
