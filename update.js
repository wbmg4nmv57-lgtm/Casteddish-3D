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
