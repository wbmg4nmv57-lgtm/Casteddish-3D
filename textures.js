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
  if (kind === 'torch') { flame(32, 28, 8, 20 + h, P.fire[0], 0); flame(32, 28, 6, 15 + h, P.fire[1], j / 2); flame(32, 28, 3.5, 9 + h, P.fire[2], 0); }
  else if (kind === 'candle') { for (const x of [23, 32, 41]) { flame(x, 24, 3, 8 + h * 0.5, P.fire[1], 0); flame(x, 24, 1.6, 4 + h * 0.3, P.fire[2], 0); } }
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
