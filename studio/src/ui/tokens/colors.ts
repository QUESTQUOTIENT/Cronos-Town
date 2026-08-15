/**
 * ui/tokens/colors.ts — color tokens.
 *
 * The Neo-GBA Cyber-Native palette, split from the monolithic theme into a
 * dedicated token module (per the design-system structure). `theme.ts` re-exports
 * these so existing imports keep working.
 */
export const StudioColors = {
  bg: '#0a0f0d',
  glass: '#141f1a',
  glassDeep: '#0c1411',
  teal: '#83d1c7',
  gold: '#f3d575',
  red: '#a8403d',
  green: '#79f2c0',
  textMuted: '#9ebd7b',
  text: '#d6e6e0',
  border: '#3e8150',
  borderStrong: '#2d4a3e',
  water: '#5d9eaa',
  road: '#c5a36d',
} as const;

export type StudioColor = keyof typeof StudioColors;
