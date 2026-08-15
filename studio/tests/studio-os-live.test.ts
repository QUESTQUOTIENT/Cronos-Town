import { describe, expect, it } from 'vitest';

import { StudioOS } from '../src/studio/StudioOS';
import { buildTimelineSpec, playheadX } from '../src/ui/components/timeline';

describe('StudioOS — live surfaces (this wave)', () => {
  it('seeds a demo animation timeline', () => {
    const os = new StudioOS();
    expect(os.animationTimeline.tracks).toHaveLength(1);
    expect(os.animationTimeline.tracks[0].name).toBe('Player Walk');
    expect(os.animationTimeline.tracks[0].keyframes).toHaveLength(4);
    const spec = buildTimelineSpec(os.animationTimeline);
    expect(spec.durationMs).toBe(500); // 4 × 125ms
    expect(playheadX(spec, 500)).toBe(0); // playhead 0
  });

  it('entityEditor is command-backed (undoable) and shared with the OS', () => {
    const os = new StudioOS();
    const id = os.entityEditor.create(3, 4);
    expect(os.entities.getComponent<{ x: number } & { type: string }>(id, 'transform')?.x).toBe(3);
    expect(os.commands.canUndo).toBe(true);

    os.entityEditor.undo(); // undo the set-transform
    os.entityEditor.undo(); // undo the create
    expect(os.entities.count).toBe(0);
    expect(os.commands.canRedo).toBe(true);
  });

  it('graphEditor is command-backed and undoable', () => {
    const os = new StudioOS();
    const before = os.graph.allNodes().length;
    os.graphEditor.addNode({ id: 'custom-node', kind: 'map', name: 'Custom' });
    expect(os.graph.allNodes().length).toBe(before + 1);
    os.graphEditor.undo();
    expect(os.graph.allNodes().length).toBe(before);
  });

  it('importPipeline hot-reloads + registers graph edges', () => {
    const os = new StudioOS();
    const out = os.importPipeline.import({
      id: 'map-x', kind: 'map', name: 'Map X', source: 'sprites/map-x.png',
      metadata: { references: ['sprite-player'] },
    });
    expect(out.ok).toBe(true);
    expect(os.graph.has('map-x')).toBe(true);
    expect(os.graph.allEdges().some((e) => e.from === 'map-x' && e.to === 'sprite-player')).toBe(true);
  });

  it('notifications + commandLog + eventMonitor are live', () => {
    const os = new StudioOS();
    os.notifications.push('n1', 'info', 'hello', 0);
    expect(os.notifications.unread).toBe(1);
    os.commandLog.record('execute', 'Create Entity');
    expect(os.commandLog.all()).toHaveLength(1);
    os.eventMonitor.record('map:modified', {});
    expect(os.eventMonitor.counts().get('map:modified')).toBe(1);
  });

  it('has 7 workspace presets including Animation + Scripting', () => {
    const os = new StudioOS();
    expect(os.workspaces.list()).toHaveLength(7);
    expect(os.workspaces.get('animation')?.panels.map((p) => p.type)).toEqual(['timeline', 'inspector']);
    expect(os.workspaces.get('scripting')?.panels.map((p) => p.type)).toContain('notifications');
  });
});
