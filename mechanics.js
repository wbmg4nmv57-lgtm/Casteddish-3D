/* ######################################################################
   CASTEDDISH - Meccaniche
   Stato del mondo, sparo, esplosioni, interazione con gli oggetti, fisica, attacchi dei boss, fuoco amico.
   Sezioni, in ordine: world-state.js, shooting.js, explosions.js, prop-interaction.js, physics.js, boss-attacks.js, friendly-fire.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Stato del mondo
   Armature, chiavi, lancio, casse, esplosioni, fuochi, segni sui muri
   e funzioni per sapere cosa c'e in una cella.
   ====================================================================== */

// ---- Armor, keys, throw state ----
const ARMORS = [
  { name: 'CUOIO', ap: 40, abs: 0.12, col: '#c08a50' },
  { name: 'FERRO', ap: 70, abs: 0.2, col: '#b8c2ce' },
  { name: 'ORO', ap: 100, abs: 0.3, col: '#f4c830' },
  { name: 'RUBINO', ap: 140, abs: 0.42, col: '#ff5070' }
];
const armor = { t: -1, ap: 0 };
let keys = 0, keysNeed = 3, hinted = false, thr = null, aim = null, doorAnim = null, readyMsg = false, doorHintT = 0;
const THROW_STD = (8.2 - 4.5) / 8.5;

const blk = new Uint8Array(N * N);
const CHEST_CELL = 8;   // chests block walking like any solid, but shots and throws fly over them
const blasts = [], fuses = [], shake = { t: 0, max: 1, a: 0 };
let flashA = 0, flashEl = null;
const fires = [], nebulas = [], props = [], chands = [], decals = new Map(), debris = [], rubble = [];
const SNDM = { wood: ['crate_hit', 'crate_break'], metal: ['hit_metal', 'break_metal'], stone: ['hit_stone', 'break_stone'], glass: ['hit_glass', 'break_glass'], bone: ['hit_bone', 'break_bone'], rust: ['hit_metal', 'break_metal'] };
const MARK_SIZE = { hole: 0.1, blast: 0.9, scorch: 0.55, plasma: 0.32 };
const MARK_OF = { flame: 'scorch', molotov: 'scorch', grenade: 'blast', plasma: 'plasma' };
const isWallMap = (x, y) => { const mx = Math.floor(x), my = Math.floor(y); return mx < 0 || my < 0 || mx >= N || my >= N || map[my * N + mx] > 0; };
const propAt = (x, y) => props.find(q => q.cell === Math.floor(y) * N + Math.floor(x) && q.solid !== false);

/* ======================================================================
   CASTEDDISH - Sparo e danni
   fireWeapon (spara), damageEnemy, fuoco, segni dei proiettili sui
   muri, schizzi.
   ====================================================================== */

function fireWeapon(pw) {
  if (fireCooldown > 0 || player.hp <= 0 || won) return;
  if (ammo[cur] <= 0) { cur = 0; return; }
  const w = WEAPONS[cur], kind = w.kind || 'bullet';
  fireCooldown = w.cd; ammo[cur]--; stats.shots++;
  isFiring = true; fireAnimFrame = 1; fireTimer = 0;
  const SN = ['shot_pistol', 'shot_shotgun', 'shot_rifle', 'rocket', 'throw', 'throw', null, 'plasma'][cur];
  if (SN) sfx(SN, cur === 0 ? 0.9 : 1);
  for (let i = 0; i < w.n; i++) {
    const a = (Math.random() - 0.5) * 2 * w.spread, cs = Math.cos(a), sn = Math.sin(a);
    const pr = {
      x: player.x + player.dirX * 0.35, y: player.y + player.dirY * 0.35,
      dirX: player.dirX * cs - player.dirY * sn, dirY: player.dirX * sn + player.dirY * cs,
      z: 0.5, vz: 0, speed: w.speed, distTraveled: 0, dmg: w.dmg, splash: w.splash || 0, big: cur === 3,
      kind, mark: w.mark || MARK_OF[kind] || 'hole', nf: 1.5, nb: 0
    };
    if (kind === 'molotov' || kind === 'grenade') { pr.vzT = 2.6; pr.z = 0.55; if (pw !== undefined) pr.speed = 4.5 + pw * 8.5; }
    projectiles.push(pr);
  }
  if (ammo[cur] <= 0 && cur !== 0) { say('MUNIZIONI FINITE'); cur = 0; }
}

