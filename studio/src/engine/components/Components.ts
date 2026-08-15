/**
 * engine/components/Components.ts — the component library (typed data shapes).
 *
 * A component is a typed data record (a `type` tag + fields). These are the
 * canonical components the studio's systems operate on: Transform, Sprite,
 * Animation, Collision, Dialogue, Quest, Inventory, Wallet, NPC, Player,
 * Interactable, Light, Audio. Each is pure data — systems (via SystemRunner)
 * read/write them through the EntityManager.
 *
 * The `componentRegistry` lets tooling introspect known component types (for the
 * inspector, serialization, and schema validation).
 */

export interface TransformComponent {
  type: 'transform';
  x: number;
  y: number;
  z?: number;
}

export interface SpriteComponent {
  type: 'sprite';
  /** Asset id in the AssetRegistry. */
  asset: string;
  frame?: number;
}

export interface AnimationComponent {
  type: 'animation';
  /** Animation id or asset sheet reference. */
  sheet: string;
  columns: number;
  rows: number;
  fps?: number;
}

export interface CollisionComponent {
  type: 'collision';
  solid: boolean;
  width?: number;
  height?: number;
}

export interface DialogueComponent {
  type: 'dialogue';
  lines: string[];
}

export interface QuestComponent {
  type: 'quest';
  questId: string;
  state: 'available' | 'active' | 'completed';
}

export interface InventoryComponent {
  type: 'inventory';
  items: Array<{ id: string; count: number }>;
}

export interface WalletComponent {
  type: 'wallet';
  address: string;
  role: string;
}

export interface NpcComponent {
  type: 'npc';
  name: string;
  behavior?: 'idle' | 'rotate';
}

export interface PlayerComponent {
  type: 'player';
  name: string;
}

export interface InteractableComponent {
  type: 'interactable';
  label: string;
}

export interface LightComponent {
  type: 'light';
  intensity: number;
  color: string;
}

export interface AudioComponent {
  type: 'audio';
  asset: string;
  loop?: boolean;
}

/** The union of all canonical components. */
export type AnyComponent =
  | TransformComponent
  | SpriteComponent
  | AnimationComponent
  | CollisionComponent
  | DialogueComponent
  | QuestComponent
  | InventoryComponent
  | WalletComponent
  | NpcComponent
  | PlayerComponent
  | InteractableComponent
  | LightComponent
  | AudioComponent;

export type ComponentTypeName = AnyComponent['type'];

/** Registry of known component types + factory helpers (for the inspector + schema). */
export const COMPONENT_TYPES: ComponentTypeName[] = [
  'transform', 'sprite', 'animation', 'collision', 'dialogue', 'quest',
  'inventory', 'wallet', 'npc', 'player', 'interactable', 'light', 'audio',
];

export const COMPONENT_FACTORIES: Record<ComponentTypeName, () => AnyComponent> = {
  transform: () => ({ type: 'transform', x: 0, y: 0 }),
  sprite: () => ({ type: 'sprite', asset: '' }),
  animation: () => ({ type: 'animation', sheet: '', columns: 4, rows: 4 }),
  collision: () => ({ type: 'collision', solid: true }),
  dialogue: () => ({ type: 'dialogue', lines: [] }),
  quest: () => ({ type: 'quest', questId: '', state: 'available' }),
  inventory: () => ({ type: 'inventory', items: [] }),
  wallet: () => ({ type: 'wallet', address: '', role: 'Visitor' }),
  npc: () => ({ type: 'npc', name: 'NPC' }),
  player: () => ({ type: 'player', name: 'Traveler' }),
  interactable: () => ({ type: 'interactable', label: 'Inspect' }),
  light: () => ({ type: 'light', intensity: 1, color: '#ffffff' }),
  audio: () => ({ type: 'audio', asset: '' }),
};

export function isComponentType(value: string): value is ComponentTypeName {
  return (COMPONENT_TYPES as string[]).includes(value);
}
