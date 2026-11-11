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
   - Sala a terrazze: scalinata che porta a una piattaforma alta.
   - Cantina: sala incassata, raggiungibile con scalinate o cadendo da una botola.
   - Botole: cedono sotto i piedi e fanno cadere nella cantina.
   - Trappole: spuntoni a terra (a ciclo) e dardi che partono dai muri.
   Si genera sempre uguale per ogni partita (numeri casuali fissi).
   ====================================================================== */
const W1 = { map: null, ver: 0, H: new Float32Array(N * N), C: new Float32Array(N * N).fill(1), spikes: [], doors: [], shooters: [], darts: [], fall: 0, camH: 0, t: 0, cellar: null, dead: false, dm: [] };
const world1H = (x, y) => (x >= 0 && y >= 0 && x < N && y < N) ? W1.H[(y | 0) * N + (x | 0)] : 0;          // altezza del pavimento
const world1C = (x, y) => (x >= 0 && y >= 0 && x < N && y < N) ? W1.C[(y | 0) * N + (x | 0)] : 1;          // altezza del soffitto
const world1Hn = (x, y) => { let m = world1H(x, y); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m = Math.max(m, world1H(x + a, y + b)); return m; };

function world1Ensure() {
  if (W1.map === map) return;
  W1.map = map; W1.ver++;
  const H = W1.H.fill(0), C = W1.C.fill(1);
  W1.spikes.length = W1.doors.length = W1.shooters.length = W1.darts.length = 0; W1.fall = 0; W1.camH = 0; W1.cellar = null;
  if (curFloor !== 0 || rooms.length < 5) return;
  let sd = 20261111; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const start = rooms[0], sroom = stairs && rooms.find(r => stairs.x >= r.x && stairs.x < r.x + r.w && stairs.y >= r.y && stairs.y < r.y + r.h);
  const inR = (r, x, y) => !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const cand = rooms.filter(r => r !== start && r !== sroom).sort((a, b) => b.w * b.h - a.w * a.h);
  const hall = cand.find(r => r.w >= 9 && r.h >= 5), cellar = cand.find(r => r !== hall && r.w >= 6 && r.h >= 5);
  const open = i => map[i] === 0;
  // scalinate lungo i corridoi: fino a 5 celle fuori dalla zona, da h0 con passo 'step'
  const ramp = (seeds, h0, step, avoid) => {
    const d = new Int8Array(N * N).fill(-1), q = seeds.slice(); seeds.forEach(i => { d[i] = 0; });
    for (let k = 0; k < q.length; k++) {
      const i = q[k]; if (d[i] >= 4) continue;
      for (const j of [i + 1, i - 1, i + N, i - N]) {
        if (d[j] >= 0 || !open(j) || avoid(j % N, (j / N) | 0)) continue;
        d[j] = d[i] + 1; H[j] = h0 + step * d[j]; q.push(j);
      }
    }
  };
  if (hall) {   // sala a terrazze: 5 gradini e piattaforma alta, soffitto alto
    const sx = hall.x + 1, seeds = [];
    for (let y = hall.y; y < hall.y + hall.h; y++) for (let x = hall.x; x < hall.x + hall.w; x++) {
      const i = y * N + x; if (!open(i)) continue;
      H[i] = x < sx ? 0 : x < sx + 5 ? 0.18 * (x - sx + 1) : 0.9; C[i] = 2.4; if (H[i] === 0.9) seeds.push(i);
    }
    ramp(seeds, 0.9, -0.18, (x, y) => inR(start, x, y) || inR(sroom, x, y) || inR(hall, x, y) || inR(cellar, x, y));
  }
  if (cellar) {   // cantina: sala incassata di 1 unita, con scalinate che scendono dai corridoi
    const seeds = [];
    for (let y = cellar.y; y < cellar.y + cellar.h; y++) for (let x = cellar.x; x < cellar.x + cellar.w; x++) { const i = y * N + x; if (open(i)) { H[i] = -1; seeds.push(i); } }
    ramp(seeds, -1, 0.2, (x, y) => inR(start, x, y) || inR(sroom, x, y) || inR(hall, x, y));
    W1.cellar = cellar;
  }
  for (let i = 0; i < N * N; i++) if (open(i)) C[i] = Math.max(C[i], H[i] + 1.3);   // il soffitto sale insieme alle scale
  // trappole
  const bad = (x, y) => inR(start, x, y) || inR(sroom, x, y) || inR(hall, x, y) || inR(cellar, x, y);
  const free = [];
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) { const i = y * N + x; if (open(i) && !blk[i] && !liq[i] && H[i] === 0 && !bad(x, y) && Math.hypot(x - start.cx, y - start.cy) > 6) free.push(i); }
  free.sort(() => rnd() - 0.5);
  const taken = [], pick = gap => { for (const i of free) { const x = i % N, y = (i / N) | 0; if (taken.some(t => Math.abs(t[0] - x) < gap && Math.abs(t[1] - y) < gap)) continue; taken.push([x, y]); return [x, y]; } return null; };
  for (let k = 0; k < 9; k++) { const p = pick(3); if (p) W1.spikes.push({ x: p[0] + 0.5, y: p[1] + 0.5, c: p[1] * N + p[0], o: rnd() * 3.2, up: 0, hit: false }); }
  if (cellar) for (let k = 0; k < 5; k++) { const p = pick(4); if (p) W1.doors.push({ x: p[0] + 0.5, y: p[1] + 0.5, s: 0, t: 0, a: 0 }); }
  const walls = [];
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) if (map[y * N + x] === 1 || map[y * N + x] === 2) walls.push([x, y]);
  walls.sort(() => rnd() - 0.5);
  for (const [x, y] of walls) {
    if (W1.shooters.length >= 5) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let ok = true;
      for (let k = 1; k <= 5 && ok; k++) { const cx = x + dx * k, cy = y + dy * k, i = cy * N + cx; ok = open(i) && !blk[i] && H[i] === 0 && !bad(cx, cy); }
      if (ok && W1.shooters.every(s => Math.hypot(s.x - x - 0.5, s.y - y - 0.5) > 6)) { W1.shooters.push({ x: x + 0.5, y: y + 0.5, dx, dy, cd: 1 + rnd() * 2 }); break; }
    }
  }
}