function damageEnemy(e, d, silent) {
  if (!e.alive) return;
  e.hp -= d; if (!silent) sfxAt('hit_flesh', e.x, e.y, 14, 0.8, false);
  if (e.hp <= 0) { e.alive = false; e.state = 'die'; player.kills++; enemyVoice(e, 'death'); }
  else if (e.vC <= 0) { e.vC = silent ? 1.5 : 0.7; enemyVoice(e, 'hurt'); }
}

// Fire patch: refreshes an existing nearby patch instead of piling up
function addFire(x, y, r, life, m) {
  if (isWall(x, y)) return;
  for (const f of fires) {
    if (Math.abs(f.x - x) < 0.3 && Math.abs(f.y - y) < 0.3 && f.r <= r + 0.01) { f.life = Math.max(f.life, life); f.max = Math.max(f.max, life); if (m) { f.m = m; f.mine = true; } return; }
  }
  if (fires.length > (m ? 140 : 70)) fires.shift();
  const pts = [], n = Math.max(1, Math.round(r * r * 3));
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r * 0.8; pts.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, ph: Math.random() * 4 }); }
  fires.push({ x, y, r, life, max: life, pts, m: m || 1, mine: !!m });
}

// Permanent mark on the wall face hit by a ray (bullet holes, scorch, plasma melt)
function wallMark(px, py, dx, dy, z, type, maxD, size) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  let x = px, y = py;
  for (let d = 0; d < maxD; d += 0.04) {
    const nx = x + dx * 0.04, ny = y + dy * 0.04;
    if (isWallMap(nx, ny)) {
      const cx = Math.floor(nx), cy = Math.floor(ny);
      let face, along;
      if (Math.floor(x) !== cx) { face = dx > 0 ? 0 : 1; along = y + (((dx > 0 ? cx : cx + 1) - x) / dx) * dy; }
      else { face = dy > 0 ? 2 : 3; along = x + (((dy > 0 ? cy : cy + 1) - y) / dy) * dx; }
      along -= Math.floor(along);
      const key = (cy * N + cx) * 4 + face;
      let arr = decals.get(key); if (!arr) decals.set(key, arr = []);
      if (arr.length >= 14) arr.shift();
      arr.push({ u: along, v: Math.min(0.95, Math.max(0.05, 1 - z)), s: size, t: type });
      return true;
    }
    x = nx; y = ny;
  }
  return false;
}

function splashAt(x, y, dmg, rad, marked) {
  explosions.push({ x, y, timer: 0, maxTime: 0.35, big: true });
  sfxAt('explosion', x, y, 22, 1.0);
  for (const e of enemies) { const d = Math.hypot(x - e.x, y - e.y); if (e.alive && d < rad) damageEnemy(e, dmg * (1 - (d / rad) * 0.6)); }
  const dp = Math.hypot(x - player.x, y - player.y);
  if (dp < rad) hurt(dmg * 0.3 * (1 - dp / rad));
  for (const q of props.slice()) if (Math.hypot(q.x - x, q.y - y) < rad) hurtProp(q, dmg);
  if (!marked) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) wallMark(x, y, dx, dy, 0.3, 'blast', 1.3, MARK_SIZE.blast);
}

/* ======================================================================
   CASTEDDISH - Esplosioni
   Esplosioni di barili e granate, onda d'urto, reazione a catena.
   ====================================================================== */

