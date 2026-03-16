import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Board, Difficulty, GameMode, GameStatus, Move, Piece, PieceColor, Position,
  SerializedGameState, Theme,
} from '../game/types'
import { createInitialBoard, applyMove, cloneBoard } from '../game/board'
import { getLegalMoves, isInCheck, isCheckmate, isStalemate } from '../game/rules'
import { generateNotation } from '../game/notation'
import { autoSave } from '../utils/storage'
import { playMove, playCapture, playCheck, playCheckmate } from '../utils/sound'

export const useGameStore = defineStore('game', () => {
  // State
  const board = ref<Board>(createInitialBoard())
  const initialBoard = ref<Board>(createInitialBoard())
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

  // Minimax worker (easy/medium) — created per-move
  let aiWorker: Worker | null = null

  // Stockfish worker (hard/expert) — persisted across moves
  let sfWorker: Worker | null = null
  let sfWorkerReady = false
  let sfPendingGo: (() => void) | null = null

  function ensureSfWorker() {
    if (sfWorker) return
    const worker = new Worker('/sf-worker.js')
    sfWorker = worker
    sfWorkerReady = false
    worker.onmessage = (e: MessageEvent<{ type: string; from?: Position; to?: Position; msg?: string }>) => {
      // Discard messages from stale workers (terminated but queued before terminate)
      if (sfWorker !== worker) return
      const data = e.data
      if (data.type === 'ready') {
        sfWorkerReady = true
        sfPendingGo?.()
        sfPendingGo = null
      } else if (data.type === 'move') {
        isAIThinking.value = false
        // Ignore stale results if it's no longer the AI's turn
        if (
          data.from && data.to &&
          mode.value === 'pvc' &&
          currentTurn.value !== playerColor.value &&
          (status.value === 'playing' || status.value === 'check')
        ) {
          makeMove(data.from as Position, data.to as Position)
        }
      } else if (data.type === 'error') {
        // WASM init failed (no SharedArrayBuffer) — kill SF worker and fall back to minimax
        sfWorker?.terminate()
        sfWorker = null
        sfWorkerReady = false
        sfPendingGo = null
        isAIThinking.value = false
        const snap = cloneBoard(board.value)
        triggerMinimaxFallback(snap, currentTurn.value, difficulty.value, moveHistory.value.length)
      }
    }
    worker.onerror = () => {
      if (sfWorker !== worker) return
      sfWorker?.terminate()
      sfWorker = null
      sfWorkerReady = false
      sfPendingGo = null
      isAIThinking.value = false
      const snap = cloneBoard(board.value)
      triggerMinimaxFallback(snap, currentTurn.value, difficulty.value, moveHistory.value.length)
    }
  }

  function killSfWorker() {
    sfWorker?.terminate()
    sfWorker = null
    sfWorkerReady = false
    sfPendingGo = null
  }

  function killAllWorkers() {
    aiWorker?.terminate()
    aiWorker = null
    killSfWorker()
  }

  // Computed
  const isPlayerTurn = computed(() => {
    if (mode.value === 'pvp') return true
    return currentTurn.value === playerColor.value
  })

  const isInReplay = computed(() => status.value === 'replay')

  // Boards are reconstructed from moveHistory snapshots — no duplicate storage
  const currentBoard = computed(() => {
    if (isInReplay.value) {
      if (replayIndex.value === 0) return initialBoard.value
      return moveHistory.value[replayIndex.value - 1].boardSnapshot
    }
    return board.value
  })

  // Actions
  function newGame(opts?: { mode?: GameMode; difficulty?: Difficulty; playerColor?: PieceColor }) {
    killAllWorkers()
    board.value = createInitialBoard()
    initialBoard.value = cloneBoard(board.value)
    currentTurn.value = 'red'
    moveHistory.value = []
    capturedPieces.value = { red: [], black: [] }
    selectedPiece.value = null
    legalMoves.value = []
    hint.value = null
    isAIThinking.value = false
    replayIndex.value = 0
    status.value = 'playing'

    if (opts?.mode) mode.value = opts.mode
    if (opts?.difficulty) difficulty.value = opts.difficulty
    if (opts?.playerColor) playerColor.value = opts.playerColor

    // Pre-warm Stockfish for hard/expert so first move has no load delay
    if (mode.value === 'pvc' && (difficulty.value === 'hard' || difficulty.value === 'expert')) {
      ensureSfWorker()
    }

    // If AI goes first (player chose black)
    if (mode.value === 'pvc' && playerColor.value === 'black') {
      triggerAI()
    }
  }

  function goToSetup() {
    killAllWorkers()
    isAIThinking.value = false
    status.value = 'setup'
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
      playCheckmate()
    } else if (isStalemate(newBoard, nextTurn)) {
      status.value = 'draw'
      currentTurn.value = nextTurn
      playCheckmate()
    } else if (isInCheck(newBoard, nextTurn)) {
      status.value = 'check'
      currentTurn.value = nextTurn
      playCheck()
    } else {
      status.value = 'playing'
      currentTurn.value = nextTurn
      if (captured) playCapture(); else playMove()
    }

    // Auto-save
    autoSave(serialize())

    // AI turn
    if (status.value === 'playing' || status.value === 'check') {
      if (mode.value === 'pvc' && currentTurn.value !== playerColor.value) {
        setTimeout(triggerAI, 500)
      }
    }
  }

  function triggerMinimaxFallback(
    boardSnapshot: Board,
    color: PieceColor,
    diff: Difficulty,
    moveCount: number,
  ) {
    const worker = new Worker(new URL('../ai/ai.worker.ts', import.meta.url), { type: 'module' })
    aiWorker = worker
    worker.onmessage = (e: MessageEvent<{ move: { from: Position; to: Position } | null }>) => {
      worker.terminate()
      if (aiWorker === worker) aiWorker = null
      isAIThinking.value = false
      if (e.data.move) makeMove(e.data.move.from, e.data.move.to)
    }
    worker.postMessage({ board: boardSnapshot, color, difficulty: diff, moveCount })
  }

  function triggerAI() {
    // Guard against stale setTimeout calls after undo / new game
    if (mode.value !== 'pvc') return
    if (currentTurn.value === playerColor.value) return
    if (status.value !== 'playing' && status.value !== 'check') return

    // Stop any running minimax worker; keep sfWorker alive to avoid reload
    aiWorker?.terminate()
    aiWorker = null
    sfPendingGo = null
    sfWorker?.postMessage({ type: 'stop' })
    isAIThinking.value = true
    const boardSnapshot = cloneBoard(board.value)
    const color = currentTurn.value
    const diff = difficulty.value
    const moveCount = moveHistory.value.length

    if (diff === 'hard' || diff === 'expert') {
      // Fairy-Stockfish (NNUE) path — worker persists across moves (no reload cost)
      const timeMs = diff === 'expert' ? 5000 : 2000
      const sendGo = () => {
        sfWorker?.postMessage({ type: 'go', board: boardSnapshot, color, timeMs })
      }
      ensureSfWorker()
      if (sfWorkerReady) {
        sendGo()
      } else {
        sfPendingGo = sendGo
      }
    } else {
      // Single-worker minimax for easy / medium
      triggerMinimaxFallback(boardSnapshot, color, diff, moveCount)
    }
  }

  function undoMove() {
    if (moveHistory.value.length === 0) return
    if (isInReplay.value) return

    killAllWorkers()
    isAIThinking.value = false

    // In PvC mode, undo both AI move and player move
    const undoCount = mode.value === 'pvc' && moveHistory.value.length >= 2 ? 2 : 1

    for (let i = 0; i < undoCount; i++) {
      if (moveHistory.value.length === 0) break
      const lastMove = moveHistory.value.pop()!
      if (lastMove.captured) {
        const arr = capturedPieces.value[lastMove.captured.color]
        const idx = arr.map((p, i) => ({ p, i })).reverse().find(({ p }) => p.id === lastMove.captured!.id)?.i ?? -1
        if (idx >= 0) arr.splice(idx, 1)
      }
    }

    // Restore board from history or initial board
    if (moveHistory.value.length > 0) {
      board.value = cloneBoard(moveHistory.value[moveHistory.value.length - 1].boardSnapshot)
    } else {
      board.value = cloneBoard(initialBoard.value)
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

    isAIThinking.value = true
    const boardSnapshot = cloneBoard(board.value)
    const color = currentTurn.value

    const worker = new Worker(new URL('../ai/ai.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e: MessageEvent<{ move: { from: Position; to: Position } | null }>) => {
      worker.terminate()
      isAIThinking.value = false
      if (e.data.move) hint.value = { from: e.data.move.from, to: e.data.move.to }
    }

    // Use medium difficulty for hints (depth 2)
    worker.postMessage({ board: boardSnapshot, color, difficulty: 'medium', moveCount: moveHistory.value.length })
  }

  function startReplay() {
    if (moveHistory.value.length === 0) return
    status.value = 'replay'
    replayIndex.value = 0
    selectedPiece.value = null
    legalMoves.value = []
  }

  function replayStep(delta: number) {
    const max = moveHistory.value.length
    replayIndex.value = Math.max(0, Math.min(replayIndex.value + delta, max))
  }

  function exitReplay() {
    replayIndex.value = 0
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
    killAllWorkers()
    board.value = state.board
    initialBoard.value = createInitialBoard()
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
    isAIThinking.value = false
    replayIndex.value = 0
  }

  function loadSavedTheme() {
    const saved = localStorage.getItem('chess-theme') as Theme | null
    if (saved) setTheme(saved)
  }

  return {
    // State
    board, currentBoard, currentTurn, moveHistory, capturedPieces,
    status, playerColor, mode, difficulty, selectedPiece, legalMoves,
    hint, isAIThinking, replayIndex, theme,
    // Computed
    isPlayerTurn, isInReplay,
    // Actions
    newGame, goToSetup, selectPiece, makeMove, undoMove, getHint,
    startReplay, replayStep, exitReplay, setTheme,
    serialize, loadState, loadSavedTheme,
  }
})
