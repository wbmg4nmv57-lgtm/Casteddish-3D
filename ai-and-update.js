/* ######################################################################
   CASTEDDISH - Intelligenza artificiale e aggiornamento
   Intelligenza di boss e nemici e update(), il ciclo che muove tutto a ogni fotogramma.
   Sezioni, in ordine: boss-ai.js, enemy-ai.js, update.js
   ###################################################################### */

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

/* ======================================================================
   CASTEDDISH - Intelligenza dei nemici
   Comportamenti: fuga e preghiera, finta fuga e attacco alle spalle,
   camminata libera, inseguimento.
   ====================================================================== */

// Run along the distance field away from the player; false once cornered
function fleeStep(e, dt, spd) {
  const cx = e.x | 0, cy = e.y | 0;
  let best = field[cy * N + cx], bx = cx, by = cy;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    if (!i && !j) continue;
    const nx = cx + i, ny = cy + j;
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || blk[ny * N + nx]) continue;
    if (i && j && (blk[cy * N + nx] || blk[ny * N + cx])) continue;
    const v = field[ny * N + nx];
    if (v > best && v < 9999) { best = v; bx = nx; by = ny; }
  }
  const tx = bx + 0.5, ty = by + 0.5, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (bx === cx && by === cy && d < 0.12) return false;   // in the best cell already: a corner
  const mx = dx / (d || 1) * spd * dt, my = dy / (d || 1) * spd * dt;
  if (!isWall(e.x + mx, e.y)) e.x += mx;
  if (!isWall(e.x, e.y + my)) e.y += my;
  return true;
}
function steer(e, tx, ty, spd, dt) {   // straight towards a point, sliding along walls; returns the distance actually covered
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, mx = dx / d * spd * dt, my = dy / d * spd * dt, ox = e.x, oy = e.y;
  if (!isWall(e.x + mx, e.y)) e.x += mx;
  if (!isWall(e.x, e.y + my)) e.y += my;
  return Math.hypot(e.x - ox, e.y - oy);
}
// A way out for a cornered coward: breadth-first search from its cell, never through the player, towards the reachable cell farthest from the player
function escapePath(e) {
  const sx = e.x | 0, sy = e.y | 0, prev = new Int16Array(N * N).fill(-1), dst = new Int16Array(N * N), q = [sy * N + sx];
  prev[q[0]] = q[0];
  let best = -1, bestV = -1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % N, cy = (c / N) | 0;
    if (dst[c] >= 5 && field[c] < 9999 && field[c] > bestV) { bestV = field[c]; best = c; }
    if (dst[c] >= 28) continue;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + d[0], ny = cy + d[1], n = ny * N + nx;
      if (nx < 1 || ny < 1 || nx >= N - 1 || ny >= N - 1 || prev[n] >= 0 || blk[n]) continue;
      if (Math.hypot(nx + 0.5 - player.x, ny + 0.5 - player.y) < 1.8) continue;
      prev[n] = c; dst[n] = dst[c] + 1; q.push(n);
    }
  }
  if (best < 0) return null;
  const path = [];
  for (let c = best; c !== q[0]; c = prev[c]) path.push([(c % N) + 0.5, ((c / N) | 0) + 0.5]);
  return path.reverse();
}
// First to one side of the player, then to the spot right behind them; gives up on the trick when blocked or when it takes too long
function flankStep(e, dt, dist, spd) {
  const px = -player.dirY, py = player.dirX, side = e.side || (((e.x - player.x) * px + (e.y - player.y) * py) >= 0 ? 1 : -1);
  let tx, ty;
  if (e.fp === 0) {
    tx = player.x + px * side * 3.4; ty = player.y + py * side * 3.4;
    if (isWall(tx, ty)) { tx = player.x - player.dirX * 2.4; ty = player.y - player.dirY * 2.4; }
    if (Math.hypot(tx - e.x, ty - e.y) < 1.0) e.fp = 1;
  } else { tx = player.x - player.dirX * 1.0; ty = player.y - player.dirY * 1.0; }
  const ox = e.x, oy = e.y, mv = steer(e, tx, ty, spd * 1.1, dt);
  e.state = 'walk'; e.animTimer += dt; if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; }
  e.back = ((e.x - ox) * (player.x - e.x) + (e.y - oy) * (player.y - e.y)) < 0;   // walking away from the player: show the back
  e.stuck = mv < spd * dt * 0.3 ? e.stuck + dt : 0;
  if ((e.bt -= dt) <= 0 || e.stuck > 0.8 || dist < 1.2) { e.bs = 'normal'; e.act = false; e.back = false; }
  return true;
}
// Behaviour variants (the rest simply charge). flank: circle round to the player's back, left or right depending on the monster, so pairs trap you from both sides.
// arc: close in along a zig-zag curve. feint: pretend to run, then flank. coward: run, crouch in a corner, and bolt to another corner when you come near.
function behave(e, dt, dist) {
  const spd = TYPES[e.type].spd * e.sp, hurt0 = e.hp < e.mhp;
  const run = (k) => { e.animTimer += dt * k; if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; } e.state = 'walk'; };
  if (e.bh === 'coward') {
    if (e.bs === 'idle') { if (!(hurt0 || (dist < 8 && los(e.x, e.y, player.x, player.y)))) return false; e.bs = 'flee'; e.act = true; e.bt = 0; enemyVoice(e, 'hurt'); }
    if (e.bs === 'flee') {
      e.back = true; run(1.4);
      if (fleeStep(e, dt, spd * 1.15)) e.bt = 0;
      else if ((e.bt += dt) > 0.25) { e.bs = 'cower'; e.back = false; e.frame = 0; e.animTimer = 0; e.escT = 1; }
      return true;
    }
    if (e.bs === 'cower') {
      e.escT -= dt;
      if (dist < 3.2 && e.escT <= 0) {   // the player came too close: run for another corner
        e.escT = 2; const pth = escapePath(e);
        if (pth && pth.length) { e.path = pth; e.pi = 0; e.bs = 'bolt'; enemyVoice(e, 'hurt'); return true; }
      }
      e.state = 'cower'; e.animTimer += dt; if (e.animTimer > 0.35) { e.frame = (e.frame + 1) % 2; e.animTimer = 0; }
      return true;
    }
    if (e.bs === 'bolt') {
      const w = e.path && e.path[e.pi];
      if (!w) { e.bs = 'cower'; e.escT = 1.5; e.frame = 0; e.animTimer = 0; return true; }
      e.back = true; run(1.5); steer(e, w[0], w[1], spd * 1.35, dt);
      if (Math.hypot(w[0] - e.x, w[1] - e.y) < 0.35) e.pi++;
      return true;
    }
  } else if (e.bh === 'feint') {
    if (e.bs === 'idle') { if (!(dist < 10 && (hurt0 || los(e.x, e.y, player.x, player.y)))) return false; e.bs = 'fake'; e.act = true; e.bt = 1.5 + Math.random() * 1.2; enemyVoice(e, 'hurt'); }
    if (e.bs === 'fake') {
      e.back = true; run(1.2); fleeStep(e, dt, spd);
      if ((e.bt -= dt) <= 0) { e.bs = 'flank'; e.bt = 7; e.fp = 0; e.stuck = 0; e.side = 0; }
      return true;
    }
    if (e.bs === 'flank') return flankStep(e, dt, dist, spd);
  } else if (e.bh === 'flank') {
    if (e.bs === 'idle') { if (!(dist < 13 && (hurt0 || los(e.x, e.y, player.x, player.y)))) return false; e.bs = 'flank'; e.act = true; e.bt = 8; e.fp = 0; e.stuck = 0; }
    if (e.bs === 'flank') return flankStep(e, dt, dist, spd);
  } else if (e.bh === 'arc') {
    if (e.bs === 'idle') { if (!(dist < 12 && (hurt0 || los(e.x, e.y, player.x, player.y)))) return false; e.bs = 'arc'; e.act = true; e.bt = 3 + Math.random() * 3; e.swT = 0; e.stuck = 0; }
    if (e.bs === 'arc') {
      e.swT -= dt; if (e.swT <= 0) { e.swT = 1 + Math.random() * 1.5; e.side = -e.side; }
      const dd = dist || 1, ux = (player.x - e.x) / dd, uy = (player.y - e.y) / dd, ox = e.x, oy = e.y;
      const mv = steer(e, e.x + ux - uy * e.side * 0.9, e.y + uy + ux * e.side * 0.9, spd * 1.05, dt);
      run(1); e.back = false;
      e.stuck = mv < spd * dt * 0.3 ? e.stuck + dt : 0;
      if ((e.bt -= dt) <= 0 || e.stuck > 0.6 || dist < 2.2) { e.bs = 'normal'; e.act = false; }
      return true;
    }
  }
  return false;
}

