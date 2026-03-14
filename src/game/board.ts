import type { Board, Piece, PieceColor, PieceType, Position } from './types'

let pieceCounter = 0

function makePiece(type: PieceType, color: PieceColor): Piece {
  return { type, color, id: `${color}-${type}-${pieceCounter++}` }
}

export function createInitialBoard(): Board {
  pieceCounter = 0
  const board: Board = Array.from({ length: 10 }, () => Array(9).fill(null))

  // Black pieces (top, rows 0-4)
  const b = 'black' as PieceColor
  board[0][0] = makePiece('rook', b)
  board[0][1] = makePiece('horse', b)
  board[0][2] = makePiece('elephant', b)
  board[0][3] = makePiece('advisor', b)
  board[0][4] = makePiece('king', b)
  board[0][5] = makePiece('advisor', b)
  board[0][6] = makePiece('elephant', b)
  board[0][7] = makePiece('horse', b)
  board[0][8] = makePiece('rook', b)
  board[2][1] = makePiece('cannon', b)
  board[2][7] = makePiece('cannon', b)
  for (let c of [0, 2, 4, 6, 8]) board[3][c] = makePiece('pawn', b)

  // Red pieces (bottom, rows 5-9)
  const r = 'red' as PieceColor
  board[9][0] = makePiece('rook', r)
  board[9][1] = makePiece('horse', r)
  board[9][2] = makePiece('elephant', r)
  board[9][3] = makePiece('advisor', r)
  board[9][4] = makePiece('king', r)
  board[9][5] = makePiece('advisor', r)
  board[9][6] = makePiece('elephant', r)
  board[9][7] = makePiece('horse', r)
  board[9][8] = makePiece('rook', r)
  board[7][1] = makePiece('cannon', r)
  board[7][7] = makePiece('cannon', r)
  for (let c of [0, 2, 4, 6, 8]) board[6][c] = makePiece('pawn', r)

  return board
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)))
}

export function applyMove(board: Board, from: Position, to: Position): Board {
  const newBoard = cloneBoard(board)
  newBoard[to.row][to.col] = newBoard[from.row][from.col]
  newBoard[from.row][from.col] = null
  return newBoard
}

export function findKing(board: Board, color: PieceColor): Position | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p && p.type === 'king' && p.color === color) return { row: r, col: c }
    }
  }
  return null
}

export function posEq(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}
