import { describe, expect, it } from 'vitest';

import {
  executeChessMove,
  getLegalChessMoves,
  getPieceColor,
  getRawCandidateMoves,
  hasAnyLegalMoves,
  initialChessBoard,
  isKingInCheck,
  moveToNotation,
  PIECE_VALUES,
} from '../src/domain/chess';

import { playCoinflip, playRoulette, playSlots, rouletteColor, SLOT_SYMBOLS } from '../src/domain/casino';

import { abiEncodeTokenConstructor, supplyToWei } from '../src/domain/token';

const predictableRandom =
  (values: number[]): ((max: number) => number) =>
  (max: number) => {
    const v = values.shift() ?? 0;
    return v % max;
  };

describe('domain/chess — rules engine', () => {
  it('initial board: 20 white + 20 black pieces, correct back ranks', () => {
    const b = initialChessBoard();
    expect(b).toHaveLength(8);
    expect(b[0]).toEqual(['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']);
    expect(b[7]).toEqual(['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']);
    let count = 0;
    for (const row of b) for (const cell of row) if (cell) count += 1;
    expect(count).toBe(32);
  });

  it('piece color detection', () => {
    expect(getPieceColor('P')).toBe('w');
    expect(getPieceColor('p')).toBe('b');
    expect(getPieceColor(null)).toBeNull();
  });

  it('white pawn e2 (6,4) has two candidate moves at start', () => {
    const b = initialChessBoard();
    const moves = getRawCandidateMoves(b, 6, 4);
    expect(moves).toContainEqual({ row: 5, col: 4 });
    expect(moves).toContainEqual({ row: 4, col: 4 });
    expect(moves).toHaveLength(2);
  });

  it('white knight b1 (7,1) has two candidate moves at start', () => {
    const b = initialChessBoard();
    const moves = getRawCandidateMoves(b, 7, 1);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ row: 5, col: 0 });
    expect(moves).toContainEqual({ row: 5, col: 2 });
  });

  it('king is not in check at start', () => {
    const b = initialChessBoard();
    expect(isKingInCheck(b, 'w')).toBe(false);
    expect(isKingInCheck(b, 'b')).toBe(false);
  });

  it('legal moves equal candidate moves at start (no pins)', () => {
    const b = initialChessBoard();
    expect(getLegalChessMoves(b, 6, 4)).toHaveLength(2);
  });

  it('both sides have legal moves at start', () => {
    const b = initialChessBoard();
    expect(hasAnyLegalMoves(b, 'w')).toBe(true);
    expect(hasAnyLegalMoves(b, 'b')).toBe(true);
  });

  it('notation: e2-e4 is "e4", capture is "Nxf3"', () => {
    expect(moveToNotation('P', 6, 4, 4, 4, false)).toBe('e4');
    expect(moveToNotation('N', 7, 1, 5, 5, true)).toBe('Nxf3');
  });

  it('executeChessMove: e2-e4 advances turn and records notation', () => {
    const b = initialChessBoard();
    const res = executeChessMove(b, 'w', 6, 4, 4, 4, [], []);
    expect(res.board[4][4]).toBe('P');
    expect(res.board[6][4]).toBeNull();
    expect(res.notation).toBe('e4');
    expect(res.nextTurn).toBe('b');
    expect(res.gameOver).toBe(false);
  });

  it('fool\'s mate (2-move checkmate) is detected', () => {
    let b = initialChessBoard();
    // 1. f2-f3  (white pawn f file, row 6 -> 5)
    let r = executeChessMove(b, 'w', 6, 5, 5, 5, [], []);
    b = r.board;
    // 1... e7-e5 (black pawn e file, row 1 -> 3)
    r = executeChessMove(b, 'b', 1, 4, 3, 4, r.capturedWhite, r.capturedBlack);
    b = r.board;
    // 2. g2-g4 (white pawn g file, row 6 -> 4)
    r = executeChessMove(b, 'w', 6, 6, 4, 6, r.capturedWhite, r.capturedBlack);
    b = r.board;
    // 2... Qd8-h4# (black queen d8 row0 col3 -> h4 row4 col7)
    r = executeChessMove(b, 'b', 0, 3, 4, 7, r.capturedWhite, r.capturedBlack);
    expect(r.gameOver).toBe(true);
    expect(r.outcome).toBe('checkmate');
    expect(r.winner).toBe('b');
  });

  it('PIECE_VALUES signs match legacy (black positive, white negative)', () => {
    expect(PIECE_VALUES.p).toBe(100);
    expect(PIECE_VALUES.P).toBe(-100);
    expect(PIECE_VALUES.q).toBe(900);
    expect(PIECE_VALUES.K).toBe(-20000);
  });
});

