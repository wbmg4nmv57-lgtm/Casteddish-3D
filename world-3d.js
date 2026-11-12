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
// Pelle del demone: carne scura con vene, cicatrici e sangue + crepe incandescenti (si genera una volta sola)
function t3SkinTex() {
  if (T3.skinTex) return;
  let s = 7; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 128; return c; };
  const a = mk(), g = a.getContext('2d');
  g.fillStyle = '#5c1812'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '20,4,2' : '150,50,35'},${0.1 + R() * 0.25})`; g.fillRect(R() * 128, R() * 128, 1 + R() * 3, 1 + R() * 3); }
  g.lineWidth = 1.2;
  for (let i = 0; i < 16; i++) { g.strokeStyle = 'rgba(25,3,3,0.7)'; g.beginPath(); let x = R() * 128, y = R() * 128; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 30; y += (R() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }   // vene
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(70,0,0,0.55)'; g.beginPath(); g.arc(R() * 128, R() * 128, 3 + R() * 9, 0, 6.3); g.fill(); }   // sangue
  for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(210,150,120,0.55)'; g.beginPath(); const x = R() * 128, y = R() * 128; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 26, y + (R() - 0.5) * 26); g.stroke(); }   // cicatrici
  const b = mk(), h = b.getContext('2d');
  h.fillStyle = '#000'; h.fillRect(0, 0, 128, 128); h.strokeStyle = '#ff5a14'; h.shadowColor = '#ff2a00'; h.shadowBlur = 6; h.lineWidth = 2;
  for (let i = 0; i < 11; i++) { h.beginPath(); let x = R() * 128, y = R() * 128; h.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 34; y += (R() - 0.5) * 34; h.lineTo(x, y); } h.stroke(); }   // crepe di fuoco
  T3.skinTex = t3Tex(a); T3.glowTex = t3Tex(b);
}

// Demone: curvo in avanti, torace enorme con costole, cranio allungato con corna, occhi infuocati,
// mascella con lingua e zanne, braccia lunghe con artigli, gambe all'indietro, coda e spuntoni sulla schiena.
// Scheletro a catena: bacino > torace > collo > testa, spalla > gomito, anca > ginocchio > caviglia, coda a 4 segmenti.
function t3Mob(e) {
  t3SkinTex();
  const gc = T3.gc = T3.gc || {}, G = (k, f) => gc[k] || (gc[k] = f());
  const S = STY[e.type] || STY.demon, T = TYPES[e.type] || TYPES.demon, mo = (VARS[e.type] && VARS[e.type][e.v | 0] && VARS[e.type][e.v | 0][2]) || {};
  const sc = T.sc * (e.hs || 1), wsc = mo.ws || 1, mc = T3.mc = T3.mc || {};
  if (!mc[e.type]) {
    const std = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r }), ec = S.eye || '#ff3b1a';
    mc[e.type] = {
      skin: new THREE.MeshStandardMaterial({ map: T3.skinTex, color: new THREE.Color(S.c2 || '#7a2a20').lerp(new THREE.Color(0xffffff), 0.55), emissive: 0xff4a10, emissiveMap: T3.glowTex, emissiveIntensity: 0.5, roughness: 0.8 }),
      dark: std(new THREE.Color(S.c1 || '#2a0c0a'), 0.9), horn: std(new THREE.Color(S.horn || '#2a1c18'), 0.5), bone: std(0xe8dcc0, 0.6), tongue: std(0x8a1020, 0.45),
      steel: new THREE.MeshStandardMaterial({ color: 0x59606a, roughness: 0.35, metalness: 0.5 }),
      eye: new THREE.MeshBasicMaterial({ color: ec, fog: false }),
      halo: new THREE.MeshBasicMaterial({ color: ec, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    };
    if (S.alpha) for (const k in mc[e.type]) if (k !== 'eye' && k !== 'halo') { mc[e.type][k].transparent = true; mc[e.type][k].opacity = S.alpha; }
  }
  const M = mc[e.type], g = new THREE.Group(), det = [], all = [], eyes = [];
  const sph = G('sph', () => new THREE.SphereGeometry(0.5, 12, 9)), cyl = G('cyl', () => new THREE.CylinderGeometry(0.5, 0.36, 1, 8)), cone = G('cone', () => new THREE.ConeGeometry(0.5, 1, 6)), box = G('box', () => new THREE.BoxGeometry(1, 1, 1));
  const part = (geo, mat, x, y, z, p, s, rot, isDet, keep) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); if (s) o.scale.set(s[0], s[1], s[2]); if (rot) o.rotation.set(rot[0], rot[1], rot[2]); (p || g).add(o); if (!keep) all.push(o); if (isDet) det.push(o); return o; };
  const grp = (p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  const body = grp(g, 0, 0.45, 0); part(sph, M.dark, 0, -0.04, 0, body, [0.3, 0.24, 0.24]);                               // bacino
  const chest = grp(body, 0, 0.1, 0); part(sph, M.skin, 0, 0.06, 0, chest, [0.46 * wsc, 0.5, 0.3]);                        // torace
  for (let i = 0; i < 3; i++) part(box, M.bone, 0, 0.14 - i * 0.08, 0.13, chest, [0.26 * wsc, 0.018, 0.04], null, true);   // costole
  for (let i = 0; i < 4; i++) part(cone, M.horn, 0, 0.2 - i * 0.1, -0.15, chest, [0.06, 0.16, 0.06], [-2.0, 0, 0], true);  // spuntoni sulla schiena
  const neck = grp(chest, 0, 0.2, 0.04); part(cyl, M.skin, 0, 0.02, 0, neck, [0.1, 0.14, 0.1]);
  const head = grp(neck, 0, 0.08, 0.03);
  part(sph, M.skin, 0, 0, 0.02, head, [0.24, 0.26, 0.3]); part(sph, M.dark, 0, -0.02, 0.1, head, [0.16, 0.12, 0.14]);       // cranio, muso
  part(box, M.dark, 0, 0.085, 0.16, head, [0.22, 0.03, 0.06]);                                                              // sopracciglia
  const jaw = grp(head, 0, -0.08, 0.04); part(box, M.dark, 0, -0.02, 0.07, jaw, [0.15, 0.04, 0.2]);
  const tongue = part(box, M.tongue, 0, -0.005, 0.1, jaw, [0.05, 0.015, 0.12], null, true);
  for (let i = 0; i < 5; i++) { part(cone, M.bone, -0.056 + i * 0.028, 0.02, 0.15, jaw, [0.018, 0.055, 0.018], null, true); part(cone, M.bone, -0.056 + i * 0.028, -0.075, 0.17, head, [0.018, 0.055, 0.018], [Math.PI, 0, 0], true); }
  for (const s of [-1, 1]) {
    eyes.push([part(sph, M.eye, s * 0.07, 0.04, 0.17, head, [0.055, 0.035, 0.03], [0, 0, s * 0.4], false, true), part(sph, M.halo, s * 0.07, 0.04, 0.17, head, [0.14, 0.1, 0.07], null, false, true)]);   // occhi + alone
    part(cone, M.horn, s * 0.1, 0.17, -0.02, head, [0.075, 0.26, 0.075], [-0.5, 0, -s * 0.55]); part(cone, M.horn, s * 0.2, 0.33, -0.1, head, [0.05, 0.2, 0.05], [-1.0, 0, -s * 0.25]);
    part(cone, M.skin, s * 0.14, 0.02, -0.02, head, [0.04, 0.14, 0.02], [0, 0, -s * 1.3]);
  }
  const elbows = [], arms = [-1, 1].map(s => {
    const a = grp(chest, s * 0.25 * wsc, 0.16, 0);
    part(sph, M.skin, 0, 0, 0, a, [0.14, 0.14, 0.14]); part(cone, M.horn, s * 0.04, 0.08, 0, a, [0.05, 0.16, 0.05], [0, 0, -s * 0.5]); part(cyl, M.skin, 0, -0.14, 0, a, [0.09, 0.28, 0.09]);
    const el = grp(a, 0, -0.29, 0); el.rotation.x = -0.35; elbows.push(el);
    part(cyl, M.skin, 0, -0.13, 0, el, [0.075, 0.26, 0.075]); part(sph, M.dark, 0, -0.27, 0, el, [0.1, 0.1, 0.1]);
    for (let k = -1; k <= 1; k++) part(cone, M.bone, k * 0.03, -0.35, 0.01, el, [0.02, 0.1, 0.02], [Math.PI, 0, 0], true);   // artigli
    if (s === 1) { part(box, M.dark, 0, -0.27, 0.16, el, [0.03, 0.03, 0.34]); part(box, M.steel, 0, -0.27, 0.36, el, [0.03, 0.2, 0.14]); }   // mannaia
    return a;
  });
  const knees = [], ankles = [], legs = [-1, 1].map(s => {
    const l = grp(g, s * 0.1, 0.44, 0); part(cyl, M.skin, 0, -0.1, 0.04, l, [0.12, 0.26, 0.12], [-0.45, 0, 0]);               // coscia
    const kn = grp(l, 0, -0.2, 0.12); part(cyl, M.dark, 0, -0.1, -0.03, kn, [0.075, 0.26, 0.075], [0.7, 0, 0]);               // stinco
    const an = grp(kn, 0, -0.22, -0.07); part(box, M.dark, 0, -0.01, 0.04, an, [0.09, 0.04, 0.16]);                           // piede
    for (let k = -1; k <= 1; k++) part(cone, M.bone, k * 0.03, -0.01, 0.12, an, [0.02, 0.07, 0.02], [Math.PI / 2, 0, 0], true);
    knees.push(kn); ankles.push(an); return l;
  });
  const tail = []; let par = body;
  for (let i = 0; i < 4; i++) { const sg = grp(par, 0, i ? 0 : -0.14, i ? -0.16 : -0.14); part(cone, M.skin, 0, 0, -0.08, sg, [0.09 - i * 0.018, 0.2, 0.09 - i * 0.018], [-Math.PI / 2, 0, 0]); tail.push(sg); par = sg; }
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
  if (u.lod !== near) { u.lod = near; u.close = null; u.all.forEach(o => { o.visible = near; }); }   // da lontano restano solo gli occhi
  if (!near) { u.yaw = u.hd; m.rotation.y = u.yaw; u.spd = 0; return; }
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
  // ---- occhi: sfarfallano, si stringono quando attacca, ogni tanto sbattono le palpebre
  const fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3), sq = (atk || sum ? 0.5 : 1) * ((t % 4.3) < 0.12 ? 0.1 : 1);
  u.eyes.forEach(([a, b]) => { a.scale.y = 0.035 * sq; b.scale.set(0.14 * fl, 0.1 * fl * sq, 0.07); });
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
    m.visible = d2 < 900; u.px = e.x; u.py = e.y; if (!m.visible) continue;   // da lontano si vedono solo gli occhi
    m.position.set(e.x, world1H(e.x, e.y) + (T.lift ? T.lift + Math.sin(tNow * 3 + e.x) * 0.04 : 0), e.y);
    if (mv > 0.002) u.hd = Math.atan2(dx, dy);
    if (e.alive && (e.state === 'attack' || e.state === 'summon' || T.boss)) u.hd = Math.atan2(px - e.x, py - e.y);
    t3Anim(m, e, mv, d2);
    // barra vita: compare solo dopo il primo colpo
    const show = e.alive && e.hp < e.mhp && d2 < 144, b = t3Get(T3.bars, e, () => { const g = new THREE.Group(), mk = (c, z) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.04), new THREE.MeshBasicMaterial({ color: c, fog: false })); o.position.z = z; g.add(o); return o; }; mk(0x000000, 0); g.userData.fg = mk(0xdd2222, 0.001); return g; });
    b.visible = show; if (show) { const q = Math.max(0, e.hp / e.mhp); b.position.set(e.x, world1H(e.x, e.y) + u.sc * 0.98 + 0.12, e.y); b.quaternion.copy(cam.quaternion); b.userData.fg.scale.x = Math.max(0.001, q); b.userData.fg.position.x = -0.2 * (1 - q); }
  }
  t3Stale(T3.mobs); t3Stale(T3.bars);
  // colpi del giocatore e dei nemici
  const dot = (map, list, size, c0) => { for (const s of list) { const m = t3Get(map, s, () => new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color: s.col || c0, fog: false }))); m.position.set(s.x, (s.z != null ? s.z : 0.5) + world1H(s.x, s.y), s.y); m.scale.setScalar(s.big ? 2 : 1); } };
  dot(T3.prj, projectiles, 0.06, 0xffc060); dot(T3.eprj, eShots, 0.07, 0xb04bff); t3Stale(T3.prj); t3Stale(T3.eprj);
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
