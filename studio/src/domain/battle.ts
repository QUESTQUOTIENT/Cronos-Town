/**
 * domain/battle.ts — Wolfies 7-element type system + trait mapping + starter.
 *
 * Behavior-preserving port of the legacy `WOLFIE_TYPE_SYSTEM`,
 * `WOLFIE_TRAIT_TYPE_MAP`, `getWolfieTraitData`, and `DEFAULT_STARTER_WOLFIE`
 * from index.html. 65 skin traits mapped into 7 Pokémon-style elemental types.
 */

export type WolfieElementKey = 'FIRE' | 'WATER' | 'EARTH' | 'DRAGON' | 'ELECTRIC' | 'DARK' | 'FIGHTING';

export interface WolfieStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
}

export interface WolfieTypeInfo {
  element: string;
  stats: WolfieStats;
  abilities: string[];
}

export interface WolfieTraitData {
  element: string;
  stats: WolfieStats;
  abilities: string[];
  typeKey: WolfieElementKey;
}

export interface WolfieCard {
  tokenId: string;
  name: string;
  collection: string;
  contract: string;
  species: string;
  element: string;
  suitTrait: string;
  trait: string;
  isDefaultStarter?: boolean;
  stats: WolfieStats;
  abilities: string[];
  evolutionPath: string;
  pveLevel: number;
  pvpRating: number;
  owner: string;
}

export const WOLFIE_TYPE_SYSTEM: Record<WolfieElementKey, WolfieTypeInfo> = {
  FIRE: { element: '🔥 FIRE TYPE', stats: { hp: 115, maxHp: 115, atk: 100, def: 75, spd: 95, crit: 20 }, abilities: ['🔥 INFERNO FANG', '🔥 CRIMSON BLAZE', '🔥 FLAME OVERCLOCK', '🔥 SOLAR SCORCH'] },
  WATER: { element: '💧 WATER TYPE', stats: { hp: 130, maxHp: 130, atk: 80, def: 95, spd: 80, crit: 10 }, abilities: ['💧 TIDAL CHOMP', '💧 SHARK TSUNAMI', '💧 AQUA BARRIER', '💧 HYDRO CANNON'] },
  EARTH: { element: '🌿 EARTH TYPE', stats: { hp: 140, maxHp: 140, atk: 85, def: 90, spd: 70, crit: 10 }, abilities: ['🌿 SAVAGE HOWL', '🌿 LION CLAW', '🌿 TERRA SHIELD', '🌿 GAIA STOMP'] },
  DRAGON: { element: '🐉 DRAGON TYPE', stats: { hp: 125, maxHp: 125, atk: 95, def: 85, spd: 85, crit: 20 }, abilities: ['🐉 DRAGON CLAW', '🐉 GOLDEN BREATH', '🐉 ROYALTIES BLESSING', '🐉 MYTHIC WRATH'] },
  ELECTRIC: { element: '⚡ ELECTRIC TYPE', stats: { hp: 110, maxHp: 110, atk: 90, def: 70, spd: 110, crit: 25 }, abilities: ['⚡ THUNDER BITE', '⚡ ASTRO SURGE', '⚡ VOLTAGE OVERCLOCK', '⚡ PLASMA STORM'] },
  DARK: { element: '🌑 DARK TYPE', stats: { hp: 115, maxHp: 115, atk: 95, def: 75, spd: 95, crit: 25 }, abilities: ['🌑 SHADOW SLASH', '🌑 NIGHTSHADE CLAW', '🌑 STEALTH CLOAK', '🌑 PHANTOM STRIKE'] },
  FIGHTING: { element: '⚔️ FIGHTING TYPE', stats: { hp: 125, maxHp: 125, atk: 95, def: 85, spd: 80, crit: 15 }, abilities: ['⚔️ COMBAT PUNCH', '⚔️ ARCHER SHOT', '⚔️ POLICE SHIELD', '⚔️ TACTICAL KNOCKOUT'] },
};

