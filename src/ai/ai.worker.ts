import type { Board, Difficulty, PieceColor } from '../game/types'
import { getBestMove, getBestMoveIterative } from './minimax'
import { getAllLegalMoves } from '../game/rules'
import { getOpeningMove } from './opening'

interface WorkerRequest {
  board: Board
  color: PieceColor
  difficulty: Difficulty
  moveCount: number
}

const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 5,
  expert: 8,
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { board, color, difficulty, moveCount } = e.data

  // Opening book for non-easy difficulties (Red's first move only)
  if (difficulty !== 'easy' && color === 'red') {
    const openingMove = getOpeningMove(moveCount)
    if (openingMove) {
      self.postMessage({ move: openingMove })
      return
    }
  }

  const depth = DEPTH_MAP[difficulty]
  let move

  if (difficulty === 'easy') {
    const moves = getAllLegalMoves(board, color)
    if (moves.length === 0) { self.postMessage({ move: null }); return }
    const captures = moves.filter((m) => board[m.to.row][m.to.col])
    if (captures.length > 0 && Math.random() > 0.3) {
      move = captures[Math.floor(Math.random() * captures.length)]
    } else {
      move = moves[Math.floor(Math.random() * moves.length)]
    }
  } else if (difficulty === 'expert') {
    move = getBestMoveIterative(board, color, depth, 5000)
  } else {
    move = getBestMove(board, color, depth)
  }

  self.postMessage({ move })
}
