/* ######################################################################
   CASTEDDISH - Mondo 3D del piano 1
   Disegno 2D (raycaster), livelli, botole e trappole del piano 1, disegno 3D con Three.js.
   Sezioni, in ordine: raycaster.js, world-floor1.js, three-floor1.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Disegno del mondo 3D
   Luci, pavimento, soffitto, muri (raycasting) e funzione render().
   ====================================================================== */

/* ---------- Rendering ---------- */
const zBuffer = new Float32Array(RENDER_WIDTH);
const fb = ctx.createImageData(RENDER_WIDTH, RENDER_HEIGHT);
const fb32 = new Uint32Array(fb.data.buffer);
let flick = 1;

function lightAt(x, y) {
  let l = 0;
  for (const t of torches) { const d2 = (x - t.x) * (x - t.x) + (y - t.y) * (y - t.y); l += (t.k || 1) * 1.4 / (1 + d2 * (t.f || 0.9)); }
  for (const f of fires) { const d2 = (x - f.x) * (x - f.x) + (y - f.y) * (y - f.y); l += 1.6 * Math.min(1, f.life / 1.5) * f.r / (1 + d2 * 0.8); }
  for (const b of blasts) { if (b.t > 1.1) continue; const d2 = (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y); l += 3.2 * (1 - b.t / 1.1) / (1 + d2 * 0.25); }
  for (const p of projectiles) {   // glowing shots light the walls they fly past
    const w = p.kind === 'plasma' ? 1.7 : p.kind === 'fireball' ? 1.8 : p.kind === 'flame' ? 0.9 : p.big ? 2 : 0;
    if (w) l += w / (1 + ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y)) * 1.1);
  }
  for (const s of eShots) {
    const w = s.kind === 'plasma' ? 1.5 : s.kind === 'fire' ? 1.4 : (s.kind === 'venom' || s.kind === 'bolt') ? 1 : 0;
    if (w) l += w / (1 + ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y)) * 1.1);
  }
  for (const ex of explosions) l += 2.2 * (1 - ex.timer / ex.maxTime) / (1 + ((x - ex.x) * (x - ex.x) + (y - ex.y) * (y - ex.y)) * 0.6);
  if (isFiring && cur !== 4 && cur !== 5) {   // the flash of your own gun
    const m = cur === 6 ? 0.8 : [0, 1, 0.45, 0.15][fireAnimFrame] || 0;
    if (m) { const mx = player.x + player.dirX * 0.7, my = player.y + player.dirY * 0.7; l += 2.6 * m / (1 + ((x - mx) * (x - mx) + (y - my) * (y - my)) * 0.5); }
  }
  return l * flick;
}

let horizon = RENDER_HEIGHT / 2;
function drawFloorCeil() {
  const W = RENDER_WIDTH, H = RENDER_HEIGHT, half = H / 2, P = PAL[curFloor];
  const x0 = player.dirX - player.planeX, y0 = player.dirY - player.planeY;
  const x1 = player.dirX + player.planeX, y1 = player.dirY + player.planeY;
  const fR = fogC[0], fG = fogC[1], fB = fogC[2], lo = tNow * 14;
  for (let y = 0; y < H; y++) {
    const d = y + 0.5 - horizon, fl = d > 0;
    const rd = Math.min(40, half / Math.abs(d));
    const k = Math.max(0.08, Math.min(1, 1 - rd / 9)) * flick, sh = k * (fl ? P.amb * 1.3 : P.amb * 0.95), shL = Math.max(sh, liqEmit);
    const buf = fl ? floorBuf : ceilBuf;
    let fx = player.x + rd * x0, fy = player.y + rd * y0;
    const sx = rd * (x1 - x0) / W, sy = rd * (y1 - y0) / W, row = y * W;
    for (let x = 0; x < W; x++) {
      let c, s = sh;
      if (fl) {
        const fi = fy | 0, fj = fx | 0;
        if (fi >= 0 && fi < N && fj >= 0 && fj < N && liq[fi * N + fj]) {
          c = liqBuf[(fy * TS + lo & TS - 1) * TS + (fx * TS - lo * 0.6 & TS - 1)]; s = shL;
        } else c = buf[(fy * TS & TS - 1) * TS + (fx * TS & TS - 1)];
      } else c = buf[(fy * TS & TS - 1) * TS + (fx * TS & TS - 1)];
      const a = 1 - s;
      fb32[row + x] = 0xff000000 | (((c >> 16 & 255) * s + fB * a) << 16) | (((c >> 8 & 255) * s + fG * a) << 8) | ((c & 255) * s + fR * a | 0);
      fx += sx; fy += sy;
    }
  }
}

function render() {
  if (typeof render3D === 'function' && render3D()) return;   // piano 1: mondo 3D con Three.js (js/rendering/three-floor1.js)
  flick = (0.9 + 0.1 * Math.sin(tNow * 17) * Math.sin(tNow * 5.3) + (Math.random() - 0.5) * 0.06) * powerK;
  horizon = RENDER_HEIGHT / 2;
  drawFloorCeil();
  ctx.putImageData(fb, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const torchFrame = Math.floor(tNow * 9) % 4;

  for (let x = 0; x < RENDER_WIDTH; x++) {
    const cameraX = 2 * x / RENDER_WIDTH - 1;
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;
    let mapX = Math.floor(player.x), mapY = Math.floor(player.y);
    const deltaDistX = Math.abs(1 / rayDirX), deltaDistY = Math.abs(1 / rayDirY);
    let stepX, stepY, sideDistX, sideDistY, hit = 0, side = 0;

    if (rayDirX < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaDistX; }
    else { stepX = 1; sideDistX = (mapX + 1.0 - player.x) * deltaDistX; }
    if (rayDirY < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaDistY; }
    else { stepY = 1; sideDistY = (mapY + 1.0 - player.y) * deltaDistY; }

    while (hit === 0) {
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
      else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
      if (map[mapY * MAP_WIDTH + mapX] > 0) hit = 1;
    }

    const perp = side === 0
      ? (mapX - player.x + (1 - stepX) / 2) / rayDirX
      : (mapY - player.y + (1 - stepY) / 2) / rayDirY;
    zBuffer[x] = perp;

    const wallType = map[mapY * MAP_WIDTH + mapX];
    let wx = side === 0 ? player.y + perp * rayDirY : player.x + perp * rayDirX;
    wx -= Math.floor(wx);
    let tx = Math.floor(wx * TS);
    if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) tx = TS - 1 - tx;
    const tex = wallType === 3 ? wallTex[3][torchFrame] : wallTex[wallType];
    const lh = Math.floor(RENDER_HEIGHT / perp), top = Math.floor(horizon - lh / 2);
    ctx.drawImage(tex, tx, 0, 1, TS, x, top, 1, lh);
    const dl = decals.size ? decals.get((mapY * N + mapX) * 4 + side * 2 + ((side === 0 ? stepX : stepY) > 0 ? 0 : 1)) : null;
    if (dl) for (const dc of dl) {
      const du = (wx - dc.u) / dc.s;
      if (du < -0.5 || du >= 0.5) continue;
      const dh = dc.s * lh;
      ctx.drawImage(decalArt[dc.t], ((du + 0.5) * 64) | 0, 0, 1, 64, x, top + dc.v * lh - dh / 2, 1, dh);
    }

    const hx = player.x + perp * rayDirX, hy = player.y + perp * rayDirY;
    let shade = Math.min(1, Math.max(0.1, 1 - perp / 10) * PAL[curFloor].amb * flick + lightAt(hx, hy) * 0.5);
    if (side === 1) shade *= 0.82;
    ctx.fillStyle = `rgba(${fogS},${(1 - shade).toFixed(3)})`;
    ctx.fillRect(x, top, 1, lh);
  }

  renderSprites();
  renderGun();
  if (mm.t > 0 || mm.goal || (frameCount & 3) === 0) renderMinimap();
}

/* ======================================================================
   CASTEDDISH - Mondo del piano 1: livelli, botole e trappole
   POZZO: stanza con fossa profonda 1 al centro, parapetto tutto intorno
          e una scalinata che scende. E' la meta delle botole.
   BALCONE: piattaforma alta lungo una parete, con scalinata e parapetto.
   TRAPPOLE nei corridoi: tratto di spuntoni sincronizzati (si passa a
          tempo) e feritoia in fondo al corridoio che spara lungo il tratto.
   BOTOLE nelle stanze: cadi nel pozzo.
   Niente salti nel vuoto: i dislivelli sono solo scalini da 0,33 oppure
   parapetti pieni (muri bassi). Sempre uguale a ogni partita.
   ====================================================================== */
const W1 = { map: null, ver: 0, H: new Float32Array(N * N), C: new Float32Array(N * N).fill(1), rail: new Uint8Array(N * N), rails: [], spikes: [], doors: [], shooters: [], darts: [], fall: 0, camH: 0, t: 0, cellar: null, dead: false, dm: [] };
const world1H = (x, y) => (x >= 0 && y >= 0 && x < N && y < N) ? W1.H[(y | 0) * N + (x | 0)] : 0;          // altezza del pavimento
const world1C = (x, y) => (x >= 0 && y >= 0 && x < N && y < N) ? W1.C[(y | 0) * N + (x | 0)] : 1;          // altezza del soffitto
const world1Hn = (x, y) => { let m = world1H(x, y); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m = Math.max(m, world1H(x + a, y + b)); return m; };

function world1Ensure() { if (W1.map !== map) world1Carve(); }   // di norma e gia stata chiamata da loadFloor()

function world1Carve(f) {
  W1.map = map; W1.ver++;
  const H = W1.H.fill(0), C = W1.C.fill(1); W1.rail.fill(0);
  W1.rails.length = W1.spikes.length = W1.doors.length = W1.shooters.length = W1.darts.length = 0; W1.fall = 0; W1.camH = 0; W1.cellar = null;
  if ((f !== undefined ? f : curFloor) !== 0 || rooms.length < 5) return;
  let sd = 20261112; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const idx = (x, y) => y * N + x, open = i => map[i] === 0, area = r => r.w * r.h;
  const inRect = (r, x, y) => !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const start = rooms[0], sroom = stairs && rooms.find(r => inRect(r, stairs.x, stairs.y));
  const cand = rooms.filter(r => r !== start && r !== sroom).sort((a, b) => area(b) - area(a));
  const rail = (i, x, y) => { map[i] = 2; blk[i] = 2; W1.rail[i] = 1; W1.rails.push({ x, y, i }); };   // il parapetto conta come muro per fisica, colpi e nemici

  // ---- POZZO: fossa centrale a -1, parapetto intorno, scalinata di 2 gradini sul lato ovest
  const pit = cand.find(r => r.w >= 7 && r.h >= 8 && !(r.w > 8 && r.h > 8));
  if (pit) {
    const x0 = pit.x + 1, x1 = pit.x + pit.w - 2, y0 = pit.y + 1, y1 = pit.y + pit.h - 2, oy = (y0 + y1) >> 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y); if (!open(i)) continue;
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (edge && !(x === x0 && (y === oy || y === oy + 1))) { rail(i, x, y); continue; }
      H[i] = x === x0 ? -0.33 : (x === x0 + 1 && (y === oy || y === oy + 1)) ? -0.66 : -1;
    }
    W1.cellar = pit;
  }
  // ---- BALCONE: piattaforma a quota 1 lungo una parete, 2 gradini, parapetto sul lato che guarda la sala
  const layout = (r, side, flip) => {
    const horiz = side === 'N' || side === 'S', L = horiz ? r.w : r.h;
    const wp = (u, v) => { const uu = flip ? L - 1 - u : u; return side === 'N' ? [r.x + uu, r.y + v] : side === 'S' ? [r.x + uu, r.y + r.h - 1 - v] : side === 'W' ? [r.x + v, r.y + uu] : [r.x + r.w - 1 - v, r.y + uu]; };
    const cells = [];
    for (let v = 0; v <= 1; v++) { const [x, y] = wp(0, v); if (!open(idx(x, y))) return null; }     // ingresso alla scala
    for (let u = 1; u < L; u++) for (let v = 0; v <= 2; v++) { const [x, y] = wp(u, v); if (!open(idx(x, y))) return null; cells.push({ i: idx(x, y), x, y, u, v }); }
    for (const c of cells) {            // nessun corridoio deve sbucare sulla piattaforma: sarebbe un salto nel vuoto
      if (c.v === 2) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = c.x + dx, ny = c.y + dy; if (!inRect(r, nx, ny) && open(idx(nx, ny))) return null; }
    }
    return cells;
  };
  let balRoom = null;
  for (const r of cand) {
    if (r === pit || r.w < 7 || r.h < 6 || balRoom) continue;
    for (const side of ['N', 'S', 'W', 'E']) for (const flip of [0, 1]) {
      if (balRoom) break;
      const cells = layout(r, side, flip); if (!cells) continue;
      for (const c of cells) { H[c.i] = c.u === 1 ? 0.33 : c.u === 2 ? 0.66 : 1; if (c.v === 2) rail(c.i, c.x, c.y); }
      balRoom = r;
    }
  }
  // soffitto alto nelle due sale, e il soffitto sale insieme alle scale
  for (const r of [pit, balRoom]) if (r) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const i = idx(x, y); if (open(i) || W1.rail[i]) C[i] = 2.6; }
  for (let i = 0; i < N * N; i++) if (open(i) || W1.rail[i]) C[i] = Math.max(C[i], H[i] + 1.3);

  // ---- TRAPPOLE NEI CORRIDOI (larghi 1): tratti dritti di almeno 5 celle
  const inRoom = new Uint8Array(N * N);
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) inRoom[idx(x, y)] = 1;
  const corr = i => open(i) && !inRoom[i] && !blk[i] && !liq[i] && H[i] === 0;
  const segs = [];
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const straight = (x, y) => x > 0 && y > 0 && x < N - 1 && y < N - 1 && corr(idx(x, y)) && !open(idx(x + dy, y + dx)) && !open(idx(x - dy, y - dx));
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      if (!straight(x, y) || straight(x - dx, y - dy)) continue;
      let n = 0; while (straight(x + dx * n, y + dy * n)) n++;
      if (n >= 5 && Math.hypot(x - start.cx, y - start.cy) > 8) segs.push({ x, y, dx, dy, n });
    }
  }
  segs.sort((a, b) => b.n - a.n);
  const picked = [], wallOk = (x, y) => { const m = map[idx(x, y)]; return m === 1 || m === 2 || m === 4; };
  for (const s of segs) {
    if (picked.length >= 5) break;
    const mx = s.x + s.dx * (s.n >> 1), my = s.y + s.dy * (s.n >> 1);
    if (picked.some(p => Math.hypot(p.mx - mx, p.my - my) < 8)) continue;
    picked.push({ mx, my });
    const ph = rnd() * 3.2, m = s.n >> 1;
    for (let k = m - 1; k <= m + 1; k++) { const x = s.x + s.dx * k, y = s.y + s.dy * k; W1.spikes.push({ x: x + 0.5, y: y + 0.5, c: idx(x, y), o: ph, up: 0, hit: false }); }   // 3 celle sincronizzate
    const ex = s.x + s.dx * s.n, ey = s.y + s.dy * s.n, bx = s.x - s.dx, by = s.y - s.dy;
    if (wallOk(ex, ey)) W1.shooters.push({ x: ex + 0.5, y: ey + 0.5, dx: -s.dx, dy: -s.dy, len: s.n, cd: 1 + rnd() * 2 });          // feritoia in fondo, spara lungo il tratto
    else if (wallOk(bx, by)) W1.shooters.push({ x: bx + 0.5, y: by + 0.5, dx: s.dx, dy: s.dy, len: s.n, cd: 1 + rnd() * 2 });
  }
  // ---- BOTOLE: una per stanza (non nelle sale speciali), accanto al centro
  if (W1.cellar) {
    const skip = new Set([start, sroom, pit, balRoom]);
    for (const r of rooms.filter(q => !skip.has(q)).sort((a, b) => area(b) - area(a))) {
      if (W1.doors.length >= 5) break;
      for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2]]) {
        const x = r.cx + ox, y = r.cy + oy, i = idx(x, y);
        if (x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1 && open(i) && !blk[i] && H[i] === 0) { W1.doors.push({ x: x + 0.5, y: y + 0.5, s: 0, t: 0, a: 0 }); break; }
      }
    }
  }
}

