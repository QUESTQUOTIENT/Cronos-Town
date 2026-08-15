import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../src/engine/ports';
import { createBattleCardsFeature } from '../src/features/battle-cards';
import { DEFAULT_STARTER_WOLFIE, type WolfieCard } from '../src/domain/battle';

function noopAudit(): AuditPort {
  return { record: () => {} };
}
function noopToast(): ToastPort {
  return { notify: () => {} };
}
function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}

function realWolfie(tokenId: string, suitTrait: string): WolfieCard {
  return {
    tokenId,
    name: `⚡ Wolfie #${tokenId}`,
    collection: 'Wolfies (Cronos Mainnet)',
    contract: '0x719fdfb0ba006747a83438cc8900c8a2b35e0aff',
    species: 'Wolfie',
    element: '⚡ ELECTRIC TYPE',
    suitTrait,
    trait: suitTrait,
    stats: { hp: 110, maxHp: 110, atk: 90, def: 70, spd: 110, crit: 25 },
    abilities: ['⚡ THUNDER BITE', '⚡ ASTRO SURGE', '⚡ VOLTAGE OVERCLOCK', '⚡ PLASMA STORM'],
    evolutionPath: 'Lv. 1 -> Lv. 16 (Stat/Sprite Upgrade) -> Lv. 36 (Major Evo + Passive)',
    pveLevel: 1,
    pvpRating: 1000,
    owner: '0xabc',
  };
}

function makeBootstrap(overrides: Partial<Parameters<typeof createBattleCardsFeature>[0]> = {}) {
  let ids = 0;
  return {
    bus: new EventBus(),
    toast: noopToast(),
    audit: noopAudit(),
    haptics: noopHaptics(),
    scan: async () => ({ nfts: [], count: 0, message: '' }),
    wallet: () => '0xabc',
    nextId: () => `000${ids++}`.slice(-4),
    isWalletConnected: () => true,
    ...overrides,
  };
}

describe('features/battle-cards — scan/convert/equip (legacy parity)', () => {
  it('starts with the default starter and reports "user still dont have any wolfie yet"', () => {
    const f = createBattleCardsFeature(makeBootstrap());
    expect(f.state.scanned).toEqual([DEFAULT_STARTER_WOLFIE]);
    expect(f.controller.scanMessage()).toContain('user still dont have any wolfie yet');
  });

  it('scan populates real NFTs and reports the found count', async () => {
    const f = createBattleCardsFeature(
      makeBootstrap({
        scan: async () => ({ nfts: [realWolfie('1', 'Astronaut'), realWolfie('2', 'Pharaoh')], count: 2, message: 'ok' }),
      }),
    );
    await f.controller.scan();
    expect(f.state.scanned).toHaveLength(2);
    expect(f.controller.scanMessage()).toContain('Found 2 Wolfies NFTs');
  });

  it('scan falling back to empty grants the default starter', async () => {
    const f = createBattleCardsFeature(
      makeBootstrap({ scan: async () => ({ nfts: [], count: 0, message: '' }) }),
    );
    await f.controller.scan();
    expect(f.state.scanned).toEqual([DEFAULT_STARTER_WOLFIE]);
  });

  it('suitTraitFor auto-assigns from suit trait (or defaults to Astronaut)', () => {
    const f = createBattleCardsFeature(makeBootstrap());
    expect(f.controller.suitTraitFor(realWolfie('1', 'Pharaoh'))).toBe('Pharaoh');
    expect(f.controller.suitTraitFor(realWolfie('2', ''))).toBe('Astronaut');
  });

  it('convert requires a selection; otherwise errors', () => {
    const f = createBattleCardsFeature(makeBootstrap());
    expect(f.controller.convert('Shadow Fang')).toBe(false);
    expect(f.state.storage).toHaveLength(0);
  });

  it('convert builds a card with the element name + custom name + trait', async () => {
    const f = createBattleCardsFeature(
      makeBootstrap({ scan: async () => ({ nfts: [realWolfie('7', 'Astronaut')], count: 1, message: 'ok' }) }),
    );
    await f.controller.scan();
    f.controller.select('7');
    expect(f.controller.convert('Shadow Fang')).toBe(true);
    expect(f.state.storage).toHaveLength(1);
    const card = f.state.storage[0];
    expect(card.name).toBe('⚡ Shadow Fang (Astronaut)');
    expect(card.element).toBe('⚡ ELECTRIC TYPE');
    expect(card.stats.hp).toBe(110);
    expect(card.pveLevel).toBe(1);
    expect(card.pvpRating).toBe(1000);
    expect(card.abilities).toHaveLength(4);
  });

  it('equip caps the party at 3 and rejects a 4th', async () => {
    const f = createBattleCardsFeature(
      makeBootstrap({
        scan: async () => ({
          nfts: [realWolfie('1', 'Astronaut'), realWolfie('2', 'Pharaoh'), realWolfie('3', 'Ninja'), realWolfie('4', 'Police')],
          count: 4,
          message: 'ok',
        }),
      }),
    );
    await f.controller.scan();
    for (const id of ['1', '2', '3', '4']) {
      f.controller.select(id);
      f.controller.convert('');
    }
    // storage has 4 cards
    expect(f.state.storage).toHaveLength(4);

    // equip first 3
    expect(f.controller.equip(f.state.storage[0].id)).toBe(true);
    expect(f.controller.equip(f.state.storage[1].id)).toBe(true);
    expect(f.controller.equip(f.state.storage[2].id)).toBe(true);
    expect(f.state.party).toHaveLength(3);

    // 4th is rejected
    expect(f.controller.equip(f.state.storage[3].id)).toBe(false);
    expect(f.state.party).toHaveLength(3);

    // unequip one, then the 4th fits
    expect(f.controller.unequip(f.state.storage[0].id)).toBe(true);
    expect(f.controller.equip(f.state.storage[3].id)).toBe(true);
    expect(f.state.party).toHaveLength(3);
  });

  it('equip ignores duplicates', () => {
    const f = createBattleCardsFeature(
      makeBootstrap({ scan: async () => ({ nfts: [realWolfie('1', 'Astronaut')], count: 1, message: 'ok' }) }),
    );
    f.controller.scan().then(() => {
      f.controller.select('1');
      f.controller.convert('');
      const card = f.state.storage[0];
      expect(f.controller.equip(card.id)).toBe(true);
      expect(f.controller.equip(card.id)).toBe(false); // duplicate
      expect(f.state.party).toHaveLength(1);
    });
  });

  it('isOnlyStarter detects the default-starter-only case', () => {
    const f = createBattleCardsFeature(makeBootstrap());
    expect(f.controller.scanMessage()).toContain('user still dont have any wolfie yet');
  });
});
