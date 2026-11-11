/* ======================================================================
   CASTEDDISH - Intelligenza dei boss
   Abilita speciali, schema di attacco di ogni boss (KIT), movimento,
   blackout dei piani.
   ====================================================================== */

// Special attacks of the cripples: plasma from the mouth, electricity, thrown rocks and props, firearms
const ABIL = { plasma: [2.6, 13, 0.5], elec: [3.8, 7, 0.5], throw: [2.8, 11, 0.45], gun: [2.2, 14, 0.5] };
function special(e, dt, dist) {
  const A = ABIL[e.abil];
  e.shotT = (e.shotT || 0) - dt; e.cast = (e.cast || 0) - dt;
  if (e.burst > 0) {   // rifle: burst of three
    e.state = 'attack'; e.burstT -= dt;
    if (e.burstT <= 0) { aimShot(e, (Math.random() - 0.5) * 0.08, { kind: 'bullet', sp: 14, dmg: 6 * e.pw }); sfxAt('shot_rifle', e.x, e.y, 18, 0.7); e.burst--; e.burstT = 0.12; }
    return true;
  }
  if (e.zap > 0) { e.zap -= dt; e.state = 'attack'; return true; }
  if (e.cast > 0) { e.state = 'attack'; return true; }
  if (e.shotT > 0 || dist > A[1] || dist < 1.6 || !los(e.x, e.y, player.x, player.y)) return false;
  e.shotT = A[0] + Math.random(); e.cast = A[2];
  if (e.abil === 'plasma') { aimShot(e, 0, { kind: 'plasma', sp: 5, dmg: 14 * e.pw }); sfxAt('witch_cast', e.x, e.y, 16, 0.8); }
  else if (e.abil === 'throw') aimShot(e, 0, { kind: 'throw', obj: Math.floor(Math.random() * 3), sp: 6, dmg: 12 * e.pw });
  else if (e.abil === 'elec') { beamOn(e, 0.9, 24 * e.pw, 'B'); e.zap = 0.9; }
  else if (VARS[e.type][e.v][0] === 'shotgun') { fan(e, 3, 0.14, { kind: 'bullet', sp: 13, dmg: 5 * e.pw }); sfxAt('shot_shotgun', e.x, e.y, 18, 0.8); }
  else { e.burst = 3; e.burstT = 0; }
  e.state = 'attack';
  return true;
}