function w1Fall() {   // caduta nel pozzo
  const c = W1.cellar; let best = null;
  for (let r = 0; r < 7 && !best; r++) for (let j = -r; j <= r && !best; j++) for (let i = -r; i <= r; i++) {
    const x = c.cx + i, y = c.cy + j, n = y * N + x;
    if (map[n] === 0 && !blk[n] && W1.H[n] < -0.9) { best = [x, y]; break; }
  }
  if (!best) return;
  player.x = best[0] + 0.5; player.y = best[1] + 0.5; W1.camH = W1.H[best[1] * N + best[0]]; W1.fall = 0.8;
  hurt(10); say('SEI CADUTO IN UNA BOTOLA!');
  if (typeof shake === 'object' && shake) { shake.t = shake.max = 0.5; shake.a = 10; }
}

// Chiamata da update() a ogni fotogramma
function world1Update(dt) {
  if (W1.dead || curFloor !== 0) return;
  try {
    world1Ensure();
    if (!gameStarted || player.hp <= 0) return;
    W1.t += dt; const px = player.x, py = player.y, pc = (py | 0) * N + (px | 0);
    W1.camH += (W1.H[pc] - W1.camH) * Math.min(1, dt * 9); if (W1.fall > 0) W1.fall = Math.max(0, W1.fall - dt);
    for (const s of W1.spikes) {   // spuntoni: nascosti, avviso, fuori, rientrano (3,2 s)
      const p = (W1.t + s.o) % 3.2;
      s.up = p < 1.6 ? 0 : p < 2.1 ? (p - 1.6) / 0.5 * 0.3 : p < 2.8 ? 1 : 1 - (p - 2.8) / 0.4;
      if (p < 1.6) s.hit = false;
      if (s.up > 0.9 && !s.hit && pc === s.c) { s.hit = true; hurt(18); }
    }
    for (const d of W1.doors) {    // botole: scricchiolano, si aprono, cadi se sei sopra
      const on = Math.hypot(px - d.x, py - d.y) < 0.42;
      if (d.s === 0) { if (on) { d.s = 1; d.t = 0; } }
      else if (d.s === 1) { d.t += dt; if (d.t > 0.45) { d.s = 2; d.t = 0; } }
      else if (d.s === 2) { d.t += dt; d.a = Math.min(1, d.t / 0.2); if (on && d.t > 0.12 && W1.cellar) w1Fall(); if (d.t > 5) { d.s = 3; d.t = 0; } }
      else { d.t += dt; d.a = Math.max(0, 1 - d.t / 0.5); if (d.t > 0.5) d.s = 0; }
    }
    for (const s of W1.shooters) {   // dardi: partono quando sei nel corridoio davanti alla feritoia
      s.cd -= dt; if (s.cd > 0) continue;
      const rx = px - s.x, ry = py - s.y, along = rx * s.dx + ry * s.dy, side = Math.abs(rx * s.dy - ry * s.dx);
      if (along > 0.8 && along < s.len + 0.8 && side < 0.9 && los(s.x + s.dx, s.y + s.dy, px, py)) { W1.darts.push({ x: s.x + s.dx * 0.6, y: s.y + s.dy * 0.6, dx: s.dx, dy: s.dy }); s.cd = 3; } else s.cd = 0.25;
    }
    for (let i = W1.darts.length - 1; i >= 0; i--) {
      const a = W1.darts[i]; a.x += a.dx * dt * 7; a.y += a.dy * dt * 7;
      if (isWall(a.x, a.y)) W1.darts.splice(i, 1); else if (Math.hypot(a.x - px, a.y - py) < 0.3) { hurt(9); W1.darts.splice(i, 1); }
    }
  } catch (err) { console.error('Trappole disattivate:', err); W1.dead = true; }
}

// ---------- parte 3D (chiamata da three-floor1.js) ----------
function world1Build3D(root) {
  const g = W1.g = new THREE.Group(); root.add(g); W1.dm = [];
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const B = (w, h, d, m, x, y, z, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); (p || g).add(o); return o; };
  const stone = M(0x6e6760), cap = M(0x4a4540), rs = W1.rail;   // parapetti: muretto basso con cappello
  for (const r of W1.rails) {
    const h = W1.H[r.i], hx = rs[r.i - 1] || rs[r.i + 1], hy = rs[r.i - N] || rs[r.i + N], ax = hx || !hy;
    B(ax ? 1 : 0.3, 0.55, ax ? 0.3 : 1, stone, r.x + 0.5, h + 0.275, r.y + 0.5);
    B(ax ? 1.02 : 0.38, 0.07, ax ? 0.38 : 1.02, cap, r.x + 0.5, h + 0.585, r.y + 0.5);
    if (hx && hy) B(0.4, 0.8, 0.4, cap, r.x + 0.5, h + 0.4, r.y + 0.5);   // pilastro negli angoli
  }
  for (const s of W1.spikes) {   // piastra con 9 punte
    B(0.9, 0.03, 0.9, M(0x2a2a2e), s.x, 0.015, s.y); s.tips = [];
    for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.32, 6), M(0xb8bcc4)); t.position.set(s.x - 0.3 + (i % 3) * 0.3, 0.03, s.y - 0.3 + ((i / 3) | 0) * 0.3); g.add(t); s.tips.push(t); }
  }
  for (const d of W1.doors) {    // botola: buio sotto e due ante di legno che si aprono verso il basso
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.rotation.x = -Math.PI / 2; hole.position.set(d.x, 0.012, d.y); g.add(hole);
    d.leaves = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(d.x, 0.03, d.y + s * 0.47); p.userData.s = s; g.add(p); B(0.94, 0.04, 0.47, M(0x5a3a1c), 0, 0, -s * 0.235, p); B(0.06, 0.05, 0.06, M(0x888888), 0, 0.03, -s * 0.235, p); return p; });
  }
  for (const s of W1.shooters) B(s.dx ? 0.06 : 0.34, 0.14, s.dx ? 0.34 : 0.06, M(0x111111), s.x + s.dx * 0.5, 0.5, s.y + s.dy * 0.5);   // feritoia nel muro
  W1.dg = new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6); W1.dg.rotateX(Math.PI / 2); W1.dmat = new THREE.MeshBasicMaterial({ color: 0xd8d0b0 });
}

function world1Sync3D() {
  for (const s of W1.spikes) for (const t of s.tips) { const u = Math.max(0.001, s.up); t.scale.y = u; t.position.y = 0.03 + 0.16 * u; }
  for (const d of W1.doors) for (const p of d.leaves) p.rotation.x = -p.userData.s * (d.s === 1 ? 0.06 * Math.sin(W1.t * 60) : d.a * 1.45);
  while (W1.dm.length < W1.darts.length) { const m = new THREE.Mesh(W1.dg, W1.dmat); W1.g.add(m); W1.dm.push(m); }
  W1.dm.forEach((m, i) => { const a = W1.darts[i]; m.visible = !!a; if (a) { m.position.set(a.x, 0.5, a.y); m.rotation.y = Math.atan2(a.dx, a.dy); } });
}

/* ======================================================================
   CASTEDDISH - Piano 1 in 3D (Three.js)
   Muri, pavimento, soffitto, luci, mostri, oggetti di scena e raccoglibili
   sono veri oggetti 3D. Gli altri piani usano ancora il motore 2D.
   Se Three.js non si carica o qualcosa va storto, torna da solo al 2D.
   ====================================================================== */
const T3 = { on: false, failed: false, sig: '', stamp: 0, mobs: new Map(), prj: new Map(), eprj: new Map(), pick: new Map(), prop: new Map(), icons: new Map(), bars: new Map(), chd: [] };

const T3CFG = { ambient: 0.16, hand: 1.5, handDist: 6.5, torch: 1.4, torchDist: 8, fog: 0.2 };   // luminosita: alza o abbassa questi numeri
function t3Tex(cv) { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function t3Mat(c, r) { return new THREE.MeshStandardMaterial({ color: c, roughness: r || 0.85 }); }
const t3Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function t3Init() {
  const gl = new THREE.WebGLRenderer({ antialias: true });
  gl.setSize(RENDER_WIDTH * 2, RENDER_HEIGHT * 2, false);
  gl.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
  document.getElementById('stage').insertBefore(gl.domElement, canvas);   // sotto il canvas 2D (arma e scritte)
  T3.gl = gl; T3.cv = gl.domElement; T3.scene = new THREE.Scene();
  T3.cam = new THREE.PerspectiveCamera(50, 2, 0.05, 40);
  T3.amb = new THREE.AmbientLight(0xfff0e0, T3CFG.ambient); T3.scene.add(T3.amb);
  T3.hand = new THREE.PointLight(0xffd7a0, T3CFG.hand, T3CFG.handDist, 1.6); T3.scene.add(T3.hand);
  T3.lights = []; for (let i = 0; i < 7; i++) { const l = new THREE.PointLight(0xffaa44, 1, T3CFG.torchDist, 1.6); T3.scene.add(l); T3.lights.push(l); }
  T3.fxLights = []; for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffaa44, 0, 9, 1.6); T3.scene.add(l); T3.fxLights.push(l); }   // lampi dei colpi, delle fiamme e delle esplosioni
  T3.on = true;
}

