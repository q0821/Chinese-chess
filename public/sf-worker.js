/**
 * Classic Web Worker — loads Fairy-Stockfish WASM and speaks Xiangqi UCI.
 *
 * Messages received from game.ts:
 *   { type: 'go', fen: string, timeMs: number }
 *   { type: 'stop' }
 *
 * Messages sent back:
 *   { type: 'move', from: {row,col}, to: {row,col} }
 *   { type: 'ready' }
 *   { type: 'error', msg: string }
 */

// ── FEN helpers ─────────────────────────────────────────────────────────────

const PIECE_CHAR = { king: 'k', advisor: 'a', elephant: 'b', horse: 'n', rook: 'r', cannon: 'c', pawn: 'p' }

function boardToFen(board, color) {
  let fen = ''
  for (let row = 0; row < 10; row++) {
    let empty = 0
    for (let col = 0; col < 9; col++) {
      const p = board[row][col]
      if (!p) { empty++; continue }
      if (empty) { fen += empty; empty = 0 }
      const ch = PIECE_CHAR[p.type] || '?'
      fen += p.color === 'red' ? ch.toUpperCase() : ch
    }
    if (empty) fen += empty
    if (row < 9) fen += '/'
  }
  // side to move: red = 'w', black = 'b'
  fen += color === 'red' ? ' w' : ' b'
  fen += ' - - 0 1'
  return fen
}

// UCI move 'a9b7' → { from: {row,col}, to: {row,col} }
// file a-i = col 0-8; rank 0-9 where rank 0 = red back rank = row 9
function uciToMove(uci) {
  if (!uci || uci.length < 4) return null
  const fromCol = uci.charCodeAt(0) - 97   // 'a'=0
  const fromRow = 9 - parseInt(uci[1], 10)  // rank 0 → row 9
  const toCol   = uci.charCodeAt(2) - 97
  const toRow   = 9 - parseInt(uci[3], 10)
  return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } }
}

// ── Engine lifecycle ─────────────────────────────────────────────────────────

importScripts('/stockfish.js')

let sf = null
let ready = false

async function initEngine() {
  try {
    sf = await Stockfish()
    sf.addMessageListener(handleEngineOutput)
    sf.postMessage('uci')
    sf.postMessage('setoption name Variant value xiangqi')
    sf.postMessage('setoption name Threads value 1')
    sf.postMessage('isready')
  } catch (err) {
    self.postMessage({ type: 'error', msg: String(err) })
  }
}

function handleEngineOutput(line) {
  if (line === 'readyok' && !ready) {
    ready = true
    self.postMessage({ type: 'ready' })
    return
  }
  if (line.startsWith('bestmove')) {
    const parts = line.split(' ')
    const uciMove = parts[1]
    if (!uciMove || uciMove === '(none)') {
      self.postMessage({ type: 'move', from: null, to: null })
      return
    }
    const move = uciToMove(uciMove)
    if (move) self.postMessage({ type: 'move', from: move.from, to: move.to })
    else self.postMessage({ type: 'move', from: null, to: null })
  }
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = function (e) {
  const msg = e.data
  if (msg.type === 'go' && sf && ready) {
    const fen = msg.fen || boardToFen(msg.board, msg.color)
    sf.postMessage('stop')
    sf.postMessage('position fen ' + fen)
    sf.postMessage('go movetime ' + (msg.timeMs || 3000))
  } else if (msg.type === 'stop' && sf) {
    sf.postMessage('stop')
  }
}

initEngine()