// Boss kits: [name, cooldown, windup, min range, max range, needs line of sight, effect]
const KIT = {
  bk: { st: 'chase', mv: [
    ['summon', 7, 1.4, 0, 99, 0, (e) => summon(e)],
    ['bones', 3, 0.6, 2.5, 14, 1, (e) => fan(e, 5, 0.2, { kind: 'bone', sp: 6.5, dmg: 8 })],
    ['smash', 2, 0.5, 0, 2.9, 0, (e) => { ringFx(e.x, e.y, 2.6, 'W'); meleeHit(e, 2.9, 22); }]] },
  golem: { st: 'chase', mv: [
    ['slam', 4.5, 0.9, 0, 4.6, 0, (e) => slam(e, 4.6, 30, 'W')],
    ['boulder', 4, 0.8, 4, 14, 1, (e) => aimShot(e, 0, { kind: 'boulder', sp: 5.5, dmg: 24, r: 0.6 })]] },
  lich: { st: 'keep', mv: [
    ['skulls', 5, 0.8, 0, 99, 1, (e) => ringShots(e, 8, { kind: 'skull', sp: 3.4, dmg: 10, homing: 2.2, life: 6 })],
    ['blink', 7, 0.5, 0, 99, 0, (e) => blinkTo(e, 6, 9)],
    ['ray', 3, 0.6, 3, 12, 1, (e) => aimShot(e, 0, { kind: 'plasma', sp: 7.5, dmg: 16 })]] },
  knight: { st: 'chase', mv: [
    ['charge', 6, 0.7, 4, 12, 1, (e, A) => { const d = dstP(e) || 1; A.dash = { x: (player.x - e.x) / d, y: (player.y - e.y) / d, t: 0.9, sp: 9, dmg: 30, hit: false }; sfxAt('rocket', e.x, e.y, 16, 0.8); }],
    ['wave', 5, 0.8, 3, 12, 1, (e) => fan(e, 3, 0.3, { kind: 'dark', sp: 8, dmg: 14 })],
    ['cleave', 1.8, 0.45, 0, 2.7, 0, (e) => { ringFx(e.x, e.y, 2.4, 'R'); meleeHit(e, 2.7, 26); }]] },
  spider: { st: 'strafe', mv: [
    ['web', 4, 0.4, 3, 14, 1, (e) => aimShot(e, 0, { kind: 'web', sp: 8, dmg: 4, slow: 3 })],
    ['spit', 2.5, 0.35, 0, 12, 1, (e) => fan(e, 3, 0.18, { kind: 'venom', sp: 7, dmg: 9 })],
    ['pounce', 5, 0.5, 3, 9, 1, (e, A) => { const d = dstP(e) || 1; A.dash = { x: (player.x - e.x) / d, y: (player.y - e.y) / d, t: 0.5, sp: 10, dmg: 20, hit: false }; }]] },
  inferno: { st: 'chase', mv: [
    ['breath', 3.5, 0.7, 0, 10, 1, (e) => fan(e, 7, 0.13, { kind: 'fire', sp: 6.5, dmg: 8, boom: 1 })],
    ['meteors', 7, 1.0, 0, 99, 1, () => { for (let i = 0; i < 5; i++) strike(player.x + (Math.random() - 0.5) * 7, player.y + (Math.random() - 0.5) * 7, 1.2 + i * 0.15, 1.4, 28, 'fire'); }],
    ['whip', 2, 0.5, 0, 3.2, 0, (e) => { ringFx(e.x, e.y, 3, 'R'); meleeHit(e, 3.2, 26); }]] },
  cyclops: { st: 'chase', mv: [
    ['eye', 7, 0.9, 0, 14, 1, (e, A) => { beamOn(e, 1.4, 32, 'R'); A.hold = 1.4; }],
    ['barrel', 3.5, 0.7, 4, 13, 1, (e) => aimShot(e, 0, { kind: 'throw', obj: 1, big: 1.5, sp: 5.5, dmg: 20, r: 0.6 })],
    ['stomp', 4, 0.8, 0, 3.8, 0, (e) => slam(e, 3.8, 24, 'W')]] },
  vamp: { st: 'strafe', mv: [
    ['bats', 4, 0.6, 2, 14, 1, (e) => fan(e, 6, 0.25, { kind: 'bat', sp: 6, dmg: 7, zig: 3 })],
    ['mist', 6, 0.5, 3, 20, 0, (e) => mistTo(e)],
    ['bite', 1.6, 0.4, 0, 2.3, 0, (e) => { if (meleeHit(e, 2.3, 18)) e.hp = Math.min(e.mhp, e.hp + 40); }]] },
  wyrm: { st: 'keep', mv: [
    ['frost', 3.5, 0.8, 0, 12, 1, (e) => fan(e, 9, 0.1, { kind: 'ice', sp: 7, dmg: 8, slow: 2 })],
    ['nova', 7, 1.0, 0, 99, 0, (e) => { ringFx(e.x, e.y, 5.5, 'B'); sfxAt('explosion', e.x, e.y, 20, 0.9); if (dstP(e) < 5.5) { hurt(20); player.slow = 3; } }],
    ['tail', 2, 0.5, 0, 3.4, 0, (e) => { ringFx(e.x, e.y, 3, 'B'); meleeHit(e, 3.4, 26); }]] },
  storm: { st: 'keep', mv: [
    ['bolts', 6, 1.0, 0, 99, 1, () => { strike(player.x, player.y, 0.9, 1.3, 26, 'bolt'); for (let i = 0; i < 6; i++) strike(player.x + (Math.random() - 0.5) * 8, player.y + (Math.random() - 0.5) * 8, 1.0 + i * 0.1, 1.3, 26, 'bolt'); }],
    ['chain', 8, 0.8, 0, 12, 1, (e, A) => { beamOn(e, 1.2, 26, 'B'); A.hold = 1.2; }],
    ['blink', 8, 0.4, 0, 99, 0, (e) => blinkTo(e, 5, 8)]] }
};
function bossMove(e, dt, dist, st, A) {
  const T = TYPES[e.type], spd = T.spd * (e.hp < e.mhp * 0.5 ? 1.25 : 1), ox = e.x, oy = e.y, dd = dist || 1;
  const ux = (player.x - e.x) / dd, uy = (player.y - e.y) / dd, px = -uy, py = ux;
  e.state = 'walk'; e.animTimer += dt; if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; }
  if (st === 'chase') { if (dist > (T.r || 0.5) + 0.9) chase(e, dt, spd, dist); }
  else if (st === 'keep') {   // hover at a distance, drifting sideways
    if (dist < 6) fleeStep(e, dt, spd); else if (dist > 9.5) chase(e, dt, spd, dist); else steer(e, e.x + px * A.side, e.y + py * A.side, spd * 0.8, dt);
  } else {   // strafe: fast and erratic
    A.swT -= dt; if (A.swT <= 0) { A.swT = 0.8 + Math.random() * 1.2; A.side = -A.side; }
    if (dist > 5) chase(e, dt, spd, dist); else { const k = dist > 2.6 ? 0.8 : -0.4; steer(e, e.x + px * A.side * 2 + ux * k, e.y + py * A.side * 2 + uy * k, spd, dt); }
  }
  e.sd = (e.sd || 0) + Math.hypot(e.x - ox, e.y - oy);
  if (e.sd >= 1.3) { e.sd -= 1.3; if (!T.lift) enemyStep(e); }
}
function bossAI(e, dt, dist) {
  const T = TYPES[e.type], K = KIT[e.type];
  const A = e.ai || (e.ai = { cd: {}, mv: null, t: 0, w: 1, dash: null, hold: 0, rest: 0, side: Math.random() < 0.5 ? 1 : -1, swT: 0 });
  const k = e.hp < e.mhp * 0.5 ? 1.5 : 1;   // second half of the fight: everything comes faster
  if (e.mist > 0) e.mist -= dt;
  for (const m of K.mv) A.cd[m[0]] = (A.cd[m[0]] === undefined ? 1.5 + Math.random() * 2 : A.cd[m[0]]) - dt * k;
  if (A.dash) {
    const D = A.dash, ox = e.x, oy = e.y; D.t -= dt; e.state = 'walk';
    e.animTimer += dt * 3; if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; }
    if (!isWall(e.x + D.x * D.sp * dt, e.y)) e.x += D.x * D.sp * dt;
    if (!isWall(e.x, e.y + D.y * D.sp * dt)) e.y += D.y * D.sp * dt;
    if (!D.hit && dstP(e) < (T.r || 0.5) + 0.7) { D.hit = true; hurt(D.dmg); }
    if (D.t <= 0 || Math.hypot(e.x - ox, e.y - oy) < D.sp * dt * 0.2) A.dash = null;
    return;
  }
  if (A.hold > 0) { A.hold -= dt; e.state = 'attack'; e.frame = 3; return; }
  if (A.mv) {
    A.t -= dt; e.state = 'attack'; e.frame = Math.min(3, Math.floor((1 - Math.max(0, A.t) / A.w) * 4));
    if (A.t <= 0) { const m = A.mv; A.mv = null; A.rest = 0.35; m[6](e, A); }
    return;
  }
  if (A.rest > 0) A.rest -= dt;
  else {
    const see = los(e.x, e.y, player.x, player.y);
    for (const m of K.mv) {
      if (A.cd[m[0]] > 0 || dist < m[3] || dist > m[4] || (m[5] && !see)) continue;
      A.mv = m; A.t = A.w = m[2]; A.cd[m[0]] = m[1]; e.state = 'attack'; sfxAt('witch_cast', e.x, e.y, 18, 0.8); return;
    }
  }
  bossMove(e, dt, dist, K.st, A);
}