// ---------- il livello: muri, pavimento, soffitto, scale ----------
function t3Build() {
  const sc = T3.scene, P = PAL[0];
  if (T3.root) sc.remove(T3.root);
  const root = T3.root = new THREE.Group(); sc.add(root);
  for (const m of [T3.mobs, T3.prj, T3.eprj, T3.pick, T3.prop, T3.bars]) m.clear();
  T3.chd = [];
  const fog = new THREE.Color(fogC[0] / 255, fogC[1] / 255, fogC[2] / 255).multiplyScalar(0.4);
  sc.fog = new THREE.FogExp2(fog, T3CFG.fog); T3.gl.setClearColor(fog);
  const tile = (buf, rep) => {
    const c = document.createElement('canvas'); c.width = c.height = TS;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length * 4).slice(), TS, TS), 0, 0);
    const t = t3Tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
  };
  // pavimento e soffitto: un blocco per cella, cosi ogni cella ha la sua altezza (gradini, cantina, sala alta)
  const cellsOpen = []; for (let i = 0; i < N * N; i++) if (map[i] === 0 || W1.rail[i]) cellsOpen.push(i);
  const slab = (buf, hOf, off) => {
    const mat = new THREE.MeshStandardMaterial({ map: buf ? tile(buf, 1) : null, color: buf ? 0xffffff : 0x333333, roughness: 1 }), im = new THREE.InstancedMesh(t3Box(1, 3, 1), mat, cellsOpen.length), m4 = new THREE.Matrix4();
    cellsOpen.forEach((c, k) => { m4.setPosition((c % N) + 0.5, hOf(c) + off, ((c / N) | 0) + 0.5); im.setMatrixAt(k, m4); }); root.add(im);
  };
  slab(floorBuf, c => W1.H[c], -1.5); slab(ceilBuf, c => W1.C[c], 1.5);
  // muri: solo quelli che toccano uno spazio libero, un InstancedMesh per tipo di texture
  const open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && (map[y * N + x] === 0 || W1.rail[y * N + x] === 1);
  const by = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = map[y * N + x];
    if (t > 0 && !W1.rail[y * N + x] && (open(x + 1, y) || open(x - 1, y) || open(x, y + 1) || open(x, y - 1))) (by[t] = by[t] || []).push(x, y);
  }
  T3.torchMats = [];
  T3.wbox = T3.wbox || (() => { const g = t3Box(1, 6, 1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 6); return g; })();   // muro alto 6, texture ripetuta ogni unita
  for (const t in by) {
    const tx = wallTex[t]; if (!tx) continue;
    const arr = Array.isArray(tx), mat = new THREE.MeshStandardMaterial({ map: t3Tex(arr ? tx[0] : tx), roughness: 1 });
    if (arr) T3.torchMats.push({ mat, frames: tx.map(t3Tex) });
    else if (t == 5) T3.doorTex = mat.map;
    const im = new THREE.InstancedMesh(T3.wbox, mat, by[t].length / 2), m4 = new THREE.Matrix4();
    for (let i = 0; i < by[t].length; i += 2) { m4.setPosition(by[t][i] + 0.5, 1, by[t][i + 1] + 0.5); im.setMatrixAt(i / 2, m4); }
    root.add(im);
  }
  // scale: otto gradini veri che salgono verso il portale
  if (stairs) {
    const g = new THREE.Group(), y0 = stairs.y - 0.5;
    for (let i = 0; i < STAIR_STEPS; i++) { const h = 0.05 * (STAIR_STEPS - i) + 0.04, s = new THREE.Mesh(t3Box(0.8, h, 0.1), t3Mat(i % 2 ? '#6a6a70' : '#85858c')); s.position.set(stairs.x, h / 2, y0 + 0.8 - i * 0.085); g.add(s); }
    const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshBasicMaterial({ map: t3Tex(stairPortal), transparent: true, fog: false }));
    pt.position.set(stairs.x, 0.5, y0 + 0.1); g.add(pt); root.add(g);
  }
  world1Build3D(root);   // trappole, botole
}

// ---------- mostri: veri modelli 3D con gambe e braccia che si muovono ----------
// =====================================================================================================================
// DEMONE-ARTIGLIO (piano 1): modellazione procedurale. Superfici lisce scolpite (loft e scultura), non piu pezzi di sfere e coni.
// Ogni parte e una sola mesh con "ombre ambientali" nei colori di vertice, rilievo (bump) e texture dettagliate della pelle.
// Lo scheletro resta quello di prima: bacino > torace > collo > testa, spalla > gomito, anca > ginocchio > caviglia, coda a 4 segmenti.
// =====================================================================================================================
const t3cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const t3nm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// BufferGeometry da array; se i triangoli sono rivolti verso l'interno (volume negativo) li rigira
function t3Geo(pos, uv, col, idx) {
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) + pos[a + 1] * (pos[b + 2] * pos[c] - pos[b] * pos[c + 2]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// Loft: superficie liscia che segue una serie di anelli. Anello = [x, y, z, raggioX, raggioZ, ombra 0-1, spostX, spostZ, [r,g,b]]
function t3Loft(rings, seg, o) {
  o = o || {};
  const n = rings.length, pos = [], uv = [], col = [], idx = [], tint = o.tint || [1, 1, 1], ex = o.n || 2, W = seg + 1;
  const A = rings[0], B = rings[n - 1], dv = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const ref = Math.abs(dv[1]) > 0.7 * Math.hypot(dv[0], dv[1], dv[2]) ? [0, 0, 1] : [0, 1, 0];
  let v = 0;
  for (let i = 0; i < n; i++) {
    const r = rings[i], a = rings[Math.max(0, i - 1)], b = rings[Math.min(n - 1, i + 1)];
    const T = t3nm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), S = t3nm(t3cr(T, ref)), U = t3cr(S, T);
    if (i) v += Math.hypot(r[0] - rings[i - 1][0], r[1] - rings[i - 1][1], r[2] - rings[i - 1][2]);
    const ao = r[5] === undefined ? 1 : r[5], c = r[8] || tint;
    for (let j = 0; j <= seg; j++) {
      const an = j / seg * 6.2831853, cx = Math.cos(an), sy = Math.sin(an);
      const qx = ex === 2 ? cx : Math.sign(cx) * Math.pow(Math.abs(cx), 2 / ex), qz = ex === 2 ? sy : Math.sign(sy) * Math.pow(Math.abs(sy), 2 / ex);
      const lx = (r[6] || 0) + r[3] * qx, lz = (r[7] || 0) + r[4] * qz;
      pos.push(r[0] + S[0] * lx + U[0] * lz, r[1] + S[1] * lx + U[1] * lz, r[2] + S[2] * lx + U[2] * lz);
      uv.push(j / seg * (o.uT || 2), v * (o.vT || 4)); col.push(ao * c[0], ao * c[1], ao * c[2]);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  if (o.cap !== false) for (const e of [0, n - 1]) {   // tappi alle due estremita
    const r = rings[e], ci = pos.length / 3, ao = r[5] === undefined ? 1 : r[5], c = r[8] || tint;
    pos.push(r[0], r[1], r[2]); uv.push(0.5, e ? v * (o.vT || 4) : 0); col.push(ao * c[0], ao * c[1], ao * c[2]);
    for (let j = 0; j < seg; j++) { const a = e * W + j; if (e) idx.push(ci, a + 1, a); else idx.push(ci, a, a + 1); }
  }
  return t3Geo(pos, uv, col, idx);
}

// Unisce piu geometrie in una sola (una mesh = una chiamata di disegno). item = { g, p: posizione, r: rotazione XYZ, s: scala, t: tinta }
function t3Merge(items) {
  const pos = [], uv = [], col = [], idx = []; let base = 0;
  for (const it of items) {
    const g = it.g, P = g.attributes.position.array, UV = g.attributes.uv.array, C = g.attributes.color.array, I = g.index.array;
    const p = it.p || [0, 0, 0], r = it.r || [0, 0, 0], s = it.s || [1, 1, 1], t = it.t || [1, 1, 1];
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    for (let i = 0; i < P.length; i += 3) {
      let x = P[i] * s[0], y = P[i + 1] * s[1], z = P[i + 2] * s[2], q;
      q = x * cz - y * sz; y = x * sz + y * cz; x = q;
      q = x * cy + z * sy; z = -x * sy + z * cy; x = q;
      q = y * cx - z * sx; z = y * sx + z * cx; y = q;
      pos.push(x + p[0], y + p[1], z + p[2]);
    }
    for (let i = 0; i < UV.length; i++) uv.push(UV[i]);
    for (let i = 0; i < C.length; i += 3) col.push(C[i] * t[0], C[i + 1] * t[1], C[i + 2] * t[2]);
    const fl = s[0] * s[1] * s[2] < 0;
    for (let i = 0; i < I.length; i += 3) { if (fl) idx.push(base + I[i], base + I[i + 2], base + I[i + 1]); else idx.push(base + I[i], base + I[i + 1], base + I[i + 2]); }
    base += P.length / 3;
  }
  return t3Geo(pos, uv, col, idx);
}

// Tabella a tratti con interpolazione morbida: [y, a, b, c...]
const t3Tab = (tb, y) => {
  for (let i = 0; i < tb.length - 1; i++) if (y <= tb[i + 1][0]) { const a = tb[i], b = tb[i + 1], t = Math.max(0, (y - a[0]) / (b[0] - a[0])), s = t * t * (3 - 2 * t); return a.map((v, k) => k ? v + (b[k] - v) * s : y); }
  return tb[tb.length - 1];
};
// Percorso a passi: direzione hf(t), raggio rf(t) -> [rx, rz], colore opzionale; restituisce gli anelli per t3Loft
function t3Path(p, n, L, hf, rf, col) {
  const rings = [], st = L / n; let q = p.slice();
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = rf(t); rings.push([q[0], q[1], q[2], r[0], r[1], i === 0 ? 0.8 : 1, 0, 0, col ? col(t) : undefined]);
    const d = t3nm(hf(t)); q = [q[0] + d[0] * st, q[1] + d[1] * st, q[2] + d[2] * st];
  }
  return rings;
}
const t3Mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const t3Ball = () => t3Loft(Array.from({ length: 9 }, (_, i) => { const a = Math.PI * i / 8, r = Math.sin(a) + 0.002; return [0, -Math.cos(a), 0, r, r]; }), 12);
// Dente / spuntone / artiglio: parte da y=0 verso +y, si assottiglia, si piega all'indietro (-z) di "bend"
function t3Spike(L, w, o) {
  o = o || {}; const cb = o.cb || [0.6, 0.5, 0.42], ct = o.ct || [1, 0.96, 0.86], rings = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5, rr = w * (1 - 0.92 * Math.pow(t, 1.25)) + 0.0006; rings.push([0, L * t, -(o.bend || 0) * L * t * t, rr, rr * (o.fl || 1), i ? 1 : 0.75, 0, 0, t3Mix(cb, ct, Math.min(1, t * 1.4))]); }
  return t3Loft(rings, o.seg || 6, { vT: 2, uT: 1 });
}
// Corno ricurvo e nervato: parte da y=0, sale, si piega all'indietro (-z) e verso l'esterno (+x)
function t3Horn(L, w, e0, curl, yaw) {
  const rf = (t) => { const r = w * Math.pow(1 - t, 0.85) * (1 + 0.5 * Math.max(0, 0.14 - t) / 0.14) * (1 + 0.07 * Math.sin(t * 30)) + 0.002; return [r, r * 0.9]; };
  const hf = (t) => { const e = e0 + curl * t, y = yaw * (1 - 0.5 * t); return [Math.sin(y), Math.cos(e), -Math.sin(e)]; };
  return t3Loft(t3Path([0, 0, 0], 16, L, hf, rf, (t) => t3Mix([0.5, 0.4, 0.34], [1, 0.95, 0.84], Math.pow(t, 0.7))), 10, { vT: 3, uT: 1 });
}