// ---- Explosive barrels: blast damage, chain reaction, flying embers, fire and smoke ----
const BLAST_R = 3.6, BLAST_D = 140;
function mkBlast(x, y) {
  const b = { x, y, t: 0, life: 2.4, ps: [] }, R = Math.random;
  for (let i = 0; i < 16; i++) {   // embers and burning scrap flung outward
    const a = R() * 6.283, sp = 1.5 + R() * 4.5, life = 0.8 + R() * 0.8;
    b.ps.push({ k: 'ember', x, y, z: 0.25 + R() * 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 2.5 + R() * 4, life, max: life, s: 0.07 + R() * 0.06 });
  }
  for (let i = 0; i < 6; i++) {   // fire billows
    const a = R() * 6.283, life = 0.55 + R() * 0.35;
    b.ps.push({ k: 'fire', x: x + Math.cos(a) * 0.3, y: y + Math.sin(a) * 0.3, z: 0.2 + R() * 0.25, vx: Math.cos(a) * 0.7, vy: Math.sin(a) * 0.7, vz: 0.9 + R() * 0.9, life, max: life, s: 0.7 + R() * 0.5, ph: i });
  }
  for (let i = 0; i < 6; i++) {   // smoke column that rises and spreads
    const a = R() * 6.283, life = 1.6 + R() * 0.8;
    b.ps.push({ k: 'smoke', x: x + Math.cos(a) * 0.2, y: y + Math.sin(a) * 0.2, z: 0.35 + R() * 0.2, vx: Math.cos(a) * 0.35, vy: Math.sin(a) * 0.35, vz: 0.5 + R() * 0.5, life, max: life, s: 0.6 + R() * 0.4 });
  }
  return b;
}
// The explosion itself, shared by barrels and grenades: fireball and flying embers, shock rings, sound, camera shake, hot flash, flames left burning on the floor and scorch marks on the walls. Returns the player's distance from the blast.
function blastFx(x, y, marked) {
  blasts.push(mkBlast(x, y));
  fxs.push({ x, y, cv: 'ringR', life: 0.5, t: 0, s0: 0.5, s1: BLAST_R * 2.3 });
  fxs.push({ x, y, cv: 'ringW', life: 0.85, t: 0, s0: 0.4, s1: BLAST_R * 2.9 });
  sfxAt('explosion', x, y, 30, 1.0);
  const dp = Math.hypot(x - player.x, y - player.y), k = Math.max(0, 1 - dp / 14);
  if (k > 0) {   // camera shake and a hot flash, stronger the closer you are
    shake.a = Math.max(shake.t > 0 ? shake.a : 0, 16 * k); shake.t = shake.max = 0.5;
    flashA = Math.max(flashA, 0.65 * k);
    if (!flashEl) {
      const ov = document.getElementById('damageOverlay');
      flashEl = document.createElement('div');
      flashEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 55%,rgba(255,240,190,.95),rgba(255,140,40,.7) 55%,rgba(255,60,0,.35))';
      ov.parentNode.insertBefore(flashEl, ov.nextSibling);
    }
  }
  addFire(x, y, 1.1, 6);
  if (!marked) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) wallMark(x, y, dx, dy, 0.3, 'blast', 1.3, MARK_SIZE.blast);
  return dp;
}
function barrelBlast(q) {
  const x = q.x, y = q.y, dp = blastFx(x, y);
  for (const e of enemies) {
    const d = Math.hypot(x - e.x, y - e.y);
    if (e.alive && d < BLAST_R && (d < 1.2 || los(x, y, e.x, e.y))) damageEnemy(e, BLAST_D * (1 - (d / BLAST_R) * 0.6));
  }
  if (dp < BLAST_R && (dp < 1.2 || los(x, y, player.x, player.y))) hurt(BLAST_D * 0.3 * (1 - dp / BLAST_R));
  for (const o of props.slice()) {   // neighbours: other barrels go off a moment later (chain reaction), the rest breaks
    const d = Math.hypot(o.x - x, o.y - y);
    if (d >= BLAST_R) continue;
    if (o.type === 'xbarrel') { if (o.fuse === undefined) { o.fuse = 0.12 + d * 0.09; fuses.push(o); } }
    else hurtProp(o, BLAST_D * (1 - (d / BLAST_R) * 0.5));
  }
}
// Grenade: the very same explosion as the barrels (animation, shake, flash, flames on the floor); the damage keeps the grenade's own range
function grenadeBlast(x, y, dmg, rad, wallHit) {
  const dp = blastFx(x, y, wallHit);   // a wall hit has already left its mark
  for (const e of enemies) { const d = Math.hypot(x - e.x, y - e.y); if (e.alive && d < rad) damageEnemy(e, dmg * (1 - (d / rad) * 0.6)); }
  if (dp < rad) hurt(dmg * 0.3 * (1 - dp / rad));
  for (const q of props.slice()) if (Math.hypot(q.x - x, q.y - y) < rad) hurtProp(q, dmg);
}

