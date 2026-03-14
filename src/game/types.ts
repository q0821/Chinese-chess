export type PieceType = 'king' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'pawn'
export type PieceColor = 'red' | 'black'
export type GameMode = 'pvp' | 'pvc'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type GameStatus = 'setup' | 'playing' | 'check' | 'checkmate' | 'draw' | 'replay'
export type Theme = 'traditional' | 'modern'

export interface Piece {
  type: PieceType
  color: PieceColor
  id: string
}

export interface Position {
  row: number // 0-9 (0 = top/black side, 9 = bottom/red side)
  col: number // 0-8
}

export interface Move {
  from: Position
  to: Position
  piece: Piece
  captured?: Piece
  notation: string
  boardSnapshot: Board
}

// Board[row][col], 10 rows x 9 cols
export type Board = (Piece | null)[][]

export interface SaveSlot {
  label: string
  timestamp: number
  state: SerializedGameState | null
}

export interface SerializedGameState {
  board: Board
  currentTurn: PieceColor
  moveHistory: Move[]
  capturedPieces: { red: Piece[]; black: Piece[] }
  status: GameStatus
  playerColor: PieceColor
  mode: GameMode
  difficulty: Difficulty
}
