<template>
  <div class="captured-container">
    <div class="captured-side">
      <div class="captured-label">黑方被吃</div>
      <div class="captured-pieces">
        <span v-for="p in store.capturedPieces.black" :key="p.id" class="captured-chip black">
          {{ pieceChar(p) }}
        </span>
        <span v-if="store.capturedPieces.black.length === 0" class="empty-text">—</span>
      </div>
    </div>
    <div class="captured-side">
      <div class="captured-label">紅方被吃</div>
      <div class="captured-pieces">
        <span v-for="p in store.capturedPieces.red" :key="p.id" class="captured-chip red">
          {{ pieceChar(p) }}
        </span>
        <span v-if="store.capturedPieces.red.length === 0" class="empty-text">—</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
import type { Piece } from '../game/types'

const store = useGameStore()

const PIECE_CHARS: Record<string, Record<string, string>> = {
  king:     { red: '帥', black: '將' },
  advisor:  { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse:    { red: '傌', black: '馬' },
  rook:     { red: '俥', black: '車' },
  cannon:   { red: '炮', black: '砲' },
  pawn:     { red: '兵', black: '卒' },
}

function pieceChar(p: Piece) {
  return PIECE_CHARS[p.type]?.[p.color] ?? '?'
}
</script>

<style scoped>
.captured-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  background: var(--panel-bg);
  border-radius: 8px;
}
.captured-side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}
.captured-label {
  font-size: 13px;
  color: var(--text-muted);
  min-width: 56px;
  font-family: var(--piece-font);
}
.captured-pieces {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.captured-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 14px;
  font-family: var(--piece-font);
  font-weight: bold;
}
.captured-chip.red {
  background: var(--piece-red-outer);
  color: var(--piece-red-text);
  border: 1px solid var(--piece-red-border);
}
.captured-chip.black {
  background: var(--piece-black-outer);
  color: var(--piece-black-text);
  border: 1px solid var(--piece-black-border);
}
.empty-text {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
