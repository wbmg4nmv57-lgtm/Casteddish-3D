/* ######################################################################
   CASTEDDISH - Mostri
   Giocatore e tipi di nemico, stato di gioco, strumenti di disegno, aspetto dei mostri e dei boss.
   Sezioni, in ordine: characters.js, state.js, art-helpers.js, mob-styles.js, mob-drawing.js, boss-art.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Personaggi: giocatore e tipi di nemico
   Oggetto player, statistiche dei nemici (TYPES: vita, velocita,
   danno) e mkEnemy() che crea un nemico.
   ====================================================================== */

const player = { x: 3.5, y: 3.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.9, moveSpeed: 3.2, rotSpeed: 2.4, radius: 0.25, hp: 100, kills: 0, pitch: 0 };

const TYPES = {
  demon: { hp: 100, spd: 1.3, dmg: 12, sc: 1 },
  ghoul: { hp: 170, spd: 1.75, dmg: 16, sc: 0.95 },
  wraith: { hp: 140, spd: 2.0, dmg: 20, sc: 1, lift: 0.12 },
  witch: { hp: 260, spd: 1.5, dmg: 14, sc: 1 },
  boss: { hp: 1500, spd: 0.75, dmg: 28, sc: 1.9, r: 1.0 },
  bk: { hp: 900, spd: 0.8, dmg: 22, sc: 1.7, r: 0.9, boss: true, name: 'RE SCHELETRO' },
  golem: { hp: 1500, spd: 0.6, dmg: 30, sc: 2.1, r: 1.1, boss: true, name: 'GOLEM DI PIETRA' },
  lich: { hp: 800, spd: 1.0, dmg: 18, sc: 1.6, r: 0.7, lift: 0.2, boss: true, name: 'NEGROMANTE' },
  knight: { hp: 1100, spd: 1.3, dmg: 28, sc: 1.8, r: 0.85, boss: true, name: 'CAVALIERE NERO' },
  spider: { hp: 700, spd: 2.2, dmg: 18, sc: 1.6, r: 0.9, boss: true, name: 'RAGNO GIGANTE' },
  inferno: { hp: 1000, spd: 0.9, dmg: 26, sc: 2.0, r: 1.0, boss: true, name: 'DEMONE INFERNALE' },
  cyclops: { hp: 1600, spd: 0.7, dmg: 32, sc: 2.2, r: 1.1, boss: true, name: 'CICLOPE' },
  vamp: { hp: 850, spd: 1.8, dmg: 20, sc: 1.6, r: 0.7, boss: true, name: 'SIGNORE DEI VAMPIRI' },
  wyrm: { hp: 1300, spd: 1.0, dmg: 24, sc: 2.0, r: 1.0, boss: true, name: 'DRAGO DI GHIACCIO' },
  storm: { hp: 1200, spd: 1.1, dmg: 22, sc: 1.8, r: 0.8, lift: 0.3, boss: true, name: 'ARCIMAGO DELLA TEMPESTA' },
  skel: { hp: 30, spd: 2.4, dmg: 6, sc: 0.5, r: 0.3, minion: true }
};
const mkEnemy = (x, y, type) => {
  const T = TYPES[type], z0 = T.lift || 0, v = Math.floor(Math.random() * VARS[type].length), hs = (VARS[type][v][2] && VARS[type][v][2].hs) || 1;
  const mo = VARS[type][v][2] || {}, roll = Math.random(), bh = mo.abil ? 'normal' : type === 'demon' ? (roll < 0.35 ? 'normal' : roll < 0.65 ? 'flank' : roll < 0.85 ? 'feint' : 'arc') : type === 'ghoul' || type === 'witch' ? (roll < 0.33 ? 'normal' : roll < 0.55 ? 'flank' : roll < 0.7 ? 'feint' : roll < 0.84 ? 'arc' : 'coward') : type === 'wraith' ? (roll < 0.45 ? 'normal' : roll < 0.75 ? 'flank' : 'arc') : type === 'skel' ? (roll < 0.5 ? 'normal' : roll < 0.8 ? 'arc' : 'flank') : 'normal';
  return { x, y, type, hp: T.hp * DIFF.hp, alive: true, state: 'walk', frame: 0, animTimer: 0, deathTimer: 0,
    r: T.r || 0.45, z0, z1: z0 + T.sc * hs + 0.1, shotT: 1 + Math.random(), cast: 0, t: 0, waves: 0, sumT: 0, mhp: T.hp * DIFF.hp, vT: 1 + Math.random() * 3, vC: 0, v, hs, bh, bs: 'idle', bt: 0, act: false, back: false, sp: mo.sp || 1, pw: mo.pw || 1, abil: mo.abil || null, ai: null, side: Math.random() < 0.5 ? 1 : -1, escT: 0, path: null, pi: 0 };
};

