/**
 * features/chess/controller.ts — the Rongoon AI move selection + commentary.
 *
 * Faithful port of `makeRongoonChessMove` from index.html (beginner = random,
 * easy = best capture else random, tuff/extreme = 1-ply minimax via
 * `evalChessBoard`, extreme adds check + capture bonuses). Consumes
 * `domain/chess.ts` for move gen + evaluation.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../../engine/ports';
import type { ChessBoard } from '../../domain/chess';
import {
  evalChessBoard,
  getLegalChessMoves,
  getPieceColor,
  isKingInCheck,
  PIECE_VALUES,
} from '../../domain/chess';
import type { ChessLevel, ChessMove } from './types';

export interface ChessDependencies {
  bus: EventBus;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  randomInt: (max: number) => number;
  /** When black (Rongoon) delivers checkmate, award the player the grandmaster reward. */
  onPlayerCheckmate: () => void;
}

export const RONGOON_COMMENTARY: string[] = [
  '"My engine sees every tactical line on the board!"',
  '"A calculated advance! Can your king withstand the pressure?"',
  '"Every square is a battleground, traveler!"',
  '"The extreme depths of my engine have chosen this move!"',
];

export class ChessController {
  constructor(private readonly deps: ChessDependencies) {}

  /** All legal moves for a color (mirrors the enumeration in makeRongoonChessMove). */
  allMovesFor(board: ChessBoard, color: 'w' | 'b'): ChessMove[] {
    const allMoves: ChessMove[] = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if (getPieceColor(board[r][c]) === color) {
          const legals = getLegalChessMoves(board, r, c);
          legals.forEach((dest) => allMoves.push({ fromRow: r, fromCol: c, toRow: dest.row, toCol: dest.col }));
        }
      }
    }
    return allMoves;
  }

  /**
   * Choose Rongoon's (black) move for the given board + level. Returns null if
   * black has no legal moves. Mirrors `makeRongoonChessMove` move-selection.
   */
  chooseMove(board: ChessBoard, level: ChessLevel): ChessMove | null {
    const allMoves = this.allMovesFor(board, 'b');
    if (!allMoves.length) return null;

    let chosen = allMoves[0];
    if (level === 'beginner') {
      chosen = allMoves[this.deps.randomInt(allMoves.length)];
    } else if (level === 'easy') {
      const captures = allMoves.filter((m) => board[m.toRow][m.toCol] !== null);
      if (captures.length > 0) {
        captures.sort(
          (a, b) => (PIECE_VALUES[board[b.toRow][b.toCol] as string] || 0) - (PIECE_VALUES[board[a.toRow][a.toCol] as string] || 0),
        );
        chosen = captures[0];
      } else {
        chosen = allMoves[this.deps.randomInt(allMoves.length)];
      }
    } else {
      let bestEval = -999999;
      allMoves.forEach((m) => {
        const nextBoard = board.map((row) => [...row]);
        nextBoard[m.toRow][m.toCol] = nextBoard[m.fromRow][m.fromCol];
        nextBoard[m.fromRow][m.fromCol] = null;
        let evalScore = evalChessBoard(nextBoard);
        if (level === 'extreme') {
          if (isKingInCheck(nextBoard, 'w')) evalScore += 50;
          if (board[m.toRow][m.toCol]) evalScore += 40;
        }
        if (evalScore > bestEval) {
          bestEval = evalScore;
          chosen = m;
        }
      });
    }
    return chosen;
  }

  /** A random commentary line (mirrors the legacy random pick). */
  commentary(): string {
    return RONGOON_COMMENTARY[this.deps.randomInt(RONGOON_COMMENTARY.length)];
  }

  /** The grandmaster reward text + audit (mirrors the player-checkmate branch). */
  awardGrandmaster(): void {
    this.deps.onPlayerCheckmate();
    this.deps.audit.record('CHESS_GRANDMASTER_REWARD', 'Defeated Rongoon on 64 squares', +500);
    this.deps.haptics.effect('place');
  }
}