// ---------------- testa: superficie scolpita (cranio + muso a cuneo, orbite, arcate, zigomi, narici) ----------------
function t3HeadSurf() {
  const F = [], add = (x, y, z, s, a, d, mir) => { F.push([x, y, z, s, a, d || 0]); if (mir) F.push([-x, y, z, s, a, d || 0]); };
  add(0.078, 0.047, 0.14, 0.03, -0.046, 0.85, 1);    // orbite incavate
  add(0.086, 0.092, 0.115, 0.032, 0.04, 0, 1);       // arcata sopraccigliare esterna
  add(0.074, 0.076, 0.15, 0.02, 0.03, 0.2, 1);       // palpebra pesante che incombe sull'occhio
  add(0.08, 0.012, 0.15, 0.022, 0.016, 0.3, 1);      // borsa sotto l'occhio
  add(0.05, 0.095, 0.16, 0.03, 0.044, 0, 1);         // arcata interna
  add(0, 0.088, 0.17, 0.04, 0.013, 0, 0);            // ponte fra le arcate
  add(0.1, 0.0, 0.12, 0.035, 0.022, 0, 1);           // zigomo
  add(0.085, -0.05, 0.12, 0.035, -0.022, 0.4, 1);    // guancia scavata
  add(0.1, 0.04, 0.02, 0.04, -0.013, 0.3, 1);        // tempia
  add(0.105, -0.045, 0.0, 0.04, 0.02, 0, 1);         // massetere
  add(0, 0.125, -0.04, 0.035, 0.016, 0, 0); add(0, 0.12, -0.1, 0.03, 0.013, 0, 0);   // cresta sagittale
  add(0.024, 0.016, 0.372, 0.011, -0.016, 0.9, 1);   // narici
  add(0, 0.03, 0.35, 0.03, 0.01, 0, 0);              // naso
  add(0, 0.07, 0.24, 0.03, 0.013, 0, 0); add(0, 0.06, 0.3, 0.025, 0.01, 0, 0);       // dorso del muso
  add(0.055, 0.03, 0.26, 0.016, -0.008, 0.3, 1);     // pieghe sul muso
  add(0.04, 0.0, 0.31, 0.016, -0.008, 0.3, 1);
  return (dx, dy, dz) => {
    const fr = Math.max(0, dz), k = Math.pow(fr, 1.25), w = 0.112 * (1 - 0.54 * k), h = (0.1175 + 0.0125 * Math.tanh(dy * 5)) * (1 - 0.6 * k), L = 0.26 + 0.13 * Math.tanh(dz * 4);
    const p0 = [w * dx, h * dy, L * dz], n = t3nm([dx / w, dy / h, dz / L]); let ao = 1; const p = p0.slice();
    for (const f of F) {
      const d2 = (p0[0] - f[0]) * (p0[0] - f[0]) + (p0[1] - f[1]) * (p0[1] - f[1]) + (p0[2] - f[2]) * (p0[2] - f[2]), gs = Math.exp(-d2 / (2 * f[3] * f[3]));
      if (gs < 0.003) continue; p[0] += n[0] * f[4] * gs; p[1] += n[1] * f[4] * gs; p[2] += n[2] * f[4] * gs; ao *= 1 - f[5] * gs;
    }
    return [p[0], p[1], p[2], ao];
  };
}
function t3HeadGeo(surf) {
  const NU = 48, NV = 34, pos = [], uv = [], col = [], idx = [];
  for (let i = 0; i <= NV; i++) {
    const ph = i / NV * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
    for (let j = 0; j <= NU; j++) {
      const th = j / NU * 6.2831853, q = surf(sp * Math.cos(th), sp * Math.sin(th), cp), sh = 0.55 + 0.45 * q[3];
      pos.push(q[0], q[1], q[2]); uv.push(j / NU * 2, i / NV * 2.4); col.push(sh, sh * 0.96, sh * 0.95);
    }
  }
  for (let i = 0; i < NV; i++) for (let j = 0; j < NU; j++) { const a = i * (NU + 1) + j, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  return t3Geo(pos, uv, col, idx);
}

// ---------------- tutte le geometrie del demone (costruite una volta sola e condivise) ----------------
// Braccio, gamba e artigli sono costruiti per il lato destro (+x); il sinistro e lo stesso modello specchiato (scale.x = -1).
function t3DemonGeos() {
  const D = {}, ball = t3Ball(), surf = t3HeadSurf();
  const B = (r, p, sx, sy, sz) => ({ g: ball, p: p || [0, 0, 0], s: [r * (sx || 1), r * (sy || 1), r * (sz || 1)] });
  const BONE_B = [0.7, 0.34, 0.28];   // radice dei denti: macchiata di sangue

  // --- bacino e torace
  D.pelvis = t3Loft([[0, -0.17, 0, 0.05, 0.06, 0.8], [0, -0.13, 0, 0.11, 0.095], [0, -0.07, -0.005, 0.145, 0.115], [0, 0, -0.005, 0.14, 0.11], [0, 0.05, 0, 0.115, 0.095], [0, 0.09, 0, 0.09, 0.08, 0.85]], 20, { n: 2.2 });
  const TT = [[-0.24, 0.105, 0.09, 0], [-0.16, 0.14, 0.11, 0], [-0.08, 0.16, 0.115, 0.01], [0, 0.22, 0.13, 0.02], [0.08, 0.27, 0.15, 0.035], [0.16, 0.29, 0.15, 0.03], [0.24, 0.28, 0.135, -0.005], [0.3, 0.2, 0.12, -0.02], [0.35, 0.1, 0.085, -0.01], [0.385, 0.02, 0.02, 0]];
  const tr = [];
  for (let i = 0; i < 56; i++) {   // costole in rilievo sotto la pelle tesa
    const y = -0.24 + i / 55 * 0.625, v = t3Tab(TT, y), rib = y > -0.1 && y < 0.13 ? Math.cos((y + 0.1) / 0.058 * 6.2832) : 0;
    tr.push([0, y, 0, v[1] * (1 + 0.03 * rib), v[2] * (1 + 0.03 * rib), i && i < 55 ? 0.92 + 0.08 * rib : 0.8, 0, v[3]]);
  }
  D.torso = t3Loft(tr, 30, { n: 2.3, vT: 3 });
  const tb = [];
  [0.31, 0.26, 0.21, 0.16, 0.11, 0.06, 0.01, -0.04, -0.09].forEach((y, i) => { const v = t3Tab(TT, y); tb.push({ g: t3Spike(0.15 - i * 0.008, 0.03 - i * 0.0012, { bend: 0.2 }), p: [0, y, v[3] - v[2] + 0.012], r: [-1.75 + i * 0.03, 0, 0] }); });   // vertebre che sporgono
  for (const s of [-1, 1]) [0.074, 0.016, -0.042, -0.1].forEach((y, k) => {   // costole scoperte
    const v = t3Tab(TT, y), rg = [];
    for (let i = 0; i <= 8; i++) { const ph = 0.45 + i / 8 * 1.25, r = 0.0115 * (1 - 0.5 * Math.pow(Math.abs(i - 4) / 4, 2)); rg.push([s * v[1] * 1.04 * Math.sin(ph), y - 0.015 * ph, v[3] + v[2] * 1.04 * Math.cos(ph), r, r * 0.8, 1, 0, 0, t3Mix([0.95, 0.9, 0.78], [0.6, 0.3, 0.25], 0.5 + 0.5 * Math.sin(k * 2 + i))]); }
    tb.push({ g: t3Loft(rg, 6, { vT: 2 }) });
  });
  D.torsoBone = t3Merge(tb);
  D.neck = t3Merge([{ g: t3Loft([[0, -0.06, -0.005, 0.1, 0.09, 0.8], [0, 0, 0.012, 0.083, 0.076], [0, 0.06, 0.03, 0.07, 0.068], [0, 0.105, 0.04, 0.072, 0.068, 0.85]], 18) }].concat([-1, 1].map(s => ({ g: t3Loft(t3Path([s * 0.045, 0.1, 0.05], 5, 0.17, t => [s * (0.3 + 0.2 * t), -1, -0.1], t => [0.012 - 0.003 * t, 0.011]), 6) }))));   // collo con tendini tesi

  // --- testa, corna, denti, gengive
  D.head = t3HeadGeo(surf);
  const horn = t3Horn(0.4, 0.036, 0.35, 1.55, 0.55), hornB = t3Horn(0.17, 0.022, 1.3, 0.9, 0.5), hb = [];
  for (const s of [-1, 1]) {
    hb.push({ g: horn, p: [s * 0.072, 0.1, -0.015], s: [s, 1, 1] }, { g: hornB, p: [s * 0.1, 0.03, -0.08], s: [s, 1, 1] });
    hb.push({ g: t3Spike(0.1, 0.022, { bend: 0.2 }), p: [s * 0.105, -0.05, 0.05], r: [0.2, 0, -s * 1.5] });          // spuntone sulla guancia
    hb.push({ g: t3Spike(0.055, 0.013), p: [s * 0.062, 0.106, 0.15], r: [-0.3, 0, -s * 0.5] }, { g: t3Spike(0.045, 0.012), p: [s * 0.092, 0.096, 0.1], r: [-0.2, 0, -s * 0.8] });   // spuntoni sulle arcate
  }
  for (let i = 0; i < 3; i++) hb.push({ g: t3Spike(0.13 - i * 0.02, 0.026 - i * 0.004, { bend: 0.2 }), p: [0, 0.128 - i * 0.012, -0.03 - i * 0.07], r: [-1.2 - 0.15 * i, 0, 0] });   // cresta sul cranio
  D.headBone = t3Merge(hb);
  const rim = (s, dz) => { const sp = Math.sqrt(1 - dz * dz), q = surf(sp * Math.cos(-0.82), sp * Math.sin(-0.82), dz); return [s * q[0], q[1], q[2]]; };
  const dzs = [0.95, 0.88, 0.78, 0.66, 0.54, 0.42, 0.3, 0.2], lens = [0.06, 0.095, 0.045, 0.052, 0.04, 0.04, 0.032, 0.03], tt = [], gg = [];
  for (const s of [-1, 1]) {
    const rg = [];
    dzs.forEach((dz, i) => {
      const q = rim(s, dz), j = Math.sin(i * 12.9 + s * 4.1);
      tt.push({ g: t3Spike(lens[i] * (1 + 0.15 * j), i === 1 ? 0.017 : 0.012, { cb: BONE_B, bend: -0.12 }), p: [q[0], q[1] + 0.007, q[2]], r: [Math.PI + 0.12 * j, 0, -s * (0.16 + 0.1 * j)] });
      rg.push([q[0], q[1] + 0.003, q[2], 0.0125, 0.011, 0.9, 0, 0, [0.8, 0.45, 0.45]]);
    });
    gg.push({ g: t3Loft(rg, 8, { vT: 2 }) });
  }
  tt.push({ g: t3Spike(0.05, 0.012, { cb: BONE_B }), p: [0.012, -0.006, 0.383], r: [Math.PI, 0, 0.1] }, { g: t3Spike(0.05, 0.012, { cb: BONE_B }), p: [-0.012, -0.006, 0.383], r: [Math.PI, 0, -0.1] });
  D.teeth = t3Merge(tt); D.gums = t3Merge(gg);

  // --- mandibola (origine = cerniera), denti inferiori, lingua, bava
  const xr = [[0, 0.074], [0.06, 0.072], [0.15, 0.058], [0.25, 0.036], [0.322, 0.017], [0.345, 0.008]];
  const ramus = (s) => t3Loft([[s * 0.074, 0, 0, 0.026, 0.024, 0.8], [s * 0.072, -0.002, 0.06, 0.027, 0.024], [s * 0.058, -0.006, 0.15, 0.022, 0.021], [s * 0.036, -0.008, 0.25, 0.018, 0.018], [s * 0.017, -0.004, 0.322, 0.014, 0.014], [s * 0.008, 0, 0.345, 0.01, 0.01, 0.8]], 10);
  D.jaw = t3Merge([{ g: ramus(1) }, { g: ramus(-1) }, { g: t3Loft([[0, -0.012, 0.03, 0.07, 0.005, 0.8], [0, -0.014, 0.15, 0.045, 0.006], [0, -0.012, 0.3, 0.016, 0.006, 0.8]], 10) }, B(0.02, [0, -0.005, 0.34])]);
  const jt = [], jz = [0.33, 0.3, 0.26, 0.21, 0.16, 0.11, 0.07], jl = [0.078, 0.05, 0.04, 0.045, 0.035, 0.03, 0.028];
  for (const s of [-1, 1]) jz.forEach((z, i) => { const x = s * t3Tab(xr, z)[1] * 0.93, j = Math.sin(i * 7.7 + s * 2.3); jt.push({ g: t3Spike(jl[i] * (1 + 0.12 * j), i === 0 ? 0.016 : 0.012, { cb: BONE_B, bend: -0.1 }), p: [x, 0.016, z], r: [0.1 * j, 0, s * (0.12 + 0.08 * j)] }); });
  jt.push({ g: t3Spike(0.09, 0.013, { cb: BONE_B }), p: [0.009, 0.004, 0.347], r: [-0.25, 0, -0.1] }, { g: t3Spike(0.075, 0.012, { cb: BONE_B }), p: [-0.009, 0.004, 0.347], r: [-0.3, 0, 0.1] });
  D.jawTeeth = t3Merge(jt);
  const tg = t3Path([0, 0, -0.07], 9, 0.25, () => [0, 0, 1], t => [0.027 * (1 - 0.45 * t * t), 0.008]).map(r => { r[1] = 0.006 * Math.sin(r[2] * 34); return r; });
  const fork = (s) => t3Loft(t3Path([0, 0.006 * Math.sin(0.18 * 34), 0.18], 3, 0.07, () => [s * 0.35, 0, 1], t => [0.011 * (1 - 0.8 * t), 0.006 * (1 - 0.6 * t)]), 6);
  D.tongue = t3Merge([{ g: t3Loft(tg, 10, { n: 2.5, vT: 2 }) }, { g: fork(1) }, { g: fork(-1) }]);
  const dr = [];
  [[-0.034, 0.3, 0.1], [0.03, 0.25, 0.07], [0.02, 0.2, 0.12], [-0.03, 0.15, 0.05]].forEach(([x, z, L]) => dr.push({ g: t3Loft(t3Path([x, 0.014, z], 4, L, () => [0, -1, 0], t => [0.0032 * (1 - 0.5 * t), 0.0032 * (1 - 0.5 * t)]), 4, { vT: 2 }) }));
  D.drool = t3Merge(dr);

  // --- braccio destro: spalla, avambraccio, mano con tre dita e pollice, artigli a falce
  D.upperArm = t3Merge([{ g: t3Loft([[0, 0.05, 0, 0.06, 0.06, 0.8], [0, 0.01, 0, 0.108, 0.1, 0.9], [0, -0.05, 0.005, 0.112, 0.1], [0, -0.11, 0.01, 0.098, 0.095], [0, -0.18, 0.01, 0.08, 0.078], [0, -0.24, 0, 0.066, 0.064], [0, -0.27, 0, 0.062, 0.06, 0.8]], 20) }, B(0.1)]);
  D.upperBone = t3Merge([{ g: t3Spike(0.17, 0.042, { bend: 0.3 }), p: [0.06, 0.07, -0.02], r: [-0.35, 0, -0.9] }, { g: t3Spike(0.1, 0.03, { bend: 0.2 }), p: [0.02, 0.09, -0.05], r: [-0.9, 0, -0.3] }]);
  const fr = [[0, 0.015, 0, 0.055, 0.055, 0.75], [0, -0.02, 0, 0.074, 0.072, 0.85], [0, -0.07, 0.005, 0.082, 0.078], [0, -0.13, 0.005, 0.07, 0.068], [0, -0.2, 0, 0.052, 0.05], [0, -0.26, 0, 0.04, 0.038], [0, -0.285, 0, 0.044, 0.03], [0, -0.31, 0.006, 0.056, 0.028], [0, -0.345, 0.012, 0.058, 0.026], [0, -0.36, 0.015, 0.05, 0.022, 0.8]];
  const fi = [{ g: t3Loft(fr, 18, { n: 2.2 }) }, B(0.068, [0, 0, -0.005])], cl = [];
  const finger = (x0, y0, z0, L, cu, sp, claw) => {
    const hf = (t) => [sp * t, -Math.cos(cu * t), Math.sin(cu * t)], rg = t3Path([x0, y0, z0], 4, L, hf, t => [0.0165 - 0.006 * t, 0.0152 - 0.0055 * t]);
    fi.push({ g: t3Loft(rg, 8, { vT: 2 }) }); const e = rg[rg.length - 1];
    const hc = (t) => [sp, -Math.cos(cu + 1.05 * t), Math.sin(cu + 1.05 * t)];
    cl.push({ g: t3Loft(t3Path([e[0], e[1], e[2]], 7, claw, hc, t => [0.0105 * (1 - 0.93 * t) + 0.0006, 0.0128 * (1 - 0.93 * t) + 0.0006], t => t3Mix([0.8, 0.72, 0.58], [1, 0.97, 0.88], t)), 7, { vT: 3, uT: 1 }) });
  };
  finger(-0.036, -0.35, 0.012, 0.105, 0.45, -0.12, 0.17); finger(0, -0.355, 0.014, 0.118, 0.5, 0, 0.2); finger(0.036, -0.35, 0.012, 0.105, 0.45, 0.12, 0.17);
  finger(-0.052, -0.33, 0.008, 0.07, 0.35, -0.5, 0.13);   // pollice
  D.fore = t3Merge(fi);
  D.foreBone = t3Merge(cl.concat([{ g: t3Spike(0.13, 0.03, { bend: 0.1 }), p: [0, -0.01, -0.06], r: [-2.3, 0, 0] }, { g: t3Spike(0.11, 0.026), p: [0, -0.1, -0.078], r: [-2.55, 0, 0] }, { g: t3Spike(0.08, 0.022), p: [0, -0.17, -0.062], r: [-2.6, 0, 0] }]));

  // --- gamba destra: coscia, stinco con polpaccio, piede con tre artigli
  D.thigh = t3Merge([{ g: t3Loft([[0, 0.03, -0.015, 0.1, 0.1, 0.8], [0, -0.04, 0.02, 0.115, 0.115], [0, -0.1, 0.06, 0.12, 0.115], [0, -0.16, 0.098, 0.095, 0.09], [0, -0.205, 0.122, 0.068, 0.066, 0.85]], 18) }, B(0.095, [0, 0, 0])]);
  D.shin = t3Merge([B(0.072), { g: t3Loft([[0, -0.03, -0.012, 0.072, 0.082, 0.9, 0, -0.01], [0, -0.07, -0.03, 0.07, 0.08, 1, 0, -0.012], [0, -0.12, -0.045, 0.052, 0.056], [0, -0.17, -0.058, 0.04, 0.04], [0, -0.215, -0.068, 0.032, 0.034, 0.85]], 14) }]);
  D.kneeBone = t3Merge([{ g: t3Spike(0.11, 0.034, { bend: -0.1 }), p: [0, 0.01, 0.062], r: [Math.PI / 2 - 0.15, 0, 0] }]);
  const ft = [{ g: t3Loft([[0, 0.02, -0.045, 0.03, 0.03, 0.8], [0, 0.005, -0.01, 0.034, 0.032], [0, -0.012, 0.06, 0.04, 0.028], [0, -0.02, 0.12, 0.046, 0.024, 0.9]], 12, { vT: 3 }) }, B(0.042, [0, 0.012, -0.022])], fc = [];
  for (const x of [-0.038, 0, 0.038]) {
    const hf = (t) => [x * 0.5, -0.2 * t - 0.1, 1], rg = t3Path([x, -0.02, 0.115], 3, 0.065, hf, t => [0.0165 - 0.005 * t, 0.014 - 0.004 * t]);
    ft.push({ g: t3Loft(rg, 8, { vT: 2 }) }); const e = rg[rg.length - 1];
    fc.push({ g: t3Loft(t3Path([e[0], e[1], e[2]], 6, 0.11, (t) => [0, -Math.sin(0.3 + 0.9 * t), Math.cos(0.3 + 0.9 * t)], t => [0.0105 * (1 - 0.93 * t) + 0.0006, 0.0125 * (1 - 0.93 * t) + 0.0006], t => t3Mix([0.8, 0.72, 0.58], [1, 0.97, 0.88], t)), 7, { vT: 3, uT: 1 }) });
  }
  fc.push({ g: t3Spike(0.12, 0.03, { bend: 0.2 }), p: [0, 0.03, -0.05], r: [-1.25, 0, 0] });   // sperone del tallone
  D.foot = t3Merge(ft); D.footBone = t3Merge(fc);

  // --- coda: 4 segmenti che si assottigliano, con spuntoni e una lama in punta
  D.tail = [0, 1, 2, 3].map(i => {
    const ra = 0.08 - 0.015 * i, rb = 0.062 - 0.015 * i + (i === 3 ? 0.005 : 0), rg = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, r = ra + (rb - ra) * t; rg.push([0, 0, 0.03 - 0.22 * t, r * (1 + 0.04 * Math.sin(t * 9)), r * 0.9, k && k < 6 ? 1 : 0.85]); }
    const bone = [{ g: t3Spike(0.13 - 0.015 * i, 0.028 - 0.004 * i, { bend: 0.2 }), p: [0, 0.052 - 0.008 * i, -0.07], r: [-0.55, 0, 0] }];
    if (i === 3) bone.push({ g: t3Loft([[0, 0, -0.17, 0.012, 0.02, 0.8], [0, 0, -0.22, 0.012, 0.05], [0, 0, -0.3, 0.01, 0.052], [0, 0, -0.38, 0.006, 0.03], [0, 0, -0.45, 0.002, 0.002, 1]], 6, { vT: 2, tint: [0.95, 0.9, 0.78] }) });
    return { skin: t3Loft(rg, 14), bone: t3Merge(bone) };
  });
  return D;
}

