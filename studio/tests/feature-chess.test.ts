import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../src/engine/ports';
import { createChessFeature } from '../src/features/chess';
import { initialChessBoard, evalChessBoard, type ChessBoard } from '../src/domain/chess';

function noopAudit(): AuditPort {
  return { record: () => {} };
}
function noopToast(): ToastPort {
  return { notify: () => {} };
}
function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}

function makeBoard(moves: Array<[number, number, number, number]>): ChessBoard {
  const b = initialChessBoard();
  for (const [fr, fc, tr, tc] of moves) {
    b[tr][tc] = b[fr][fc];
    b[fr][fc] = null;
  }
  return b;
}

const seq = (values: number[]) => (max: number) => (values.shift() ?? 0) % max;

describe('features/chess — Rongoon AI move selection (legacy parity)', () => {
  it('beginner picks a random legal move', () => {
    const f = createChessFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      randomInt: seq([2]), onPlayerCheckmate: () => {},
    });
    // After 1. e4, black has 20 legal replies.
    const board = makeBoard([[6, 4, 4, 4]]);
    const move = f.controller.chooseMove(board, 'beginner');
    expect(move).not.toBeNull();
    // randomInt(20) with seq [2] -> index 2
    const all = f.controller.allMovesFor(board, 'b');
    expect(all).toHaveLength(20);
    expect(move).toEqual(all[2]);
  });

  it('easy capture sort is ascending on (negative) white values (legacy quirk)', () => {
    const f = createChessFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      randomInt: seq([]), onPlayerCheckmate: () => {},
    });
    // Clean board: black queen on e4 can capture white rook (e5, value -500) or white pawn (f3, value -100).
    const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    b[0][0] = 'k'; // black king (far corner)
    b[7][7] = 'K'; // white king
    b[4][4] = 'q'; // black queen e4
    b[3][4] = 'R'; // white rook e5
    b[5][5] = 'P'; // white pawn f3
    // Legacy quirk: the sort is ascending on PIECE_VALUES, and white pieces are
    // negative, so the LOWEST-value capture (pawn, -100) sorts before the rook
    // (-500). Faithful port preserves this exactly.
    const move = f.controller.chooseMove(b, 'easy');
    expect(move).toEqual({ fromRow: 4, fromCol: 4, toRow: 5, toCol: 5 }); // takes the pawn
  });

  it('tuff/extreme pick the minimax-best move (no throw, legal)', () => {
    const f = createChessFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      randomInt: seq([]), onPlayerCheckmate: () => {},
    });
    const board = makeBoard([[6, 4, 4, 4]]);
    const move = f.controller.chooseMove(board, 'extreme');
    expect(move).not.toBeNull();
    // verify it's within black's legal moves
    const all = f.controller.allMovesFor(board, 'b');
    expect(all).toContainEqual(move);
  });

  it('returns null when black has no legal moves (back-rank mate)', () => {
    const f = createChessFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      randomInt: seq([]), onPlayerCheckmate: () => {},
    });
    // Back-rank checkmate of the BLACK king: white rook on a8 checks e8; pawns block forward escapes.
    const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    b[0][4] = 'k'; // black king e8
    b[1][3] = 'p'; // black pawn d7
    b[1][4] = 'p'; // black pawn e7
    b[1][5] = 'p'; // black pawn f7
    b[0][0] = 'R'; // white rook a8 (delivers check along rank 8)
    b[7][4] = 'K'; // white king e1
    expect(f.controller.allMovesFor(b, 'b')).toHaveLength(0);
    expect(f.controller.chooseMove(b, 'beginner')).toBeNull();
  });

  it('commentary picks from the 4 known lines', () => {
    const f = createChessFeature({
      bus: new EventBus(), toast: noopToast(), audit: noopAudit(), haptics: noopHaptics(),
      randomInt: seq([3]), onPlayerCheckmate: () => {},
    });
    expect(f.controller.commentary()).toContain('extreme depths of my engine');
  });

  it('awardGrandmaster records the reward and invokes the callback', () => {
    let called = 0;
    const audit: AuditPort = { record: (t) => { if (t === 'CHESS_GRANDMASTER_REWARD') called += 1; } };
    const f = createChessFeature({
      bus: new EventBus(), toast: noopToast(), audit, haptics: noopHaptics(),
      randomInt: seq([]), onPlayerCheckmate: () => { called += 1; },
    });
    f.controller.awardGrandmaster();
    expect(called).toBe(2); // callback + audit
  });
});

describe('domain/chess — evalChessBoard', () => {
  it('evaluates the starting position as 0 (symmetric)', () => {
    expect(evalChessBoard(initialChessBoard())).toBe(0);
  });

  it('favors the side with more material', () => {
    const b = initialChessBoard();
    b[7][0] = null; // white loses a rook (-500)
    const score = evalChessBoard(b);
    // black is maximizing, so losing white material makes score more positive
    expect(score).toBeGreaterThan(0);
  });
});
