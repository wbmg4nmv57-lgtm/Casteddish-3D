/* ######################################################################
   CASTEDDISH - Base e ambiente
   Configurazione, texture di muri e pavimenti, generazione dei piani.
   Sezioni, in ordine: config.js, textures.js, level-loader.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Configurazione di base
   Canvas, dimensioni, mappa 48x48, palette dei 5 piani, nomi dei
   piani, generatore casuale e ricerca percorsi (bfs).
   ====================================================================== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimapCanvas');
const miniCtx = miniCanvas.getContext('2d');
const RENDER_WIDTH = 512, RENDER_HEIGHT = 256;
canvas.width = RENDER_WIDTH; canvas.height = RENDER_HEIGHT;
miniCanvas.width = 256; miniCanvas.height = 256;

const N = 48, MAP_WIDTH = N, MAP_HEIGHT = N;
const CFG = [
  { rooms: 16, min: 6, max: 10, cw: 1 },
  { rooms: 24, min: 5, max: 7, cw: 2 },
  { maze: true },
  { rooms: 9, min: 8, max: 12, cw: 1, pillars: true, liq: 1 },
  { boss: true, liq: 2 }
];
const PAL = [
  { fire: ['#c81e0a', '#ff8a00', '#fff2a0'], glow: '255,170,60', fog: [10, 6, 4], amb: 0.55, kind: 'torch' },
  { fire: [], glow: '255,225,150', fog: [18, 14, 8], amb: 0.62, kind: 'bulb' },
  { fire: ['#c8501a', '#ffa030', '#fff0b0'], glow: '255,180,90', fog: [6, 8, 20], amb: 0.5, kind: 'candle' },
  { fire: [], glow: '120,255,150', fog: [6, 16, 10], amb: 0.62, kind: 'lantern' },
  { fire: [], glow: '255,70,40', fog: [6, 18, 4], amb: 0.6, kind: 'warn' }
];
const FLOOR_NAMES = ['DUNGEON DEI DEMONI', 'EDIFICIO ABBANDONATO', 'CASTELLO DI TRANSILVANIA', 'PALUDE MALEDETTA', 'FABBRICA TOSSICA'];
const ENEMY_OF = ['demon', 'ghoul', 'wraith', 'witch'];
const FLOOR_ORDER = [0, 1, 3, 2, 4];   // the third and fourth levels are swapped: progress index -> level
let progress = 0;
let map = new Uint8Array(N * N), torches = [], rooms = [], stairs = null, doorCell = -1, curFloor = 0, sr = 1;
const srand = () => (sr = (sr * 16807) % 2147483647) / 2147483647;
const ri = (a, b) => a + Math.floor(srand() * (b - a + 1));

// Breadth-first distance over cells that are 0 in grid (borders are always walls)
function bfs(grid, s, out) {
  out.fill(9999);
  const q = new Int16Array(N * N);
  let h = 0, t = 0;
  out[s] = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], d = out[c] + 1;
    if (!grid[c - 1] && out[c - 1] > d) { out[c - 1] = d; q[t++] = c - 1; }
    if (!grid[c + 1] && out[c + 1] > d) { out[c + 1] = d; q[t++] = c + 1; }
    if (!grid[c - N] && out[c - N] > d) { out[c - N] = d; q[t++] = c - N; }
    if (!grid[c + N] && out[c + N] > d) { out[c + N] = d; q[t++] = c + N; }
  }
}

/* ======================================================================
   CASTEDDISH - Texture dell'ambiente
   Disegna muri, pavimenti, soffitti, lampade, porte, liquidi, tubi e
   griglie. Include anche la porta delle scale con le tre chiavi.
   ====================================================================== */

const liq = new Uint8Array(N * N);
let fogS = '0,0,0', fogC = [0, 0, 0], liqBuf, liqEmit = 0;
const cv = () => { const c = mk(); c.width = c.height = TS; return [c, c.getContext('2d')]; };
const rgb = (b, v) => `rgb(${b[0] + v | 0},${b[1] + v | 0},${b[2] + v | 0})`;

function blockWall(base, rows, bw, mortar, o) {
  const [c, g] = cv(), bh = TS / rows;
  g.fillStyle = mortar; g.fillRect(0, 0, TS, TS);
  for (let r = 0; r < rows; r++) for (let b = -1; b <= TS / bw; b++) {
    const x = b * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = (rnd() - 0.5) * (o.var || 34);
    g.fillStyle = rgb(base, v); g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 1.5, y + 1.5, bw - 3, 2); g.fillRect(x + 1.5, y + 1.5, 2, bh - 3);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 1.5, y + bh - 4.5, bw - 3, 3); g.fillRect(x + bw - 4.5, y + 1.5, 3, bh - 3);
    for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 3 + rnd() * (bw - 8), y + 3 + rnd() * (bh - 8), 2 + rnd() * 5, 1 + rnd() * 3); }
  }
  for (let i = 0; i < (o.cracks || 0); i++) crack(g, rnd() * TS, rnd() * TS, 10 + rnd() * 20);
  if (o.moss) mossy(g, o.moss);
  if (o.stain) drips(g, o.stain, o.stainCol);
  grain(g, o.grain || 18);
  return c;
}

function paintBand(c, col) {
  const g = c.getContext('2d');
  g.fillStyle = col; g.beginPath(); g.moveTo(0, TS * 0.5);
  for (let x = 0; x <= TS; x += 8) g.lineTo(x, TS * 0.45 + rnd() * 14);
  g.lineTo(TS, TS); g.lineTo(0, TS); g.fill();
  for (let i = 0; i < 6; i++) crack(g, rnd() * TS, TS * 0.5 + rnd() * TS * 0.5, 14);
  grain(g, 14);
  return c;
}

function rivets(g, n) {
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * TS / n;
    for (const y of [6, TS - 6]) {
      g.fillStyle = 'rgba(30,24,20,.8)'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x - 1, y - 1.5, 1.5, 1.5);
    }
  }
}

