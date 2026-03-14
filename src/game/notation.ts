import type { Board, PieceColor, PieceType, Position } from './types'

const PIECE_NAMES: Record<PieceType, Record<PieceColor, string>> = {
  king:     { red: '帥', black: '將' },
  advisor:  { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse:    { red: '傌', black: '馬' },
  rook:     { red: '俥', black: '車' },
  cannon:   { red: '炮', black: '砲' },
  pawn:     { red: '兵', black: '卒' },
}

const RED_NUMBERS = ['一','二','三','四','五','六','七','八','九']
const BLACK_NUMBERS = ['１','２','３','４','５','６','７','８','９']

// Column number from perspective of each color
// Red reads columns right-to-left (col 8 = 1, col 0 = 9)
// Black reads columns left-to-right (col 0 = 1, col 8 = 9)
function colToNumber(col: number, color: PieceColor): string {
  if (color === 'red') {
    return RED_NUMBERS[8 - col]
  } else {
    return BLACK_NUMBERS[col]
  }
}

function rowDiff(fromRow: number, toRow: number, color: PieceColor): { dir: string; steps: string } {
  const forward = color === 'red' ? -1 : 1
  const diff = toRow - fromRow
  if (diff === 0) return { dir: '平', steps: '' }
  if (diff * forward > 0) return { dir: '進', steps: RED_NUMBERS[Math.abs(diff) - 1] }
  return { dir: '退', steps: RED_NUMBERS[Math.abs(diff) - 1] }
}

export function generateNotation(board: Board, from: Position, to: Position): string {
  const piece = board[from.row][from.col]
  if (!piece) return '?'

  const name = PIECE_NAMES[piece.type][piece.color]
  const fromCol = colToNumber(from.col, piece.color)

  // Check if there are multiple same-type pieces in the same column
  const sameColPieces: number[] = []
  for (let r = 0; r < 10; r++) {
    const p = board[r][from.col]
    if (p && p.type === piece.type && p.color === piece.color) {
      sameColPieces.push(r)
    }
  }

  let prefix = name + fromCol

  if (sameColPieces.length > 1) {
    // Use 前/後 to disambiguate
    const isFront = piece.color === 'red'
      ? from.row === Math.min(...sameColPieces)
      : from.row === Math.max(...sameColPieces)
    prefix = (isFront ? '前' : '後') + name
  }

  if (to.row === from.row) {
    // Horizontal move
    return prefix + '平' + colToNumber(to.col, piece.color)
  } else {
    const { dir, steps } = rowDiff(from.row, to.row, piece.color)
    // For pieces that move diagonally (advisor, elephant, horse), destination col
    if (['advisor', 'elephant', 'horse'].includes(piece.type)) {
      return prefix + dir + colToNumber(to.col, piece.color)
    }
    return prefix + dir + steps
  }
}
