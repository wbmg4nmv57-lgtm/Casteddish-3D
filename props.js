/* ######################################################################
   CASTEDDISH - Oggetti di scena e sprite
   Effetti, scale, casse, barili, bauli, arredi (catalogo per piano) e costruzione degli sprite.
   Sezioni, in ordine: fx-sprites.js, stairs.js, props-art.js, scenery-catalog.js, sprite-builder.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Sprite degli effetti
   Sprite dei colpi nemici e degli effetti speciali (makeFx).
   ====================================================================== */

// ---- sprites for the enemy shots and the effects ----
const SH = {};
function makeFx() {
  const cv = (name, size, draw) => { const c = mk(); c.width = c.height = size; draw(c.getContext('2d'), size); SH[name] = c; };
  const rad = (name, stops) => cv(name, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(q => gr.addColorStop(q[0], q[1])); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  rad('plasma', [[0, '#ffffff'], [0.3, '#f0b0ff'], [0.65, '#a020e0'], [1, 'rgba(80,0,140,0)']]);
  rad('fire', [[0, '#fff6c0'], [0.35, '#ffb020'], [0.7, '#e03a0a'], [1, 'rgba(120,20,0,0)']]);
  rad('venom', [[0, '#f4ffd0'], [0.4, '#8aff3a'], [0.75, '#2a9a1a'], [1, 'rgba(0,80,0,0)']]);
  rad('bullet', [[0, '#ffffff'], [0.4, '#ffe066'], [1, 'rgba(255,160,0,0)']]);
  rad('sparkB', [[0, '#ffffff'], [0.35, '#bfe8ff'], [1, 'rgba(60,140,255,0)']]);
  rad('sparkR', [[0, '#ffffff'], [0.35, '#ffb0a0'], [1, 'rgba(255,40,20,0)']]);
  rad('markR', [[0, 'rgba(255,60,40,0)'], [0.5, 'rgba(255,60,40,.35)'], [0.8, 'rgba(255,120,60,.9)'], [1, 'rgba(255,60,40,0)']]);
  rad('smoke', [[0, 'rgba(70,64,58,.95)'], [0.55, 'rgba(38,34,31,.6)'], [1, 'rgba(14,12,11,0)']]);
  rad('vapor', [[0, 'rgba(238,244,255,.7)'], [0.45, 'rgba(222,230,246,.38)'], [1, 'rgba(210,220,240,0)']]);
  cv('bubble', 64, (g) => {
    const gr = g.createRadialGradient(26, 24, 2, 32, 32, 28);
    gr.addColorStop(0, 'rgba(240,255,170,.95)'); gr.addColorStop(0.35, 'rgba(170,205,40,.6)'); gr.addColorStop(0.85, 'rgba(110,150,20,.55)'); gr.addColorStop(1, 'rgba(60,90,10,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
    g.strokeStyle = 'rgba(225,255,120,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 25, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,230,.9)'; g.beginPath(); g.ellipse(23, 21, 6, 4, -0.6, 0, 7); g.fill();
  });
  rad('markB', [[0, 'rgba(60,140,255,0)'], [0.5, 'rgba(60,140,255,.35)'], [0.8, 'rgba(160,220,255,.9)'], [1, 'rgba(60,140,255,0)']]);
  const ring = (name, col, fillc) => cv(name, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2); gr.addColorStop(0, fillc + '00'); gr.addColorStop(0.7, fillc + '55'); gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
    g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 5, 0, 7); g.stroke();
  });
  ring('ringW', '#e8dcc0', '#c8b890'); ring('ringR', '#ff6a3a', '#ff3a1a'); ring('ringB', '#8ad8ff', '#4a9aff'); ring('ringP', '#d070ff', '#9020e0');
  cv('col', 64, (g, w) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(120,190,255,0)'); gr.addColorStop(0.5, 'rgba(200,230,255,.8)'); gr.addColorStop(1, 'rgba(120,190,255,0)');
    g.fillStyle = gr; g.fillRect(w * 0.2, 0, w * 0.6, w); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(32, 0); g.lineTo(26, 14); g.lineTo(38, 26); g.lineTo(28, 40); g.lineTo(36, 52); g.lineTo(32, 64); g.stroke();
  });
  cv('rock', 64, (g) => { g.beginPath(); g.moveTo(12, 44); g.lineTo(8, 28); g.lineTo(22, 12); g.lineTo(44, 10); g.lineTo(56, 26); g.lineTo(50, 46); g.lineTo(30, 54); g.closePath(); g.fillStyle = '#8a8a82'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#2a2a26'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(20, 18, 14, 5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(30, 36, 16, 8); });
  cv('barrel', 64, (g) => { g.fillStyle = '#7a4a22'; g.beginPath(); g.ellipse(32, 32, 20, 26, 0, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#2a1608'; g.stroke(); g.strokeStyle = '#2a2a30'; g.lineWidth = 4; for (const y of [16, 32, 48]) { g.beginPath(); g.moveTo(14, y); g.lineTo(50, y); g.stroke(); } });
  cv('crate', 64, (g) => { g.fillStyle = '#9a6a34'; g.fillRect(10, 10, 44, 44); g.strokeStyle = '#2a1608'; g.lineWidth = 3; g.strokeRect(10, 10, 44, 44); g.beginPath(); g.moveTo(10, 10); g.lineTo(54, 54); g.moveTo(54, 10); g.lineTo(10, 54); g.stroke(); });
  cv('bone', 64, (g) => { g.lineCap = 'round'; g.strokeStyle = '#100000'; g.lineWidth = 9; g.beginPath(); g.moveTo(14, 50); g.lineTo(50, 14); g.stroke(); g.strokeStyle = '#efe8d0'; g.lineWidth = 5; g.stroke(); for (const q of [[12, 44], [20, 52], [44, 12], [52, 20]]) { g.fillStyle = '#efe8d0'; g.beginPath(); g.arc(q[0], q[1], 5, 0, 7); g.fill(); } });
  cv('skull', 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(120,255,160,.9)'); gr.addColorStop(1, 'rgba(0,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e8e8d8'; g.strokeStyle = '#102010'; g.lineWidth = 2; g.beginPath(); g.ellipse(32, 28, 13, 14, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(24, 38, 16, 8); g.fillStyle = '#0a1a0a'; g.beginPath(); g.ellipse(26, 28, 4, 5, 0, 0, 7); g.ellipse(38, 28, 4, 5, 0, 0, 7); g.fill(); });
  cv('web', 64, (g) => { g.strokeStyle = 'rgba(240,240,255,.95)'; g.lineWidth = 2.2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); g.stroke(); } for (const r of [9, 17, 25]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4; if (i) g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); else g.moveTo(32 + r, 32); } g.stroke(); } });
  cv('ice', 64, (g) => { g.fillStyle = '#bfeaff'; g.strokeStyle = '#2a78c8'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 4); g.lineTo(44, 30); g.lineTo(32, 60); g.lineTo(20, 30); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(32, 10); g.lineTo(38, 30); g.lineTo(32, 30); g.closePath(); g.fill(); });
  cv('bat', 64, (g) => { g.fillStyle = '#1a0a1a'; g.strokeStyle = '#000000'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 26); g.lineTo(14, 10); g.lineTo(4, 26); g.lineTo(14, 24); g.lineTo(18, 34); g.lineTo(26, 30); g.lineTo(32, 38); g.lineTo(38, 30); g.lineTo(46, 34); g.lineTo(50, 24); g.lineTo(60, 26); g.lineTo(50, 10); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff2a3a'; g.fillRect(28, 26, 3, 3); g.fillRect(34, 26, 3, 3); });
  cv('dark', 64, (g) => { const gr = g.createRadialGradient(32, 32, 6, 32, 32, 32); gr.addColorStop(0, 'rgba(210,120,255,.9)'); gr.addColorStop(1, 'rgba(60,0,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a0630'; g.strokeStyle = '#c070ff'; g.lineWidth = 2.5; g.beginPath(); g.arc(32, 32, 22, -1.2, 1.2); g.arc(26, 32, 17, 1.0, -1.0, true); g.closePath(); g.fill(); g.stroke(); });
}

/* ======================================================================
   CASTEDDISH - Scale 3D
   Gradini e portale delle scale tra un piano e l'altro.
   ====================================================================== */

// The alcove is one cell wide. The stairs are eight stone slabs, each a sprite at a different depth and height, so they shift against each other as you move,
// plus a glowing arch on the back wall.
const STAIR_STEPS = 8;
let stairSlabs = [], stairPortal = null;
function makeStairs() {
  let sd = 11; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  stairSlabs = [];
  for (let i = 0; i < STAIR_STEPS; i++) {
    const c = mk(); c.width = c.height = 256; const g = c.getContext('2d');
    const hh = Math.round(0.07 * (i + 1) * 256), y0 = 256 - hh, k = i / (STAIR_STEPS - 1);
    const bg = g.createLinearGradient(0, y0, 0, 256);
    bg.addColorStop(0, `rgb(${150 + k * 20},${144 + k * 18},${128 + k * 14})`);
    bg.addColorStop(0.22, `rgb(${112 + k * 14},${106 + k * 12},${96 + k * 10})`);
    bg.addColorStop(1, `rgb(${64 + k * 8},${60 + k * 7},${54 + k * 6})`);
    g.fillStyle = bg; g.fillRect(0, y0, 256, hh);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath();
    const mid = y0 + hh * 0.6; g.moveTo(0, mid); g.lineTo(256, mid);
    for (let x = (i % 2 ? 40 : 90); x < 256; x += 110) { g.moveTo(x, y0 + 8); g.lineTo(x, mid); }
    for (let x = (i % 2 ? 90 : 40); x < 256; x += 110) { g.moveTo(x, mid); g.lineTo(x, 256); }
    g.stroke();
    for (let j = 0; j < 160; j++) { g.fillStyle = rn() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,240,.08)'; g.fillRect(rn() * 256, y0 + rn() * hh, 1 + rn() * 3, 1 + rn() * 2); }
    g.fillStyle = 'rgba(255,250,225,.5)'; g.fillRect(0, y0, 256, 3);   // lit edge of the tread
    const sg = g.createLinearGradient(0, 0, 256, 0);   // darker toward the alcove walls
    sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(0.18, 'rgba(0,0,0,0)'); sg.addColorStop(0.82, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = sg; g.fillRect(0, y0, 256, hh);
    g.fillStyle = `rgba(255,205,120,${(0.03 + k * 0.17).toFixed(3)})`; g.fillRect(0, y0, 256, hh);   // warmer toward the light
    stairSlabs.push(c);
  }
  const c = mk(); c.width = c.height = 256; const g = c.getContext('2d');
  const glow = g.createRadialGradient(128, 150, 20, 128, 150, 128); glow.addColorStop(0, 'rgba(255,230,160,.55)'); glow.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
  const arch = () => { g.beginPath(); g.moveTo(44, 256); g.lineTo(44, 120); g.arc(128, 120, 84, Math.PI, 0); g.lineTo(212, 256); g.closePath(); };
  arch(); g.lineJoin = 'round'; g.strokeStyle = '#2e2a26'; g.lineWidth = 26; g.stroke(); g.strokeStyle = '#5a544b'; g.lineWidth = 12; g.stroke();
  arch(); const lg = g.createRadialGradient(128, 190, 6, 128, 170, 120);
  lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, '#fff3c0'); lg.addColorStop(0.75, '#ffc65a'); lg.addColorStop(1, '#ff9a2e'); g.fillStyle = lg; g.fill();
  g.save(); arch(); g.clip(); g.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(128, 230); g.lineTo(128 + i * 70 - 14, 20); g.lineTo(128 + i * 70 + 14, 20); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle = '#6a645a'; g.strokeStyle = '#1c1916'; g.lineWidth = 2; g.fillRect(118, 18, 20, 24); g.strokeRect(118, 18, 20, 24);
  stairPortal = c;
}

function stairsArt() {
  const c = mk(); c.width = c.height = 96; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(1, '#3a2a18');
  g.fillStyle = gr; g.fillRect(14, 4, 68, 92);
  for (let i = 0; i < 7; i++) {
    const y = 90 - i * 12, w = 76 - i * 8;
    g.fillStyle = `rgb(${120 - i * 10},${108 - i * 10},${92 - i * 9})`; g.fillRect(48 - w / 2, y, w, 12);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(48 - w / 2, y, w, 2);
  }
  return c;
}

/* ======================================================================
   CASTEDDISH - Grafica degli oggetti di scena
   Icone dei raccoglibili, macchie e fori sui muri, fiamme, casse,
   barili, bauli, oggetti lanciati, lampadari, detriti e pezzi di
   arredo.
   ====================================================================== */

function pickupIcon(kind) {
  const c = mk(); c.width = c.height = 64; const g = c.getContext('2d'); g.scale(2, 2);
  const gc = kind === 'med' ? '80,255,120' : '255,200,60';
  const gl = g.createRadialGradient(16, 16, 2, 16, 16, 16);
  gl.addColorStop(0, `rgba(${gc},.55)`); gl.addColorStop(1, `rgba(${gc},0)`);
  g.fillStyle = gl; g.fillRect(0, 0, 32, 32);
  if (kind === 'med') {
    g.fillStyle = '#f2f2f2'; g.fillRect(6, 9, 20, 15); g.strokeStyle = '#222'; g.lineWidth = 1.5; g.strokeRect(6, 9, 20, 15);
    g.fillStyle = '#d01818'; g.fillRect(14, 11, 4, 11); g.fillRect(10, 15, 12, 4);
  } else if (kind === 1) {
    g.fillStyle = '#6b3d1a'; g.fillRect(3, 15, 9, 6); g.fillStyle = '#9a9aa5'; g.fillRect(10, 14, 19, 3); g.fillRect(10, 18, 19, 3);
  } else if (kind === 2) {
    g.fillStyle = '#3a3a44'; g.fillRect(4, 13, 10, 9); g.fillStyle = '#b0b0b8';
    g.fillRect(14, 13, 15, 2); g.fillRect(14, 17, 15, 2); g.fillRect(14, 21, 15, 2); g.fillStyle = '#c8a020'; g.fillRect(6, 22, 6, 4);
  } else if (kind === 3) {
    g.fillStyle = '#3f5a2a'; g.fillRect(3, 12, 26, 9); g.fillStyle = '#222'; g.fillRect(3, 12, 3, 9);
    g.fillStyle = '#c03020'; g.fillRect(26, 12, 3, 9); g.fillRect(10, 21, 4, 5);
  } else if (kind === 4) {
    g.fillStyle = '#2a6a30'; g.fillRect(11, 14, 10, 15); g.fillRect(14, 8, 4, 8);
    g.fillStyle = '#d8a020'; g.fillRect(12, 20, 8, 8); g.fillStyle = '#e8e0c0'; g.fillRect(15, 5, 2, 4);
    g.fillStyle = '#ff7a10'; g.beginPath(); g.arc(16, 3, 2.6, 0, 7); g.fill();
  } else if (kind === 5) {
    g.fillStyle = '#34502a'; g.beginPath(); g.ellipse(16, 19, 8, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#7a7e86'; g.fillRect(14, 6, 4, 5); g.strokeStyle = '#c8c8c8'; g.lineWidth = 1.2; g.beginPath(); g.arc(21, 8, 3, 0, 7); g.stroke();
  } else if (kind === 6) {
    g.fillStyle = '#b8402a'; g.fillRect(6, 10, 9, 18); g.fillStyle = '#7a7e86'; g.fillRect(15, 14, 14, 4);
    g.fillStyle = '#ff9a20'; g.beginPath(); g.arc(30, 16, 2.4, 0, 7); g.fill();
  } else if (kind === 7) {
    g.fillStyle = '#2a3a30'; g.fillRect(8, 12, 14, 8); g.fillRect(10, 18, 5, 9);
    g.fillStyle = '#4dff6a'; g.fillRect(22, 13, 6, 6);
  } else if (String(kind).startsWith('arm')) {
    const t = +String(kind)[3], cols = [['#8a5a30', '#b07a45'], ['#7a828c', '#c8d0d8'], ['#b08a10', '#f4d040'], ['#8a0f28', '#ff4a68']][t];
    g.fillStyle = cols[0]; g.beginPath(); g.moveTo(8, 7); g.lineTo(24, 7); g.lineTo(28, 14); g.lineTo(23, 16); g.lineTo(23, 28); g.lineTo(9, 28); g.lineTo(9, 16); g.lineTo(4, 14); g.closePath(); g.fill();
    g.fillStyle = cols[1]; g.fillRect(12, 9, 8, 17);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(16, 9); g.lineTo(16, 26); g.stroke();
    if (t === 3) { g.fillStyle = '#ffd0d8'; g.beginPath(); g.moveTo(16, 13); g.lineTo(19, 18); g.lineTo(16, 24); g.lineTo(13, 18); g.closePath(); g.fill(); }
  } else {
    g.fillStyle = '#9a7a20'; g.fillRect(7, 13, 18, 12); g.fillStyle = '#d8b030';
    for (const x of [10, 15, 20]) g.fillRect(x, 8, 3, 6);
    g.fillStyle = '#3a2a08'; g.fillRect(7, 18, 18, 2);
  }
  return c;
}

const decalArt = {}, flameFrames = [], blobCanvas = mk(), shadowCanvas = mk(), bottleCanvas = mk(), grenadeCanvas = mk(), plasmaImpactCanvas = mk(), ringCanvas = mk();
let crateArt, chestArt, chestOpenArt, xbarrelArt, chandArt = [];

function makeDecals() {
  const mkd = (fn) => { const c = mk(); c.width = c.height = 64; fn(c.getContext('2d')); return c; };
  const rays = (g, n, a0, a1, w) => {
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = w;
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, l = a0 + rnd() * a1; g.beginPath(); g.moveTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); g.lineTo(32 + Math.cos(a) * l, 32 + Math.sin(a) * l); g.stroke(); }
  };
  const chips = (g, n, d0, d1, col) => {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = d0 + rnd() * d1; g.fillRect(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 1 + rnd() * 2, 1 + rnd() * 2); }
  };
  decalArt.hole = mkd(g => {
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 10);
    gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.55, 'rgba(10,8,6,.85)'); gr.addColorStop(1, 'rgba(60,50,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 10, 0, 7); g.fill();
    rays(g, 7, 10, 14, 1); chips(g, 9, 9, 9, 'rgba(210,205,190,.55)');
  });
  decalArt.blast = mkd(g => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.5, 'rgba(8,6,4,.78)'); gr.addColorStop(1, 'rgba(10,8,6,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    rays(g, 12, 14, 17, 1.5); chips(g, 22, 14, 15, 'rgba(180,170,150,.5)');
  });
  decalArt.scorch = mkd(g => {
    const gr = g.createRadialGradient(32, 38, 2, 32, 34, 30);
    gr.addColorStop(0, 'rgba(12,8,6,.85)'); gr.addColorStop(0.6, 'rgba(20,14,10,.5)'); gr.addColorStop(1, 'rgba(20,14,10,0)');
    g.save(); g.translate(32, 32); g.scale(0.8, 1); g.translate(-32, -32); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.restore();
    g.fillStyle = 'rgba(40,30,24,.4)'; for (let i = 0; i < 6; i++) g.fillRect(18 + rnd() * 28, 4 + rnd() * 20, 1 + rnd() * 2, 8 + rnd() * 14);
    chips(g, 10, 2, 9, 'rgba(255,120,30,.55)');
  });
  decalArt.plasma = mkd(g => {
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 28);
    gr.addColorStop(0, 'rgba(6,24,10,.95)'); gr.addColorStop(0.35, 'rgba(10,60,20,.85)'); gr.addColorStop(0.55, 'rgba(90,255,120,.7)'); gr.addColorStop(1, 'rgba(60,255,100,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    chips(g, 14, 8, 14, 'rgba(210,255,220,.7)');
  });
}