// Enemies that have not noticed you yet: a slow stroll around the place they spawned, with now and then a longer stop in front of an object (a prop or an item on the floor)
function wander(e, dt) {
  const w = e.wn || (e.wn = { mode: 'pause', t: Math.random() * 2.5, hx: e.x, hy: e.y, tx: e.x, ty: e.y, look: false, stuck: 0 });
  const spd = TYPES[e.type].spd * e.sp * 0.28;
  if (w.mode === 'pause') {
    e.frame = 0; e.animTimer = 0; e.state = 'walk';
    if ((w.t -= dt) > 0) return;
    let pick = null;
    if (Math.random() < 0.55) {   // go and look at something nearby
      const near = [];
      for (const q of props) if (Math.hypot(q.x - e.x, q.y - e.y) < 7) near.push(q);
      for (const q of pickups) if (!q.taken && Math.hypot(q.x - e.x, q.y - e.y) < 7) near.push(q);
      if (near.length) {
        const q = near[Math.floor(Math.random() * near.length)], d = Math.hypot(q.x - e.x, q.y - e.y) || 1;
        const tx = q.x - (q.x - e.x) / d, ty = q.y - (q.y - e.y) / d;   // stop one cell short of it
        if (!isWall(tx, ty) && Math.hypot(tx - w.hx, ty - w.hy) < 9 && los(e.x, e.y, tx, ty)) pick = { x: tx, y: ty, look: true };
      }
    }
    for (let k = 0; k < 6 && !pick; k++) {   // otherwise a short walk, never far from where it started
      const a = Math.random() * 6.28, r = 2 + Math.random() * 3, tx = e.x + Math.cos(a) * r, ty = e.y + Math.sin(a) * r;
      if (!isWall(tx, ty) && Math.hypot(tx - w.hx, ty - w.hy) < 8 && los(e.x, e.y, tx, ty)) pick = { x: tx, y: ty, look: false };
    }
    if (!pick) { w.t = 1 + Math.random() * 2; return; }
    w.tx = pick.x; w.ty = pick.y; w.look = pick.look; w.mode = 'walk'; w.stuck = 0;
    return;
  }
  const dx = w.tx - e.x, dy = w.ty - e.y, d = Math.hypot(dx, dy);
  if (d < 0.25 || w.stuck > 0.7) { w.mode = 'pause'; w.t = w.look && d < 0.6 ? 3 + Math.random() * 3.5 : 1 + Math.random() * 2.5; return; }
  const mx = dx / d * spd * dt, my = dy / d * spd * dt, ox = e.x, oy = e.y;
  if (!isWall(e.x + mx, e.y)) e.x += mx;
  if (!isWall(e.x, e.y + my)) e.y += my;
  w.stuck = Math.hypot(e.x - ox, e.y - oy) < spd * dt * 0.4 ? w.stuck + dt : 0;
  e.state = 'walk';
  e.animTimer += dt * 0.5;
  if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; }
}

