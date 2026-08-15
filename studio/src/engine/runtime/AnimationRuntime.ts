/**
 * engine/runtime/AnimationRuntime.ts — frame animation playback (pure).
 *
 * Plays a keyframe timeline over time: given an elapsed time, resolves the active
 * keyframe per track. Consumes the animation-editor data model. Deterministic.
 */
import type { AnimationTimeline, AnimationTrack } from '../../features/editor/tools/animation-editor';
import { frameAtTime } from '../../features/editor/tools/animation-editor';

export interface PlaybackState {
  elapsedMs: number;
  playing: boolean;
  loop: boolean;
}

export function playbackState(): PlaybackState {
  return { elapsedMs: 0, playing: false, loop: true };
}

export class AnimationRuntime {
  private state = playbackState();

  play(): void {
    this.state.playing = true;
  }

  pause(): void {
    this.state.playing = false;
  }

  stop(): void {
    this.state = playbackState();
  }

  setLoop(loop: boolean): void {
    this.state.loop = loop;
  }

  /** Advance playback by deltaMs; returns the frame index per track. */
  advance(deltaMs: number, timeline: AnimationTimeline): Map<string, number> {
    if (!this.state.playing) {
      // Even when paused, resolve the current frame (no time advance).
      return this.resolve(timeline);
    }
    this.state.elapsedMs += deltaMs;
    const total = timeline.tracks.length ? timeline.tracks.reduce((m, t) => Math.max(m, t.keyframes.reduce((s, k) => s + k.durationMs, 0)), 0) : 0;
    if (this.state.loop && total > 0) {
      this.state.elapsedMs = this.state.elapsedMs % total;
    }
    return this.resolve(timeline);
  }

  private resolve(timeline: AnimationTimeline): Map<string, number> {
    const out = new Map<string, number>();
    for (const track of timeline.tracks) {
      out.set(track.id, frameAtTime(track, this.state.elapsedMs));
    }
    return out;
  }
}

export type { AnimationTrack };
