/**
 * engine/world/time.ts — time-of-day classification (pure).
 *
 * Behavior-preserving port of `updateTimeOverlay` from index.html: map a game
 * clock string ("HH:MM") to one of four day phases (morning / noon / evening /
 * night). The DOM class toggle stays in the feature layer; this module owns the
 * classification rule.
 */

export type DayPhase = 'morning' | 'noon' | 'evening' | 'night';

/** Extract the hour from a game clock string ("HH:MM"), defaulting to 12. */
export function hourFromGameTime(gameTime: string): number {
  return gameTime ? Number(String(gameTime).split(':')[0]) : 12;
}

/** Classify an hour (0–23) into a day phase (mirrors updateTimeOverlay). */
export function dayPhaseForHour(hour: number): DayPhase {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 || hour < 6) return 'night';
  return 'noon';
}

/** Classify a game clock string directly. */
export function dayPhaseForGameTime(gameTime: string): DayPhase {
  return dayPhaseForHour(hourFromGameTime(gameTime));
}