/* ======================================================================
   CASTEDDISH - Aggiornamento del gioco
   update(): funzione chiamata a ogni fotogramma che muove tutto
   (giocatore, nemici, proiettili, fuoco, porte, timer).
   ====================================================================== */

const hpEl = document.getElementById('hpDisplay'), killsEl = document.getElementById('killsDisplay'), fpsEl = document.getElementById('fpsDisplay');
let lastHp = -1, lastKills = -1;
// Camera shake and the hot flash of an explosion fade out by themselves, also when the player has just died in the blast
function settleBlastFx(dt) {
  if (shake.t > 0) {
    shake.t -= dt;
    const m = shake.t > 0 ? (shake.t / shake.max) * shake.a : 0;
    canvas.style.transform = m > 0.2 ? 'translate(' + ((Math.random() - 0.5) * 2 * m).toFixed(1) + 'px,' + ((Math.random() - 0.5) * 2 * m).toFixed(1) + 'px)' : '';
  }
  if (flashEl && flashA > 0) { flashA = Math.max(0, flashA - dt * 1.6); flashEl.style.opacity = flashA.toFixed(3); }
}
// Piano 1: i demoni non si compenetrano. Ogni coppia troppo vicina viene spinta in direzioni opposte (chi e piu lontano dal giocatore cede di piu),
// senza mai entrare nei muri: se uno dei due e bloccato, l'altro si sposta di piu.
function separateDemons() {
  if (curFloor !== 0) return;
  const ds = [];
  for (const e of enemies) {
    if (!e.alive || e.type !== 'demon') continue;
    if (e.cr === undefined) { const mo = (VARS.demon[e.v] && VARS.demon[e.v][2]) || {}; e.cr = 0.4 * (e.hs || 1) * Math.max(1, mo.ws || 1); }   // raggio del corpo
    ds.push(e);
  }
  const slide = (e, mx, my) => {   // si sposta scivolando lungo i muri; restituisce quanto si e mosso davvero
    let ax = 0, ay = 0;
    if (!isWall(e.x + mx, e.y)) { e.x += mx; ax = mx; }
    if (!isWall(e.x, e.y + my)) { e.y += my; ay = my; }
    return [ax, ay];
  };
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    const a = ds[i], b = ds[j], need = a.cr + b.cr;
    let dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) >= need || Math.abs(dy) >= need) continue;
    let d = Math.hypot(dx, dy);
    if (d >= need) continue;
    if (d < 0.001) { const an = i * 2.4 + j * 1.7; dx = Math.cos(an); dy = Math.sin(an); d = 0; }   // esattamente nello stesso punto: li separo in una direzione qualsiasi
    const ux = d > 0 ? dx / d : dx, uy = d > 0 ? dy / d : dy, corr = Math.min(0.15, (need - d) * 0.9);
    const da = Math.hypot(a.x - player.x, a.y - player.y), db = Math.hypot(b.x - player.x, b.y - player.y);
    const k = Math.max(0.2, Math.min(0.8, 0.5 + (da - db) * 0.25));   // quota di spostamento di a
    const wax = -ux * corr * k, way = -uy * corr * k;
    const mvA = slide(a, wax, way);
    slide(b, ux * corr * (1 - k) + (mvA[0] - wax), uy * corr * (1 - k) + (mvA[1] - way));
  }
}