function w1Fall() {   // caduta nella cantina
  const c = W1.cellar; let best = null;
  for (let r = 0; r < 6 && !best; r++) for (let j = -r; j <= r && !best; j++) for (let i = -r; i <= r; i++) {
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
    for (const s of W1.shooters) {   // dardi: partono quando passi davanti alla feritoia
      s.cd -= dt; if (s.cd > 0) continue;
      const rx = px - s.x, ry = py - s.y, along = rx * s.dx + ry * s.dy, side = Math.abs(rx * s.dy - ry * s.dx);
      if (along > 0.8 && along < 10 && side < 0.9 && los(s.x + s.dx, s.y + s.dy, px, py)) { W1.darts.push({ x: s.x + s.dx * 0.6, y: s.y + s.dy * 0.6, dx: s.dx, dy: s.dy }); s.cd = 2.4; } else s.cd = 0.25;
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
  T3.amb = new THREE.AmbientLight(0xffffff, 0.3); T3.scene.add(T3.amb);
  T3.hand = new THREE.PointLight(0xffd9a0, 0.45, 5, 1.5); T3.scene.add(T3.hand);
  T3.lights = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffaa44, 1, 7, 1.6); T3.scene.add(l); T3.lights.push(l); }
  T3.on = true;
}

// ---------- il livello: muri, pavimento, soffitto, scale ----------
function t3Build() {
  const sc = T3.scene, P = PAL[0];
  if (T3.root) sc.remove(T3.root);
  const root = T3.root = new THREE.Group(); sc.add(root);
  for (const m of [T3.mobs, T3.prj, T3.eprj, T3.pick, T3.prop, T3.bars]) m.clear();
  T3.chd = [];
  const fog = new THREE.Color(fogC[0] / 255, fogC[1] / 255, fogC[2] / 255);
  sc.fog = new THREE.FogExp2(fog, 0.17); T3.gl.setClearColor(fog);
  const tile = (buf, rep) => {
    const c = document.createElement('canvas'); c.width = c.height = TS;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length * 4).slice(), TS, TS), 0, 0);
    const t = t3Tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
  };
  // pavimento e soffitto: un blocco per cella, cosi ogni cella ha la sua altezza (gradini, cantina, sala alta)
  const cellsOpen = []; for (let i = 0; i < N * N; i++) if (map[i] === 0) cellsOpen.push(i);
  const slab = (buf, hOf, off) => {
    const mat = new THREE.MeshStandardMaterial({ map: buf ? tile(buf, 1) : null, color: buf ? 0xffffff : 0x333333, roughness: 1 }), im = new THREE.InstancedMesh(t3Box(1, 3, 1), mat, cellsOpen.length), m4 = new THREE.Matrix4();
    cellsOpen.forEach((c, k) => { m4.setPosition((c % N) + 0.5, hOf(c) + off, ((c / N) | 0) + 0.5); im.setMatrixAt(k, m4); }); root.add(im);
  };
  slab(floorBuf, c => W1.H[c], -1.5); slab(ceilBuf, c => W1.C[c], 1.5);
  // muri: solo quelli che toccano uno spazio libero, un InstancedMesh per tipo di texture
  const open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && map[y * N + x] === 0;
  const by = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = map[y * N + x];
    if (t > 0 && (open(x + 1, y) || open(x - 1, y) || open(x, y + 1) || open(x, y - 1))) (by[t] = by[t] || []).push(x, y);
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
function t3Mob(e) {
  const S = STY[e.type] || STY.demon, T = TYPES[e.type] || TYPES.demon, sc = T.sc * (e.hs || 1);
  const body = t3Mat(S.c2), dark = t3Mat(S.c1), g = new THREE.Group();
  const add = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (p || g).add(o); return o; };
  const limb = (x, y, w, l, m) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); add(t3Box(w, l, w), m, 0, -l / 2, 0, p); return p; };
  add(t3Box(0.3, 0.34, 0.18), body, 0, 0.52, 0); add(t3Box(0.22, 0.1, 0.16), dark, 0, 0.34, 0);
  add(new THREE.SphereGeometry(0.1, 10, 8), body, 0, 0.79, 0.01);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: S.eye || '#ffd23a', fog: false }), s * 0.055, 0.8, 0.095);
    add(new THREE.ConeGeometry(0.03, 0.14, 6), t3Mat(S.horn || '#d9cfae'), s * 0.07, 0.9, 0).rotation.z = -s * 0.35;
  }
  const arms = [limb(-0.2, 0.68, 0.075, 0.34, t3Mat(S.arm || S.c2)), limb(0.2, 0.68, 0.075, 0.34, t3Mat(S.arm || S.c2))];
  const legs = [limb(-0.08, 0.33, 0.09, 0.33, t3Mat(S.limb || S.c1)), limb(0.08, 0.33, 0.09, 0.33, t3Mat(S.limb || S.c1))];
  add(t3Box(0.025, 0.025, 0.5), t3Mat('#5a3e22'), 0, -0.3, 0.2, arms[1]); add(t3Box(0.03, 0.18, 0.14), t3Mat('#bfc6cc', 0.4), 0, -0.3, 0.42, arms[1]);   // ascia
  g.rotation.order = 'YXZ'; g.scale.setScalar(sc); if (S.alpha) g.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = S.alpha; } });
  g.userData = { arms, legs, px: e.x, py: e.y, ph: 0, hd: 0, sc };
  return g;
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
  const k = shake && shake.t > 0 ? shake.a * shake.t / shake.max * 0.004 : 0, r = () => (Math.random() - 0.5) * k;
  const ey = 0.5 + W1.camH + (W1.fall > 0 ? (W1.fall / 0.8) ** 2 * 1.4 : 0);   // la camera segue il pavimento (e la caduta)
  cam.position.set(px + r(), ey + r(), py + r()); cam.lookAt(px + player.dirX, ey, py + player.dirY);
  // luci: le 6 torce piu vicine illuminano davvero i muri
  const gc = P.glow.split(',').map(Number), col = new THREE.Color(gc[0] / 255, gc[1] / 255, gc[2] / 255);
  const near = torches.map(q => ({ q, d: (q.x - px) ** 2 + (q.y - py) ** 2 })).sort((a, b) => a.d - b.d);
  T3.lights.forEach((l, i) => { const o = near[i]; l.visible = !!o && o.d < 120; if (o) { l.position.set(o.q.x, 0.75 + world1Hn(o.q.x, o.q.y), o.q.y); l.color.copy(col); l.intensity = (o.q.k || 1) * 1.7 * flick; } });
  T3.amb.intensity = 0.28 * (P.amb || 1) * powerK; T3.hand.position.copy(cam.position); T3.hand.intensity = 0.45 * powerK;
  const fr = Math.floor(tNow * 9) % 4; for (const t of T3.torchMats) t.mat.map = t.frames[fr];
  if (doorAnim && T3.doorTex) T3.doorTex.needsUpdate = true;
  // mostri
  for (const e of enemies) {
    const m = t3Get(T3.mobs, e, () => t3Mob(e)), u = m.userData, T = TYPES[e.type] || TYPES.demon;
    const d2 = (e.x - px) ** 2 + (e.y - py) ** 2, dx = e.x - u.px, dy = e.y - u.py, mv = Math.hypot(dx, dy);
    m.visible = d2 < 484; u.px = e.x; u.py = e.y; if (!m.visible) continue;
    m.position.set(e.x, world1H(e.x, e.y) + (T.lift ? T.lift + Math.sin(tNow * 3 + e.x) * 0.04 : 0), e.y);
    if (mv > 0.002) u.hd = Math.atan2(dx, dy);
    if (e.alive && (e.state === 'attack' || e.state === 'summon' || T.boss)) u.hd = Math.atan2(px - e.x, py - e.y);
    m.rotation.y = u.hd; u.ph += mv * 14;
    const sw = Math.sin(u.ph) * Math.min(1, mv * 40);
    if (e.alive) {
      m.rotation.x = 0; u.legs[0].rotation.x = sw * 0.8; u.legs[1].rotation.x = -sw * 0.8;
      if (e.state === 'attack' || e.state === 'summon') { u.arms[0].rotation.x = u.arms[1].rotation.x = -1.5 + Math.sin(tNow * 14) * 0.35; }
      else if (e.state === 'cower') { u.arms[0].rotation.x = u.arms[1].rotation.x = -2.8; m.scale.y = u.sc * 0.6; }
      else { u.arms[0].rotation.x = -sw * 0.6; u.arms[1].rotation.x = sw * 0.6; m.scale.y = u.sc; }
    } else { m.rotation.x = -Math.min(1, e.deathTimer / 0.5) * 1.45; m.position.y += 0.05; }
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
    const m = t3Get(T3.prop, c, () => { const g = new THREE.Group(), fl = new THREE.MeshBasicMaterial({ color: 0xffb040, fog: false }); g.add(Object.assign(new THREE.Mesh(t3Box(0.015, 0.2, 0.015), t3Mat('#222')), { position: new THREE.Vector3(0, 0.9, 0) })); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 14), t3Mat('#3a3a3a')); ring.rotation.x = Math.PI / 2; ring.position.y = 0.78; g.add(ring); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), fl); f.position.set(Math.cos(i * 1.57) * 0.16, 0.82, Math.sin(i * 1.57) * 0.16); g.add(f); } g.position.set(c.x, world1C(c.x, c.y) - 1, c.y); return g; });
  }
  t3Stale(T3.prop);
  world1Sync3D();
}

