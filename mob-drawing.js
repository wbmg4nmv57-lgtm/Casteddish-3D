/* ======================================================================
   CASTEDDISH - Disegno dei mostri
   Disegna i mostri (corpo, animazioni, scintille, pozze, mucchi di
   ossa) e la loro vista di lato usata durante i litigi.
   ====================================================================== */

// Jagged electric arcs around a hand
function zapFx(c, x, y, seed) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (let k = 0; k < 3; k++) {
    let px = x, py = y; const a = seed * 1.7 + k * 2.1;
    c.beginPath(); c.moveTo(px, py);
    for (let i = 1; i <= 4; i++) { px += Math.cos(a + (i % 2 ? 0.7 : -0.7)) * 5; py += Math.sin(a + (i % 2 ? 0.7 : -0.7)) * 5 - 1; c.lineTo(px, py); }
    c.strokeStyle = '#7ac8ff'; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
  }
  c.restore();
}

// Ghoul death: a pool of rancid green bile (the bubbles that rise and pop are animated in the world, see corpseFx)
function bilePool(c, f) {
  const rx = 8 + f * 9, ry = 3 + f * 1.5;
  c.save(); c.translate(48, 90);
  c.fillStyle = '#26320a'; c.beginPath(); c.ellipse(0, 0.6, rx + 1.5, ry + 1, 0, 0, 7); c.fill();
  c.save(); c.scale(1, ry / rx);
  const g = c.createRadialGradient(-rx * 0.15, -rx * 0.1, 1, 0, 0, rx);
  g.addColorStop(0, '#b8d424'); g.addColorStop(0.55, '#7a9a18'); g.addColorStop(1, '#44580e');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
  c.strokeStyle = 'rgba(225,255,120,.7)'; c.lineWidth = 0.9;
  for (let i = 0; i < f + 2; i++) {
    const a = i * 2.4 + 0.7, d = (0.15 + (i * 0.37) % 0.6) * rx, br = 1.1 + (i % 3) * 0.7;
    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d * (ry / rx), br, 0, 7); c.stroke();
  }
  c.restore();
}

// Skeleton death: the figure crumbles straight down and its bones pile up on themselves (x, y, length, angle; bottom layer first)
const BONE_HEAP = [
  [48, 89, 26, 0.03], [34, 88, 20, 0.12], [62, 88, 20, -0.1], [27, 86, 14, -0.45], [69, 86, 14, 0.45],
  [42, 84, 20, -0.35], [55, 84, 20, 0.38], [48, 85, 16, 0.95], [35, 83, 12, 0.7], [61, 83, 12, -0.7],
  [46, 80, 16, 0.25], [52, 80, 16, -0.3], [40, 79, 10, -0.9], [57, 79, 10, 0.9], [48, 77, 12, 0.1]
];
function bonePile(c, f, st) {
  const col = st.limb || '#d8d0b8', n = [2, 5, 9, 13, 15][f], prev = [0, 2, 5, 9, 13][f];
  c.save(); c.lineCap = 'round';
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(48, 90, 26, 4, 0, 0, 7); c.fill();
  const bone = (x, y, len, a) => {
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    c.strokeStyle = '#150404'; c.lineWidth = 4.8; c.beginPath(); c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); c.stroke();
    c.strokeStyle = col; c.lineWidth = 2.6; c.stroke();
    for (const k of [-1, 1]) { c.fillStyle = col; c.strokeStyle = '#150404'; c.lineWidth = 1.2; c.beginPath(); c.arc(x + k * dx, y + k * dy, 2.4, 0, 7); c.fill(); c.stroke(); }
  };
  for (let i = 0; i < n; i++) { const b = BONE_HEAP[i]; bone(b[0], b[1] - (i >= prev && f < 4 ? 6 : 0), b[2], b[3]); }   // the newest bones are still dropping
  if (f >= 3) {   // a few ribs on top of the heap
    for (const [lw, cc] of [[3.8, '#150404'], [1.8, col]]) {
      c.strokeStyle = cc; c.lineWidth = lw;
      for (const dy of [0, 3.5, 7]) { c.beginPath(); c.moveTo(38, 83 + dy); c.quadraticCurveTo(48, 73 + dy, 58, 83 + dy); c.stroke(); }
    }
  }
  if (f >= 1) {   // the skull comes to rest on top
    const sy = [0, 62, 69, 74, 76][f];
    c.fillStyle = st.c2 || '#efe8d0'; c.strokeStyle = '#150404'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(49, sy, 8.5, 7.5, 0.15, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#000'; c.beginPath(); c.arc(45.5, sy - 1, 2.2, 0, 7); c.fill(); c.beginPath(); c.arc(53, sy - 1, 2.2, 0, 7); c.fill();
    c.fillStyle = col; c.fillRect(44.5, sy + 5.5, 9, 3.4); c.lineWidth = 1; c.strokeRect(44.5, sy + 5.5, 9, 3.4);
    c.beginPath(); for (const x of [47.5, 50.5]) { c.moveTo(x, sy + 5.5); c.lineTo(x, sy + 8.9); } c.stroke();
  }
  c.restore();
}

