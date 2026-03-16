import type { Board } from '../game/types'

export type OpeningMove = { from: { row: number; col: number }; to: { row: number; col: number } }

// ── Helpers ────────────────────────────────────────────────────────────────
const isRedCannon = (b: Board, r: number, c: number) =>
  b[r][c]?.type === 'cannon' && b[r][c]?.color === 'red'
const isRedHorse = (b: Board, r: number, c: number) =>
  b[r][c]?.type === 'horse'  && b[r][c]?.color === 'red'

function pick(moves: OpeningMove[]): OpeningMove {
  return moves[Math.floor(Math.random() * moves.length)]
}

// ── Opening Book ───────────────────────────────────────────────────────────
// Position-based: each entry is checked against the actual board so the book
// works regardless of what Black plays.
//
// Coordinate system (from UI perspective):
//   Row 9 = Red back rank, Row 0 = Black back rank
//   Col 0 = left edge, Col 8 = right edge
//
// Red starting positions of interest:
//   Left cannon  (7,1) | Right cannon  (7,7)
//   Left horse   (9,1) | Right horse   (9,7)
//   Left rook    (9,0) | Right rook    (9,8)
//   Centre pawn  (6,4)

export function getOpeningMove(moveCount: number, board: Board): OpeningMove | null {
  // Only cover the first three Red moves (moveCount 0, 2, 4).
  if (moveCount > 4) return null

  // ── Move 1 (Red's first move) ──────────────────────────────────────────
  if (moveCount === 0) {
    return pick([
      { from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }, // 炮二平五 (left cannon centre)
      { from: { row: 7, col: 7 }, to: { row: 7, col: 4 } }, // 炮八平五 (right cannon centre)
      { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } }, // 馬二進三 (left horse advance)
      { from: { row: 9, col: 7 }, to: { row: 7, col: 6 } }, // 馬八進七 (right horse advance)
    ])
  }

  // ── Move 2 (Red's second move) ─────────────────────────────────────────
  if (moveCount === 2) {
    const cannonCentre = isRedCannon(board, 7, 4)
    const rightHorseHome = isRedHorse(board, 9, 7)
    const leftHorseHome  = isRedHorse(board, 9, 1)

    if (cannonCentre) {
      // Cannon is centralised → develop a horse
      const moves: OpeningMove[] = []
      if (rightHorseHome) moves.push({ from: { row: 9, col: 7 }, to: { row: 7, col: 6 } }) // 馬八進七
      if (leftHorseHome)  moves.push({ from: { row: 9, col: 1 }, to: { row: 7, col: 2 } }) // 馬二進三
      if (moves.length > 0) return pick(moves)
    }

    // Horse opened → centralise cannon or develop the other horse
    const rightHorseAdv = isRedHorse(board, 7, 6)
    const leftHorseAdv  = isRedHorse(board, 7, 2)

    if (rightHorseAdv) {
      const moves: OpeningMove[] = []
      if (isRedCannon(board, 7, 1)) moves.push({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }) // left cannon centre
      if (leftHorseHome)            moves.push({ from: { row: 9, col: 1 }, to: { row: 7, col: 2 } }) // other horse
      if (moves.length > 0) return pick(moves)
    }

    if (leftHorseAdv) {
      const moves: OpeningMove[] = []
      if (isRedCannon(board, 7, 7)) moves.push({ from: { row: 7, col: 7 }, to: { row: 7, col: 4 } }) // right cannon centre
      if (rightHorseHome)           moves.push({ from: { row: 9, col: 7 }, to: { row: 7, col: 6 } }) // other horse
      if (moves.length > 0) return pick(moves)
    }
  }

  // ── Move 3 (Red's third move) ──────────────────────────────────────────
  if (moveCount === 4) {
    const cannonCentre  = isRedCannon(board, 7, 4)
    const rightHorseAdv = isRedHorse(board, 7, 6)
    const leftHorseAdv  = isRedHorse(board, 7, 2)
    const rightHorseHome = isRedHorse(board, 9, 7)
    const leftHorseHome  = isRedHorse(board, 9, 1)

    if (cannonCentre) {
      // Cannon centre established — complete the two-horse formation
      if (rightHorseAdv && leftHorseHome)
        return { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } } // advance left horse
      if (leftHorseAdv && rightHorseHome)
        return { from: { row: 9, col: 7 }, to: { row: 7, col: 6 } } // advance right horse
    }

    // Both horses out — centralise cannon
    if (rightHorseAdv && leftHorseAdv) {
      if (isRedCannon(board, 7, 1)) return { from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }
      if (isRedCannon(board, 7, 7)) return { from: { row: 7, col: 7 }, to: { row: 7, col: 4 } }
    }
  }

  return null
}