// ---------------- texture: pelle (colore, rilievo, crepe incandescenti), osso, occhio ----------------
function t3TexL(cv, clamp) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; return t; }
function t3SkinTex() {
  if (T3.skinTex) return;
  let sd = 7; const R = () => ((sd = (sd * 16807) % 2147483647) / 2147483647), N = 256;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // disegna anche nelle copie traslate: la texture si ripete senza giunture
  const wrap = (gs, x, y, r, f) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { if (x + ox + r < 0 || x + ox - r > N || y + oy + r < 0 || y + oy - r > N) continue; for (const g of gs) { g.save(); g.translate(ox, oy); } f(); for (const g of gs) g.restore(); } };
  const ca = mk(N, N), cb = mk(N, N), g = ca.getContext('2d'), h = cb.getContext('2d');
  g.fillStyle = '#4a2019'; g.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
  const PAL = ['#6a2f22', '#35120f', '#4d2030', '#7a4430', '#2a0e0c', '#5a2418'];
  for (let i = 0; i < 80; i++) {   // chiazze di colore: pelle scura, bruciata, con zone livide
    const x = R() * N, y = R() * N, r = 18 + R() * 40, c = PAL[R() * PAL.length | 0], al = 0.14 + R() * 0.22;
    wrap([g], x, y, r, () => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = al; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; });
  }
  for (let row = 0; row < 16; row++) for (let col = 0; col < 16; col++) {   // scaglie
    const x = col * 16 + (row % 2) * 8 + 8, y = row * 16 + 8, k = 0.6 + R() * 0.8;
    wrap([g, h], x, y, 10, () => {
      g.strokeStyle = 'rgba(12,2,3,' + (0.45 * k) + ')'; g.lineWidth = 1.3; g.beginPath(); g.arc(x, y, 7.5, 0.1, Math.PI - 0.1); g.stroke();
      g.strokeStyle = 'rgba(200,100,70,' + (0.12 * k) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(x, y - 1.5, 6.5, Math.PI + 0.3, 6.28 - 0.3); g.stroke();
      const gr = h.createRadialGradient(x, y - 1, 0, x, y - 1, 8); gr.addColorStop(0, 'rgba(255,255,255,0.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); h.fillStyle = gr; h.fillRect(x - 9, y - 9, 18, 18);
      h.strokeStyle = 'rgba(0,0,0,0.55)'; h.lineWidth = 1.4; h.beginPath(); h.arc(x, y, 7.5, 0.1, Math.PI - 0.1); h.stroke();
    });
  }
  g.lineCap = h.lineCap = 'round';
  for (let i = 0; i < 40; i++) {   // rughe e pieghe
    const x = R() * N, y = R() * N, L = 10 + R() * 26, a = (R() - 0.5) * 0.7;
    wrap([g, h], x, y, 40, () => { g.strokeStyle = 'rgba(18,4,4,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); h.strokeStyle = 'rgba(0,0,0,0.5)'; h.lineWidth = 1.6; h.beginPath(); h.moveTo(x, y); h.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); h.stroke(); });
  }
  for (let i = 0; i < 16; i++) {   // vene viola in rilievo
    const x = R() * N, y = R() * N, hd = R() * 6.28, pts = [[x, y]]; let px = x, py = y, a = hd;
    for (let k = 0; k < 7; k++) { a += (R() - 0.5) * 1.2; px += Math.cos(a) * (14 + R() * 12); py += Math.sin(a) * (14 + R() * 12); pts.push([px, py]); }
    const lw = 1.5 + R() * 1.2;
    wrap([g, h], x, y, 130, () => {
      g.strokeStyle = 'rgba(78,14,46,0.55)'; g.lineWidth = lw; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
      h.strokeStyle = 'rgba(255,255,255,0.2)'; h.lineWidth = lw + 0.8; h.beginPath(); pts.forEach((p, k) => k ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1])); h.stroke();
    });
  }
  for (let i = 0; i < 1800; i++) {   // pori e sporco
    const x = R() * N, y = R() * N, d = R() < 0.55;
    g.fillStyle = d ? 'rgba(10,2,2,' + (0.1 + R() * 0.2) + ')' : 'rgba(170,80,55,' + (0.08 + R() * 0.12) + ')'; g.fillRect(x, y, 1 + R() * 1.5, 1 + R() * 1.5);
    h.fillStyle = d ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.14)'; h.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 9; i++) {   // sangue colato
    const x = R() * N, y = R() * N * 0.7, L = 25 + R() * 45, w = 2 + R() * 4;
    wrap([g], x, y, 80, () => { g.strokeStyle = 'rgba(66,0,3,' + (0.35 + R() * 0.2) + ')'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 6, y + L); g.stroke(); g.fillStyle = 'rgba(66,0,3,0.5)'; g.beginPath(); g.arc(x, y + L, w * 0.8, 0, 7); g.fill(); });
  }
  for (let i = 0; i < 5; i++) {   // cicatrici cucite
    const x = R() * N, y = R() * N, L = 24 + R() * 28, a = R() * 6.28, ca2 = Math.cos(a), sa = Math.sin(a);
    wrap([g, h], x, y, 60, () => {
      g.strokeStyle = 'rgba(205,150,125,0.5)'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + ca2 * L, y + sa * L); g.stroke();
      h.strokeStyle = 'rgba(255,255,255,0.35)'; h.lineWidth = 2; h.beginPath(); h.moveTo(x, y); h.lineTo(x + ca2 * L, y + sa * L); h.stroke();
      for (let k = 1; k < 6; k++) { const px = x + ca2 * L * k / 6, py = y + sa * L * k / 6; g.strokeStyle = 'rgba(40,12,8,0.6)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(px - sa * 3.5, py + ca2 * 3.5); g.lineTo(px + sa * 3.5, py - ca2 * 3.5); g.stroke(); }
    });
  }
  for (let i = 0; i < 4; i++) {   // ferite aperte: carne viva e umida
    const x = R() * N, y = R() * N, rx = 10 + R() * 8, ry = 6 + R() * 6, a = R() * 3;
    wrap([g, h], x, y, 24, () => {
      g.save(); g.translate(x, y); g.rotate(a); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(92,6,12,0.9)'); gr.addColorStop(0.7, 'rgba(140,22,28,0.85)'); gr.addColorStop(1, 'rgba(190,90,80,0.35)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill(); g.restore();
      h.save(); h.translate(x, y); h.rotate(a); h.fillStyle = 'rgba(0,0,0,0.55)'; h.beginPath(); h.ellipse(0, 0, rx * 0.85, ry * 0.85, 0, 0, 7); h.fill(); h.restore();
    });
  }
  const cg = mk(N, N), q = cg.getContext('2d');   // crepe incandescenti (emissive)
  q.fillStyle = '#000'; q.fillRect(0, 0, N, N); q.strokeStyle = '#ff5a14'; q.shadowColor = '#ff2a00'; q.shadowBlur = 6; q.lineWidth = 2; q.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const x = R() * N, y = R() * N, pts = [[x, y]]; let px = x, py = y; for (let k = 0; k < 5; k++) { px += (R() - 0.5) * 50; py += (R() - 0.5) * 50; pts.push([px, py]); } wrap([q], x, y, 140, () => { q.beginPath(); pts.forEach((p, k) => k ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1])); q.stroke(); }); }
  T3.skinTex = t3TexL(ca); T3.skinBump = t3TexL(cb); T3.glowTex = t3TexL(cg);

  // osso, corno, denti: avorio venato, macchiato e crepato
  const M2 = 128, da = mk(M2, M2), db = mk(M2, M2), o = da.getContext('2d'), p = db.getContext('2d');
  o.fillStyle = '#cdbf9e'; o.fillRect(0, 0, M2, M2); p.fillStyle = '#808080'; p.fillRect(0, 0, M2, M2);
  for (let i = 0; i < 46; i++) { const x = R() * M2, y = R() * M2, L = 20 + R() * 60; o.strokeStyle = 'rgba(110,90,60,' + (0.12 + R() * 0.16) + ')'; o.lineWidth = 1 + R() * 1.5; o.beginPath(); o.moveTo(x, y); o.lineTo(x + (R() - 0.5) * 4, y + L); o.stroke(); p.strokeStyle = 'rgba(0,0,0,0.3)'; p.lineWidth = 1; p.beginPath(); p.moveTo(x, y); p.lineTo(x + (R() - 0.5) * 4, y + L); p.stroke(); }
  for (let i = 0; i < 14; i++) { const x = R() * M2, y = R() * M2, r = 8 + R() * 16, gr = o.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(80,50,25,0.3)'); gr.addColorStop(1, 'rgba(80,50,25,0)'); o.fillStyle = gr; o.fillRect(x - r, y - r, r * 2, r * 2); }
  o.lineCap = p.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const pts = [[R() * M2, R() * M2]]; for (let k = 0; k < 5; k++) pts.push([pts[k][0] + (R() - 0.5) * 22, pts[k][1] + (R() - 0.5) * 22]); o.strokeStyle = 'rgba(40,25,15,0.55)'; o.lineWidth = 1; o.beginPath(); pts.forEach((pt, k) => k ? o.lineTo(pt[0], pt[1]) : o.moveTo(pt[0], pt[1])); o.stroke(); p.strokeStyle = 'rgba(0,0,0,0.5)'; p.lineWidth = 1.3; p.beginPath(); pts.forEach((pt, k) => k ? p.lineTo(pt[0], pt[1]) : p.moveTo(pt[0], pt[1])); p.stroke(); }
  for (let i = 0; i < 500; i++) { const x = R() * M2, y = R() * M2; o.fillStyle = R() < 0.5 ? 'rgba(60,40,20,0.15)' : 'rgba(255,245,220,0.12)'; o.fillRect(x, y, 1, 1); p.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)'; p.fillRect(x, y, 1, 1); }
  T3.boneTex = t3TexL(da); T3.boneBump = t3TexL(db);

  // occhio: iride gialla incandescente con pupilla verticale (centrata a u=.25: e il davanti di una SphereGeometry)
  const ce = mk(256, 128), e = ce.getContext('2d');
  e.fillStyle = '#3a0a06'; e.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, r0 = 34 + R() * 4, r1 = r0 + 8 + R() * 22; e.strokeStyle = 'rgba(200,30,20,' + (0.3 + R() * 0.3) + ')'; e.lineWidth = 1; e.beginPath(); e.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); e.lineTo(64 + Math.cos(a + (R() - 0.5) * 0.5) * r1, 64 + Math.sin(a + (R() - 0.5) * 0.5) * r1); e.stroke(); }
  const ig = e.createRadialGradient(64, 64, 2, 64, 64, 34); ig.addColorStop(0, '#fffbd0'); ig.addColorStop(0.3, '#ffe628'); ig.addColorStop(0.72, '#ffa000'); ig.addColorStop(1, '#8a3000');
  e.fillStyle = ig; e.beginPath(); e.arc(64, 64, 34, 0, 7); e.fill();
  e.strokeStyle = 'rgba(60,12,0,0.85)'; e.lineWidth = 3; e.beginPath(); e.arc(64, 64, 33, 0, 7); e.stroke();
  for (let i = 0; i < 22; i++) { const a = R() * 6.28; e.strokeStyle = 'rgba(190,70,0,0.35)'; e.lineWidth = 1; e.beginPath(); e.moveTo(64 + Math.cos(a) * 8, 64 + Math.sin(a) * 8); e.lineTo(64 + Math.cos(a) * 31, 64 + Math.sin(a) * 31); e.stroke(); }
  e.fillStyle = '#060000'; e.beginPath(); e.ellipse(64, 64, 4.4, 26, 0, 0, 7); e.fill();
  e.fillStyle = 'rgba(255,255,255,0.7)'; e.beginPath(); e.arc(55, 52, 3, 0, 7); e.fill();
  T3.eyeTex = t3TexL(ce, true);
}