function flameArt(f) {
  const c = mk(); c.width = c.height = 64; const g = c.getContext('2d'), j = [0, 3, -3, 2][f], h = [0, 5, -3, 3][f];
  const gl = g.createRadialGradient(32, 46, 2, 32, 46, 30); gl.addColorStop(0, 'rgba(255,170,60,.5)'); gl.addColorStop(1, 'rgba(255,100,0,0)');
  g.fillStyle = gl; g.fillRect(0, 0, 64, 64);
  const fl = (x, w, ht, col, dx) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w, 60);
    g.quadraticCurveTo(x - w, 60 - ht * 0.5, x + j + dx, 60 - ht);
    g.quadraticCurveTo(x + w, 60 - ht * 0.5, x + w, 60);
    g.quadraticCurveTo(x, 60 + w * 0.8, x - w, 60); g.fill();
  };
  fl(32, 14, 46 + h, '#c81e0a', 0); fl(22, 8, 28 - h, '#e8400a', -j); fl(43, 8, 30 + h, '#e8400a', j);
  fl(32, 10, 36 + h, '#ff8a00', j / 2); fl(32, 5.5, 22 + h, '#fff2a0', 0);
  return c;
}

function crateTex() {
  const c = mk(); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 58, 24, 4, 0, 0, 7); g.fill();
  const gr = g.createLinearGradient(8, 10, 56, 58); gr.addColorStop(0, '#9a7040'); gr.addColorStop(1, '#5a3a1c');
  g.fillStyle = gr; g.fillRect(8, 12, 48, 46);
  g.strokeStyle = '#2a180a'; g.lineWidth = 1;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(8, 12 + i * 11.5); g.lineTo(56, 12 + i * 11.5); g.stroke(); }
  g.fillStyle = '#6a4424'; g.fillRect(8, 12, 5, 46); g.fillRect(51, 12, 5, 46); g.fillRect(8, 12, 48, 5); g.fillRect(8, 53, 48, 5);
  g.strokeStyle = '#4a2c14'; g.lineWidth = 4; g.beginPath(); g.moveTo(13, 17); g.lineTo(51, 53); g.stroke();
  g.strokeStyle = '#2a180a'; g.lineWidth = 2; g.strokeRect(8, 12, 48, 46);
  g.fillStyle = '#c8c8c8'; for (const [x, y] of [[10.5, 14.5], [53.5, 14.5], [10.5, 55.5], [53.5, 55.5]]) g.fillRect(x - 1, y - 1, 2, 2);
  finish(g, 128);
  return c;
}

function xbarrelTex() {
  const c = mk(); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(32, 58, 19, 4, 0, 0, 7); g.fill();
  const gr = g.createLinearGradient(17, 0, 47, 0); gr.addColorStop(0, '#5a1008'); gr.addColorStop(0.32, '#e0452a'); gr.addColorStop(0.62, '#b82c16'); gr.addColorStop(1, '#4a0c06');
  g.fillStyle = gr; g.fillRect(17, 13, 30, 43);
  g.beginPath(); g.ellipse(32, 56, 15, 4.2, 0, 0, 7); g.fill();
  g.strokeStyle = '#2a0804'; g.lineWidth = 1.6;
  for (const y of [22, 47]) { g.beginPath(); g.ellipse(32, y, 15, 3.6, 0, 0.05, Math.PI - 0.05); g.stroke(); }
  g.fillStyle = '#9a3018'; g.beginPath(); g.ellipse(32, 13, 15, 4.2, 0, 0, 7); g.fill(); g.strokeStyle = '#2a0804'; g.stroke();
  g.fillStyle = '#5a1408'; g.beginPath(); g.ellipse(32, 13, 11, 2.8, 0, 0, 7); g.fill();
  g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(38, 12.6, 1.8, 0, 7); g.fill(); g.strokeStyle = '#2a2d33'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = '#f2c418'; g.beginPath(); g.moveTo(32, 25); g.lineTo(40, 34); g.lineTo(32, 43); g.lineTo(24, 34); g.closePath(); g.fill();
  g.strokeStyle = '#1a1408'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(32, 28.5); g.quadraticCurveTo(37.5, 34, 35.8, 38.4); g.quadraticCurveTo(32, 41.6, 28.2, 38.4); g.quadraticCurveTo(26.6, 35, 29.6, 32.4); g.quadraticCurveTo(30.2, 34.6, 32, 35.2); g.quadraticCurveTo(33.2, 32, 32, 28.5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(22, 15, 3, 38);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(41, 15, 4, 40);
  finish(g, 128);
  return c;
}

function chestTex(open) {
  const c = mk(); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 58, 26, 4, 0, 0, 7); g.fill();
  const wood = g.createLinearGradient(0, 28, 0, 58); wood.addColorStop(0, '#8a5a2c'); wood.addColorStop(1, '#4a2c12');
  g.fillStyle = wood; g.fillRect(8, 30, 48, 28); g.strokeStyle = '#201008'; g.lineWidth = 2; g.strokeRect(8, 30, 48, 28);
  if (open) {
    g.fillStyle = '#1a0e06'; g.fillRect(10, 30, 44, 8);
    const gl = g.createRadialGradient(32, 30, 2, 32, 30, 26); gl.addColorStop(0, 'rgba(255,230,120,.9)'); gl.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = gl; g.fillRect(4, 8, 56, 40);
    g.fillStyle = wood; g.fillRect(9, 6, 46, 16); g.strokeRect(9, 6, 46, 16);
    g.fillStyle = '#3a3e46'; g.fillRect(16, 6, 5, 16); g.fillRect(43, 6, 5, 16);
  } else {
    g.fillStyle = '#9a6a34'; g.beginPath(); g.moveTo(8, 30); g.quadraticCurveTo(32, 6, 56, 30); g.closePath(); g.fill(); g.stroke();
  }
  g.fillStyle = '#3a3e46'; g.fillRect(16, 30, 5, 28); g.fillRect(43, 30, 5, 28);
  g.fillStyle = '#d8b030'; g.fillRect(28, 36, 8, 9); g.fillStyle = '#201008'; g.fillRect(31, 39, 2, 4);
  finish(g, 128);
  return c;
}

function drawThrown() {
  bottleCanvas.width = bottleCanvas.height = 64;
  let g = bottleCanvas.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#2a6a30'; g.beginPath(); g.roundRect(10, 16, 12, 15, 4); g.fill(); g.fillRect(13, 9, 6, 8);
  g.fillStyle = 'rgba(230,160,40,.9)'; g.fillRect(11, 21, 10, 9); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(12, 18, 2, 11);
  g.fillStyle = '#e8e0c0'; g.fillRect(14, 5, 4, 5);
  g.fillStyle = '#ff7a10'; g.beginPath(); g.moveTo(13.5, 5); g.quadraticCurveTo(13, 2, 16, 0); g.quadraticCurveTo(19, 2, 18.5, 5); g.fill();
  grenadeCanvas.width = grenadeCanvas.height = 64;
  g = grenadeCanvas.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#34502a'; g.beginPath(); g.ellipse(16, 20, 8, 10, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.8;
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(16 + i * 3, 11); g.lineTo(16 + i * 3, 30); g.stroke(); }
  g.fillStyle = '#7a7e86'; g.fillRect(14, 7, 4, 5);
  g.strokeStyle = '#c8c8c8'; g.lineWidth = 1.2; g.beginPath(); g.arc(21, 9, 2.6, 0, 7); g.stroke();
}

function chandelier(f, v) {
  const c = mk(); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2);
  const flame = (x, y, s) => {
    g.fillStyle = '#ff9a20'; g.beginPath(); g.ellipse(x, y, s, s * 1.7, 0, 0, 7); g.fill();
    g.fillStyle = '#fff2a0'; g.beginPath(); g.ellipse(x, y + s * 0.3, s * 0.5, s, 0, 0, 7); g.fill();
  };
  const glow = (x, y, r, col) => {
    const gl = g.createRadialGradient(x, y, 1, x, y, r); gl.addColorStop(0, `rgba(${col},.55)`); gl.addColorStop(1, `rgba(${col},0)`);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
  };
  const chain = (x, y0, y1) => { g.strokeStyle = '#3a3a3e'; g.lineWidth = 1.6; g.setLineDash([2, 1.5]); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.setLineDash([]); };
  if (f === 0 && v === 0) {
    chain(32, 0, 20); g.strokeStyle = '#26262a'; g.lineWidth = 3; g.beginPath(); g.ellipse(32, 24, 24, 6, 0, 0, 7); g.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, x = 32 + Math.cos(a) * 24, y = 24 + Math.sin(a) * 6; g.fillStyle = '#e8e0c8'; g.fillRect(x - 1.5, y - 7, 3, 7); flame(x, y - 9, 1.6); }
    glow(32, 22, 28, '255,170,60');
  } else if (f === 0) {
    g.strokeStyle = '#3a3a3e'; g.lineWidth = 1.4;
    for (const dx of [-14, 0, 14]) { g.beginPath(); g.moveTo(32, 0); g.lineTo(32 + dx, 22); g.stroke(); }
    g.fillStyle = '#1c1c20'; g.beginPath(); g.moveTo(15, 22); g.quadraticCurveTo(32, 48, 49, 22); g.closePath(); g.fill();
    g.fillStyle = '#c81e0a'; g.beginPath(); g.moveTo(22, 23); g.quadraticCurveTo(24, 8, 32, 2); g.quadraticCurveTo(40, 10, 42, 23); g.fill();
    g.fillStyle = '#ff9a20'; g.beginPath(); g.moveTo(26, 23); g.quadraticCurveTo(28, 12, 32, 7); g.quadraticCurveTo(37, 12, 38, 23); g.fill();
    glow(32, 16, 30, '255,150,40');
  } else if (f === 1 && v === 0) {
    chain(14, 0, 22); chain(50, 0, 22); g.fillStyle = '#2a2c30'; g.fillRect(6, 22, 52, 7);
    g.fillStyle = '#e8f6ff'; g.fillRect(9, 24, 34, 3); g.fillStyle = 'rgba(230,246,255,.25)'; g.fillRect(43, 24, 12, 3);
    glow(26, 28, 26, '210,235,255');
  } else if (f === 1) {
    chain(32, 0, 16); g.fillStyle = '#4a4a50'; g.beginPath(); g.moveTo(18, 30); g.quadraticCurveTo(32, 8, 46, 30); g.closePath(); g.fill();
    g.fillStyle = '#fff0b0'; g.beginPath(); g.arc(32, 31, 4, 0, 7); g.fill(); glow(32, 32, 26, '255,225,140');
  } else if (f === 2 && v === 0) {
    chain(32, 0, 14); g.strokeStyle = '#c8a020'; g.lineWidth = 2;
    for (const [w, y] of [[10, 18], [18, 28], [26, 38]]) { g.beginPath(); g.ellipse(32, y, w, w * 0.25, 0, 0, 7); g.stroke(); }
    for (let i = 0; i < 8; i++) { const x = 32 + (i - 3.5) * 6; g.fillStyle = 'rgba(190,230,255,.9)'; g.beginPath(); g.moveTo(x - 1.2, 39); g.lineTo(x + 1.2, 39); g.lineTo(x, 47); g.fill(); }
    for (const dx of [-9, 0, 9]) { g.fillStyle = '#e8e0c8'; g.fillRect(32 + dx - 1.2, 8, 2.4, 8); flame(32 + dx, 6, 1.4); }
    glow(32, 30, 30, '255,200,120');
  } else if (f === 2) {
    chain(32, 0, 20); g.strokeStyle = '#1c1c20'; g.lineWidth = 3; g.beginPath(); g.ellipse(32, 26, 26, 7, 0, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, x = 32 + Math.cos(a) * 26, y = 26 + Math.sin(a) * 7; g.fillStyle = '#f0e8d0'; g.fillRect(x - 1.5, y - 9, 3, 9); flame(x, y - 11, 1.5); }
    glow(32, 24, 30, '255,190,110');
  } else if (f === 3 && v === 0) {
    for (const [x, y, s] of [[18, 22, 1], [32, 32, 1.2], [46, 20, 0.9]]) {
      chain(x, 0, y - 6 * s); g.fillStyle = '#1c1c20'; g.fillRect(x - 5 * s, y - 6 * s, 10 * s, 3); g.fillRect(x - 5 * s, y + 8 * s, 10 * s, 3);
      g.fillStyle = 'rgba(120,255,150,.85)'; g.fillRect(x - 4 * s, y - 3 * s, 8 * s, 11 * s); glow(x, y + 2, 18 * s, '120,255,150');
    }
  } else if (f === 3) {
    chain(32, 0, 20); g.fillStyle = '#2c4a24'; g.beginPath(); g.arc(32, 30, 11, 0, 7); g.fill();
    g.strokeStyle = '#2c4a24'; g.lineWidth = 1.4; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(24 + i * 4, 38); g.lineTo(23 + i * 4 + (i % 2) * 2, 46 + (i % 3) * 3); g.stroke(); }
    for (let i = 0; i < 9; i++) { g.fillStyle = '#9dffb0'; g.fillRect(24 + rnd() * 16, 22 + rnd() * 16, 1.6, 1.6); }
    glow(32, 30, 28, '120,255,150');
  } else if (f === 4 && v === 0) {
    chain(32, 0, 14); g.fillStyle = '#5a5e66'; g.beginPath(); g.moveTo(14, 34); g.quadraticCurveTo(32, 6, 50, 34); g.closePath(); g.fill();
    g.fillStyle = '#ffd890'; g.fillRect(20, 33, 24, 3); glow(32, 36, 30, '255,190,100');
  } else {
    chain(32, 0, 18); g.fillStyle = '#2a2c30'; g.fillRect(22, 18, 20, 5);
    g.fillStyle = 'rgba(255,60,40,.9)'; g.beginPath(); g.arc(32, 30, 9, 0, 7); g.fill();
    g.strokeStyle = '#1a1c1e'; g.lineWidth = 1.3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(32 + i * 4, 21); g.lineTo(32 + i * 4, 39); g.stroke(); }
    glow(32, 30, 28, '255,70,40');
  }
  return c;
}

const MATC = { wood: ['#7a5230', '#4a2c14'], metal: ['#8a8e96', '#4a4e56'], stone: ['#8a8a8a', '#5a5a5e'], glass: ['rgba(190,230,240,.85)', 'rgba(120,180,200,.7)'], bone: ['#e0d8c0', '#a89c80'], rust: ['#8a5a38', '#4a2c18'] };
const debrisArt = {}, rubbleArt = {};
let decoArt = [], decoFlip = [];

