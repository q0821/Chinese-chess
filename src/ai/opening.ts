// Simple opening book: maps FEN-like board hash to a list of good moves
// Format: from-to encoded as r1c1-r2c2
// This is a minimal opening book for common openings

export type OpeningMove = { from: { row: number; col: number }; to: { row: number; col: number } }

// Starting position key (empty string = initial board)
// Key format: simplified board string for first few moves
const OPENING_BOOK: Record<string, OpeningMove[]> = {
  // Red's first move: cannon to center (炮二平五 / 炮八平五)
  '': [
    { from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }, // 炮二平五
    { from: { row: 7, col: 7 }, to: { row: 7, col: 4 } }, // 炮八平五
    { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } }, // 馬二進三
    { from: { row: 9, col: 7 }, to: { row: 7, col: 6 } }, // 馬八進七
  ],
}

export function getOpeningMove(boardHash: string): OpeningMove | null {
  const moves = OPENING_BOOK[boardHash]
  if (!moves || moves.length === 0) return null
  return moves[Math.floor(Math.random() * moves.length)]
}

export function getBoardHash(board: import('../game/types').Board): string {
  // Simple hash: just encode piece positions
  const parts: string[] = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c]
      if (p) parts.push(`${p.color[0]}${p.type[0]}${r}${c}`)
    }
  }
  return parts.join(',')
}