// Demone-artiglio: assembla le parti sullo scheletro (le animazioni di t3Anim restano quelle di prima)
function t3Mob(e) {
  t3SkinTex();
  const gc = T3.gc = T3.gc || {}, G = (k, f) => gc[k] || (gc[k] = f());
  const S = STY[e.type] || STY.demon, T = TYPES[e.type] || TYPES.demon, mo = (VARS[e.type] && VARS[e.type][e.v | 0] && VARS[e.type][e.v | 0][2]) || {};
  const sc = T.sc * (e.hs || 1), wsc = mo.ws || 1, mc = T3.mc = T3.mc || {};
  if (!mc[e.type]) {
    const ec = S.eye || '#ffe000';
    if (!T3.eyeGlow) {   // alone degli occhi: bianco al centro, sfuma a zero (il colore lo da il materiale)
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.8)'); r.addColorStop(0.5, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = r; x.fillRect(0, 0, 64, 64); T3.eyeGlow = new THREE.CanvasTexture(c);
    }
    mc[e.type] = {
      skin: new THREE.MeshStandardMaterial({ map: T3.skinTex, bumpMap: T3.skinBump, bumpScale: 1.6, vertexColors: true, emissive: 0xff4a10, emissiveMap: T3.glowTex, emissiveIntensity: 0.5, roughness: 0.58, metalness: 0.05 }),
      bone: new THREE.MeshStandardMaterial({ map: T3.boneTex, bumpMap: T3.boneBump, bumpScale: 1.2, vertexColors: true, roughness: 0.5 }),
      flesh: new THREE.MeshStandardMaterial({ color: 0x8a1822, vertexColors: true, roughness: 0.28, emissive: 0x2a0204, emissiveIntensity: 0.6 }),
      tongue: new THREE.MeshStandardMaterial({ color: 0x9a1e2c, vertexColors: true, roughness: 0.22 }),
      drool: new THREE.MeshStandardMaterial({ color: 0xdfe8e0, vertexColors: true, roughness: 0.05, transparent: true, opacity: 0.45 }),
      eye: new THREE.MeshBasicMaterial({ map: T3.eyeTex, fog: false }),
      glow: new THREE.SpriteMaterial({ map: T3.eyeGlow, color: ec, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    };
    if (S.alpha) for (const k in mc[e.type]) if (k !== 'eye' && k !== 'glow') { mc[e.type][k].transparent = true; mc[e.type][k].opacity = S.alpha; }
  }
  const D = G('demon', t3DemonGeos), eyeGeo = G('eye', () => new THREE.SphereGeometry(0.5, 16, 12));
  const M = mc[e.type], g = new THREE.Group(), det = [], all = [], eyes = [];
  const mesh = (geo, mat, p, o) => { const m = new THREE.Mesh(geo, mat); (p || g).add(m); if (!(o && o.keep)) all.push(m); if (o && o.det) det.push(m); return m; };
  const grp = (p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  const body = grp(g, 0, 0.45, 0); mesh(D.pelvis, M.skin, body);
  const chest = grp(body, 0, 0.1, 0); mesh(D.torso, M.skin, chest).scale.x = wsc; mesh(D.torsoBone, M.bone, chest).scale.x = wsc;
  const neck = grp(chest, 0, 0.2, 0.05); mesh(D.neck, M.skin, neck);
  const head = grp(neck, 0, 0.08, 0.03); head.scale.setScalar(1.22); mesh(D.head, M.skin, head); mesh(D.headBone, M.bone, head);
  mesh(D.teeth, M.bone, head, { det: true }); mesh(D.gums, M.flesh, head, { det: true });
  const jaw = grp(head, 0, -0.07, 0.03); mesh(D.jaw, M.skin, jaw); mesh(D.jawTeeth, M.bone, jaw, { det: true });
  const tongue = mesh(D.tongue, M.tongue, jaw, { det: true }); tongue.position.set(0, 0.004, 0.1); mesh(D.drool, M.drool, jaw, { det: true });
  for (const s of [-1, 1]) {   // occhi gialli con pupilla a fessura + alone che li rende visibili da lontano
    const eye = mesh(eyeGeo, M.eye, head, { keep: true }); eye.position.set(s * 0.073, 0.047, 0.142); eye.scale.set(0.058, 0.058, 0.05); eye.rotation.y = -s * 0.2; eye.userData.by = 0.058;
    const gl = new THREE.Sprite(M.glow); gl.position.set(s * 0.078, 0.047, 0.172); head.add(gl); eyes.push([eye, gl]);
  }
  const elbows = [], arms = [-1, 1].map(s => {
    const a = grp(chest, s * 0.28 * wsc, 0.17, 0); mesh(D.upperArm, M.skin, a).scale.x = s; mesh(D.upperBone, M.bone, a).scale.x = s;
    const el = grp(a, 0, -0.28, 0); el.rotation.x = -0.35; elbows.push(el); mesh(D.fore, M.skin, el).scale.x = s; mesh(D.foreBone, M.bone, el).scale.x = s;
    return a;
  });
  const knees = [], ankles = [], legs = [-1, 1].map(s => {
    const l = grp(g, s * 0.12, 0.44, 0); mesh(D.thigh, M.skin, l);
    const kn = grp(l, 0, -0.2, 0.12); mesh(D.shin, M.skin, kn); mesh(D.kneeBone, M.bone, kn);
    const an = grp(kn, 0, -0.22, -0.07); mesh(D.foot, M.skin, an); mesh(D.footBone, M.bone, an);
    knees.push(kn); ankles.push(an); return l;
  });
  const tail = []; let par = body;
  for (let i = 0; i < 4; i++) { const sg = grp(par, 0, i ? 0 : -0.14, i ? -0.16 : -0.14); mesh(D.tail[i].skin, M.skin, sg); mesh(D.tail[i].bone, M.bone, sg); tail.push(sg); par = sg; }
  g.rotation.order = 'YXZ'; g.scale.setScalar(sc);
  g.userData = { arms, elbows, legs, knees, ankles, body, chest, neck, head, jaw, tongue, tail, eyes, det, all, s: {}, px: e.x, py: e.y, ph: 0, hd: 0, yaw: null, yawRate: 0, spd: 0, spdPrev: 0, stepIdx: 0, atkT: 0, hp: e.hp, hurt: 0, sc, seed: (e.x * 7 + e.y * 13) % 6.28, lod: null, close: null, dead: false };
  return g;
}


// Movimento: molle e inerzia. Ogni arto e un sistema molla-smorzatore che insegue un obiettivo, quindi
// ha ritardo, rimbalzo e oscillazione residua. Passo guidato dalla distanza percorsa (i piedi non scivolano).
function t3Anim(m, e, mv, d2) {
  const u = m.userData, dt = Math.min(0.05, T3.dt || 0.016), t = tNow + u.seed, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  if (!e.alive && !u.deadEyes) { u.deadEyes = true; u.eyes.forEach(([a, b]) => { a.visible = false; b.visible = false; }); }
  const near = d2 < 169;
  const eyeFx = (squint) => {   // occhi gialli: sfarfallano, si stringono quando attacca, sbattono le palpebre; l'alone cresce con la distanza
    const fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3), sq = (squint ? 0.5 : 1) * ((t % 4.3) < 0.12 ? 0.1 : 1), gw = (0.2 + Math.sqrt(d2) * 0.03) / u.sc;
    u.eyes.forEach(([a, b]) => { a.scale.y = (a.userData.by || 0.04) * sq; b.scale.set(gw * fl, gw * fl * (0.55 + 0.45 * sq), 1); });
  };
  if (u.lod !== near) { u.lod = near; u.close = null; u.all.forEach(o => { o.visible = near; }); }   // da lontano restano solo gli occhi
  if (!near) { u.yaw = u.hd; m.rotation.y = u.yaw; u.spd = 0; if (e.alive) eyeFx(false); return; }
  const close = d2 < 64; if (u.close !== close) { u.close = close; u.det.forEach(o => { o.visible = close; }); }
  const sp = (n, tg, k, c) => { const s = u.s[n] || (u.s[n] = { x: 0, v: 0 }); s.v += (k * (tg - s.x) - c * s.v) * dt; s.x += s.v * dt; return s.x; };
  const kick = (n, v) => { (u.s[n] || (u.s[n] = { x: 0, v: 0 })).v += v; };
  if (u.yaw === null) u.yaw = u.hd;
  // ---- MORTE: cade all'indietro con rimbalzo, ginocchia che cedono, braccia e mascella molli
  if (!e.alive) {
    if (!u.dead) { u.dead = true; kick('fall', -3); u.eyes.forEach(([a, b]) => { a.visible = false; b.visible = false; }); }
    m.rotation.y = u.yaw; m.rotation.x = -sp('fall', 1.45, 38, 5); m.position.y += 0.05 * Math.min(1, e.deathTimer / 0.5);
    u.body.rotation.set(sp('dB', 0.1, 30, 5), 0, 0); u.chest.rotation.set(0.1, 0, 0);
    u.legs.forEach((l, i) => { l.rotation.x = sp('dl' + i, 0.9 + i * 0.35, 40, 5); u.knees[i].rotation.x = sp('dk' + i, 1.1, 40, 5); });
    u.arms.forEach((a, i) => { a.rotation.x = sp('arm' + i, i ? -0.2 : 0.5, 18, 3); u.elbows[i].rotation.x = sp('elb' + i, -0.5, 18, 3); });
    u.jaw.rotation.x = sp('jaw', 0.9, 40, 5); u.neck.rotation.x = sp('head', -0.5, 30, 4) * 0.5; u.head.rotation.x = u.neck.rotation.x; return;
  }
  const atk = e.state === 'attack', sum = e.state === 'summon', cow = e.state === 'cower';
  // ---- girata progressiva: il mostro non scatta, ruota; la testa anticipa e il corpo si inclina in curva
  let dy = u.hd - u.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const st = cl(dy, -(atk ? 9 : 6) * dt, (atk ? 9 : 6) * dt); u.yaw += st; u.yawRate += (st / dt - u.yawRate) * Math.min(1, dt * 10); m.rotation.y = u.yaw; m.rotation.x = 0;
  // ---- velocita liscia e accelerazione: guidano inclinazione, passo e rimbalzi
  u.spd += (mv / dt - u.spd) * Math.min(1, dt * 8); const acc = (u.spd - u.spdPrev) / dt; u.spdPrev = u.spd;
  const sf = cl(u.spd / 1.8, 0, 1); u.ph += mv * 5.2; const ph = u.ph, sw = Math.sin(ph);
  const stepIdx = Math.floor(ph / Math.PI);
  if (stepIdx !== u.stepIdx) { u.stepIdx = stepIdx; kick('bounce', -1.3 * sf); kick('jaw', 2.4 * sf); kick('head', (Math.random() - 0.5) * 3 * sf); kick('tX0', 1.5 * sf); }   // ogni passo: scossone
  // ---- attacco: carica, affondo, morso, recupero (1,1 s)
  u.atkT = atk ? u.atkT + dt : 0;
  const p = (u.atkT % 1.1) / 1.1, wind = atk && p < 0.38, strike = atk && p >= 0.38 && p < 0.52, lunge = strike ? Math.sin((p - 0.38) / 0.14 * Math.PI) : 0;
  if (e.hp < u.hp) { kick('pitch', -5); kick('head', -9); kick('jaw', 7); kick('twist', 3 * (Math.random() < 0.5 ? 1 : -1)); u.hurt = 0.5; }   // colpito: rinculo e urlo
  u.hp = e.hp; u.hurt = Math.max(0, u.hurt - dt);
  // ---- busto
  const pitch = sp('pitch', 0.3 + sf * 0.18 + cl(acc * 0.05, -0.25, 0.3) + (wind ? -0.45 : 0) + (strike ? 0.55 : 0) + (sum ? -0.4 : 0) + (cow ? 0.5 : 0), 70, 9);
  const bounce = sp('bounce', 0, 80, 6), roll = sp('roll', -u.yawRate * 0.05 + sw * 0.07 * sf, 60, 8);
  const twist = sp('twist', Math.cos(ph) * 0.22 * sf + (wind ? 0.5 : 0) + (strike ? -0.7 : 0), 55, 7);          // il torace ruota contro il bacino
  const chestP = sp('chestP', 0.1 + (wind ? -0.25 : 0) + (strike ? 0.35 : 0) + Math.sin(t * 2.3) * 0.03 * (1 - sf), 60, 8), br = Math.sin(t * 2.6 + sf * 3) * 0.5 + 0.5;
  u.body.position.y = 0.45 - 0.04 * (1 - sf) - (cow ? 0.12 : 0) - (wind ? 0.05 : 0) + bounce * 0.035;
  u.body.rotation.set(pitch, -twist * 0.4, roll); u.chest.rotation.set(chestP, twist, roll * 0.6); u.chest.scale.set(1 + br * 0.03, 1 + br * 0.05, 1 + br * 0.03);   // respira
  if (cow) m.rotation.z = Math.sin(t * 40) * 0.03; else m.rotation.z = 0;
  if (lunge) { m.position.x += Math.sin(u.yaw) * lunge * 0.14; m.position.z += Math.cos(u.yaw) * lunge * 0.14; }
  // ---- testa: resta stabile rispetto al mondo, anticipa le curve, annusa da ferma, scatta quando morde
  const hp = sp('head', -(pitch + chestP) * 0.7 + 0.12 + (wind ? -0.3 : 0) + (strike ? 0.5 : 0) + (u.hurt > 0 ? -0.5 : 0) + bounce * 0.12, 90, 9);
  const hy = sp('headY', cl(u.yawRate * 0.07, -0.5, 0.5) + Math.sin(t * 0.8) * 0.12 * (1 - sf), 80, 8), hr = sp('headR', Math.sin(t * 1.1) * 0.1 - roll * 0.8, 70, 8);
  u.neck.rotation.set(hp * 0.5, hy * 0.6, hr * 0.5); u.head.rotation.set(hp * 0.5, hy * 0.4, hr * 0.5);
  // ---- bocca: la mascella e una molla pigra che sbatte a ogni passo; urla se colpito, si spalanca e scatta nel morso
  const jt = u.hurt > 0 ? 0.8 : sum ? 0.85 : wind ? 0.35 + p * 1.2 : strike ? (p < 0.47 ? 0.95 : -0.05) : 0.1 + Math.sin(t * 3.1) * 0.04 + sf * 0.12, jw = sp('jaw', jt, 160, 9);
  u.jaw.rotation.x = Math.max(-0.1, jw); u.tongue.position.z = 0.1 + Math.max(0, jw) * 0.04; u.tongue.rotation.x = Math.sin(t * 9) * 0.12 * Math.max(0, jw);
  // ---- braccia: oscillano al contrario delle gambe con ritardo; si alzano per colpire, tremano quando evoca
  u.arms.forEach((a, i) => {
    const tg = sum ? -2.6 + Math.sin(t * 22) * 0.12 : cow ? -2.7 : atk ? (wind ? (i ? -2.7 : -1.9) : strike ? (i ? 0.1 : -0.6) : -0.7) : (i ? sw : -sw) * 0.85 * sf - 0.15 - 0.1 * Math.sin(t * 1.4 + i);
    a.rotation.x = sp('arm' + i, tg, atk ? 220 : 55, atk ? 14 : 6); a.rotation.z = (i ? -1 : 1) * (0.08 + sf * 0.06 + 0.05 * Math.sin(t * 1.7 + i));
    u.elbows[i].rotation.x = sp('elb' + i, -0.35 - ((i ? sw : -sw) > 0 ? 0.6 * sf : 0.1 * sf) - (wind ? 1 : 0) + (strike ? 0.9 : 0), 90, 8);
  });
  // ---- gambe: anca, ginocchio che si piega quando il piede si solleva, caviglia che compensa
  u.legs.forEach((l, i) => {
    const o = i ? Math.PI : 0, a = Math.sin(ph + o), lift = Math.max(0, Math.cos(ph + o));
    const hip = sp('hip' + i, a * 0.75 * sf + (cow ? 0.6 : 0.1) + (wind ? -0.1 : 0) + (strike ? (i ? 0.5 : -0.2) : 0), 140, 14), knee = 0.25 + lift * 0.95 * sf + (cow ? 0.7 : 0) + (wind ? 0.35 : 0);
    l.rotation.x = hip; u.knees[i].rotation.x = knee; u.ankles[i].rotation.x = -hip * 0.6 - (knee - 0.25) * 0.4 + lift * 0.4 * sf;
  });
  // ---- coda: ogni segmento segue il precedente con piu ritardo, frusta nelle curve e rimbalza con i passi
  u.tail.forEach((sg, i) => {
    sg.rotation.y = sp('tY' + i, -u.yawRate * 0.12 * (i + 1) + Math.sin(t * 2.2 - i * 0.8) * (0.18 + 0.25 * sf), 50 - i * 8, 4);
    sg.rotation.x = sp('tX' + i, -bounce * 0.15 * (i + 1) + 0.05 * i + (wind ? -0.3 : 0), 40 - i * 6, 3.5);
  });
  // ---- occhi
  eyeFx(atk || sum);
}

function t3Props(q) {   // oggetti di scena: armature, rastrelliere, casse, barili, bauli
  const g = new THREE.Group(), n = q.type === 'deco' ? DECOR[0][q.k].n : q.type;
  const add = (geo, c, x, y, z, p) => { const o = new THREE.Mesh(geo, t3Mat(c)); o.position.set(x, y, z); (p || g).add(o); return o; };
  if (/^armor/.test(n)) { add(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 6), '#3a2c1c', 0, 0.06, 0); add(t3Box(0.04, 0.3, 0.04), '#3a2c1c', 0, 0.25, 0); if (n !== 'armorEmpty' && n !== 'armorWeb' && n !== 'armorBroken') { add(t3Box(0.2, 0.26, 0.12), '#8a5a38', 0, 0.45, 0); add(new THREE.SphereGeometry(0.07, 8, 6), '#7a4e30', 0, 0.68, 0); } }
  else if (/rack|^weaponRack/.test(n)) { add(t3Box(0.5, 0.04, 0.06), '#4a2c14', 0, 0.5, 0); add(t3Box(0.04, 0.5, 0.06), '#4a2c14', -0.25, 0.25, 0); add(t3Box(0.04, 0.5, 0.06), '#4a2c14', 0.25, 0.25, 0); for (let i = 0; i < 4; i++) add(t3Box(0.025, 0.45, 0.025), '#7a7e86', -0.18 + i * 0.12, 0.3, 0.05); }
  else if (n === 'barrel') add(new THREE.CylinderGeometry(0.17, 0.15, 0.4, 10), '#7a5230', 0, 0.2, 0);
  else if (n === 'urn') add(new THREE.CylinderGeometry(0.1, 0.07, 0.3, 8), '#8a8a8a', 0, 0.15, 0);
  else if (n === 'bones') add(t3Box(0.3, 0.04, 0.2), '#e0d8c0', 0, 0.02, 0);
  else if (n === 'crate') add(t3Box(0.4, 0.4, 0.4), '#7a5230', 0, 0.2, 0);
  else if (n === 'xbarrel') { add(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 10), '#8a2418', 0, 0.25, 0); add(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 10), '#e0b020', 0, 0.3, 0); }
  else if (q.type === 'deco') add(t3Box(0.3, 0.3, 0.3), '#7a5230', 0, 0.15, 0);
  else { add(t3Box(0.4, 0.2, 0.28), '#5a3a1a', 0, 0.1, 0); g.userData.lid = add(t3Box(0.4, 0.1, 0.28), '#7a5230', 0, 0.25, 0); g.userData.lid.geometry.translate(0, 0, 0.14); g.userData.lid.position.z = -0.14; }   // baule
  if (q.flip) g.rotation.y = Math.PI; g.rotation.y += (q.x * 7.3 + q.y * 3.1) % 1.2;
  return g;
}

