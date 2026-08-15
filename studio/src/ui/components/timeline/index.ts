/**
 * ui/components/timeline/index.ts — the Timeline component (atomic).
 *
 * Maps an animation timeline (tracks + keyframes) into a render spec: each track
 * is a horizontal lane, each keyframe a positioned block, and the playhead a
 * vertical marker. Pure + testable; the DOM layer paints the spec.
 */
import type { AnimationTimeline } from '../../../features/editor/tools/animation-editor';
import { trackDuration, totalDuration } from '../../../features/editor/tools/animation-editor';

export interface TimelineLane {
  trackId: string;
  name: string;
  keyframes: Array<{ id: string; frameIndex: number; startMs: number; widthMs: number }>;
}

export interface TimelineSpec {
  lanes: TimelineLane[];
  durationMs: number;
  playheadMs: number;
  fps: number;
}

export const LANE_HEIGHT = 24;

/** Build the timeline render spec (keyframes positioned by cumulative time). */
export function buildTimelineSpec(timeline: AnimationTimeline): TimelineSpec {
  const lanes: TimelineLane[] = timeline.tracks.map((track) => {
    let acc = 0;
    const keyframes = track.keyframes.map((kf) => {
      const startMs = acc;
      acc += kf.durationMs;
      return { id: kf.id, frameIndex: kf.frameIndex, startMs, widthMs: kf.durationMs };
    });
    return { trackId: track.id, name: track.name, keyframes };
  });
  return {
    lanes,
    durationMs: totalDuration(timeline),
    playheadMs: timeline.playheadMs,
    fps: timeline.fps,
  };
}

/** The playhead's x position given a canvas width (px). */
export function playheadX(spec: TimelineSpec, canvasWidth: number): number {
  if (spec.durationMs <= 0) return 0;
  return Math.round((spec.playheadMs / spec.durationMs) * canvasWidth);
}

export type { AnimationTimeline, trackDuration };