function makeDebris() {
  for (const m in MATC) {
    const c = mk(); c.width = c.height = 16; const g = c.getContext('2d');
    g.fillStyle = MATC[m][0]; g.beginPath(); g.moveTo(2, 8); g.lineTo(8, 2); g.lineTo(14, 9); g.lineTo(7, 14); g.closePath(); g.fill();
    g.strokeStyle = MATC[m][1]; g.lineWidth = 1.2; g.stroke(); debrisArt[m] = c;
    const r = mk(); r.width = r.height = 64; const h = r.getContext('2d'); h.scale(2, 2);
    h.fillStyle = 'rgba(0,0,0,.3)'; h.beginPath(); h.ellipse(16, 25, 13, 4, 0, 0, 7); h.fill();
    for (let i = 0; i < 11; i++) {
      const x = 6 + rnd() * 18, y = 19 + rnd() * 7, w = 3 + rnd() * 4;
      h.fillStyle = MATC[m][i % 2]; h.beginPath(); h.moveTo(x, y); h.lineTo(x + w, y - 2); h.lineTo(x + w + 1, y + 3); h.lineTo(x + 1, y + 3); h.closePath(); h.fill();
    }
    rubbleArt[m] = r;
  }
}

// Small drawing helpers (64-unit space, floor line at y = 58)
const dgr = (g, x, w, c1, c2) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, c1); gr.addColorStop(0.5, c2); gr.addColorStop(1, c1); return gr; };
const bx = (g, x, y, w, h, c1, c2) => { g.fillStyle = c2 ? dgr(g, x, w, c1, c2) : c1; g.fillRect(x, y, w, h); };
const el = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
const pl = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
const rust = (g, x, y, w, h, n) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${150 + rnd() * 40 | 0},${70 + rnd() * 30 | 0},25,.55)`; g.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 4, 1 + rnd() * 3); } };
const moss = (g, x, y, w, h, n) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${50 + rnd() * 30 | 0},${100 + rnd() * 50 | 0},40,.6)`; g.beginPath(); g.ellipse(x + rnd() * w, y + rnd() * h, 2 + rnd() * 4, 1.5 + rnd() * 2.5, 0, 0, 7); g.fill(); } };
function dArt(draw) {
  const c = mk(); c.width = c.height = 128; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 59, 22, 3.5, 0, 0, 7); g.fill();
  draw(g); finish(g, 128);
  return c;
}
const armorStand = (g) => { bx(g, 20, 54, 24, 4, '#2e2012', '#5a3e22'); bx(g, 30, 28, 4, 26, '#3e2a18'); bx(g, 14, 22, 36, 3, '#3e2a18'); };