function drawDemon(c, mode, f, st) {
  c.clearRect(0, 0, DS, DS);
  c.scale(DS / 96, DS / 96);
  const atk = mode === 'attack' || mode === 'battack', back = mode === 'flee' || mode === 'battack', cower = mode === 'cower', walkLike = mode === 'walk' || mode === 'flee', ab = st.abil, gun = st.weapon === 'shotgun' || st.weapon === 'rifle';
  // body width variants; from behind the figure is mirrored, so the weapon hand switches side; cowering squashes it down
  c.translate(48, 91); c.scale((st.ws || 1) * (back ? -1 : 1), cower ? 0.74 : 1); c.translate(-48, -91);
  if (mode !== 'die') { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(48, 91, 24 * (st.belly ? 1.3 : 1), 4.5, 0, 0, 7); c.fill(); }
  const ph = f / 8 * Math.PI * 2, s = Math.sin(ph), u = f / 3, ln = st.len || 1, hy = 58 + (1 - ln) * 32, lr = st.limp ? 0.8 : 1;
  let pile = false, bob = 0, lean = st.bend || 0, ht = 0, jaw = 0.15, LL = [-0.12, 0], LR = [0.12, 0], AL = [-0.4, 0.6], AR = [0.4, -0.6];
  if (walkLike) {
    const a = Math.max(0, s), b = Math.max(0, -s);
    LL = [-0.12 - 0.3 * a, 0.7 * a]; LR = [0.12 + 0.3 * b, -0.7 * b];
    AL = [-0.35 - 0.35 * s, 0.6 + 0.3 * s]; AR = [0.35 - 0.35 * s, -0.6 + 0.3 * s];
    bob = -Math.abs(s) * 2; lean += s * 0.05; ht = Math.sin(ph * 0.5) * 0.14; jaw = 0.2 + (s + 1) * 0.1;
    if (st.limp) { LR = [0.05 + 0.1 * b, -0.25 * b]; bob = -Math.max(0, s) * 4; lean += -0.1 + s * 0.06; }   // one leg drags, the body dips on every step
  } else if (cower) {   // curled up, forearms wrapped over the face and head
    LL = [-1.1, 1.6]; LR = [1.1, -1.6]; AL = [-2.68, 3.74]; AR = [2.68, -3.74]; bob = f ? 1.5 : 0; ht = 0.35; jaw = 0.2; lean = 0.22 + 0.03 * (f ? 1 : -1);
  } else if (atk) {
    LL = [-0.3, 0]; LR = [0.3, 0];
    AL = [-(2.7 - 2.4 * u), 0.5]; AR = st.weapon && ab !== 'throw' ? (gun ? [-0.9, 0.2] : [1.2 - 0.9 * u, -0.4]) : [2.7 - 2.4 * u, -0.5];
    bob = -3 * (1 - u); lean += 0.08 * (1 - 2 * u); ht = -0.12 * (1 - u); jaw = 1 - 0.5 * u;
  } else {
    LL = [-0.5, 0.3]; LR = [0.5, -0.3];
    AL = [-1.3 + f * 0.2, 0.4]; AR = [1.3 - f * 0.2, -0.4]; ht = -0.35; jaw = 1; lean = -0.2;
    if (st.pool === undefined) { c.fillStyle = '#6a0000'; c.beginPath(); c.ellipse(48, 90, 8 + f * 9, 3 + f * 1.5, 0, 0, 7); c.fill(); }   // blood
    else if (st.pool === 'bile') bilePool(c, f);                                                                                          // ghouls: rancid green bile
    if (st.skull) { pile = true; c.save(); c.translate(48, 90); c.scale(1, [0.9, 0.62, 0.36, 0.16, 0.001][f]); c.translate(-48, -90); }    // skeletons: crumble into a heap
    else { c.translate(48, 90); c.rotate([0.05, 0.2, 0.4, 0.7, 0.95][f]); c.scale(1, [1, 0.9, 0.75, 0.55, 0.38][f]); c.translate(-48, -90); }
  }
  c.globalAlpha = st.alpha || 1;
  if (cower && st.weapon) heldWeapon(c, st.weapon, 12, 88, 1.45, st.wopt);   // dropped on the floor
  const foot = (q) => { c.fillStyle = '#120303'; c.beginPath(); c.ellipse(q[0], q[1] + 1, 6, 3, 0, 0, 7); c.fill(); };
  if (!st.robe) {
    foot(limb(c, 41, hy, LL[0], 15 * ln, LL[1], 17 * ln, st.lw + 1, st.limb));
    foot(limb(c, 55, hy, LR[0], 15 * ln * lr, LR[1], 17 * ln * lr, st.lw + 1, st.limb));
  }
  c.save(); c.translate(48, hy + bob); c.rotate(lean); c.translate(-48, -58);
  if (st.robe) {
    const rg = c.createLinearGradient(0, 30, 0, 92); rg.addColorStop(0, st.c2); rg.addColorStop(1, st.robe);
    c.fillStyle = rg; c.strokeStyle = '#05060a'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(30, 33); c.quadraticCurveTo(48, 26, 66, 33); c.lineTo(80, 86);
    for (let i = 0; i < 7; i++) c.lineTo(80 - i * 10, 88 + (i % 2 ? 5 : -3) + s * 2 * (i % 2 ? 1 : -1));
    c.lineTo(16, 86); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath();
    for (let i = 0; i < 3; i++) { c.moveTo(40 + i * 8, 44); c.lineTo(32 + i * 16, 88); }
    c.stroke();
  } else {
    const tg = c.createLinearGradient(30, 30, 66, 30);
    tg.addColorStop(0, st.c1); tg.addColorStop(0.5, st.c2); tg.addColorStop(1, st.c1);
    c.fillStyle = tg; c.strokeStyle = '#150404'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(29, 33); c.quadraticCurveTo(48, 25, 67, 33); c.lineTo(60, 58); c.quadraticCurveTo(48, 63, 36, 58); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.5;
    c.beginPath();
    if (back) {   // spine and shoulder blades
      c.moveTo(48, 30); c.lineTo(48, 58);
      for (const y of [36, 42, 48, 54]) { c.moveTo(45, y); c.lineTo(51, y); }
      c.moveTo(36, 38); c.quadraticCurveTo(40, 47, 44, 40); c.moveTo(60, 38); c.quadraticCurveTo(56, 47, 52, 40);
    } else {
      c.moveTo(48, 31); c.lineTo(48, 56);
      c.moveTo(35, 40); c.quadraticCurveTo(42, 45, 47, 40); c.moveTo(61, 40); c.quadraticCurveTo(54, 45, 49, 40);
      c.moveTo(38, 48); c.lineTo(46, 48); c.moveTo(58, 48); c.lineTo(50, 48);
    }
    c.stroke();
    if (st.belly) {
      c.fillStyle = tg; c.strokeStyle = '#150404'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(48, 52, 12 + st.belly, 12 + st.belly * 0.7, 0, 0, 7); c.fill(); c.stroke();
      if (!back) { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(48, 55, 2, 0, 7); c.fill(); }
    }
    if (st.cloth) {
      c.fillStyle = st.cloth; c.fillRect(35, 55, 26, 6); c.fillStyle = '#c8a020'; c.fillRect(45, 55, 6, 6);
      c.beginPath(); c.moveTo(38, 61); c.lineTo(58, 61); c.lineTo(48, 76); c.closePath(); c.fill();
    }
  }
  const sx = st.belly ? 29 : 33, aL = st.armL || 1, aR = st.armR || 1;
  let h = [48, 40, 0], hL = h;
  if (!cower) {
    h = limb(c, sx, 36, AL[0], 14 * ln * aL, AL[1], 16 * ln * aL, st.lw, st.arm); claws(c, h[0], h[1], h[2]);
    hL = h;
    h = limb(c, 96 - sx, 36, AR[0], 14 * ln * aR, AR[1], 16 * ln * aR, st.lwR || st.lw, st.arm); claws(c, h[0], h[1], h[2]);
  }
  if (st.weapon && !cower && mode !== 'die') {
    if (ab === 'throw' && atk) { if (u < 0.75) heldWeapon(c, 'rock', h[0], h[1] - 4, 0, null); }   // the rock leaves the hand at the end of the throw
    else if (gun) heldWeapon(c, st.weapon, h[0], h[1], atk ? -1.5 : -1.15, st.wopt, atk && (f === 1 || f === 2));
    else heldWeapon(c, st.weapon, h[0], h[1], atk ? -0.3 + u * 2.4 : 0.3 + s * 0.2, st.wopt);
  }
  if (ab === 'elec' && atk) { zapFx(c, hL[0], hL[1], f); zapFx(c, h[0], h[1], f + 3); }
  if (st.hump) {   // a lump on the shoulder / back
    c.fillStyle = st.c1; c.strokeStyle = '#150404'; c.lineWidth = 2; c.beginPath(); c.ellipse(62, 29, st.hump * 0.8, st.hump * 0.7, 0.4, 0, 7); c.fill(); c.stroke();
  }
  if (st.horn) {
    c.fillStyle = st.horn;
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(48 + sd * 18, 34); c.lineTo(48 + sd * 24, 22); c.lineTo(48 + sd * 12, 30); c.fill(); }
  }
  c.fillStyle = st.limb; c.fillRect(43, 26, 10, 10);
  head(c, 48, 30 + (st.hunch || 0) + (cower ? 12 : 0), ht, jaw, st, back, ab === 'plasma' && atk ? 0.4 + u * 0.6 : 0);
  if (cower) {   // drawn after the head, so the arms hide the face
    for (const sd of [-1, 1]) { const e2 = limb(c, sd < 0 ? sx : 96 - sx, 36, sd * AR[0], 14 * ln, sd * AR[1], 16 * ln, st.lw, st.arm); claws(c, e2[0], e2[1], e2[2]); }
  }
  c.restore();
  if (pile) { c.restore(); bonePile(c, f, st); }   // drop the crumbling-figure transform, then draw the heap
  finish(c, DS);
}

