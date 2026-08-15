/**
 * features/sprite-lab/presets.ts — sprite preset catalog + target config (pure).
 *
 * Behavior-preserving port of the legacy Sprite Lab catalog from index.html:
 * the preset option groups, the customizer target selectors, the allowed-preset
 * mapping, and the preset-filtering logic.
 */

export type PresetGroup = 'terrain' | 'scenes' | 'nature' | 'buildings' | 'characters' | 'bosses' | 'ui' | 'arena';

export interface SpritePreset {
  value: string;
  label: string;
  group: PresetGroup;
}

/** The full preset catalog, grouped (mirrors the `<optgroup>` options). */
export const SPRITE_PRESETS: SpritePreset[] = [
  // TERRAIN TILES
  { value: 'sprites/grass.png', label: 'Grass', group: 'terrain' },
  { value: 'sprites/grass_ice.png', label: 'Grass + Ice', group: 'terrain' },
  { value: 'sprites/grassrock1.png', label: 'Grass Rock 1', group: 'terrain' },
  { value: 'sprites/grassrock2.png', label: 'Grass Rock 2', group: 'terrain' },
  { value: 'sprites/sandrock1.png', label: 'Sand Rock 1', group: 'terrain' },
  { value: 'sprites/sandrock2.png', label: 'Sand Rock 2', group: 'terrain' },
  { value: 'sprites/icerock1.png', label: 'Ice Rock 1', group: 'terrain' },
  { value: 'sprites/icerock2.png', label: 'Ice Rock 2', group: 'terrain' },
  // ENVIRONMENT SCENES
  { value: 'sprites/forest.png', label: 'Forest Scene', group: 'scenes' },
  { value: 'sprites/coast.png', label: 'Coast Scene', group: 'scenes' },
  { value: 'sprites/sand.png', label: 'Sand Scene', group: 'scenes' },
  { value: 'sprites/ice.png', label: 'Ice Scene', group: 'scenes' },
  { value: 'sprites/world.png', label: 'World Scene', group: 'scenes' },
  { value: 'sprites/indoor.png', label: 'Indoor Scene', group: 'scenes' },
  // TREES + NATURE
  { value: 'sprites/green_tree.png', label: 'Green Tree', group: 'nature' },
  { value: 'sprites/green_tree_bushy.png', label: 'Green Bushy Tree', group: 'nature' },
  { value: 'sprites/green_tree_small.png', label: 'Small Green Tree', group: 'nature' },
  { value: 'sprites/ice_tree.png', label: 'Ice Tree', group: 'nature' },
  { value: 'sprites/palm.png', label: 'Palm Tree', group: 'nature' },
  { value: 'sprites/palm_alt.png', label: 'Palm Tree Alt', group: 'nature' },
  { value: 'sprites/palm_small.png', label: 'Small Palm', group: 'nature' },
  { value: 'sprites/teal_tree.png', label: 'Teal Tree', group: 'nature' },
  { value: 'sprites/teal_tree_bushy.png', label: 'Teal Bushy Tree', group: 'nature' },
  { value: 'sprites/teal_tree_small.png', label: 'Small Teal Tree', group: 'nature' },
  { value: 'sprites/shadow.png', label: 'Ground Shadow', group: 'nature' },
  // BUILDINGS + RUINS
  { value: 'sprites/hospital.png', label: 'Hospital', group: 'buildings' },
  { value: 'sprites/house_large.png', label: 'Large House', group: 'buildings' },
  { value: 'sprites/house_large_alt.png', label: 'Large House Alt', group: 'buildings' },
  { value: 'sprites/house_small.png', label: 'Small House', group: 'buildings' },
  { value: 'sprites/house_small_alt.png', label: 'Small House Alt', group: 'buildings' },
  { value: 'sprites/gate_top.png', label: 'Gate Top', group: 'buildings' },
  { value: 'sprites/gate_pillar.png', label: 'Gate Pillar', group: 'buildings' },
  { value: 'sprites/ruin_gate.png', label: 'Ruin Gate', group: 'buildings' },
  { value: 'sprites/ruin_pillar.png', label: 'Ruin Pillar', group: 'buildings' },
  { value: 'sprites/ruin_pillar_broke.png', label: 'Broken Ruin Pillar', group: 'buildings' },
  { value: 'sprites/ruin_pillar_broke_alt.png', label: 'Broken Ruin Pillar Alt', group: 'buildings' },
  // CHARACTERS
  { value: 'sprites/player.png', label: 'Player', group: 'characters' },
  { value: 'sprites/young_guy.png', label: 'Young Guy', group: 'characters' },
  { value: 'sprites/young_girl.png', label: 'Young Girl', group: 'characters' },
  { value: 'sprites/hat_girl.png', label: 'Hat Girl', group: 'characters' },
  { value: 'sprites/purple_girl.png', label: 'Purple Girl', group: 'characters' },
  { value: 'sprites/blond.png', label: 'Blond Character', group: 'characters' },
  { value: 'sprites/straw.png', label: 'Straw Hat Character', group: 'characters' },
  // BOSSES + CREATURES
  { value: 'sprites/grass_boss.png', label: 'Grass Boss', group: 'bosses' },
  { value: 'sprites/fire_boss.png', label: 'Fire Boss', group: 'bosses' },
  { value: 'sprites/water_boss.png', label: 'Water Boss', group: 'bosses' },
  // UI + CONTROLS
  { value: 'sprites/arrows.png', label: 'Arrows', group: 'ui' },
  { value: 'sprites/arrows_highlight.png', label: 'Highlighted Arrows', group: 'ui' },
  { value: 'sprites/hand.png', label: 'Hand', group: 'ui' },
  { value: 'sprites/hand_highlight.png', label: 'Highlighted Hand', group: 'ui' },
  { value: 'sprites/cross.png', label: 'Cross', group: 'ui' },
  { value: 'sprites/0.png', label: 'Number 0', group: 'ui' },
  { value: 'sprites/1.png', label: 'Number 1', group: 'ui' },
  { value: 'sprites/2.png', label: 'Number 2', group: 'ui' },
  { value: 'sprites/3.png', label: 'Number 3', group: 'ui' },
  // ARENA PROPS
  { value: 'sprites/arena_water.png', label: 'Arena Water', group: 'arena' },
  { value: 'sprites/arean_fire.png', label: 'Arena Fire', group: 'arena' },
  { value: 'sprites/arena_plant.png', label: 'Arena Plant', group: 'arena' },
];

