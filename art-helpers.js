/* ======================================================================
   CASTEDDISH - Strumenti per disegnare la grafica
   Dimensioni sprite, buffer, generatore casuale di texture e piccoli
   pennelli (crepe, muschio, gocce, artigli, arti).
   ====================================================================== */

/* ---------- Textures & sprites ---------- */
const TS = 128, DS = 160;
const mk = () => document.createElement('canvas');
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const wallTex = [];
let floorBuf, ceilBuf;
const demonCanvases = { walk: [], attack: [], die: [] };
const pickupIcons = {};
const projectileCanvas = mk(), impactCanvas = mk();

function speckle(g, n, size) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.06)';
    g.fillRect(rnd() * TS | 0, rnd() * TS | 0, 1 + (rnd() * size | 0), 1);
  }
}

function grain(g, amt) {
  const im = g.getImageData(0, 0, TS, TS), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * amt; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(im, 0, 0);
}

function crack(g, x, y, len) {
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y);
  let a = rnd() * 6.28;
  for (let i = 0; i < len; i += 3) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * 3; y += Math.sin(a) * 3; g.lineTo(x, y); }
  g.stroke();
}

function mossy(g, n) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${30 + rnd() * 30 | 0},${80 + rnd() * 60 | 0},${25 + rnd() * 20 | 0},.5)`;
    g.beginPath(); g.ellipse(rnd() * TS, rnd() * TS, 2 + rnd() * 6, 1 + rnd() * 4, 0, 0, 7); g.fill();
  }
}

function drips(g, n, col) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * TS, y = rnd() * TS * 0.6, l = 10 + rnd() * 40;
    const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, y, 1 + rnd() * 3, l);
  }
}

const toBuf = (cv) => new Uint32Array(cv.getContext('2d').getImageData(0, 0, TS, TS).data.buffer);

// Adds side lighting and fine grain on top of what is already drawn (opaque pixels only)
function finish(c, w) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,240,220,.16)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
  for (let i = 0; i < w * 3; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.07)';
    c.fillRect(rnd() * w, rnd() * w, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  c.restore();
}

function radialSprite(cv, stops) {
  cv.width = 32; cv.height = 32;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(16, 16, 2, 16, 16, 15);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.beginPath(); c.arc(16, 16, 15, 0, Math.PI * 2); c.fill();
}

// Two-segment limb (shoulder/hip -> elbow/knee -> hand/foot). Angles are from vertical-down.
function limb(c, x, y, a1, l1, a2, l2, w, col) {
  const x1 = x + Math.sin(a1) * l1, y1 = y + Math.cos(a1) * l1;
  const a = a1 + a2, x2 = x1 + Math.sin(a) * l2, y2 = y1 + Math.cos(a) * l2;
  c.lineCap = c.lineJoin = 'round';
  c.strokeStyle = '#150404'; c.lineWidth = w + 3;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.strokeStyle = 'rgba(255,120,90,.25)'; c.lineWidth = w * 0.3;
  c.beginPath(); c.moveTo(x - 1, y); c.lineTo(x1 - 1, y1); c.lineTo(x2 - 1, y2); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(x1, y1, w * 0.62, 0, 7); c.fill();
  return [x2, y2, a];
}

function claws(c, x, y, a) {
  c.fillStyle = '#e8dcc0';
  for (let i = -1; i <= 1; i++) {
    const b = a + i * 0.45, tx = x + Math.sin(b) * 9, ty = y + Math.cos(b) * 9;
    c.beginPath(); c.moveTo(x + Math.cos(b) * 1.8, y - Math.sin(b) * 1.8);
    c.lineTo(x - Math.cos(b) * 1.8, y + Math.sin(b) * 1.8); c.lineTo(tx, ty); c.fill();
  }
}
