/**
 * engine/serialization/Versioned.ts — the versioned serialization layer.
 *
 * Every major system (scene, entity, project, workspace, asset, UI) serializes
 * through a versioned envelope so data can migrate across engine versions. A
 * `Versioned<T>` carries a schema version + payload; migration functions map
 * old versions to the current one.
 *
 * Pure + deterministic. JSON-safe.
 */

export interface Versioned<T> {
  /** Schema version of this payload. */
  version: number;
  payload: T;
}

export type Migration<T> = (payload: unknown) => T;

export class SerializationRegistry<T> {
  private readonly migrations = new Map<number, Migration<T>>();
  private currentVersion: number;

  constructor(currentVersion: number) {
    this.currentVersion = currentVersion;
  }

  /** Register a migration that upgrades FROM `fromVersion` to `fromVersion + 1`. */
  registerMigration(fromVersion: number, migrate: Migration<T>): void {
    this.migrations.set(fromVersion, migrate);
  }

  /** The current schema version. */
  get version(): number {
    return this.currentVersion;
  }

  /** Wrap a payload in the current-version envelope. */
  wrap(payload: T): Versioned<T> {
    return { version: this.currentVersion, payload };
  }

  /** Unwrap + migrate a (possibly old) envelope to the current version. */
  unwrap(envelope: Versioned<unknown> | unknown): T | null {
    const env = envelope as Versioned<unknown>;
    const rawVersion = typeof env?.version === 'number' ? env.version : 1;
    let payload = env?.payload;
    if (!payload && rawVersion === 1) {
      // Legacy shapes without an envelope are treated as version-1 payloads.
      payload = env;
    }
    for (let v = rawVersion; v < this.currentVersion; v += 1) {
      const migrate = this.migrations.get(v);
      if (!migrate) return null; // missing migration chain
      payload = migrate(payload);
    }
    return payload as T;
  }
}