export type CustomizerTarget =
  | 'grass' | 'road' | 'tall-grass' | 'stone' | 'pond' | 'tree' | 'bush'
  | 'house' | 'mailbox' | 'character' | 'npc' | 'pc' | 'table' | 'floor' | 'wall' | 'ui';

export interface CustomizerTargetConfig {
  label: string;
  selector: string;
  object: boolean;
  spriteSheet?: boolean;
}

/** The 16 customizer targets (mirrors `CUSTOMIZER_TARGETS`). */
export const CUSTOMIZER_TARGETS: Record<CustomizerTarget, CustomizerTargetConfig> = {
  grass: { label: 'Grass tiles', selector: '.tile:not(.road):not(.tall-grass)', object: true },
  road: { label: 'Road tiles', selector: '.tile.road', object: true },
  'tall-grass': { label: 'Tall grass', selector: '.tile.tall-grass', object: true },
  stone: { label: 'Stone slabs', selector: '.stone-slab', object: true },
  pond: { label: 'Ponds', selector: '.pond', object: true },
  tree: { label: 'Jungle trees', selector: '.jungle-tree', object: true },
  bush: { label: 'Jungle bushes', selector: '.jungle-bush', object: true },
  house: { label: 'Houses', selector: '.house', object: true },
  mailbox: { label: 'Mailboxes', selector: '.mailbox', object: true },
  character: { label: 'Player sprite sheet', selector: '#player', object: true, spriteSheet: true },
  npc: { label: 'NPC sprite sheets', selector: '.interior-npc,.outdoor-npc,.event-friend', object: true, spriteSheet: true },
  pc: { label: 'Computers and PCs', selector: '.interior-pc,.interior-dex-pc,.interior-nft-pc,.interior-market-pc,.interior-customizer-pc,.interior-casino-pc,.interior-launch-pc,.interior-ai-pc', object: true },
  table: { label: 'Desks and tables', selector: '.interior-table', object: true },
  floor: { label: 'Interior floors', selector: '.interior-floor', object: true },
  wall: { label: 'Interior walls', selector: '.interior-wall', object: true },
  ui: { label: 'Dialogue and menu UI', selector: '.dialog-box,.time-panel,.smart-menu,.wolfies-viewer,.save-menu,.bag-menu,.town-map-viewer,.dex-ui,.marketplace-ui,.casino-ui,.wolf-ui,.start-screen', object: false },
};

