import type { Board, PieceColor } from '../game/types'
import type { Position } from '../game/types'
import { evaluateMoveSubset } from './minimax'

interface SMPRequest {
  board: Board
  color: PieceColor
  moves: Array<{ from: Position; to: Position }>
  maxDepth: number
  timeLimitMs: number
}

self.onmessage = (e: MessageEvent<SMPRequest>) => {
  const { board, color, moves, maxDepth, timeLimitMs } = e.data
  const move = evaluateMoveSubset(board, color, moves, maxDepth, timeLimitMs)
  self.postMessage({ move })
}
