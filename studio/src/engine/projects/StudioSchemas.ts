/**
 * StudioObject schemas are the creator contract. Editors render these fields,
 * validators diagnose them, and export/runtime consumers share the same names.
 */
import type { StudioObjectKind, StudioObject } from './StudioProject';

export type StudioFieldWidget = 'text' | 'number' | 'textarea' | 'asset' | 'reference' | 'select' | 'range';

export interface StudioFieldSchema {
  key: string;
  label: string;
  widget: StudioFieldWidget;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface StudioObjectSchema {
  kind: StudioObjectKind;
  title: string;
  fields: StudioFieldSchema[];
  graphRole: string;
}

const schema = (kind: StudioObjectKind, title: string, graphRole: string, fields: StudioFieldSchema[]): StudioObjectSchema => ({ kind, title, graphRole, fields });

export const STUDIO_SCHEMAS: Record<StudioObjectKind, StudioObjectSchema> = {
  ui: schema('ui', 'UI Screen', 'screen', [
    { key: 'theme', label: 'Theme', widget: 'select', options: ['gba-dark', 'light', 'high-contrast'] },
    { key: 'layout', label: 'Layout', widget: 'select', options: ['gba-20x14', 'responsive'] },
  ]),
  'ui-component': schema('ui-component', 'UI Component', 'component', [
    { key: 'type', label: 'Component type', widget: 'select', options: ['button', 'panel', 'dialogue', 'inventory', 'wallet', 'battle'] },
    { key: 'label', label: 'Label', widget: 'text' }, { key: 'x', label: 'Grid X', widget: 'number', min: 0, max: 19 }, { key: 'y', label: 'Grid Y', widget: 'number', min: 0, max: 13 },
  ]),
  npc: schema('npc', 'NPC', 'actor', [
    { key: 'sprite', label: 'Sprite', widget: 'asset' }, { key: 'portrait', label: 'Portrait', widget: 'asset' }, { key: 'dialogue', label: 'Dialogue', widget: 'textarea' },
    { key: 'location', label: 'Location', widget: 'reference' }, { key: 'personality', label: 'AI personality', widget: 'text' }, { key: 'voice', label: 'Voice', widget: 'asset' },
  ]),
  story: schema('story', 'Story Chapter', 'narrative', [{ key: 'summary', label: 'Summary', widget: 'textarea' }]),
  dialogue: schema('dialogue', 'Dialogue Node', 'narrative', [{ key: 'speaker', label: 'Speaker', widget: 'reference' }, { key: 'lines', label: 'Lines', widget: 'textarea' }, { key: 'choices', label: 'Choices', widget: 'textarea' }]),
  cutscene: schema('cutscene', 'Cutscene', 'narrative', [{ key: 'timeline', label: 'Timeline', widget: 'reference' }, { key: 'skipAllowed', label: 'Skip allowed', widget: 'select', options: ['true', 'false'] }]),
  quest: schema('quest', 'Quest', 'narrative', [{ key: 'objectives', label: 'Objectives', widget: 'textarea' }, { key: 'rewards', label: 'Rewards', widget: 'textarea' }, { key: 'consequences', label: 'Consequences', widget: 'textarea' }]),
  world: schema('world', 'World', 'world', [{ key: 'tileset', label: 'Tileset', widget: 'asset' }, { key: 'weather', label: 'Weather', widget: 'select', options: ['clear', 'rain', 'snow', 'storm'] }]),
  tile: schema('tile', 'Tile', 'world', [{ key: 'sprite', label: 'Sprite', widget: 'asset' }, { key: 'collision', label: 'Collision', widget: 'select', options: ['none', 'solid', 'water'] }]),
  'world-state': schema('world-state', 'World State', 'state', [{ key: 'variable', label: 'Variable', widget: 'text', required: true }, { key: 'value', label: 'Value', widget: 'text' }]),
  network: schema('network', 'Blockchain Network', 'network', [{ key: 'chainId', label: 'Chain ID', widget: 'number', required: true, min: 1 }, { key: 'rpcUrl', label: 'RPC URL', widget: 'text', required: true }, { key: 'currency', label: 'Currency', widget: 'text' }]),
  token: schema('token', 'Token', 'economy', [{ key: 'contract', label: 'Contract', widget: 'text', required: true }, { key: 'symbol', label: 'Symbol', widget: 'text', required: true }, { key: 'decimals', label: 'Decimals', widget: 'number', min: 0, max: 255 }]),
  economy: schema('economy', 'Economy', 'economy', [{ key: 'currencyToken', label: 'Currency token', widget: 'reference' }, { key: 'rewardMultiplier', label: 'Reward multiplier', widget: 'number', min: 0 }]),
  wallet: schema('wallet', 'Wallet', 'economy', [{ key: 'adapter', label: 'Wallet adapter', widget: 'select', options: ['browser', 'walletconnect', 'custodial'] }]),
  marketplace: schema('marketplace', 'Marketplace', 'economy', [{ key: 'currencyToken', label: 'Currency token', widget: 'reference' }, { key: 'feePercent', label: 'Fee percent', widget: 'number', min: 0, max: 100 }]),
  'nft-collection': schema('nft-collection', 'NFT Collection', 'collection', [{ key: 'contract', label: 'Contract', widget: 'text', required: true }, { key: 'metadataUri', label: 'Metadata URI', widget: 'text' }]),
  character: schema('character', 'Blockchain Character', 'actor', [{ key: 'tokenId', label: 'Token ID', widget: 'text' }, { key: 'sprite', label: 'Sprite', widget: 'asset' }, { key: 'portrait', label: 'Portrait', widget: 'asset' }, { key: 'owner', label: 'Wallet owner', widget: 'text' }]),
  audio: schema('audio', 'Audio Event', 'audio', [{ key: 'source', label: 'Audio source', widget: 'asset' }, { key: 'volume', label: 'Volume', widget: 'range', min: 0, max: 1 }]),
  'sound-zone': schema('sound-zone', 'Audio Zone', 'audio', [{ key: 'music', label: 'Music', widget: 'asset' }, { key: 'ambience', label: 'Ambience', widget: 'asset' }, { key: 'volume', label: 'Volume', widget: 'range', min: 0, max: 1 }, { key: 'triggers', label: 'Triggers', widget: 'textarea' }]),
  'ai-agent': schema('ai-agent', 'AI Agent', 'ai', [{ key: 'role', label: 'Role', widget: 'text' }, { key: 'memory', label: 'Memory', widget: 'textarea' }]),
  automation: schema('automation', 'Automation', 'automation', [{ key: 'trigger', label: 'Trigger', widget: 'text' }, { key: 'actions', label: 'Actions', widget: 'textarea' }]),
};

export interface StudioDiagnostic { field?: string; severity: 'error' | 'warning'; message: string; }
export function getStudioSchema(kind: StudioObjectKind): StudioObjectSchema { return STUDIO_SCHEMAS[kind]; }
export function validateStudioObject(object: StudioObject): StudioDiagnostic[] {
  const result: StudioDiagnostic[] = [];
  for (const field of getStudioSchema(object.kind).fields) {
    const value = object.data[field.key];
    if (field.required && (value === undefined || value === null || value === '')) result.push({ field: field.key, severity: 'error', message: `${field.label} is required.` });
    if (field.widget === 'number' || field.widget === 'range') {
      const number = Number(value);
      if (value !== undefined && (!Number.isFinite(number) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max))) result.push({ field: field.key, severity: 'error', message: `${field.label} is outside its allowed range.` });
    }
  }
  for (const reference of object.references) if (!reference.trim()) result.push({ severity: 'warning', message: 'An empty reference was ignored.' });
  return result;
}
