/* ======================================================================
   CASTEDDISH - Aspetto dei mostri
   Colori e stili di ogni tipo di mostro, varianti (magri, grassi,
   zoppi...), disegno della testa e delle armi impugnate dai nemici.
   ====================================================================== */

const STY = {
  demon: { c1: '#5a0a0a', c2: '#9a1a14', limb: '#6a0c0c', arm: '#7a1010', eye: '#ffe400', horn: '#d9cfae', cloth: '#2e1a0a', lw: 7, weapon: 'axe' },
  ghoul: { c1: '#3a4233', c2: '#6f7d5e', limb: '#4d5a42', arm: '#566349', eye: '#d8ff60', cloth: '#3a2c22', lw: 6, len: 1.25, hunch: 5, weapon: 'club', pool: 'bile' },
  wraith: { c1: '#142038', c2: '#4a78b0', limb: '#223a5e', arm: '#2c4a78', eye: '#9ffcff', robe: '#18284a', hood: '#101c34', lw: 6, alpha: 0.8, weapon: 'scythe', pool: 'none' },
  witch: { c1: '#2f4a2f', c2: '#6a9a5a', limb: '#4a7a46', arm: '#4a7a46', eye: '#ff55ff', robe: '#2a1535', hat: '#1b0f26', lw: 5, weapon: 'staff' },
  boss: { c1: '#b8805c', c2: '#e0b090', limb: '#a87050', arm: '#b88060', eye: '#ffffff', cloth: '#4a3a2a', lw: 11, belly: 15, len: 0.8, nofang: 1, weapon: 'hammer' },
  skel: { c1: '#cfc6a8', c2: '#efe8d0', limb: '#d8d0b8', arm: '#d8d0b8', eye: '#000', lw: 3, skull: 1, weapon: 'sword', pool: 'none' }
};
const SPR = {};
const boltCanvas = mk();
let stairsSprite;

function head(c, cx, cy, tilt, jaw, st, back, glow) {
  c.save(); c.translate(cx, cy); c.rotate(tilt); c.scale(st.headS || 1, st.headS || 1);
  if (st.horn) {
    c.strokeStyle = st.horn; c.lineCap = 'round'; c.lineWidth = 4;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -12); c.quadraticCurveTo(s * 19, -13, s * 16, -26); c.stroke(); }
  }
  if (st.hood) {
    c.fillStyle = st.hood; c.beginPath(); c.moveTo(-15, 10); c.quadraticCurveTo(-18, -24, 0, -26); c.quadraticCurveTo(18, -24, 15, 10); c.fill();
  }
  if (st.hat) {
    c.strokeStyle = '#c8c8c0'; c.lineWidth = 1.5;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 10, -8); c.quadraticCurveTo(s * 14, 2, s * 11, 14); c.stroke(); }
  }
  const g = c.createLinearGradient(0, -15, 0, 5); g.addColorStop(0, st.c2); g.addColorStop(1, st.c1);
  c.fillStyle = g; c.strokeStyle = '#150404'; c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(0, -5, st.hood ? 9 : 11, 10, 0, 0, 7); c.fill(); c.stroke();
  if (!back) {
  for (const s of [-1, 1]) {
    if (st.skull) { c.fillStyle = '#000'; c.beginPath(); c.arc(s * 4, -6, 3, 0, 7); c.fill(); continue; }
    c.fillStyle = '#1a0505'; c.beginPath(); c.moveTo(s * 10, -11); c.lineTo(s * 1.5, -6); c.lineTo(s * 1.5, -11); c.fill();
    c.fillStyle = st.eye; c.beginPath(); c.moveTo(s * 8, -8); c.lineTo(s * 3, -6); c.lineTo(s * 3, -8.5); c.fill();
  }
  c.fillStyle = '#000'; c.fillRect(-3, -1, 2, 2); c.fillRect(1, -1, 2, 2);
  const jo = jaw * 9;
  c.fillStyle = '#2a0303'; c.beginPath(); c.ellipse(0, 5 + jo * 0.5, 7, 1 + jo * 0.5, 0, 0, 7); c.fill();
  c.fillStyle = st.limb; c.beginPath(); c.moveTo(-8, 4 + jo); c.lineTo(8, 4 + jo); c.lineTo(5, 12 + jo); c.lineTo(-5, 12 + jo); c.closePath(); c.fill();
  if (!st.nofang) {
    c.fillStyle = '#efe6c8';
    for (const i of [-3, -1, 1, 3]) {
      c.beginPath(); c.moveTo(i * 2 - 1, 4); c.lineTo(i * 2 + 1, 4); c.lineTo(i * 2, 8); c.fill();
      c.fillRect(i * 2 - 1, 3 + jo, 2, 2);
    }
  }
  if (glow > 0) { const gr = c.createRadialGradient(0, 7, 1, 0, 7, 8 + glow * 6); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#d070ff'); gr.addColorStop(1, 'rgba(120,0,200,0)'); c.fillStyle = gr; c.beginPath(); c.arc(0, 7, 8 + glow * 6, 0, 7); c.fill(); }
  } else {   // seen from behind: no face, just the back of the skull and the ears
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, -7, st.hood ? 8 : 10, 8, 0, 0, 7); c.fill();
    for (const sd of [-1, 1]) { c.fillStyle = st.limb; c.strokeStyle = '#150404'; c.lineWidth = 1; c.beginPath(); c.ellipse(sd * 11, -4, 2.6, 4, 0, 0, 7); c.fill(); c.stroke(); }
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -1); c.stroke();
  }
  if (st.hat) {
    c.fillStyle = st.hat; c.beginPath(); c.ellipse(0, -12, 17, 4, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-9, -12); c.lineTo(3, -28); c.lineTo(10, -12); c.fill();
    c.fillStyle = '#6a3a8a'; c.fillRect(-9, -16, 19, 3);
  }
  c.restore();
}

