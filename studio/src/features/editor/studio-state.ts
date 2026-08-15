/**
 * features/editor/studio-state.ts — World Studio state schema + normalization (pure).
 *
 * Behavior-preserving port of `defaultWorldStudioState`, `defaultMapEditorState`,
 * and the load-time normalization from index.html. The localStorage read stays in
 * an adapter; this module owns the shape and the pure `normalizeMapEditorState`
 * coercion (which faithfully reproduces every legacy fallback + sanitization).
 */
import { defaultWorldBounds, normalizeWorldBounds, type WorldBounds } from '../../engine/world/bounds';

export type StudioModule = 'terrain' | 'buildings' | 'characters' | 'objects' | 'ui' | 'audio' | 'export';
export type StudioBrush = 'paint' | 'fill' | 'rectangle' | 'circle' | 'path' | 'auto-edge' | 'auto-road' | 'auto-river' | 'auto-forest';
export type StudioLayer = 'terrain' | 'buildings' | 'characters' | 'objects' | 'collision' | 'events' | 'lighting';
export type CharacterTarget = 'character' | 'npc';
export type NpcBehavior = 'idle' | 'rotate';

export interface ActiveLayers {
  terrain: boolean;
  buildings: boolean;
  characters: boolean;
  objects: boolean;
  collision: boolean;
  events: boolean;
  lighting: boolean;
}

export interface Footprint {
  width: number;
  height: number;
}

export interface StudioEvent {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  trigger: string;
  action: string;
}

export interface StudioDialogue {
  key: string;
  message: string;
}

export interface StudioLighting {
  preset: string;
  intensity: number;
}

export interface StudioAudioEffects {
  move: string;
  interact: string;
  door: string;
  dialogue: string;
  place: string;
  remove: string;
  expand: string;
}

export interface StudioAudio {
  mainMusic: string;
  ambience: string;
  music: string;
  volume: number;
  effects: StudioAudioEffects;
}

export interface WorldStudioState {
  module: StudioModule;
  brush: StudioBrush;
  activeAsset: string;
  activeFootprint: Footprint;
  characterTarget: CharacterTarget;
  newNpcName: string;
  newNpcMessage: string;
  newNpcBehavior: NpcBehavior;
  autoSave: boolean;
  activeLayers: ActiveLayers;
  events: StudioEvent[];
  dialogues: StudioDialogue[];
  lighting: StudioLighting;
  audio: StudioAudio;
}

export interface MapEditorState {
  exterior: unknown[];
  interior: Record<string, unknown[]>;
  removedExterior: unknown[];
  removedInterior: Record<string, unknown[]>;
  bounds: WorldBounds;
  studio: WorldStudioState;
}

export const STUDIO_MODULES: StudioModule[] = ['terrain', 'buildings', 'characters', 'objects', 'ui', 'audio', 'export'];

export function defaultWorldStudioState(): WorldStudioState {
  return {
    module: 'terrain',
    brush: 'paint',
    activeAsset: 'sprites/grass.png',
    activeFootprint: { width: 1, height: 1 },
    characterTarget: 'character',
    newNpcName: 'New NPC',
    newNpcMessage: 'Hello from Cronos Town!',
    newNpcBehavior: 'idle',
    autoSave: true,
    activeLayers: { terrain: true, buildings: true, characters: true, objects: true, collision: false, events: false, lighting: false },
    events: [],
    dialogues: [],
    lighting: { preset: 'day', intensity: 1 },
    audio: { mainMusic: '', ambience: 'none', music: 'none', volume: 0.7, effects: { move: '', interact: '', door: '', dialogue: '', place: '', remove: '', expand: '' } },
  };
}

export function defaultMapEditorState(): MapEditorState {
  return {
    exterior: [],
    interior: {},
    removedExterior: [],
    removedInterior: {},
    bounds: defaultWorldBounds(),
    studio: defaultWorldStudioState(),
  };
}

/**
 * Normalize a possibly-invalid/partial map-editor state, faithfully reproducing
 * the legacy load-time sanitization (array/object coercions, bounds truncation,
 * studio default-merging, footprint clamping, module/target/behavior whitelists,
 * and the Jim's Garage removed-item restore).
 */
export function normalizeMapEditorState(raw: unknown): MapEditorState {
  const src = (raw ?? {}) as Partial<MapEditorState> & { [k: string]: unknown };
  const state = defaultMapEditorState();

  if (Array.isArray(src.exterior)) state.exterior = src.exterior;
  if (src.interior && typeof src.interior === 'object') state.interior = src.interior as Record<string, unknown[]>;
  if (Array.isArray(src.removedExterior)) state.removedExterior = src.removedExterior;
  if (src.removedInterior && typeof src.removedInterior === 'object') state.removedInterior = src.removedInterior as Record<string, unknown[]>;

  state.bounds = normalizeWorldBounds(src.bounds as Partial<WorldBounds> | undefined);

  // studio default-merge
  const studioDefaults = defaultWorldStudioState();
  const rawStudio = (src.studio && typeof src.studio === 'object' ? src.studio : {}) as Partial<WorldStudioState> & { [k: string]: unknown };
  const merged = { ...studioDefaults, ...rawStudio };

  merged.activeLayers = { ...studioDefaults.activeLayers, ...(merged.activeLayers || {}) };
  merged.activeFootprint = {
    width: Math.max(1, Number(merged.activeFootprint?.width) || 1),
    height: Math.max(1, Number(merged.activeFootprint?.height) || 1),
  };
  if (!STUDIO_MODULES.includes(merged.module as StudioModule)) merged.module = 'terrain';
  merged.characterTarget = merged.characterTarget === 'npc' ? 'npc' : 'character';
  merged.newNpcName = String(merged.newNpcName || 'New NPC');
  merged.newNpcMessage = String(merged.newNpcMessage || 'Hello from Cronos Town!');
  merged.newNpcBehavior = merged.newNpcBehavior === 'rotate' ? 'rotate' : 'idle';
  merged.events = Array.isArray(merged.events) ? merged.events : [];
  merged.dialogues = Array.isArray(merged.dialogues) ? merged.dialogues : [];
  merged.lighting = { ...studioDefaults.lighting, ...(merged.lighting || {}) };
  merged.audio = { ...studioDefaults.audio, ...(merged.audio || {}) };
  merged.audio.effects = { ...studioDefaults.audio.effects, ...(merged.audio.effects || {}) };

  state.studio = merged;

  // Jim's Garage restore (older sessions may have marked it removed).
  state.removedExterior = state.removedExterior.filter((item) => {
    const rec = (item ?? {}) as { id?: string; label?: string; key?: string };
    const text = `${rec?.id || ''} ${rec?.label || ''} ${rec?.key || ''}`.toLowerCase().replace(/%20/g, ' ').replace(/%27/g, "'");
    return !text.includes("jim's garage");
  });

  return state;
}
