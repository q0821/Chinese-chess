<template>
  <div class="history-panel">
    <div class="history-header">棋譜</div>
    <div class="history-list" ref="listRef">
      <div
        v-for="(move, i) in store.moveHistory"
        :key="i"
        class="history-row"
        :class="{ active: store.isInReplay && store.replayIndex === i + 1 }"
        @click="store.isInReplay && jumpToMove(i + 1)"
      >
        <span class="move-number">{{ Math.floor(i / 2) + 1 }}.</span>
        <span class="move-notation" :class="move.piece.color">{{ move.notation }}</span>
        <span v-if="move.captured" class="capture-indicator">×</span>
      </div>
      <div v-if="store.moveHistory.length === 0" class="empty-history">尚未走棋</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const listRef = ref<HTMLElement>()

function jumpToMove(index: number) {
  store.replayIndex = index
}

// Auto-scroll to bottom when new moves added
watch(() => store.moveHistory.length, async () => {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
})
</script>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border-radius: 8px;
  overflow: hidden;
  min-width: 140px;
  max-height: 400px;
}
.history-header {
  padding: 8px 12px;
  font-weight: bold;
  font-size: 14px;
  background: var(--panel-header-bg);
  color: var(--text-main);
  font-family: var(--piece-font);
}
.history-list {
  overflow-y: auto;
  flex: 1;
  padding: 4px 0;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 13px;
  transition: background 0.15s;
}
.history-row.active {
  background: var(--highlight-bg);
}
.history-row:hover {
  background: var(--hover-bg);
  cursor: pointer;
}
.move-number {
  color: var(--text-muted);
  min-width: 24px;
  font-size: 12px;
}
.move-notation {
  font-family: var(--piece-font);
  font-size: 14px;
}
.move-notation.red { color: var(--red-color); }
.move-notation.black { color: var(--black-color); }
.capture-indicator {
  font-size: 11px;
  color: var(--text-muted);
}
.empty-history {
  padding: 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
