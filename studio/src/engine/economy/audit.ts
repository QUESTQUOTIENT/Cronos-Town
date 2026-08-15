/**
 * engine/economy/audit.ts — immutable economy audit ledger (pure core).
 *
 * Behavior-preserving port of `window.__EconomyAuditLog` (Phase 3.3) from
 * index.html. The entry shape, the random id/hash generation, the unshift
 * (newest-first) ordering, and the 100-entry persistence cap are all kept.
 *
 * Persistence is injected (a `store` callback) so the module stays testable;
 * the browser adapter wires it to `localStorage` and mirrors to
 * `window.__EconomyAuditLog` for backward compatibility.
 */

export interface AuditEntry {
  id: string;
  time: string;
  type: string;
  details: string;
  amount: number;
  currency: string;
  hash: string;
}

export interface AuditPersistence {
  /** Persist the newest-first slice (legacy cap: 100). */
  save(entries: AuditEntry[]): void;
  /** Load the previously persisted entries (newest-first). */
  load(): AuditEntry[];
}

export interface AuditRandomness {
  int(max: number): number;
  hex(length: number): string;
}

/** Legacy randomness (Math.random-based, mirrors index.html). */
export const mathRandom: AuditRandomness = {
  int(max: number): number {
    return Math.floor(Math.random() * max);
  },
  hex(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  },
};

export const AUDIT_PERSIST_CAP = 100;

export class AuditLedger {
  private log: AuditEntry[] = [];

  constructor(
    private readonly store: AuditPersistence,
    private readonly random: AuditRandomness = mathRandom,
  ) {}

  /** Newest-first entries. */
  entries(): AuditEntry[] {
    return this.log;
  }

  /** Record an entry (unshift newest-first), persist capped slice, return entry. */
  record(type: string, details: string, amount: number, currency = 'Demo Chips'): AuditEntry {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${this.random.int(10000)}`,
      time: new Date().toISOString(),
      type,
      details,
      amount,
      currency,
      hash: '0x' + this.random.hex(16),
    };
    this.log.unshift(entry);
    try {
      this.store.save(this.log.slice(0, AUDIT_PERSIST_CAP));
    } catch {
      /* ignore persistence errors (legacy behavior) */
    }
    return entry;
  }

  /** Load persisted entries (mirrors `window.__EconomyAuditLog.load()`). */
  load(): void {
    try {
      this.log = this.store.load();
    } catch {
      this.log = [];
    }
  }
}
