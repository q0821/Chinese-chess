<template>
  <g :style="{ transform: `translate(${cx}px,${cy}px)` }" class="chess-piece" :class="[piece.color, { selected }]">
    <!-- Outer ring -->
    <circle :r="radius" class="piece-outer" />
    <!-- Inner ring -->
    <circle :r="radius * 0.82" class="piece-inner" />
    <!-- Character -->
    <text
      class="piece-char"
      :style="{ fontSize: `${radius * 1.1}px` }"
      dominant-baseline="central"
      text-anchor="middle"
    >{{ pieceName }}</text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Piece } from '../game/types'

const props = defineProps<{
  piece: Piece
  cx: number
  cy: number
  radius: number
  selected: boolean
  flipped?: boolean
}>()

const PIECE_CHARS: Record<string, Record<string, string>> = {
  king:     { red: '帥', black: '將' },
  advisor:  { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse:    { red: '傌', black: '馬' },
  rook:     { red: '俥', black: '車' },
  cannon:   { red: '炮', black: '砲' },
  pawn:     { red: '兵', black: '卒' },
}

const pieceName = computed(() => PIECE_CHARS[props.piece.type]?.[props.piece.color] ?? '?')
</script>

<style scoped>
.chess-piece {
  cursor: pointer;
  transition: transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.15s;
}
.chess-piece:hover {
  filter: brightness(1.15);
}
.chess-piece.selected circle.piece-outer {
  stroke-width: 3.5;
  filter: drop-shadow(0 0 8px gold);
}

/* Red pieces */
.chess-piece.red .piece-outer {
  fill: var(--piece-red-outer);
  stroke: var(--piece-red-border);
  stroke-width: 2;
}
.chess-piece.red .piece-inner {
  fill: var(--piece-red-inner);
  stroke: var(--piece-red-border);
  stroke-width: 1;
}
.chess-piece.red .piece-char {
  fill: var(--piece-red-text);
  font-family: var(--piece-font);
  font-weight: bold;
}

/* Black pieces */
.chess-piece.black .piece-outer {
  fill: var(--piece-black-outer);
  stroke: var(--piece-black-border);
  stroke-width: 2;
}
.chess-piece.black .piece-inner {
  fill: var(--piece-black-inner);
  stroke: var(--piece-black-border);
  stroke-width: 1;
}
.chess-piece.black .piece-char {
  fill: var(--piece-black-text);
  font-family: var(--piece-font);
  font-weight: bold;
}
</style>
