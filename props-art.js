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
