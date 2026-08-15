/**
 * engine/assets/AssetImporter.ts — asset import + validation.
 *
 * Importers validate + normalize an incoming asset and register it in the
 * registry. Kind-specific rules (e.g. sprite sources must be .png / data:image/png,
 * audio must be a supported extension) are enforced here, so the asset pipeline
 * stays consistent regardless of the UI that triggers the import.
 *
 * Pure + deterministic.
 */
import { AssetRegistry, type AssetKind, type AssetRecord } from './AssetRegistry';

export interface ImportInput {
  id: string;
  kind: AssetKind;
  name: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ImportResult {
  ok: boolean;
  asset?: AssetRecord;
  error?: string;
}

const SPRITE_EXTENSIONS = ['.png', '.webp'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

export function validateImport(input: ImportInput): string | null {
  if (!input.id.trim()) return 'Asset id is required.';
  if (!input.name.trim()) return 'Asset name is required.';
  if (!input.source.trim()) return 'Asset source is required.';

  if (input.kind === 'sprite' || input.kind === 'tileset' || input.kind === 'map') {
    const isDataUri = input.source.startsWith('data:image/png;base64,');
    const ext = input.source.slice(input.source.lastIndexOf('.')).toLowerCase();
    if (!isDataUri && !SPRITE_EXTENSIONS.includes(ext)) {
      return `Sprite/tileset/map source must be a PNG data URI or ${SPRITE_EXTENSIONS.join('/')} file.`;
    }
  }

  if (input.kind === 'audio' || input.kind === 'music') {
    const ext = input.source.slice(input.source.lastIndexOf('.')).toLowerCase();
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      return `Audio source must be ${AUDIO_EXTENSIONS.join('/')}.`;
    }
  }

  return null;
}

export class AssetImporter {
  constructor(private readonly registry: AssetRegistry) {}

  /** Validate + import an asset. Returns a result with the asset or an error. */
  import(input: ImportInput): ImportResult {
    const error = validateImport(input);
    if (error) return { ok: false, error };
    if (this.registry.has(input.id)) {
      const updated = this.registry.touch(input.id, input.metadata);
      return { ok: true, asset: updated ?? undefined };
    }
    const asset = this.registry.register({
      id: input.id,
      kind: input.kind,
      name: input.name,
      source: input.source,
      metadata: input.metadata ?? {},
    });
    return { ok: true, asset };
  }
}