// ---------- aggiorna la scena a ogni fotogramma ----------
function t3Stale(map) { for (const [k, m] of map) if (m.userData.f !== T3.stamp) { T3.root.remove(m); map.delete(k); } }
function t3Get(map, key, make) { let m = map.get(key); if (!m) { m = make(); map.set(key, m); T3.root.add(m); } m.userData.f = T3.stamp; return m; }

// ---------- effetti: gli stessi sprite del motore 2D (pushFxSprites), qui come sprite additivi in 3D, piu vere luci ----------
function t3Fx() {
  const L = []; pushFxSprites(L);
  const pool = T3.fxPool || (T3.fxPool = []), texs = T3.fxTex || (T3.fxTex = new Map());
  let n = 0;
  for (const d of L) {
    if (n >= 420) break;
    let tx = texs.get(d.canvas); if (!tx) { tx = new THREE.CanvasTexture(d.canvas); texs.set(d.canvas, tx); }
    let sp = pool[n];
    if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, fog: false })); sp.renderOrder = 5; pool.push(sp); T3.root.add(sp); }
    n++;
    const m = sp.material;
    if (m.map !== tx) m.map = tx;
    const bl = d.add ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (m.blending !== bl) m.blending = bl;
    m.opacity = d.alpha === undefined ? 1 : d.alpha;
    const cy = d.floor !== undefined ? (d.lift || 0) + d.scale * (0.5 - d.floor) : (d.z === undefined ? 0.5 : d.z);
    sp.position.set(d.x, cy + world1H(d.x, d.y), d.y); sp.scale.set(d.scale, d.scale, 1); sp.visible = true;
  }
  for (let i = n; i < pool.length; i++) pool[i].visible = false;
}

