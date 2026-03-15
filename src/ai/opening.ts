export type OpeningMove = { from: { row: number; col: number }; to: { row: number; col: number } }

// Keyed by number of moves already played.
// Only covers Red's first move (moveCount === 0) since that's the only position
// we can reliably match without tracking opponent responses.
const OPENING_BOOK: Record<number, OpeningMove[]> = {
  0: [
    { from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }, // 炮二平五
    { from: { row: 7, col: 7 }, to: { row: 7, col: 4 } }, // 炮八平五
    { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } }, // 馬二進三
    { from: { row: 9, col: 7 }, to: { row: 7, col: 6 } }, // 馬八進七
  ],
}

export function getOpeningMove(moveCount: number): OpeningMove | null {
  const moves = OPENING_BOOK[moveCount]
  if (!moves || moves.length === 0) return null
  return moves[Math.floor(Math.random() * moves.length)]
}