export const WOLFIE_TRAIT_TYPE_MAP: Record<string, WolfieElementKey> = {
  'Pharaoh Suit': 'FIRE', Pharaoh: 'FIRE', 'Crimson Shawl': 'FIRE', 'Pepe Hoody': 'FIRE', 'Hamzat Suit': 'FIRE',
  'Black Vest': 'FIRE', 'Black Zipper Jacket': 'FIRE', 'Bomber Jacket': 'FIRE', 'Brown Hoody': 'FIRE', 'Duck Hoody': 'FIRE',
  Sharky: 'WATER', Sailor: 'WATER', Hawaii: 'WATER', 'Blue Hoody': 'WATER', 'Blue Jacket': 'WATER',
  'Navy Combat Vest': 'WATER', 'Indigo T': 'WATER', 'Green Combat Vest': 'WATER',
  'Sheep Skin': 'EARTH', Lion: 'EARTH', 'Wolf Bane': 'EARTH', 'Wolfman Suit': 'EARTH', Rasta: 'EARTH',
  Dungarees: 'EARTH', 'Patch Shirt': 'EARTH', 'Brown Shirt': 'EARTH', 'Brown Chest Plate': 'EARTH', 'Wolf T': 'EARTH',
  'Super Wolf Suit': 'DRAGON', 'Golden Armour': 'DRAGON', Illuminati: 'DRAGON', '1/1': 'DRAGON', Count: 'DRAGON',
  Kimono: 'DRAGON', 'Burgundy Suit': 'DRAGON', Suit: 'DRAGON', 'Burgundy Hoody': 'DRAGON',
  Astronaut: 'ELECTRIC', 'Star Pj': 'ELECTRIC', '212shirt': 'ELECTRIC', 'Wolf Pj': 'ELECTRIC', White: 'ELECTRIC',
  'White Jersey': 'ELECTRIC', 'White Shirt': 'ELECTRIC', 'Pink Hoody': 'ELECTRIC',
  Ninja: 'DARK', 'Joker Suit': 'DARK', Mummy: 'DARK', Elf: 'DARK', 'Dark Grey Jacket': 'DARK',
  'Black Jacket': 'DARK', Maid: 'DARK', None313: 'DARK',
  Police: 'FIGHTING', Archer: 'FIGHTING', 'Jock Jersey': 'FIGHTING', 'Jock Jacket': 'FIGHTING', Toga: 'FIGHTING',
  'Wizard School': 'FIGHTING', 'Shirt And Tie': 'FIGHTING',
};

export function getWolfieTraitData(traitName: string): WolfieTraitData {
  const typeKey = WOLFIE_TRAIT_TYPE_MAP[traitName] || 'ELECTRIC';
  const typeInfo = WOLFIE_TYPE_SYSTEM[typeKey] || WOLFIE_TYPE_SYSTEM.ELECTRIC;
  return {
    element: typeInfo.element,
    stats: { ...typeInfo.stats },
    abilities: [...typeInfo.abilities],
    typeKey,
  };
}

export const DEFAULT_STARTER_WOLFIE: WolfieCard = {
  tokenId: '000',
  name: '⚡ Starter Wolfie #000',
  collection: 'Wolfies (Default Starter)',
  contract: '0x719fdfb0ba006747a83438cc8900c8a2b35e0aff',
  species: 'Wolfie',
  element: '⚡ ELECTRIC TYPE',
  suitTrait: 'Astronaut',
  trait: 'Astronaut',
  isDefaultStarter: true,
  stats: { hp: 110, maxHp: 110, atk: 90, def: 70, spd: 110, crit: 25 },
  abilities: ['⚡ THUNDER BITE', '⚡ ASTRO SURGE', '⚡ VOLTAGE OVERCLOCK', '⚡ PLASMA STORM'],
  evolutionPath: 'Lv. 1 -> Lv. 16 (Stat/Sprite Upgrade) -> Lv. 36 (Major Evo + Passive)',
  pveLevel: 1,
  pvpRating: 1000,
  owner: 'Player',
};

export const WOLFIE_SKINS_LIST: string[] = Object.keys(WOLFIE_TRAIT_TYPE_MAP);
