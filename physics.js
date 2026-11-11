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
