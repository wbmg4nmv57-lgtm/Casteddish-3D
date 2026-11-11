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
