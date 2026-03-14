<template>
  <div class="setup-overlay">
    <div class="setup-card">
      <h1 class="setup-title">象棋</h1>
      <p class="setup-subtitle">中國象棋 · Chinese Chess</p>

      <!-- Game Mode -->
      <div class="setup-section">
        <div class="setup-label">遊戲模式</div>
        <div class="toggle-group">
          <button
            class="toggle-btn"
            :class="{ active: gameMode === 'pvp' }"
            @click="gameMode = 'pvp'"
          >👥 雙人對戰</button>
          <button
            class="toggle-btn"
            :class="{ active: gameMode === 'pvc' }"
            @click="gameMode = 'pvc'"
          >🤖 人機對戰</button>
        </div>
      </div>

      <!-- Player Color (PvC only) -->
      <transition name="fade">
        <div class="setup-section" v-if="gameMode === 'pvc'">
          <div class="setup-label">執子顏色</div>
          <div class="toggle-group">
            <button
              class="toggle-btn color-btn red"
              :class="{ active: playerColor === 'red' }"
              @click="playerColor = 'red'"
            >🔴 紅方（先手）</button>
            <button
              class="toggle-btn color-btn black"
              :class="{ active: playerColor === 'black' }"
              @click="playerColor = 'black'"
            >⚫ 黑方（後手）</button>
          </div>
        </div>
      </transition>

      <!-- Difficulty (PvC only) -->
      <transition name="fade">
        <div class="setup-section" v-if="gameMode === 'pvc'">
          <div class="setup-label">電腦難度</div>
          <div class="difficulty-grid">
            <button
              v-for="d in difficulties"
              :key="d.value"
              class="diff-btn"
              :class="{ active: difficulty === d.value }"
              @click="difficulty = d.value"
            >
              <span class="diff-icon">{{ d.icon }}</span>
              <span class="diff-name">{{ d.label }}</span>
              <span class="diff-desc">{{ d.desc }}</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- Continue game if autosave exists -->
      <div class="setup-section" v-if="hasAutoSave">
        <button class="btn btn-outline" @click="continueGame">▶ 繼續上次對局</button>
      </div>

      <!-- Start -->
      <button class="btn btn-start" @click="startGame">開始遊戲</button>

      <!-- Theme -->
      <div class="theme-row">
        <span class="setup-label">介面主題：</span>
        <button
          v-for="t in themes"
          :key="t.value"
          class="theme-btn"
          :class="{ active: store.theme === t.value }"
          @click="store.setTheme(t.value)"
        >{{ t.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import type { Difficulty, GameMode, PieceColor, Theme } from '../game/types'
import { loadAutoSave } from '../utils/storage'

const store = useGameStore()
const gameMode = ref<GameMode>('pvc')
const playerColor = ref<PieceColor>('red')
const difficulty = ref<Difficulty>('medium')
const hasAutoSave = ref(false)

const difficulties: { value: Difficulty; label: string; icon: string; desc: string }[] = [
  { value: 'easy', label: '入門', icon: '🌱', desc: '隨機走法' },
  { value: 'medium', label: '中級', icon: '⚔️', desc: '搜尋深度 3' },
  { value: 'hard', label: '高手', icon: '🔥', desc: '深度 4 + 開局書' },
  { value: 'expert', label: '大師', icon: '👑', desc: '深度 6 迭代加深' },
]

const themes: { value: Theme; label: string }[] = [
  { value: 'traditional', label: '傳統' },
  { value: 'modern', label: '現代' },
]

onMounted(() => {
  hasAutoSave.value = !!loadAutoSave()
})

function startGame() {
  store.newGame({ mode: gameMode.value, difficulty: difficulty.value, playerColor: playerColor.value })
}

function continueGame() {
  const saved = loadAutoSave()
  if (saved) store.loadState(saved)
}
</script>

<style scoped>
.setup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.setup-card {
  background: var(--panel-bg);
  border-radius: 16px;
  padding: 32px 28px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 8px 40px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.setup-title {
  text-align: center;
  font-size: 42px;
  font-family: var(--piece-font);
  color: var(--red-color);
  margin: 0;
}
.setup-subtitle {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  margin: -12px 0 0;
}
.setup-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.setup-label {
  font-size: 13px;
  color: var(--text-muted);
  font-family: var(--piece-font);
}
.toggle-group {
  display: flex;
  gap: 8px;
}
.toggle-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid var(--btn-secondary);
  border-radius: 8px;
  background: var(--btn-secondary);
  color: var(--text-main);
  cursor: pointer;
  font-family: var(--piece-font);
  font-size: 14px;
  transition: all 0.15s;
}
.toggle-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.diff-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 8px;
  border: 2px solid var(--btn-secondary);
  border-radius: 8px;
  background: var(--btn-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.diff-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
}
.diff-icon { font-size: 20px; }
.diff-name { font-family: var(--piece-font); font-weight: 600; font-size: 14px; color: var(--text-main); }
.diff-desc { font-size: 11px; color: var(--text-muted); }

.btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--piece-font);
  font-size: 15px;
  transition: opacity 0.15s;
}
.btn-start {
  background: var(--red-color);
  color: white;
  font-size: 18px;
  font-weight: bold;
  padding: 14px;
}
.btn-outline {
  background: transparent;
  border: 2px solid var(--accent);
  color: var(--accent);
  font-size: 14px;
}
.theme-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.theme-btn {
  padding: 5px 12px;
  border: 2px solid var(--btn-secondary);
  border-radius: 20px;
  background: var(--btn-secondary);
  color: var(--text-main);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--piece-font);
  transition: all 0.15s;
}
.theme-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, max-height 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; max-height: 0; overflow: hidden; }
</style>