function update(dt) {
  if (typeof world1Update === 'function') world1Update(dt);   // trappole e botole del piano 1
  tNow += dt;
  updateAudio(dt);
  settleBlastFx(dt);
  if (fireCooldown > 0) fireCooldown -= dt;
  if (toastT > 0) toastT -= dt;
  if (player.hp <= 0 || won || innerHeight > innerWidth) return;
  updateMagic(dt, rawDt);
  updatePower(dt); updateCombatFx(dt); if (player.slow > 0) player.slow -= dt;
  stats.time += rawDt;
  if (TIMED) {
    timeLeft -= rawDt;
    const th = document.getElementById('timerHud'), t = Math.max(0, Math.ceil(timeLeft));
    if (t !== th._t) { th._t = t; th.textContent = '\u23f1 ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); th.classList.toggle('low', t <= 30); }
    if (timeLeft <= 0 && player.hp > 0) { deathCause = 'time'; player.hp = 0; }
  }

  const inLiq = liq[(player.y | 0) * N + (player.x | 0)];
  const moveStep = player.moveSpeed * dt * (inLiq && curFloor === 3 ? 0.55 : 1) * (player.slow > 0 ? 0.5 : 1);
  if (inLiq && curFloor === 4) hurt(10 * dt);
  const rotStep = player.rotSpeed * dt;

  // Movement: keyboard (digital) + joystick (analog), capped at 1
  let fwdAxis = (input.fwd ? 1 : 0) - (input.back ? 1 : 0) - joy.y;
  let strafeAxis = (input.strafeR ? 1 : 0) - (input.strafeL ? 1 : 0) + joy.x;
  const mag = Math.hypot(fwdAxis, strafeAxis);
  if (mag > 1) { fwdAxis /= mag; strafeAxis /= mag; }
  const px0 = player.x, py0 = player.y;
  if (!doorAnim && (fwdAxis !== 0 || strafeAxis !== 0)) {
    movePlayer(
      (player.dirX * fwdAxis - player.dirY * strafeAxis) * moveStep,
      (player.dirY * fwdAxis + player.dirX * strafeAxis) * moveStep
    );
    playerStepTick(Math.hypot(player.x - px0, player.y - py0), inLiq);
  }

  // Look: analog yaw + pitch (pitch eases back to center when the pad is released)
  const yaw = (input.rotR ? 1 : 0) - (input.rotL ? 1 : 0) + Math.sign(look.x) * Math.abs(look.x) ** 1.5;
  if (yaw && !doorAnim) rotatePlayer(yaw * rotStep * 1.1);
  if (look.dx) { if (!doorAnim) rotatePlayer(look.dx * 0.006); look.dx = 0; }

  if (input.fire && !doorAnim) fireWeapon();
  if (thr && thr.shown) {
    const dist = (4.5 + thr.p * 8.5) * 0.7424;
    let d = 0; while (d < dist && !isWallShot(player.x + player.dirX * d, player.y + player.dirY * d)) d += 0.1;
    aim = { x: player.x + player.dirX * d, y: player.y + player.dirY * d };
  } else aim = null;
  if (isFiring) {
    fireTimer += dt;
    if (fireTimer > 0.08) {
      fireAnimFrame++; fireTimer = 0;
      if (fireAnimFrame > 3) { fireAnimFrame = 0; isFiring = false; }
    }
  }

  fieldT -= dt;
  if (fieldT <= 0) { fieldT = 0.25; bfs(blk, (player.y | 0) * N + (player.x | 0), field); }

  // Player projectiles: bullets, rockets, thrown bottles and grenades, flames, plasma
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const sub = 4, sd = (p.speed * dt) / sub, sdt = dt / sub;
    let hit = false, wallHit = false;
    for (let st = 0; st < sub && !hit; st++) {
      p.x += p.dirX * sd; p.y += p.dirY * sd; p.distTraveled += sd;
      if (p.vzT !== undefined) { p.z += p.vzT * sdt; p.vzT -= 9 * sdt; } else p.z += p.vz * sd;
      if (p.kind === 'plasma' && p.distTraveled >= p.nb) {
        p.nb = p.distTraveled + 0.12;
        if (nebulas.length < 260) nebulas.push({ x: p.x, y: p.y, z: 0.5 + (Math.random() - 0.5) * 0.14, life: 1.3, max: 1.3, s: 0.2 + Math.random() * 0.18 });
      }
      if (p.kind === 'flame' && p.distTraveled >= p.nf) { p.nf = p.distTraveled + 0.9; addFire(p.x, p.y, 0.5, 4); }
      if (p.kind === 'fireball' && p.distTraveled >= p.nf) { p.nf = p.distTraveled + 2.0; addFire(p.x, p.y, 0.5, 4, 2); }
      if (isWallShot(p.x, p.y)) {
        p.x -= p.dirX * sd; p.y -= p.dirY * sd;
        if (p.vzT !== undefined) p.z -= p.vzT * sdt; else p.z -= p.vz * sd;
        hit = true; wallHit = true;
        const ax = p.x + p.dirX * sd * 1.6, ay = p.y + p.dirY * sd * 1.6;
        if (isWallMap(ax, ay)) {
          if ((p.kind !== 'flame' && p.kind !== 'fireball') || Math.random() < 0.12) wallMark(p.x, p.y, p.dirX, p.dirY, p.z, p.mark, 1, MARK_SIZE[p.mark]);
          if (p.kind !== 'flame' && p.kind !== 'fireball') sfxAt(p.mark === 'plasma' ? 'sizzle' : 'impact', p.x, p.y, 16, p.mark === 'plasma' ? 0.8 : 0.7, false);
        } else { const q = propAt(ax, ay); if (q) hurtProp(q, p.splash ? 80 : p.dmg || 20); }
      } else if (p.vzT !== undefined && p.z <= 0) {
        p.z = 0; hit = true;
      } else {
        for (const e of enemies) {
          if (!e.alive || Math.hypot(p.x - e.x, p.y - e.y) >= e.r || p.z < e.z0 || p.z > e.z1) continue;
          if (p.kind === 'flame') {
            if (!p.hitSet) p.hitSet = new Set();
            if (!p.hitSet.has(e)) { p.hitSet.add(e); damageEnemy(e, p.dmg, true); addFire(e.x, e.y, 0.5, 3); }
            continue;
          }
          hit = true;
          if (!p.splash && p.kind !== 'molotov' && p.kind !== 'grenade' && p.kind !== 'fireball') damageEnemy(e, p.dmg);
          break;
        }
        if (!hit) for (const q of props) if (q.solid === false && Math.abs(p.x - q.x) < 0.35 && Math.abs(p.y - q.y) < 0.35 && p.z <= q.h) { hit = true; hurtProp(q, p.splash ? 80 : p.dmg || 20); break; }
      }
    }
    if (hit) {
      const k = p.kind;
      if (k === 'molotov') {
        addFire(p.x, p.y, 1.3, 10); sfxAt('glass', p.x, p.y, 20, 1);
        explosions.push({ x: p.x, y: p.y, timer: 0, maxTime: 0.3, kind: 'fire' });
      } else if (k === 'grenade') {
        grenadeBlast(p.x, p.y, p.dmg, p.splash, wallHit);
      } else if (p.splash) {
        splashAt(p.x, p.y, p.dmg, p.splash, wallHit);
      } else if (k === 'fireball') {
        addFire(p.x, p.y, 1.0, 5, 2);
        explosions.push({ x: p.x, y: p.y, timer: 0, maxTime: 0.3, kind: 'fire' });
      } else if (k === 'flame') {
        addFire(p.x, p.y, 0.5, 4);
      } else {
        explosions.push({ x: p.x, y: p.y, timer: 0, maxTime: 0.18, kind: k === 'plasma' ? 'plasma' : '' });
      }
      projectiles.splice(i, 1);
    } else if (p.distTraveled > (p.kind === 'flame' ? 6.5 : p.kind === 'fireball' ? 7 : 30)) {
      if (p.kind === 'fireball') addFire(p.x, p.y, 1.0, 5, 2); else if (p.kind === 'flame') addFire(p.x, p.y, 0.5, 4);
      projectiles.splice(i, 1);
    }
  }

  // Witch bolts
  for (let i = eShots.length - 1; i >= 0; i--) {
    const b = eShots[i];
    if (b.homing) {
      const tx = player.x - b.x, ty = player.y - b.y, d = Math.hypot(tx, ty) || 1;
      b.dx += (tx / d - b.dx) * b.homing * dt; b.dy += (ty / d - b.dy) * b.homing * dt;
      const m = Math.hypot(b.dx, b.dy) || 1; b.dx /= m; b.dy /= m;
    }
    b.x += b.dx * (b.sp || 5.5) * dt; b.y += b.dy * (b.sp || 5.5) * dt; b.life -= dt;
    if (b.zig) { b.ph = (b.ph || 0) + dt * 9; const w = Math.sin(b.ph) * b.zig * dt; b.x -= b.dy * w; b.y += b.dx * w; }
    const hitP = Math.hypot(b.x - player.x, b.y - player.y) < (b.r || 0.4);
    let hitE = null;   // friendly fire: a shot from a monster hits any other monster standing in its way (not in the first instants, when it leaves the shooter)
    b.age = (b.age || 0) + dt;
    if (!hitP && b.own && b.age > 0.15 && !TYPES[b.own.type].boss) {
      for (const o of enemies) if (o.alive && o !== b.own && !TYPES[o.type].boss && Math.hypot(b.x - o.x, b.y - o.y) < Math.max(o.r, b.r || 0)) { hitE = o; break; }
    }
    if (hitP || hitE || isWall(b.x, b.y) || b.life <= 0) {
      if (hitE) { damageEnemy(hitE, b.dmg || 12); if (Math.random() < FF_CHANCE) infight(b.own, hitE); }
      if (hitP) { hurt(b.dmg || 12); if (b.slow) player.slow = b.slow; sfx(b.kind === 'throw' || b.kind === 'boulder' || b.kind === 'bullet' ? 'hit_flesh' : 'witch_zap', 0.9); }
      if (b.boom) { addFire(b.x, b.y, 0.7, 3); explosions.push({ x: b.x, y: b.y, timer: 0, maxTime: 0.3, kind: 'fire' }); }
      eShots.splice(i, 1);
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].timer += dt;
    if (explosions[i].timer >= explosions[i].maxTime) explosions.splice(i, 1);
  }

  // Barrel blasts: chained fuses, embers/fire/smoke particles, camera shake and flash
  for (let i = fuses.length - 1; i >= 0; i--) {
    const q = fuses[i];
    if ((q.fuse -= dt) > 0) continue;
    fuses.splice(i, 1);
    if (props.includes(q)) hurtProp(q, 9999);
  }
  for (let i = blasts.length - 1; i >= 0; i--) {
    const b = blasts[i]; b.t += dt;
    for (const p of b.ps) {
      p.life -= dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (isWallMap(nx, ny)) { p.vx *= -0.3; p.vy *= -0.3; } else { p.x = nx; p.y = ny; }
      p.z += p.vz * dt;
      if (p.k === 'ember') { p.vz -= 9 * dt; if (p.z < 0.02) { p.z = 0.02; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; } }
      else { p.vx *= 1 - 1.2 * dt; p.vy *= 1 - 1.2 * dt; }
    }
    b.ps = b.ps.filter(p => p.life > 0);
    if (b.t > b.life && !b.ps.length) blasts.splice(i, 1);
  }

  // Fires burn everyone who stands in them, then die out
  const woodPr = fires.length ? props.filter(q => q.type === 'xbarrel' || (q.type === 'deco' && q.mat === 'wood')) : null;
  for (let i = fires.length - 1; i >= 0; i--) {
    const f = fires[i]; f.life -= dt;
    if (f.life <= 0) { fires.splice(i, 1); continue; }
    if (!f.mine && Math.hypot(player.x - f.x, player.y - f.y) < f.r) hurt(14 * dt);
    for (const e of enemies) if (e.alive && Math.hypot(e.x - f.x, e.y - f.y) < f.r + e.r * 0.5) damageEnemy(e, 30 * dt * f.m, true);
    for (const q of woodPr) if (q.hp > 0 && Math.hypot(q.x - f.x, q.y - f.y) < f.r + 0.3) hurtProp(q, 12 * dt * f.m, true);
  }
  for (let i = nebulas.length - 1; i >= 0; i--) { nebulas[i].life -= dt; if (nebulas[i].life <= 0) nebulas.splice(i, 1); }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.life -= dt; d.vz -= 9 * dt; d.z += d.vz * dt;
    if (!isWall(d.x + d.vx * dt, d.y + d.vy * dt)) { d.x += d.vx * dt; d.y += d.vy * dt; }
    if (d.z < 0) { d.z = 0; d.vz *= -0.3; d.vx *= 0.5; d.vy *= 0.5; }
    if (d.life <= 0) debris.splice(i, 1);
  }
  const nearChest = props.some(c => c.type === 'chest' && !c.open && Math.hypot(c.x - player.x, c.y - player.y) < 1.5);
  const bu = document.getElementById('btnUse'), want = nearChest ? 'flex' : 'none';
  if (bu.style.display !== want) bu.style.display = want;

  // Hordes: stepping into an ambush room releases its enemies, one by one, out of the nearby tunnels
  for (const h of hordes) {
    const r = h.r;
    if (!h.fired && player.x > r.x + 0.8 && player.x < r.x + r.w - 0.8 && player.y > r.y + 0.8 && player.y < r.y + r.h - 0.8) {
      h.fired = true; h.tt = 0.8; say('ORDA IN ARRIVO DAI CUNICOLI!');
      const far = h.cand.slice().sort((a, b) => Math.hypot(b[0] - player.x, b[1] - player.y) - Math.hypot(a[0] - player.x, a[1] - player.y));
      const pk = []; for (const c of far) if (!pk.some(o => Math.hypot(o[0] - c[0], o[1] - c[1]) < 1.4)) pk.push(c);
      for (let i = 0; i < h.n; i++) h.q.push(pk[i % pk.length]);
    }
    if (h.fired && h.q.length && (h.tt -= dt) <= 0) {
      h.tt = 0.45 + Math.random() * 0.5;
      const c = h.q.shift(); enemies.push(mkEnemy(c[0], c[1], h.type));
      if (!h.snd) { h.snd = true; sfxAt('summon', c[0], c[1], 18, 1); }
    }
  }

  // Enemies
  for (const e of enemies) {
    if (!e.alive) { e.deathTimer += dt; continue; }
    e.back = false;
    e.vC -= dt;
    const vd = Math.hypot(e.x - player.x, e.y - player.y), vr = 7 * (TYPES[e.type].boss ? 1.6 : 1);
    if (vd < vr) {
      if (!e.near) { e.near = true; e.vT = Math.min(e.vT, 0.1 + Math.random() * 0.35); }   // it notices you: cries almost at once
      e.vT -= dt;
      if (e.vT <= 0) { const w = e.hp < e.mhp; e.vT = (w ? 1.6 : 2.8) + Math.random() * 2; enemyVoice(e, w ? 'hurt' : 'idle'); }
    } else e.near = false;
    const T = TYPES[e.type], dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
    if (e.foe && duel(e, dt)) continue;   // fighting another monster
    if (e.type !== 'boss' && e.hp >= e.mhp && !e.act && field[(e.y | 0) * N + (e.x | 0)] >= 18) { wander(e, dt); continue; }
    if (e.bh !== 'normal' && e.bs !== 'normal' && behave(e, dt, dist)) continue;
    e.animTimer += dt * Math.max(0.6, Math.min(2, e.sp));
    if (e.animTimer > 0.15) { e.frame = (e.frame + 1) % 8; e.animTimer = 0; }
    if (T.boss) { bossAI(e, dt, dist); continue; }
    if (e.abil && special(e, dt, dist)) continue;
    if (e.type === 'witch' && !e.abil) {
      e.shotT -= dt; e.cast -= dt;
      if (dist < 12 && los(e.x, e.y, player.x, player.y)) {
        if (e.shotT <= 0) {
          eShots.push({ x: e.x, y: e.y, dx: dx / dist, dy: dy / dist, life: 4, dmg: 12 * e.pw, own: e });
          e.shotT = 1.8; e.cast = 0.4; sfxAt('witch_cast', e.x, e.y, 14, 0.9);
        }
        if (dist < 4.5) { e.state = e.cast > 0 ? 'attack' : 'walk'; continue; }
      }
    }
    if (dist > (T.r || 0.4) + 0.4) {
      e.state = e.type === 'witch' && e.cast > 0 ? 'attack' : 'walk';
      chase(e, dt, T.spd * e.sp, dist);
      const SD = STRIDE[e.type];
      if (SD && e.sd >= SD) { e.sd -= SD; enemyStep(e); }
    } else {
      e.state = 'attack'; hurt(T.dmg * dt * e.pw);
    }
  }
  separateDemons();
  enemies = enemies.filter((e) => e.alive || e.deathTimer < 8);

  updatePickups();
  if (wmOpen) refreshWeaponMenu();

  remaining = enemies.filter(e => e.alive && !TYPES[e.type].minion).length + hordes.reduce((n, h) => n + (h.fired ? h.q.length : h.n), 0);
  if (stairs && !doorOpen && remaining === 0 && keys < keysNeed && !hinted) { hinted = true; say('SERVONO ' + keysNeed + ' CHIAVI PER LA PORTA'); }
  if (stairs && !doorOpen && !doorAnim) {
    const dd2 = Math.hypot((doorCell % N) + 0.5 - player.x, Math.floor(doorCell / N) + 0.5 - player.y);
    doorHintT -= dt;
    if (remaining === 0 && keys >= keysNeed) {
      if (dd2 < 1.8) { doorAnim = { t: 0, s: 0, ev: {} }; say('LE CHIAVI APRONO I LUCCHETTI...'); }
      else if (!readyMsg) { readyMsg = true; say('TORNA ALLA PORTA DELLE SCALE'); }
    } else if (dd2 < 1.8 && doorHintT <= 0) {
      doorHintT = 4;
      say(remaining > 0 ? 'UCCIDI TUTTI I NEMICI DEL PIANO' : 'MANCANO ' + (keysNeed - keys) + ' CHIAVI');
    }
  }
  if (doorAnim) updateDoorAnim(dt);
  if (curFloor === 4 && updateBossFloor(dt)) return;

  const hpT = Math.round(player.hp);
  if (hpT !== lastHp) { lastHp = hpT; hpEl.textContent = hpT; }
  if (player.kills !== lastKills) { lastKills = player.kills; killsEl.textContent = player.kills; }

  if (stairs && doorOpen && Math.hypot(stairs.x - player.x, stairs.y - player.y) < 0.55) {
    player.hp = Math.min(100, player.hp + 25);
    loadFloor(progress + 1);
  }
}
