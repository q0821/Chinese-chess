import type { Board, PieceColor, Position } from './types'
import { applyMove, findKing } from './board'

// Palace bounds: red rows 7-9 col 3-5, black rows 0-2 col 3-5
function inPalace(row: number, col: number, color: PieceColor): boolean {
  if (col < 3 || col > 5) return false
  if (color === 'red') return row >= 7 && row <= 9
  return row >= 0 && row <= 2
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8
}

// Red is "forward" toward lower row numbers (from row 9 to row 0)
// Black is "forward" toward higher row numbers (from row 0 to row 9)
function forwardDir(color: PieceColor): number {
  return color === 'red' ? -1 : 1
}

function crossedRiver(row: number, color: PieceColor): boolean {
  if (color === 'red') return row <= 4
  return row >= 5
}

function getRawMovesFixed(board: Board, pos: Position): Position[] {
  const piece = board[pos.row][pos.col]
  if (!piece) return []
  const { row, col, color, type } = { ...pos, ...piece }
  const moves: Position[] = []

  const addIfFriendly = (r: number, c: number) => {
    if (!inBounds(r, c)) return
    const target = board[r][c]
    if (!target || target.color !== color) moves.push({ row: r, col: c })
  }

  switch (type) {
    case 'king': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = row + dr, nc = col + dc
        if (inPalace(nr, nc, color)) addIfFriendly(nr, nc)
      }
      break
    }
    case 'advisor': {
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nr = row + dr, nc = col + dc
        if (inPalace(nr, nc, color)) addIfFriendly(nr, nc)
      }
      break
    }
    case 'elephant': {
      for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
        const nr = row + dr, nc = col + dc
        if (!inBounds(nr, nc)) continue
        if (color === 'red' && nr < 5) continue
        if (color === 'black' && nr > 4) continue
        const er = row + dr / 2, ec = col + dc / 2
        if (board[er][ec]) continue
        addIfFriendly(nr, nc)
      }
      break
    }
    case 'horse': {
      // [leg direction, final offsets]
      const horseLeaps: [number, number, number, number][] = [
        [1, 0, 2, 1], [1, 0, 2, -1],
        [-1, 0, -2, 1], [-1, 0, -2, -1],
        [0, 1, 1, 2], [0, 1, -1, 2],
        [0, -1, 1, -2], [0, -1, -1, -2],
      ]
      for (const [lr, lc, fr, fc] of horseLeaps) {
        const legR = row + lr, legC = col + lc
        if (!inBounds(legR, legC) || board[legR][legC]) continue
        addIfFriendly(row + fr, col + fc)
      }
      break
    }
    case 'rook': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let nr = row + dr, nc = col + dc
        while (inBounds(nr, nc)) {
          const target = board[nr][nc]
          if (target) {
            if (target.color !== color) moves.push({ row: nr, col: nc })
            break
          }
          moves.push({ row: nr, col: nc })
          nr += dr; nc += dc
        }
      }
      break
    }
    case 'cannon': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let nr = row + dr, nc = col + dc
        let hasScreen = false
        while (inBounds(nr, nc)) {
          const target = board[nr][nc]
          if (!hasScreen) {
            if (target) hasScreen = true
            else moves.push({ row: nr, col: nc })
          } else {
            if (target) {
              if (target.color !== color) moves.push({ row: nr, col: nc })
              break
            }
          }
          nr += dr; nc += dc
        }
      }
      break
    }
    case 'pawn': {
      const fwd = forwardDir(color)
      addIfFriendly(row + fwd, col)
      if (crossedRiver(row, color)) {
        addIfFriendly(row, col + 1)
        addIfFriendly(row, col - 1)
      }
      break
    }
  }
  return moves
}

// Check if a position is attacked by the given color
export function isAttackedBy(board: Board, pos: Position, byColor: PieceColor): boolean {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c]
      if (!piece || piece.color !== byColor) continue
      const moves = getRawMovesFixed(board, { row: r, col: c })
      if (moves.some(m => m.row === pos.row && m.col === pos.col)) return true
    }
  }
  return false
}

// Flying general rule check
function flyingGeneral(board: Board): boolean {
  const redKing = findKing(board, 'red')
  const blackKing = findKing(board, 'black')
  if (!redKing || !blackKing) return false
  if (redKing.col !== blackKing.col) return false
  const minRow = Math.min(redKing.row, blackKing.row)
  const maxRow = Math.max(redKing.row, blackKing.row)
  for (let r = minRow + 1; r < maxRow; r++) {
    if (board[r][redKing.col]) return false
  }
  return true // kings face each other with no pieces between
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const king = findKing(board, color)
  if (!king) return false
  const opponent: PieceColor = color === 'red' ? 'black' : 'red'
  if (isAttackedBy(board, king, opponent)) return true
  if (flyingGeneral(board)) return true
  return false
}

// Get all legal moves for a piece (filters moves that leave king in check)
export function getLegalMoves(board: Board, pos: Position): Position[] {
  const piece = board[pos.row][pos.col]
  if (!piece) return []
  const rawMoves = getRawMovesFixed(board, pos)
  return rawMoves.filter(to => {
    const newBoard = applyMove(board, pos, to)
    return !isInCheck(newBoard, piece.color)
  })
}

// Get all legal moves for a color
export function getAllLegalMoves(board: Board, color: PieceColor): Array<{ from: Position; to: Position }> {
  const moves: Array<{ from: Position; to: Position }> = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c]
      if (!piece || piece.color !== color) continue
      const legalMoves = getLegalMoves(board, { row: r, col: c })
      for (const to of legalMoves) {
        moves.push({ from: { row: r, col: c }, to })
      }
    }
  }
  return moves
}

export function isCheckmate(board: Board, color: PieceColor): boolean {
  if (!isInCheck(board, color)) return false
  return getAllLegalMoves(board, color).length === 0
}

export function isStalemate(board: Board, color: PieceColor): boolean {
  if (isInCheck(board, color)) return false
  return getAllLegalMoves(board, color).length === 0
}
