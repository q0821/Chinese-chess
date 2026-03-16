import type { Board, PieceColor, PieceType } from '../game/types'

// Material values
const PIECE_VALUES: Record<PieceType, number> = {
  king:     100000,
  rook:     900,
  cannon:   450,
  horse:    400,
  elephant: 200,
  advisor:  200,
  pawn:     100,
}

// Position score tables (row 0 = black side top, row 9 = red side bottom)
// These are from RED's perspective; black uses mirrored (row 9-r)
const POS_TABLES: Record<PieceType, number[][]> = {
  king: [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,0,0,0],
    [0,0,0,2,2,2,0,0,0],
    [0,0,0,2,2,2,0,0,0],
  ],
  advisor: [
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,3,0,0,0,0],[0,0,0,3,0,3,0,0,0],
    [0,0,0,0,3,0,0,0,0],
  ],
  elephant: [
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,2,0,0,0,0,0,2,0],
    [0,0,0,0,0,0,0,0,0],[2,0,0,0,2,0,0,0,2],[0,0,0,0,0,0,0,0,0],
    [0,2,0,0,0,0,0,2,0],
  ],
  horse: [
    [0,2,4,4,0,4,4,2,0],[2,4,6,6,6,6,6,4,2],[4,6,8,8,8,8,8,6,4],
    [4,6,8,10,8,10,8,6,4],[2,4,6,8,8,8,6,4,2],[4,6,8,10,8,10,8,6,4],
    [4,6,8,8,8,8,8,6,4],[2,4,6,6,6,6,6,4,2],[0,2,4,4,0,4,4,2,0],
    [0,0,2,2,0,2,2,0,0],
  ],
  rook: [
    [14,14,12,18,16,18,12,14,14],[16,20,18,24,26,24,18,20,16],
    [12,12,12,18,18,18,12,12,12],[12,18,16,22,22,22,16,18,12],
    [12,14,12,18,18,18,12,14,12],[12,16,14,20,20,20,14,16,12],
    [6,10,8,14,14,14,8,10,6],[4,8,6,14,12,14,6,8,4],
    [8,4,8,16,8,16,8,4,8],[6,8,6,14,12,14,6,8,6],
  ],
  cannon: [
    [6,4,0,-2,0,-2,0,4,6],[4,2,4,0,2,0,4,2,4],[2,2,2,0,0,0,2,2,2],
    [0,0,0,0,0,0,0,0,0],[0,2,4,6,6,6,4,2,0],[2,2,0,0,0,0,0,2,2],
    [4,0,4,0,0,0,4,0,4],[0,0,0,2,4,2,0,0,0],[6,6,0,0,0,0,0,6,6],
    [0,0,-2,4,10,4,-2,0,0],
  ],
  // Rows 0-4 = enemy territory (after crossing river); rows 5-9 = own side.
  // An advanced pawn is much more valuable, especially in the center.
  pawn: [
    [0,54,0,66,78,66,0,54,0],          // row 0: near enemy back rank
    [36,0,36,56,70,56,36,0,36],         // row 1
    [28,0,28,48,60,48,28,0,28],         // row 2
    [18,18,20,30,34,30,20,18,18],       // row 3: just past midpoint
    [12,12,12,18,18,18,12,12,12],       // row 4: just crossed river
    [8,0,8,0,12,0,8,0,8],              // row 5: one step advanced
    [0,0,0,0,0,0,0,0,0],               // row 6: starting row
    [0,0,0,0,0,0,0,0,0],               // rows 7-9: unreachable for advancing pawn
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
  ],
}

function getPosScore(type: PieceType, row: number, col: number, color: PieceColor): number {
  const table = POS_TABLES[type]
  if (!table) return 0
  const r = color === 'red' ? row : 9 - row
  return table[r]?.[col] ?? 0
}

export function evaluate(board: Board): number {
  let score = 0
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c]
      if (!piece) continue
      const materialScore = PIECE_VALUES[piece.type]
      const posScore = getPosScore(piece.type, r, c, piece.color)
      const total = materialScore + posScore
      score += piece.color === 'red' ? total : -total
    }
  }
  return score
}
