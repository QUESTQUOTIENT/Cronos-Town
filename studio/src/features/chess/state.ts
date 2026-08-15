/**
 * features/chess/state.ts — pure state + reducers.
 */
import type { ChessLevel, ChessState } from './types';

export function initialState(): ChessState {
  return { level: 'easy', open: false, history: [], capturedWhite: [], capturedBlack: [] };
}

export function normalizeLevel(level: string): ChessLevel {
  return ['beginner', 'easy', 'tuff', 'extreme'].includes(level) ? (level as ChessLevel) : 'easy';
}
