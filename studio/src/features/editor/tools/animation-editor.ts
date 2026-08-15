/**
 * features/editor/tools/animation-editor.ts — animation/timeline editor (pure).
 *
 * Edits sprite-sheet animations: a track has frames (frame index + duration), and
 * a timeline has multiple tracks. Supports frame insert/remove/reorder, playback
 * head movement, and total-duration computation. The visual timeline renders this
 * data; the logic is pure + testable.
 */

export interface Keyframe {
  id: string;
  /** Frame index into the sprite sheet. */
  frameIndex: number;
  /** Duration in ms. */
  durationMs: number;
}

export interface AnimationTrack {
  id: string;
  name: string;
  keyframes: Keyframe[];
  /** Loop when playing. */
  loop: boolean;
}

export interface AnimationTimeline {
  tracks: AnimationTrack[];
  /** Playback head position (ms). */
  playheadMs: number;
  fps: number;
}

export function emptyTimeline(fps = 8): AnimationTimeline {
  return { tracks: [], playheadMs: 0, fps };
}

export function addTrack(timeline: AnimationTimeline, id: string, name: string): AnimationTimeline {
  if (timeline.tracks.some((t) => t.id === id)) return timeline;
  return { ...timeline, tracks: [...timeline.tracks, { id, name, keyframes: [], loop: true }] };
}

export function addKeyframe(timeline: AnimationTimeline, trackId: string, keyframe: Keyframe): AnimationTimeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((t) =>
      t.id === trackId ? { ...t, keyframes: [...t.keyframes, keyframe] } : t,
    ),
  };
}

export function removeKeyframe(timeline: AnimationTimeline, trackId: string, keyframeId: string): AnimationTimeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((t) =>
      t.id === trackId ? { ...t, keyframes: t.keyframes.filter((k) => k.id !== keyframeId) } : t,
    ),
  };
}

/** Move the playhead (clamped to [0, duration]). */
export function setPlayhead(timeline: AnimationTimeline, ms: number): AnimationTimeline {
  const duration = totalDuration(timeline);
  return { ...timeline, playheadMs: Math.max(0, Math.min(ms, duration)) };
}

/** Total duration of a track (sum of keyframe durations). */
export function trackDuration(track: AnimationTrack): number {
  return track.keyframes.reduce((sum, k) => sum + k.durationMs, 0);
}

/** Total duration of the timeline (longest track). */
export function totalDuration(timeline: AnimationTimeline): number {
  return Math.max(0, ...timeline.tracks.map(trackDuration));
}

/** The frame index at a given time within a track (accounting for looping). */
export function frameAtTime(track: AnimationTrack, ms: number): number {
  if (track.keyframes.length === 0) return -1;
  const duration = trackDuration(track);
  if (duration === 0) return track.keyframes[0].frameIndex;
  let t = ms;
  if (track.loop) t = ((t % duration) + duration) % duration;
  let acc = 0;
  for (const kf of track.keyframes) {
    if (t < acc + kf.durationMs) return kf.frameIndex;
    acc += kf.durationMs;
  }
  return track.keyframes[track.keyframes.length - 1].frameIndex;
}

/** Sort keyframes by a stable "time" property (assumes durations are sequential). */
export function reorderKeyframes(track: AnimationTrack, ids: string[]): AnimationTrack {
  const byId = new Map(track.keyframes.map((k) => [k.id, k]));
  return { ...track, keyframes: ids.map((id) => byId.get(id)).filter((k): k is Keyframe => Boolean(k)) };
}