// Variants per enemy type: [weapon kind, weapon options, body shape].
// Shape: hs height, ws width, belly, lw / lwR limb widths, armL / armR arm lengths, headS head size, hump back lump, bend lean, limp dragging leg.
// Game effects: pw = damage multiplier (fat), sp = speed multiplier (thin 2x, cripples slower), abil = special attack of the cripples.
const VARS = {
  demon: [
    ['axe2'],
    ['mace', { blade: '#bfc6cc' }, { ws: 0.78, lw: 4.5, hs: 1.04, sp: 2 }],                                                     // thin: twice as fast
    ['trident', { blade: '#d86a2a', dark: '#8a2a0a' }, { ws: 1.2, belly: 10, lw: 9, hs: 0.95, pw: 2 }],                           // fat: twice as strong
    ['scimitar', {}, { hs: 1.2, lw: 6, ws: 0.92 }],
    ['halberd', { handle: '#3a2a22' }, { hs: 0.8, ws: 1.08, headS: 1.12 }],
    ['shotgun', {}, { limp: 1, bend: -0.06, sp: 0.6, abil: 'gun' }],                                                              // limping gunner
    ['hammer', { sc: 0.95 }, { armR: 1.5, lwR: 12, armL: 0.6, ws: 1.05, sp: 0.6, abil: 'throw' }],                                // giant arm throws rocks and props
    ['cleaver', { rust: 1, blade: '#a9a29a' }, { hump: 12, headS: 1.35, hunch: 8, bend: 0.1, hs: 0.92, sp: 0.6, abil: 'plasma' }]  // spits purple plasma
  ],
  ghoul: [
    ['club'],
    ['cleaver', { rust: 1, blade: '#a9a29a' }, { ws: 0.74, lw: 4, len: 1.4, hs: 1.08, sp: 2 }],
    ['flail', { blade: '#9a9aa2' }, { ws: 1.22, belly: 9, lw: 8, len: 1.05, hs: 0.95, pw: 2 }],
    ['trident', { blade: '#a8825a', dark: '#6b4a2e', handle: '#4a3a28' }, { limp: 1, hs: 1.18, bend: 0.05, sp: 0.6, abil: 'elec' }],
    ['club', { bone: 1 }, { hs: 0.8, len: 1.1, headS: 1.15 }],
    ['hammer', { blade: '#7a6a5a', dark: '#4a3a2a', handle: '#4a3a28', sc: 0.9 }, { limp: 1, armL: 1.3, sp: 0.6, abil: 'throw' }],
    ['rifle', {}, { armL: 1.7, armR: 0.75, lwR: 4, sp: 0.6, abil: 'gun' }],
    ['mace', { blade: '#8a8a7a' }, { hump: 11, headS: 1.3, hunch: 9, hs: 0.9, sp: 0.6, abil: 'plasma' }]
  ],
  wraith: [['scythe', { ghost: 1 }], ['sword', { ghost: 1 }], ['lantern', { ghost: 1, glow: '#8fe8ff' }], ['spear', { ghost: 1 }], ['trident', { ghost: 1 }]],
  witch: [
    ['staff', { style: 0, orb: '#e060ff' }],
    ['staff', { style: 1, orb: '#4dff6a', handle: '#3a4a22' }, { ws: 0.8, hs: 1.08, sp: 2 }],
    ['staff', { style: 2, orb: '#6fb8ff' }, { ws: 1.25, hs: 0.95, pw: 2 }],
    ['staff', { style: 3, orb: '#ff4040' }, { hs: 1.2, ws: 0.9 }],
    ['staff', { style: 4, orb: '#ffd23a' }, { hs: 0.78, ws: 1.05, headS: 1.15 }],
    ['staff', { style: 1, orb: '#ff9a3a', handle: '#4a3020' }, { bend: 0.16, hunch: 7, hump: 10, sp: 0.6, abil: 'elec' }],
    ['staff', { style: 0, orb: '#3affd0' }, { headS: 1.35, armR: 1.4, armL: 0.7, sp: 0.6, abil: 'plasma' }],
    ['staff', { style: 3, orb: '#ff4fd8' }, { limp: 1, bend: -0.1, hs: 0.95, sp: 0.6, abil: 'throw' }]
  ],
  skel: [['sword', { rust: 1, blade: '#b8bcc4' }], ['cleaver', { sc: 0.85, rust: 1 }], ['spear'], ['mace', { sc: 0.85 }], ['scimitar', { blade: '#c0b8a0' }]],
  bk: [[null]], golem: [[null]], lich: [[null]], knight: [[null]], spider: [[null]], inferno: [[null]], cyclops: [[null]], vamp: [[null]], wyrm: [[null]], storm: [[null]]
};

