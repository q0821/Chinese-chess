<template>
  <div class="board-wrapper">
    <svg
      :viewBox="`0 0 ${BOARD_W} ${BOARD_H}`"
      :width="BOARD_W"
      :height="BOARD_H"
      class="chess-board"
      @click="handleBoardClick"
    >
      <!-- Board background -->
      <rect x="0" y="0" :width="BOARD_W" :height="BOARD_H" class="board-bg" rx="4" />

      <!-- Grid lines -->
      <!-- Vertical lines -->
      <line
        v-for="c in 9"
        :key="`vl-${c}`"
        :x1="PADDING + (c-1)*CELL"
        :y1="PADDING"
        :x2="PADDING + (c-1)*CELL"
        :y2="PADDING + 9*CELL"
        class="board-line"
      />
      <!-- Horizontal lines -->
      <line
        v-for="r in 10"
        :key="`hl-${r}`"
        :x1="PADDING"
        :y1="PADDING + (r-1)*CELL"
        :x2="PADDING + 8*CELL"
        :y2="PADDING + (r-1)*CELL"
        class="board-line"
      />

      <!-- River text -->
      <text :x="BOARD_W/2 - 70" :y="PADDING + 4.5*CELL + 6" class="river-text">楚河</text>
      <text :x="BOARD_W/2 + 20" :y="PADDING + 4.5*CELL + 6" class="river-text">漢界</text>

      <!-- Palace diagonals - Red -->
      <line :x1="PADDING+3*CELL" :y1="PADDING+7*CELL" :x2="PADDING+5*CELL" :y2="PADDING+9*CELL" class="board-line" />
      <line :x1="PADDING+5*CELL" :y1="PADDING+7*CELL" :x2="PADDING+3*CELL" :y2="PADDING+9*CELL" class="board-line" />
      <!-- Palace diagonals - Black -->
      <line :x1="PADDING+3*CELL" :y1="PADDING+0*CELL" :x2="PADDING+5*CELL" :y2="PADDING+2*CELL" class="board-line" />
      <line :x1="PADDING+5*CELL" :y1="PADDING+0*CELL" :x2="PADDING+3*CELL" :y2="PADDING+2*CELL" class="board-line" />

      <!-- Legal move highlights -->
      <circle
        v-for="pos in store.legalMoves"
        :key="`legal-${pos.row}-${pos.col}`"
        :cx="cx(pos.col)"
        :cy="cy(pos.row)"
        :r="PIECE_R * 0.4"
        class="legal-dot"
        :class="{ 'legal-capture': !!store.currentBoard[pos.row][pos.col] }"
      />

      <!-- Hint highlight -->
      <template v-if="store.hint">
        <rect
          :x="cx(store.hint.from.col) - PIECE_R"
          :y="cy(store.hint.from.row) - PIECE_R"
          :width="PIECE_R * 2"
          :height="PIECE_R * 2"
          class="hint-highlight"
          rx="50%"
        />
        <rect
          :x="cx(store.hint.to.col) - PIECE_R"
          :y="cy(store.hint.to.row) - PIECE_R"
          :width="PIECE_R * 2"
          :height="PIECE_R * 2"
          class="hint-highlight hint-to"
          rx="50%"
        />
      </template>

      <!-- Last move highlight -->
      <template v-if="lastMove">
        <circle
          :cx="cx(lastMove.from.col)"
          :cy="cy(lastMove.from.row)"
          :r="PIECE_R * 0.9"
          class="last-move-highlight"
        />
        <circle
          :cx="cx(lastMove.to.col)"
          :cy="cy(lastMove.to.row)"
          :r="PIECE_R * 0.9"
          class="last-move-highlight"
        />
      </template>

      <!-- Pieces -->
      <ChessPieceEl
        v-for="{ piece, row, col } in pieces"
        :key="piece.id"
        :piece="piece"
        :cx="cx(col)"
        :cy="cy(row)"
        :radius="PIECE_R"
        :selected="store.selectedPiece?.row === row && store.selectedPiece?.col === col"
        :flipped="flipped"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import ChessPieceEl from './ChessPiece.vue'
import type { Piece } from '../game/types'

const store = useGameStore()

const CELL = 64
const PADDING = 40
const PIECE_R = 28
const BOARD_W = PADDING * 2 + 8 * CELL
const BOARD_H = PADDING * 2 + 9 * CELL

const props = defineProps<{ flipped?: boolean }>()

function cx(col: number) {
  const c = props.flipped ? 8 - col : col
  return PADDING + c * CELL
}
function cy(row: number) {
  const r = props.flipped ? 9 - row : row
  return PADDING + r * CELL
}

const pieces = computed(() => {
  const result: { piece: Piece; row: number; col: number }[] = []
  const b = store.currentBoard
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = b[r][c]
      if (p) result.push({ piece: p, row: r, col: c })
    }
  }
  return result
})

const lastMove = computed(() => {
  if (store.isInReplay) {
    return store.moveHistory[store.replayIndex - 1] ?? null
  }
  return store.moveHistory[store.moveHistory.length - 1] ?? null
})

function handleBoardClick(e: MouseEvent) {
  if (store.isInReplay) return
  if (store.status === 'checkmate' || store.status === 'draw') return

  const svg = e.currentTarget as SVGElement
  const rect = svg.getBoundingClientRect()
  const scaleX = BOARD_W / rect.width
  const scaleY = BOARD_H / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  const col = props.flipped
    ? 8 - Math.round((x - PADDING) / CELL)
    : Math.round((x - PADDING) / CELL)
  const row = props.flipped
    ? 9 - Math.round((y - PADDING) / CELL)
    : Math.round((y - PADDING) / CELL)

  if (col < 0 || col > 8 || row < 0 || row > 9) return
  store.selectPiece({ row, col })
}
</script>

<style scoped>
.board-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.chess-board {
  max-width: 100%;
  height: auto;
  cursor: pointer;
  filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3));
}
.board-bg {
  fill: var(--board-bg);
}
.board-line {
  stroke: var(--board-line);
  stroke-width: 1.2;
}
.river-text {
  font-size: 22px;
  fill: var(--board-line);
  font-family: var(--piece-font);
  dominant-baseline: middle;
  opacity: 0.6;
}
.legal-dot {
  fill: rgba(80, 200, 80, 0.55);
  pointer-events: none;
}
.legal-capture {
  fill: none;
  stroke: rgba(80, 200, 80, 0.8);
  stroke-width: 3;
  r: 26px;
}
.last-move-highlight {
  fill: rgba(255, 220, 0, 0.25);
  pointer-events: none;
}
.hint-highlight {
  fill: rgba(255, 165, 0, 0.3);
  stroke: orange;
  stroke-width: 2;
  pointer-events: none;
}
.hint-to {
  fill: rgba(255, 100, 0, 0.3);
  stroke: orangered;
}
</style>
