/**
 * ui/tokens/index.ts — the token barrel.
 *
 * Spacing, radius, typography, motion, and world invariants — split from the
 * monolithic theme so each token group is a single-responsibility module.
 * `ui/theme.ts` re-exports these for backward compatibility.
 */

export const StudioSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const StudioRadius = {
  sm: 4,
  md: 6,
  lg: 10,
} as const;

export const StudioType = {
  fontMono: "'Courier New', ui-monospace, monospace",
  sizeXs: 9,
  sizeSm: 11,
  sizeMd: 12,
  sizeLg: 14,
  sizeXl: 16,
} as const;

export const StudioMotion = {
  hardCut: 120,
  quick: 150,
  fade: 280,
} as const;

export const StudioWorld = {
  viewportAspectRatio: 20 / 14,
  worldWidthClamp: 'min(100vw, calc(100vh * 1.428571))',
  worldAspectRatioCss: '20 / 14',
  tileSize: 32,
} as const;
