import { describe, expect, it } from 'vitest';

import { AuditLedger, type AuditEntry, type AuditPersistence, type AuditRandomness } from '../src/engine/economy/audit';

function memStore(): { store: AuditPersistence; saved: AuditEntry[][] } {
  let persisted: AuditEntry[] = [];
  const saved: AuditEntry[][] = [];
  const store: AuditPersistence = {
    save(entries) {
      persisted = entries;
      saved.push(entries);
    },
    load() {
      return persisted;
    },
  };
  return { store, saved };
}

function fixedRandom(): AuditRandomness {
  return { int: () => 42, hex: (n) => 'a'.repeat(n) };
}

describe('engine/economy/audit — immutable ledger', () => {
  it('records an entry with id/time/hash, newest first', () => {
    const { store } = memStore();
    const ledger = new AuditLedger(store, fixedRandom());
    ledger.record('TYPE_A', 'detail A', 100);
    ledger.record('TYPE_B', 'detail B', -50);

    const entries = ledger.entries();
    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe('TYPE_B'); // newest first
    expect(entries[1].type).toBe('TYPE_A');
    expect(entries[0].hash).toBe('0x' + 'a'.repeat(16));
    expect(entries[0].id).toContain('audit-');
    expect(entries[0].currency).toBe('Demo Chips');
  });

  it('persists a capped slice of 100 (newest-first)', () => {
    const { store, saved } = memStore();
    const ledger = new AuditLedger(store, fixedRandom());
    for (let i = 0; i < 150; i += 1) ledger.record(`T${i}`, `d${i}`, i);

    const lastSaved = saved[saved.length - 1];
    expect(lastSaved).toHaveLength(100);
    expect(lastSaved[0].type).toBe('T149'); // newest first
    expect(lastSaved[lastSaved.length - 1].type).toBe('T50');
  });

  it('load restores persisted entries', () => {
    const { store } = memStore();
    const ledger = new AuditLedger(store, fixedRandom());
    ledger.record('T1', 'd1', 1);
    ledger.record('T2', 'd2', 2);

    const second = new AuditLedger(store, fixedRandom());
    second.load();
    expect(second.entries()).toHaveLength(2);
    expect(second.entries()[0].type).toBe('T2');
  });

  it('load tolerates a throwing store (empty ledger)', () => {
    const badStore: AuditPersistence = {
      save: () => {
        throw new Error('nope');
      },
      load: () => {
        throw new Error('nope');
      },
    };
    const ledger = new AuditLedger(badStore, fixedRandom());
    // record should not throw (persistence error swallowed)
    ledger.record('T', 'd', 1);
    expect(ledger.entries()).toHaveLength(1);

    const badLoad = new AuditLedger(badStore, fixedRandom());
    badLoad.load();
    expect(badLoad.entries()).toHaveLength(0);
  });
});