function rustMetal() {
  const [c, g] = cv();
  for (let x = 0; x < TS; x += 8) {
    const gr = g.createLinearGradient(x, 0, x + 8, 0);
    gr.addColorStop(0, '#3a3430'); gr.addColorStop(0.5, '#8a8078'); gr.addColorStop(1, '#3a3430');
    g.fillStyle = gr; g.fillRect(x, 0, 8, TS);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${120 + rnd() * 50 | 0},${50 + rnd() * 30 | 0},20,.45)`;
    g.beginPath(); g.ellipse(rnd() * TS, rnd() * TS, 3 + rnd() * 10, 2 + rnd() * 8, 0, 0, 7); g.fill();
  }
  drips(g, 8, 'rgba(110,50,20,.45)'); rivets(g, 4); grain(g, 22);
  return c;
}

function banner(base) {
  const [c, g] = cv(); g.drawImage(base, 0, 0);
  g.save(); g.scale(TS / 64, TS / 64);
  g.fillStyle = '#7a0f1c'; g.beginPath(); g.moveTo(20, 4); g.lineTo(44, 4); g.lineTo(44, 54); g.lineTo(32, 46); g.lineTo(20, 54); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(40, 4, 4, 50);
  g.fillStyle = '#d8a020'; g.fillRect(20, 4, 24, 3); g.beginPath(); g.arc(32, 24, 6, 0, 7); g.fill();
  g.fillStyle = '#7a0f1c'; g.beginPath(); g.arc(32, 24, 3, 0, 7); g.fill();
  g.restore();
  return c;
}

function bark() {
  const [c, g] = cv();
  for (let x = 0; x < TS; x += 4) {
    const v = rnd() * 30;
    g.fillStyle = `rgb(${62 + v | 0},${50 + v * 0.8 | 0},${40 + v * 0.6 | 0})`; g.fillRect(x, 0, 4, TS);
  }
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    let x = rnd() * TS, y = 0; g.beginPath(); g.moveTo(x, y);
    while (y < TS) { x += (rnd() - 0.5) * 4; y += 6 + rnd() * 8; g.lineTo(x, y); }
    g.stroke();
  }
  mossy(g, 40); grain(g, 20);
  return c;
}

function plates(hazard) {
  const [c, g] = cv();
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const x = i * 64, y = j * 64, gr = g.createLinearGradient(x, y, x + 64, y + 64);
    gr.addColorStop(0, '#6a7078'); gr.addColorStop(1, '#3a3f46');
    g.fillStyle = gr; g.fillRect(x + 1, y + 1, 62, 62);
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeRect(x + 1.5, y + 1.5, 61, 61);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + 2, y + 2, 60, 2);
    for (const [rx, ry] of [[6, 6], [58, 6], [6, 58], [58, 58]]) {
      g.fillStyle = '#23272c'; g.beginPath(); g.arc(x + rx, y + ry, 2.6, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + rx - 1, y + ry - 1.5, 1.5, 1.5);
    }
  }
  if (hazard) {
    g.save(); g.beginPath(); g.rect(0, 40, TS, 48); g.clip();
    g.fillStyle = '#d8b410'; g.fillRect(0, 40, TS, 48); g.fillStyle = '#1a1a1a';
    for (let x = -64; x < TS + 64; x += 24) { g.beginPath(); g.moveTo(x, 88); g.lineTo(x + 12, 88); g.lineTo(x + 60, 40); g.lineTo(x + 48, 40); g.closePath(); g.fill(); }
    g.restore();
  } else drips(g, 10, 'rgba(40,120,20,.4)');
  for (let i = 0; i < 20; i++) {
    g.fillStyle = 'rgba(90,50,20,.3)'; g.beginPath(); g.ellipse(rnd() * TS, rnd() * TS, 2 + rnd() * 7, 2 + rnd() * 5, 0, 0, 7); g.fill();
  }
  grain(g, 22);
  return c;
}

function decor(f, base) {
  const [c, g] = cv(); g.drawImage(base, 0, 0);
  g.save(); g.scale(TS / 64, TS / 64);
  if (f === 0) {
    g.fillStyle = '#050403'; g.fillRect(14, 20, 36, 44); g.beginPath(); g.arc(32, 20, 18, Math.PI, 0); g.fill();
    g.fillStyle = '#3a2f26'; g.fillRect(12, 20, 2, 44); g.fillRect(50, 20, 2, 44);
    for (const [sx, sy] of [[24, 40], [40, 40], [32, 53]]) {
      g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.fill(); g.fillRect(sx - 3, sy + 3, 6, 4);
      g.fillStyle = '#000'; g.fillRect(sx - 4, sy - 2, 3, 3); g.fillRect(sx + 1, sy - 2, 3, 3); g.fillRect(sx - 1, sy + 3, 2, 3);
    }
  } else if (f === 1) {
    g.fillStyle = '#04060a'; g.fillRect(12, 10, 40, 42); g.fillStyle = 'rgba(255,210,140,.22)'; g.fillRect(14, 12, 36, 38);
    for (const [y, a] of [[14, -0.08], [27, 0.07], [40, -0.04]]) {
      g.save(); g.translate(8, y); g.rotate(a);
      g.fillStyle = '#5a4630'; g.fillRect(0, 0, 48, 8); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 6, 48, 2);
      g.fillStyle = '#9a9a9a'; g.fillRect(4, 3, 2, 2); g.fillRect(42, 3, 2, 2); g.restore();
    }
  } else if (f === 2) {
    g.save(); g.beginPath(); g.moveTo(16, 60); g.lineTo(16, 24); g.arc(32, 24, 16, Math.PI, 0); g.lineTo(48, 60); g.closePath(); g.clip();
    const cols = ['#b01030', '#6a20b0', '#d8a020', '#1a60b0'];
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { g.fillStyle = cols[(i + j * 3) % 4]; g.fillRect(16 + i * 8, 6 + j * 7, 8, 7); }
    g.restore(); g.strokeStyle = '#0a0a10'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(16, 60); g.lineTo(16, 24); g.arc(32, 24, 16, Math.PI, 0); g.lineTo(48, 60); g.closePath(); g.stroke();
    g.beginPath();
    for (let i = 1; i < 4; i++) { g.moveTo(16 + i * 8, 8); g.lineTo(16 + i * 8, 60); }
    for (let j = 1; j < 8; j++) { g.moveTo(16, 6 + j * 7); g.lineTo(48, 6 + j * 7); }
    g.stroke();
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(150,80,200,.12)'; g.fillRect(8, 4, 48, 60); g.globalCompositeOperation = 'source-over';
  } else if (f === 3) {
    for (const [x, y, r] of [[20, 56, 6], [32, 58, 8], [45, 54, 5]]) {
      g.fillStyle = '#d8e8c0'; g.fillRect(x - 1.5, y - 6, 3, 8);
      const gl = g.createRadialGradient(x, y - 6, 1, x, y - 6, r * 3);
      gl.addColorStop(0, 'rgba(100,255,140,.45)'); gl.addColorStop(1, 'rgba(100,255,140,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(x - r * 3, y - 6 - r * 3, r * 6, r * 6); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#4ee070'; g.beginPath(); g.ellipse(x, y - 6, r, r * 0.7, 0, Math.PI, 0); g.fill();
    }
  } else {
    g.fillStyle = '#d8b410'; g.fillRect(12, 12, 40, 40); g.strokeStyle = '#111'; g.lineWidth = 2; g.strokeRect(13, 13, 38, 38);
    g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { const a = k * 2.094 - 1.57; g.beginPath(); g.arc(32 + Math.cos(a) * 7, 32 + Math.sin(a) * 7, 6, 0, 7); g.stroke(); }
    g.fillStyle = '#111'; g.beginPath(); g.arc(32, 32, 2.5, 0, 7); g.fill();
  }
  g.restore();
  return c;
}

function lamp(f, base, kind, P) {
  const [c, g] = cv(); g.drawImage(base, 0, 0);
  g.save(); g.scale(TS / 64, TS / 64);
  const k = [1, 0.7, 0.9, 0.45][f];
  if (kind === 'torch') { g.fillStyle = '#2a2a2e'; g.fillRect(27, 38, 10, 3); g.fillRect(29, 36, 6, 4); g.fillStyle = '#4a2c14'; g.fillRect(30, 26, 4, 14); }
  else if (kind === 'bulb') { g.fillStyle = '#26262a'; g.fillRect(30, 30, 4, 14); g.fillRect(26, 42, 12, 3); }
  else if (kind === 'candle') {
    g.fillStyle = '#2a2a2e'; g.fillRect(31, 34, 2, 12); g.fillRect(22, 32, 20, 2);
    for (const x of [23, 32, 41]) { g.fillStyle = '#e8e0c8'; g.fillRect(x - 1.5, 24, 3, 9); }
  } else if (kind === 'lantern') {
    g.strokeStyle = '#222'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 14); g.stroke();
    g.fillStyle = '#1c1c20'; g.fillRect(25, 14, 14, 3); g.fillRect(25, 32, 14, 3);
  } else { g.fillStyle = '#2a2a2e'; g.fillRect(24, 28, 16, 18); }
  const gl = g.createRadialGradient(32, 24, 2, 32, 24, 30);
  gl.addColorStop(0, `rgba(${P.glow},${0.65 * (kind === 'torch' || kind === 'candle' ? 1 : k)})`); gl.addColorStop(1, `rgba(${P.glow},0)`);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'source-over';
  const j = [0, 2, -2, 1][f], h = [0, 3, -2, 2][f];
  const flame = (x, y, w, ht, col, dx) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w, y);
    g.quadraticCurveTo(x - w, y - ht * 0.5, x + j + dx, y - ht);
    g.quadraticCurveTo(x + w, y - ht * 0.5, x + w, y);
    g.quadraticCurveTo(x, y + w * 0.8, x - w, y); g.fill();
  };
  if (kind === 'torch') paintFlame(g, 32, 29, 8.5, 25, f, { sparks: 1 });
  else if (kind === 'candle') { for (const x of [23, 32, 41]) paintFlame(g, x, 24.5, 2.7, 9.5, f, { ph: x * 0.7, halo: 0, sparks: 0 }); }
  else if (kind === 'bulb') {
    g.strokeStyle = '#555'; g.lineWidth = 1.2; g.beginPath(); g.arc(32, 25, 8, 0, 7); g.stroke();
    g.fillStyle = `rgba(255,240,170,${0.35 + 0.65 * k})`; g.beginPath(); g.arc(32, 25, 5.5, 0, 7); g.fill();
  } else if (kind === 'lantern') {
    g.fillStyle = `rgba(${P.glow},${0.4 + 0.6 * k})`; g.fillRect(27, 17, 10, 15);
    g.fillStyle = `rgba(255,255,230,${0.5 * k})`; g.fillRect(30, 21, 4, 7);
  } else {
    g.fillStyle = `rgba(255,60,30,${0.3 + 0.7 * k})`; g.beginPath(); g.arc(32, 37, 7, 0, 7); g.fill();
    g.fillStyle = `rgba(255,200,160,${0.5 * k})`; g.beginPath(); g.arc(30, 35, 2.4, 0, 7); g.fill();
  }
  g.restore();
  return c;
}

function door(f) {
  const [c, g] = cv(), pl = [[90, 58, 32], [96, 84, 66], [70, 50, 34], [66, 52, 38], [88, 92, 98]][f];
  g.fillStyle = '#120c08'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = rgb(pl, (rnd() - 0.5) * 22); g.fillRect(i * 32 + 2, 0, 28, TS);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(i * 32 + 2, 0, 3, TS);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * 32 + 27, 0, 3, TS);
  }
  g.fillStyle = f === 4 ? '#c8a810' : '#2b2e33'; g.fillRect(0, 20, TS, 12); g.fillRect(0, 92, TS, 12);
  if (f === 4) {
    g.fillStyle = '#161616';
    for (let x = -12; x < TS; x += 24) {
      g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 12, 32); g.lineTo(x + 24, 20); g.lineTo(x + 12, 20); g.fill();
      g.beginPath(); g.moveTo(x, 104); g.lineTo(x + 12, 104); g.lineTo(x + 24, 92); g.lineTo(x + 12, 92); g.fill();
    }
  }
  g.fillStyle = '#9a9fa8';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(12 + i * 32, 26, 2.6, 0, 7); g.fill(); g.beginPath(); g.arc(12 + i * 32, 98, 2.6, 0, 7); g.fill(); }
  speckle(g, 160, 3); grain(g, 18);
  doorBase = c; doorTexCv = mk(); doorTexCv.width = doorTexCv.height = TS; paintDoor(-1);
  return doorTexCv;
}

function tiles(a, b, size, grout, o) {
  const [c, g] = cv(); g.fillStyle = grout; g.fillRect(0, 0, TS, TS);
  for (let y = 0; y < TS; y += size) for (let x = 0; x < TS; x += size) {
    const base = b && ((x + y) / size) % 2 ? b : a, v = (rnd() - 0.5) * (o.var || 26);
    g.fillStyle = rgb(base, v); g.fillRect(x + 1.5, y + 1.5, size - 3, size - 3);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 1.5, y + 1.5, size - 3, 2);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1.5, y + size - 4.5, size - 3, 3);
  }
  for (let i = 0; i < (o.cracks || 0); i++) crack(g, rnd() * TS, rnd() * TS, 14 + rnd() * 18);
  if (o.moss) mossy(g, o.moss);
  grain(g, o.grain || 22);
  return c;
}

function mud() {
  const [c, g] = cv(); g.fillStyle = '#3a3222'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = rnd() < 0.5 ? `rgba(${40 + rnd() * 30 | 0},${60 + rnd() * 40 | 0},25,.6)` : 'rgba(30,22,14,.5)';
    g.beginPath(); g.ellipse(rnd() * TS, rnd() * TS, 3 + rnd() * 9, 2 + rnd() * 6, 0, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(60,110,40,.7)'; g.lineWidth = 1;
  for (let i = 0; i < 60; i++) { const x = rnd() * TS, y = rnd() * TS; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y - 3 - rnd() * 5); g.stroke(); }
  grain(g, 24);
  return c;
}

function sky() {
  const [c, g] = cv(); g.fillStyle = '#0e1a18'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * TS, y = rnd() * TS, r = 10 + rnd() * 24, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${50 + rnd() * 30 | 0},${80 + rnd() * 40 | 0},${70 + rnd() * 30 | 0},.22)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  grain(g, 14);
  return c;
}

function grating() {
  const [c, g] = cv(); g.fillStyle = '#1c1f23'; g.fillRect(0, 0, TS, TS);
  for (let y = 0; y < TS; y += 16) for (let x = 0; x < TS; x += 16) {
    g.fillStyle = '#07090a'; g.fillRect(x + 3, y + 3, 10, 10);
    if (rnd() < 0.3) { g.fillStyle = 'rgba(80,255,60,.28)'; g.fillRect(x + 4, y + 4, 8, 8); }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 1, y + 1, 14, 2);
  }
  for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(70,90,20,.25)'; g.beginPath(); g.ellipse(rnd() * TS, rnd() * TS, 3 + rnd() * 8, 2 + rnd() * 5, 0, 0, 7); g.fill(); }
  grain(g, 20);
  return c;
}

function pipes() {
  const [c, g] = cv(); g.fillStyle = '#1a1d21'; g.fillRect(0, 0, TS, TS);
  for (const y of [8, 44, 84]) {
    const gr = g.createLinearGradient(0, y, 0, y + 28);
    gr.addColorStop(0, '#2a2e34'); gr.addColorStop(0.35, '#8a9098'); gr.addColorStop(1, '#22262b');
    g.fillStyle = gr; g.fillRect(0, y, TS, 28);
    g.fillStyle = '#15181c'; for (const x of [20, 84]) g.fillRect(x, y - 2, 8, 32);
  }
  drips(g, 6, 'rgba(60,150,30,.35)'); grain(g, 22);
  return c;
}

function liquid(toxic) {
  const [c, g] = cv(); g.fillStyle = toxic ? '#26c826' : '#2c3c24'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = toxic ? 'rgba(10,110,10,.5)' : 'rgba(130,160,100,.3)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(rnd() * TS, rnd() * TS, 6 + rnd() * 16, 2 + rnd() * 5, 0, 0, 7); g.stroke();
  }
  if (toxic) for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(230,255,190,.6)'; g.beginPath(); g.arc(rnd() * TS, rnd() * TS, 1.5 + rnd() * 3.5, 0, 7); g.fill(); }
  grain(g, 10);
  return c;
}

let doorBase = null, doorTexCv = null;

function drawKeyShape(g, x, y, rot, sc) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
  g.fillStyle = '#f4c830'; g.strokeStyle = '#7a5a10'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, -9, 5, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#7a5a10'; g.beginPath(); g.arc(0, -9, 2, 0, 7); g.fill();
  g.fillStyle = '#f4c830'; g.fillRect(-1.6, -4, 3.2, 16); g.strokeRect(-1.6, -4, 3.2, 16);
  g.fillRect(1.6, 7, 4, 2.4); g.fillRect(1.6, 3, 3, 2.4);
  g.restore();
}

// t < 0: closed. Otherwise three keys fly in one after the other, turn in the locks, each padlock opens and falls
function paintDoor(t) {
  const g = doorTexCv.getContext('2d');
  g.clearRect(0, 0, TS, TS); g.drawImage(doorBase, 0, 0);
  const bar = g.createLinearGradient(0, 56, 0, 70); bar.addColorStop(0, '#4a4e56'); bar.addColorStop(0.4, '#9aa0aa'); bar.addColorStop(1, '#2a2d33');
  g.fillStyle = bar; g.fillRect(0, 56, TS, 14);
  g.fillStyle = '#c8ccd2'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(8 + i * 22, 63, 2, 0, 7); g.fill(); }
  const xs = [26, 64, 102];
  for (let i = 0; i < 3; i++) {
    const kt = t < 0 ? -1 : t - (0.4 + i * 0.9), x = xs[i], y = 66;
    if (kt > 1.7) continue;
    if (kt >= 0 && kt < 0.45) { const u = kt / 0.45; drawKeyShape(g, 64 + (x - 64) * u, 150 + (y + 22 - 150) * u - Math.sin(u * Math.PI) * 18, Math.PI + (1 - u) * 0.5, 0.95); }
    const pop = kt > 0.85 ? Math.min(1, (kt - 0.85) / 0.15) : 0, u2 = Math.max(0, kt - 1.0);
    g.save(); g.translate(x, y + 150 * u2 * u2); g.rotate(u2 * 2.2);
    g.strokeStyle = '#c8ccd2'; g.lineWidth = 3.4; g.lineCap = 'round';
    g.save(); g.translate(-7, -4 * pop); g.rotate(-0.55 * pop);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -8); g.arc(7, -8, 7, Math.PI, 0); g.lineTo(14, 0); g.stroke(); g.restore();
    const gb = g.createLinearGradient(-11, 0, 11, 0); gb.addColorStop(0, '#8a6a10'); gb.addColorStop(0.5, '#f4d040'); gb.addColorStop(1, '#7a5a08');
    g.fillStyle = gb; g.beginPath(); g.roundRect(-11, 0, 22, 20, 3); g.fill(); g.strokeStyle = '#4a3606'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#1a1204'; g.beginPath(); g.arc(0, 8, 2.6, 0, 7); g.fill(); g.fillRect(-1, 9, 2, 6);
    if (kt >= 0.45) {
      const ins = Math.min(1, (kt - 0.45) / 0.15), turn = kt > 0.6 ? Math.min(1, (kt - 0.6) / 0.25) : 0;
      drawKeyShape(g, 0, 8 + 8 * (1 - ins), Math.PI + turn * 1.57, 0.6);
    }
    g.restore();
  }
}

// 0-3.7 s: keys and padlocks. 3.7-4.7 s: the door slides up into the ceiling.
function updateDoorAnim(dt) {
  const A = doorAnim; A.t += dt;
  const dcx = (doorCell % N) + 0.5, dcy = Math.floor(doorCell / N) + 0.5;
  let da = Math.atan2(dcy - player.y, dcx - player.x) - Math.atan2(player.dirY, player.dirX);
  da = Math.atan2(Math.sin(da), Math.cos(da));
  rotatePlayer(Math.sign(da) * Math.min(Math.abs(da), 3.5 * dt));
  const ev = (k, t0, fn) => { if (A.t >= t0 && !A.ev[k]) { A.ev[k] = 1; fn(); } };
  for (let i = 0; i < 3; i++) {
    const s0 = 0.4 + i * 0.9;
    ev('w' + i, s0, () => sfx('key_whoosh', 0.8));
    ev('i' + i, s0 + 0.45, () => sfx('key_insert', 0.9));
    ev('t' + i, s0 + 0.62, () => sfx('key_turn', 0.9));
    ev('o' + i, s0 + 0.85, () => sfx('lock_open', 0.9));
    ev('f' + i, s0 + 1.45, () => sfx('lock_fall', 0.8));
  }
  if (A.s === 0) {
    paintDoor(A.t);
    ev('r', 3.7, () => { A.s = 1; map[doorCell] = 0; paintDoor(10); sfx('door_rumble', 1); });
  }
  if (A.t >= 4.7) { doorOpen = true; blk[doorCell] = 0; doorAnim = null; say('LA PORTA SI \u00c8 APERTA!'); }
}

/* ======================================================================
   CASTEDDISH - Caricamento del livello
   buildTextures() prepara le texture; loadFloor() genera stanze,
   corridoi, torce, scale, nemici, oggetti di scena e bauli di ogni
   piano.
   ====================================================================== */

function buildTextures(f) {
  const P = PAL[f];
  let w1, w2, fl, ce, lq = null;
  if (f === 0) {
    w1 = blockWall([108, 100, 90], 8, 32, '#14100c', { cracks: 3 });
    w2 = blockWall([86, 92, 78], 8, 32, '#12140e', { moss: 70, cracks: 2, stain: 6, stainCol: 'rgba(20,50,20,.3)' });
    fl = tiles([78, 70, 62], null, 64, '#0e0b09', { cracks: 4, moss: 20 }); ce = tiles([54, 46, 40], null, 32, '#0c0907', {});
  } else if (f === 1) {
    w1 = paintBand(blockWall([128, 120, 104], 2, 64, '#26221a', { cracks: 6, grain: 28, stain: 10, stainCol: 'rgba(80,55,30,.3)' }), 'rgba(104,136,118,.85)');
    w2 = rustMetal();
    fl = tiles([150, 140, 120], [96, 90, 76], 32, '#2a251c', { cracks: 6, grain: 30 }); ce = tiles([128, 124, 108], null, 64, '#3a362c', { cracks: 3, var: 22 });
  } else if (f === 2) {
    w1 = blockWall([84, 88, 100], 4, 64, '#0d0f15', { cracks: 4, var: 30 });
    w2 = banner(blockWall([84, 88, 100], 4, 64, '#0d0f15', { cracks: 2, var: 30 }));
    fl = tiles([46, 46, 56], [130, 130, 140], 64, '#08080c', { var: 14 }); ce = tiles([40, 28, 22], null, 32, '#140c08', { cracks: 2, var: 20 });
  } else if (f === 3) {
    w1 = blockWall([68, 82, 62], 6, 32, '#0e140d', { moss: 150, cracks: 3, var: 44, stain: 8, stainCol: 'rgba(15,55,20,.35)' });
    w2 = bark(); fl = mud(); ce = sky(); lq = liquid(false);
  } else {
    w1 = plates(false); w2 = plates(true); fl = grating(); ce = pipes(); lq = liquid(true);
  }
  wallTex[1] = w1; wallTex[2] = w2;
  wallTex[3] = [0, 1, 2, 3].map(k => lamp(k, w1, P.kind, P));
  wallTex[4] = decor(f, w1); wallTex[5] = door(f);
  floorBuf = toBuf(fl); ceilBuf = toBuf(ce); liqBuf = lq ? toBuf(lq) : floorBuf;
  liqEmit = f === 4 ? 0.55 : 0;
  fogC = P.fog; fogS = P.fog.join(',');
  chandArt = [chandelier(f, 0), chandelier(f, 1)];
  decoArt = DECOR[f].map(d => dArt(d.draw));
  decoFlip = decoArt.map(c => { const m = mk(); m.width = c.width; m.height = c.height; const q = m.getContext('2d'); q.translate(c.width, 0); q.scale(-1, 1); q.drawImage(c, 0, 0); return m; });
}

function loadFloor(prog) {
  const f = FLOOR_ORDER[prog]; progress = prog; curFloor = f; doorOpen = false;
  const cfg = CFG[f];
  let g, start;
  for (let tries = 0; tries < 40; tries++) {
    sr = f * 7919 + tries * 104729 + 13;
    g = new Uint8Array(N * N).fill(1); rooms = []; stairs = null; doorCell = -1;
    const carve = (x, y) => { if (x > 0 && y > 0 && x < N - 1 && y < N - 1) g[y * N + x] = 0; };
    const room = (x, y, w, h) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j);
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    };
    const cor = (a, b, w) => {
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) for (let k = 0; k < w; k++) carve(x, a.cy + k);
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) for (let k = 0; k < w; k++) carve(b.cx + k, y);
    };
    if (cfg.boss) {
      room(3, 37, 8, 8); room(13, 6, 30, 34); cor(rooms[0], rooms[1], 3);
      for (let j = 9; j < 38; j += 5) for (let i = 16; i < 41; i += 5) g[j * N + i] = 2;
    } else if (cfg.maze) {
      const st = [[1, 1]]; g[N + 1] = 0;
      while (st.length) {
        const [x, y] = st[st.length - 1];
        const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([i, j]) => x + i > 0 && y + j > 0 && x + i < N - 1 && y + j < N - 1 && g[(y + j) * N + x + i] === 1);
        if (!nb.length) { st.pop(); continue; }
        const [i, j] = nb[Math.floor(srand() * nb.length)];
        g[(y + j / 2) * N + x + i / 2] = 0; g[(y + j) * N + x + i] = 0; st.push([x + i, y + j]);
      }
      room(2, 2, 7, 7);
      for (let k = 0; k < 6; k++) room(ri(3, 38), ri(3, 38), 7, 7);
    } else {
      for (let t = 0; rooms.length < cfg.rooms && t < 500; t++) {
        const w = ri(cfg.min, cfg.max), h = ri(cfg.min, cfg.max), x = ri(3, N - w - 3), y = ri(3, N - h - 3);
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        room(x, y, w, h);
      }
      for (let i = 1; i < rooms.length; i++) {
        let b = 0, bd = 1e9;
        for (let j = 0; j < i; j++) { const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; b = j; } }
        cor(rooms[i], rooms[b], cfg.cw);
      }
      for (let k = 0; k < rooms.length >> 2; k++) cor(rooms[ri(0, rooms.length - 1)], rooms[ri(0, rooms.length - 1)], cfg.cw);
      if (cfg.pillars) for (const r of rooms) if (r.w > 8 && r.h > 8)
        for (let j = r.y + 2; j < r.y + r.h - 2; j += 3) for (let i = r.x + 2; i < r.x + r.w - 2; i += 3)
          if ((i - r.cx) ** 2 + (j - r.cy) ** 2 > 2) g[j * N + i] = 2;
    }
    start = rooms[0];
    if (cfg.boss) break;
    // Farthest room gets the sealed staircase
    const d1 = new Int16Array(N * N); bfs(g, start.cy * N + start.cx, d1);
    let far = null, fd = -1;
    for (const r of rooms) { const d = d1[r.cy * N + r.cx]; if (r !== start && d < 9999 && d > fd) { fd = d; far = r; } }
    if (!far) continue;
    const sx = far.x + 1, sy = far.y;
    g[sy * N + sx] = 0; g[sy * N + sx - 1] = 1; g[sy * N + sx + 1] = 1; g[(sy + 1) * N + sx] = 5;
    stairs = { x: sx + 0.5, y: sy + 0.5 }; doorCell = (sy + 1) * N + sx;
    const d2 = new Int16Array(N * N); bfs(g, start.cy * N + start.cx, d2);
    if (rooms.some(r => d2[r.cy * N + r.cx] >= 9999)) continue;
    break;
  }

  // Final map with wall variants and torches
  map = new Uint8Array(N * N); torches = [];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const n = y * N + x, v = g[n];
    if (!v) continue;
    if (v !== 1) { map[n] = v; continue; }
    const open = !g[n - 1] || !g[n + 1] || !g[n - N] || !g[n + N], r = srand();
    map[n] = !open ? 1 : r < 0.05 ? 3 : r < 0.09 ? 4 : r < 0.3 ? 2 : 1;
    if (map[n] === 3) torches.push({ x: x + 0.5, y: y + 0.5, snd: PAL[f].kind });
  }
  for (let i = 0; i < N; i++) { map[i] = 1; map[(N - 1) * N + i] = 1; map[i * N] = 1; map[i * N + N - 1] = 1; }
  liq.fill(0);
  if (cfg.liq) {
    const pool = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!map[j * N + i]) liq[j * N + i] = 1; };
    if (cfg.boss) for (let k = 0; k < 9; k++) pool(ri(15, 38), ri(8, 34), ri(3, 6), ri(3, 5));
    else for (let k = 1; k < rooms.length; k++) if (srand() < 0.6) {
      const r = rooms[k];
      pool(r.x + 1 + ri(0, 2), r.y + 1 + ri(0, 2), Math.max(2, r.w - 4 - ri(0, 3)), Math.max(2, r.h - 4 - ri(0, 3)));
    }
  }

  // Crates, chests and chandeliers (crates and chests are solid, rooms keep a free ring)
  blk.set(map); if (typeof world1Carve === 'function') world1Carve(f); props.length = 0; chands.length = 0; fires.length = 0; nebulas.length = 0; decals.clear(); debris.length = 0; rubble.length = 0;
  const sroom = stairs && rooms.find(r => stairs.x >= r.x && stairs.x < r.x + r.w && stairs.y >= r.y && stairs.y < r.y + r.h);
  const used = [];
  for (const r of rooms) {
    if (r === start || r === sroom) continue;
    const n = Math.min(14, ri(1, Math.max(2, Math.round(r.w * r.h / 50))));
    for (let k = 0; k < n; k++) {
      const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
      if (blk[c] || liq[c] || used.some(u => Math.abs(u[0] - x) < 3 && Math.abs(u[1] - y) < 3)) continue;
      used.push([x, y]); blk[c] = 9;
      props.push({ type: 'crate', x: x + 0.5, y: y + 0.5, hp: 60, open: false, cell: c });
    }
  }
  // Top up crates/chests, then pick the chests and hide the keys in three of them
  for (let t = 0; t < 400 && props.length < (f === 4 ? 14 : 12); t++) {
    const r = rooms[ri(0, rooms.length - 1)];
    if (r === start || r === sroom) continue;
    const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
    if (blk[c] || liq[c] || used.some(u => Math.abs(u[0] - x) < 3 && Math.abs(u[1] - y) < 3)) continue;
    used.push([x, y]); blk[c] = 9;
    props.push({ type: 'crate', x: x + 0.5, y: y + 0.5, hp: 60, open: false, cell: c });
  }
  if (f < 4) {
    const order = props.map((q, i) => i).sort(() => srand() - 0.5);
    const want = Math.min(9, Math.max(3, Math.floor(props.length * 0.6)));
    let nch = 0;
    for (const i of order) if (nch < want) { props[i].type = 'chest'; props[i].hp = 1e9; blk[props[i].cell] = CHEST_CELL; nch++; }
    props.filter(q => q.type === 'chest').sort(() => srand() - 0.5).slice(0, 3).forEach(q => { q.key = true; });
  }
  keys = 0; hinted = false; aim = null; doorAnim = null; readyMsg = false; doorHintT = 0;
  keysNeed = props.filter(q => q.key).length;

  // Scenery: inert, themed, destructible. Solid pieces keep a free ring along the room walls.
  // It draws from its own random stream (so tuning it never reshuffles enemies, pickups or lights), visits the
  // rooms in turn with a per-room cap, and the picker discourages repeats (floor-wide and, harder, within a room).
  const srKeep = sr; sr = 52711 + f * 977;
  const dused = used.slice(), dcount = new Map(), droom = new Map(), dkind = new Array(DECOR[f].length).fill(0);
  let nd = 0;
  const decoTotal = [52, 56, 40, 54, 50][f], capDiv = [12, 12, 8, 12, 20][f], capMax = [8, 5, 7, 10, 48][f];
  const kindCap = Math.ceil(decoTotal / DECOR[f].length);   // no piece more than a few times per floor
  for (let t = 0; t < 4000 && nd < decoTotal; t++) {
    const r = rooms[t % rooms.length];
    if (r === sroom) continue;
    if ((dcount.get(r) || 0) >= Math.max(2, Math.min(capMax, Math.round(r.w * r.h / capDiv)))) continue;
    if (!droom.has(r)) droom.set(r, new Array(DECOR[f].length).fill(0));
    const k = decoPick(f, dkind, droom.get(r), kindCap); if (k < 0) break;
    const D = DECOR[f][k];
    const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
    if (blk[c] || liq[c]) continue;
    if (r === start && Math.hypot(x - start.cx, y - start.cy) < 3.5) continue;
    if (f === 4 && Math.hypot(x + 0.5 - 28.5, y + 0.5 - 23.5) < 3) continue;   // keep the boss spot clear
    // two solid things keep a free cell between them (so they never wall a passage); anything low only needs its own cell
    if (dused.some(u => { const sep = D.solid && u[2] !== false ? 2 : 1; return Math.abs(u[0] - x) < sep && Math.abs(u[1] - y) < sep; })) continue;
    dused.push([x, y, D.solid]); if (D.solid) blk[c] = 9;
    props.push({ type: 'deco', k, mat: D.mat, solid: D.solid, flip: srand() < 0.5, x: x + 0.5, y: y + 0.5, hp: D.hp, h: D.solid ? D.sc : 0.6, cell: c });
    dkind[k]++; droom.get(r)[k]++; dcount.set(r, (dcount.get(r) || 0) + 1); nd++;
  }
  sr = srKeep;
  if (f === 1) {   // second level: explosive barrels scattered around the rooms (own random stream, never next to another solid thing)
    const sk = sr; sr = 91357;
    const perRoom = new Map();
    let nb = 0;
    for (let t = 0; t < 3000 && nb < 16; t++) {
      const r = rooms[t % rooms.length];
      if (r === sroom || (perRoom.get(r) || 0) >= 3) continue;
      const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
      if (blk[c] || liq[c]) continue;
      if (r === start && Math.hypot(x - start.cx, y - start.cy) < 4) continue;
      if (dused.some(u => Math.abs(u[0] - x) < 2 && Math.abs(u[1] - y) < 2)) continue;
      dused.push([x, y, true]); blk[c] = 9;
      props.push({ type: 'xbarrel', mat: 'metal', x: x + 0.5, y: y + 0.5, hp: 30, max: 30, h: 0.6, cell: c });
      perRoom.set(r, (perRoom.get(r) || 0) + 1); nb++;
    }
    sr = sk;
  }
  {   // every key chest must stay reachable: clear scenery around any chest that got walled in
    const d0 = new Int16Array(N * N); bfs(blk, start.cy * N + start.cx, d0);
    for (const q of props.filter(c2 => c2.key)) {
      const cx = Math.floor(q.x), cy = Math.floor(q.y);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d0[(cy + b) * N + cx + a] < 9999)) continue;
      for (let i = props.length - 1; i >= 0; i--) { const o = props[i]; if (o.type === 'deco' && o.solid && Math.hypot(o.x - q.x, o.y - q.y) < 3) { blk[o.cell] = 0; props.splice(i, 1); } }
    }
  }
  for (const r of rooms) {
    const pts = f === 4 && r.w > 20 ? [[22, 15], [34, 15], [22, 30], [34, 30]] : r.w >= 11 && r.h >= 7 ? [[r.cx - 3, r.cy], [r.cx + 3, r.cy]] : [[r.cx, r.cy]];
    for (const [x, y] of pts) {
      if (map[y * N + x]) continue;
      const cvar = srand() < 0.5 ? 0 : 1;
      chands.push({ x: x + 0.5, y: y + 0.5, v: cvar });
      torches.push({ x: x + 0.5, y: y + 0.5, k: 1.3, f: 0.5, snd: CHSND[f][cvar] });
    }
  }

  // Enemies and pickups on cells reachable from the start
  const dd = new Int16Array(N * N); bfs(blk, start.cy * N + start.cx, dd);
  let cells = [];
  for (let n = 0; n < N * N; n++) if (dd[n] > 10 && dd[n] < 9999) cells.push(n);
  if (cells.length < 30) { cells = []; for (let n = 0; n < N * N; n++) if (dd[n] < 9999) cells.push(n); }
  const pc = () => { const n = cells[Math.floor(srand() * cells.length)]; return [(n % N) + 0.5, Math.floor(n / N) + 0.5]; };
  enemies = []; pickups.length = 0; projectiles = []; explosions = []; blasts.length = 0; fuses.length = 0; shake.t = 0; flashA = 0; if (flashEl) flashEl.style.opacity = 0; canvas.style.transform = ''; eShots.length = 0; strikes.length = 0; beams.length = 0; fxs.length = 0; power.on = true; power.t = 6; power.fl = 0; powerK = 1;
  ensureSprites(f === 4 ? ['skel'] : [ENEMY_OF[f]]);
  if (f === 4) { pairIdx = 0; pairWait = 0; skelT = 8; spawnPair(); }
  else {
    // Spread the enemies out: far from the start (nobody reaches you at once) and never bunched together
    const placed = [];
    for (let i = 0; i < Math.round([50, 60, 70, 65][f] * DIFF.count); i++) {
      let q = null;
      for (const [minD, sp] of [[22, 4], [20, 3.2], [20, 2.6], [20, 2.2], [16, 2]]) {
        for (let t = 0; t < 120 && !q; t++) {
          const n = cells[Math.floor(srand() * cells.length)], x = (n % N) + 0.5, y = Math.floor(n / N) + 0.5;
          if (dd[n] >= minD && !placed.some(p => Math.hypot(p[0] - x, p[1] - y) < sp)) q = [x, y];
        }
        if (q) break;
      }
      if (!q) q = pc();
      placed.push(q); enemies.push(mkEnemy(q[0], q[1], ENEMY_OF[f]));
    }
  }
  (f === 0 ? [1, 1, 2, 2, 3, 4, 5, 7] : f === 4 ? [2, 2, 3, 3, 3, 1, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 5, 6, 7]).forEach(k => { const q = pc(); pickups.push({ kind: k, x: q[0], y: q[1], taken: false }); });
  for (let i = 0; i < (f === 4 ? 8 : 6); i++) { const q = pc(); pickups.push({ kind: 'med', x: q[0], y: q[1], taken: false }); }
  for (let i = 0; i < 4; i++) { const q = pc(); pickups.push({ kind: 'ammo', w: 1 + Math.floor(srand() * 7), x: q[0], y: q[1], taken: false }); }
  const AW = [[0.6, 0.35, 0.05, 0], [0.3, 0.45, 0.2, 0.05], [0.15, 0.35, 0.4, 0.1], [0.05, 0.25, 0.45, 0.25], [0, 0.1, 0.4, 0.5]][f];
  for (let i = 0; i < 1; i++) {   // one wearable armor per floor
    let r = srand(), t = 0; while (t < 3 && r >= AW[t]) { r -= AW[t]; t++; }
    const q = pc(); pickups.push({ kind: 'arm', t, x: q[0], y: q[1], taken: false });
  }

  // Hordes: a few rooms release a stream of enemies out of the tunnels next to them when you step inside
  hordes = [];
  if (f < 4) {
    const inRoom = (x, y) => rooms.some(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
    const tunnelCells = (r) => {   // open cells outside every room, reached from this room's exits (2 to 5 steps into the tunnel)
      const seen = new Set(), out = []; let fr = [];
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || inRoom(x, y) || blk[y * N + x]) continue;
        fr.push([x, y]); seen.add(y * N + x);
      }
      for (let d = 1; d <= 6 && fr.length; d++) {
        const nx = [];
        for (const [x, y] of fr) {
          if (d >= 3) out.push([x + 0.5, y + 0.5]);
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = x + a, Y = y + b;
            if (X < 1 || Y < 1 || X >= N - 1 || Y >= N - 1 || seen.has(Y * N + X) || inRoom(X, Y) || blk[Y * N + X]) continue;
            seen.add(Y * N + X); nx.push([X, Y]);
          }
        }
        fr = nx;
      }
      return out;
    };
    const spaced = (list, max) => { const p = []; for (const c of list) if (p.length < max && !p.some(o => Math.hypot(o[0] - c[0], o[1] - c[1]) < 1.4)) p.push(c); return p; };
    rooms.filter(r => r !== start && r !== sroom && r.w * r.h >= 25 && dd[r.cy * N + r.cx] >= 12 && dd[r.cy * N + r.cx] < 9999)
      .map(r => ({ r, cand: tunnelCells(r) })).filter(o => spaced(o.cand, 99).length >= 5)
      .sort(() => srand() - 0.5).slice(0, [1, 2, 2, 2][f])
      .forEach(o => hordes.push({ r: o.r, cand: o.cand, n: Math.max(4, Math.round([10, 10, 10, 12][f] * DIFF.count)), type: ENEMY_OF[f], fired: false, q: [], tt: 0, snd: false }));
  }

  player.x = start.cx + 0.5; player.y = start.cy + 0.5;
  player.dirX = 1; player.dirY = 0; player.planeX = 0; player.planeY = 0.9; player.pitch = 0;
  startLevelState(prog);
  buildTextures(f); fieldT = 0;
  say('PIANO ' + (prog + 1) + ': ' + FLOOR_NAMES[f]); toastT = 3;
}
