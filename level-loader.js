/* ======================================================================
   CASTEDDISH - Caricamento del livello
   buildTextures() prepara le texture; loadFloor() genera stanze,
   corridoi, torce, scale, nemici, oggetti di scena e bauli di ogni
   piano.
   ====================================================================== */

function buildTextures(f) {
  const P = PAL[f];
  let w1, w2, fl, ce, lq = null;
  if (f === 0) {
    w1 = blockWall([108, 100, 90], 8, 32, '#14100c', { cracks: 3 });
    w2 = blockWall([86, 92, 78], 8, 32, '#12140e', { moss: 70, cracks: 2, stain: 6, stainCol: 'rgba(20,50,20,.3)' });
    fl = tiles([78, 70, 62], null, 64, '#0e0b09', { cracks: 4, moss: 20 }); ce = tiles([54, 46, 40], null, 32, '#0c0907', {});
  } else if (f === 1) {
    w1 = paintBand(blockWall([128, 120, 104], 2, 64, '#26221a', { cracks: 6, grain: 28, stain: 10, stainCol: 'rgba(80,55,30,.3)' }), 'rgba(104,136,118,.85)');
    w2 = rustMetal();
    fl = tiles([150, 140, 120], [96, 90, 76], 32, '#2a251c', { cracks: 6, grain: 30 }); ce = tiles([128, 124, 108], null, 64, '#3a362c', { cracks: 3, var: 22 });
  } else if (f === 2) {
    w1 = blockWall([84, 88, 100], 4, 64, '#0d0f15', { cracks: 4, var: 30 });
    w2 = banner(blockWall([84, 88, 100], 4, 64, '#0d0f15', { cracks: 2, var: 30 }));
    fl = tiles([46, 46, 56], [130, 130, 140], 64, '#08080c', { var: 14 }); ce = tiles([40, 28, 22], null, 32, '#140c08', { cracks: 2, var: 20 });
  } else if (f === 3) {
    w1 = blockWall([68, 82, 62], 6, 32, '#0e140d', { moss: 150, cracks: 3, var: 44, stain: 8, stainCol: 'rgba(15,55,20,.35)' });
    w2 = bark(); fl = mud(); ce = sky(); lq = liquid(false);
  } else {
    w1 = plates(false); w2 = plates(true); fl = grating(); ce = pipes(); lq = liquid(true);
  }
  wallTex[1] = w1; wallTex[2] = w2;
  wallTex[3] = [0, 1, 2, 3].map(k => lamp(k, w1, P.kind, P));
  wallTex[4] = decor(f, w1); wallTex[5] = door(f);
  floorBuf = toBuf(fl); ceilBuf = toBuf(ce); liqBuf = lq ? toBuf(lq) : floorBuf;
  liqEmit = f === 4 ? 0.55 : 0;
  fogC = P.fog; fogS = P.fog.join(',');
  chandArt = [chandelier(f, 0), chandelier(f, 1)];
  decoArt = DECOR[f].map(d => dArt(d.draw));
  decoFlip = decoArt.map(c => { const m = mk(); m.width = c.width; m.height = c.height; const q = m.getContext('2d'); q.translate(c.width, 0); q.scale(-1, 1); q.drawImage(c, 0, 0); return m; });
}

