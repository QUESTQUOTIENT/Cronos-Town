/**
 * features/chess/types.ts
 *
 * Public types for the Rongoon chess challenge.
 */

export type ChessLevel = 'beginner' | 'easy' | 'tuff' | 'extreme';

export interface ChessState {
  level: ChessLevel;
  open: boolean;
  history: string[];
  capturedWhite: string[];
  capturedBlack: string[];
}

export interface ChessMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}