/* ======================================================================
   CASTEDDISH - Interazione con gli oggetti
   Ricompense dei bauli, distruzione degli oggetti di scena, apertura
   (tasto USA) e raccolta dei pickup.
   ====================================================================== */

function dropReward(x, y) {
  const r = Math.random();
  const it = r < 0.25 ? { kind: 'med' } : r < 0.62 ? { kind: 'ammo', w: 1 + Math.floor(Math.random() * 7) } : { kind: 1 + Math.floor(Math.random() * 7) };
  const off = [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [0.5, 0.5], [-0.5, -0.5]], st = Math.floor(Math.random() * off.length);
  for (let k = 0; k < off.length; k++) {
    const o = off[(st + k) % off.length];
    if (!isWall(x + o[0], y + o[1])) { pickups.push({ ...it, x: x + o[0], y: y + o[1], taken: false }); return; }
  }
  pickups.push({ ...it, x, y, taken: false });
}

function hurtProp(q, d, silent) {
  if (q.type === 'chest') return;
  q.hp -= d;
  const mat = q.mat || 'wood', sn = SNDM[mat];
  if (!silent) sfxAt(sn[0], q.x, q.y, 10, 0.8, false);
  if (q.hp > 0) return;
  stats.objects++; stats.dollars += q.type === 'crate' ? 180 : ({ wood: 220, stone: 1400, metal: 900, glass: 2600, bone: 450, rust: 600 }[mat] || 300);
  props.splice(props.indexOf(q), 1); if (q.solid !== false) blk[q.cell] = 0;
  sfxAt(sn[1], q.x, q.y, 14, 1);
  for (let i = 0; i < 9; i++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 2.2; debris.push({ x: q.x, y: q.y, z: 0.2 + Math.random() * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 1.5 + Math.random() * 2, life: 1.0, mat }); }
  if (rubble.length > 90) rubble.shift();
  rubble.push({ x: q.x, y: q.y, mat });
  if (q.type === 'crate') { say('CASSA DISTRUTTA'); if (Math.random() < 0.8) dropReward(q.x, q.y); }
  if (q.type === 'xbarrel') barrelBlast(q);
}

function tryUse() {
  const q = props.find(c => c.type === 'chest' && !c.open && Math.hypot(c.x - player.x, c.y - player.y) < 1.5);
  if (!q) return;
  q.open = true;
  if (q.key) { keys++; say('CHIAVE TROVATA (' + keys + '/' + keysNeed + ')'); sfx('chest_open', 0.9); setTimeout(() => sfx('key', 0.9), 450); }
  else { say('IL BAULE \u00c8 VUOTO'); sfx('chest_open', 0.9); }
}

const pickups = [];