// Weapon held in the right hand: grip at (x, y), b = tilt from straight up (clockwise). In the local frame up is -y.
function heldWeapon(c, kind, x, y, b, o, flash) {
  o = o || {};
  const ghost = !!o.ghost, M = ghost ? '#d8f2ff' : o.blade || '#cfd6dd', D = ghost ? '#6fa8cf' : o.dark || '#7e8791', H = ghost ? '#2c3a52' : o.handle || '#6b4423';
  c.save(); c.translate(x, y); c.rotate(b); const sc = o.sc || 1; c.scale(sc, sc);
  c.lineCap = c.lineJoin = 'round'; c.strokeStyle = '#150404';
  if (ghost) { c.shadowColor = '#8fe8ff'; c.shadowBlur = 7; }
  const shaft = (top, bot, w, col) => {
    c.lineWidth = w + 2.5; c.beginPath(); c.moveTo(0, bot); c.lineTo(0, top); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.strokeStyle = '#150404';
  };
  const fill = (col) => { c.fillStyle = col; c.lineWidth = 1.2; c.fill(); c.stroke(); };
  const orb = (ox, oy, col) => {
    const g = c.createRadialGradient(ox, oy, 1, ox, oy, 7); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, col + '00');
    c.fillStyle = g; c.beginPath(); c.arc(ox, oy, 7, 0, 7); c.fill();
  };
  switch (kind) {
    case 'axe2': {   // double-bladed axe
      shaft(-30, 8, 3, H);
      const g = c.createLinearGradient(-16, 0, 16, 0); g.addColorStop(0, D); g.addColorStop(0.5, M); g.addColorStop(1, D);
      for (const sd of [-1, 1]) {
        c.beginPath(); c.moveTo(sd * 1.5, -37); c.bezierCurveTo(sd * 10, -39, sd * 18, -33, sd * 16, -27); c.bezierCurveTo(sd * 18, -21, sd * 10, -15, sd * 1.5, -17);
        c.bezierCurveTo(sd * 6, -22, sd * 6, -32, sd * 1.5, -37); c.closePath(); fill(g);
      }
      c.beginPath(); c.moveTo(-2, -36); c.lineTo(0, -42); c.lineTo(2, -36); c.closePath(); fill(D);
      break;
    }
    case 'mace':
      shaft(-26, 8, 3, H);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a - 0.32) * 5.5, -33 + Math.sin(a - 0.32) * 5.5);
        c.lineTo(Math.cos(a) * 11, -33 + Math.sin(a) * 11); c.lineTo(Math.cos(a + 0.32) * 5.5, -33 + Math.sin(a + 0.32) * 5.5); c.closePath(); fill(M);
      }
      c.beginPath(); c.arc(0, -33, 6.2, 0, 7); fill(D); c.fillStyle = M; c.beginPath(); c.arc(-1.8, -34.8, 1.8, 0, 7); c.fill();
      break;
    case 'trident':
      shaft(-34, 10, 2.6, H);
      c.lineWidth = 4.6; c.beginPath(); c.moveTo(-7, -40); c.lineTo(-7, -34); c.quadraticCurveTo(-7, -29, 0, -29); c.quadraticCurveTo(7, -29, 7, -34); c.lineTo(7, -40); c.stroke();
      c.lineWidth = 2.2; c.strokeStyle = M; c.stroke(); c.strokeStyle = '#150404';
      for (const sx of [-7, 0, 7]) { c.beginPath(); c.moveTo(sx - 1.8, sx ? -40 : -34); c.lineTo(sx, sx ? -46 : -48); c.lineTo(sx + 1.8, sx ? -40 : -34); c.closePath(); fill(M); }
      break;
    case 'scimitar':
      shaft(-2, 8, 3, H); c.fillStyle = D; c.fillRect(-5, -4, 10, 2.5);
      c.beginPath(); c.moveTo(-1.8, -4); c.bezierCurveTo(-3, -18, 5, -28, 15, -34); c.bezierCurveTo(12, -23, 9, -13, 2.6, -4); c.closePath(); fill(M);
      break;
    case 'halberd':
      shaft(-36, 10, 2.8, H);
      c.beginPath(); c.moveTo(1, -35); c.lineTo(14, -32); c.lineTo(14, -21); c.lineTo(1, -25); c.closePath(); fill(M);
      c.beginPath(); c.moveTo(-1, -27); c.lineTo(-8, -28); c.lineTo(-1, -32); c.closePath(); fill(D);
      c.beginPath(); c.moveTo(-1.8, -36); c.lineTo(0, -47); c.lineTo(1.8, -36); c.closePath(); fill(M);
      break;
    case 'club':   // spiked wooden club, or a bone
      c.beginPath(); c.moveTo(-2, 8); c.lineTo(-3, -12); c.quadraticCurveTo(-9, -22, -6, -32); c.quadraticCurveTo(0, -37, 6, -32); c.quadraticCurveTo(9, -22, 3, -12); c.lineTo(2, 8); c.closePath();
      fill(o.bone ? '#d9d2b8' : '#5a3d22'); c.fillStyle = o.bone ? '#9a927a' : '#b8bcc4';
      for (const [sx, sy, d] of [[-8, -30, -1], [8, -30, 1], [-8, -21, -1], [8, -21, 1], [0, -37, 0]]) {
        c.beginPath();
        if (d) { c.moveTo(sx - d * 2, sy - 3); c.lineTo(sx + d * 4, sy); c.lineTo(sx - d * 2, sy + 3); } else { c.moveTo(-3, sy + 1); c.lineTo(0, sy - 5); c.lineTo(3, sy + 1); }
        c.closePath(); c.fill();
      }
      break;
    case 'cleaver':
      shaft(0, 8, 3.2, H);
      c.beginPath(); c.moveTo(-3, -1); c.lineTo(-4, -30); c.quadraticCurveTo(0, -36, 10, -31); c.lineTo(8, -1); c.closePath(); fill(M);
      c.fillStyle = '#150404'; c.beginPath(); c.arc(3, -27, 1.4, 0, 7); c.fill();
      if (o.rust) { c.fillStyle = 'rgba(120,70,30,.55)'; c.fillRect(-3, -14, 11, 6); }
      break;
    case 'flail':
      shaft(-14, 8, 3, H);
      for (const [lx, ly] of [[2, -17], [6, -22], [9, -27]]) { c.beginPath(); c.arc(lx, ly, 1.7, 0, 7); fill(M); }
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3; c.beginPath(); c.moveTo(13 + Math.cos(a - 0.4) * 4, -33 + Math.sin(a - 0.4) * 4);
        c.lineTo(13 + Math.cos(a) * 9, -33 + Math.sin(a) * 9); c.lineTo(13 + Math.cos(a + 0.4) * 4, -33 + Math.sin(a + 0.4) * 4); c.closePath(); fill(M);
      }
      c.beginPath(); c.arc(13, -33, 5, 0, 7); fill(D);
      break;
    case 'hammer':
      shaft(-36, 10, 3.6, H);
      c.beginPath(); c.rect(-11, -46, 22, 13); fill(D);
      c.fillStyle = M; c.fillRect(-11, -46, 22, 3); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-11, -36, 22, 3);
      break;
    case 'scythe':
      shaft(-34, 10, 2.5, H);
      c.beginPath(); c.moveTo(0, -34); c.bezierCurveTo(-16, -40, -30, -30, -33, -16); c.bezierCurveTo(-24, -26, -12, -29, 0, -29); c.closePath(); fill(M);
      break;
    case 'sword':
      c.beginPath(); c.moveTo(-2.6, -7); c.lineTo(-2.2, -33); c.lineTo(0, -42); c.lineTo(2.2, -33); c.lineTo(2.6, -7); c.closePath(); fill(M);
      c.strokeStyle = D; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -38); c.stroke(); c.strokeStyle = '#150404';
      c.fillStyle = D; c.fillRect(-7, -8, 14, 2.8); c.fillStyle = H; c.fillRect(-1.6, -5.5, 3.2, 12);
      if (o.rust) { c.fillStyle = 'rgba(138,90,58,.6)'; c.fillRect(-2, -26, 4, 5); c.fillRect(-2, -15, 3, 4); }
      break;
    case 'lantern':
      shaft(-30, 10, 2.4, H);
      c.strokeStyle = D; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(7, -34, 6, -38); c.stroke(); c.strokeStyle = '#150404';
      orb(6, -43, o.glow || '#ffd060');
      c.beginPath(); c.moveTo(1.5, -48); c.lineTo(10.5, -48); c.lineTo(11.5, -38); c.lineTo(0.5, -38); c.closePath();
      c.fillStyle = 'rgba(255,240,190,.5)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = D; c.stroke(); c.strokeStyle = '#150404';
      break;
    case 'spear':
      shaft(-38, 12, 2.4, H);
      c.beginPath(); c.moveTo(0, -50); c.quadraticCurveTo(5.5, -43, 3, -37); c.lineTo(-3, -37); c.quadraticCurveTo(-5.5, -43, 0, -50); c.closePath(); fill(M);
      break;
    case 'staff': {   // witch staffs: five shapes, each with its own orb colour
      const st = o.style || 0, oc = o.orb || '#e060ff';
      if (st === 1) {   // crooked
        c.lineWidth = 5; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(5, -12, -3, -26); c.quadraticCurveTo(-7, -34, 0, -38); c.stroke();
        c.lineWidth = 2.6; c.strokeStyle = H; c.stroke(); c.strokeStyle = '#150404';
        orb(0, -41, oc);
      } else if (st === 2) {   // crescent moon
        shaft(-32, 10, 2.5, H);
        c.beginPath(); c.arc(0, -38, 7, Math.PI * 0.3, Math.PI * 1.7, false); c.arc(2.6, -38, 5.4, Math.PI * 1.62, Math.PI * 0.38, true); c.closePath(); fill('#e8f2ff');
        orb(3, -38, oc);
      } else if (st === 3) {   // skull
        shaft(-32, 10, 2.5, H); orb(0, -40, oc);
        c.beginPath(); c.arc(0, -40, 5, 0, 7); fill('#e8e0c8'); c.fillStyle = '#e8e0c8'; c.fillRect(-3, -37, 6, 4);
        c.fillStyle = '#150404'; c.beginPath(); c.arc(-2, -41, 1.3, 0, 7); c.arc(2, -41, 1.3, 0, 7); c.fill();
      } else if (st === 4) {   // twin branches
        shaft(-28, 10, 2.5, H);
        c.lineWidth = 4.6; c.beginPath(); c.moveTo(0, -28); c.quadraticCurveTo(-9, -34, -5, -44); c.moveTo(0, -28); c.quadraticCurveTo(9, -34, 5, -44); c.stroke();
        c.lineWidth = 2.2; c.strokeStyle = H; c.stroke(); c.strokeStyle = '#150404';
        orb(0, -39, oc);
      } else {   // classic prongs
        shaft(-34, 10, 2.5, H);
        c.strokeStyle = '#2a1a10'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-1, -31); c.quadraticCurveTo(-7, -36, -3, -43); c.moveTo(1, -31); c.quadraticCurveTo(7, -36, 3, -43); c.stroke();
        c.strokeStyle = '#150404'; orb(0, -39, oc);
      }
      break;
    }
    case 'shotgun':
      c.fillStyle = '#5a3a1c'; c.fillRect(-2.2, 2, 4.4, 13);
      c.beginPath(); c.rect(-2.8, -8, 5.6, 11); fill('#3a3a44');
      c.beginPath(); c.rect(-2.3, -36, 4.6, 28); fill('#2a2a32');
      c.fillStyle = '#6a4a2a'; c.fillRect(-3.2, -22, 6.4, 7);
      break;
    case 'rifle':
      c.fillStyle = '#4a3418'; c.fillRect(-2, 2, 4, 14);
      c.beginPath(); c.rect(-2.6, -10, 5.2, 13); fill('#34343e');
      c.beginPath(); c.rect(-1.5, -44, 3, 34); fill('#26262e');
      c.beginPath(); c.rect(-2.2, -30, 4.4, 8); fill('#1a1a22'); c.fillStyle = '#7ac8ff'; c.fillRect(-1, -29, 2, 1.6);
      break;
    case 'rock':
      c.beginPath(); c.moveTo(-6, 2); c.lineTo(-7, -5); c.lineTo(-2, -10); c.lineTo(5, -9); c.lineTo(8, -2); c.lineTo(4, 4); c.closePath(); fill('#8a8a82');
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-3, -8, 5, 2);
      break;
  }
  if (flash) {
    const fy = kind === 'rifle' ? -46 : -38;
    c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(0, fy, 7, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, fy, 3.2, 0, 7); c.fill();
  }
  c.restore();
}
