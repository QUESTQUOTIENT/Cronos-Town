/** Deterministic identities bridge authored StudioObjects to live/runtime/save/export surfaces. */
import type { StudioObject } from './StudioProject';
import { getStudioSchema } from './StudioSchemas';

export interface RuntimeIdentity {
  runtimeObject: string;
  sceneInstance?: string;
  networkIdentity?: string;
  saveIdentity: string;
  exportIdentity: string;
}

export function runtimeIdentityFor(object: StudioObject): RuntimeIdentity {
  const capabilities = getStudioSchema(object.kind).capabilities;
  const sceneReference = object.references.find((reference) => reference.startsWith('scene-') || reference.startsWith('map-'));
  return {
    runtimeObject: `runtime:${object.kind}:${object.id}`,
    ...(sceneReference ? { sceneInstance: `scene:${sceneReference}:${object.id}` } : {}),
    ...(capabilities.blockchain ? { networkIdentity: String(object.data.contract ?? object.data.chainId ?? object.references.find((reference) => reference.startsWith('network-')) ?? 'unbound') } : {}),
    saveIdentity: `save:v1:${object.id}`,
    exportIdentity: `objects/${object.kind}/${object.id}.json`,
  };
}