/** Allowed preset groups per target (mirrors `CUSTOMIZER_ALLOWED_PRESETS`). */
export const CUSTOMIZER_ALLOWED_PRESETS: Record<CustomizerTarget, PresetGroup[]> = {
  grass: ['terrain'],
  road: ['terrain'],
  'tall-grass': ['terrain', 'nature'],
  stone: ['terrain', 'buildings'],
  pond: ['terrain', 'arena'],
  tree: ['nature'],
  bush: ['nature'],
  house: ['buildings'],
  mailbox: [],
  character: ['characters', 'bosses'],
  npc: ['characters', 'bosses'],
  pc: ['ui'],
  table: [],
  floor: ['terrain', 'scenes'],
  wall: ['terrain', 'scenes'],
  ui: ['ui'],
};

export const CUSTOMIZER_TARGET_IDS = Object.keys(CUSTOMIZER_TARGETS) as CustomizerTarget[];

export function normalizeTarget(target: string): CustomizerTarget {
  return (CUSTOMIZER_TARGET_IDS as string[]).includes(target) ? (target as CustomizerTarget) : 'grass';
}

/** True if a preset is allowed for a target (mirrors `filterCustomizerPresets`). */
export function isPresetAllowedForTarget(preset: SpritePreset, target: CustomizerTarget): boolean {
  const allowed = new Set(CUSTOMIZER_ALLOWED_PRESETS[target]);
  return allowed.has(preset.group);
}

/** Presets allowed for a target. */
export function allowedPresets(target: CustomizerTarget): SpritePreset[] {
  const allowed = new Set(CUSTOMIZER_ALLOWED_PRESETS[target]);
  return SPRITE_PRESETS.filter((p) => allowed.has(p.group));
}

/** Size-info strings per target (mirrors `CUSTOMIZER_SIZE_INFO`). */
export const CUSTOMIZER_SIZE_INFO: Record<CustomizerTarget, { tiles: string; pixels: string; note: string }> = {
  grass: { tiles: '1 × 1', pixels: '32 × 32 px', note: 'one logical world tile' },
  road: { tiles: '1 × 1', pixels: '32 × 32 px', note: 'one logical world tile' },
  'tall-grass': { tiles: '1 × 1', pixels: '32 × 32 px', note: 'one logical world tile' },
  stone: { tiles: '1 × 1', pixels: '32 × 32 px', note: 'one logical world tile' },
  pond: { tiles: '4 × 3 to 6 × 4', pixels: '192 × 128 px max', note: 'ponds scale to their individual footprint' },
  tree: { tiles: '1 × 1', pixels: '32 × 32 px', note: 'tree art is anchored to one tile' },
  bush: { tiles: '1 × 1', pixels: '32 × 32 px', note: 'bush art is anchored to one tile' },
  house: { tiles: 'multi-tile', pixels: 'varies', note: 'houses span their own footprint' },
  mailbox: { tiles: '1 × 1', pixels: '32 × 32 px', note: 'one mailbox tile' },
  character: { tiles: '4 × 4 sheet', pixels: '16 frames', note: 'down / left / right / up' },
  npc: { tiles: '4 × 4 sheet', pixels: '16 frames', note: 'down / left / right / up' },
  pc: { tiles: 'multi-tile', pixels: 'varies', note: 'PC cabinets span their footprint' },
  table: { tiles: 'multi-tile', pixels: 'varies', note: 'tables span their footprint' },
  floor: { tiles: '20 × 14', pixels: 'interior grid', note: 'fills the whole interior floor' },
  wall: { tiles: '20 × 14', pixels: 'interior grid', note: 'fills the whole interior wall' },
  ui: { tiles: 'overlay', pixels: 'UI chrome', note: 'dialogue and menu surfaces' },
};

export const DEFAULT_SHEET = { columns: 4, rows: 4 };

/** Clamp a sheet dimension (mirrors `Math.max(1, Number(...) || 4)`). */
export function clampSheetDimension(value: number, fallback = 4): number {
  return Math.max(1, Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback);
}
