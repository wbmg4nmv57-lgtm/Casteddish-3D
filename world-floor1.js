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
