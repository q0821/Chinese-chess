import type { Board, PieceColor, Position } from '../game/types'
import { getAllLegalMoves, isCheckmate, isInCheck } from '../game/rules'
import { applyMove } from '../game/board'
import { evaluate } from './evaluation'

export interface AIMove {
  from: Position
  to: Position
  score: number
}

const MAX_SCORE = 999999
const MIN_SCORE = -999999

// ── Transposition Table ────────────────────────────────────────────────────
type TTFlag = 'exact' | 'lowerbound' | 'upperbound'
interface TTEntry {
  score: number
  depth: number
  flag: TTFlag
}
const transpositionTable = new Map<string, TTEntry>()
const TT_MAX_SIZE = 500000

function boardKey(board: Board): string {
  let key = ''
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p) key += `${r}${c}${p.color[0]}${p.type[0]}`
    }
  }
  return key
}

// ── Killer Moves (2 slots per depth) ──────────────────────────────────────
type KillerSlot = { from: Position; to: Position } | null
const killerMoves: Array<[KillerSlot, KillerSlot]> =
  Array.from({ length: 30 }, () => [null, null])

function storeKiller(depth: number, move: { from: Position; to: Position }) {
  const k = killerMoves[depth]
  if (!k[0] || k[0].from.row !== move.from.row || k[0].from.col !== move.from.col ||
      k[0].to.row !== move.to.row || k[0].to.col !== move.to.col) {
    k[1] = k[0]
    k[0] = move
  }
}

function isKiller(depth: number, move: { from: Position; to: Position }): boolean {
  const k = killerMoves[depth]
  return k.some(s => s &&
    s.from.row === move.from.row && s.from.col === move.from.col &&
    s.to.row  === move.to.row   && s.to.col  === move.to.col)
}

// ── History Heuristic ──────────────────────────────────────────────────────
// Counts how often each quiet move causes a beta cutoff; used to order moves.
const historyTable = new Map<number, number>()

function historyKey(from: Position, to: Position): number {
  return (from.row * 9 + from.col) * 90 + to.row * 9 + to.col
}

function incrementHistory(from: Position, to: Position, depth: number) {
  const key = historyKey(from, to)
  historyTable.set(key, (historyTable.get(key) ?? 0) + depth * depth)
}

// ── Move Ordering ──────────────────────────────────────────────────────────
const VICTIM_VALUES: Record<string, number> = {
  king: 10000, rook: 9, cannon: 8, horse: 7, elephant: 6, advisor: 5, pawn: 4,
}
const ATTACKER_VALUES: Record<string, number> = {
  king: 1, rook: 9, cannon: 8, horse: 7, elephant: 6, advisor: 5, pawn: 4,
}

function scoreMove(board: Board, from: Position, to: Position, depth: number): number {
  const victim   = board[to.row][to.col]
  const attacker = board[from.row][from.col]
  // 1. Captures ordered by MVV-LVA
  if (victim && attacker)
    return 20000 + VICTIM_VALUES[victim.type] * 10 - ATTACKER_VALUES[attacker.type]
  // 2. Killer moves
  if (isKiller(depth, { from, to }))
    return 10000
  // 3. History heuristic
  return historyTable.get(historyKey(from, to)) ?? 0
}

function orderMoves(
  board: Board,
  moves: Array<{ from: Position; to: Position }>,
  depth: number,
): Array<{ from: Position; to: Position }> {
  return [...moves].sort(
    (a, b) => scoreMove(board, b.from, b.to, depth) - scoreMove(board, a.from, a.to, depth),
  )
}

// ── Quiescence Search ──────────────────────────────────────────────────────
const QUIESCENCE_DEPTH = 4

function quiescence(
  board: Board,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  color: PieceColor,
  qdepth: number,
): number {
  const standPat = evaluate(board)

  if (isMaximizing) {
    if (standPat >= beta) return beta
    if (standPat > alpha) alpha = standPat
  } else {
    if (standPat <= alpha) return alpha
    if (standPat < beta) beta = standPat
  }

  if (qdepth <= 0) return standPat

  const captures = getAllLegalMoves(board, color).filter(m => board[m.to.row][m.to.col])
  if (captures.length === 0) return standPat

  // Order captures by highest victim value
  const ordered = [...captures].sort((a, b) =>
    VICTIM_VALUES[board[b.to.row][b.to.col]!.type] - VICTIM_VALUES[board[a.to.row][a.to.col]!.type],
  )

  const nextColor: PieceColor = color === 'red' ? 'black' : 'red'

  if (isMaximizing) {
    for (const { from, to } of ordered) {
      const score = quiescence(applyMove(board, from, to), alpha, beta, false, nextColor, qdepth - 1)
      if (score > alpha) alpha = score
      if (beta <= alpha) break
    }
    return alpha
  } else {
    for (const { from, to } of ordered) {
      const score = quiescence(applyMove(board, from, to), alpha, beta, true, nextColor, qdepth - 1)
      if (score < beta) beta = score
      if (beta <= alpha) break
    }
    return beta
  }
}

