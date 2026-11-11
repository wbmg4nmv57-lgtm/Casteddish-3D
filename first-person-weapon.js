/* ======================================================================
   CASTEDDISH - Arma in prima persona
   Disegno dell'arma e delle mani del giocatore.
   ====================================================================== */

/* ---------- First-person weapon art ---------- */
const gunArt = [];
if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };

function metal(g, x, y, w, h, c1, c2, r) {
  const gr = g.createLinearGradient(x, y, x + w, y);
  gr.addColorStop(0, c1); gr.addColorStop(0.45, c2); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r || 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 1, y + 1, w - 2, 1.5);
}

function hand(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y);
  gr.addColorStop(0, '#8a5a3a'); gr.addColorStop(0.5, '#d9a07a'); gr.addColorStop(1, '#8a5a3a');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 4; i++) g.fillRect(x + (w * i) / 4, y + 2, 1, h * 0.45);
}

function drawGuns() {
  for (let k = 0; k < 8; k++) {
    const c = mk(); c.width = c.height = 128; gunArt.push(c);
    const g = c.getContext('2d');
    if (k === 0) {
      metal(g, 54, 16, 20, 66, '#15181c', '#6a7078', 4);
      metal(g, 58, 8, 12, 12, '#0a0b0d', '#30343a', 3);
      g.fillStyle = '#d8dce2'; g.fillRect(62, 6, 4, 4);
      g.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 6; i++) g.fillRect(55, 58 + i * 4, 18, 1.5);
      metal(g, 52, 80, 24, 16, '#101216', '#3a3e46', 3);
      metal(g, 55, 92, 18, 36, '#26180f', '#6a4630', 4);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 7; i++) g.fillRect(56, 98 + i * 4, 16, 1);
      hand(g, 40, 100, 48, 28); hand(g, 34, 90, 14, 22);
    } else if (k === 1) {
      metal(g, 44, 4, 16, 74, '#14161a', '#707780', 5); metal(g, 68, 4, 16, 74, '#14161a', '#707780', 5);
      metal(g, 60, 6, 8, 70, '#1a1c20', '#4a5058', 2);
      metal(g, 36, 58, 56, 24, '#4a2c16', '#a0703c', 8);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 8, 60, 2, 20);
      metal(g, 42, 80, 44, 24, '#14161a', '#4a5058', 4);
      metal(g, 54, 100, 20, 28, '#4a2c16', '#a0703c', 5);
      hand(g, 30, 64, 22, 22); hand(g, 46, 106, 38, 22);
    } else if (k === 2) {
      for (let i = 0; i < 3; i++) metal(g, 42 + i * 16, 2, 12, 66, '#1b1d22', '#8a9098', 4);
      metal(g, 36, 36, 56, 10, '#101216', '#5a6068', 3); metal(g, 36, 56, 56, 8, '#101216', '#5a6068', 3);
      metal(g, 30, 66, 68, 42, '#1b1d22', '#505660', 8);
      g.fillStyle = '#c8a020'; for (let i = 0; i < 5; i++) g.fillRect(12 + i * 3, 72 + i * 7, 16, 5);
      metal(g, 54, 56, 20, 12, '#101216', '#3a3e46', 3);
      hand(g, 36, 96, 56, 32);
    } else if (k === 3) {
      metal(g, 34, 0, 60, 92, '#2c3a24', '#74905a', 12);
      g.fillStyle = '#050605'; g.beginPath(); g.ellipse(64, 6, 26, 8, 0, 0, 7); g.fill();
      g.fillStyle = '#c03020'; g.beginPath(); g.ellipse(64, 8, 9, 4, 0, 0, 7); g.fill();
      metal(g, 34, 30, 60, 6, '#14180f', '#3a4430', 2); metal(g, 34, 62, 60, 6, '#14180f', '#3a4430', 2);
      metal(g, 96, 24, 8, 34, '#14161a', '#5a6068', 2);
      metal(g, 52, 88, 24, 22, '#14161a', '#4a5058', 4);
      hand(g, 38, 98, 52, 30);
    } else if (k === 4) {
      const gb = g.createLinearGradient(46, 0, 82, 0); gb.addColorStop(0, '#16301a'); gb.addColorStop(0.35, '#4a9a52'); gb.addColorStop(1, '#16301a');
      g.fillStyle = gb; g.beginPath(); g.roundRect(46, 58, 36, 62, 14); g.fill(); g.fillRect(57, 32, 14, 30);
      g.fillStyle = 'rgba(230,160,40,.85)'; g.fillRect(49, 82, 30, 34);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(52, 62, 4, 50); g.fillRect(60, 34, 3, 24);
      g.fillStyle = '#d8d0b0'; g.fillRect(58, 22, 12, 14);
      g.fillStyle = '#ff6a00'; g.beginPath(); g.moveTo(58, 22); g.quadraticCurveTo(54, 10, 64, 0); g.quadraticCurveTo(76, 12, 70, 22); g.fill();
      g.fillStyle = '#ffe070'; g.beginPath(); g.moveTo(61, 22); g.quadraticCurveTo(59, 14, 64, 7); g.quadraticCurveTo(69, 14, 67, 22); g.fill();
      hand(g, 40, 98, 48, 30); hand(g, 38, 88, 12, 20);
    } else if (k === 5) {
      const gg = g.createRadialGradient(56, 70, 4, 64, 80, 40); gg.addColorStop(0, '#5a7a3a'); gg.addColorStop(1, '#1c2a14');
      g.fillStyle = gg; g.beginPath(); g.ellipse(64, 80, 24, 32, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(64 + i * 8, 50); g.quadraticCurveTo(64 + i * 10, 80, 64 + i * 8, 110); g.stroke(); }
      for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(42, 58 + j * 12); g.quadraticCurveTo(64, 62 + j * 12, 86, 58 + j * 12); g.stroke(); }
      metal(g, 58, 38, 12, 14, '#2a2a2e', '#7a7e86', 2);
      g.strokeStyle = '#8a8e96'; g.lineWidth = 5; g.beginPath(); g.moveTo(70, 46); g.quadraticCurveTo(94, 42, 88, 80); g.stroke();
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 2.5; g.beginPath(); g.arc(50, 42, 7, 0, 7); g.stroke();
      hand(g, 36, 96, 56, 32); hand(g, 34, 80, 14, 26);
    } else if (k === 6) {
      metal(g, 56, 6, 16, 78, '#222428', '#7a7e86', 4); metal(g, 52, 2, 24, 12, '#0e0f12', '#3a3e46', 3);
      for (const y of [30, 52]) metal(g, 52, y, 24, 6, '#14161a', '#555b63', 2);
      metal(g, 14, 62, 34, 62, '#6a1a12', '#d0482e', 14);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(20, 68, 4, 50);
      metal(g, 22, 56, 18, 10, '#1a1c20', '#5a6068', 3);
      g.strokeStyle = '#1a1c20'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 58); g.quadraticCurveTo(40, 40, 58, 78); g.stroke();
      metal(g, 60, 84, 18, 36, '#222', '#555', 4);
      hand(g, 44, 100, 52, 28);
    } else if (k === 7) {
      metal(g, 50, 22, 28, 62, '#14221a', '#4e7060', 8);
      g.fillStyle = '#4dff6a'; g.fillRect(62, 30, 4, 44);
      const pg = g.createRadialGradient(64, 52, 2, 64, 52, 30); pg.addColorStop(0, 'rgba(120,255,150,.55)'); pg.addColorStop(1, 'rgba(120,255,150,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = pg; g.fillRect(34, 22, 60, 60); g.globalCompositeOperation = 'source-over';
      metal(g, 42, 38, 10, 28, '#14221a', '#3a5a48', 3); metal(g, 76, 38, 10, 28, '#14221a', '#3a5a48', 3);
      g.fillStyle = '#7dffa0'; g.beginPath(); g.ellipse(64, 20, 11, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#0a1a10'; g.beginPath(); g.ellipse(64, 20, 6, 2.5, 0, 0, 7); g.fill();
      metal(g, 54, 82, 20, 34, '#18201c', '#3a4a40', 5);
      hand(g, 40, 100, 48, 28); hand(g, 34, 90, 14, 22);
    }
    g.fillStyle = '#1a1f2a'; g.fillRect(40, 119, 48, 9);
    finish(g, 128);
  }
}