function loadFloor(prog) {
  const f = FLOOR_ORDER[prog]; progress = prog; curFloor = f; doorOpen = false;
  const cfg = CFG[f];
  let g, start;
  for (let tries = 0; tries < 40; tries++) {
    sr = f * 7919 + tries * 104729 + 13;
    g = new Uint8Array(N * N).fill(1); rooms = []; stairs = null; doorCell = -1;
    const carve = (x, y) => { if (x > 0 && y > 0 && x < N - 1 && y < N - 1) g[y * N + x] = 0; };
    const room = (x, y, w, h) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j);
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    };
    const cor = (a, b, w) => {
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) for (let k = 0; k < w; k++) carve(x, a.cy + k);
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) for (let k = 0; k < w; k++) carve(b.cx + k, y);
    };
    if (cfg.boss) {
      room(3, 37, 8, 8); room(13, 6, 30, 34); cor(rooms[0], rooms[1], 3);
      for (let j = 9; j < 38; j += 5) for (let i = 16; i < 41; i += 5) g[j * N + i] = 2;
    } else if (cfg.maze) {
      const st = [[1, 1]]; g[N + 1] = 0;
      while (st.length) {
        const [x, y] = st[st.length - 1];
        const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([i, j]) => x + i > 0 && y + j > 0 && x + i < N - 1 && y + j < N - 1 && g[(y + j) * N + x + i] === 1);
        if (!nb.length) { st.pop(); continue; }
        const [i, j] = nb[Math.floor(srand() * nb.length)];
        g[(y + j / 2) * N + x + i / 2] = 0; g[(y + j) * N + x + i] = 0; st.push([x + i, y + j]);
      }
      room(2, 2, 7, 7);
      for (let k = 0; k < 6; k++) room(ri(3, 38), ri(3, 38), 7, 7);
    } else {
      for (let t = 0; rooms.length < cfg.rooms && t < 500; t++) {
        const w = ri(cfg.min, cfg.max), h = ri(cfg.min, cfg.max), x = ri(3, N - w - 3), y = ri(3, N - h - 3);
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        room(x, y, w, h);
      }
      for (let i = 1; i < rooms.length; i++) {
        let b = 0, bd = 1e9;
        for (let j = 0; j < i; j++) { const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; b = j; } }
        cor(rooms[i], rooms[b], cfg.cw);
      }
      for (let k = 0; k < rooms.length >> 2; k++) cor(rooms[ri(0, rooms.length - 1)], rooms[ri(0, rooms.length - 1)], cfg.cw);
      if (cfg.pillars) for (const r of rooms) if (r.w > 8 && r.h > 8)
        for (let j = r.y + 2; j < r.y + r.h - 2; j += 3) for (let i = r.x + 2; i < r.x + r.w - 2; i += 3)
          if ((i - r.cx) ** 2 + (j - r.cy) ** 2 > 2) g[j * N + i] = 2;
    }
    start = rooms[0];
    if (cfg.boss) break;
    // Farthest room gets the sealed staircase
    const d1 = new Int16Array(N * N); bfs(g, start.cy * N + start.cx, d1);
    let far = null, fd = -1;
    for (const r of rooms) { const d = d1[r.cy * N + r.cx]; if (r !== start && d < 9999 && d > fd) { fd = d; far = r; } }
    if (!far) continue;
    const sx = far.x + 1, sy = far.y;
    g[sy * N + sx] = 0; g[sy * N + sx - 1] = 1; g[sy * N + sx + 1] = 1; g[(sy + 1) * N + sx] = 5;
    stairs = { x: sx + 0.5, y: sy + 0.5 }; doorCell = (sy + 1) * N + sx;
    const d2 = new Int16Array(N * N); bfs(g, start.cy * N + start.cx, d2);
    if (rooms.some(r => d2[r.cy * N + r.cx] >= 9999)) continue;
    break;
  }

  // Final map with wall variants and torches
  map = new Uint8Array(N * N); torches = [];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const n = y * N + x, v = g[n];
    if (!v) continue;
    if (v !== 1) { map[n] = v; continue; }
    const open = !g[n - 1] || !g[n + 1] || !g[n - N] || !g[n + N], r = srand();
    map[n] = !open ? 1 : r < 0.05 ? 3 : r < 0.09 ? 4 : r < 0.3 ? 2 : 1;
    if (map[n] === 3) torches.push({ x: x + 0.5, y: y + 0.5, snd: PAL[f].kind });
  }
  for (let i = 0; i < N; i++) { map[i] = 1; map[(N - 1) * N + i] = 1; map[i * N] = 1; map[i * N + N - 1] = 1; }
  liq.fill(0);
  if (cfg.liq) {
    const pool = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!map[j * N + i]) liq[j * N + i] = 1; };
    if (cfg.boss) for (let k = 0; k < 9; k++) pool(ri(15, 38), ri(8, 34), ri(3, 6), ri(3, 5));
    else for (let k = 1; k < rooms.length; k++) if (srand() < 0.6) {
      const r = rooms[k];
      pool(r.x + 1 + ri(0, 2), r.y + 1 + ri(0, 2), Math.max(2, r.w - 4 - ri(0, 3)), Math.max(2, r.h - 4 - ri(0, 3)));
    }
  }

  // Crates, chests and chandeliers (crates and chests are solid, rooms keep a free ring)
  blk.set(map); props.length = 0; chands.length = 0; fires.length = 0; nebulas.length = 0; decals.clear(); debris.length = 0; rubble.length = 0;
  const sroom = stairs && rooms.find(r => stairs.x >= r.x && stairs.x < r.x + r.w && stairs.y >= r.y && stairs.y < r.y + r.h);
  const used = [];
  for (const r of rooms) {
    if (r === start || r === sroom) continue;
    const n = Math.min(14, ri(1, Math.max(2, Math.round(r.w * r.h / 50))));
    for (let k = 0; k < n; k++) {
      const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
      if (blk[c] || liq[c] || used.some(u => Math.abs(u[0] - x) < 3 && Math.abs(u[1] - y) < 3)) continue;
      used.push([x, y]); blk[c] = 9;
      props.push({ type: 'crate', x: x + 0.5, y: y + 0.5, hp: 60, open: false, cell: c });
    }
  }
  // Top up crates/chests, then pick the chests and hide the keys in three of them
  for (let t = 0; t < 400 && props.length < (f === 4 ? 14 : 12); t++) {
    const r = rooms[ri(0, rooms.length - 1)];
    if (r === start || r === sroom) continue;
    const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
    if (blk[c] || liq[c] || used.some(u => Math.abs(u[0] - x) < 3 && Math.abs(u[1] - y) < 3)) continue;
    used.push([x, y]); blk[c] = 9;
    props.push({ type: 'crate', x: x + 0.5, y: y + 0.5, hp: 60, open: false, cell: c });
  }
  if (f < 4) {
    const order = props.map((q, i) => i).sort(() => srand() - 0.5);
    const want = Math.min(9, Math.max(3, Math.floor(props.length * 0.6)));
    let nch = 0;
    for (const i of order) if (nch < want) { props[i].type = 'chest'; props[i].hp = 1e9; blk[props[i].cell] = CHEST_CELL; nch++; }
    props.filter(q => q.type === 'chest').sort(() => srand() - 0.5).slice(0, 3).forEach(q => { q.key = true; });
  }
  keys = 0; hinted = false; aim = null; doorAnim = null; readyMsg = false; doorHintT = 0;
  keysNeed = props.filter(q => q.key).length;

  // Scenery: inert, themed, destructible. Solid pieces keep a free ring along the room walls.
  // It draws from its own random stream (so tuning it never reshuffles enemies, pickups or lights), visits the
  // rooms in turn with a per-room cap, and the picker discourages repeats (floor-wide and, harder, within a room).
  const srKeep = sr; sr = 52711 + f * 977;
  const dused = used.slice(), dcount = new Map(), droom = new Map(), dkind = new Array(DECOR[f].length).fill(0);
  let nd = 0;
  const decoTotal = [52, 56, 40, 54, 50][f], capDiv = [12, 12, 8, 12, 20][f], capMax = [8, 5, 7, 10, 48][f];
  const kindCap = Math.ceil(decoTotal / DECOR[f].length);   // no piece more than a few times per floor
  for (let t = 0; t < 4000 && nd < decoTotal; t++) {
    const r = rooms[t % rooms.length];
    if (r === sroom) continue;
    if ((dcount.get(r) || 0) >= Math.max(2, Math.min(capMax, Math.round(r.w * r.h / capDiv)))) continue;
    if (!droom.has(r)) droom.set(r, new Array(DECOR[f].length).fill(0));
    const k = decoPick(f, dkind, droom.get(r), kindCap); if (k < 0) break;
    const D = DECOR[f][k];
    const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
    if (blk[c] || liq[c]) continue;
    if (r === start && Math.hypot(x - start.cx, y - start.cy) < 3.5) continue;
    if (f === 4 && Math.hypot(x + 0.5 - 28.5, y + 0.5 - 23.5) < 3) continue;   // keep the boss spot clear
    // two solid things keep a free cell between them (so they never wall a passage); anything low only needs its own cell
    if (dused.some(u => { const sep = D.solid && u[2] !== false ? 2 : 1; return Math.abs(u[0] - x) < sep && Math.abs(u[1] - y) < sep; })) continue;
    dused.push([x, y, D.solid]); if (D.solid) blk[c] = 9;
    props.push({ type: 'deco', k, mat: D.mat, solid: D.solid, flip: srand() < 0.5, x: x + 0.5, y: y + 0.5, hp: D.hp, h: D.solid ? D.sc : 0.6, cell: c });
    dkind[k]++; droom.get(r)[k]++; dcount.set(r, (dcount.get(r) || 0) + 1); nd++;
  }
  sr = srKeep;
  if (f === 1) {   // second level: explosive barrels scattered around the rooms (own random stream, never next to another solid thing)
    const sk = sr; sr = 91357;
    const perRoom = new Map();
    let nb = 0;
    for (let t = 0; t < 3000 && nb < 16; t++) {
      const r = rooms[t % rooms.length];
      if (r === sroom || (perRoom.get(r) || 0) >= 3) continue;
      const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2), c = y * N + x;
      if (blk[c] || liq[c]) continue;
      if (r === start && Math.hypot(x - start.cx, y - start.cy) < 4) continue;
      if (dused.some(u => Math.abs(u[0] - x) < 2 && Math.abs(u[1] - y) < 2)) continue;
      dused.push([x, y, true]); blk[c] = 9;
      props.push({ type: 'xbarrel', mat: 'metal', x: x + 0.5, y: y + 0.5, hp: 30, max: 30, h: 0.6, cell: c });
      perRoom.set(r, (perRoom.get(r) || 0) + 1); nb++;
    }
    sr = sk;
  }
  {   // every key chest must stay reachable: clear scenery around any chest that got walled in
    const d0 = new Int16Array(N * N); bfs(blk, start.cy * N + start.cx, d0);
    for (const q of props.filter(c2 => c2.key)) {
      const cx = Math.floor(q.x), cy = Math.floor(q.y);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d0[(cy + b) * N + cx + a] < 9999)) continue;
      for (let i = props.length - 1; i >= 0; i--) { const o = props[i]; if (o.type === 'deco' && o.solid && Math.hypot(o.x - q.x, o.y - q.y) < 3) { blk[o.cell] = 0; props.splice(i, 1); } }
    }
  }
  for (const r of rooms) {
    const pts = f === 4 && r.w > 20 ? [[22, 15], [34, 15], [22, 30], [34, 30]] : r.w >= 11 && r.h >= 7 ? [[r.cx - 3, r.cy], [r.cx + 3, r.cy]] : [[r.cx, r.cy]];
    for (const [x, y] of pts) {
      if (map[y * N + x]) continue;
      const cvar = srand() < 0.5 ? 0 : 1;
      chands.push({ x: x + 0.5, y: y + 0.5, v: cvar });
      torches.push({ x: x + 0.5, y: y + 0.5, k: 1.3, f: 0.5, snd: CHSND[f][cvar] });
    }
  }

  // Enemies and pickups on cells reachable from the start
  const dd = new Int16Array(N * N); bfs(blk, start.cy * N + start.cx, dd);
  let cells = [];
  for (let n = 0; n < N * N; n++) if (dd[n] > 10 && dd[n] < 9999) cells.push(n);
  if (cells.length < 30) { cells = []; for (let n = 0; n < N * N; n++) if (dd[n] < 9999) cells.push(n); }
  const pc = () => { const n = cells[Math.floor(srand() * cells.length)]; return [(n % N) + 0.5, Math.floor(n / N) + 0.5]; };
  enemies = []; pickups.length = 0; projectiles = []; explosions = []; blasts.length = 0; fuses.length = 0; shake.t = 0; flashA = 0; if (flashEl) flashEl.style.opacity = 0; canvas.style.transform = ''; eShots.length = 0; strikes.length = 0; beams.length = 0; fxs.length = 0; power.on = true; power.t = 6; power.fl = 0; powerK = 1;
  ensureSprites(f === 4 ? ['skel'] : [ENEMY_OF[f]]);
  if (f === 4) { pairIdx = 0; pairWait = 0; skelT = 8; spawnPair(); }
  else {
    // Spread the enemies out: far from the start (nobody reaches you at once) and never bunched together
    const placed = [];
    for (let i = 0; i < Math.round([50, 60, 70, 65][f] * DIFF.count); i++) {
      let q = null;
      for (const [minD, sp] of [[22, 4], [20, 3.2], [20, 2.6], [20, 2.2], [16, 2]]) {
        for (let t = 0; t < 120 && !q; t++) {
          const n = cells[Math.floor(srand() * cells.length)], x = (n % N) + 0.5, y = Math.floor(n / N) + 0.5;
          if (dd[n] >= minD && !placed.some(p => Math.hypot(p[0] - x, p[1] - y) < sp)) q = [x, y];
        }
        if (q) break;
      }
      if (!q) q = pc();
      placed.push(q); enemies.push(mkEnemy(q[0], q[1], ENEMY_OF[f]));
    }
  }
  (f === 0 ? [1, 1, 2, 2, 3, 4, 5, 7] : f === 4 ? [2, 2, 3, 3, 3, 1, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 5, 6, 7]).forEach(k => { const q = pc(); pickups.push({ kind: k, x: q[0], y: q[1], taken: false }); });
  for (let i = 0; i < (f === 4 ? 8 : 6); i++) { const q = pc(); pickups.push({ kind: 'med', x: q[0], y: q[1], taken: false }); }
  for (let i = 0; i < 4; i++) { const q = pc(); pickups.push({ kind: 'ammo', w: 1 + Math.floor(srand() * 7), x: q[0], y: q[1], taken: false }); }
  const AW = [[0.6, 0.35, 0.05, 0], [0.3, 0.45, 0.2, 0.05], [0.15, 0.35, 0.4, 0.1], [0.05, 0.25, 0.45, 0.25], [0, 0.1, 0.4, 0.5]][f];
  for (let i = 0; i < 1; i++) {   // one wearable armor per floor
    let r = srand(), t = 0; while (t < 3 && r >= AW[t]) { r -= AW[t]; t++; }
    const q = pc(); pickups.push({ kind: 'arm', t, x: q[0], y: q[1], taken: false });
  }

  // Hordes: a few rooms release a stream of enemies out of the tunnels next to them when you step inside
  hordes = [];
  if (f < 4) {
    const inRoom = (x, y) => rooms.some(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
    const tunnelCells = (r) => {   // open cells outside every room, reached from this room's exits (2 to 5 steps into the tunnel)
      const seen = new Set(), out = []; let fr = [];
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || inRoom(x, y) || blk[y * N + x]) continue;
        fr.push([x, y]); seen.add(y * N + x);
      }
      for (let d = 1; d <= 6 && fr.length; d++) {
        const nx = [];
        for (const [x, y] of fr) {
          if (d >= 3) out.push([x + 0.5, y + 0.5]);
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = x + a, Y = y + b;
            if (X < 1 || Y < 1 || X >= N - 1 || Y >= N - 1 || seen.has(Y * N + X) || inRoom(X, Y) || blk[Y * N + X]) continue;
            seen.add(Y * N + X); nx.push([X, Y]);
          }
        }
        fr = nx;
      }
      return out;
    };
    const spaced = (list, max) => { const p = []; for (const c of list) if (p.length < max && !p.some(o => Math.hypot(o[0] - c[0], o[1] - c[1]) < 1.4)) p.push(c); return p; };
    rooms.filter(r => r !== start && r !== sroom && r.w * r.h >= 25 && dd[r.cy * N + r.cx] >= 12 && dd[r.cy * N + r.cx] < 9999)
      .map(r => ({ r, cand: tunnelCells(r) })).filter(o => spaced(o.cand, 99).length >= 5)
      .sort(() => srand() - 0.5).slice(0, [1, 2, 2, 2][f])
      .forEach(o => hordes.push({ r: o.r, cand: o.cand, n: Math.max(4, Math.round([10, 10, 10, 12][f] * DIFF.count)), type: ENEMY_OF[f], fired: false, q: [], tt: 0, snd: false }));
  }

  player.x = start.cx + 0.5; player.y = start.cy + 0.5;
  player.dirX = 1; player.dirY = 0; player.planeX = 0; player.planeY = 0.9; player.pitch = 0;
  startLevelState(prog);
  buildTextures(f); fieldT = 0;
  say('PIANO ' + (prog + 1) + ': ' + FLOOR_NAMES[f]); toastT = 3;
}
