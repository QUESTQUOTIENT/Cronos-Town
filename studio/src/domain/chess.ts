/**
 * domain/chess.ts — Rongoon's chess engine (pure).
 *
 * Behavior-preserving port of the legacy chess rules from index.html:
 * board representation (8x8 of 'PNBRQK'/'pnbrqk'/null), piece-color detection,
 * raw candidate moves, king-in-check detection, legal move filtering,
 * move execution, algebraic notation, and checkmate/stalemate detection.
 *
 * The AI (move *selection*) lives in the feature layer because it reads game
 * state and uses randomness; the pure rules live here.
 */

export type ChessPiece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type ChessBoard = (ChessPiece | null)[][];
export type PieceColor = 'w' | 'b';

export interface ChessMove {
  row: number;
  col: number;
}

export const CHESS_SYMBOLS: Record<string, string> = {
  R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔', P: '♙',
  r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
};

export const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
  P: -100, N: -320, B: -330, R: -500, Q: -900, K: -20000,
};

/**
 * Static board evaluation (mirrors `evalChessBoard`): material + a center-control
 * bonus for knights/bishops/queens (positive for black, negative for white, since
 * black is the maximizing side).
 */
export function evalChessBoard(board: ChessBoard): number {
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const p = board[r][c];
      if (p) {
        score += PIECE_VALUES[p] || 0;
        if (p === 'n' || p === 'b' || p === 'q') {
          const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
          score += (7 - centerDist) * 5;
        }
        if (p === 'N' || p === 'B' || p === 'Q') {
          const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
          score -= (7 - centerDist) * 5;
        }
      }
    }
  }
  return score;
}

export function initialChessBoard(): ChessBoard {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ];
}

export function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((row) => [...row]);
}

export function getPieceColor(piece: ChessPiece | null): PieceColor | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'w' : 'b';
}

export function getRawCandidateMoves(board: ChessBoard, r: number, c: number): ChessMove[] {
  const piece = board[r][c];
  if (!piece) return [];
  const color = getPieceColor(piece) as PieceColor;
  const moves: ChessMove[] = [];
  const addMove = (tr: number, tc: number): boolean => {
    if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) return false;
    const target = board[tr][tc];
    if (target && getPieceColor(target) === color) return false;
    moves.push({ row: tr, col: tc });
    return !target;
  };

  const pLower = piece.toLowerCase();
  if (pLower === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
      moves.push({ row: r + dir, col: c });
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push({ row: r + 2 * dir, col: c });
      }
    }
    [-1, 1].forEach((dc) => {
      const tr = r + dir;
      const tc = c + dc;
      if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
        const target = board[tr][tc];
        if (target && getPieceColor(target) !== color) {
          moves.push({ row: tr, col: tc });
        }
      }
    });
  } else if (pLower === 'n') {
    [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) =>
      addMove(r + dr, c + dc),
    );
  } else if (pLower === 'k') {
    [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) =>
      addMove(r + dr, c + dc),
    );
  } else {
    const dirs: number[][] = [];
    if (pLower === 'b' || pLower === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    if (pLower === 'r' || pLower === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    dirs.forEach(([dr, dc]) => {
      let tr = r + dr;
      let tc = c + dc;
      while (addMove(tr, tc)) {
        tr += dr;
        tc += dc;
      }
    });
  }
  return moves;
}

export function isKingInCheck(board: ChessBoard, turnColor: PieceColor): boolean {
  let kr = -1;
  let kc = -1;
  const kingChar = turnColor === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (board[r][c] === kingChar) {
        kr = r;
        kc = c;
        break;
      }
    }
  }
  if (kr === -1) return true;
  const oppColor: PieceColor = turnColor === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (getPieceColor(board[r][c]) === oppColor) {
        const rawMoves = getRawCandidateMoves(board, r, c);
        if (rawMoves.some((m) => m.row === kr && m.col === kc)) return true;
      }
    }
  }
  return false;
}