// ── Core Minimax with Alpha-Beta + TT + Killers + NMP + LMR ───────────────
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  color: PieceColor,
  allowNullMove: boolean,
): number {
  // Transposition table lookup
  const key = boardKey(board)
  const ttEntry = transpositionTable.get(key)
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.score
    if (ttEntry.flag === 'lowerbound') alpha = Math.max(alpha, ttEntry.score)
    else if (ttEntry.flag === 'upperbound') beta = Math.min(beta, ttEntry.score)
    if (beta <= alpha) return ttEntry.score
  }

  if (depth === 0)
    return quiescence(board, alpha, beta, isMaximizing, color, QUIESCENCE_DEPTH)

  if (isCheckmate(board, color))
    return color === 'red' ? MIN_SCORE + (10 - depth) : MAX_SCORE - (10 - depth)

  const nextColor: PieceColor = color === 'red' ? 'black' : 'red'

  // ── Null Move Pruning ──────────────────────────────────────────────────
  // Skip our move. If opponent still can't improve past beta, prune.
  // Disabled when in check (zugzwang risk) or after another null move.
  if (allowNullMove && depth >= 3 && !isInCheck(board, color)) {
    const R = depth >= 6 ? 3 : 2
    const nullScore = minimax(board, depth - 1 - R, alpha, beta, !isMaximizing, nextColor, false)
    if (isMaximizing && nullScore >= beta) return beta
    if (!isMaximizing && nullScore <= alpha) return alpha
  }

  const moves = orderMoves(board, getAllLegalMoves(board, color), depth)
  if (moves.length === 0) return evaluate(board)

  let flag: TTFlag = 'upperbound'
  let bestScore = isMaximizing ? MIN_SCORE : MAX_SCORE

  if (isMaximizing) {
    let moveCount = 0
    for (const { from, to } of moves) {
      moveCount++
      const isCapture = !!board[to.row][to.col]
      const isKillerMove = isKiller(depth, { from, to })

      // ── Late Move Reductions ─────────────────────────────────────────
      // Quiet moves after the first 3 are searched at reduced depth.
      // If they beat alpha, re-search at full depth.
      let evalScore: number
      if (moveCount > 3 && depth >= 3 && !isCapture && !isKillerMove) {
        evalScore = minimax(applyMove(board, from, to), depth - 2, alpha, beta, false, nextColor, true)
        if (evalScore > alpha)
          evalScore = minimax(applyMove(board, from, to), depth - 1, alpha, beta, false, nextColor, true)
      } else {
        evalScore = minimax(applyMove(board, from, to), depth - 1, alpha, beta, false, nextColor, true)
      }

      if (evalScore > bestScore) { bestScore = evalScore; flag = 'exact' }
      if (evalScore > alpha) alpha = evalScore
      if (beta <= alpha) {
        if (!isCapture) {
          storeKiller(depth, { from, to })
          incrementHistory(from, to, depth)
        }
        flag = 'lowerbound'
        break
      }
    }
  } else {
    let moveCount = 0
    for (const { from, to } of moves) {
      moveCount++
      const isCapture = !!board[to.row][to.col]
      const isKillerMove = isKiller(depth, { from, to })

      let evalScore: number
      if (moveCount > 3 && depth >= 3 && !isCapture && !isKillerMove) {
        evalScore = minimax(applyMove(board, from, to), depth - 2, alpha, beta, true, nextColor, true)
        if (evalScore < beta)
          evalScore = minimax(applyMove(board, from, to), depth - 1, alpha, beta, true, nextColor, true)
      } else {
        evalScore = minimax(applyMove(board, from, to), depth - 1, alpha, beta, true, nextColor, true)
      }

      if (evalScore < bestScore) { bestScore = evalScore; flag = 'exact' }
      if (evalScore < beta) beta = evalScore
      if (beta <= alpha) {
        if (!isCapture) {
          storeKiller(depth, { from, to })
          incrementHistory(from, to, depth)
        }
        flag = 'upperbound'
        break
      }
    }
  }

  if (transpositionTable.size > TT_MAX_SIZE) transpositionTable.clear()
  transpositionTable.set(key, { score: bestScore, depth, flag })
  return bestScore
}

// ── Public API ─────────────────────────────────────────────────────────────
function resetSearchState() {
  transpositionTable.clear()
  for (const k of killerMoves) { k[0] = null; k[1] = null }
  historyTable.clear()
}

function findBestMove(board: Board, color: PieceColor, depth: number): AIMove | null {
  const moves = orderMoves(board, getAllLegalMoves(board, color), depth)
  if (moves.length === 0) return null

  const isMaximizing = color === 'red'
  let bestMove: AIMove | null = null
  let bestScore = isMaximizing ? MIN_SCORE : MAX_SCORE
  let alpha = MIN_SCORE
  let beta  = MAX_SCORE
  const nextColor: PieceColor = color === 'red' ? 'black' : 'red'

  for (const { from, to } of moves) {
    const score = minimax(applyMove(board, from, to), depth - 1, alpha, beta, !isMaximizing, nextColor, true)
    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score
      bestMove = { from, to, score }
      if (isMaximizing) alpha = Math.max(alpha, score)
      else              beta  = Math.min(beta,  score)
    }
  }
  return bestMove
}

export function getBestMove(board: Board, color: PieceColor, depth: number): AIMove | null {
  resetSearchState()
  return findBestMove(board, color, depth)
}

/** Iterative deepening for expert mode — shares TT across depths. */
export function getBestMoveIterative(
  board: Board,
  color: PieceColor,
  maxDepth: number,
  timeLimitMs: number,
): AIMove | null {
  const start = Date.now()
  resetSearchState()
  let best: AIMove | null = null

  for (let depth = 1; depth <= maxDepth; depth++) {
    const move = findBestMove(board, color, depth)
    if (move) best = move
    if (Date.now() - start > timeLimitMs) break
  }

  return best
}
