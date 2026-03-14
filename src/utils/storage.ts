import type { SaveSlot, SerializedGameState } from '../game/types'

const SAVE_KEY_PREFIX = 'chinese-chess-save-'
const NUM_SLOTS = 3

export function getSaveSlots(): SaveSlot[] {
  const slots: SaveSlot[] = []
  for (let i = 1; i <= NUM_SLOTS; i++) {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + i)
    if (raw) {
      try {
        const data = JSON.parse(raw) as SaveSlot
        slots.push(data)
      } catch {
        slots.push({ label: `存檔 ${i}`, timestamp: 0, state: null })
      }
    } else {
      slots.push({ label: `存檔 ${i}`, timestamp: 0, state: null })
    }
  }
  return slots
}

export function saveGame(slot: number, state: SerializedGameState): void {
  const data: SaveSlot = {
    label: `存檔 ${slot}`,
    timestamp: Date.now(),
    state,
  }
  localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(data))
}

export function loadGame(slot: number): SerializedGameState | null {
  const raw = localStorage.getItem(SAVE_KEY_PREFIX + slot)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as SaveSlot
    return data.state
  } catch {
    return null
  }
}

export function deleteSave(slot: number): void {
  localStorage.removeItem(SAVE_KEY_PREFIX + slot)
}

export function autoSave(state: SerializedGameState): void {
  localStorage.setItem('chinese-chess-autosave', JSON.stringify(state))
}

export function loadAutoSave(): SerializedGameState | null {
  const raw = localStorage.getItem('chinese-chess-autosave')
  if (!raw) return null
  try {
    return JSON.parse(raw) as SerializedGameState
  } catch {
    return null
  }
}
