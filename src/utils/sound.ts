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

/** Fill a buffer with the wooden-piece-on-board click sound.
 *  formula = fast noise burst (impact crack) + decaying harmonic stack (wood body)
 */
function fillWoodClick(
  data: Float32Array,
  sr: number,
  fundamental: number,  // Hz – resonant pitch of piece
  crackDecay: number,   // higher = shorter crack transient
  bodyDecay: number,    // higher = shorter resonance tail
  crackAmp: number,
  bodyAmp: number,
) {
  for (let i = 0; i < data.length; i++) {
    const t = i / sr
    const crack = Math.exp(-t * crackDecay) * (Math.random() * 2 - 1) * crackAmp
    const body =
      Math.exp(-t * bodyDecay)       * Math.sin(2 * Math.PI * fundamental       * t) * bodyAmp +
      Math.exp(-t * bodyDecay * 1.6) * Math.sin(2 * Math.PI * fundamental * 2   * t) * bodyAmp * 0.35 +
      Math.exp(-t * bodyDecay * 2.5) * Math.sin(2 * Math.PI * fundamental * 3.5 * t) * bodyAmp * 0.12
    data[i] = crack + body
  }
}

function playBuffer(ctx: AudioContext, buf: AudioBuffer, when: number, gainVal: number) {
  const src = ctx.createBufferSource()
  src.buffer = buf
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(gainVal, when)
  src.connect(gain).connect(ctx.destination)
  src.start(when)
}

// ── 落子音: 輕脆木質點擊（棋子放上棋盤）─────────────────────────────────
export function playMove() {
  play(ctx => {
    const sr = ctx.sampleRate
    const buf = ctx.createBuffer(1, Math.floor(sr * 0.11), sr)
    fillWoodClick(buf.getChannelData(0), sr,
      /*fundamental*/ 430, /*crackDecay*/ 680, /*bodyDecay*/ 75,
      /*crackAmp*/ 0.28, /*bodyAmp*/ 1.0)
    playBuffer(ctx, buf, ctx.currentTime, 0.75)
  })
}

// ── 吃子音: 沉重撞擊（力道更強、音頻更低）───────────────────────────────
export function playCapture() {
  play(ctx => {
    const sr = ctx.sampleRate
    const buf = ctx.createBuffer(1, Math.floor(sr * 0.16), sr)
    fillWoodClick(buf.getChannelData(0), sr,
      /*fundamental*/ 270, /*crackDecay*/ 380, /*bodyDecay*/ 45,
      /*crackAmp*/ 0.55, /*bodyAmp*/ 1.0)
    playBuffer(ctx, buf, ctx.currentTime, 0.95)
  })
}

// ── 將軍音: 三連急叩 + 金屬餘音 ─────────────────────────────────────────
export function playCheck() {
  play(ctx => {
    const now = ctx.currentTime
    const sr = ctx.sampleRate

    // Three quick sharp knocks with increasing urgency
    ;[0, 0.13, 0.26].forEach((delay, i) => {
      const buf = ctx.createBuffer(1, Math.floor(sr * 0.09), sr)
      fillWoodClick(buf.getChannelData(0), sr,
        500 + i * 80, 700, 90, 0.25, 1.0)
      playBuffer(ctx, buf, now + delay, 0.7 + i * 0.1)
    })

    // Short metallic ring after the knocks
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1320, now + 0.38)
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.9)
    g.gain.setValueAtTime(0, now + 0.38)
    g.gain.linearRampToValueAtTime(0.22, now + 0.40)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
    osc.connect(g).connect(ctx.destination)
    osc.start(now + 0.38)
    osc.stop(now + 0.95)
  })
}

// ── 將死音: 四聲下行銅鑼 + 衝擊噪 ──────────────────────────────────────
export function playCheckmate() {
  play(ctx => {
    const now = ctx.currentTime
    const sr  = ctx.sampleRate

    // Descending gong hits
    ;[[660, 0], [495, 0.28], [330, 0.58], [247, 0.92]].forEach(([freq, delay]) => {
      const t0 = now + delay

      // Gong = 3 inharmonic partials (ratios from real gong spectra)
      ;[[1.0, 0.55], [2.76, 0.25], [5.40, 0.10]].forEach(([ratio, amp]) => {
        const f = freq * ratio
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, t0)
        osc.frequency.exponentialRampToValueAtTime(f * 0.975, t0 + 0.6)
        gain.gain.setValueAtTime(0, t0)
        gain.gain.linearRampToValueAtTime(amp, t0 + 0.004)
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t0)
        osc.stop(t0 + 0.6)
      })

      // Sharp impact noise at each gong strike
      const impactLen = Math.floor(sr * 0.025)
      const impBuf = ctx.createBuffer(1, impactLen, sr)
      const d = impBuf.getChannelData(0)
      for (let i = 0; i < impactLen; i++)
        d[i] = Math.exp(-i / impactLen * 12) * (Math.random() * 2 - 1)
      playBuffer(ctx, impBuf, t0, 0.5)
    })
  })
}
