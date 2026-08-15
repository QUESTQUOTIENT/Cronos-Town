/**
 * engine/runtime/Time.ts — time system (pure).
 *
 * Tracks elapsed time, delta accumulation, time scale, and a fixed-timestep
 * accumulator. Deterministic (time is injected). Used by animation, physics,
 * and simulation runtimes.
 */

export interface TimeState {
  elapsedMs: number;
  deltaMs: number;
  timeScale: number;
}

export function timeState(): TimeState {
  return { elapsedMs: 0, deltaMs: 0, timeScale: 1 };
}

export class Time {
  private state = timeState();
  /** Accumulated (unscaled) time for fixed-step physics. */
  private accumulator = 0;

  constructor(private readonly fixedStepMs = 16) {}

  get now(): TimeState {
    return { ...this.state };
  }

  /** Advance time by a (scaled) delta. */
  advance(rawDeltaMs: number): void {
    const deltaMs = rawDeltaMs * this.state.timeScale;
    this.state.deltaMs = deltaMs;
    this.state.elapsedMs += deltaMs;
  }

  /** Advance and report whether a fixed step is due (drains the accumulator). */
  fixedStepDue(rawDeltaMs: number): boolean {
    this.accumulator += rawDeltaMs;
    if (this.accumulator >= this.fixedStepMs) {
      this.accumulator -= this.fixedStepMs;
      return true;
    }
    return false;
  }

  setTimeScale(scale: number): void {
    this.state.timeScale = Math.max(0, scale);
  }

  reset(): void {
    this.state = timeState();
    this.accumulator = 0;
  }
}