function updatePickups() {
  for (const q of pickups) {
    if (q.taken || Math.hypot(q.x - player.x, q.y - player.y) > 0.6) continue;
    if (q.kind === 'med') {
      if (player.hp >= 100) continue;
      player.hp = Math.min(100, player.hp + 30);
      say('MEDIKIT +30 HP'); sfx('pickup_med', 0.9);
    } else if (q.kind === 'arm') {
      const A = ARMORS[q.t];
      if (q.t >= armor.t) {
        if (q.t === armor.t && armor.ap >= A.ap) continue;
        armor.t = q.t; armor.ap = A.ap; say('ARMATURA DI ' + A.name + ' (' + A.ap + ')');
      } else {
        const cap = ARMORS[armor.t].ap;
        if (armor.ap >= cap) continue;
        armor.ap = Math.min(cap, armor.ap + 25); say('+25 ARMATURA');
      }
      sfx('pickup_armor', 0.9);
    } else if (q.kind === 'ammo') {
      const w = WEAPONS[q.w]; ammo[q.w] += w.give;
      say('+' + w.give + ' ' + w.name); sfx('pickup_ammo', 0.9);
    } else {
      const w = WEAPONS[q.kind], first = !owned[q.kind];
      owned[q.kind] = true; ammo[q.kind] += w.give;
      say(w.name + (first ? ' RACCOLTO!' : ' +' + w.give + ' MUNIZIONI'));
      sfx('pickup_weapon', 0.9);
    }
    q.taken = true;
  }
}

/* ======================================================================
   CASTEDDISH - Fisica e danni al giocatore
   Collisioni con i muri, movimento e rotazione del giocatore, danno
   subito, linea di vista e inseguimento.
   ====================================================================== */

/* ---------- Physics ---------- */
function isWall(x, y) {
  const mx = Math.floor(x), my = Math.floor(y);
  if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) return true;
  return blk[my * MAP_WIDTH + mx] > 0;
}

// Same as isWall, but chests do not stop the player's own shots (the shot passes above them)
function isWallShot(x, y) {
  const mx = Math.floor(x), my = Math.floor(y);
  if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) return true;
  const v = blk[my * MAP_WIDTH + mx];
  return v > 0 && v !== CHEST_CELL;
}

function movePlayer(dx, dy) {
  const r = player.radius;
  const nx = player.x + dx;
  if (!isWall(nx + (dx > 0 ? 1 : -1) * r, player.y)) player.x = nx;
  const ny = player.y + dy;
  if (!isWall(player.x, ny + (dy > 0 ? 1 : -1) * r)) player.y = ny;
}

function rotatePlayer(a) {
  const cs = Math.cos(a), sn = Math.sin(a);
  const odx = player.dirX;
  player.dirX = player.dirX * cs - player.dirY * sn;
  player.dirY = odx * sn + player.dirY * cs;
  const opx = player.planeX;
  player.planeX = player.planeX * cs - player.planeY * sn;
  player.planeY = opx * sn + player.planeY * cs;
}

let rawDt = 0, tNow = 0, fieldT = 0, doorOpen = false, won = false, remaining = 0;
const eShots = [], field = new Int16Array(N * N);

function hurt(d) {
  if (player.hp <= 0 || won) return;
  d *= DIFF.dmg;
  if (armor.t >= 0 && armor.ap > 0) {
    const a = Math.min(armor.ap, d * ARMORS[armor.t].abs); armor.ap -= a; d -= a;
    if (armor.ap <= 0) { armor.t = -1; armor.ap = 0; say('ARMATURA DISTRUTTA'); sfx('armor_break', 0.9); }
  }
  if (hsT <= 0 && d > 0.05) { hsT = 0.6; sfx('hurt_player', 0.85); }
  player.hp = Math.max(0, player.hp - d);
  const o = document.getElementById('damageOverlay');
  o.style.backgroundColor = 'rgba(220, 38, 38, 0.4)';
  setTimeout(() => { o.style.backgroundColor = 'rgba(220, 38, 38, 0)'; }, 80);
}