// Dungeon scenery helpers
const armorPost = (g) => { armorStand(g); bx(g, 30, 14, 4, 14, '#3e2a18'); };
const verd = (g, x, y, w, h, n) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${60 + rnd() * 30 | 0},${120 + rnd() * 50 | 0},${100 + rnd() * 30 | 0},.5)`; g.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 3, 1 + rnd() * 5); } };
const rack = (g, items) => {   // posts and top rail behind, weapons, then the two front rails and the feet
  bx(g, 10, 16, 4, 42, '#4a3220'); bx(g, 50, 16, 4, 42, '#4a3220'); bx(g, 8, 14, 48, 3, '#3e2a18');
  items();
  bx(g, 10, 26, 44, 3, '#5a3e26'); bx(g, 10, 42, 44, 3, '#5a3e26'); bx(g, 7, 56, 9, 2.5, '#3a2616'); bx(g, 48, 56, 9, 2.5, '#3a2616');
  rust(g, 10, 12, 44, 46, 22);
};

/* ======================================================================
   CASTEDDISH - Catalogo degli arredi per piano
   DECOR: elenco degli oggetti di scena di ogni piano (armature,
   rastrelliere, barili...) e funzioni che li scelgono.
   ====================================================================== */

// Themed scenery: n name, sc sprite scale, solid blocks movement, hp, mat sound/debris material, w pick weight
const DECOR = [
  [ // 0 dungeon
    { n: 'armorRusty', sc: 0.85, solid: true, hp: 70, mat: 'rust', w: 2, draw: g => { armorStand(g); el(g, 32, 13, 7, 8, '#7a4e30'); bx(g, 27, 12, 10, 2, '#140c06'); bx(g, 31, 4, 2, 6, '#5a3a22'); pl(g, [[22, 22], [42, 22], [40, 40], [24, 40]], '#8a5a38'); bx(g, 26, 26, 12, 2, '#5a3820'); el(g, 20, 24, 5, 4, '#7a4e30'); el(g, 44, 24, 5, 4, '#7a4e30'); bx(g, 16, 26, 5, 14, '#6a4a30'); bx(g, 43, 26, 5, 14, '#6a4a30'); bx(g, 25, 40, 6, 14, '#7a5238'); bx(g, 33, 40, 6, 14, '#7a5238'); rust(g, 16, 8, 32, 46, 30); } },
    { n: 'armorShield', sc: 0.85, solid: true, hp: 70, mat: 'rust', w: 2, draw: g => {
      armorPost(g); el(g, 32, 13, 7, 8, '#7a4e30'); bx(g, 27, 12, 10, 2, '#140c06'); pl(g, [[30, 7], [31, 1], [37, 3], [35, 8]], '#6a2a1c');
      pl(g, [[22, 22], [42, 22], [40, 40], [24, 40]], '#8a5a38'); bx(g, 26, 26, 12, 2, '#5a3820');
      el(g, 20, 24, 5, 4, '#7a4e30'); el(g, 44, 24, 5, 4, '#7a4e30'); bx(g, 43, 26, 5, 14, '#6a4a30');
      bx(g, 25, 40, 6, 14, '#7a5238'); bx(g, 33, 40, 6, 14, '#7a5238');
      bx(g, 49.5, 28, 2.4, 27, '#8a8a80', '#b4b4a8'); bx(g, 45.5, 26, 10, 2, '#4a3a20'); bx(g, 49.8, 18, 1.8, 8, '#3a2a18'); el(g, 50.7, 17, 2.4, 2.4, '#5a4020');
      el(g, 13, 34, 9, 11, '#5e3e26'); el(g, 13, 34, 7, 9, '#7a5a38'); el(g, 13, 34, 2.4, 2.4, '#3a2814');
      g.strokeStyle = '#4a2c18'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(13, 25.5); g.lineTo(13, 42.5); g.moveTo(5.5, 34); g.lineTo(20.5, 34); g.stroke();
      rust(g, 4, 8, 52, 48, 34); } },
    { n: 'armorHalberd', sc: 0.9, solid: true, hp: 70, mat: 'rust', w: 2, draw: g => {
      armorPost(g); el(g, 32, 13, 7, 8, '#664830'); bx(g, 27, 12, 10, 2, '#140c06'); pl(g, [[29, 7], [32, 0.5], [35, 7]], '#664830');
      pl(g, [[22, 22], [42, 22], [40, 40], [24, 40]], '#74503a'); bx(g, 29, 24, 3, 14, 'rgba(255,255,255,.12)');
      el(g, 20, 24, 5, 4, '#664830'); el(g, 44, 24, 5, 4, '#664830'); bx(g, 16, 26, 5, 14, '#5a4030'); bx(g, 43, 26, 5, 14, '#5a4030');
      bx(g, 25, 40, 6, 14, '#6a4a34'); bx(g, 33, 40, 6, 14, '#6a4a34');
      bx(g, 50, 8, 2, 48, '#4a3220'); pl(g, [[52, 8], [59, 11], [59, 19], [52, 18]], '#8a8a80'); pl(g, [[49.4, 9], [51, 1], [52.6, 9]], '#9a9a90'); pl(g, [[50, 22], [45, 26], [50, 28]], '#7a7a70'); el(g, 48.5, 34, 3, 3, '#664830');
      verd(g, 16, 8, 32, 46, 14); rust(g, 16, 8, 32, 46, 26); } },
    { n: 'armorTabard', sc: 0.85, solid: true, hp: 70, mat: 'rust', w: 1.5, draw: g => {
      armorPost(g); bx(g, 25, 40, 6, 16, '#6a4a30'); bx(g, 33, 40, 6, 16, '#6a4a30');
      el(g, 32, 13, 7.5, 9, '#6e4a32'); bx(g, 25, 10, 14, 2, '#5a3a24'); bx(g, 31, 10, 2, 11, '#140c06'); bx(g, 27, 13, 10, 1.6, '#140c06');
      el(g, 20, 24, 5, 4, '#6e4a32'); el(g, 44, 24, 5, 4, '#6e4a32'); bx(g, 16, 26, 5, 14, '#5a4030'); bx(g, 43, 26, 5, 14, '#5a4030');
      pl(g, [[23, 22], [41, 22], [42, 46], [38, 42], [35, 52], [31, 44], [27, 51], [24, 42]], '#5a2420');
      bx(g, 30, 27, 4, 17, '#a89060'); bx(g, 26, 31, 12, 3, '#a89060');
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(24, 36, 3, 9); g.fillRect(37, 34, 3, 10);
      rust(g, 16, 8, 32, 30, 22); } },
    { n: 'armorPartial', sc: 0.85, solid: true, hp: 60, mat: 'rust', w: 1.5, draw: g => { armorStand(g); el(g, 32, 15, 3.5, 4, '#6a4a2a'); pl(g, [[23, 23], [41, 23], [39, 38], [25, 38]], '#7a5030'); el(g, 32, 31, 4, 5, 'rgba(0,0,0,.7)'); el(g, 21, 25, 5, 4, '#6a4428'); bx(g, 17, 27, 5, 10, '#5a3e28'); bx(g, 25, 38, 6, 6, '#6a4a30'); rust(g, 16, 10, 32, 40, 24); } },
    { n: 'armorLegs', sc: 0.85, solid: true, hp: 55, mat: 'rust', w: 1.5, draw: g => {
      armorPost(g); el(g, 32, 17, 4, 5, '#4a3220');
      pl(g, [[23, 36], [41, 36], [43, 46], [21, 46]], '#7a5030'); bx(g, 23, 40, 18, 1.5, '#4a2c18');
      bx(g, 24, 46, 7, 10, '#6a4a30'); bx(g, 33, 46, 7, 10, '#6a4a30'); el(g, 27.5, 56.5, 5, 2, '#5a3a22'); el(g, 36.5, 56.5, 5, 2, '#5a3a22');
      pl(g, [[12, 25], [19, 25], [19, 33], [14, 34]], '#7a4e30'); bx(g, 12, 25, 7, 2, '#5a3820');
      rust(g, 12, 24, 32, 34, 20); } },
    { n: 'armorShoulders', sc: 0.85, solid: true, hp: 55, mat: 'rust', w: 1.5, draw: g => {
      armorPost(g); el(g, 32, 13, 6.5, 8, '#6a4a2a'); bx(g, 27, 12, 10, 2, '#140c06'); pl(g, [[27, 8], [29, 3], [35, 3], [37, 8]], 'rgba(255,255,255,.08)');
      for (const px of [18, 46]) {
        g.fillStyle = '#7a4e30'; g.beginPath(); g.ellipse(px, 26, 8, 6.5, 0, Math.PI, 0); g.fill();
        bx(g, px - 7, 26, 14, 3, '#6a4428'); bx(g, px - 6, 29, 12, 3, '#74492c'); bx(g, px - 5, 32, 10, 2.6, '#6a4428');
        g.strokeStyle = '#3a2210'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(px - 7, 26); g.lineTo(px + 7, 26); g.moveTo(px - 6, 29); g.lineTo(px + 6, 29); g.moveTo(px - 5, 32); g.lineTo(px + 5, 32); g.stroke();
        bx(g, px - 3, 21, 6, 1.6, 'rgba(255,255,255,.18)');
      }
      g.strokeStyle = '#6a6e74'; g.lineWidth = 1.2; g.setLineDash([1.5, 1.5]); g.beginPath(); g.moveTo(32, 30); g.lineTo(32, 46); g.stroke(); g.setLineDash([]);
      rust(g, 10, 8, 44, 24, 22); } },
    { n: 'armorBreast', sc: 0.85, solid: true, hp: 55, mat: 'rust', w: 1.5, draw: g => {
      armorPost(g); pl(g, [[21, 22], [43, 22], [41, 42], [23, 42]], '#7a5030'); bx(g, 29, 24, 3, 17, 'rgba(255,255,255,.12)');
      el(g, 33, 31, 5, 6, 'rgba(8,5,3,.92)'); g.strokeStyle = '#3a2210'; g.lineWidth = 1; g.beginPath(); g.moveTo(28, 28); g.lineTo(24, 24); g.moveTo(38, 34); g.lineTo(41, 38); g.moveTo(32, 38); g.lineTo(30, 42); g.stroke();
      el(g, 32, 17, 4, 5, '#4a3220');
      el(g, 52, 55, 5.5, 4, '#6a4428'); bx(g, 48, 54, 9, 1.5, '#140c06'); el(g, 52, 51.5, 3, 1.4, 'rgba(255,255,255,.15)');
      rust(g, 20, 20, 24, 24, 26); } },
    { n: 'armorEmpty', sc: 0.85, solid: true, hp: 40, mat: 'wood', w: 1.5, draw: g => { armorStand(g); el(g, 32, 17, 4, 5, '#6a4a2a'); bx(g, 26, 38, 12, 2, '#3e2a18'); bx(g, 14, 22, 3, 6, '#3e2a18'); bx(g, 47, 22, 3, 6, '#3e2a18'); } },
    { n: 'armorWeb', sc: 0.85, solid: true, hp: 40, mat: 'wood', w: 1.5, draw: g => {
      armorPost(g); el(g, 32, 17, 4, 5, '#5a3e24');
      g.strokeStyle = 'rgba(235,235,225,.5)'; g.lineWidth = 0.7;
      const R = [[31, 27], [31, 36], [26, 45], [18, 42]];
      for (let s = 0; s < 2; s++) {
        const X = x => s ? 64 - x : x; g.beginPath();
        for (const [x, y] of R) { g.moveTo(X(15), 24); g.lineTo(X(x), y); }
        for (const t of [0.45, 0.75]) R.forEach(([x, y], i) => { const px = X(15 + (x - 15) * t), py = 24 + (y - 24) * t; i ? g.lineTo(px, py) : g.moveTo(px, py); });
        g.stroke();
      }
      g.fillStyle = '#5e6268'; for (let r = 0; r < 5; r++) for (let c = 0; c < 4 - (r >> 1); c++) g.fillRect(26 + c * 3 + (r >> 1) * 1.5, 26 + r * 2.4, 2, 1.6); } },
    { n: 'armorBroken', sc: 0.85, solid: true, hp: 40, mat: 'wood', w: 1, draw: g => {
      bx(g, 20, 54, 24, 4, '#2e2012', '#5a3e22'); bx(g, 30, 14, 4, 40, '#3e2a18'); el(g, 32, 17, 4, 5, '#5a3e24'); bx(g, 14, 22, 18, 3, '#3e2a18');
      g.save(); g.translate(32, 24); g.rotate(1.0); bx(g, 0, -1.5, 17, 3, '#3e2a18'); g.restore();
      pl(g, [[32, 21], [36, 22.5], [33, 25]], '#2a1c10');
      g.save(); g.translate(48, 56); g.rotate(-0.1); bx(g, -6, -1, 12, 2, '#3e2a18'); g.restore(); } },
    { n: 'weaponRack', sc: 0.8, solid: true, hp: 60, mat: 'wood', w: 2, draw: g => {
      bx(g, 10, 16, 4, 42, '#4a3220'); bx(g, 50, 16, 4, 42, '#4a3220'); bx(g, 10, 26, 44, 3, '#5a3e26'); bx(g, 10, 42, 44, 3, '#5a3e26'); bx(g, 8, 14, 48, 3, '#3e2a18');
      for (const [x, a] of [[20, -0.12], [27, 0.05], [34, -0.04]]) { g.save(); g.translate(x, 52); g.rotate(a); bx(g, -1.3, -42, 2.6, 36, '#7a7a70', '#a8a89c'); bx(g, -4, -8, 8, 2, '#4a3a20'); bx(g, -1, -6, 2, 6, '#3a2a18'); g.restore(); }
      g.save(); g.translate(43, 52); g.rotate(0.06); bx(g, -1, -46, 2, 46, '#5a4028'); pl(g, [[-6, -44], [0, -50], [6, -44], [0, -34]], '#7a7a70'); g.restore();
      g.save(); g.translate(48, 52); g.rotate(-0.1); bx(g, -1, -44, 2, 44, '#5a4028'); pl(g, [[-3, -42], [0, -52], [3, -42]], '#8a8a80'); g.restore();
      rust(g, 12, 10, 40, 44, 22); } },
    { n: 'rackAxes', sc: 0.8, solid: true, hp: 60, mat: 'wood', w: 2, draw: g => rack(g, () => {
      for (const [x, a, k] of [[19, -0.06, 0], [29, 0.04, 1], [39, -0.03, 2], [48, 0.07, 3]]) {
        g.save(); g.translate(x, 52); g.rotate(a);
        if (k === 0) { bx(g, -1, -40, 2.2, 40, '#5a4028'); pl(g, [[1, -40], [9, -43], [9, -30], [1, -31]], '#7a7a70'); pl(g, [[-1, -37], [-6, -35], [-1, -33]], '#6a6a62'); }
        else if (k === 1) { bx(g, -1, -34, 2.2, 34, '#5a4028'); el(g, 0, -38, 4.5, 5.5, '#6a6a62'); g.strokeStyle = '#6a6a62'; g.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const t = i * 1.047; g.beginPath(); g.moveTo(Math.cos(t) * 4, -38 + Math.sin(t) * 5); g.lineTo(Math.cos(t) * 7, -38 + Math.sin(t) * 8); g.stroke(); } }
        else if (k === 2) { bx(g, -1, -44, 2.2, 44, '#5a4028'); pl(g, [[1, -44], [8, -46], [8, -34], [1, -35]], '#7a7a70'); pl(g, [[-1, -44], [-8, -46], [-8, -34], [-1, -35]], '#6a6a62'); }
        else { bx(g, -1, -30, 2.2, 30, '#5a4028'); g.strokeStyle = '#4a4a46'; g.lineWidth = 1; g.setLineDash([1.6, 1.2]); g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(7, -34, 6, -26); g.stroke(); g.setLineDash([]); el(g, 6, -23, 3.6, 3.6, '#6a6a62'); }
        g.restore();
      }
    }) },
    { n: 'rackPolearms', sc: 0.85, solid: true, hp: 60, mat: 'wood', w: 2, draw: g => rack(g, () => {
      for (const [x, a, k] of [[19, -0.1, 0], [27, 0.03, 1], [35, -0.05, 2], [44, 0.1, 3], [49, -0.02, 4]]) {
        g.save(); g.translate(x, 54); g.rotate(a);
        if (k === 0) { bx(g, -1, -46, 2, 46, '#5a4028'); pl(g, [[-2.6, -46], [0, -53], [2.6, -46], [0, -44]], '#8a8a80'); }
        else if (k === 1) { bx(g, -1, -48, 2, 48, '#5a4028'); pl(g, [[-1.6, -48], [0, -54], [1.6, -48]], '#9a9a90'); }
        else if (k === 2) { bx(g, -1, -44, 2, 44, '#5a4028'); pl(g, [[1, -44], [8, -47], [9, -36], [1, -34]], '#7a7a70'); }
        else if (k === 3) { bx(g, -1, -22, 2, 22, '#5a4028'); pl(g, [[-1, -22], [0, -26], [1, -23], [1, -22]], '#3a2a18'); }
        else { bx(g, -1, -50, 2, 50, '#4a3220'); pl(g, [[1, -50], [7, -47], [7, -40], [1, -41]], '#8a8a80'); pl(g, [[-1.6, -50], [0, -55], [1.6, -50]], '#9a9a90'); }
        g.restore();
      }
      g.save(); g.translate(30, 56); g.rotate(-0.25); pl(g, [[-6, 0], [0, -2.4], [6, 0], [0, 2.4]], '#7a7a70'); g.restore();
    }) },
    { n: 'rackSwords', sc: 0.8, solid: true, hp: 60, mat: 'wood', w: 2, draw: g => rack(g, () => {
      const sw = (x, y, len, a, jag) => {
        g.save(); g.translate(x, y); g.rotate(a);
        bx(g, 0, -1.4, len, 2.8, '#8a8a80', '#b8b8ac');
        if (jag) pl(g, [[len, -1.4], [len + 2, 0], [len + 1, 0.6], [len + 3, 1.4], [len, 1.4]], '#a8a89c'); else pl(g, [[len, -1.4], [len + 5, 0], [len, 1.4]], '#a8a89c');
        bx(g, -2, -4.5, 2.6, 9, '#4a3a20'); bx(g, -9, -1.1, 7, 2.2, '#3a2a18'); el(g, -10, 0, 2.2, 2.2, '#5a4020');
        g.restore();
      };
      sw(16, 24.2, 30, -0.02); sw(18, 40.2, 14, 0); sw(36, 40.6, 14, 0.03, true);
      sw(16, 55, 28, -0.04);
    }) },
    { n: 'rackShields', sc: 0.8, solid: true, hp: 60, mat: 'wood', w: 1.5, draw: g => rack(g, () => {
      pl(g, [[16, 18], [32, 18], [32, 34], [24, 46], [16, 34]], '#5e4430'); pl(g, [[18, 20], [30, 20], [30, 33], [24, 42], [18, 33]], '#6e5236'); bx(g, 23, 21, 2, 18, '#9a8450'); bx(g, 19, 27, 10, 2, '#9a8450');
      el(g, 43, 33, 9, 9.5, '#4e3822'); el(g, 43, 33, 7.2, 7.7, '#6a4c30'); el(g, 43, 33, 2.4, 2.4, '#3a2814');
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(37, 28); g.lineTo(42, 34); g.lineTo(39, 40); g.stroke();
      bx(g, 14, 48, 26, 3, '#4a3220'); g.strokeStyle = '#3a2a18'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(36, 42); g.quadraticCurveTo(43, 49.5, 36, 57); g.stroke();
      g.strokeStyle = '#8a7a5a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(36, 42); g.lineTo(36, 57); g.stroke();
      bx(g, 47, 44, 5, 12, '#4a3220'); g.strokeStyle = '#6a5030'; g.lineWidth = 1; g.beginPath(); for (const x of [48, 49.5, 51]) { g.moveTo(x, 44); g.lineTo(x - 0.5, 38); } g.stroke();
    }) },
    { n: 'barrel', sc: 0.6, solid: true, hp: 40, mat: 'wood', w: 1.5, draw: g => { bx(g, 18, 26, 28, 30, '#5a3a1c', '#8a5a30'); el(g, 32, 26, 14, 4, '#7a5028'); el(g, 32, 56, 14, 4, '#4a2c12'); bx(g, 18, 33, 28, 2, '#26262a'); bx(g, 18, 47, 28, 2, '#26262a'); g.strokeStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(22 + i * 5, 28); g.lineTo(22 + i * 5, 56); g.stroke(); } } },
    { n: 'bones', sc: 0.45, solid: false, hp: 20, mat: 'bone', w: 1.5, draw: g => {
      el(g, 32, 54, 22, 6, '#6a604e');
      for (const [x, y, k] of [[22, 50, 1], [34, 47, 1.2], [42, 52, 0.9], [29, 42, 1]]) { el(g, x, y, 5 * k, 5.5 * k, '#e0d8c0'); bx(g, x - 3 * k, y + 3 * k, 6 * k, 3 * k, '#cfc6aa'); el(g, x - 2 * k, y - 0.5 * k, 1.3 * k, 1.6 * k, '#1a1208'); el(g, x + 2 * k, y - 0.5 * k, 1.3 * k, 1.6 * k, '#1a1208'); }
      g.strokeStyle = '#d8d0b8'; g.lineWidth = 2; g.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[14, 54, 30, 48], [26, 56, 48, 50], [18, 50, 36, 56]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); } } },
    { n: 'urn', sc: 0.5, solid: true, hp: 15, mat: 'stone', w: 1, draw: g => { pl(g, [[26, 20], [38, 20], [44, 38], [39, 56], [25, 56], [20, 38]], '#7a5030'); bx(g, 25, 14, 14, 6, '#8a5c34', '#a8743e'); el(g, 32, 14, 7, 2.5, '#2a1a0c'); g.strokeStyle = '#d8b050'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(21, 36); g.lineTo(43, 36); g.moveTo(24, 46); g.lineTo(40, 46); g.stroke(); g.strokeStyle = '#6a4428'; g.lineWidth = 2.4; g.beginPath(); g.arc(20, 30, 5, 1.2, 4.8); g.stroke(); g.beginPath(); g.arc(44, 30, 5, 4.6, 1.9); g.stroke(); } }
  ],
  [ // 1 abandoned building
    { n: 'desk', sc: 0.65, solid: true, hp: 60, mat: 'wood', w: 2, draw: g => { bx(g, 8, 30, 48, 5, '#6a4a2a', '#9a7040'); bx(g, 10, 35, 14, 22, '#5a3c22', '#7a5230'); bx(g, 40, 35, 14, 22, '#5a3c22', '#7a5230'); bx(g, 24, 35, 16, 3, '#4a3018'); for (const y of [40, 48]) { bx(g, 14, y, 6, 2, '#b8b0a0'); bx(g, 44, y, 6, 2, '#b8b0a0'); } g.save(); g.translate(20, 29); g.rotate(-0.15); bx(g, 0, -4, 10, 5, '#e8e4d4'); g.restore(); bx(g, 34, 25, 9, 5, '#d8d4c4'); el(g, 46, 25, 3, 3, '#3a4a40'); rust(g, 8, 30, 48, 27, 12); } },
    { n: 'cabinet', sc: 0.8, solid: true, hp: 70, mat: 'metal', w: 2, draw: g => { bx(g, 18, 14, 28, 44, '#6a7078', '#9aa0a8'); for (const y of [16, 29, 42]) { bx(g, 20, y, 24, 11, '#5a6068', '#8a9098'); bx(g, 28, y + 4, 8, 2, '#2a2d33'); bx(g, 31, y + 1, 2, 2, '#e0e0d8'); } pl(g, [[40, 40], [46, 44], [46, 50], [41, 47]], 'rgba(0,0,0,.35)'); rust(g, 18, 14, 28, 44, 26); } },
    { n: 'tv', sc: 0.55, solid: true, hp: 25, mat: 'glass', w: 2, draw: g => { bx(g, 12, 42, 40, 3, '#5a4028'); bx(g, 14, 45, 3, 13, '#4a3320'); bx(g, 47, 45, 3, 13, '#4a3320'); bx(g, 14, 20, 36, 22, '#3a3a3e', '#5a5a60'); bx(g, 18, 23, 24, 16, '#0e1618'); el(g, 30, 31, 8, 5, 'rgba(120,200,170,.18)'); g.strokeStyle = 'rgba(200,220,220,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(24, 24); g.lineTo(32, 33); g.lineTo(28, 38); g.moveTo(32, 33); g.lineTo(40, 29); g.stroke(); bx(g, 44, 26, 4, 10, '#26262a'); g.strokeStyle = '#8a8e96'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, 20); g.lineTo(18, 8); g.moveTo(34, 20); g.lineTo(44, 7); g.stroke(); } },
    { n: 'vending', sc: 0.9, solid: true, hp: 90, mat: 'metal', w: 1, draw: g => { bx(g, 16, 6, 32, 52, '#8a2020', '#c03a3a'); bx(g, 19, 10, 20, 30, '#1c242c'); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) bx(g, 21 + c * 4.5, 13 + r * 9, 3, 6, ['#d8a020', '#4a8a30', '#3a5aa0', '#c8c8c0'][(r + c) % 4]); bx(g, 41, 12, 5, 14, '#2a2d33'); bx(g, 42, 30, 3, 2, '#d8d8c0'); bx(g, 20, 44, 24, 8, '#10141a'); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(22, 12); g.lineTo(30, 24); g.lineTo(26, 34); g.stroke(); rust(g, 16, 6, 32, 52, 24); } },
    { n: 'drum', sc: 0.6, solid: true, hp: 55, mat: 'metal', w: 2, draw: g => { bx(g, 20, 26, 24, 30, '#9a5a28', '#d08a40'); el(g, 32, 26, 12, 3.5, '#b87030'); el(g, 32, 56, 12, 3.5, '#6a3a18'); bx(g, 20, 34, 24, 2, '#6a3a18'); bx(g, 20, 46, 24, 2, '#6a3a18'); pl(g, [[32, 37], [38, 46], [26, 46]], '#e8c020'); bx(g, 31, 40, 2, 3, '#1a1a1a'); pl(g, [[22, 30], [27, 34], [24, 40]], 'rgba(0,0,0,.25)'); rust(g, 20, 26, 24, 30, 24); } },
    { n: 'trash', sc: 0.45, solid: false, hp: 20, mat: 'wood', w: 3, draw: g => { el(g, 32, 54, 24, 6, '#3a3630'); for (let i = 0; i < 14; i++) { const x = 14 + rnd() * 36, y = 46 + rnd() * 10, k = i % 4; if (k === 0) bx(g, x, y - 5, 4, 7, ['#b8b8b0', '#a03030', '#4a6aa0'][i % 3]); else if (k === 1) el(g, x, y, 3.5, 3, '#e4e0d0'); else if (k === 2) pl(g, [[x, y], [x + 8, y - 3], [x + 7, y + 3]], '#8a6a40'); else bx(g, x, y, 6, 2, '#6a6a68'); } rust(g, 12, 44, 40, 14, 10); } },
    { n: 'couch', sc: 0.6, solid: true, hp: 50, mat: 'wood', w: 2, draw: g => { bx(g, 8, 24, 48, 16, '#5a4a38', '#7a6650'); bx(g, 6, 36, 52, 14, '#6a5642', '#8a7258'); bx(g, 4, 30, 8, 24, '#4a3c2c', '#6a5640'); bx(g, 52, 30, 8, 24, '#4a3c2c', '#6a5640'); bx(g, 8, 50, 4, 8, '#2a2018'); bx(g, 52, 50, 4, 8, '#2a2018'); g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(32, 36); g.lineTo(32, 50); g.stroke(); pl(g, [[36, 38], [44, 36], [46, 44], [38, 46]], '#d8c890'); g.strokeStyle = '#8a8e96'; g.beginPath(); g.moveTo(38, 38); g.lineTo(42, 42); g.stroke(); rust(g, 4, 24, 56, 30, 8); } },
    { n: 'fridge', sc: 0.85, solid: true, hp: 80, mat: 'metal', w: 1.5, draw: g => {
      bx(g, 18, 8, 28, 50, '#b4b09a', '#d6d2bc'); bx(g, 18, 26, 28, 1.6, '#6a6658'); bx(g, 40, 12, 2, 10, '#5a5648'); bx(g, 40, 30, 2, 14, '#5a5648');
      pl(g, [[18, 28], [22, 29.5], [22, 56], [18, 57]], '#12100c'); bx(g, 22, 57, 20, 2, '#2a2a28');
      g.fillStyle = 'rgba(70,56,24,.28)'; g.fillRect(26, 11, 3, 14); g.fillRect(33, 31, 2, 18);
      rust(g, 18, 8, 28, 50, 24); } },
    { n: 'bedframe', sc: 0.6, solid: true, hp: 55, mat: 'metal', w: 1.5, draw: g => {
      bx(g, 8, 24, 3, 34, '#3a2e26'); bx(g, 53, 36, 3, 22, '#3a2e26'); bx(g, 7, 22, 5, 3, '#6a5a48'); bx(g, 8, 32, 3, 1.5, '#6a5a48'); bx(g, 8, 40, 3, 1.5, '#6a5a48');
      bx(g, 10, 46, 44, 2, '#3a2e26'); bx(g, 12, 48, 3, 10, '#3a2e26'); bx(g, 49, 48, 3, 10, '#3a2e26');
      pl(g, [[11, 38], [53, 38], [54, 46], [10, 46]], '#a89c80'); pl(g, [[11, 38], [53, 38], [51, 40], [13, 40]], '#c2b698');
      el(g, 30, 43, 9, 2.6, 'rgba(80,58,28,.4)'); el(g, 19, 36, 7, 3, '#cfc7ae'); pl(g, [[34, 36], [52, 36], [53, 42], [36, 41]], '#5e4e3e');
      rust(g, 8, 22, 48, 36, 22); } },
    { n: 'cart', sc: 0.55, solid: true, hp: 40, mat: 'metal', w: 1.5, draw: g => {
      g.strokeStyle = '#8a8e96'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(12, 22); g.lineTo(52, 22); g.lineTo(46, 44); g.lineTo(18, 44); g.closePath(); g.stroke();
      for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(12 + i * 6.7, 22); g.lineTo(18 + i * 4.7, 44); g.stroke(); }
      for (const y of [29, 36]) { g.beginPath(); g.moveTo(12 + (y - 22) * 0.27, y); g.lineTo(52 - (y - 22) * 0.27, y); g.stroke(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo(12, 22); g.lineTo(8, 14); g.lineTo(22, 14); g.stroke();
      bx(g, 18, 44, 28, 2, '#6a6e76'); g.lineWidth = 1.4; g.beginPath(); g.moveTo(20, 46); g.lineTo(18, 54); g.moveTo(44, 46); g.lineTo(46, 54); g.stroke();
      el(g, 18, 56, 3, 2.4, '#1a1a1c'); el(g, 46, 56, 3, 2.4, '#1a1a1c');
      pl(g, [[22, 34], [30, 28], [40, 31], [38, 38], [26, 40]], '#5e5240'); el(g, 34, 28, 4, 3, '#8a6a3a');
      rust(g, 10, 14, 44, 44, 16); } },
    { n: 'lockers', sc: 0.9, solid: true, hp: 85, mat: 'metal', w: 1.5, draw: g => {
      for (let i = 0; i < 3; i++) {
        const x = 10 + i * 16;
        bx(g, x, 8, 15, 50, '#4e604e', '#7a8c78');
        if (i === 1) { bx(g, x + 2, 10, 11, 46, '#0c100c'); pl(g, [[x, 8], [x - 6, 12], [x - 6, 58], [x, 56]], '#5a6c5a'); bx(g, x - 5, 16, 3, 1, '#1a221a'); bx(g, x - 5, 19, 3, 1, '#1a221a'); }
        else { for (let k = 0; k < 3; k++) bx(g, x + 4, 12 + k * 2.4, 7, 1, '#1a221a'); bx(g, x + 2, 28, 11, 1, '#2a342a'); bx(g, x + 11, 34, 1.6, 6, '#c8c8c0'); }
      }
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(44, 40); g.lineTo(50, 46); g.lineTo(46, 52); g.stroke();
      rust(g, 10, 8, 50, 50, 26); } },
    { n: 'computer', sc: 0.6, solid: true, hp: 40, mat: 'glass', w: 1.5, draw: g => {
      bx(g, 10, 36, 44, 3, '#6a5a48', '#8a7860'); bx(g, 13, 39, 3, 19, '#4a3c2c'); bx(g, 48, 39, 3, 19, '#4a3c2c'); bx(g, 13, 46, 38, 2, '#4a3c2c');
      bx(g, 14, 10, 26, 24, '#c8c0a8', '#e0d8c0'); bx(g, 17, 13, 20, 16, '#0c1612'); el(g, 27, 21, 7, 4.5, 'rgba(100,255,160,.22)');
      g.fillStyle = 'rgba(100,255,160,.55)'; for (let i = 0; i < 4; i++) g.fillRect(19, 15 + i * 3, 6 + (i * 5) % 9, 1);
      g.strokeStyle = 'rgba(220,240,230,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(30, 14); g.lineTo(26, 22); g.lineTo(34, 27); g.stroke();
      bx(g, 22, 34, 10, 2, '#a89e88'); bx(g, 38, 33, 14, 3, '#b8b09c');
      g.strokeStyle = '#2a2a2c'; g.lineWidth = 1; g.beginPath(); g.moveTo(40, 24); g.quadraticCurveTo(56, 26, 52, 36); g.stroke();
      rust(g, 10, 10, 44, 48, 14); } },
    { n: 'cooler', sc: 0.75, solid: true, hp: 40, mat: 'glass', w: 1.5, draw: g => {
      bx(g, 22, 28, 20, 30, '#cdd2d6', '#eef2f6'); bx(g, 27, 34, 3, 3, '#3a6ab0'); bx(g, 34, 34, 3, 3, '#c03a3a'); bx(g, 25, 42, 14, 2, '#8a8e96'); bx(g, 24, 56, 16, 2, '#5a5e66');
      pl(g, [[27, 5], [37, 5], [40, 26], [24, 26]], 'rgba(140,190,225,.5)'); bx(g, 28, 3, 8, 3, 'rgba(140,190,225,.6)'); pl(g, [[25, 14], [39, 14], [40, 26], [24, 26]], 'rgba(90,150,200,.45)');
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(33, 7); g.lineTo(30, 14); g.lineTo(34, 22); g.stroke();
      g.fillStyle = 'rgba(60,50,30,.28)'; g.fillRect(22, 46, 20, 8); rust(g, 22, 28, 20, 30, 8); } },
    { n: 'boxes', sc: 0.6, solid: true, hp: 40, mat: 'wood', w: 2, draw: g => {
      bx(g, 10, 36, 26, 22, '#a8845a', '#c8a070'); bx(g, 38, 42, 17, 16, '#9a784e', '#b89468'); bx(g, 16, 18, 22, 18, '#b08a5e', '#d0a878');
      bx(g, 21, 36, 3, 22, 'rgba(214,194,140,.7)'); bx(g, 44, 42, 3, 16, 'rgba(214,194,140,.7)'); bx(g, 12, 44, 8, 5, '#e8e0c8');
      pl(g, [[16, 18], [10, 11], [22, 15]], '#a07c54'); pl(g, [[38, 18], [45, 11], [32, 15]], '#8e6c46'); g.fillStyle = '#1e140a'; g.fillRect(18, 20, 18, 3);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(10, 36, 26, 22); g.strokeRect(16, 18, 22, 18); g.strokeRect(38, 42, 17, 16); } },
    { n: 'plant', sc: 0.55, solid: false, hp: 20, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[24, 44], [40, 44], [37, 58], [27, 58]], '#9a5a3a'); bx(g, 22, 41, 20, 4, '#b06a44'); el(g, 32, 42, 9, 2, '#2a1a0e');
      g.strokeStyle = '#5a4a30'; g.lineWidth = 1.5; g.lineCap = 'round';
      for (const [cx, cy, ex, ey] of [[26, 32, 18, 20], [30, 26, 28, 12], [36, 28, 42, 14], [38, 34, 48, 26]]) {
        g.beginPath(); g.moveTo(32, 42); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke(); el(g, ex, ey, 2.4, 1.5, '#6a5230'); el(g, (cx + ex) / 2, (cy + ey) / 2, 2, 1.2, '#7a6038');
      } } },
    { n: 'tires', sc: 0.5, solid: true, hp: 50, mat: 'wood', w: 1.5, draw: g => {
      for (let i = 0; i < 3; i++) {
        const y = 52 - i * 10, dx = [0, 3, -2][i];
        el(g, 32 + dx, y + 2, 18, 7, '#101012'); el(g, 32 + dx, y, 18, 7, '#1e1e22'); el(g, 32 + dx, y - 1, 9.5, 3.6, '#0a0a0c');
        g.strokeStyle = 'rgba(80,80,90,.4)'; g.lineWidth = 1; g.beginPath(); g.ellipse(32 + dx, y, 16, 6, 0, 0, 7); g.stroke();
      }
      el(g, 30, 30, 3, 1.2, 'rgba(100,100,110,.4)'); } },
    { n: 'chair', sc: 0.6, solid: false, hp: 25, mat: 'metal', w: 1.5, draw: g => {
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 1.6; g.beginPath(); for (const x of [14, 24, 40, 50]) { g.moveTo(32, 50); g.lineTo(x, 57); } g.stroke();
      for (const x of [14, 24, 40, 50]) el(g, x, 57.5, 1.8, 1.4, '#111');
      bx(g, 30.5, 38, 3, 13, '#2a2a2e');
      pl(g, [[19, 32], [45, 32], [47, 40], [17, 40]], '#364450'); pl(g, [[22, 10], [42, 10], [45, 30], [19, 30]], '#364450'); bx(g, 29, 29, 6, 4, '#2a2a2e');
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, 14); g.lineTo(31, 24); g.moveTo(36, 12); g.lineTo(34, 20); g.stroke();
      el(g, 37, 19, 3.2, 2.2, '#c8c0a0'); bx(g, 14, 30, 2.4, 10, '#2a2a2e'); bx(g, 48, 30, 2.4, 10, '#2a2a2e'); } },
    { n: 'copier', sc: 0.7, solid: true, hp: 75, mat: 'metal', w: 1.5, draw: g => {
      bx(g, 10, 30, 44, 27, '#b4b0a0', '#d0ccbc'); pl(g, [[10, 30], [54, 30], [50, 23], [14, 23]], '#8e8a78'); bx(g, 38, 38, 12, 6, '#161e20');
      for (let i = 0; i < 3; i++) el(g, 41 + i * 3.4, 46.5, 1, 1, ['#d03030', '#30d060', '#d0b020'][i]);
      bx(g, 14, 44, 22, 5, '#7a7666'); bx(g, 16, 43, 14, 2.2, '#f0ece0'); pl(g, [[30, 43], [36, 41], [34, 46]], '#eae6d8');
      bx(g, 12, 56, 4, 2, '#2a2a28'); bx(g, 48, 56, 4, 2, '#2a2a28'); g.fillStyle = 'rgba(60,50,30,.25)'; g.fillRect(12, 32, 8, 10);
      rust(g, 10, 24, 44, 33, 14); } },
    { n: 'mattress', sc: 0.5, solid: false, hp: 20, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[8, 50], [56, 50], [52, 57], [12, 57]], '#9a8e72'); pl(g, [[12, 45], [52, 45], [56, 50], [8, 50]], '#c0b498');
      el(g, 28, 50, 8, 2.4, 'rgba(90,64,30,.4)'); g.strokeStyle = 'rgba(70,60,40,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(14, 53.5); g.lineTo(50, 53.5); g.stroke();
      g.strokeStyle = '#6a6e76'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(40, 46); g.quadraticCurveTo(44, 41, 47, 45); g.stroke(); } }
  ],
  [ // 2 castle
    { n: 'statue', sc: 0.95, solid: true, hp: 110, mat: 'stone', w: 2, draw: g => { bx(g, 16, 46, 32, 12, '#585860', '#8a8a96'); bx(g, 20, 42, 24, 5, '#6a6a74', '#9a9aa6'); bx(g, 26, 30, 5, 14, '#7a7a86', '#a0a0ac'); bx(g, 33, 30, 5, 14, '#7a7a86', '#a0a0ac'); pl(g, [[22, 14], [42, 14], [40, 32], [24, 32]], '#8a8a96'); el(g, 32, 9, 5, 6, '#9a9aa6'); pl(g, [[26, 6], [32, 0], [38, 6]], '#7a7a86'); bx(g, 31, 14, 2.5, 30, '#b0b0bc'); bx(g, 27, 20, 10, 2, '#9a9aa6'); g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(28, 20); g.lineTo(30, 30); g.stroke(); moss(g, 16, 40, 32, 18, 5); } },
    { n: 'coffin', sc: 0.95, solid: true, hp: 70, mat: 'wood', w: 2, draw: g => { pl(g, [[24, 8], [40, 8], [47, 22], [41, 57], [23, 57], [17, 22]], '#3a2416'); pl(g, [[27, 11], [37, 11], [42, 22], [38, 53], [26, 53], [22, 22]], '#4e3220'); bx(g, 30, 16, 4, 16, '#c8a020'); bx(g, 25, 21, 14, 3.5, '#c8a020'); for (const y of [38, 46]) bx(g, 20, y, 4, 2.5, '#8a8e96'); g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(27, 34); g.lineTo(37, 34); g.stroke(); } },
    { n: 'vase', sc: 0.6, solid: true, hp: 25, mat: 'glass', w: 2, draw: g => { pl(g, [[27, 12], [37, 12], [45, 32], [39, 56], [25, 56], [19, 32]], '#3a5a9a'); bx(g, 25, 8, 14, 5, '#d8b050'); bx(g, 24, 54, 16, 4, '#d8b050'); g.strokeStyle = '#d8b050'; g.lineWidth = 2; g.beginPath(); g.moveTo(21, 32); g.lineTo(43, 32); g.moveTo(24, 44); g.lineTo(40, 44); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(25, 16, 3, 36); el(g, 32, 38, 3, 3, '#d8b050'); g.beginPath(); g.arc(20, 24, 5, 1.2, 4.8); g.stroke(); g.beginPath(); g.arc(44, 24, 5, 4.6, 1.9); g.stroke(); } },
    { n: 'candelabra', sc: 0.8, solid: true, hp: 30, mat: 'metal', w: 2, draw: g => { el(g, 32, 56, 11, 3, '#8a6a18'); bx(g, 30, 22, 4, 34, '#a08020', '#d8b030'); el(g, 32, 40, 5, 2, '#d8b030'); g.strokeStyle = '#c8a020'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 24); g.quadraticCurveTo(18, 22, 16, 14); g.moveTo(32, 24); g.quadraticCurveTo(46, 22, 48, 14); g.moveTo(32, 24); g.lineTo(32, 10); g.stroke(); for (const [x, y] of [[16, 14], [32, 10], [48, 14]]) { bx(g, x - 1.5, y - 8, 3, 8, '#e8e0c8'); el(g, x, y - 10.5, 1.6, 2.6, '#ff9a20'); el(g, x, y - 10, 0.8, 1.4, '#fff2a0'); } } },
    { n: 'knight', sc: 0.9, solid: true, hp: 70, mat: 'metal', w: 2, draw: g => { armorStand(g); el(g, 32, 13, 7, 8, '#4a5870'); bx(g, 27, 12, 10, 2, '#10141c'); pl(g, [[30, 6], [32, 0], [38, 4], [34, 8]], '#a02030'); pl(g, [[22, 22], [42, 22], [40, 40], [24, 40]], '#5a6a82'); bx(g, 29, 24, 3, 14, 'rgba(255,255,255,.25)'); el(g, 20, 24, 5, 4, '#4a5870'); el(g, 44, 24, 5, 4, '#4a5870'); bx(g, 16, 26, 5, 14, '#44526a'); bx(g, 43, 26, 5, 14, '#44526a'); bx(g, 25, 40, 6, 14, '#506078'); bx(g, 33, 40, 6, 14, '#506078'); bx(g, 51, 8, 2, 48, '#4a3220'); pl(g, [[48, 12], [52, 4], [56, 12], [52, 18]], '#9aa4b4'); } },
    { n: 'pew', sc: 0.6, solid: true, hp: 50, mat: 'wood', w: 2, draw: g => { bx(g, 8, 36, 48, 5, '#4a2e18', '#6a4426'); bx(g, 8, 20, 48, 14, '#3e2614', '#5a3a20'); for (const x of [14, 30, 46]) bx(g, x, 22, 2, 10, '#2a180c'); bx(g, 8, 41, 4, 17, '#3a2412'); bx(g, 52, 41, 4, 17, '#3a2412'); bx(g, 6, 14, 6, 44, '#4a2e18'); bx(g, 52, 14, 6, 44, '#4a2e18'); el(g, 9, 12, 3, 3, '#6a4426'); el(g, 55, 12, 3, 3, '#6a4426'); } },
    { n: 'bookshelf', sc: 0.95, solid: true, hp: 70, mat: 'wood', w: 2, draw: g => { bx(g, 12, 6, 40, 52, '#3a2412', '#5a3a20'); bx(g, 15, 9, 34, 46, '#1e120a'); for (const y of [22, 37, 52]) bx(g, 15, y, 34, 2, '#4a2e18'); const cols = ['#7a2020', '#2a4a7a', '#2a6a3a', '#8a6a20', '#5a2a6a', '#6a4a2a']; for (let r = 0; r < 3; r++) { let x = 16; for (let k = 0; k < 8 && x < 46; k++) { const w = 2 + rnd() * 3; bx(g, x, 10 + r * 15 + (rnd() * 3 | 0), w, 11, cols[(r + k) % 6]); x += w + 0.4; } } } },
    { n: 'throne', sc: 0.9, solid: true, hp: 100, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[20, 6], [28, 2], [36, 2], [44, 6], [43, 38], [21, 38]], '#2e1c10'); pl(g, [[24, 9], [40, 9], [39, 36], [25, 36]], '#6a1820'); el(g, 32, 5, 4, 3, '#c8a020');
      bx(g, 16, 36, 32, 8, '#3a2214', '#5a3820'); bx(g, 20, 36, 24, 4, '#7a1e28'); bx(g, 14, 28, 5, 20, '#3a2214'); bx(g, 45, 28, 5, 20, '#3a2214');
      bx(g, 16, 44, 5, 14, '#2e1c10'); bx(g, 43, 44, 5, 14, '#2e1c10'); bx(g, 22, 48, 20, 8, '#2e1c10');
      for (const x of [16.5, 47.5]) el(g, x, 27, 3, 3, '#c8a020');
      g.strokeStyle = '#c8a020'; g.lineWidth = 1; g.beginPath(); g.moveTo(24, 9); g.lineTo(24, 36); g.moveTo(40, 9); g.lineTo(40, 36); g.stroke(); } },
    { n: 'clock', sc: 0.95, solid: true, hp: 70, mat: 'wood', w: 1.5, draw: g => {
      bx(g, 22, 4, 20, 54, '#3a2214', '#5a3a22'); pl(g, [[22, 4], [32, 0], [42, 4]], '#4a2e1a'); bx(g, 19, 52, 26, 6, '#2e1c10', '#4a2e1a');
      el(g, 32, 14, 7.5, 7.5, '#e0d8c0'); g.strokeStyle = '#1a1208'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 14); g.lineTo(32, 9); g.moveTo(32, 14); g.lineTo(36, 16); g.stroke();
      g.beginPath(); g.arc(32, 14, 7.5, 0, 7); g.stroke();
      bx(g, 26, 26, 12, 24, '#1a1008'); g.strokeStyle = 'rgba(200,170,90,.5)'; g.lineWidth = 0.8; g.strokeRect(26, 26, 12, 24); bx(g, 31.4, 28, 1.2, 14, '#b89838'); el(g, 32, 43, 3.4, 3.4, '#b89838');
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(30, 12); g.lineTo(34, 17); g.stroke(); } },
    { n: 'gargoyle', sc: 0.8, solid: true, hp: 100, mat: 'stone', w: 1.5, draw: g => {
      bx(g, 18, 46, 28, 12, '#5a5a62', '#80808c'); bx(g, 16, 54, 32, 4, '#4a4a52', '#6a6a76');
      pl(g, [[22, 46], [42, 46], [40, 32], [24, 32]], '#6a6a76');
      pl(g, [[22, 36], [8, 18], [6, 30], [14, 40]], '#555560'); pl(g, [[42, 36], [56, 18], [58, 30], [50, 40]], '#555560');
      el(g, 32, 26, 8, 8, '#7a7a86'); pl(g, [[25, 22], [22, 12], [29, 19]], '#6a6a76'); pl(g, [[39, 22], [42, 12], [35, 19]], '#6a6a76');
      el(g, 29, 25, 1.6, 1.6, '#1a1a1e'); el(g, 35, 25, 1.6, 1.6, '#1a1a1e'); pl(g, [[28, 31], [36, 31], [34, 36], [30, 36]], '#2a2a30');
      bx(g, 27, 44, 4, 4, '#80808c'); bx(g, 33, 44, 4, 4, '#80808c');
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 22); g.lineTo(14, 36); g.moveTo(54, 22); g.lineTo(50, 36); g.stroke(); moss(g, 16, 46, 32, 12, 5); } },
    { n: 'bust', sc: 0.8, solid: true, hp: 60, mat: 'stone', w: 1.5, draw: g => {
      bx(g, 20, 52, 24, 6, '#9a9aa6', '#c8c8d2'); bx(g, 24, 28, 16, 24, '#aaaab6', '#d4d4de'); bx(g, 22, 26, 20, 3, '#b8b8c4', '#e0e0ea');
      pl(g, [[22, 26], [42, 26], [40, 20], [24, 20]], '#c0c0cc'); bx(g, 29, 14, 6, 7, '#c8c8d4'); el(g, 32, 10, 6, 7.5, '#d0d0dc');
      pl(g, [[26, 8], [32, 2], [38, 8], [36, 6], [28, 6]], '#a8a8b4'); el(g, 29.5, 10, 1, 1.2, '#7a7a86'); el(g, 34.5, 10, 1, 1.2, '#7a7a86'); bx(g, 31.4, 11, 1.2, 4, '#b8b8c4');
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, 30); g.lineTo(30, 40); g.lineTo(27, 48); g.stroke(); moss(g, 20, 44, 24, 14, 4); } },
    { n: 'harp', sc: 0.9, solid: true, hp: 50, mat: 'wood', w: 1.2, draw: g => {
      bx(g, 17, 12, 4, 46, '#a88828', '#d8b840'); bx(g, 13, 54, 38, 4, '#7a5a20', '#b89838');
      g.strokeStyle = '#b89838'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(18, 12); g.quadraticCurveTo(32, 0, 46, 16); g.lineTo(42, 54); g.stroke();
      g.strokeStyle = 'rgba(230,220,190,.85)'; g.lineWidth = 0.6;
      for (let i = 0; i < 9; i++) { const x = 23 + i * 2.5; g.beginPath(); g.moveTo(x, 9 + Math.abs(x - 32) * 0.45 + i * 0.5); g.lineTo(x, 56 - (x - 23) * 0.4); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(33, 18); g.lineTo(33, 40); g.stroke(); } },
    { n: 'casks', sc: 0.7, solid: true, hp: 60, mat: 'wood', w: 1.5, draw: g => {
      bx(g, 6, 56, 52, 2.4, '#2e1c10');
      for (const [cx, cy] of [[20, 44], [44, 44], [32, 22]]) {
        bx(g, cx - 12, cy - 11, 24, 22, '#5a3a1c', '#8a5a30'); el(g, cx, cy - 11, 12, 3, '#7a5028'); el(g, cx, cy + 11, 12, 3, '#4a2c12');
        bx(g, cx - 12, cy - 6, 24, 1.6, '#26262a'); bx(g, cx - 12, cy + 4, 24, 1.6, '#26262a'); bx(g, cx - 1, cy, 2, 5, '#b89838');
      }
      g.fillStyle = 'rgba(110,20,30,.55)'; g.fillRect(19, 49, 2, 7); g.fillRect(43, 49, 2, 6); } },
    { n: 'sarcophagus', sc: 0.7, solid: true, hp: 110, mat: 'stone', w: 1.2, draw: g => {
      bx(g, 8, 34, 48, 22, '#6a6a72', '#9a9aa6'); pl(g, [[6, 34], [58, 34], [54, 26], [10, 26]], '#8a8a96'); g.fillStyle = '#0e0e12'; g.fillRect(40, 33, 16, 2);
      bx(g, 30, 38, 4, 14, '#4a4a54'); bx(g, 25, 42, 14, 3, '#4a4a54'); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(14, 36); g.lineTo(18, 46); g.lineTo(15, 54); g.stroke();
      moss(g, 8, 40, 48, 16, 6); } },
    { n: 'mirror', sc: 0.95, solid: true, hp: 25, mat: 'glass', w: 1.2, draw: g => {
      pl(g, [[18, 58], [22, 52], [42, 52], [46, 58]], '#3a2c14'); bx(g, 16, 6, 32, 48, '#a88a28', '#d8b840'); bx(g, 20, 10, 24, 40, '#4a5a6a');
      g.fillStyle = 'rgba(190,220,235,.35)'; pl(g, [[20, 10], [32, 10], [20, 30]], 'rgba(190,220,235,.35)');
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(34, 24); g.lineTo(26, 14); g.moveTo(34, 24); g.lineTo(42, 18); g.moveTo(34, 24); g.lineTo(38, 38); g.moveTo(34, 24); g.lineTo(24, 34); g.stroke();
      pl(g, [[38, 38], [44, 38], [44, 50], [40, 46]], '#12161a'); el(g, 32, 5, 5, 4, '#c8a830'); } },
    { n: 'table', sc: 0.6, solid: true, hp: 55, mat: 'wood', w: 1.5, draw: g => {
      bx(g, 6, 32, 52, 5, '#4a2e18', '#7a4e2a'); bx(g, 10, 37, 5, 21, '#3a2412'); bx(g, 49, 37, 5, 21, '#3a2412'); bx(g, 6, 37, 52, 2, '#2e1c10');
      el(g, 16, 31, 5, 1.4, '#e0d8c0'); bx(g, 30.4, 20, 3, 11, '#b89838'); bx(g, 29.5, 18, 5, 2.4, '#d8d0b8'); bx(g, 31.4, 12, 1.6, 6, '#e8e0c8'); el(g, 32.2, 11, 1.1, 2, '#ff9a20');
      bx(g, 44, 25, 1.4, 6, '#b89838'); pl(g, [[41, 20], [48, 20], [45, 25], [44, 25]], '#b89838'); el(g, 51, 29, 3.2, 3.2, '#e0d8c0'); } },
    { n: 'globe', sc: 0.6, solid: true, hp: 40, mat: 'wood', w: 1, draw: g => {
      bx(g, 22, 54, 20, 4, '#3a2412', '#5a3820'); bx(g, 30.5, 34, 3, 20, '#4a2e18'); el(g, 32, 24, 14, 14, '#2e4a5a');
      g.save(); g.beginPath(); g.arc(32, 24, 14, 0, 7); g.clip(); pl(g, [[22, 16], [32, 14], [38, 22], [30, 28], [24, 26]], '#7a6a3a'); pl(g, [[36, 28], [44, 30], [42, 38], [36, 36]], '#6a5a2e'); g.restore();
      g.strokeStyle = '#b89838'; g.lineWidth = 1.4; g.beginPath(); g.arc(32, 24, 16.5, 0, 7); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.ellipse(32, 24, 14, 3.5, 0, 0, 7); g.stroke(); } },
    { n: 'armchair', sc: 0.6, solid: true, hp: 50, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[16, 10], [48, 10], [50, 34], [14, 34]], '#4a1a22'); pl(g, [[20, 14], [44, 14], [45, 32], [19, 32]], '#6a2230'); bx(g, 12, 32, 40, 14, '#4a1a22', '#7a2a3a'); bx(g, 20, 34, 24, 8, '#6a2230');
      bx(g, 8, 26, 9, 22, '#4a1a22', '#6a2230'); bx(g, 47, 26, 9, 22, '#4a1a22', '#6a2230'); bx(g, 14, 46, 4, 12, '#2a1810'); bx(g, 46, 46, 4, 12, '#2a1810');
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, 16); g.lineTo(32, 26); g.lineTo(28, 32); g.stroke(); el(g, 34, 22, 2.8, 1.8, '#c8c0a0');
      g.fillStyle = '#c8a020'; for (const [x, y] of [[26, 20], [32, 18], [38, 20], [26, 28], [38, 28]]) { g.beginPath(); g.arc(x, y, 0.9, 0, 7); g.fill(); } } },
    { n: 'chess', sc: 0.55, solid: true, hp: 40, mat: 'wood', w: 1, draw: g => {
      bx(g, 29, 34, 6, 22, '#3a2412'); bx(g, 20, 54, 24, 4, '#3a2412');
      g.save(); g.translate(32, 31); g.transform(1, 0, 0, 0.3, 0, 0); g.fillStyle = '#4a2e18'; g.fillRect(-21, -21, 42, 42);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? '#d8d0b8' : '#2a1c10'; g.fillRect(-18 + c * 6, -18 + r * 6, 6, 6); }
      g.restore();
      bx(g, 24, 22, 2.4, 6, '#d8d0b8'); el(g, 25.2, 21, 1.8, 1.8, '#d8d0b8'); bx(g, 36, 21, 2.6, 7, '#2a1c10'); el(g, 37.3, 20, 2, 2, '#2a1c10'); bx(g, 42, 25, 2.4, 4, '#d8d0b8');
      pl(g, [[28, 33], [33, 31], [34, 33], [29, 35]], '#2a1c10'); } },
    { n: 'rug', sc: 0.6, solid: false, hp: 20, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[12, 47], [52, 47], [60, 58], [4, 58]], '#6a1820'); pl(g, [[16, 49], [48, 49], [54, 56], [10, 56]], '#4a1018');
      g.strokeStyle = '#c8a020'; g.lineWidth = 1; g.beginPath(); g.moveTo(15, 48.5); g.lineTo(49, 48.5); g.lineTo(55, 56.5); g.lineTo(9, 56.5); g.closePath(); g.stroke();
      pl(g, [[32, 50], [40, 53], [32, 56], [24, 53]], '#c8a020'); pl(g, [[32, 51.5], [36, 53], [32, 54.5], [28, 53]], '#6a1820');
      g.strokeStyle = '#d8c890'; g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < 12; i++) { g.moveTo(5 + i * 4.7, 58); g.lineTo(5 + i * 4.7, 59.2); } g.stroke();
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(46, 54, 5, 1.6, 0, 0, 7); g.fill(); } },
    { n: 'books', sc: 0.4, solid: false, hp: 20, mat: 'wood', w: 1.5, draw: g => {
      bx(g, 10, 50, 22, 7, '#5a2a1c', '#8a4a2c'); bx(g, 12, 43, 18, 7, '#1c3a5a', '#2c5a8a'); bx(g, 34, 52, 20, 6, '#3a5a2a', '#5a8a42');
      bx(g, 12, 51.5, 20, 1.2, '#d8d0b0'); bx(g, 14, 44.5, 16, 1.2, '#d8d0b0'); bx(g, 36, 53.5, 18, 1.2, '#d8d0b0');
      bx(g, 17, 46, 8, 1, '#c8a020'); bx(g, 16, 53, 10, 1, '#c8a020');
      pl(g, [[40, 51], [52, 45], [58, 49], [46, 52]], '#6a4a1c'); pl(g, [[22, 58], [30, 56], [33, 59], [24, 60]], '#e8e0c8'); pl(g, [[2, 56], [9, 54], [11, 58], [4, 59]], '#e0d8bc'); } },
    { n: 'helm', sc: 0.4, solid: false, hp: 20, mat: 'rust', w: 1.5, draw: g => {
      bx(g, 14, 50, 20, 7, '#7a7e86', '#a8acb4'); el(g, 24, 50, 10, 6.5, '#7a7e86'); el(g, 24, 57, 10, 2, '#3a3e44'); bx(g, 16, 51, 16, 1.6, '#14161a');
      pl(g, [[32, 46], [42, 44], [45, 49], [34, 51]], '#7a1820');
      pl(g, [[40, 54], [54, 52], [57, 56], [42, 58]], '#8a8e96'); g.strokeStyle = '#4a4e56'; g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(54 - i * 0.5, 52.4 + i * 1.3); g.lineTo(57, 53 + i * 1.3); } g.stroke();
      rust(g, 12, 44, 46, 14, 12); } }
  ],
  [ // 3 swamp
    { n: 'stump', sc: 0.6, solid: true, hp: 50, mat: 'wood', w: 3, draw: g => { pl(g, [[16, 58], [20, 38], [18, 30], [26, 26], [32, 30], [38, 25], [46, 30], [44, 40], [48, 58]], '#4a3a28'); bx(g, 20, 30, 24, 28, '#4a3a28', '#6a5238'); el(g, 32, 29, 13, 4, '#7a6040'); g.strokeStyle = 'rgba(40,28,16,.7)'; g.lineWidth = 1; g.beginPath(); g.ellipse(32, 29, 9, 2.6, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(32, 29, 4, 1.3, 0, 0, 7); g.stroke(); moss(g, 18, 34, 28, 22, 6); g.strokeStyle = '#3a2c1c'; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 56); g.quadraticCurveTo(10, 56, 8, 58); g.moveTo(48, 56); g.quadraticCurveTo(54, 56, 56, 58); g.stroke(); } },
    { n: 'rocks', sc: 0.6, solid: true, hp: 100, mat: 'stone', w: 3, draw: g => { pl(g, [[12, 58], [14, 40], [22, 28], [34, 24], [46, 32], [52, 46], [50, 58]], '#6a7068'); pl(g, [[22, 30], [34, 26], [40, 30], [30, 38]], '#8a9088'); moss(g, 16, 28, 34, 28, 9); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(30, 36); g.lineTo(34, 48); g.lineTo(30, 56); g.stroke(); } },
    { n: 'reeds', sc: 0.6, solid: false, hp: 15, mat: 'wood', w: 3, draw: g => { for (let i = 0; i < 16; i++) { const x = 16 + i * 2.2 + rnd() * 2, h = 24 + rnd() * 26, bend = (rnd() - 0.5) * 8; g.strokeStyle = i % 3 ? '#5a7a3a' : '#7a8a46'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, 58); g.quadraticCurveTo(x + bend * 0.3, 58 - h * 0.5, x + bend, 58 - h); g.stroke(); if (i % 4 === 0) { g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(x + bend, 58 - h - 3, 1.6, 4, 0, 0, 7); g.fill(); } } } },
    { n: 'mushrooms', sc: 0.5, solid: false, hp: 20, mat: 'wood', w: 2, draw: g => { for (const [x, y, r, c] of [[20, 56, 8, '#8a3a6a'], [34, 58, 11, '#a04a3a'], [46, 55, 7, '#6a4a8a']]) { bx(g, x - 2, y - r * 0.9, 4, r * 0.9, '#d8d0b0'); g.fillStyle = c; g.beginPath(); g.ellipse(x, y - r * 0.9, r, r * 0.65, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,240,200,.7)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - r * 0.6 + i * r * 0.4, y - r * 1.2 - (i % 2) * 2, 1.2, 0, 7); g.fill(); } const gl = g.createRadialGradient(x, y - r, 1, x, y - r, r * 2); gl.addColorStop(0, 'rgba(160,255,160,.25)'); gl.addColorStop(1, 'rgba(160,255,160,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(x - r * 2, y - r * 3, r * 4, r * 4); g.globalCompositeOperation = 'source-over'; } } },
    { n: 'boat', sc: 0.7, solid: true, hp: 60, mat: 'wood', w: 1, draw: g => { pl(g, [[6, 36], [58, 36], [50, 56], [16, 56]], '#5a3c22'); pl(g, [[6, 36], [58, 36], [56, 40], [8, 40]], '#7a5230'); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10 + i * 3, 42 + i * 3.5); g.lineTo(54 - i * 3, 42 + i * 3.5); g.stroke(); } bx(g, 28, 28, 3, 8, '#4a3220'); bx(g, 20, 20, 24, 3, '#6a4a2a'); g.strokeStyle = '#3a2c1c'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 34); g.lineTo(52, 12); g.stroke(); moss(g, 8, 38, 48, 16, 6); } },
    { n: 'cauldron', sc: 0.6, solid: true, hp: 60, mat: 'metal', w: 1, draw: g => { for (const x of [18, 32, 46]) pl(g, [[x - 3, 58], [x, 50], [x + 3, 58]], '#6a6a62'); el(g, 32, 52, 18, 4, '#ff7a20'); pl(g, [[14, 30], [50, 30], [54, 44], [46, 54], [18, 54], [10, 44]], '#26282c'); bx(g, 12, 28, 40, 4, '#3a3d42', '#5a5e66'); el(g, 32, 30, 19, 4, '#3a8a3a'); el(g, 32, 30, 15, 2.6, '#7aff7a'); for (const [x, y] of [[26, 28], [36, 27], [31, 25]]) { g.strokeStyle = 'rgba(180,255,180,.8)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(18, 33, 3, 18); } },
    { n: 'ribs', sc: 0.35, solid: false, hp: 15, mat: 'bone', w: 2, draw: g => { el(g, 32, 56, 20, 4, 'rgba(30,50,20,.6)'); g.strokeStyle = '#d8d0b8'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, 52); g.lineTo(52, 52); g.stroke(); for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(18 + i * 6, 52, 3.5, 8 - Math.abs(i - 2.5), 0, Math.PI, 0); g.stroke(); } el(g, 56, 52, 4, 3.5, '#e0d8c0'); } },
    { n: 'deadTree', sc: 1.0, solid: true, hp: 90, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[26, 58], [29, 36], [28, 20], [31, 8], [34, 20], [35, 36], [40, 58]], '#3a2e22');
      g.strokeStyle = '#3a2e22'; g.lineCap = 'round';
      for (const [x1, y1, cx, cy, x2, y2, w] of [[29, 28, 20, 22, 12, 10, 3], [33, 22, 42, 16, 52, 6, 2.6], [30, 38, 22, 36, 10, 34, 2.4], [34, 34, 44, 32, 54, 28, 2.4], [31, 14, 28, 8, 24, 3, 1.8]]) { g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.stroke(); }
      g.strokeStyle = 'rgba(110,140,90,.7)'; g.lineWidth = 1.2;
      for (const [x, y, l] of [[18, 20, 12], [14, 14, 9], [46, 14, 11], [52, 30, 10], [14, 34, 12]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1.5, y + l / 2, x - 1, y + l); g.stroke(); }
      el(g, 31, 44, 2, 3, '#120c08'); moss(g, 24, 40, 18, 18, 6); } },
    { n: 'log', sc: 0.45, solid: false, hp: 40, mat: 'wood', w: 1.5, draw: g => {
      bx(g, 8, 42, 48, 14, '#4a3a28', '#6a5238'); el(g, 56, 49, 4, 7, '#7a6040'); el(g, 56, 49, 2, 3.8, '#5a4228'); el(g, 8, 49, 4, 7, '#3a2c1c');
      g.strokeStyle = 'rgba(30,20,10,.5)'; g.lineWidth = 1; for (const y of [45, 49, 53]) { g.beginPath(); g.moveTo(10, y); g.lineTo(54, y); g.stroke(); }
      moss(g, 10, 40, 44, 8, 8); for (const [x, y] of [[24, 42], [40, 43]]) { el(g, x, y, 5, 2.4, '#b8a070'); el(g, x, y + 1, 4, 1.4, '#8a7048'); } } },
    { n: 'tombstone', sc: 0.65, solid: true, hp: 80, mat: 'stone', w: 1.5, draw: g => {
      el(g, 32, 57, 27, 3, '#3a3a24');
      g.save(); g.translate(24, 58); g.rotate(-0.1); pl(g, [[-10, 0], [-10, -26], [-6, -32], [6, -32], [10, -26], [10, 0]], '#7a8078'); bx(g, -1.2, -26, 2.4, 14, '#4a5048'); bx(g, -5, -22, 10, 2.4, '#4a5048'); g.restore();
      g.save(); g.translate(46, 58); g.rotate(0.12); bx(g, -2, -28, 4, 28, '#6a7068', '#8a9088'); bx(g, -8, -22, 16, 4, '#6a7068', '#8a9088'); g.restore();
      moss(g, 12, 30, 40, 26, 9); } },
    { n: 'scarecrow', sc: 0.85, solid: true, hp: 40, mat: 'wood', w: 1.2, draw: g => {
      bx(g, 30.5, 18, 3, 40, '#4a3a28'); bx(g, 10, 24, 44, 3, '#4a3a28');
      pl(g, [[22, 24], [42, 24], [40, 44], [34, 40], [32, 48], [29, 40], [24, 44]], '#4e4638');
      g.fillStyle = '#6a5a3a'; for (let i = 0; i < 7; i++) g.fillRect(12 + i * 6.5, 26, 1.2, 6 + (i % 3) * 3);
      el(g, 32, 14, 7, 7.5, '#8a7a50'); pl(g, [[22, 10], [32, 0], [42, 10]], '#3a2e20'); bx(g, 20, 9, 24, 2, '#3a2e20'); el(g, 29.5, 14, 1.4, 1.4, '#14100a'); el(g, 34.5, 14, 1.4, 1.4, '#14100a'); bx(g, 29, 18, 6, 1, '#14100a');
      el(g, 49, 22, 4, 2.8, '#16161c'); el(g, 53, 20, 2, 2, '#16161c'); pl(g, [[54.6, 20], [58, 21], [54.6, 21.8]], '#8a7a40'); } },
    { n: 'nets', sc: 0.8, solid: true, hp: 50, mat: 'wood', w: 1.5, draw: g => {
      bx(g, 10, 8, 3, 50, '#4a3a28'); bx(g, 51, 8, 3, 50, '#4a3a28'); bx(g, 10, 8, 44, 2.6, '#5a4630');
      g.strokeStyle = 'rgba(190,175,130,.75)'; g.lineWidth = 0.7; g.beginPath();
      for (let i = 0; i <= 10; i++) { const x = 13 + i * 3.8; g.moveTo(x, 11); g.quadraticCurveTo(x + (i % 3 - 1) * 2, 26, x + (i % 2) * 2 - 1, 38 + (i % 4) * 3); }
      for (let j = 0; j < 7; j++) { const y = 14 + j * 5; g.moveTo(13, y + (j % 2)); g.quadraticCurveTo(32, y + 6, 51, y + (j % 2)); }
      g.stroke(); pl(g, [[22, 34], [30, 38], [22, 42]], 'rgba(120,130,110,.8)'); for (const [x, y] of [[40, 46], [46, 38]]) el(g, x, y, 1.6, 2.6, '#8a8a7a'); moss(g, 10, 40, 44, 18, 4); } },
    { n: 'trap', sc: 0.45, solid: false, hp: 30, mat: 'wood', w: 1.5, draw: g => {
      pl(g, [[14, 54], [20, 30], [44, 30], [50, 54]], '#7a5e32'); g.strokeStyle = '#4a3a1c'; g.lineWidth = 1;
      for (const y of [35, 41, 47, 53]) { const k = (y - 30) / 24 * 6; g.beginPath(); g.moveTo(20 - k, y); g.lineTo(44 + k, y); g.stroke(); }
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(21 + i * 4.4, 30); g.lineTo(15 + i * 6.2, 54); g.stroke(); }
      el(g, 32, 30, 12, 3.5, '#2a1c0c'); g.strokeStyle = '#6a5a3a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(26, 52); g.quadraticCurveTo(14, 56, 10, 50); g.stroke(); moss(g, 14, 44, 36, 12, 4); } },
    { n: 'totem', sc: 0.95, solid: true, hp: 80, mat: 'wood', w: 1.2, draw: g => {
      bx(g, 22, 4, 20, 54, '#4a3420', '#6a4c2e');
      for (const [y, c] of [[6, '#8a3a2a'], [24, '#2a5a4a'], [42, '#8a6a2a']]) {
        bx(g, 22, y, 20, 14, '#5a4028'); el(g, 28, y + 5, 2.2, 2.2, '#f0e8c8'); el(g, 36, y + 5, 2.2, 2.2, '#f0e8c8'); el(g, 28, y + 5, 1, 1, '#14100a'); el(g, 36, y + 5, 1, 1, '#14100a');
        bx(g, 27, y + 9, 10, 2.4, c); bx(g, 24, y + 1, 16, 2, c);
      }
      pl(g, [[22, 22], [12, 18], [14, 28], [22, 28]], '#2a5a4a'); pl(g, [[42, 22], [52, 18], [50, 28], [42, 28]], '#2a5a4a'); moss(g, 20, 40, 24, 18, 6); } },
    { n: 'cart', sc: 0.7, solid: true, hp: 60, mat: 'wood', w: 1, draw: g => {
      pl(g, [[8, 38], [56, 34], [54, 48], [10, 50]], '#4a3622'); bx(g, 10, 40, 44, 2, '#2e2012'); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; for (const x of [20, 32, 44]) { g.beginPath(); g.moveTo(x, 36); g.lineTo(x, 49); g.stroke(); }
      g.save(); g.translate(54, 42); g.rotate(-0.4); bx(g, 0, -1.5, 12, 3, '#3a2a18'); g.restore();
      g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.arc(22, 50, 9, 0, 7); g.stroke(); g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 8; i++) { g.moveTo(22, 50); g.lineTo(22 + Math.cos(i * 0.785) * 9, 50 + Math.sin(i * 0.785) * 9); } g.stroke(); el(g, 22, 50, 2, 2, '#5a4a30');
      g.lineWidth = 2; g.beginPath(); g.arc(46, 53, 6.5, 3.5, 8.6); g.stroke(); g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 5; i++) { g.moveTo(46, 53); g.lineTo(46 + Math.cos(3.8 + i * 0.9) * 6.5, 53 + Math.sin(3.8 + i * 0.9) * 6.5); } g.stroke();
      moss(g, 8, 34, 48, 22, 8); } },
    { n: 'rotbarrel', sc: 0.6, solid: true, hp: 40, mat: 'wood', w: 1, draw: g => {
      bx(g, 18, 26, 28, 30, '#3a2c1c', '#5e4630'); el(g, 32, 26, 14, 4, '#4a3622'); el(g, 32, 56, 14, 4, '#2e2012');
      g.fillStyle = '#0e0a06'; g.fillRect(24, 34, 4, 14); g.fillRect(38, 40, 3, 12);
      bx(g, 18, 33, 28, 2, '#26262a'); pl(g, [[18, 46], [30, 46], [30, 50], [18, 49]], '#3a3a3a'); moss(g, 18, 26, 28, 30, 12); g.fillStyle = 'rgba(60,120,50,.45)'; g.fillRect(40, 30, 2, 24); } },
    { n: 'cage', sc: 0.85, solid: true, hp: 60, mat: 'rust', w: 1, draw: g => {
      bx(g, 14, 4, 4, 54, '#3a2c1c', '#5a4630'); bx(g, 14, 4, 34, 2.6, '#4a3822'); bx(g, 10, 56, 12, 2.4, '#2e2012');
      g.strokeStyle = '#6a6a62'; g.lineWidth = 1; g.beginPath(); g.moveTo(36, 6); g.lineTo(36, 15); g.stroke(); for (let y = 7; y < 15; y += 2.4) el(g, 36, y, 1, 1.2, '#6a6a62');
      pl(g, [[27, 16], [45, 16], [49, 46], [23, 46]], 'rgba(0,0,0,.4)');
      g.strokeStyle = '#6a5a48'; g.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { const xt = 36 + (i - 2) * 4.2, xb = 36 + (i - 2) * 6.4; g.beginPath(); g.moveTo(xt, 16); g.quadraticCurveTo(xb + (i - 2) * 1.6, 31, xb, 46); g.stroke(); }
      for (const y of [16, 31, 46]) { g.beginPath(); g.ellipse(36, y, 9 + (y - 16) * 0.12 + (y === 31 ? 2 : 0), 1.6, 0, 0, 7); g.stroke(); }
      el(g, 36, 40, 4, 4.4, '#d8d0b8'); el(g, 34.4, 39.6, 1, 1.2, '#14100a'); el(g, 37.6, 39.6, 1, 1.2, '#14100a'); bx(g, 30, 44, 12, 1.6, '#cfc7ae');
      rust(g, 12, 4, 40, 54, 22); moss(g, 14, 40, 8, 18, 3); } },
    { n: 'fern', sc: 0.5, solid: false, hp: 15, mat: 'wood', w: 1.5, draw: g => {
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a = -2.65 + i * 0.26, L = 24 + (i % 3) * 6, ex = 32 + Math.cos(a) * L, ey = 58 + Math.sin(a) * L * 0.9, cx = 32 + Math.cos(a) * L * 0.4, cy = 58 + Math.sin(a) * L * 1.1 - 4;
        g.strokeStyle = '#3e6a30'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(32, 58); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
        for (let t = 0.25; t < 1; t += 0.1) { const u = 1 - t, px = u * u * 32 + 2 * u * t * cx + t * t * ex, py = u * u * 58 + 2 * u * t * cy + t * t * ey; g.fillStyle = i % 2 ? '#4e8a3a' : '#5e9a44'; g.beginPath(); g.ellipse(px, py, 3.2 * (1.1 - t), 1.2, a + 1.2, 0, 7); g.fill(); }
      } } }
  ],
  [ // 4 toxic factory
    { n: 'toxicBarrel', sc: 0.6, solid: true, hp: 55, mat: 'metal', w: 3, draw: g => { bx(g, 18, 22, 28, 34, '#b8a020', '#e8d030'); el(g, 32, 22, 14, 4, '#d8c028'); el(g, 32, 56, 14, 4, '#7a6a10'); bx(g, 18, 30, 28, 2, '#6a5a10'); bx(g, 18, 46, 28, 2, '#6a5a10'); g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.8; for (let k = 0; k < 3; k++) { const a = k * 2.094 - 1.57; g.beginPath(); g.arc(32 + Math.cos(a) * 4, 38 + Math.sin(a) * 4, 3.2, 0, 7); g.stroke(); } el(g, 32, 38, 1.3, 1.3, '#1a1a1a'); g.fillStyle = 'rgba(60,255,60,.8)'; g.fillRect(40, 30, 3, 26); el(g, 41.5, 57, 8, 2.4, 'rgba(60,255,60,.7)'); rust(g, 18, 22, 28, 34, 12); } },
    { n: 'pipes', sc: 0.6, solid: true, hp: 80, mat: 'metal', w: 2, draw: g => { for (const [y, c] of [[46, '#7a8088'], [38, '#8a9098'], [30, '#6a7078']]) { const gr = g.createLinearGradient(0, y - 6, 0, y + 6); gr.addColorStop(0, '#d0d4d8'); gr.addColorStop(0.5, c); gr.addColorStop(1, '#3a3f46'); g.fillStyle = gr; g.fillRect(10, y - 6, 44, 12); el(g, 10, y, 3, 6, '#2a2d33'); el(g, 54, y, 3, 6, '#2a2d33'); } bx(g, 12, 24, 3, 28, '#3a3f46'); bx(g, 49, 24, 3, 28, '#3a3f46'); rust(g, 10, 24, 44, 34, 20); g.fillStyle = 'rgba(70,200,50,.45)'; g.fillRect(30, 42, 3, 14); } },
    { n: 'console', sc: 0.7, solid: true, hp: 70, mat: 'metal', w: 2, draw: g => { pl(g, [[10, 58], [10, 34], [54, 34], [54, 58]], '#4a5058'); pl(g, [[10, 34], [18, 20], [46, 20], [54, 34]], '#5a6068'); bx(g, 20, 23, 24, 9, '#0e1a14'); g.fillStyle = 'rgba(80,255,120,.35)'; for (let i = 0; i < 4; i++) g.fillRect(22, 24.5 + i * 2, 10 + (i * 5) % 12, 1); for (let i = 0; i < 6; i++) { g.fillStyle = ['#d03030', '#30d060', '#d0b020'][i % 3]; g.beginPath(); g.arc(16 + i * 6.4, 40, 1.6, 0, 7); g.fill(); } bx(g, 14, 46, 36, 8, '#2a2e34'); bx(g, 40, 48, 8, 4, '#8a2020'); g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(26, 24); g.lineTo(34, 31); g.stroke(); rust(g, 10, 34, 44, 24, 14); } },
    { n: 'tank', sc: 0.9, solid: true, hp: 90, mat: 'metal', w: 1, draw: g => { bx(g, 19, 14, 26, 44, '#7a8088', '#c8ccd2'); el(g, 32, 14, 13, 5, '#aab0b8'); el(g, 32, 58, 13, 3.5, '#4a4f56'); bx(g, 19, 30, 26, 4, '#d8b020'); bx(g, 19, 44, 26, 4, '#d8b020'); bx(g, 28, 6, 8, 8, '#4a4f56'); bx(g, 30, 3, 4, 4, '#a02020'); g.strokeStyle = '#3a3f46'; g.lineWidth = 2; g.beginPath(); g.moveTo(45, 24); g.lineTo(54, 24); g.lineTo(54, 56); g.stroke(); rust(g, 19, 14, 26, 44, 18); g.fillStyle = 'rgba(70,200,50,.5)'; g.fillRect(24, 36, 2, 16); } },
    { n: 'pallet', sc: 0.6, solid: true, hp: 50, mat: 'wood', w: 2, draw: g => { bx(g, 8, 52, 48, 4, '#6a4a28', '#8a6438'); for (const x of [10, 28, 48]) bx(g, x, 56, 6, 3, '#5a3c20'); for (const [x, y] of [[10, 38], [30, 38], [20, 26], [40, 28]]) { pl(g, [[x, y + 14], [x + 2, y], [x + 18, y], [x + 20, y + 14]], '#a08a5a'); g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 10, y + 1); g.lineTo(x + 10, y + 13); g.stroke(); } el(g, 46, 54, 5, 1.8, 'rgba(70,200,50,.5)'); } },
    { n: 'reel', sc: 0.6, solid: true, hp: 50, mat: 'wood', w: 2, draw: g => { g.fillStyle = '#6a4a2a'; g.beginPath(); g.ellipse(32, 48, 20, 7, 0, 0, 7); g.fill(); bx(g, 12, 20, 40, 28, '#8a6a3a', '#b8905a'); el(g, 32, 20, 20, 7, '#9a7a46'); el(g, 32, 20, 6, 2.4, '#2a1c0c'); g.strokeStyle = 'rgba(20,20,24,.9)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(32, 26 + i * 4, 15, 4.5, 0, 0, Math.PI); g.stroke(); } } },
    { n: 'scrap', sc: 0.4, solid: false, hp: 25, mat: 'metal', w: 2, draw: g => { el(g, 32, 54, 24, 6, '#2e2e30'); for (let i = 0; i < 9; i++) { const x = 14 + rnd() * 34, y = 42 + rnd() * 14, k = i % 3; if (k === 0) pl(g, [[x, y], [x + 9, y - 4], [x + 11, y + 3], [x + 2, y + 5]], ['#6a6e76', '#8a5a38', '#4a4e56'][i % 3]); else if (k === 1) { el(g, x + 4, y, 4.5, 4.5, '#7a7e86'); el(g, x + 4, y, 1.8, 1.8, '#26262a'); } else bx(g, x, y - 6, 3, 10, '#5a5e66', '#8a8e96'); } rust(g, 12, 40, 40, 16, 16); } },
    { n: 'forklift', sc: 0.9, solid: true, hp: 100, mat: 'metal', w: 1.2, draw: g => {
      bx(g, 8, 10, 4, 48, '#3a3e44', '#5a5e66'); bx(g, 14, 10, 3, 48, '#3a3e44', '#5a5e66'); bx(g, 8, 10, 9, 3, '#4a4e56'); bx(g, 6, 54, 22, 3, '#6a6e76', '#9a9ea6');
      pl(g, [[22, 36], [56, 36], [58, 54], [20, 54]], '#c8a018'); bx(g, 20, 36, 38, 3, '#e0b820');
      bx(g, 44, 14, 3, 22, '#2a2e34'); bx(g, 28, 12, 22, 3, '#2a2e34'); bx(g, 28, 12, 3, 24, '#2a2e34'); bx(g, 32, 28, 12, 8, '#1a1c20');
      el(g, 48, 54, 7, 7, '#16161a'); el(g, 48, 54, 3, 3, '#6a6e76'); el(g, 26, 56, 4.5, 4.5, '#16161a');
      g.fillStyle = '#14140e'; for (let i = 0; i < 3; i++) pl(g, [[54, 40 + i * 4], [58, 42 + i * 4], [58, 44 + i * 4], [54, 42 + i * 4]], '#14140e');
      rust(g, 8, 10, 52, 48, 24); } },
    { n: 'cylinders', sc: 0.8, solid: true, hp: 70, mat: 'metal', w: 1.5, draw: g => {
      for (const [x, c1, c2] of [[16, '#8a2020', '#c84a4a'], [30, '#2a5a8a', '#4a8ac8'], [44, '#3a7a3a', '#5aa85a']]) {
        bx(g, x, 16, 12, 42, c1, c2); el(g, x + 6, 16, 6, 5, c2); bx(g, x + 3.5, 8, 5, 6, '#7a7e86'); bx(g, x + 2, 6, 8, 3, '#2a2e34'); bx(g, x, 30, 12, 1.6, 'rgba(255,255,255,.2)');
      }
      g.strokeStyle = '#3a3e44'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, 36); g.lineTo(58, 36); g.stroke(); rust(g, 14, 6, 46, 52, 18); } },
    { n: 'workbench', sc: 0.7, solid: true, hp: 60, mat: 'metal', w: 1.5, draw: g => {
      bx(g, 10, 6, 44, 22, '#6a5a3c', '#8a7550'); g.fillStyle = 'rgba(0,0,0,.28)'; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) g.fillRect(13 + c * 4.6, 9 + r * 7, 1, 1);
      bx(g, 16, 10, 1.6, 12, '#6a4a28'); bx(g, 13.5, 9, 7, 3, '#7a7e86'); bx(g, 26, 10, 2, 14, '#8a8e96'); el(g, 27, 10, 3, 3, '#8a8e96'); pl(g, [[34, 10], [44, 12], [44, 14], [34, 16]], '#8a8e96');
      bx(g, 6, 34, 52, 4, '#6a5a3c', '#9a8458'); bx(g, 8, 38, 4, 20, '#3a3e44'); bx(g, 52, 38, 4, 20, '#3a3e44'); bx(g, 12, 46, 40, 2, '#3a3e44');
      bx(g, 42, 28, 8, 6, '#8a2020'); bx(g, 22, 28, 5, 6, '#c8c0a0'); el(g, 33, 33, 3, 1.4, '#8a8e96'); rust(g, 6, 6, 52, 52, 18); } },
    { n: 'breaker', sc: 0.85, solid: true, hp: 50, mat: 'metal', w: 1.5, draw: g => {
      bx(g, 30, 2, 3, 7, '#4a4e56'); bx(g, 16, 8, 32, 40, '#6a7078', '#9aa0a8'); bx(g, 19, 11, 26, 34, '#2a2e34');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { bx(g, 22 + c * 4.6, 15 + r * 9, 3, 5, (r + c) % 3 ? '#30c060' : '#c03a3a'); bx(g, 22 + c * 4.6, 21 + r * 9, 3, 1, '#c8c0a0'); }
      pl(g, [[16, 8], [8, 12], [8, 44], [16, 48]], '#5a6068'); bx(g, 20, 46, 24, 4, '#e0b820'); bx(g, 20, 50, 4, 8, '#3a3e44'); bx(g, 40, 50, 4, 8, '#3a3e44');
      g.strokeStyle = '#14141a'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 40); g.quadraticCurveTo(52, 46, 48, 58); g.stroke(); bx(g, 47, 40, 2, 2, '#ffe040'); bx(g, 50, 44, 1.6, 1.6, '#ffe040');
      rust(g, 8, 8, 40, 40, 16); } },
    { n: 'hazmat', sc: 0.85, solid: true, hp: 40, mat: 'wood', w: 1.2, draw: g => {
      bx(g, 20, 54, 24, 4, '#2a2e34', '#4a4e56'); bx(g, 30, 10, 4, 44, '#3a3e44');
      pl(g, [[20, 24], [44, 24], [42, 44], [22, 44]], '#d8b820'); pl(g, [[20, 24], [14, 28], [12, 44], [17, 44], [21, 32]], '#c8a818'); pl(g, [[44, 24], [50, 28], [52, 44], [47, 44], [43, 32]], '#c8a818');
      bx(g, 23, 44, 8, 12, '#c8a818'); bx(g, 33, 44, 8, 12, '#c8a818'); bx(g, 22, 55, 10, 3, '#2a2a2e'); bx(g, 32, 55, 10, 3, '#2a2a2e');
      el(g, 32, 14, 8, 9, '#d8b820'); el(g, 32, 14, 5, 5.5, '#14201a'); el(g, 30, 12.5, 1.4, 1.8, 'rgba(255,255,255,.5)'); el(g, 38, 22, 3, 3, '#3a3e44');
      g.strokeStyle = '#8a7010'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 22); g.lineTo(32, 44); g.stroke();
      g.fillStyle = 'rgba(70,200,50,.4)'; g.fillRect(24, 36, 6, 8); g.fillRect(44, 38, 3, 6); } },
    { n: 'drill', sc: 0.9, solid: true, hp: 90, mat: 'metal', w: 1.2, draw: g => {
      bx(g, 14, 52, 36, 6, '#3a5a4a', '#5a8a72'); bx(g, 22, 12, 6, 42, '#4a7060', '#6a9a84'); bx(g, 18, 6, 22, 12, '#4a7060', '#6a9a84'); bx(g, 38, 8, 6, 8, '#2a2e34');
      bx(g, 31.5, 22, 2.4, 14, '#9a9ea6'); bx(g, 30, 18, 5.4, 5, '#2a2e34'); bx(g, 26, 38, 22, 3, '#2a4a3a', '#4a7060');
      g.strokeStyle = '#2a2e34'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(24, 24); g.lineTo(12, 30); g.stroke(); el(g, 12, 30, 2.4, 2.4, '#c03a3a'); rust(g, 14, 6, 36, 52, 18); } },
    { n: 'generator', sc: 0.65, solid: true, hp: 80, mat: 'metal', w: 1.2, draw: g => {
      bx(g, 48, 10, 4, 16, '#4a4e56'); el(g, 50, 10, 3, 1.6, '#2a2e34'); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(50, 6, 5, 3, 0, 0, 7); g.fill();
      bx(g, 8, 28, 48, 26, '#c8a018', '#e8c030'); bx(g, 10, 24, 36, 4, '#3a3e44'); bx(g, 8, 52, 48, 4, '#2a2e34');
      for (let k = 0; k < 5; k++) bx(g, 12 + k * 4, 32, 2.4, 12, '#2a2210');
      bx(g, 38, 32, 14, 12, '#2a2e34'); el(g, 43, 36, 3, 3, '#e0e0d8'); g.strokeStyle = '#c03a3a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(43, 36); g.lineTo(45, 34); g.stroke(); bx(g, 47, 40, 3, 3, '#c03a3a');
      el(g, 14, 57, 3, 2.4, '#111'); el(g, 50, 57, 3, 2.4, '#111'); rust(g, 8, 24, 48, 32, 16); } },
    { n: 'signA', sc: 0.55, solid: false, hp: 25, mat: 'metal', w: 1.5, draw: g => {
      pl(g, [[18, 58], [26, 16], [38, 16], [46, 58]], '#e0c020'); g.strokeStyle = '#14140e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(18, 58); g.lineTo(26, 16); g.lineTo(38, 16); g.lineTo(46, 58); g.stroke();
      g.fillStyle = '#14140e'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(32, 34); g.arc(32, 34, 8, k * 2.094 + 0.3, k * 2.094 + 1.3); g.closePath(); g.fill(); } el(g, 32, 34, 1.8, 1.8, '#14140e');
      for (let k = 0; k < 4; k++) pl(g, [[22 + k * 6, 54], [26 + k * 6, 54], [28 + k * 6, 58], [24 + k * 6, 58]], '#14140e');
      rust(g, 18, 16, 28, 42, 14); } },
    { n: 'carboys', sc: 0.6, solid: true, hp: 30, mat: 'glass', w: 1.2, draw: g => {
      bx(g, 8, 44, 48, 14, '#6a5030', '#9a7a48'); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; for (const y of [48, 52]) { g.beginPath(); g.moveTo(8, y); g.lineTo(56, y); g.stroke(); }
      for (const [x, lvl] of [[16, 0.6], [32, 0.8], [48, 0.45]]) {
        pl(g, [[x - 3, 18], [x + 3, 18], [x + 8, 28], [x + 9, 44], [x - 9, 44], [x - 8, 28]], 'rgba(160,200,170,.35)');
        pl(g, [[x - 9, 44], [x + 9, 44], [x + 8.6, 44 - 16 * lvl], [x - 8.6, 44 - 16 * lvl]], 'rgba(80,255,70,.65)');
        bx(g, x - 2.6, 12, 5.2, 7, 'rgba(160,200,170,.5)'); bx(g, x - 3, 10, 6, 3, '#2a2e34'); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 6, 26, 1.6, 14);
      } } },
    { n: 'conveyor', sc: 0.6, solid: true, hp: 70, mat: 'metal', w: 1.2, draw: g => {
      bx(g, 14, 26, 12, 10, '#8a6a3a'); bx(g, 34, 30, 8, 6, '#6a6e76'); el(g, 48, 31, 5, 5, '#7a7e86'); el(g, 48, 31, 1.8, 1.8, '#26262a');
      bx(g, 6, 36, 52, 6, '#2a2e34', '#4a4e56'); g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 8; i++) g.fillRect(9 + i * 6, 36, 1.4, 6);
      bx(g, 6, 42, 52, 3, '#3a3e44'); for (let i = 0; i < 9; i++) el(g, 10 + i * 5.6, 47, 2, 2, '#6a6e76');
      for (const x of [10, 30, 50]) bx(g, x, 45, 4, 13, '#3a3e44'); rust(g, 6, 26, 52, 32, 16); } },
    { n: 'extinguisher', sc: 0.45, solid: false, hp: 20, mat: 'metal', w: 1.5, draw: g => {
      bx(g, 26, 22, 12, 34, '#b02020', '#e04a4a'); el(g, 32, 22, 6, 4, '#c83030'); bx(g, 29, 14, 6, 8, '#2a2e34'); bx(g, 24, 13, 12, 3, '#2a2e34');
      g.strokeStyle = '#2a2e34'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(37, 18); g.quadraticCurveTo(46, 20, 44, 34); g.stroke(); bx(g, 28, 32, 8, 8, '#e0d8c0'); rust(g, 26, 14, 12, 42, 8); } }
  ]
];

// Weighted pick that discourages repeats: each earlier use of a piece (floor-wide, and again within the same room) lowers its weight
function decoPick(f, cnt, here, cap) {
  const L = DECOR[f]; let tot = 0;
  const W = L.map((d, i) => { const n = (cnt && cnt[i]) || 0; const w = n >= (cap || 99) ? 0 : d.w * Math.pow(0.35, n) * Math.pow(0.12, (here && here[i]) || 0); tot += w; return w; });
  if (tot <= 0) return -1;
  let r = srand() * tot;
  for (let i = 0; i < L.length; i++) { r -= W[i]; if (r <= 0) return i; }
  return 0;
}

function makeExtras() {
  makeDecals(); makeDebris();
  for (let f = 0; f < 4; f++) flameFrames.push(flameArt(f));
  blobCanvas.width = blobCanvas.height = 64;
  let g = blobCanvas.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(235,255,240,.75)'); gr.addColorStop(0.35, 'rgba(70,255,130,.5)'); gr.addColorStop(1, 'rgba(20,200,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  shadowCanvas.width = shadowCanvas.height = 32;
  g = shadowCanvas.getContext('2d'); gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  radialSprite(plasmaImpactCanvas, [[0, '#ffffff'], [0.3, '#9dffb0'], [0.7, '#10b040'], [1, 'rgba(0,80,20,0)']]);
  drawThrown();
  ringCanvas.width = ringCanvas.height = 64; g = ringCanvas.getContext('2d'); g.strokeStyle = 'rgba(255,200,60,.9)'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(32, 32, 26, 12, 0, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.ellipse(32, 32, 14, 6, 0, 0, 7); g.stroke();
  crateArt = crateTex(); chestArt = chestTex(false); chestOpenArt = chestTex(true); xbarrelArt = xbarrelTex();
}

/* ======================================================================
   CASTEDDISH - Costruzione degli sprite dei mostri
   Genera e mette in cache tutti gli sprite dei nemici (fronte, retro,
   lato, litigi).
   ====================================================================== */

const styleOf = (k, v) => Object.assign({}, STY[k], VARS[k][v][2] || {}, { weapon: VARS[k][v][0], wopt: VARS[k][v][1] });
function extraSprites(k, v) {   // the view from behind and the cowering pose are only drawn the first time an enemy needs them
  const S = SPR[k][v];
  if (!S.flee) {
    const st = styleOf(k, v), add = (arr, mode, f) => { const c = mk(); c.width = c.height = DS; drawDemon(c.getContext('2d'), mode, f, st); arr.push(c); };
    S.flee = []; S.cower = [];
    for (let f = 0; f < 8; f++) add(S.flee, 'flee', f);
    for (let f = 0; f < 2; f++) add(S.cower, 'cower', f);
  }
  return S;
}
// Views used while two monsters fight each other: attacking seen from behind, and the two flanks (built the first time a fight needs them)
function duelSprites(k, v) {
  const S = SPR[k][v];
  if (!S.side) {
    const st = styleOf(k, v), mkc = (draw) => { const c = mk(); c.width = c.height = DS; const g = c.getContext('2d'); draw(g); return c; };
    const flip = (src) => { const c = mk(); c.width = c.height = DS; const g = c.getContext('2d'); g.translate(DS, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; };
    const lit = (c) => { finish(c.getContext('2d'), DS); return c; };
    S.battack = []; S.side = []; S.sideAtk = []; S.sideL = []; S.sideLAtk = [];
    for (let f = 0; f < 4; f++) S.battack.push(mkc(g => drawDemon(g, 'battack', f, st)));
    for (let f = 0; f < 8; f++) { S.side.push(lit(mkc(g => drawSide(g, 'swalk', f, st, false)))); S.sideL.push(lit(flip(mkc(g => drawSide(g, 'swalk', f, st, true))))); }
    for (let f = 0; f < 4; f++) { S.sideAtk.push(lit(mkc(g => drawSide(g, 'sattack', f, st, false)))); S.sideLAtk.push(lit(flip(mkc(g => drawSide(g, 'sattack', f, st, true))))); }
  }
  return S;
}
function duelFrame(e, S) {   // a monster fighting another one: the sprite of the side it turns to us
  const at = e.state === 'attack', v = e.view;
  if (v === 'front') return at ? S.attack[e.frame % 4] : S.walk[e.frame % 8];
  if (v === 'back' && !at) return extraSprites(e.type, e.v | 0).flee[e.frame % 8];
  const D = duelSprites(e.type, e.v | 0);
  if (v === 'back') return D.battack[e.frame % 4];
  if (v === 'sideR') return at ? D.sideAtk[e.frame % 4] : D.side[e.frame % 8];
  return at ? D.sideLAtk[e.frame % 4] : D.sideL[e.frame % 8];
}
function ensureSprites(types, keep) {
  if (!keep) for (const k of Object.keys(SPR)) if (!types.includes(k)) delete SPR[k];   // free the previous floor's sprites
  for (const k of types) {
    SPR[k] = SPR[k] || [];
    for (let v = 0; v < VARS[k].length; v++) {
      if (SPR[k][v]) continue;
      const S = SPR[k][v] = { walk: [], attack: [], die: [] }, st = styleOf(k, v);
      const add = (arr, mode, f) => { const c = mk(); c.width = c.height = DS; if (BOSSART[k]) BOSSART[k](c.getContext('2d'), mode, f); else drawDemon(c.getContext('2d'), mode, f, st); arr.push(c); };
      for (let f = 0; f < 8; f++) add(S.walk, 'walk', f);
      for (let f = 0; f < 4; f++) add(S.attack, 'attack', f);
      for (let f = 0; f < 5; f++) add(S.die, 'die', f);
    }
  }
}

function generateDemonSprites() {
  radialSprite(projectileCanvas, [[0, '#ffffff'], [0.3, '#ffff00'], [0.7, '#ff3300'], [1, 'rgba(255,0,0,0)']]);
  radialSprite(impactCanvas, [[0, '#ffffff'], [0.4, '#ffaa00'], [0.8, '#aa0000'], [1, 'rgba(0,0,0,0)']]);
  radialSprite(boltCanvas, [[0, '#ffffff'], [0.3, '#b6ff7a'], [0.7, '#1faa3a'], [1, 'rgba(0,80,0,0)']]);
  ['med', 'ammo', 'arm0', 'arm1', 'arm2', 'arm3', 1, 2, 3, 4, 5, 6, 7].forEach(k => { pickupIcons[k] = pickupIcon(k); });
  makeExtras();
  makeStairs(); makeFx();
  drawGuns();
  loadFloor(0);
}