export function getLegalChessMoves(board: ChessBoard, r: number, c: number): ChessMove[] {
  const piece = board[r][c];
  if (!piece) return [];
  const color = getPieceColor(piece) as PieceColor;
  const raw = getRawCandidateMoves(board, r, c);
  return raw.filter((m) => {
    const nextBoard = cloneBoard(board);
    nextBoard[m.row][m.col] = nextBoard[r][c];
    nextBoard[r][c] = null;
    return !isKingInCheck(nextBoard, color);
  });
}

export function hasAnyLegalMoves(board: ChessBoard, color: PieceColor): boolean {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (getPieceColor(board[r][c]) === color) {
        if (getLegalChessMoves(board, r, c).length > 0) return true;
      }
    }
  }
  return false;
}

export function moveToNotation(
  piece: ChessPiece,
  _fromRow: number,
  _fromCol: number,
  toRow: number,
  toCol: number,
  captured: boolean,
): string {
  const colLetter = 'abcdefgh'[toCol];
  const rowNum = 8 - toRow;
  const pChar = piece.toUpperCase() === 'P' ? '' : piece.toUpperCase();
  const capChar = captured ? 'x' : '';
  return `${pChar}${capChar}${colLetter}${rowNum}`;
}

export interface ChessMoveResult {
  board: ChessBoard;
  capturedWhite: ChessPiece[];
  capturedBlack: ChessPiece[];
  notation: string;
  lastMove: { fromRow: number; fromCol: number; toRow: number; toCol: number };
  nextTurn: PieceColor;
  inCheck: boolean;
  gameOver: boolean;
  /** 'checkmate' | 'stalemate' | null */
  outcome: 'checkmate' | 'stalemate' | null;
  winner: PieceColor | null;
  promoted: boolean;
}

/**
 * Apply a move and return the resulting state (pure). Mirrors `executeChessMove`
 * minus the DOM/audio/timing side effects.
 */
export function executeChessMove(
  board: ChessBoard,
  turn: PieceColor,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  capturedWhite: ChessPiece[],
  capturedBlack: ChessPiece[],
): ChessMoveResult {
  const nextBoard = cloneBoard(board);
  const piece = nextBoard[fromRow][fromCol] as ChessPiece;
  const target = nextBoard[toRow][toCol];
  let capturedWhiteNext = [...capturedWhite];
  let capturedBlackNext = [...capturedBlack];

  if (target) {
    if (getPieceColor(target) === 'w') capturedWhiteNext = [...capturedWhiteNext, target];
    else capturedBlackNext = [...capturedBlackNext, target];
  }
  nextBoard[toRow][toCol] = piece;
  nextBoard[fromRow][fromCol] = null;

  let promoted = false;
  if (piece === 'P' && toRow === 0) {
    nextBoard[toRow][toCol] = 'Q';
    promoted = true;
  }
  if (piece === 'p' && toRow === 7) {
    nextBoard[toRow][toCol] = 'q';
    promoted = true;
  }

  const notation = moveToNotation(piece, fromRow, fromCol, toRow, toCol, Boolean(target));
  const nextTurn: PieceColor = turn === 'w' ? 'b' : 'w';
  const inCheck = isKingInCheck(nextBoard, nextTurn);
  const hasMoves = hasAnyLegalMoves(nextBoard, nextTurn);

  let gameOver = false;
  let outcome: 'checkmate' | 'stalemate' | null = null;
  let winner: PieceColor | null = null;
  if (!hasMoves) {
    gameOver = true;
    if (inCheck) {
      outcome = 'checkmate';
      winner = nextTurn === 'b' ? 'w' : 'b';
    } else {
      outcome = 'stalemate';
    }
  }

  return {
    board: nextBoard,
    capturedWhite: capturedWhiteNext,
    capturedBlack: capturedBlackNext,
    notation,
    lastMove: { fromRow, fromCol, toRow, toCol },
    nextTurn,
    inCheck,
    gameOver,
    outcome,
    winner,
    promoted,
  };
}