function updateCombatFx(dt) {
  for (let i = strikes.length - 1; i >= 0; i--) {   // delayed blasts: meteors and lightning, marked on the floor beforehand
    const k = strikes[i]; k.t -= dt; if (k.t > 0) continue;
    strikes.splice(i, 1);
    if (Math.hypot(player.x - k.x, player.y - k.y) < k.r) hurt(k.dmg);
    if (k.kind === 'bolt') { fxs.push({ x: k.x, y: k.y, cv: 'col', life: 0.25, t: 0, s0: 1.3, s1: 1.1 }); sfxAt('witch_zap', k.x, k.y, 18, 0.9); }
    else { explosions.push({ x: k.x, y: k.y, timer: 0, maxTime: 0.4, kind: 'fire' }); addFire(k.x, k.y, 1.1, 5); sfxAt('explosion', k.x, k.y, 18, 0.9); }
  }
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i], e = b.e; b.t -= dt;
    if (!e.alive || b.t <= 0) { beams.splice(i, 1); continue; }
    b.ok = dstP(e) < 16 && los(e.x, e.y, player.x, player.y);
    if (b.ok) { hurt(b.dps * dt); if ((b.s -= dt) <= 0) { b.s = 0.2; sfxAt('sizzle', e.x, e.y, 16, 0.7); } }
  }
  for (let i = fxs.length - 1; i >= 0; i--) { fxs[i].t += dt; if (fxs[i].t >= fxs[i].life) fxs.splice(i, 1); }
}
function updatePower(dt) {   // on the boss floor the lights keep failing
  if (curFloor !== 4) { powerK = 1; return; }
  power.t -= dt;
  if (power.t <= 0) { power.on = !power.on; power.t = power.on ? 5 + Math.random() * 4 : 2.5 + Math.random() * 2.5; power.fl = 0.6; sfx('sizzle', 0.5); }
  if (power.fl > 0) { power.fl -= dt; if ((power.ft -= dt) <= 0) { power.ft = 0.07 + Math.random() * 0.08; power.flk = power.flk > 0.5 ? 0.1 : 1; } powerK = power.flk; }
  else powerK = power.on ? 1 : 0.1;
}
function updateBossFloor(dt) {   // five pairs of bosses, one pair after the other; skeletons keep coming all along
  skelT -= dt;
  if (skelT <= 0) { skelT = 12 - 5 * DIFF.count; spawnSkels(player.x, player.y, Math.max(1, Math.round(5 * DIFF.count)), 7, 12); }
  let alive = false; for (const e of enemies) if (e.alive && TYPES[e.type].boss) { alive = true; break; }
  if (!alive && pairWait <= 0) {
    if (pairIdx >= BOSS_PAIRS.length - 1) { won = true; return true; }
    pairWait = 3; say('COPPIA ' + (pairIdx + 1) + ' SCONFITTA!'); toastT = 3;
  }
  if (pairWait > 0) { pairWait -= dt; if (pairWait <= 0) { pairIdx++; spawnPair(); } }
  return false;
}
