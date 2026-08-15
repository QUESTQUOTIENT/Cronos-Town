import { describe, expect, it } from 'vitest';
import { runtimeIdentityFor } from '../src/engine/projects/RuntimeIdentity';

describe('runtime identity', () => {
  it('gives every StudioObject stable runtime, save, and export identities', () => {
    const identity = runtimeIdentityFor({ id: 'gold', kind: 'token', name: 'Gold', data: { contract: '0xabc' }, references: ['network-cronos'], updatedAt: 1 });
    expect(identity.runtimeObject).toBe('runtime:token:gold');
    expect(identity.networkIdentity).toBe('0xabc');
    expect(identity.saveIdentity).toBe('save:v1:gold');
    expect(identity.exportIdentity).toBe('objects/token/gold.json');
  });
});