function los(x1, y1, x2, y2) {
  const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.3);
  for (let i = 1; i < n; i++) { const t = i / n; if (isWall(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; }
  return true;
}

// Move toward the player: straight when close and visible, otherwise down the path-distance field
function chase(e, dt, spd, dist) {
  let tx = player.x, ty = player.y;
  if (!(dist < 5 && los(e.x, e.y, player.x, player.y))) {
    const cx = e.x | 0, cy = e.y | 0;
    let best = field[cy * N + cx], bx = cx, by = cy;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      if (!i && !j) continue;
      const nx = cx + i, ny = cy + j;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N || blk[ny * N + nx]) continue;
      if (i && j && (blk[cy * N + nx] || blk[ny * N + cx])) continue;
      const v = field[ny * N + nx];
      if (v < best) { best = v; bx = nx; by = ny; }
    }
    tx = bx + 0.5; ty = by + 0.5;
  }
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  const mx = dx / d * spd * dt, my = dy / d * spd * dt;
  e.sd = (e.sd || 0) + Math.hypot(mx, my);
  if (!isWall(e.x + mx, e.y)) e.x += mx;
  if (!isWall(e.x, e.y + my)) e.y += my;
}

/* ======================================================================
   CASTEDDISH - Attacchi speciali dei boss
   Colpi a ventaglio, onde d'urto, raggi, teletrasporto, nebbia,
   evocazione di scheletrini.
   ====================================================================== */

/* ---------- Special attacks, bosses, blackouts ---------- */
const strikes = [], beams = [], fxs = [], power = { on: true, t: 6, fl: 0, ft: 0, flk: 1 };
let powerK = 1, pairIdx = 0, pairWait = 0, skelT = 8;
const BOSS_IDS = ['bk', 'golem', 'lich', 'knight', 'spider', 'inferno', 'cyclops', 'vamp', 'wyrm', 'storm'];
const BOSS_PAIRS = [['bk', 'golem'], ['lich', 'knight'], ['spider', 'inferno'], ['cyclops', 'vamp'], ['wyrm', 'storm']];
const dstP = (e) => Math.hypot(player.x - e.x, player.y - e.y);

function aimShot(e, ang, o) {   // a projectile from e towards the player, turned by ang
  const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1, c = Math.cos(ang), sn = Math.sin(ang), ux = dx / d, uy = dy / d;
  eShots.push(Object.assign({ x: e.x, y: e.y, dx: ux * c - uy * sn, dy: ux * sn + uy * c, life: 4, kind: 'bolt', sp: 6, dmg: 10, own: e }, o));
}
const fan = (e, n, spread, o) => { for (let i = 0; i < n; i++) aimShot(e, (i - (n - 1) / 2) * spread, o); };
function ringShots(e, n, o) { for (let i = 0; i < n; i++) { const a = i * 6.2832 / n; eShots.push(Object.assign({ x: e.x, y: e.y, dx: Math.cos(a), dy: Math.sin(a), life: 5, kind: 'bolt', sp: 4, dmg: 10, own: e }, o)); } }
function meleeHit(e, reach, dmg) { if (dstP(e) < reach) { hurt(dmg); return true; } return false; }
function ringFx(x, y, r, col) { fxs.push({ x, y, cv: 'ring' + col, life: 0.55, t: 0, s0: 0.3, s1: r * 2.1 }); }
function slam(e, r, dmg, col) { ringFx(e.x, e.y, r, col || 'W'); sfxAt('explosion', e.x, e.y, 20, 0.9); if (dstP(e) < r) hurt(dmg); }
function strike(x, y, delay, r, dmg, kind) { strikes.push({ x, y, t: delay, r, dmg, kind }); }
function beamOn(e, dur, dps, col) { beams.push({ e, t: dur, dps, col, ok: false, s: 0 }); }
function blinkTo(e, r0, r1) {
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * 6.283, r = r0 + Math.random() * (r1 - r0), tx = player.x + Math.cos(a) * r, ty = player.y + Math.sin(a) * r;
    if (!isWall(tx, ty) && los(tx, ty, player.x, player.y)) { ringFx(e.x, e.y, 1.6, 'P'); e.x = tx; e.y = ty; ringFx(tx, ty, 1.6, 'P'); sfxAt('summon', tx, ty, 16, 0.6); return; }
  }
}
function mistTo(e) {   // the vampire turns to mist and reappears right behind the player
  const tx = player.x - player.dirX * 1.6, ty = player.y - player.dirY * 1.6;
  if (!isWall(tx, ty)) { ringFx(e.x, e.y, 1.4, 'P'); e.x = tx; e.y = ty; } else blinkTo(e, 2, 4);
  e.mist = 0.8; ringFx(e.x, e.y, 1.4, 'P');
}
function freeNear(x, y) { for (let r = 0; r < 6; r += 0.5) for (let k = 0; k < 12; k++) { const tx = x + Math.cos(k * 0.52) * r, ty = y + Math.sin(k * 0.52) * r; if (!isWall(tx, ty)) return [tx, ty]; } return [x, y]; }

