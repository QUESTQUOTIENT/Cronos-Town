/**
 * engine/workspaces/presets.ts — workspace presets.
 *
 * One-click workspace layouts, richer than the base defaults: Game Design,
 * UI Design, Economy, AI, Assets, plus a Scripting preset. Each preset declares
 * its panels; `applyPreset` builds a WorkspaceManager with all of them, so users
 * switch contexts with a single click.
 */
import { WorkspaceManager } from './WorkspaceManager';

export interface WorkspacePreset {
  id: string;
  name: string;
  panels: Array<{ id: string; title: string; type: string }>;
}

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: 'game-design', name: 'Game Design',
    panels: [
      { id: 'objects', title: 'Creator Control · Universal Objects', type: 'studio-objects' },
      { id: 'object-editor', title: 'Creator Control · Object Editor', type: 'studio-object-editor' },
      { id: 'network-manager', title: 'Creator Control · Network Manager', type: 'network-manager' },
      { id: 'export-project', title: 'Creator Control · Export Project', type: 'project-export' },
      { id: 'transactions', title: 'Creator Control · Transactions', type: 'transaction-center' },
      { id: 'story-graph', title: 'Creator Control · Story Graph', type: 'story-graph' },
      { id: 'graph', title: 'Project Graph', type: 'project-graph' },
      { id: 'hierarchy', title: 'Hierarchy', type: 'hierarchy' },
      { id: 'inspector', title: 'Inspector', type: 'inspector' },
    ],
  },
  {
    id: 'ui-design', name: 'UI Design',
    panels: [
      { id: 'canvas', title: 'Canvas', type: 'canvas' },
      { id: 'layers', title: 'Layers', type: 'layers' },
      { id: 'inspector', title: 'Inspector', type: 'inspector' },
      { id: 'assets', title: 'Assets', type: 'asset-browser' },
    ],
  },
  {
    id: 'economy', name: 'Economy',
    panels: [
      { id: 'token', title: 'Token', type: 'token' },
      { id: 'liquidity', title: 'Liquidity', type: 'liquidity' },
      { id: 'market', title: 'Market', type: 'market' },
      { id: 'wallet', title: 'Wallet', type: 'wallet' },
    ],
  },
  {
    id: 'ai', name: 'AI',
    panels: [
      { id: 'prompts', title: 'Prompts', type: 'prompts' },
      { id: 'memory', title: 'Memory', type: 'memory' },
      { id: 'automation', title: 'Automation', type: 'automation' },
    ],
  },
  {
    id: 'assets', name: 'Assets',
    panels: [
      { id: 'sprites', title: 'Sprites', type: 'sprites' },
      { id: 'tilesets', title: 'Tilesets', type: 'tilesets' },
      { id: 'audio', title: 'Audio', type: 'audio' },
      { id: 'templates', title: 'Templates', type: 'templates' },
      { id: 'nft-pipeline', title: 'NFT Character Pipeline', type: 'nft-pipeline' },
    ],
  },
  {
    id: 'scripting', name: 'Scripting',
    panels: [
      { id: 'console', title: 'Console', type: 'console' },
      { id: 'profiler', title: 'Profiler', type: 'profiler' },
      { id: 'commands', title: 'Commands', type: 'commands' },
      { id: 'notifications', title: 'Notifications', type: 'notifications' },
    ],
  },
  {
    id: 'animation', name: 'Animation',
    panels: [
      { id: 'timeline', title: 'Timeline', type: 'timeline' },
      { id: 'inspector', title: 'Inspector', type: 'inspector' },
    ],
  },
];

export interface PresetWorkspaceResult {
  workspace: WorkspaceManager;
  created: Array<{ id: string; name: string }>;
}

/** Build a WorkspaceManager pre-loaded with all presets (first is active). */
export function buildPresetWorkspaces(): PresetWorkspaceResult {
  const workspace = new WorkspaceManager();
  const created: Array<{ id: string; name: string }> = [];
  for (const preset of WORKSPACE_PRESETS) {
    const ws = workspace.createWorkspace(preset.name);
    for (const panel of preset.panels) workspace.addPanel(ws.id, panel);
    created.push({ id: ws.id, name: ws.name });
  }
  return { workspace, created };
}

/** Find a preset by id. */
export function findPreset(id: string): WorkspacePreset | undefined {
  return WORKSPACE_PRESETS.find((p) => p.id === id);
}
