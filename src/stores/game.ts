import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Board, Difficulty, GameMode, GameStatus, Move, Piece, PieceColor, Position,
  SerializedGameState, Theme,
} from '../game/types'
import { createInitialBoard, applyMove, cloneBoard } from '../game/board'
import { getLegalMoves, isInCheck, isCheckmate, isStalemate, getAllLegalMoves } from '../game/rules'
import { generateNotation } from '../game/notation'
import { autoSave } from '../utils/storage'
import { getBestMove, getBestMoveIterative } from '../ai/minimax'

const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 1,
  medium: 3,
  hard: 4,
  expert: 6,
}

export const useGameStore = defineStore('game', () => {
  // State
  const board = ref<Board>(createInitialBoard())
  const currentTurn = ref<PieceColor>('red')
  const moveHistory = ref<Move[]>([])
  const capturedPieces = ref<{ red: Piece[]; black: Piece[] }>({ red: [], black: [] })
  const status = ref<GameStatus>('setup')
  const playerColor = ref<PieceColor>('red')
  const mode = ref<GameMode>('pvc')
  const difficulty = ref<Difficulty>('medium')
  const selectedPiece = ref<Position | null>(null)
  const legalMoves = ref<Position[]>([])
  const hint = ref<{ from: Position; to: Position } | null>(null)
  const isAIThinking = ref(false)
  const replayIndex = ref(0)
  const theme = ref<Theme>('traditional')

  // For replay: store snapshots
  const replayBoards = ref<Board[]>([])

  // Computed
  const isPlayerTurn = computed(() => {
    if (mode.value === 'pvp') return true
    return currentTurn.value === playerColor.value
  })

  const isInReplay = computed(() => status.value === 'replay')

  const currentBoard = computed(() => {
    if (isInReplay.value && replayBoards.value.length > 0) {
      return replayBoards.value[replayIndex.value] ?? board.value
    }
    return board.value
  })

  // Actions
  function newGame(opts?: { mode?: GameMode; difficulty?: Difficulty; playerColor?: PieceColor }) {
    board.value = createInitialBoard()
    currentTurn.value = 'red'
    moveHistory.value = []
    capturedPieces.value = { red: [], black: [] }
    selectedPiece.value = null
    legalMoves.value = []
    hint.value = null
    isAIThinking.value = false
    replayIndex.value = 0
    replayBoards.value = [cloneBoard(board.value)]
    status.value = 'playing'

    if (opts?.mode) mode.value = opts.mode
    if (opts?.difficulty) difficulty.value = opts.difficulty
    if (opts?.playerColor) playerColor.value = opts.playerColor

    // If AI goes first (player chose black)
    if (mode.value === 'pvc' && playerColor.value === 'black') {
      triggerAI()
    }
  }

  function selectPiece(pos: Position) {
    if (!isPlayerTurn.value) return
    if (status.value !== 'playing' && status.value !== 'check') return

    const piece = board.value[pos.row][pos.col]

    // If a piece is already selected, try to move it
    if (selectedPiece.value) {
      const isLegal = legalMoves.value.some(m => m.row === pos.row && m.col === pos.col)
      if (isLegal) {
        makeMove(selectedPiece.value, pos)
        return
      }
      // Select new piece if same color
      if (piece && piece.color === currentTurn.value) {
        selectedPiece.value = pos
        legalMoves.value = getLegalMoves(board.value, pos)
        hint.value = null
        return
      }
      // Deselect
      selectedPiece.value = null
      legalMoves.value = []
      return
    }

    // No piece selected yet
    if (!piece || piece.color !== currentTurn.value) return
    selectedPiece.value = pos
    legalMoves.value = getLegalMoves(board.value, pos)
    hint.value = null
  }

  function makeMove(from: Position, to: Position) {
    const piece = board.value[from.row][from.col]
    if (!piece) return

    const captured = board.value[to.row][to.col] ?? undefined
    const notation = generateNotation(board.value, from, to)
    const newBoard = applyMove(board.value, from, to)

    const move: Move = {
      from,
      to,
      piece: { ...piece },
      captured: captured ? { ...captured } : undefined,
      notation,
      boardSnapshot: cloneBoard(newBoard),
    }

    board.value = newBoard
    moveHistory.value.push(move)
    replayBoards.value.push(cloneBoard(newBoard))

    if (captured) {
      capturedPieces.value[captured.color].push(captured)
    }

    selectedPiece.value = null
    legalMoves.value = []
    hint.value = null

    // Switch turn
    const nextTurn: PieceColor = currentTurn.value === 'red' ? 'black' : 'red'

    // Check game state
    if (isCheckmate(newBoard, nextTurn)) {
      status.value = 'checkmate'
      currentTurn.value = nextTurn
    } else if (isStalemate(newBoard, nextTurn)) {
      status.value = 'draw'
      currentTurn.value = nextTurn
    } else if (isInCheck(newBoard, nextTurn)) {
      status.value = 'check'
      currentTurn.value = nextTurn
    } else {
      status.value = 'playing'
      currentTurn.value = nextTurn
    }

    // Auto-save
    autoSave(serialize())

    // AI turn
    if (status.value === 'playing' || status.value === 'check') {
      if (mode.value === 'pvc' && currentTurn.value !== playerColor.value) {
        triggerAI()
      }
    }
  }

  function triggerAI() {
    isAIThinking.value = true
    const boardSnapshot = cloneBoard(board.value)
    const color = currentTurn.value
    const diff = difficulty.value
    const depth = DEPTH_MAP[diff]

    // Use setTimeout to allow UI to update first
    setTimeout(() => {
      let move
      if (diff === 'easy') {
        const moves = getAllLegalMoves(boardSnapshot, color)
        if (moves.length === 0) { isAIThinking.value = false; return }
        const captures = moves.filter(m => boardSnapshot[m.to.row][m.to.col])
        if (captures.length > 0 && Math.random() > 0.3) {
          move = captures[Math.floor(Math.random() * captures.length)]
        } else {
          move = moves[Math.floor(Math.random() * moves.length)]
        }
      } else if (diff === 'expert') {
        move = getBestMoveIterative(boardSnapshot, color, depth, 3000)
      } else {
        move = getBestMove(boardSnapshot, color, depth)
      }

      isAIThinking.value = false
      if (move) makeMove(move.from, move.to)
    }, diff === 'easy' ? 300 : 100)
  }

  function undoMove() {
    if (moveHistory.value.length === 0) return
    if (isInReplay.value) return

    // In PvC mode, undo both AI move and player move
    const undoCount = mode.value === 'pvc' && moveHistory.value.length >= 2 ? 2 : 1

    for (let i = 0; i < undoCount; i++) {
      if (moveHistory.value.length === 0) break
      const lastMove = moveHistory.value.pop()!
      replayBoards.value.pop()
      if (lastMove.captured) {
        const arr = capturedPieces.value[lastMove.captured.color]
        const idx = arr.map((p, i) => ({ p, i })).reverse().find(({ p }) => p.id === lastMove.captured!.id)?.i ?? -1
        if (idx >= 0) arr.splice(idx, 1)
      }
    }

    // Restore board from last snapshot
    if (replayBoards.value.length > 0) {
      board.value = cloneBoard(replayBoards.value[replayBoards.value.length - 1])
    } else {
      board.value = createInitialBoard()
    }

    // Restore turn
    currentTurn.value = moveHistory.value.length % 2 === 0 ? 'red' : 'black'
    selectedPiece.value = null
    legalMoves.value = []
    hint.value = null

    const nextTurn = currentTurn.value
    if (isCheckmate(board.value, nextTurn)) status.value = 'checkmate'
    else if (isStalemate(board.value, nextTurn)) status.value = 'draw'
    else if (isInCheck(board.value, nextTurn)) status.value = 'check'
    else status.value = 'playing'
  }

  function getHint() {
    if (!isPlayerTurn.value) return
    if (status.value !== 'playing' && status.value !== 'check') return

    const boardSnapshot = cloneBoard(board.value)
    const color = currentTurn.value

    isAIThinking.value = true
    setTimeout(() => {
      const move = getBestMove(boardSnapshot, color, 3)
      isAIThinking.value = false
      if (move) hint.value = { from: move.from, to: move.to }
    }, 100)
  }

  function startReplay() {
    if (moveHistory.value.length === 0) return
    status.value = 'replay'
    replayIndex.value = 0
    selectedPiece.value = null
    legalMoves.value = []
  }

  function replayStep(delta: number) {
    const max = replayBoards.value.length - 1
    replayIndex.value = Math.max(0, Math.min(replayIndex.value + delta, max))
  }

  function exitReplay() {
    replayIndex.value = replayBoards.value.length - 1
    status.value = 'playing'
  }

  function setTheme(t: Theme) {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('chess-theme', t)
  }

  function serialize(): SerializedGameState {
    return {
      board: cloneBoard(board.value),
      currentTurn: currentTurn.value,
      moveHistory: moveHistory.value.map(m => ({
        ...m,
        boardSnapshot: cloneBoard(m.boardSnapshot),
      })),
      capturedPieces: {
        red: [...capturedPieces.value.red],
        black: [...capturedPieces.value.black],
      },
      status: status.value,
      playerColor: playerColor.value,
      mode: mode.value,
      difficulty: difficulty.value,
    }
  }

  function loadState(state: SerializedGameState) {
    board.value = state.board
    currentTurn.value = state.currentTurn
    moveHistory.value = state.moveHistory
    capturedPieces.value = state.capturedPieces
    status.value = state.status
    playerColor.value = state.playerColor
    mode.value = state.mode
    difficulty.value = state.difficulty
    selectedPiece.value = null
    legalMoves.value = []
    hint.value = null
    replayIndex.value = 0
    replayBoards.value = [createInitialBoard(), ...state.moveHistory.map(m => m.boardSnapshot)]
  }

  function loadSavedTheme() {
    const saved = localStorage.getItem('chess-theme') as Theme | null
    if (saved) setTheme(saved)
  }

  return {
    // State
    board, currentBoard, currentTurn, moveHistory, capturedPieces,
    status, playerColor, mode, difficulty, selectedPiece, legalMoves,
    hint, isAIThinking, replayIndex, theme, replayBoards,
    // Computed
    isPlayerTurn, isInReplay,
    // Actions
    newGame, selectPiece, makeMove, undoMove, getHint,
    startReplay, replayStep, exitReplay, setTheme,
    serialize, loadState, loadSavedTheme,
  }
})
