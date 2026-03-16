import type { Board, PieceColor, PieceType } from '../game/types'
const PIECE_VALUES: Record<PieceType, number> = {
  king:     100000,
  rook:     900,
  cannon:   450,  // adjusted dynamically by game phase
  horse:    400,  // adjusted dynamically by game phase
  elephant: 200,
  advisor:  200,
  pawn:     100,
}

// ── Game Phase ─────────────────────────────────────────────────────────────
// Count non-royal pieces to determine opening / mid / endgame.
// Starting position has 28 non-royal pieces (14 per side).
// Below ~12 we treat it as endgame.
const PHASE_MAX = 28

/** Returns 0.0 (endgame) … 1.0 (opening/midgame). */
function gamePhase(board: Board): number {
  let count = 0
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p && p.type !== 'king' && p.type !== 'advisor' && p.type !== 'elephant')
        count++
    }
  return Math.min(count, PHASE_MAX) / PHASE_MAX
}

/**
 * Cannon is powerful in the opening/midgame (many screens) but weakens in the
 * endgame when there are few pieces to jump over.
 *   opening: 450   endgame: 250
 *
 * Horse is the opposite — less obstructed in the endgame.
 *   opening: 400   endgame: 460
 */
function phasedValue(type: PieceType, phase: number): number {
  if (type === 'cannon') return Math.round(250 + phase * 200)  // 250 → 450
  if (type === 'horse')  return Math.round(460 - phase * 60)   // 460 → 400
  return PIECE_VALUES[type]
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

// ── Strategic Evaluation ───────────────────────────────────────────────────

// Horse leg-blocking: each move direction + the square that blocks it.
const HORSE_DELTAS: Array<{ dr: number; dc: number; br: number; bc: number }> = [
  { dr: -2, dc: -1, br: -1, bc:  0 },
  { dr: -2, dc: +1, br: -1, bc:  0 },
  { dr: -1, dc: -2, br:  0, bc: -1 },
  { dr: -1, dc: +2, br:  0, bc: +1 },
  { dr: +1, dc: -2, br:  0, bc: -1 },
  { dr: +1, dc: +2, br:  0, bc: +1 },
  { dr: +2, dc: -1, br: +1, bc:  0 },
  { dr: +2, dc: +1, br: +1, bc:  0 },
]

/**
 * Evaluates how well the king is defended by advisors and elephants.
 * Missing defenders expose the king to checkmate threats.
 *   2 advisors  → 0    1 advisor  → -60    0 advisors → -160
 *   2 elephants → 0    1 elephant → -25    0 elephants → -70
 */
function kingSafetyScore(board: Board, color: PieceColor): number {
  let advisors = 0, elephants = 0
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (!p || p.color !== color) continue
      if (p.type === 'advisor')  advisors++
      if (p.type === 'elephant') elephants++
    }
  const advisorPenalty  = advisors  === 2 ? 0 : advisors  === 1 ? -60  : -160
  const elephantPenalty = elephants === 2 ? 0 : elephants === 1 ? -25  : -70
  return advisorPenalty + elephantPenalty
}

/**
 * Bonuses for active rooks:
 *   +15  rook on open file (no friendly pawn blocking the same column)
 *   +25  two rooks connected on the same rank/file with nothing between them
 */
function rookActivationScore(board: Board, color: PieceColor): number {
  let score = 0
  const rooks: Array<[number, number]> = []

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p?.type !== 'rook' || p.color !== color) continue
      rooks.push([r, c])

      // Open-file bonus: no friendly pawn on this column
      let open = true
      for (let rr = 0; rr < 10; rr++) {
        const pp = board[rr][c]
        if (pp && pp.color === color && pp.type === 'pawn') { open = false; break }
      }
      if (open) score += 15
    }
  }

  // Connected-rooks bonus
  if (rooks.length === 2) {
    const [[r1, c1], [r2, c2]] = rooks
    let connected = false
    if (r1 === r2) {
      const lo = Math.min(c1, c2), hi = Math.max(c1, c2)
      connected = true
      for (let c = lo + 1; c < hi; c++) if (board[r1][c]) { connected = false; break }
    } else if (c1 === c2) {
      const lo = Math.min(r1, r2), hi = Math.max(r1, r2)
      connected = true
      for (let r = lo + 1; r < hi; r++) if (board[r][c1]) { connected = false; break }
    }
    if (connected) score += 25
  }
  return score
}

/**
 * Cannon battery scoring:
 *   +10  cannon has at least one loaded attack (screen piece + enemy behind it)
 *   -15  cannon has absolutely no pieces in any direction (completely stranded)
 */
function cannonBatteryScore(board: Board, color: PieceColor): number {
  const enemy = color === 'red' ? 'black' : 'red'
  let score = 0

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p?.type !== 'cannon' || p.color !== color) continue

      let loaded = false
      let totalPiecesInSight = 0

      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        let screen = false
        for (let rr = r + dr, cc = c + dc;
             rr >= 0 && rr < 10 && cc >= 0 && cc < 9;
             rr += dr, cc += dc) {
          const pp = board[rr][cc]
          if (!pp) continue
          totalPiecesInSight++
          if (screen) {
            if (pp.color === enemy) loaded = true
            break
          }
          screen = true
        }
        if (loaded) break
      }

      if (loaded)                       score += 10
      else if (totalPiecesInSight === 0) score -= 15  // stranded cannon
    }
  }
  return score
}

/**
 * Horse mobility scoring: count reachable squares (respecting leg-blocking).
 *   ≤ 1 moves → -30   (nearly trapped)
 *   = 2 moves → -15   (very restricted)
 *   ≥ 6 moves → +10   (very active)
 */
function horseMobilityScore(board: Board, color: PieceColor): number {
  let score = 0
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p?.type !== 'horse' || p.color !== color) continue

      let moves = 0
      for (const { dr, dc, br, bc } of HORSE_DELTAS) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) continue
        if (board[r + br][c + bc]) continue  // leg blocked
        moves++
      }

      if      (moves <= 1) score -= 30
      else if (moves <= 2) score -= 15
      else if (moves >= 6) score += 10
    }
  }
  return score
}

/** Combined strategic score for one side. */
function strategicScore(board: Board, color: PieceColor): number {
  return (
    kingSafetyScore(board, color) +
    rookActivationScore(board, color) +
    cannonBatteryScore(board, color) +
    horseMobilityScore(board, color)
  )
}

// ── Main Evaluation ────────────────────────────────────────────────────────

export function evaluate(board: Board): number {
  const phase = gamePhase(board)
  let score = 0

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c]
      if (!piece) continue
      const materialScore = phasedValue(piece.type, phase)
      const posScore      = getPosScore(piece.type, r, c, piece.color)
      score += piece.color === 'red' ? materialScore + posScore : -(materialScore + posScore)
    }
  }

  // Add strategic layer (king safety, rook activation, cannon battery, horse mobility)
  score += strategicScore(board, 'red') - strategicScore(board, 'black')

  return score
}