/* ======================================================================
   CASTEDDISH - Stato di gioco e controlli
   Liste di nemici e proiettili, stato dei comandi (tastiera, joystick)
   e variabili di fuoco.
   ====================================================================== */

let enemies = [], hordes = [];
let projectiles = [], explosions = [];
let isFiring = false, fireAnimFrame = 0, fireTimer = 0, fireCooldown = 0, audioCtx = null;

// Keyboard / rotation-button state
const input = { fwd: false, back: false, strafeL: false, strafeR: false, rotL: false, rotR: false };
// Keyboard commands switch on only on a PC (mouse + hover) or as soon as a real keyboard key is pressed (tablet or phone with a keyboard attached)
const kb = { on: false, mouse: false };
let menuApi = null;
// Analog joystick state: x (right +), y (down +), both in [-1, 1]
const joy = { x: 0, y: 0, id: null };

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

/* ======================================================================
   CASTEDDISH - Grafica dei boss
   Dieci boss disegnati a mano: Re Scheletro, Golem, Negromante,
   Cavaliere Nero, Ragno, Demone Infernale, Ciclope, Vampiro, Viverna,
   Arcimago.
   ====================================================================== */

// ---- Boss art: ten different bosses, each drawn by hand ----
const bo = (c, fill, lw) => { c.fillStyle = fill; c.fill(); if (lw !== 0) { c.lineWidth = lw || 2; c.strokeStyle = '#100505'; c.lineJoin = 'round'; c.stroke(); } };
const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); bo(c, fill, lw); };
const ell = (c, x, y, rx, ry, fill, lw, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 7); bo(c, fill, lw); };
const lgr = (c, x0, y0, x1, y1, ...cols) => { const g = c.createLinearGradient(x0, y0, x1, y1); cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k)); return g; };
const glowAt = (c, x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, col + '00'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
function bossFrame(c, mode, f, draw) {
  c.clearRect(0, 0, DS, DS); c.scale(DS / 96, DS / 96);
  const ph = f / 8 * Math.PI * 2, a = { s: Math.sin(ph), ph, u: f / 3, mode, f };
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(48, 91, 30, 5, 0, 0, 7); c.fill();
  if (mode === 'die') { c.translate(48, 90); c.rotate([0.04, 0.2, 0.4, 0.7, 0.95][f]); c.scale(1, [1, 0.92, 0.78, 0.58, 0.4][f]); c.translate(-48, -90); }
  c.save(); c.translate(0, mode === 'walk' ? -Math.abs(a.s) * 2.5 : mode === 'attack' ? -3 * (1 - a.u) : 0);
  draw(c, a);
  c.restore();
  finish(c, DS);
}
const BOSSART = {};
BOSSART.bk = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Skeleton King: crown, royal cape, glowing mace
  const s = a.s, u = a.u, atk = a.mode === 'attack', bone = '#e9e1c9', shade = '#b0a688', pos = Math.max(0, s), neg = Math.max(0, -s);
  poly(c, [[30, 26], [66, 26], [80, 90], [16, 90]], lgr(c, 0, 26, 0, 90, '#7a1f8a', '#2a0a3a'), 2);
  c.strokeStyle = '#d4a017'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 90); c.lineTo(80, 90); c.stroke();
  limb(c, 41, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 4.5, bone); limb(c, 55, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 4.5, bone);
  ell(c, 48, 62, 12, 5, shade); ell(c, 48, 43, 15, 18, bone);
  c.strokeStyle = '#7d7358'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(48, 28); c.lineTo(48, 60);
  for (let i = 0; i < 5; i++) { c.moveTo(35, 33 + i * 5.5); c.quadraticCurveTo(48, 37 + i * 5.5, 61, 33 + i * 5.5); } c.stroke();
  ell(c, 31, 29, 10, 6, bone); ell(c, 65, 29, 10, 6, bone);
  poly(c, [[24, 27], [20, 18], [29, 24]], '#cfc6a8'); poly(c, [[72, 27], [76, 18], [67, 24]], '#cfc6a8');
  limb(c, 31, 31, -0.4 - 0.3 * s, 14, 0.5, 15, 3.8, bone);
  const AR = atk ? [2.6 - 2.3 * u, -0.4] : [0.4 - 0.3 * s, -0.5], hr = limb(c, 65, 31, AR[0], 14, AR[1], 15, 3.8, bone);
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -0.2 + u * 2.2 : 0.15);
  c.strokeStyle = '#100505'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -30); c.stroke(); c.strokeStyle = '#d4a017'; c.lineWidth = 3; c.stroke();
  glowAt(c, 0, -37, 9, '#9a3aff'); ell(c, 0, -37, 5.5, 5.5, '#6a1ad0', 1.5);
  for (let i = 0; i < 6; i++) { const q = i * 1.05; poly(c, [[Math.cos(q) * 5, -37 + Math.sin(q) * 5], [Math.cos(q + 0.3) * 9, -37 + Math.sin(q + 0.3) * 9], [Math.cos(q + 0.6) * 5, -37 + Math.sin(q + 0.6) * 5]], '#d4a017', 1); }
  c.restore();
  ell(c, 48, 21, 11, 10, bone); ell(c, 48, 31, 7, 3.5, shade);
  ell(c, 43, 20, 3.4, 4, '#120a0a', 1); ell(c, 53, 20, 3.4, 4, '#120a0a', 1); glowAt(c, 43, 20, 5, '#ff8a1a'); glowAt(c, 53, 20, 5, '#ff8a1a');
  poly(c, [[47, 24], [49, 24], [48, 27]], '#2a1a1a', 1);
  c.strokeStyle = '#2a1a1a'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 5; i++) { c.moveTo(43 + i * 2.5, 29); c.lineTo(43 + i * 2.5, 32); } c.stroke();
  poly(c, [[37, 13], [38, 2], [43, 9], [48, 0], [53, 9], [58, 2], [59, 13]], '#d4a017', 1.5);
  ell(c, 48, 9, 2, 2, '#e02a3a', 1); ell(c, 40, 11, 1.4, 1.4, '#3a7aff', 0.6); ell(c, 56, 11, 1.4, 1.4, '#3affa0', 0.6);
});
BOSSART.golem = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Stone Golem: mossy boulders, glowing runes, huge fists
  const s = a.s, u = a.u, atk = a.mode === 'attack', rock = lgr(c, 0, 14, 0, 92, '#9a9a92', '#4a4a44'), dark = '#3c3c38';
  poly(c, [[29, 64], [45, 64], [47, 91], [27, 91]], rock, 2.5); poly(c, [[51, 64], [67, 64], [69, 91], [49, 91]], rock, 2.5);
  c.fillStyle = dark; c.fillRect(27, 86, 20, 5); c.fillRect(49, 86, 20, 5);
  poly(c, [[22, 38], [30, 22], [48, 18], [66, 22], [74, 38], [70, 62], [58, 70], [38, 70], [26, 62]], rock, 3);
  ell(c, 36, 26, 8, 3.5, '#4f7a3a', 0); ell(c, 62, 66, 9, 3.5, '#4f7a3a', 0); ell(c, 28, 50, 4, 6, '#587f3e', 0);
  c.strokeStyle = '#2a2a26'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(34, 30); c.lineTo(40, 44); c.lineTo(36, 58); c.moveTo(60, 28); c.lineTo(56, 42); c.lineTo(62, 56); c.stroke();
  c.strokeStyle = '#ff8a1a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(48, 28); c.lineTo(44, 40); c.lineTo(50, 52); c.lineTo(46, 64); c.moveTo(44, 40); c.lineTo(36, 42); c.moveTo(50, 52); c.lineTo(58, 50); c.stroke();
  glowAt(c, 48, 46, 9, '#ff9a2a');
  const up = atk ? 2.7 - 2.5 * u : 0.15 + 0.25 * s;
  for (const sd of [-1, 1]) {
    const hx = limb(c, 48 + sd * 26, 36, sd * (atk ? up : 0.25 + 0.25 * sd * s), 16, sd * (atk ? 0.3 : 0.2), 17, 11, '#7a7a72');
    ell(c, hx[0], hx[1] + 4, 11, 10, rock, 3); ell(c, hx[0] - 4, hx[1] + 1, 3, 3, dark, 0); ell(c, hx[0] + 4, hx[1] + 1, 3, 3, dark, 0);
  }
  poly(c, [[38, 16], [58, 16], [60, 26], [36, 26]], rock, 2.5); poly(c, [[40, 10], [56, 10], [58, 16], [38, 16]], '#8a8a82', 2);
  c.fillStyle = '#ffd23a'; c.fillRect(41, 18, 5, 3); c.fillRect(51, 18, 5, 3); glowAt(c, 43.5, 19.5, 6, '#ffc040'); glowAt(c, 53.5, 19.5, 6, '#ffc040');
});
BOSSART.lich = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Necromancer: floating robe, skull face, green-flame staff
  const s = a.s, u = a.u, atk = a.mode === 'attack';
  glowAt(c, 48, 50, 44, '#2aff6a');
  poly(c, [[34, 30], [62, 30], [78, 90], [70, 82], [62, 92], [54, 84], [46, 94], [38, 84], [30, 92], [24, 82], [18, 90]], lgr(c, 0, 30, 0, 94, '#2a2a3a', '#0a0a14'), 2);
  c.strokeStyle = 'rgba(80,255,140,.45)'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(40 + i * 6, 40); c.quadraticCurveTo(36 + i * 8 + s * 3, 66, 30 + i * 12, 88); } c.stroke();
  ell(c, 48, 42, 11, 9, '#cfc8b0', 1.5); c.strokeStyle = '#6a644e'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(39, 38 + i * 4); c.lineTo(57, 38 + i * 4); } c.stroke();
  limb(c, 34, 34, -0.5 - 0.2 * s, 14, 0.7, 14, 3, '#cfc8b0');
  const AR = atk ? [2.4 - 0.5 * u, -0.5] : [0.5 + 0.2 * s, -0.7], hr = limb(c, 62, 34, AR[0], 14, AR[1], 14, 3, '#cfc8b0');
  c.save(); c.translate(hr[0], hr[1]); c.strokeStyle = '#100505'; c.lineWidth = 4.6; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -34); c.stroke(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 2.6; c.stroke();
  glowAt(c, 0, -40, 11 + (atk ? 6 * u : 0), '#3aff7a'); ell(c, 0, -40, 5, 5, '#8affb0', 1.5);
  for (const sd of [-1, 1]) { c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(sd * 8, -34, sd * 5, -44); c.stroke(); }
  c.restore();
  poly(c, [[30, 22], [48, 4], [66, 22], [62, 34], [34, 34]], '#1a1a28', 2);
  ell(c, 48, 24, 9, 9.5, '#e8e0c8', 1.5); poly(c, [[40, 30], [56, 30], [52, 35], [44, 35]], '#d8d0b8', 1.2);
  ell(c, 44, 23, 2.6, 3.6, '#0a0a0a', 1); ell(c, 52, 23, 2.6, 3.6, '#0a0a0a', 1); glowAt(c, 44, 23, 5, '#3aff7a'); glowAt(c, 52, 23, 5, '#3aff7a');
  poly(c, [[47, 27], [49, 27], [48, 29.5]], '#2a2a2a', 0.8); c.fillStyle = '#e0d8c0'; c.fillRect(43, 33, 10, 1.5);
});
BOSSART.knight = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Black Knight: plate armour, shield, runic great sword
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), steel = lgr(c, 0, 0, 96, 0, '#1a1a22', '#4a4a58', '#1a1a22'), trim = '#c8102e';
  poly(c, [[28, 26], [68, 26], [84, 90], [12, 90]], lgr(c, 0, 26, 0, 90, '#a01022', '#400510'), 2);
  limb(c, 40, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 7, '#2a2a34'); limb(c, 56, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 7, '#2a2a34');
  ell(c, 38, 90, 7, 3.5, '#14141a', 1.5); ell(c, 58, 90, 7, 3.5, '#14141a', 1.5);
  poly(c, [[26, 62], [70, 62], [64, 74], [32, 74]], steel, 2.5);
  poly(c, [[26, 32], [70, 32], [66, 62], [30, 62]], steel, 3); c.strokeStyle = trim; c.lineWidth = 2; c.beginPath(); c.moveTo(48, 32); c.lineTo(48, 62); c.moveTo(30, 46); c.lineTo(66, 46); c.stroke();
  poly(c, [[44, 38], [52, 38], [52, 44], [48, 48], [44, 44]], trim, 1);
  for (const sd of [-1, 1]) { ell(c, 48 + sd * 24, 32, 11, 8, steel, 2.5); poly(c, [[48 + sd * 22, 26], [48 + sd * 28, 14], [48 + sd * 30, 28]], '#2a2a34', 2); }
  const sh = limb(c, 24, 36, -0.5 - 0.2 * s, 12, 0.4, 12, 7, '#2a2a34');
  poly(c, [[sh[0] - 13, sh[1] - 15], [sh[0] + 9, sh[1] - 15], [sh[0] + 9, sh[1] + 8], [sh[0] - 2, sh[1] + 20], [sh[0] - 13, sh[1] + 8]], '#22222c', 3);
  poly(c, [[sh[0] - 7, sh[1] - 8], [sh[0] + 3, sh[1] - 8], [sh[0] - 2, sh[1] + 8]], trim, 1.2);
  const AR = atk ? [2.6 - 2.4 * u, -0.4] : [0.4 - 0.3 * s, -0.4], hr = limb(c, 72, 36, AR[0], 13, AR[1], 13, 7, '#2a2a34');
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -0.3 + u * 2.4 : 0.35);
  c.fillStyle = '#7a7a88'; c.fillRect(-6, -2, 12, 4); poly(c, [[-3.4, -4], [3.4, -4], [4.2, -44], [0, -54], [-4.2, -44]], lgr(c, -4, 0, 4, 0, '#8a8a98', '#e8e8f4', '#8a8a98'), 2);
  c.strokeStyle = '#ff2a3a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -46); c.stroke(); glowAt(c, 0, -26, 8, '#ff2a3a'); c.restore();
  poly(c, [[36, 10], [60, 10], [62, 28], [34, 28]], steel, 3); c.fillStyle = '#ff2a2a'; c.fillRect(38, 17, 20, 3); glowAt(c, 48, 18.5, 9, '#ff3a3a');
  poly(c, [[36, 12], [28, 0], [40, 10]], '#d8d8e0', 2); poly(c, [[60, 12], [68, 0], [56, 10]], '#d8d8e0', 2);
});
BOSSART.spider = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Giant Spider: eight legs, skull-marked abdomen, six eyes, venom fangs
  const ph = a.ph, atk = a.mode === 'attack', u = a.u;
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const w = Math.sin(ph + i * 1.3 + (sd > 0 ? 0 : Math.PI)) * 4, lift = atk && i === 0 ? -14 * u : 0;
    const kx = 48 + sd * (24 + i * 3), ky = 34 + i * 6 + lift, fx = 48 + sd * (40 + i * 3), fy = 88 - i * 4 + w * 0.3;
    c.strokeStyle = '#100505'; c.lineWidth = 5.5; c.beginPath(); c.moveTo(48 + sd * 10, 52); c.lineTo(kx, ky); c.lineTo(fx + w * sd, fy); c.stroke();
    c.strokeStyle = '#3a2a4a'; c.lineWidth = 3; c.stroke();
  }
  ell(c, 48, 64, 20, 22, lgr(c, 0, 42, 0, 88, '#4a2a5a', '#14081c'), 3);
  poly(c, [[48, 50], [54, 58], [52, 70], [48, 76], [44, 70], [42, 58]], '#d8c8e0', 0); ell(c, 45, 62, 2, 2.6, '#14081c', 0); ell(c, 51, 62, 2, 2.6, '#14081c', 0);
  c.fillStyle = '#c8102e'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(38 + i * 7.5, 72 + (i % 2) * 6, 1.8, 0, 7); c.fill(); }
  ell(c, 48, 38, 13, 11, lgr(c, 0, 28, 0, 48, '#5a3a6a', '#24103a'), 3);
  for (const e of [[42, 34, 2.8], [54, 34, 2.8], [38, 38, 2], [58, 38, 2], [45, 31, 1.6], [51, 31, 1.6]]) { glowAt(c, e[0], e[1], e[2] * 2.2, '#ff2a2a'); ell(c, e[0], e[1], e[2], e[2], '#ff6a4a', 0.8); }
  for (const sd of [-1, 1]) { poly(c, [[48 + sd * 4, 44], [48 + sd * 9, atk ? 54 : 52], [48 + sd * 6, 56]], '#e8e0d8', 1.5); c.fillStyle = '#7aff3a'; c.beginPath(); c.arc(48 + sd * 8, 56 + (a.f % 2) * 2, 1.2, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * 0.8; c.moveTo(48 + Math.cos(q) * 17, 62 + Math.sin(q) * 19); c.lineTo(48 + Math.cos(q) * 21, 62 + Math.sin(q) * 23); } c.stroke();
});
BOSSART.inferno = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Infernal Demon: bat wings, lava cracks, flame mane, whip of fire
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), fl = Math.sin(a.ph * 2);
  glowAt(c, 48, 46, 46, '#ff5a1a');
  for (const sd of [-1, 1]) {
    poly(c, [[48 + sd * 16, 30], [48 + sd * 46, 6 + fl * 2], [48 + sd * 40, 24], [48 + sd * 46, 34], [48 + sd * 34, 40], [48 + sd * 38, 52], [48 + sd * 22, 48]], lgr(c, 48, 0, 48 + sd * 46, 0, '#6a0a0a', '#b81a0a'), 2.5);
    c.strokeStyle = '#ff9a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(48 + sd * 18, 32); c.lineTo(48 + sd * 44, 8 + fl * 2); c.moveTo(48 + sd * 24, 40); c.lineTo(48 + sd * 40, 26); c.stroke();
  }
  limb(c, 40, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 8, '#7a1008'); limb(c, 56, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 8, '#7a1008');
  ell(c, 38, 91, 8, 3, '#1a0404', 1.5); ell(c, 58, 91, 8, 3, '#1a0404', 1.5);
  poly(c, [[26, 34], [70, 34], [66, 64], [30, 64]], lgr(c, 0, 34, 0, 64, '#c8200a', '#6a0a04'), 3);
  c.strokeStyle = '#ffae2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(48, 36); c.lineTo(44, 46); c.lineTo(50, 54); c.lineTo(46, 62); c.moveTo(34, 42); c.lineTo(41, 48); c.moveTo(62, 44); c.lineTo(55, 50); c.stroke(); glowAt(c, 48, 50, 8, '#ff9a2a');
  limb(c, 28, 36, -0.5 - 0.3 * s, 15, 0.5, 16, 9, '#8a1208');
  const AR = atk ? [2.6 - 2.3 * u, -0.4] : [0.5 - 0.3 * s, -0.5], hr = limb(c, 68, 36, AR[0], 15, AR[1], 16, 9, '#8a1208');
  c.save(); c.translate(hr[0], hr[1]); c.strokeStyle = '#ff8a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0);
  const wp = atk ? 1 : 0.5; c.bezierCurveTo(-12 * wp, -18, 14, -26 * wp, 4 + 14 * u, -40); c.stroke(); glowAt(c, 4 + 14 * u, -40, 9, '#ffd23a'); c.restore();
  poly(c, [[34, 14], [62, 14], [64, 32], [32, 32]], '#a81408', 3);
  for (const sd of [-1, 1]) { c.strokeStyle = '#100505'; c.lineWidth = 5; c.beginPath(); c.moveTo(48 + sd * 12, 14); c.quadraticCurveTo(48 + sd * 22, 6, 48 + sd * 18, -2); c.stroke(); c.strokeStyle = '#e8d8c0'; c.lineWidth = 3; c.stroke(); }
  c.fillStyle = '#ffd23a'; c.fillRect(38, 20, 7, 3); c.fillRect(51, 20, 7, 3); glowAt(c, 41.5, 21.5, 7, '#ffb020'); glowAt(c, 54.5, 21.5, 7, '#ffb020');
  c.fillStyle = '#1a0404'; c.fillRect(40, 27, 16, 3); c.fillStyle = '#f0e8d0'; for (let i = 0; i < 4; i++) c.fillRect(41 + i * 4, 27, 2, 2);
  for (let i = 0; i < 5; i++) { const x = 38 + i * 5; poly(c, [[x, 14], [x + 2.5, 2 + fl * 2 + (i % 2) * 3], [x + 5, 14]], '#ff9a1a', 0); }
});
BOSSART.cyclops = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Cyclops: one huge eye, tusks, spiked tree-trunk club
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), skin = lgr(c, 0, 14, 0, 90, '#b09a78', '#6a5a42');
  limb(c, 38, 62, -0.1 - 0.25 * pos, 14, 0.35 * pos, 16, 12, '#8a7658'); limb(c, 58, 62, 0.1 + 0.25 * neg, 14, -0.35 * neg, 16, 12, '#8a7658');
  ell(c, 36, 90, 10, 4, '#4a3a28', 2); ell(c, 60, 90, 10, 4, '#4a3a28', 2);
  poly(c, [[22, 36], [30, 24], [66, 24], [74, 36], [70, 66], [26, 66]], skin, 3);
  c.strokeStyle = 'rgba(60,40,20,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(48, 30); c.lineTo(48, 62); c.moveTo(32, 40); c.quadraticCurveTo(40, 46, 47, 40); c.moveTo(64, 40); c.quadraticCurveTo(56, 46, 49, 40); c.moveTo(36, 54); c.lineTo(46, 52); c.moveTo(60, 54); c.lineTo(50, 52); c.stroke();
  c.strokeStyle = '#7a2a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(56, 30); c.lineTo(64, 44); c.moveTo(58, 34); c.lineTo(62, 33); c.stroke();
  poly(c, [[28, 62], [68, 62], [64, 78], [32, 78]], '#5a3a22', 2.5); c.fillStyle = '#d4a017'; c.fillRect(44, 62, 8, 5);
  limb(c, 24, 36, -0.5 - 0.3 * s, 15, 0.5, 16, 12, '#a08a68');
  const AR = atk ? [2.7 - 2.5 * u, -0.4] : [0.5 - 0.3 * s, -0.5], hr = limb(c, 72, 36, AR[0], 15, AR[1], 16, 12, '#a08a68');
  ell(c, hr[0], hr[1] + 2, 8, 7, '#a08a68', 2.5);
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -0.2 + u * 2.2 : 0.25);
  poly(c, [[-4, 10], [4, 10], [8, -30], [10, -44], [-10, -44], [-8, -30]], lgr(c, -10, 0, 10, 0, '#4a3018', '#7a5a34', '#4a3018'), 2.5);
  for (const [x, y] of [[-8, -30], [8, -34], [-9, -40], [9, -42], [0, -46]]) poly(c, [[x - 2, y + 2], [x + (x < 0 ? -5 : 5), y - 1], [x + 2, y - 3]], '#cfc8b0', 1);
  c.restore();
  ell(c, 48, 20, 16, 14, skin, 3);
  ell(c, 48, 19, 8.5, 7, '#f4f0e0', 2); glowAt(c, 48, 19, 12, '#ff3a2a'); ell(c, 48 + Math.sin(a.ph) * 1.5, 19, 4.2, 4.2, '#d01818', 1); ell(c, 48 + Math.sin(a.ph) * 1.5, 19, 1.8, 3.2, '#000000', 0);
  poly(c, [[36, 12], [48, 8], [60, 12], [58, 14], [38, 14]], '#5a3a22', 1.5);
  c.fillStyle = '#2a0a0a'; c.fillRect(40, 28, 16, 4); for (let i = 0; i < 4; i++) { c.fillStyle = '#e8e0c8'; c.fillRect(41 + i * 4, 28, 2, 2.2); }
  poly(c, [[38, 28], [34, 36], [42, 30]], '#f0e8d0', 1.2); poly(c, [[58, 28], [62, 36], [54, 30]], '#f0e8d0', 1.2);
});
BOSSART.vamp = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Vampire Lord: bat-wing cape, high collar, rapier, fangs
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), flap = Math.sin(a.ph);
  for (const sd of [-1, 1]) poly(c, [[48 + sd * 12, 30], [48 + sd * (44 + (atk ? 6 : 0)), 12 + flap * 3], [48 + sd * 38, 36], [48 + sd * 44, 54], [48 + sd * 30, 50], [48 + sd * 28, 74], [48 + sd * 16, 60]], lgr(c, 48, 0, 48 + sd * 44, 0, '#5a0a1a', '#1a0208'), 2.5);
  limb(c, 42, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 5, '#14101a'); limb(c, 54, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 5, '#14101a');
  ell(c, 40, 90, 6, 3, '#0a0a0a', 1.5); ell(c, 56, 90, 6, 3, '#0a0a0a', 1.5);
  poly(c, [[34, 32], [62, 32], [58, 64], [38, 64]], '#1a1420', 3); poly(c, [[44, 32], [52, 32], [50, 60], [46, 60]], '#e8e0e8', 1.5);
  c.fillStyle = '#c8102e'; c.beginPath(); c.moveTo(48, 36); c.lineTo(52, 42); c.lineTo(48, 48); c.lineTo(44, 42); c.closePath(); c.fill();
  poly(c, [[30, 24], [38, 32], [34, 44], [28, 30]], '#c8102e', 2); poly(c, [[66, 24], [58, 32], [62, 44], [68, 30]], '#c8102e', 2);
  limb(c, 32, 36, -0.4 - 0.3 * s, 14, 0.5, 15, 4, '#1a1420');
  const AR = atk ? [1.2 - 0.6 * u, -0.3] : [0.4 - 0.3 * s, -0.5], hr = limb(c, 64, 36, AR[0], 14, AR[1], 15, 4, '#1a1420');
  ell(c, hr[0], hr[1], 3, 3, '#e8e0e8', 1);
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -1.1 + u * 0.4 : 0.5);
  c.fillStyle = '#d4a017'; c.beginPath(); c.arc(0, -1, 5, 0, 3.14); c.fill(); poly(c, [[-1, -3], [1, -3], [0.4, -48], [-0.4, -48]], '#e8e8f4', 1.4); c.restore();
  ell(c, 48, 22, 10, 11, '#e8dce0', 2);
  poly(c, [[38, 18], [42, 8], [48, 10], [54, 8], [58, 18], [52, 14], [44, 14]], '#0a0610', 2);
  c.fillStyle = '#ff2a3a'; c.fillRect(42, 21, 4, 2); c.fillRect(51, 21, 4, 2); glowAt(c, 44, 22, 6, '#ff2a3a'); glowAt(c, 53, 22, 6, '#ff2a3a');
  c.fillStyle = '#7a1a2a'; c.fillRect(44, 28, 8, 2); poly(c, [[44, 29], [45.5, 29], [45, 33]], '#ffffff', 0.8); poly(c, [[50.5, 29], [52, 29], [51, 33]], '#ffffff', 0.8);
});
BOSSART.wyrm = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Frost Wyrm: ice wings, long neck, frost breath
  const u = a.u, atk = a.mode === 'attack', fl = Math.sin(a.ph), ice = lgr(c, 0, 10, 0, 90, '#bfe8ff', '#2a6ab8');
  glowAt(c, 48, 50, 46, '#6ac8ff');
  for (const sd of [-1, 1]) {
    poly(c, [[48 + sd * 14, 42], [48 + sd * 46, 14 + fl * 4], [48 + sd * 40, 34], [48 + sd * 46, 50], [48 + sd * 32, 52], [48 + sd * 30, 66], [48 + sd * 20, 56]], lgr(c, 48, 0, 48 + sd * 46, 0, '#8ad8ff', '#2a78c8'), 2.5);
    c.strokeStyle = '#e8f8ff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(48 + sd * 16, 44); c.lineTo(48 + sd * 44, 16 + fl * 4); c.moveTo(48 + sd * 22, 50); c.lineTo(48 + sd * 40, 36); c.stroke();
  }
  c.lineCap = 'round'; c.strokeStyle = '#100505'; c.lineWidth = 17; c.beginPath(); c.moveTo(48, 90); c.bezierCurveTo(20, 84, 24, 62, 48, 58); c.stroke(); c.strokeStyle = '#4a98d8'; c.lineWidth = 13; c.stroke();
  poly(c, [[30, 46], [66, 46], [62, 84], [34, 84]], ice, 3); ell(c, 48, 64, 10, 14, '#e8f8ff', 1.5);
  for (let i = 0; i < 4; i++) { c.strokeStyle = 'rgba(40,80,140,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(40, 52 + i * 7); c.lineTo(56, 52 + i * 7); c.stroke(); }
  glowAt(c, 48, 52, 8, '#6ac8ff');
  for (let i = 0; i < 4; i++) poly(c, [[44 + i * 3, 46], [46 + i * 3, 36 - (i % 2) * 3], [48 + i * 3, 46]], '#e8f8ff', 1.2);
  const lx = atk ? u * 10 : fl * 2;
  c.strokeStyle = '#100505'; c.lineWidth = 15; c.beginPath(); c.moveTo(48, 48); c.bezierCurveTo(40 - lx, 36, 60 - lx, 28, 48 - lx, 18); c.stroke(); c.strokeStyle = '#5aa8e8'; c.lineWidth = 11; c.stroke();
  const hx = 48 - lx, hy = 14;
  poly(c, [[hx - 12, hy + 4], [hx + 12, hy + 4], [hx + 10, hy - 8], [hx - 10, hy - 8]], '#6ab0f0', 3);
  poly(c, [[hx - 8, hy + 4], [hx + 8, hy + 4], [hx + 5, hy + 12 + (atk ? 5 * u : 0)], [hx - 5, hy + 12 + (atk ? 5 * u : 0)]], '#4a90d8', 2.5);
  c.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) c.fillRect(hx - 6 + i * 4, hy + 5, 1.8, 3);
  for (const sd of [-1, 1]) { poly(c, [[hx + sd * 8, hy - 6], [hx + sd * 18, hy - 18], [hx + sd * 12, hy - 4]], '#e8f8ff', 1.8); ell(c, hx + sd * 5, hy - 2, 2.4, 2.4, '#e8ffff', 0.8); glowAt(c, hx + sd * 5, hy - 2, 6, '#9affff'); }
  if (atk) glowAt(c, hx, hy + 14, 10 + 6 * u, '#9ae8ff');
});
BOSSART.storm = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Storm Archmage: cloud cloak, lightning staff and crown
  const s = a.s, u = a.u, atk = a.mode === 'attack', ph = a.ph;
  glowAt(c, 48, 48, 46, '#4a8aff');
  poly(c, [[32, 28], [64, 28], [84, 70], [70, 90], [58, 82], [48, 94], [38, 82], [26, 90], [12, 70]], lgr(c, 0, 28, 0, 94, '#2a3a7a', '#0a1030'), 2.5);
  c.strokeStyle = 'rgba(160,210,255,.55)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(34 + i * 10, 40); c.quadraticCurveTo(24 + i * 16 + s * 3, 62, 22 + i * 18, 84); } c.stroke();
  c.strokeStyle = '#e8f4ff'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(26, 62); c.lineTo(32, 68); c.lineTo(28, 72); c.lineTo(35, 80); c.moveTo(70, 56); c.lineTo(64, 64); c.lineTo(68, 68); c.lineTo(62, 78); c.stroke();
  ell(c, 48, 42, 12, 14, '#3a4a8a', 2);
  limb(c, 34, 34, -0.5 - 0.2 * s, 14, 0.8, 14, 4, '#d8c8b0');
  const AR = atk ? [2.5 - 0.4 * u, -0.5] : [0.5 + 0.2 * s, -0.7], hr = limb(c, 62, 34, AR[0], 14, AR[1], 14, 4, '#d8c8b0');
  c.save(); c.translate(hr[0], hr[1]); c.strokeStyle = '#100505'; c.lineWidth = 4.6; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -34); c.stroke(); c.strokeStyle = '#6a5a3a'; c.lineWidth = 2.6; c.stroke();
  glowAt(c, 0, -40, 12 + (atk ? 8 * u : 0), '#7ac8ff'); ell(c, 0, -40, 4.5, 4.5, '#ffffff', 1);
  c.strokeStyle = '#d8f0ff'; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 4; i++) { const q = ph + i * 1.6; c.moveTo(0, -40); c.lineTo(Math.cos(q) * 11, -40 + Math.sin(q) * 11); } c.stroke(); c.restore();
  ell(c, 48, 22, 10, 11, '#d8c8b0', 2); poly(c, [[38, 28], [58, 28], [54, 44], [48, 48], [42, 44]], '#e8e8f0', 2);
  poly(c, [[34, 18], [48, 2], [62, 18], [58, 16], [48, 10], [38, 16]], '#1a2a5a', 2);
  c.strokeStyle = '#9ad8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(38, 14); c.lineTo(44, 8); c.lineTo(42, 4); c.lineTo(48, 0); c.lineTo(54, 5); c.lineTo(52, 9); c.lineTo(58, 14); c.stroke(); glowAt(c, 48, 6, 6, '#9ad8ff');
  c.fillStyle = '#ffffff'; c.fillRect(42, 21, 4, 2.5); c.fillRect(51, 21, 4, 2.5); glowAt(c, 44, 22, 6, '#bfe8ff'); glowAt(c, 53, 22, 6, '#bfe8ff');
});