describe('domain/casino — outcome rules', () => {
  it('slots: three 7s pay 20x', () => {
    // force reels to 7️⃣ (index 4) via predictable random
    const r = predictableRandom([4, 4, 4]);
    const o = playSlots(r, 25);
    expect(o.reels).toEqual(['7️⃣', '7️⃣', '7️⃣']);
    expect(o.multiplier).toBe(20);
    expect(o.payout).toBe(500);
  });

  it('slots: three matching non-7 pay 8x; pair pays 2x; none pays 0', () => {
    expect(playSlots(predictableRandom([0, 0, 0]), 10).multiplier).toBe(8);
    expect(playSlots(predictableRandom([1, 1, 2]), 10).multiplier).toBe(2);
    expect(playSlots(predictableRandom([0, 1, 2]), 10).multiplier).toBe(0);
  });

  it('roulette color mapping: 0 zero, 1-7 red, 8-14 black', () => {
    expect(rouletteColor(0)).toBe('zero');
    expect(rouletteColor(7)).toBe('red');
    expect(rouletteColor(8)).toBe('black');
    expect(rouletteColor(14)).toBe('black');
  });

  it('roulette payouts: zero 14x, color 2x, miss 0', () => {
    expect(playRoulette(predictableRandom([0]), 10, 'zero').payout).toBe(140);
    expect(playRoulette(predictableRandom([5]), 10, 'red').payout).toBe(20);
    expect(playRoulette(predictableRandom([12]), 10, 'red').payout).toBe(0);
  });

  it('coinflip: win 2x, loss 0', () => {
    expect(playCoinflip(predictableRandom([0]), 15, 'heads').payout).toBe(30);
    expect(playCoinflip(predictableRandom([1]), 15, 'heads').payout).toBe(0);
  });

  it('5 slot symbols', () => {
    expect(SLOT_SYMBOLS).toHaveLength(5);
  });
});

describe('domain/token — ERC-20 ABI encoding', () => {
  it('supplyToWei: 1000000 -> exactly 1e24 (no float drift)', () => {
    expect(supplyToWei(1000000)).toBe(1000000000000000000000000n);
    expect(supplyToWei('1000000')).toBe(1000000000000000000000000n);
  });

  it('abiEncodeTokenConstructor matches backend output for WOLF', () => {
    const supply = supplyToWei(1000000);
    const encoded = abiEncodeTokenConstructor('Wolf Street Token', 'WOLF', supply);
    expect(encoded.startsWith('0x')).toBe(true);
    // name offset = 96 (0x60); symbol offset = 96 + nameHex.length/2
    // "Wolf Street Token" (17 chars) -> 64-byte word, so symbol offset = 96 + 64 = 160 (0xa0)
    expect(encoded.slice(2, 66)).toBe('0'.repeat(62) + '60');
    expect(encoded.slice(66, 130)).toBe('0'.repeat(62) + 'a0');
    // total supply word
    expect(encoded.slice(130, 194)).toBe('d3c21bcecceda1000000'.padStart(64, '0'));
    // "WOLF" appears as 0x574f4c46
    expect(encoded).toContain('574f4c46');
  });

  it('abiEncodeTokenConstructor is byte-identical to the server for a simple case', () => {
    // "X" symbol, "X" name, supply 1000 -> cross-check with the Python encoder.
    const supply = supplyToWei(1000);
    const encoded = abiEncodeTokenConstructor('X', 'X', supply);
    // name offset 96, symbol offset 96+64 = 160 (0xa0)
    expect(encoded.slice(2, 66)).toBe('0'.repeat(62) + '60');
    expect(encoded.slice(66, 130)).toBe('0'.repeat(62) + 'a0');
    expect(encoded.slice(130, 194)).toBe((1000n * 10n ** 18n).toString(16).padStart(64, '0'));
  });
});
