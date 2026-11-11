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
