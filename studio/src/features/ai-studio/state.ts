/**
 * features/ai-studio/state.ts — pure state + reducers.
 */
import type { AiStudioState } from './types';

export function initialState(): AiStudioState {
  return { role: 'coding', baseUrl: '', apiKey: '', model: '', open: false };
}

/** Trim trailing slashes from a base URL (mirrors `saveAiConfig`). */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}