function t3FxLights() {
  if (!T3.fxLights) return;
  const src = [], px = player.x, py = player.y;
  const add = (x, y, z, rgb, k) => { if (k <= 0) return; const d2 = (x - px) * (x - px) + (y - py) * (y - py); src.push({ x, y, z, rgb, k, s: k / (1 + d2 * 0.08) }); };
  for (const b of blasts) if (b.t < 1.1) add(b.x, b.y, 0.5, [1, 0.55, 0.2], 7 * (1 - b.t / 1.1));
  for (const ex of explosions) add(ex.x, ex.y, 0.5, ex.kind === 'plasma' ? [0.3, 1, 0.5] : [1, 0.6, 0.2], 4 * (1 - ex.timer / ex.maxTime));
  for (const p of projectiles) {
    if (p.kind === 'plasma') add(p.x, p.y, p.z, [0.3, 1, 0.45], 2.6);
    else if (p.kind === 'fireball') add(p.x, p.y, p.z, [1, 0.5, 0.15], 3);
    else if (p.kind === 'flame') add(p.x, p.y, p.z, [1, 0.5, 0.15], 1.6);
    else if (p.big) add(p.x, p.y, p.z, [1, 0.55, 0.2], 3);
  }
  for (const e of eShots) {
    if (e.kind === 'plasma') add(e.x, e.y, 0.45, [0.7, 0.3, 1], 2.4);
    else if (e.kind === 'fire') add(e.x, e.y, 0.45, [1, 0.5, 0.15], 2.4);
    else if (e.kind === 'venom') add(e.x, e.y, 0.45, [0.5, 1, 0.2], 1.8);
  }
  for (const f of fires) if ((f.x - px) ** 2 + (f.y - py) ** 2 < 100) add(f.x, f.y, 0.3, [1, 0.5, 0.15], 1.4 * Math.min(1, f.life / 1.5) * (0.85 + 0.15 * Math.sin(tNow * 13 + f.x)));
  if (isFiring && cur !== 4 && cur !== 5) {   // il lampo della tua arma
    const m = cur === 6 ? 0.8 : [0, 1, 0.45, 0.15][fireAnimFrame] || 0;
    if (m) add(px + player.dirX * 0.6, py + player.dirY * 0.6, 0.55, cur === 7 ? [0.3, 1, 0.5] : [1, 0.7, 0.3], 4.5 * m);
  }
  src.sort((a, b) => b.s - a.s);
  T3.fxLights.forEach((l, i) => {
    const q = src[i];
    if (!q) { l.intensity = 0; return; }
    l.position.set(q.x, q.z + world1H(q.x, q.y), q.y); l.color.setRGB(q.rgb[0], q.rgb[1], q.rgb[2]); l.intensity = q.k * powerK;
  });
}

function t3Sync() {
  const cam = T3.cam, px = player.x, py = player.y, P = PAL[0], st = ++T3.stamp;
  const nowMs = performance.now(); T3.dt = Math.min(0.05, (nowMs - (T3.lastMs || nowMs)) / 1000) || 0.016; T3.lastMs = nowMs;
  const k = shake && shake.t > 0 ? shake.a * shake.t / shake.max * 0.004 : 0, r = () => (Math.random() - 0.5) * k;
  const ey = 0.5 + W1.camH + (W1.fall > 0 ? (W1.fall / 0.8) ** 2 * 1.4 : 0);   // la camera segue il pavimento (e la caduta)
  cam.position.set(px + r(), ey + r(), py + r()); cam.lookAt(px + player.dirX, ey, py + player.dirY);
  // luci: le 6 torce piu vicine illuminano davvero i muri
  const gc = P.glow.split(',').map(Number), col = new THREE.Color(gc[0] / 255, gc[1] / 255, gc[2] / 255);
  const near = torches.map(q => ({ q, d: (q.x - px) ** 2 + (q.y - py) ** 2 })).sort((a, b) => a.d - b.d);
  T3.lights.forEach((l, i) => { const o = near[i]; l.visible = !!o && o.d < 100; if (o) { l.position.set(o.q.x, 0.75 + world1Hn(o.q.x, o.q.y), o.q.y); l.color.copy(col); l.intensity = (o.q.k || 1) * T3CFG.torch * flick; } });
  T3.amb.intensity = T3CFG.ambient * powerK; T3.hand.position.copy(cam.position); T3.hand.intensity = T3CFG.hand * powerK;
  const fr = Math.floor(tNow * 9) % 4; for (const k in (T3.mc || {})) T3.mc[k].skin.emissiveIntensity = 0.45 + 0.2 * Math.sin(tNow * 3); for (const t of T3.torchMats) t.mat.map = t.frames[fr];   // fiamme delle torce animate; le crepe dei demoni pulsano
  if (doorAnim && T3.doorTex) T3.doorTex.needsUpdate = true;
  // mostri
  for (const e of enemies) {
    const m = t3Get(T3.mobs, e, () => t3Mob(e)), u = m.userData, T = TYPES[e.type] || TYPES.demon;
    const d2 = (e.x - px) ** 2 + (e.y - py) ** 2, dx = e.x - u.px, dy = e.y - u.py, mv = Math.hypot(dx, dy);
    m.visible = d2 < 2025; u.px = e.x; u.py = e.y; if (!m.visible) continue;   // da lontano si vedono solo gli occhi
    m.position.set(e.x, world1H(e.x, e.y) + (T.lift ? T.lift + Math.sin(tNow * 3 + e.x) * 0.04 : 0), e.y);
    if (mv > 0.002) u.hd = Math.atan2(dx, dy);
    if (e.alive && (e.state === 'attack' || e.state === 'summon' || T.boss)) u.hd = Math.atan2(px - e.x, py - e.y);
    t3Anim(m, e, mv, d2);
    // barra vita: compare solo dopo il primo colpo
    const show = e.alive && e.hp < e.mhp && d2 < 144, b = t3Get(T3.bars, e, () => { const g = new THREE.Group(), mk = (c, z) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.04), new THREE.MeshBasicMaterial({ color: c, fog: false })); o.position.z = z; g.add(o); return o; }; mk(0x000000, 0); g.userData.fg = mk(0xdd2222, 0.001); return g; });
    b.visible = show; if (show) { const q = Math.max(0, e.hp / e.mhp); b.position.set(e.x, world1H(e.x, e.y) + u.sc * 0.98 + 0.12, e.y); b.quaternion.copy(cam.quaternion); b.userData.fg.scale.x = Math.max(0.001, q); b.userData.fg.position.x = -0.2 * (1 - q); }
  }
  t3Stale(T3.mobs); t3Stale(T3.bars);
  // colpi, fiamme, esplosioni e bagliori (sprite additivi + luci dinamiche)
  t3Fx(); t3FxLights();
  // raccoglibili: cubetti con l'icona, che ruotano e fluttuano
  for (const q of pickups) {
    if (q.taken) continue;
    const key = q.kind === 'arm' ? 'arm' + q.t : q.kind;
    const m = t3Get(T3.pick, q, () => { let tx = T3.icons.get(key); if (!tx && pickupIcons[key]) { tx = t3Tex(pickupIcons[key]); T3.icons.set(key, tx); } return new THREE.Mesh(t3Box(0.18, 0.18, 0.18), new THREE.MeshBasicMaterial({ map: tx, transparent: true, fog: false })); });
    m.position.set(q.x, 0.2 + world1H(q.x, q.y) + Math.sin(tNow * 2.5 + q.x) * 0.03, q.y); m.rotation.y = tNow * 1.5;
  }
  t3Stale(T3.pick);
  // oggetti di scena
  for (const q of props) {
    const m = t3Get(T3.prop, q, () => { const o = t3Props(q); o.position.set(q.x, world1H(q.x, q.y), q.y); return o; });
    if (m.userData.lid) m.userData.lid.rotation.x = q.open ? -1.2 : 0;
  }
  // lampadari appesi al soffitto
  for (const c of chands) {
    const m = t3Get(T3.prop, c, () => { const g = new THREE.Group(), fl = new THREE.MeshBasicMaterial({ color: 0xffb040, fog: false }); const stem = new THREE.Mesh(t3Box(0.015, 0.2, 0.015), t3Mat('#222')); stem.position.set(0, 0.9, 0); g.add(stem); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 14), t3Mat('#3a3a3a')); ring.rotation.x = Math.PI / 2; ring.position.y = 0.78; g.add(ring); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), fl); f.position.set(Math.cos(i * 1.57) * 0.16, 0.82, Math.sin(i * 1.57) * 0.16); g.add(f); } g.position.set(c.x, world1C(c.x, c.y) - 1, c.y); return g; });
  }
  t3Stale(T3.prop);
  world1Sync3D();
}

function t3Tag(s) {   // scritta in alto: versione e motore usato
  const el = document.querySelector('#hudInfo span'); if (!el) return;
  const t = 'CASTEDDISH v6' + (s ? ' [' + s + ']' : ''); if (el.textContent !== t) el.textContent = t;
}

// Chiamata da render(): restituisce true se il fotogramma e stato disegnato in 3D
function render3D() {
  if (T3.failed || typeof THREE === 'undefined' || curFloor !== 0 || !gameStarted) {
    if (T3.cv) T3.cv.style.display = 'none';
    t3Tag(gameStarted && curFloor === 0 ? (T3.failed ? '2D, errore 3D: ' + T3.err : 'Three.js non caricato') : '');
    return false;
  }
  try {
    if (!T3.on) t3Init();
    world1Ensure();
    T3.cv.style.display = ''; t3Tag(W1.dead ? '3D, trappole ferme' : '3D');
    const sig = curFloor + '|' + torches.length + '|' + (torches[0] ? torches[0].x + ',' + torches[0].y : '') + '|' + map[doorCell] + '|' + (doorAnim ? doorAnim.s : '') + '|' + W1.ver;
    if (sig !== T3.sig) { T3.sig = sig; t3Build(); }
    flick = (0.9 + 0.1 * Math.sin(tNow * 17) * Math.sin(tNow * 5.3) + (Math.random() - 0.5) * 0.06) * powerK;
    t3Sync(); T3.gl.render(T3.scene, T3.cam);
    ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);   // il canvas 2D resta sopra: arma, mirino e scritte
    renderGun();
    if (mm.t > 0 || mm.goal || (frameCount & 3) === 0) renderMinimap();
    return true;
  } catch (err) { console.error('3D disattivato, torno al 2D:', err); T3.failed = true; T3.err = String((err && err.message) || err).slice(0, 60); if (T3.cv) T3.cv.style.display = 'none'; return false; }
}