function renderGun() {
  const W = RENDER_WIDTH, H = RENDER_HEIGHT, cx = W / 2;
  const oy = isFiring ? (fireAnimFrame % 2 === 1 ? 7 : -3) : 0;
  const mv = Math.min(1, Math.hypot(joy.x, joy.y) + (input.fwd || input.back ? 1 : 0));
  const sz = 104, gx = cx - 52 + Math.sin(tNow * 9) * 4 * mv, gy = H - sz + 10 + oy + Math.abs(Math.cos(tNow * 9)) * 3 * mv;
  CVBOX.gun = { cx: gx + sz / 2, cy: gy + sz / 2, w: sz, h: sz };
  const lyG = layoutBegin('gun', gx + sz / 2, gy + sz / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(gunArt[cur], gx, gy, sz, sz);
  ctx.imageSmoothingEnabled = false;
  const FLASH = [['#ffcc00', 15, 12], ['#ffcc00', 15, 8], ['#ffcc00', 15, 4], ['#ff6a00', 20, 6], null, null, ['#ff8a20', 17, 4], ['#4dff6a', 13, 18]][cur];
  if (isFiring && (fireAnimFrame === 1 || cur === 6) && FLASH) {
    const fx = gx + sz * 0.5, fy = gy + FLASH[2] * sz / 128;
    ctx.fillStyle = FLASH[0]; ctx.beginPath(); ctx.arc(fx, fy, FLASH[1], 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cur === 7 ? '#d8ffe0' : '#fff'; ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
  }

  layoutEnd(lyG);
  ctx.font = 'bold 12px monospace';
  const txt = (t, x, y, col, al) => {
    ctx.textAlign = al || 'left';
    ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  const lyI = layoutBegin('info', 100, 34.5);
  txt('PIANO ' + (progress + 1) + '/5', 8, 16, '#dddddd');
  const ready = remaining === 0 && keys >= keysNeed;
  txt(curFloor === 4 ? 'COPPIA ' + (pairIdx + 1) + '/5  UCCIDI I BOSS' : ready ? 'VAI ALLE SCALE!' : 'NEMICI: ' + remaining + '  CHIAVI: ' + keys + '/' + keysNeed, 8, 30, curFloor === 4 || !ready ? '#ffff77' : '#77ff77');
  txt(WEAPONS[cur].name + ' ' + (ammo[cur] === Infinity ? '\u221e' : ammo[cur]), 8, 44, '#ffd24a');
  txt(armor.t >= 0 ? 'ARMATURA ' + ARMORS[armor.t].name + ' ' + Math.ceil(armor.ap) : 'SENZA ARMATURA', 8, 58, armor.t >= 0 ? ARMORS[armor.t].col : '#999999');
  layoutEnd(lyI);
  const lyC = layoutBegin('cross', cx, H / 2);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(cx - 6, H / 2); ctx.lineTo(cx - 2, H / 2); ctx.moveTo(cx + 2, H / 2); ctx.lineTo(cx + 6, H / 2);
  ctx.moveTo(cx, H / 2 - 6); ctx.lineTo(cx, H / 2 - 2); ctx.moveTo(cx, H / 2 + 2); ctx.lineTo(cx, H / 2 + 6); ctx.stroke();
  layoutEnd(lyC);
  const bosses = enemies.filter(e => e.alive && TYPES[e.type].boss);
  if (bosses.length || ed.on) {
    const lyB = layoutBegin('boss', cx, 49);
    for (let i = 0; i < Math.max(1, bosses.length); i++) {
      const b = bosses[i], y = 38 + i * 15, frac = b ? Math.max(0, b.hp) / b.mhp : 1;
      ctx.font = 'bold 8px monospace'; txt(b ? TYPES[b.type].name : 'BOSS', cx, y - 2, '#ffd9d0', 'center');
      ctx.fillStyle = '#300'; ctx.fillRect(cx - 110, y, 220, 6); ctx.fillStyle = '#d22'; ctx.fillRect(cx - 110, y, 220 * frac, 6);
    }
    layoutEnd(lyB);
    ctx.font = 'bold 12px monospace';
  }
  if (toastT > 0 || ed.on) {
    const lyT = layoutBegin('toast', cx, H * 0.3 - 4);
    txt(toastT > 0 ? toast : 'MESSAGGIO', cx, H * 0.3, '#ffffff', 'center');
    layoutEnd(lyT);
  }
  if (player.hp <= 0 || won) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H); }
}