// ---- Side view: the monster faces right (the image is flipped for the other flank). Used while two monsters fight: each one is seen from the side it turns to us.
// The weapon is in the same hand as in the front sprites (the one on the right of the image, i.e. the monster's left), so it is the near arm only on the left flank.
const dkHex = (h, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
function headSide(c, cx, cy, tilt, jaw, st, glow) {
  c.save(); c.translate(cx, cy); c.rotate(tilt); c.scale(st.headS || 1, st.headS || 1);
  c.lineJoin = 'round';
  if (st.horn) { c.strokeStyle = st.horn; c.lineCap = 'round'; c.lineWidth = 4; c.beginPath(); c.moveTo(-2, -12); c.quadraticCurveTo(-11, -15, -15, -27); c.stroke(); }   // horns sweep back from the skull
  if (st.hood) { c.fillStyle = st.hood; c.beginPath(); c.moveTo(7, 10); c.quadraticCurveTo(-19, 12, -17, -12); c.quadraticCurveTo(-12, -27, 3, -24); c.quadraticCurveTo(12, -20, 10, -8); c.closePath(); c.fill(); }
  const g = c.createLinearGradient(0, -15, 0, 5); g.addColorStop(0, st.c2); g.addColorStop(1, st.c1);
  c.fillStyle = g; c.strokeStyle = '#150404'; c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(-1, -5, st.hood ? 9 : 10.5, 10, 0, 0, 7); c.fill(); c.stroke();
  const jo = jaw * 8;
  if (st.skull) {   // skeleton: cranium, eye socket, nose hole and a jaw full of teeth
    c.fillStyle = '#000'; c.beginPath(); c.arc(4, -6, 3.4, 0, 7); c.fill();
    c.beginPath(); c.moveTo(9, -3); c.lineTo(11.5, 1); c.lineTo(8, 0.5); c.closePath(); c.fill();
    c.fillStyle = st.limb; c.beginPath(); c.moveTo(0, 3); c.lineTo(11, 3 + jo * 0.3); c.lineTo(10, 8 + jo); c.lineTo(1, 9 + jo * 0.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#efe6c8'; for (let i = 0; i < 4; i++) c.fillRect(2 + i * 2.4, 3 + jo * 0.3, 1.6, 2.6);
  } else {
    c.fillStyle = st.limb; c.beginPath(); c.ellipse(-5, -4, 2.4, 3.8, 0.2, 0, 7); c.fill(); c.stroke();   // ear
    c.fillStyle = g; c.beginPath(); c.moveTo(5, -10); c.quadraticCurveTo(14, -11, 19, -5); c.lineTo(18, 1); c.lineTo(5, 2); c.closePath(); c.fill(); c.stroke();   // muzzle
    c.fillStyle = '#2a0303'; c.beginPath(); c.moveTo(4, 2); c.lineTo(18, 1); c.lineTo(16, 2 + jo); c.lineTo(5, 3 + jo * 0.6); c.closePath(); c.fill();   // open mouth
    c.fillStyle = st.limb; c.beginPath(); c.moveTo(4, 2 + jo * 0.3); c.lineTo(17, 2 + jo * 0.9); c.lineTo(14, 8 + jo); c.lineTo(5, 9 + jo * 0.5); c.closePath(); c.fill(); c.stroke();   // lower jaw
    if (!st.nofang) {
      c.fillStyle = '#efe6c8';
      for (let i = 0; i < 4; i++) { const x = 7.5 + i * 2.8; c.beginPath(); c.moveTo(x, 1.6); c.lineTo(x + 1.6, 1.4); c.lineTo(x + 0.8, 4.6); c.fill(); }
      c.beginPath(); c.moveTo(13.5, 2 + jo * 0.85); c.lineTo(14.8, -2 + jo * 0.85); c.lineTo(16.2, 2 + jo * 0.9); c.fill();
    }
    c.fillStyle = '#1a0505'; c.beginPath(); c.moveTo(3, -12); c.lineTo(14, -8.5); c.lineTo(3, -8); c.closePath(); c.fill();   // brow and eye
    c.fillStyle = st.eye; c.beginPath(); c.moveTo(5, -8.5); c.lineTo(11.5, -6.8); c.lineTo(5, -5.6); c.closePath(); c.fill();
    c.fillStyle = '#000'; c.fillRect(15.5, -4.4, 1.6, 1.6);
    if (glow > 0) { const gr = c.createRadialGradient(16, 3, 1, 16, 3, 8 + glow * 6); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#d070ff'); gr.addColorStop(1, 'rgba(120,0,200,0)'); c.fillStyle = gr; c.beginPath(); c.arc(16, 3, 8 + glow * 6, 0, 7); c.fill(); }
  }
  if (st.hat) {
    c.fillStyle = st.hat; c.beginPath(); c.ellipse(0, -12, 17, 4, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-9, -12); c.quadraticCurveTo(-4, -22, -11, -29); c.quadraticCurveTo(4, -24, 10, -12); c.closePath(); c.fill();
    c.fillStyle = '#6a3a8a'; c.fillRect(-9, -16, 19, 3);
  }
  c.restore();
}
function drawSide(c, mode, f, st, wNear) {
  c.clearRect(0, 0, DS, DS);
  c.scale(DS / 96, DS / 96);
  const atk = mode === 'sattack', ab = st.abil, gun = st.weapon === 'shotgun' || st.weapon === 'rifle';
  const ph = f / 8 * Math.PI * 2, s = Math.sin(ph), cs = Math.cos(ph), u = f / 3, ln = st.len || 1, hy = 58 + (1 - ln) * 32, lr = st.limp ? 0.8 : 1;
  const th = 0.6 + 0.4 * (st.ws || 1), fx = 48 + 11 * th, bx = 48 - 10 * th;   // chest front and back
  let bob = 0, lean = (st.bend || 0) + 0.05, ht = 0, jaw = 0.15;
  if (atk) { bob = -3 * (1 - u); lean += 0.1 * (1 - 2 * u); ht = -0.1 * (1 - u); jaw = 1 - 0.5 * u; }
  else { bob = -Math.abs(s) * 2; lean += s * 0.03; ht = Math.sin(ph * 0.5) * 0.1; jaw = 0.2 + (s + 1) * 0.1; if (st.limp) { bob = -Math.max(0, s) * 4; lean += -0.1 + s * 0.06; } }
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(48, 91, 22 * (st.belly ? 1.3 : 1), 4.5, 0, 0, 7); c.fill();
  c.globalAlpha = st.alpha || 1;
  const foot = (q) => { c.fillStyle = '#120303'; c.beginPath(); c.ellipse(q[0] + 3, q[1] + 1, 7, 3, 0, 0, 7); c.fill(); };
  const leg = (x, a1, a2, k, col) => foot(limb(c, x, hy, a1, 15 * ln * k, a2, 17 * ln * k, st.lw + 1, col));
  if (!st.robe) {
    if (atk) { leg(49, -0.4, 0.25, lr, dkHex(st.limb, 0.6)); leg(47, 0.42, -0.35, 1, st.limb); }   // planted: one leg forward, one back
    else {
      leg(49, 0.55 * -s * (st.limp ? 0.5 : 1), -0.2 - 0.8 * Math.max(0, -cs), lr, dkHex(st.limb, 0.6));
      leg(47, 0.55 * s, -0.2 - 0.8 * Math.max(0, cs), 1, st.limb);
    }
  }
  c.save(); c.translate(48, hy + bob); c.rotate(lean); c.translate(-48, -58);
  const arm = (near) => {
    const hasW = near === wNear, aN = hasW ? (st.armR || 1) : (st.armL || 1), col = near ? st.arm : dkHex(st.arm, 0.6), k = near ? 1 : -1;
    let a1, a2;
    if (atk) {
      if (hasW) { a1 = gun ? 1.5 : -2.7 + 3.5 * u; a2 = gun ? -0.05 : 0.45; } else { a1 = 0.5 + 0.7 * (1 - u); a2 = 0.9; }
    } else if (hasW) { a1 = gun ? 1.2 : 0.45 + 0.2 * s * k; a2 = gun ? 0.1 : 0.5; }
    else { a1 = -0.45 * s * k; a2 = 0.5 + 0.2 * s * k; }
    const h = limb(c, 49, 36, a1, 14 * ln * aN, a2, 16 * ln * aN, hasW ? (st.lwR || st.lw) : st.lw, col);
    claws(c, h[0], h[1], h[2]);
    if (hasW && st.weapon) {
      if (ab === 'throw' && atk) { if (u < 0.75) heldWeapon(c, 'rock', h[0], h[1] - 4, 0, null); }
      else if (gun) heldWeapon(c, st.weapon, h[0], h[1], atk ? 1.57 : 1.25, st.wopt, atk && (f === 1 || f === 2));
      else heldWeapon(c, st.weapon, h[0], h[1], atk ? -0.5 + u * 2.6 : 0.5 + s * 0.2, st.wopt);
    }
    if (ab === 'elec' && atk && hasW) zapFx(c, h[0], h[1], f);
  };
  arm(false);   // the far arm goes behind the body
  if (st.robe) {
    const rg = c.createLinearGradient(0, 30, 0, 92); rg.addColorStop(0, st.c2); rg.addColorStop(1, st.robe);
    c.fillStyle = rg; c.strokeStyle = '#05060a'; c.lineWidth = 1.5;
    const x0 = fx + 12, x1 = bx - 14;
    c.beginPath(); c.moveTo(bx + 1, 33); c.quadraticCurveTo(48, 26, fx - 1, 33); c.lineTo(x0, 86);
    for (let i = 1; i <= 5; i++) c.lineTo(x0 + (x1 - x0) * i / 5, 88 + (i % 2 ? 5 : -3) + s * 2 * (i % 2 ? 1 : -1));
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath();
    for (let i = 0; i < 3; i++) { c.moveTo(bx + 5 + i * 5, 44); c.lineTo(bx - 6 + i * 10, 88); }
    c.stroke();
  } else {
    const tg = c.createLinearGradient(bx, 0, fx, 0); tg.addColorStop(0, st.c1); tg.addColorStop(0.6, st.c2); tg.addColorStop(1, st.c1);
    c.fillStyle = tg; c.strokeStyle = '#150404'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(bx + 2, 30); c.quadraticCurveTo(48, 24, fx - 2, 31); c.quadraticCurveTo(fx + 2, 44, fx - 3, 58); c.quadraticCurveTo(48, 63, bx + 3, 58); c.quadraticCurveTo(bx - 2, 44, bx + 2, 30); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(fx - 9, 38); c.quadraticCurveTo(fx - 3, 44, fx - 8, 49); c.moveTo(bx + 5, 34); c.quadraticCurveTo(bx + 1, 46, bx + 6, 55); c.stroke();
    if (st.belly) { c.fillStyle = tg; c.strokeStyle = '#150404'; c.lineWidth = 2; c.beginPath(); c.ellipse(fx - 4, 52, 6 + st.belly * 0.8, 11 + st.belly * 0.6, 0, 0, 7); c.fill(); c.stroke(); }
    if (st.cloth) {
      c.fillStyle = st.cloth; c.fillRect(bx + 2, 55, fx - bx - 2, 6); c.fillStyle = '#c8a020'; c.fillRect(fx - 9, 55, 5, 6);
      c.beginPath(); c.moveTo(fx - 9, 61); c.lineTo(fx + 1, 61); c.lineTo(fx - 4, 76); c.closePath(); c.fill();
    }
  }
  if (st.hump) { c.fillStyle = st.c1; c.strokeStyle = '#150404'; c.lineWidth = 2; c.beginPath(); c.ellipse(bx + 1, 30, st.hump * 0.8, st.hump * 0.7, -0.4, 0, 7); c.fill(); c.stroke(); }
  c.fillStyle = st.limb; c.fillRect(45, 26, 8, 11);
  arm(true);   // the near arm in front of it
  headSide(c, 49 + (st.hunch || 0) * 0.6 + (atk ? 2 : 0), 30 + (st.hunch || 0), ht, jaw, st, ab === 'plasma' && atk ? 0.4 + u * 0.6 : 0);
  c.restore();
}
