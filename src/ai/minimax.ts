import type { Board, PieceColor, Position } from '../game/types'
import { getAllLegalMoves, isCheckmate } from '../game/rules'
import { applyMove } from '../game/board'
import { evaluate } from './evaluation'

export interface AIMove {
  from: Position
  to: Position
  score: number
}

const MAX_SCORE = 999999
const MIN_SCORE = -999999

function scoreMove(board: Board, from: Position, to: Position): number {
  // MVV-LVA: Most Valuable Victim - Least Valuable Attacker for move ordering
  const victim = board[to.row][to.col]
  const attacker = board[from.row][from.col]
  if (!victim || !attacker) return 0
  const victimValues: Record<string, number> = {
    king: 10000, rook: 9, cannon: 8, horse: 7, elephant: 6, advisor: 5, pawn: 4
  }
  const attackerValues: Record<string, number> = {
    king: 1, rook: 9, cannon: 8, horse: 7, elephant: 6, advisor: 5, pawn: 4
  }
  return victimValues[victim.type] * 10 - attackerValues[attacker.type]
}

function orderMoves(board: Board, moves: Array<{ from: Position; to: Position }>): Array<{ from: Position; to: Position }> {
  return [...moves].sort((a, b) => scoreMove(board, b.from, b.to) - scoreMove(board, a.from, a.to))
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean, // true = red's turn
  color: PieceColor
): number {
  if (depth === 0) return evaluate(board)

  if (isCheckmate(board, color)) {
    // Current player is in checkmate — they lose
    return color === 'red' ? MIN_SCORE + (10 - depth) : MAX_SCORE - (10 - depth)
  }

  const moves = orderMoves(board, getAllLegalMoves(board, color))
  if (moves.length === 0) return evaluate(board)

  const nextColor: PieceColor = color === 'red' ? 'black' : 'red'

  if (isMaximizing) {
    let maxEval = MIN_SCORE
    for (const { from, to } of moves) {
      const newBoard = applyMove(board, from, to)
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, nextColor)
      maxEval = Math.max(maxEval, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = MAX_SCORE
    for (const { from, to } of moves) {
      const newBoard = applyMove(board, from, to)
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, nextColor)
      minEval = Math.min(minEval, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
    return minEval
  }
}

export function getBestMove(board: Board, color: PieceColor, depth: number): AIMove | null {
  const moves = orderMoves(board, getAllLegalMoves(board, color))
  if (moves.length === 0) return null

  const isMaximizing = color === 'red'
  let bestMove: AIMove | null = null
  let bestScore = isMaximizing ? MIN_SCORE : MAX_SCORE
  const nextColor: PieceColor = color === 'red' ? 'black' : 'red'

  for (const { from, to } of moves) {
    const newBoard = applyMove(board, from, to)
    const score = minimax(newBoard, depth - 1, MIN_SCORE, MAX_SCORE, !isMaximizing, nextColor)
    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score
      bestMove = { from, to, score }
    }
  }

  return bestMove
}

// Iterative deepening for expert mode
export function getBestMoveIterative(
  board: Board,
  color: PieceColor,
  maxDepth: number,
  timeLimitMs: number
): AIMove | null {
  const start = Date.now()
  let best: AIMove | null = null

  for (let depth = 1; depth <= maxDepth; depth++) {
    const move = getBestMove(board, color, depth)
    if (move) best = move
    if (Date.now() - start > timeLimitMs) break
  }

  return best
}
