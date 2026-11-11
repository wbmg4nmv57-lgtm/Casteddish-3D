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
