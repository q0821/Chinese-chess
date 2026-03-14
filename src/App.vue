<template>
  <div :data-theme="store.theme">
    <!-- Setup Screen -->
    <GameSetup v-if="store.status === 'setup'" />

    <!-- Game Screen -->
    <div v-else class="game-layout">
      <!-- Left: History -->
      <aside class="sidebar-left">
        <MoveHistory />
      </aside>

      <!-- Center: Board + Captured -->
      <main class="board-area">
        <!-- Top: Black player info -->
        <div class="player-info player-info--black" :class="{ active: store.currentTurn === 'black' && !gameOver }">
          <span class="player-name">⚫ 黑方</span>
          <span v-if="store.isAIThinking && store.currentTurn === 'black'" class="thinking">思考中...</span>
        </div>

        <GameBoard :flipped="store.playerColor === 'black' && store.mode === 'pvc'" />

        <!-- Bottom: Red player info -->
        <div class="player-info player-info--red" :class="{ active: store.currentTurn === 'red' && !gameOver }">
          <span class="player-name">🔴 紅方</span>
          <span v-if="store.isAIThinking && store.currentTurn === 'red'" class="thinking">思考中...</span>
        </div>

        <CapturedPieces />
      </main>

      <!-- Right: Controls -->
      <aside class="sidebar-right">
        <GameControls />

        <!-- Theme switcher -->
        <div class="theme-switcher">
          <button
            v-for="t in themes"
            :key="t.value"
            class="theme-btn"
            :class="{ active: store.theme === t.value }"
            @click="store.setTheme(t.value)"
          >{{ t.label }}</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGameStore } from './stores/game'
import GameSetup from './components/GameSetup.vue'
import GameBoard from './components/GameBoard.vue'
import GameControls from './components/GameControls.vue'
import MoveHistory from './components/MoveHistory.vue'
import CapturedPieces from './components/CapturedPieces.vue'
import type { Theme } from './game/types'

const store = useGameStore()

const gameOver = computed(() => store.status === 'checkmate' || store.status === 'draw')

const themes: { value: Theme; label: string }[] = [
  { value: 'traditional', label: '傳統' },
  { value: 'modern', label: '現代' },
]

onMounted(() => {
  store.loadSavedTheme()
})
</script>

<style scoped>
.game-layout {
  display: flex;
  gap: 16px;
  padding: 16px;
  min-height: 100vh;
  align-items: flex-start;
  justify-content: center;
}

.sidebar-left,
.sidebar-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 160px;
  max-width: 200px;
  padding-top: 8px;
}

.board-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  width: 100%;
  justify-content: center;
  font-family: var(--piece-font);
  font-size: 15px;
  color: var(--text-muted);
  background: var(--panel-bg);
  transition: all 0.2s;
}
.player-info.active {
  color: var(--text-main);
  box-shadow: 0 0 0 2px var(--accent);
}
.player-name { font-weight: 600; }

.theme-switcher {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.theme-btn {
  padding: 4px 10px;
  border: 2px solid var(--btn-secondary);
  border-radius: 20px;
  background: var(--btn-secondary);
  color: var(--text-main);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--piece-font);
  transition: all 0.15s;
}
.theme-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}

@media (max-width: 900px) {
  .game-layout {
    flex-direction: column;
    align-items: center;
    padding: 8px;
    gap: 8px;
  }
  .sidebar-left, .sidebar-right {
    max-width: 100%;
    width: 100%;
    min-width: unset;
    flex-direction: row;
    flex-wrap: wrap;
    padding-top: 0;
  }
  .sidebar-left { order: 3; }
  .sidebar-right { order: 2; }
  .board-area { order: 1; width: 100%; }
}
</style>