// Skeletons: more of them on harder difficulties, and they keep coming for the whole fight
function spawnSkels(cx, cy, n, r0, r1) {
  let alive = 0; for (const e of enemies) if (e.alive && e.type === 'skel') alive++;
  const cap = Math.round(16 * DIFF.count) + 3;
  for (let i = 0; i < n && alive < cap; i++) for (let k = 0; k < 10; k++) {
    const a = Math.random() * 6.283, r = r0 + Math.random() * (r1 - r0), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!isWall(x, y)) { enemies.push(mkEnemy(x, y, 'skel')); alive++; break; }
  }
}
function summon(b) {   // the Skeleton King's own call: a wave around him that grows with every wave
  b.waves = (b.waves || 0) + 1;
  spawnSkels(b.x, b.y, Math.max(2, Math.round(Math.min(12, 3 + 2 * b.waves) * DIFF.count)), 1.6, 3.2);
  sfxAt('summon', b.x, b.y, 18, 1); enemyVoice(b, 'hurt');
}
function spawnPair() {
  const pr = BOSS_PAIRS[pairIdx];
  ensureSprites(['skel', ...pr], true);
  const pa = freeNear(24.5, 23.5), pb = freeNear(32.5, 23.5);
  enemies.push(mkEnemy(pa[0], pa[1], pr[0]), mkEnemy(pb[0], pb[1], pr[1]));
  say('COPPIA ' + (pairIdx + 1) + '/5'); toastT = 4; sfxAt('summon', 28.5, 23.5, 40, 1);
}

/* ======================================================================
   CASTEDDISH - Fuoco amico e litigi
   Quando un nemico colpisce un altro nemico puo nascere un litigio
   (duel).
   ====================================================================== */

