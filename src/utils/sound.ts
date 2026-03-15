let ctx: AudioContext | null = null

// Sound enabled state, persisted to localStorage
let _enabled = localStorage.getItem('chess-sound') !== 'off'

export function isSoundEnabled() { return _enabled }
export function toggleSound() {
  _enabled = !_enabled
  localStorage.setItem('chess-sound', _enabled ? 'on' : 'off')
  return _enabled
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function play(fn: (ctx: AudioContext) => void) {
  if (!_enabled) return
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
    fn(c)
  } catch {
    // silently ignore if Web Audio API not available
  }
}

// 落子音: 短促木質點擊
export function playMove() {
  play(ctx => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      data[i] = Math.exp(-t * 80) * (Math.random() * 0.6 + 0.4) * Math.sin(2 * Math.PI * 300 * t)
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    src.connect(gain).connect(ctx.destination)
    src.start()
  })
}

// 吃子音: 較重的碰撞聲
export function playCapture() {
  play(ctx => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate
      data[i] = Math.exp(-t * 40) * (Math.random() * 2 - 1) * 0.8
        + Math.exp(-t * 60) * Math.sin(2 * Math.PI * 180 * t) * 0.5
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.9, ctx.currentTime)
    src.connect(gain).connect(ctx.destination)
    src.start()
  })
}

// 將軍音: 警示雙音
export function playCheck() {
  play(ctx => {
    const now = ctx.currentTime
    ;[660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.4, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.25)
    })
  })
}

// 將死音: 三音下行
export function playCheckmate() {
  play(ctx => {
    const now = ctx.currentTime
    ;[880, 660, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.2)
      gain.gain.linearRampToValueAtTime(0.5, now + i * 0.2 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.2)
      osc.stop(now + i * 0.2 + 0.4)
    })
  })
}
