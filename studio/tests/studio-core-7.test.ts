import { describe, expect, it } from 'vitest';

import { LayoutSerializer } from '../src/engine/workspaces/LayoutSerializer';
import { WorkspaceManager } from '../src/engine/workspaces/WorkspaceManager';
import { buildPresetWorkspaces } from '../src/engine/workspaces/presets';

import { buttonReducer, initialState, isClickable } from '../src/ui/components/button/states';
import { ButtonController } from '../src/ui/components/button/controller';
import { resolveButtonTokens, BUTTON_TONES } from '../src/ui/components/button/tokens';
import { StudioColors } from '../src/ui/tokens/colors';

import { ResourceManager } from '../src/engine/runtime/ResourceManager';

import { validateGraph, nodeKindCounts, type AutomationGraph, type DialogueGraph, type QuestGraph } from '../src/engine/graph/GraphEditors';

describe('engine/workspaces — LayoutSerializer (layout persistence)', () => {
  it('serialize → deserialize round-trips the workspace layout', () => {
    const { workspace } = buildPresetWorkspaces();
    workspace.setActive('economy');
    const serializer = new LayoutSerializer();
    const snapshot = serializer.serialize(workspace);

    expect(snapshot.workspaces).toHaveLength(7);
    expect(snapshot.activeWorkspaceId).toBe('economy');

    const { manager, restored } = serializer.deserialize(snapshot);
    expect(restored).toBeGreaterThan(0);
    expect(manager.list()).toHaveLength(7);
    expect(manager.active?.id).toBe('economy');
    // Panel ids are preserved.
    expect(manager.get('economy')?.panels.map((p) => p.type)).toEqual(['token', 'liquidity', 'market', 'wallet']);
  });

  it('restores workspace ids exactly (no slugging)', () => {
    const manager = new WorkspaceManager();
    expect(manager.restoreWorkspace('my-ws', 'My Workspace')?.id).toBe('my-ws');
    expect(manager.restoreWorkspace('my-ws', 'Duplicate')).toBeNull(); // id taken
    expect(manager.createWorkspace('My Workspace').id).toBe('my-workspace'); // slugged, distinct
  });
});

describe('ui/components/button — atomic ownership', () => {
  it('resolves tokens from the palette + tone', () => {
    const tokens = resolveButtonTokens('gold', StudioColors);
    expect(tokens.borderColor).toBe(StudioColors.gold);
    expect(tokens.color).toBe(StudioColors.gold);
    expect(tokens.background).toBe(StudioColors.glassDeep);
    const danger = resolveButtonTokens('danger', StudioColors);
    expect(danger.borderColor).toBe(StudioColors.red);
  });

  it('exposes all 5 tones', () => {
    expect(Object.keys(BUTTON_TONES).sort()).toEqual(['danger', 'default', 'gold', 'primary', 'success']);
  });

  it('buttonReducer handles enable/disable/loading/hover/press/focus', () => {
    let s = initialState();
    expect(isClickable(s)).toBe(true);
    s = buttonReducer(s, { type: 'disable' });
    expect(isClickable(s)).toBe(false);
    s = buttonReducer(s, { type: 'enable' });
    expect(isClickable(s)).toBe(true);
    s = buttonReducer(s, { type: 'set-loading', value: true });
    expect(s.loading).toBe(true);
    expect(isClickable(s)).toBe(false);
    s = buttonReducer(s, { type: 'hover', value: true });
    expect(s.hovered).toBe(true);
  });

  it('ButtonController gates clicks on disabled/loading', () => {
    const ctrl = new ButtonController();
    let clicked = 0;
    ctrl.onClick(() => clicked += 1);
    expect(ctrl.tryClick()).toBe(true);
    expect(clicked).toBe(1);
    ctrl.setDisabled(true);
    expect(ctrl.tryClick()).toBe(false);
    expect(clicked).toBe(1);
    ctrl.setDisabled(false);
    ctrl.setLoading(true);
    expect(ctrl.tryClick()).toBe(false);
    expect(clicked).toBe(1);
  });
});