// ---- Friendly fire: the shots of a monster hit whoever stands in their way, and 1 time in 5 the two start fighting each other ----
const FF_CHANCE = 0.2, FF_TIME = 14;   // chance of a fight per friendly hit; longest a fight lasts (seconds)
function infight(a, b) {   // bosses keep their own AI and never take part
  if (!a || !b || a === b || !a.alive || !b.alive || TYPES[a.type].boss || TYPES[b.type].boss) return;
  let began = false;
  if (!a.foe || !a.foe.alive) { a.foe = b; a.foeT = FF_TIME; a.hitT = 0; a.stk = 0; began = true; }
  if (!b.foe || !b.foe.alive) { b.foe = a; b.foeT = FF_TIME; b.hitT = 0; b.stk = 0; began = true; }
  if (!began) return;
  for (const q of [a, b]) { ringFx(q.x, q.y, 1.1, 'R'); enemyVoice(q, 'hurt'); }
}
function shootFoe(e, f) {   // the attack of a monster against its rival: same shots it would throw at the player
  const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const go = (o, a) => { const c = Math.cos(a || 0), sn = Math.sin(a || 0); eShots.push(Object.assign({ x: e.x, y: e.y, dx: ux * c - uy * sn, dy: ux * sn + uy * c, life: 4, kind: 'bolt', sp: 6, dmg: 10, own: e }, o)); };
  if (e.abil === 'plasma') { go({ kind: 'plasma', sp: 5, dmg: 14 * e.pw }); sfxAt('witch_cast', e.x, e.y, 16, 0.8); }
  else if (e.abil === 'throw') go({ kind: 'throw', obj: Math.floor(Math.random() * 3), sp: 6, dmg: 12 * e.pw });
  else if (e.abil === 'elec') { go({ sp: 7, dmg: 10 * e.pw }); sfxAt('witch_zap', e.x, e.y, 16, 0.7); }
  else if (e.abil === 'gun') {
    const sg = VARS[e.type][e.v][0] === 'shotgun';
    for (const a of (sg ? [-0.14, 0, 0.14] : [(Math.random() - 0.5) * 0.08])) go({ kind: 'bullet', sp: 13, dmg: (sg ? 5 : 6) * e.pw }, a);
    sfxAt(sg ? 'shot_shotgun' : 'shot_rifle', e.x, e.y, 18, 0.8);
  } else { go({ dmg: 12 * e.pw }); sfxAt('witch_cast', e.x, e.y, 14, 0.9); }
}
// Which side of itself a fighting monster shows the player. It looks at its rival, so seen from here it is front (rival closer to us), back (rival farther), or a flank.
// Both rivals are judged from the same viewpoint (the middle of the pair), so a pair is always front + back, or right flank + left flank.
function duelView(e, f) {
  const mx = (e.x + f.x) / 2 - player.x, my = (e.y + f.y) / 2 - player.y, m = Math.hypot(mx, my) || 1, rx = mx / m, ry = my / m;
  const K = Math.sign(player.planeX * player.dirY - player.planeY * player.dirX) || 1;   // the screen's right-hand side runs along the camera plane
  const gx = ry * K, gy = -rx * K, dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy) || 1;
  const away = (dx * rx + dy * ry) / d, right = (dx * gx + dy * gy) / d;
  return Math.abs(away) >= Math.abs(right) ? (away > 0 ? 'back' : 'front') : (right > 0 ? 'sideR' : 'sideL');
}
// A monster that turned on another one: it hunts its rival and ignores the player until the rival falls, the time runs out or it cannot reach it. Returns false when the fight is over.
function duel(e, dt) {
  const f = e.foe;
  if (!f || !f.alive || (e.foeT -= dt) <= 0 || e.stk > 1.6) { e.foe = null; e.stk = 0; return false; }
  const T = TYPES[e.type], dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy) || 1, spd = T.spd * e.sp;
  e.view = duelView(e, f); e.back = e.view === 'back';
  e.shotT -= dt; e.cast -= dt;
  e.animTimer += dt * Math.max(0.6, Math.min(2, e.sp));
  if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; }
  const rng = e.abil ? ABIL[e.abil][1] : e.type === 'witch' ? 10 : 0;   // those who shoot keep their distance and fire; the others close in
  if (rng && d > 2 && d < rng && los(e.x, e.y, f.x, f.y)) {
    if (e.shotT <= 0) { shootFoe(e, f); e.shotT = (e.abil ? ABIL[e.abil][0] : 1.8) + Math.random(); e.cast = 0.4; }
    e.state = e.cast > 0 ? 'attack' : 'walk'; e.stk = 0;
    return true;
  }
  if (d > 0.95) {
    const mv = steer(e, f.x, f.y, spd, dt);
    e.state = 'walk'; e.stk = mv < spd * dt * 0.3 ? e.stk + dt : 0;
    e.sd = (e.sd || 0) + mv;
    const SD = STRIDE[e.type];
    if (SD && e.sd >= SD) { e.sd -= SD; enemyStep(e); }
  } else {
    e.state = 'attack'; e.stk = 0;
    damageEnemy(f, T.dmg * dt * e.pw, true);
    if ((e.hitT -= dt) <= 0) { e.hitT = 0.45; sfxAt('hit_flesh', f.x, f.y, 14, 0.8, false); }
  }
  return true;
}
