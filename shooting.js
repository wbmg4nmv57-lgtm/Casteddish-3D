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
