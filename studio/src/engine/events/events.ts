/**
 * engine/events/events.ts
 *
 * Typed event names + payloads. Adding a feature means adding its events here,
 * so cross-module contracts are explicit and compile-time checked.
 */

export const WalletEvents = {
  Connected: 'wallet:connected',
  Disconnected: 'wallet:disconnected',
  ConnectionFailed: 'wallet:connection-failed',
} as const;

export const TokenLaunchEvents = {
  PlanPrepared: 'token-launch:plan-prepared',
  DeployStarted: 'token-launch:deploy-started',
  DeployPending: 'token-launch:deploy-pending',
  DeployConfirmed: 'token-launch:deploy-confirmed',
  DeployRejected: 'token-launch:deploy-rejected',
  DeployFailed: 'token-launch:deploy-failed',
} as const;

export interface WalletConnectedEvent {
  address: string;
  chainId: string;
}

export interface WalletConnectionFailedEvent {
  error: string;
}

export interface TokenPlanPreparedEvent {
  name: string;
  symbol: string;
  supply: number;
  tax: number;
}

export interface TokenDeployPendingEvent {
  txHash: string;
  symbol: string;
}

export interface TokenDeployedEvent {
  name: string;
  symbol: string;
  contractAddress: string;
  txHash: string;
}

export interface TokenDeployFailedEvent {
  error: string;
}

/**
 * Chronos Studio Core — observable cross-cutting events. Every feature, workspace,
 * editor, and asset action emits through these so the whole platform becomes
 * observable and connectable (the "everything becomes an event" principle).
 */

export const ProjectEvents = {
  Created: 'project:created',
  Opened: 'project:opened',
  Saved: 'project:saved',
  Closed: 'project:closed',
} as const;

export const AssetEvents = {
  Imported: 'asset:imported',
  Edited: 'asset:edited',
  Deleted: 'asset:deleted',
} as const;

export const MapEvents = {
  Modified: 'map:modified',
  Loaded: 'map:loaded',
  Expanded: 'map:expanded',
} as const;

export const EditorEvents = {
  SelectionChanged: 'editor:selection-changed',
  HistorySnapshot: 'editor:history-snapshot',
  BrushApplied: 'editor:brush-applied',
} as const;

export const QuestEvents = {
  Created: 'quest:created',
  Completed: 'quest:completed',
} as const;

export const WorkspaceEvents = {
  Activated: 'workspace:activated',
  PanelOpened: 'workspace:panel-opened',
  PanelClosed: 'workspace:panel-closed',
} as const;

export const SceneEvents = {
  Loaded: 'scene:loaded',
  EntityAdded: 'scene:entity-added',
  EntityRemoved: 'scene:entity-removed',
} as const;

export const AutomationEvents = {
  Executed: 'automation:executed',
} as const;

export interface ProjectEvent {
  id: string;
  name: string;
}

export interface AssetEvent {
  id: string;
  type: string;
  name: string;
}

export interface MapEvent {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface EditorSelectionEvent {
  targetId: string;
  targetType: string;
}

export interface EditorBrushEvent {
  brush: string;
  tiles: number;
}

export interface QuestEvent {
  id: string;
  title: string;
}

export interface WorkspaceEvent {
  workspaceId: string;
  panelId?: string;
}

export interface SceneEvent {
  sceneId: string;
  entityId?: number;
}

export interface AutomationEvent {
  id: string;
  label: string;
  status: 'success' | 'failure';
}
