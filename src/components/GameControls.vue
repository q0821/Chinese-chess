<template>
  <div class="controls">
    <!-- Status bar -->
    <div class="status-bar" :class="statusClass">
      <span class="status-icon">{{ statusIcon }}</span>
      <span>{{ statusText }}</span>
    </div>

    <!-- In-game controls -->
    <template v-if="!store.isInReplay">
      <button
        class="btn btn-secondary"
        @click="store.undoMove()"
        :disabled="store.moveHistory.length === 0 || store.isAIThinking"
        title="悔棋"
      >↩ 悔棋</button>

      <button
        class="btn btn-secondary"
        @click="store.getHint()"
        :disabled="!store.isPlayerTurn || store.isAIThinking || gameOver"
        title="建議走法"
      >💡 建議</button>

      <button
        class="btn btn-secondary"
        @click="store.startReplay()"
        :disabled="store.moveHistory.length === 0"
        title="覆盤"
      >▶ 覆盤</button>

      <!-- Save/Load -->
      <div class="save-load">
        <button class="btn btn-small" @click="showSave = !showSave">💾 存檔</button>
        <button class="btn btn-small" @click="showLoad = !showLoad">📂 讀檔</button>
      </div>

      <div v-if="showSave" class="slot-menu">
        <button v-for="i in 3" :key="i" class="slot-btn" @click="saveToSlot(i)">
          存檔 {{ i }}
        </button>
      </div>

      <div v-if="showLoad" class="slot-menu">
        <button
          v-for="slot in saveSlots"
          :key="slot.label"
          class="slot-btn"
          :disabled="!slot.state"
          @click="loadFromSlot(slot)"
        >
          {{ slot.label }}
          <span class="slot-time" v-if="slot.timestamp">{{ formatTime(slot.timestamp) }}</span>
        </button>
      </div>

      <button
        class="btn btn-danger"
        @click="confirmNewGame"
        :disabled="store.isAIThinking"
      >⟳ 新局</button>
    </template>

    <!-- Replay controls -->
    <template v-else>
      <div class="replay-controls">
        <button class="btn btn-secondary" @click="store.replayStep(-Infinity)">⏮</button>
        <button class="btn btn-secondary" @click="store.replayStep(-1)">◀</button>
        <span class="replay-pos">{{ store.replayIndex }} / {{ store.moveHistory.length }}</span>
        <button class="btn btn-secondary" @click="store.replayStep(1)">▶</button>
        <button class="btn btn-secondary" @click="store.replayStep(Infinity)">⏭</button>
      </div>
      <button class="btn btn-primary" @click="store.exitReplay()">退出覆盤</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import { saveGame, getSaveSlots } from '../utils/storage'
import type { SaveSlot } from '../game/types'

const store = useGameStore()
const showSave = ref(false)
const showLoad = ref(false)
const saveSlots = ref<SaveSlot[]>(getSaveSlots())

const gameOver = computed(() =>
  store.status === 'checkmate' || store.status === 'draw'
)

const statusClass = computed(() => {
  if (store.status === 'checkmate') return 'status-checkmate'
  if (store.status === 'check') return 'status-check'
  if (store.status === 'draw') return 'status-draw'
  if (store.isAIThinking) return 'status-thinking'
  return store.currentTurn === 'red' ? 'status-red' : 'status-black'
})

const statusIcon = computed(() => {
  if (store.status === 'checkmate') return '👑'
  if (store.status === 'check') return '⚠️'
  if (store.status === 'draw') return '🤝'
  if (store.isAIThinking) return '🤔'
  return store.currentTurn === 'red' ? '🔴' : '⚫'
})

const statusText = computed(() => {
  if (store.status === 'checkmate') {
    const winner = store.currentTurn === 'red' ? '黑方' : '紅方'
    return `${winner}獲勝！`
  }
  if (store.status === 'check') {
    return `${store.currentTurn === 'red' ? '紅方' : '黑方'}被將軍！`
  }
  if (store.status === 'draw') return '和局'
  if (store.isAIThinking) return '電腦思考中...'
  if (store.status === 'replay') return `覆盤第 ${store.replayIndex} 步`
  return `${store.currentTurn === 'red' ? '紅方' : '黑方'}走棋`
})

function saveToSlot(slot: number) {
  saveGame(slot, store.serialize())
  saveSlots.value = getSaveSlots()
  showSave.value = false
}

function loadFromSlot(slot: SaveSlot) {
  if (!slot.state) return
  store.loadState(slot.state)
  showLoad.value = false
}

function confirmNewGame() {
  if (store.moveHistory.length > 0) {
    if (!confirm('確定要開始新局嗎？')) return
  }
  store.goToSetup()
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--panel-bg);
  border-radius: 8px;
  min-width: 160px;
}
.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--piece-font);
}
.status-red { background: rgba(220, 50, 50, 0.15); color: var(--red-color); }
.status-black { background: rgba(30, 30, 30, 0.1); color: var(--black-color); }
.status-check { background: rgba(255, 140, 0, 0.2); color: darkorange; }
.status-checkmate { background: rgba(220, 20, 60, 0.2); color: crimson; }
.status-draw { background: rgba(100, 100, 100, 0.15); color: gray; }
.status-thinking { background: rgba(60, 120, 220, 0.15); color: royalblue; }

.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: var(--piece-font);
  transition: opacity 0.15s, background 0.15s;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary { background: var(--btn-primary); color: white; }
.btn-secondary { background: var(--btn-secondary); color: var(--text-main); }
.btn-danger { background: var(--btn-danger); color: white; }
.btn-small { padding: 5px 8px; font-size: 12px; flex: 1; background: var(--btn-secondary); color: var(--text-main); }

.save-load {
  display: flex;
  gap: 6px;
}
.slot-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  background: var(--panel-header-bg);
  border-radius: 6px;
}
.slot-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border: none;
  background: var(--btn-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--piece-font);
  font-size: 13px;
  color: var(--text-main);
}
.slot-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.slot-time { font-size: 11px; color: var(--text-muted); }

.replay-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.replay-pos {
  font-size: 13px;
  color: var(--text-muted);
  flex: 1;
  text-align: center;
}
</style>
