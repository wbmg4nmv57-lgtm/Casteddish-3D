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