describe('engine/runtime — ResourceManager (memory budgeting)', () => {
  it('tracks bytes + utilization', () => {
    const rm = new ResourceManager({ budgetBytes: 100 });
    rm.load({ id: 'a', kind: 'texture', sizeBytes: 40 });
    rm.load({ id: 'b', kind: 'audio', sizeBytes: 30 });
    expect(rm.usedBytes).toBe(70);
    expect(rm.utilization).toBeCloseTo(0.7, 6);
  });

  it('evicts LRU when over budget', () => {
    const rm = new ResourceManager({ budgetBytes: 100 });
    rm.load({ id: 'a', kind: 'texture', sizeBytes: 60 });
    rm.load({ id: 'b', kind: 'texture', sizeBytes: 60 });
    // total 120 > 100 → evict LRU ('a')
    expect(rm.isLoaded('a')).toBe(false);
    expect(rm.isLoaded('b')).toBe(true);
    expect(rm.usedBytes).toBe(60);
  });

  it('touch() re-orders LRU so the recently-used resource survives', () => {
    // Load two resources (a, then b). Then touch 'a' (mark it recently used),
    // then load a third that pushes over budget → 'b' (now LRU) is evicted.
    const rm = new ResourceManager({ budgetBytes: 120 });
    rm.load({ id: 'a', kind: 'texture', sizeBytes: 50 });
    rm.load({ id: 'b', kind: 'texture', sizeBytes: 50 }); // 100 total, under budget
    rm.touch('a'); // a becomes most-recently-used
    rm.load({ id: 'c', kind: 'texture', sizeBytes: 50 }); // 150 > 120 → evict LRU 'b'
    expect(rm.isLoaded('a')).toBe(true); // touched → survives
    expect(rm.isLoaded('c')).toBe(true);
    expect(rm.isLoaded('b')).toBe(false); // 'b' evicted (it was LRU)
    expect(rm.usedBytes).toBe(100);
  });

  it('unload frees bytes', () => {
    const rm = new ResourceManager({ budgetBytes: 1000 });
    rm.load({ id: 'a', kind: 'x', sizeBytes: 100 });
    expect(rm.unload('a')).toBe(true);
    expect(rm.usedBytes).toBe(0);
    expect(rm.unload('a')).toBe(false);
  });
});

describe('engine/graph — GraphEditors (graph-native models + validation)', () => {
  const dialogue: DialogueGraph = {
    kind: 'dialogue',
    start: 'n1',
    nodes: [
      { id: 'n1', kind: 'line', speaker: 'NPC', text: 'Hello!' },
      { id: 'n2', kind: 'choice', prompt: 'Choose', options: ['A', 'B'] },
      { id: 'n3', kind: 'end' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3', index: 0 },
    ],
  };

  it('validates a well-formed graph as valid', () => {
    expect(validateGraph(dialogue).valid).toBe(true);
  });

  it('flags a missing start node', () => {
    const bad = { ...dialogue, start: 'missing' };
    const result = validateGraph(bad);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Start node'))).toBe(true);
  });

  it('flags dangling edges + unreachable nodes', () => {
    const bad: DialogueGraph = {
      kind: 'dialogue',
      start: 'n1',
      nodes: [
        { id: 'n1', kind: 'line', speaker: 'A', text: 'x' },
        { id: 'n2', kind: 'end' },
        { id: 'n3', kind: 'line', speaker: 'B', text: 'y' },
      ],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n9', to: 'n1' }],
    };
    const result = validateGraph(bad);
    expect(result.issues.some((i) => i.message.includes('unknown node "n9"'))).toBe(true);
    expect(result.issues.some((i) => i.message.includes('Unreachable node "n3"'))).toBe(true);
  });

  it('validates quest + automation graphs and counts node kinds', () => {
    const quest: QuestGraph = {
      kind: 'quest', start: 'o1',
      nodes: [
        { id: 'o1', kind: 'objective', title: 'Collect', description: 'x' },
        { id: 'r1', kind: 'reward', label: 'CRO', amount: 100 },
        { id: 'c1', kind: 'complete' },
      ],
      edges: [{ from: 'o1', to: 'r1' }, { from: 'r1', to: 'c1' }],
    };
    expect(validateGraph(quest).valid).toBe(true);
    expect(nodeKindCounts(quest).get('objective')).toBe(1);

    const auto: AutomationGraph = {
      kind: 'automation', start: 't1',
      nodes: [
        { id: 't1', kind: 'trigger', label: 'Player enters' },
        { id: 'a1', kind: 'action', label: 'Mint NFT' },
      ],
      edges: [{ from: 't1', to: 'a1' }],
    };
    expect(validateGraph(auto).valid).toBe(true);
    expect(nodeKindCounts(auto).get('action')).toBe(1);
  });
});
