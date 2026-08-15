import { describe, expect, it } from 'vitest';
import { getStudioSchema, validateStudioObject } from '../src/engine/projects/StudioSchemas';

describe('StudioObject schemas', () => {
  it('provides visual field metadata for every supported object type', () => {
    expect(getStudioSchema('npc').fields.map((field) => field.key)).toContain('sprite');
    expect(getStudioSchema('token').graphRole).toBe('economy');
    expect(getStudioSchema('sound-zone').fields.find((field) => field.key === 'volume')?.widget).toBe('range');
  });

  it('reports schema validation diagnostics without preventing drafts', () => {
    const diagnostics = validateStudioObject({ id: 'token-x', kind: 'token', name: 'X', data: { decimals: 999 }, references: [], updatedAt: 1 });
    expect(diagnostics.map((diagnostic) => diagnostic.message)).toContain('Contract is required.');
    expect(diagnostics.some((diagnostic) => diagnostic.field === 'decimals')).toBe(true);
  });
});
