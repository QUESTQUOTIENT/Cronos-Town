/**
 * ui/theme.ts — the Chronos Studio design-system theme (re-export barrel).
 *
 * Tokens now live in `ui/tokens/` (colors / spacing / radius / typography /
 * motion / world). This module re-exports them as the single `studioTheme`
 * object for backward compatibility — no existing import changes.
 */
import { StudioColors, type StudioColor } from './tokens/colors';
import { StudioMotion, StudioRadius, StudioSpacing, StudioType, StudioWorld } from './tokens';

export { StudioColors, type StudioColor };
export { StudioSpacing, StudioRadius, StudioType, StudioMotion, StudioWorld };

export type StudioTheme = typeof StudioColors & {
  spacing: typeof StudioSpacing;
  radius: typeof StudioRadius;
  motion: typeof StudioMotion;
  type: typeof StudioType;
  world: typeof StudioWorld;
};

export const studioTheme: StudioTheme = {
  ...StudioColors,
  spacing: StudioSpacing,
  radius: StudioRadius,
  motion: StudioMotion,
  type: StudioType,
  world: StudioWorld,
};