// Chiamata da render(): restituisce true se il fotogramma e stato disegnato in 3D
function render3D() {
  if (T3.failed || typeof THREE === 'undefined' || curFloor !== 0 || !gameStarted) { if (T3.cv) T3.cv.style.display = 'none'; return false; }
  try {
    if (!T3.on) t3Init();
    world1Ensure();
    T3.cv.style.display = '';
    const sig = curFloor + '|' + torches.length + '|' + (torches[0] ? torches[0].x + ',' + torches[0].y : '') + '|' + map[doorCell] + '|' + (doorAnim ? doorAnim.s : '') + '|' + W1.ver;
    if (sig !== T3.sig) { T3.sig = sig; t3Build(); }
    flick = (0.9 + 0.1 * Math.sin(tNow * 17) * Math.sin(tNow * 5.3) + (Math.random() - 0.5) * 0.06) * powerK;
    t3Sync(); T3.gl.render(T3.scene, T3.cam);
    ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);   // il canvas 2D resta sopra: arma, mirino e scritte
    renderGun();
    if (mm.t > 0 || mm.goal || (frameCount & 3) === 0) renderMinimap();
    return true;
  } catch (err) { console.error('3D disattivato, torno al 2D:', err); T3.failed = true; if (T3.cv) T3.cv.style.display = 'none'; return false; }
}
