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
   CASTEDDISH - Mondo del piano 1: stanze multipiano, botole e trappole
   Il gioco ragiona su una griglia piatta; le quote (W1.H) e i soffitti (W1.C) sono per cella e li usa solo la grafica 3D.
   Ogni stanza speciale e disegnata con quote di progetto (multipli di 0,25) e, dove serve, parapetti e colonne. Poi una
   regolarizzazione abbassa ogni salto piu alto di un gradino: scale e rampe nascono da sole, si sale e si scende sempre
   a piedi, e i parapetti restano solo dove il dislivello e voluto. Ogni stanza e controllata (i percorsi restano collegati)
   e, se un'idea non regge, viene scartata. Il piano e sempre uguale a ogni partita.
   TIPI DI STANZA (W1.plan li elenca, con le celle piu alte e piu basse, per aggiungere dettagli):
   FOSSA        ballatoio tutt'intorno, parapetto, scalinata larga che scende a -1; e la meta delle botole.
   ANFITEATRO   conca a gradoni concentrici: si entra dal bordo e si scende verso l'arena al centro.
   ZIGGURAT     piramide a gradoni: in cima si domina la sala.
   CATTEDRALE   navata bassa con uno o due ballatoi a quota 1, parapetto verso la navata, colonne e scala a un'estremita.
   TERRAZZA     mezza sala rialzata a quota 1 con parapetto e scalinata monumentale a un lato.
   CRIPTA       sala sprofondata a -0,5 (si scende dal corridoio) con un basamento a gradini al centro.
   TRAPPOLE nei corridoi: tratto di spuntoni sincronizzati (si passa a tempo) e feritoia in fondo che spara lungo il tratto.
   BOTOLE nelle stanze: cadi nella fossa.
   ====================================================================== */
const W1 = { map: null, ver: 0, H: new Float32Array(NMAX * NMAX), C: new Float32Array(NMAX * NMAX).fill(1), rail: new Uint8Array(NMAX * NMAX), rails: [], spikes: [], doors: [], shooters: [], darts: [], fall: 0, camH: 0, t: 0, cellar: null, cellars: [], plan: [], dead: false, dm: [] };
const world1H = (x, y) => (x >= 0 && y >= 0 && x < N && y < N) ? W1.H[(y | 0) * N + (x | 0)] : 0;          // altezza del pavimento
const world1C = (x, y) => (x >= 0 && y >= 0 && x < N && y < N) ? W1.C[(y | 0) * N + (x | 0)] : 1;          // altezza del soffitto
const world1Hn = (x, y) => { let m = world1H(x, y); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m = Math.max(m, world1H(x + a, y + b)); return m; };

function world1Ensure() { if (W1.map !== map) world1Carve(); }   // di norma e gia stata chiamata da loadFloor()

function world1Carve(f) {
  W1.map = map; W1.ver++;
  const H = W1.H.fill(0), C = W1.C.fill(1); W1.rail.fill(0);
  W1.rails.length = W1.spikes.length = W1.doors.length = W1.shooters.length = W1.darts.length = 0; W1.fall = 0; W1.camH = 0; W1.cellar = null; W1.cellars = []; W1.plan.length = 0;
  if ((f !== undefined ? f : curFloor) !== 0 || rooms.length < 5) return;
  let sd = 20261112; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const idx = (x, y) => y * N + x, open = i => map[i] === 0, area = r => r.w * r.h;
  const inRect = (r, x, y) => !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const start = rooms[0], sroom = stairs && rooms.find(r => inRect(r, stairs.x, stairs.y));
  const cand = rooms.filter(r => r !== start && r !== sroom).sort((a, b) => area(b) - area(a));
  // =================== STANZE MULTIPIANO ===================
  const S = 0.25, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const T = new Float32Array(N * N), CR = new Float32Array(N * N), R0 = new Uint8Array(N * N);   // T: quota di progetto (0 = piano terra); CR: soffitto di progetto (0 = normale)
  const map0 = map.slice(), blk0 = blk.slice();   // copia per tornare al piano piatto se qualcosa va storto
  let undo = [];
  const cellars = [];
  const feats = [];
  const flood = (seen) => { const q = [start.cy * N + start.cx]; seen[q[0]] = 1; for (let h = 0; h < q.length; h++) { const i = q[h]; for (const d of [1, -1, N, -N]) { const j = i + d; if (!seen[j] && map[j] === 0) { seen[j] = 1; q.push(j); } } } };
  flood(R0);   // le celle raggiungibili dalla partenza prima di qualsiasi modifica: devono restarlo tutte
  const connected = () => { const sn = new Uint8Array(N * N); flood(sn); for (let i = 0; i < N * N; i++) if (R0[i] && map[i] === 0 && !sn[i]) return false; return true; };
  const tset = (i, v) => { undo.push([0, i, T[i]]); T[i] = v; };
  const cset = (i, v) => { undo.push([1, i, CR[i]]); CR[i] = v; };
  const solid = (i, isRail) => { undo.push([2, i, map[i], blk[i], W1.rail[i]]); map[i] = 2; blk[i] = 2; W1.rail[i] = isRail ? 1 : 0; };   // parapetto (basso) o colonna (alta): per fisica, colpi e nemici sono muri
  const rollbackTo = (m) => { while (undo.length > m) { const e = undo.pop(); if (e[0] === 0) T[e[1]] = e[2]; else if (e[0] === 1) CR[e[1]] = e[2]; else { map[e[1]] = e[2]; blk[e[1]] = e[3]; W1.rail[e[1]] = e[4]; } } };
  const sub = (fn) => { const m = undo.length; let ok = false; try { ok = !!fn() && connected(); } catch (err) { ok = false; } if (!ok) rollbackTo(m); return ok; };
  const attempt = (fn) => { undo = []; const ok = sub(fn); undo = []; return ok; };
  const eachCell = (r, f) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) f(x, y, idx(x, y)); };
  const allOpen = (r) => { let ok = true; eachCell(r, (x, y, i) => { if (map[i] !== 0) ok = false; }); return ok; };
  const cheb = (r, x, y) => Math.min(x - r.x, r.x + r.w - 1 - x, y - r.y, r.y + r.h - 1 - y);   // distanza dal bordo della stanza (0 = giro piu esterno)

  // FOSSA: ballatoio di 1 cella tutt'intorno, parapetto, e dentro la fossa a -1; la scalinata larga scende da un lato corto
  const fossa = (r) => {
    const horiz = r.w >= r.h, A = horiz ? r.w : r.h, B = horiz ? r.h : r.w;
    if (A < 8 || B < 7 || !allOpen(r)) return false;
    const P = (a, b) => horiz ? idx(r.x + a, r.y + b) : idx(r.x + b, r.y + a), ob = (B >> 1) - 1;
    for (let a = 1; a <= A - 2; a++) for (let b = 1; b <= B - 2; b++) {
      const i = P(a, b), edge = a === 1 || a === A - 2 || b === 1 || b === B - 2;
      if (edge) { if (a === 1 && (b === ob || b === ob + 1)) tset(i, -S); else solid(i, true); continue; }   // l'apertura nel parapetto e il primo gradino
      tset(i, a === 2 ? -2 * S : a === 3 ? -3 * S : -1);   // scalinata larga quanto la fossa: -0,5, -0,75, poi il fondo
    }
    eachCell(r, (x, y, i) => cset(i, 3));
    return true;
  };
  // ANFITEATRO: conca a gradoni concentrici fino a -0,75
  const anfiteatro = (r) => {
    const m = Math.min(r.w, r.h); if (m < 7 || !allOpen(r)) return false;
    const km = Math.min(3, (m - 1) >> 1);
    eachCell(r, (x, y, i) => { tset(i, -S * Math.min(cheb(r, x, y), km)); cset(i, 2.8); });
    return true;
  };
  // ZIGGURAT: piramide a gradoni fino a +0,75
  const ziggurat = (r) => {
    const m = Math.min(r.w, r.h); if (m < 6 || !allOpen(r)) return false;
    const km = Math.min(3, (m - 1) >> 1);
    eachCell(r, (x, y, i) => { tset(i, S * Math.min(cheb(r, x, y), km)); cset(i, 3.2); });
    return true;
  };
  // CRIPTA: tutta la sala a -0,5 (il dislivello si scende nel corridoio), con un basamento a gradini al centro
  const cripta = (r) => {
    const m = Math.min(r.w, r.h); if (m < 6 || !allOpen(r)) return false;
    eachCell(r, (x, y, i) => { tset(i, -0.5); cset(i, 2.4); });
    if (m >= 7) for (let y = r.cy - 1; y <= r.cy + 1; y++) for (let x = r.cx - 1; x <= r.cx + 1; x++) tset(idx(x, y), 0);
    return true;
  };
  // Ballatoio lungo un lato: u corre lungo il lato, v va dal muro verso la sala (d righe: d-1 di pavimento e l'ultima di parapetto)
  const wp = (r, side, flip, L, u, v) => { const uu = flip ? L - 1 - u : u; return side === 'N' ? [r.x + uu, r.y + v] : side === 'S' ? [r.x + uu, r.y + r.h - 1 - v] : side === 'W' ? [r.x + v, r.y + uu] : [r.x + r.w - 1 - v, r.y + uu]; };
  const ballatoio = (r, side, flip, d, pil) => {
    const horiz = side === 'N' || side === 'S', L = horiz ? r.w : r.h, cross = horiz ? r.h : r.w, top = L >= 8 ? 1 : 0.75;
    if (cross < d + 2) return false;   // la navata deve restare larga almeno 2
    for (let u = 0; u < L; u++) for (let v = 0; v < d; v++) { const [x, y] = wp(r, side, flip, L, u, v); if (map[idx(x, y)] !== 0) return false; }
    for (let u = 0; u < L; u++) for (let v = 0; v < d - 1; v++) {   // nessun corridoio deve sbucare sul ballatoio: sarebbe un salto nel vuoto
      const [x, y] = wp(r, side, flip, L, u, v);
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (!inRect(r, nx, ny) && map[idx(nx, ny)] === 0) return false; }
    }
    for (let u = 0; u < L; u++) for (let v = 0; v < d - 1; v++) { const [x, y] = wp(r, side, flip, L, u, v); tset(idx(x, y), u === 0 ? 0 : Math.min(top, S * u)); }   // u=0: pianerottolo; poi 4 gradini lungo il lato
    for (let u = 1; u < L; u++) { const [x, y] = wp(r, side, flip, L, u, d - 1); solid(idx(x, y), !(pil && u >= 4 && u <= L - 2 && (u - 4) % 3 === 0)); }   // parapetto verso la sala, con colonne ogni 3 celle
    return true;
  };
  // CATTEDRALE: navata con un ballatoio per lato lungo (scale a estremita opposte) o, se non c'e posto, con uno solo
  const cattedrale = (r) => {
    const horiz = r.w >= r.h, L = horiz ? r.w : r.h, cross = horiz ? r.h : r.w;
    if (L < 8 || cross < 6 || !allOpen(r)) return false;
    const sA = horiz ? 'N' : 'W', sB = horiz ? 'S' : 'E';
    if (!(cross >= 9 && sub(() => ballatoio(r, sA, 0, 3, true) && ballatoio(r, sB, 1, 3, true)))) {
      let ok = false;
      for (const [sd, fl] of [[sA, 0], [sB, 1], [sA, 1], [sB, 0]]) if (!ok) ok = sub(() => ballatoio(r, sd, fl, 3, true));
      if (!ok) return false;
    }
    eachCell(r, (x, y, i) => cset(i, 3.4));
    return true;
  };
  // TERRAZZA: una larga fascia rialzata lungo un lato lungo, con parapetto e scalinata monumentale a un'estremita
  const terrazza = (r) => {
    const horiz = r.w >= r.h, L = horiz ? r.w : r.h, cross = horiz ? r.h : r.w;
    if (L < 7 || cross < 6 || !allOpen(r)) return false;
    const d = Math.min(6, Math.max(4, cross - 3));
    for (const [sd, fl] of (horiz ? [['N', 0], ['S', 1], ['N', 1], ['S', 0]] : [['W', 0], ['E', 1], ['W', 1], ['E', 0]]))
      if (sub(() => ballatoio(r, sd, fl, d, false))) { eachCell(r, (x, y, i) => cset(i, 3.2)); return true; }
    return false;
  };

  try {
    // 1) le fosse (4 su un piano grande, x4 come tutto il resto) nelle stanze adatte piu grandi: sono la meta delle botole
    for (const r of cand) {
      if (cellars.length >= L1X) break;
      if (!(Math.max(r.w, r.h) >= 8 && Math.min(r.w, r.h) >= 7 && !(r.w > 8 && r.h > 8))) continue;
      if (attempt(() => fossa(r))) { cellars.push(r); feats.push({ kind: 'fossa', room: r }); }
    }
    // 2) le altre stanze, dalla piu grande: i tipi si alternano e ognuno ha un tetto, cosi il livello varia; qualche sala resta piana per far respirare
    const fk = { cattedrale, anfiteatro, ziggurat, terrazza, cripta }, fo = ['cattedrale', 'anfiteatro', 'ziggurat', 'terrazza', 'cripta'], fcap = { cattedrale: 3 * L1X, anfiteatro: 2 * L1X, ziggurat: 3 * L1X, terrazza: 2 * L1X, cripta: 3 * L1X }, fused = {};
    let k0 = 0;
    for (const r of cand) {
      if (cellars.includes(r) || rnd() < 0.25) continue;
      for (let j = 0; j < fo.length; j++) {
        const kind = fo[(k0 + j) % fo.length]; if ((fused[kind] || 0) >= fcap[kind]) continue;
        if (attempt(() => fk[kind](r))) { fused[kind] = (fused[kind] || 0) + 1; feats.push({ kind, room: r }); k0 = (k0 + j + 1) % fo.length; break; }
      }
    }
    // 3) regolarizzazione: la quota di ogni cella non puo superare quella di una vicina di piu di un gradino (i parapetti separano e non contano)
    for (let i = 0; i < N * N; i++) H[i] = map[i] === 0 ? T[i] : 0;
    for (let it = 0, ch = true; ch && it < 400; it++) {
      ch = false;
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
        const i = y * N + x; if (map[i] !== 0) continue;
        let v = H[i];
        if (map[i - 1] === 0 && H[i - 1] + S < v) v = H[i - 1] + S;
        if (map[i + 1] === 0 && H[i + 1] + S < v) v = H[i + 1] + S;
        if (map[i - N] === 0 && H[i - N] + S < v) v = H[i - N] + S;
        if (map[i + N] === 0 && H[i + N] + S < v) v = H[i + N] + S;
        if (v < H[i]) { H[i] = v; ch = true; }
      }
    }
    // 4) i parapetti stanno sul lato alto; il soffitto segue il progetto e non scende mai sotto quota + 1,3
    for (let i = 0; i < N * N; i++) if (W1.rail[i]) {
      let m = -9; for (const d of [1, -1, N, -N]) if (map[i + d] === 0) m = Math.max(m, H[i + d]);
      H[i] = m > -9 ? m : 0; W1.rails.push({ x: i % N, y: (i / N) | 0, i });
    }
    for (let i = 0; i < N * N; i++) if (map[i] === 0 || W1.rail[i]) C[i] = Math.max(CR[i] > 0 ? CR[i] : 1, H[i] + 1.3);
    // 5) elenco dei luoghi (per le prossime richieste: dettagli, nemici, bottino...): celle piu alte e piu basse di ogni sala
    const FN = { fossa: 'FOSSA', anfiteatro: 'ANFITEATRO', ziggurat: 'ZIGGURAT', cattedrale: 'CATTEDRALE', terrazza: 'TERRAZZA', cripta: 'CRIPTA' };
    for (const f of feats) {
      let mn = 9, mx = -9; const hi = [], lo = [];
      eachCell(f.room, (x, y, i) => { if (map[i] === 0) { mn = Math.min(mn, H[i]); mx = Math.max(mx, H[i]); } });
      eachCell(f.room, (x, y, i) => { if (map[i] === 0) { if (H[i] === mx) hi.push(i); if (H[i] === mn) lo.push(i); } });
      W1.plan.push({ kind: f.kind, name: FN[f.kind], room: f.room, minH: mn, maxH: mx, hi, lo });
    }
    W1.cellars = cellars; W1.cellar = cellars[0] || null;
  } catch (err) {   // qualsiasi imprevisto: torna il piano piatto di prima, il gioco parte comunque
    console.error('Stanze multipiano disattivate:', err);
    map.set(map0); blk.set(blk0); W1.rail.fill(0); W1.rails.length = 0; W1.plan.length = 0; W1.cellar = null; W1.cellars = []; H.fill(0); C.fill(1);
  }

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
    if (picked.length >= 5 * L1X) break;
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
    const skip = new Set([start, sroom, ...W1.cellars]);
    for (const r of rooms.filter(q => !skip.has(q)).sort((a, b) => area(b) - area(a))) {
      if (W1.doors.length >= 5 * L1X) break;
      for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2]]) {
        const x = r.cx + ox, y = r.cy + oy, i = idx(x, y);
        if (x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1 && open(i) && !blk[i] && H[i] === 0) { W1.doors.push({ x: x + 0.5, y: y + 0.5, s: 0, t: 0, a: 0 }); break; }
      }
    }
  }
}

function w1Fall() {   // caduta nella fossa piu vicina
  const list = (W1.cellars.length ? W1.cellars : [W1.cellar]).filter(Boolean).sort((a, b) => Math.hypot(a.cx - player.x, a.cy - player.y) - Math.hypot(b.cx - player.x, b.cy - player.y));
  let best = null;
  for (const c of list) {
    for (let r = 0; r < 7 && !best; r++) for (let j = -r; j <= r && !best; j++) for (let i = -r; i <= r; i++) {
      const x = c.cx + i, y = c.cy + j, n = y * N + x;
      if (map[n] === 0 && !blk[n] && W1.H[n] < -0.9) { best = [x, y]; break; }
    }
    if (best) break;
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
  const coneG = new THREE.ConeGeometry(0.045, 0.32, 6), coneM = M(0xb8bcc4);   // condivisi da tutte le punte
  for (const s of W1.spikes) {   // piastra con 9 punte
    B(0.9, 0.03, 0.9, M(0x2a2a2e), s.x, 0.015, s.y); s.tips = [];
    for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(coneG, coneM); t.position.set(s.x - 0.3 + (i % 3) * 0.3, 0.03, s.y - 0.3 + ((i / 3) | 0) * 0.3); g.add(t); s.tips.push(t); }
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
const T3 = { on: false, failed: false, sig: '', stamp: 0, mobs: new Map(), prj: new Map(), eprj: new Map(), pick: new Map(), prop: new Map(), icons: new Map(), bars: new Map(), chd: [], deb: new Map(), shards: [], puffs: [], rubs: [] };

const T3CFG = { ambient: 0.135, hand: 1.3, handDist: 6.5, torch: 1.25, torchDist: 8, fog: 0.22 };   // luminosita: alza o abbassa questi numeri
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

// =====================================================================================================================
// PARETI HORROR (piano 1)
// Pietra sporca, umida, marcia: ogni parete e una base di blocchi con sporco continuo e, sopra, un segno morbido
// (fumo, muffa, sangue che trasuda, graffi di artiglio, scritte ossessive, strisciate di mani, carne che spunta dalle
// fughe, crepe incandescenti, ombre di figure). I segni sono sfumati e si dissolvono verso i bordi della cella, cosi
// tra una parete e l'altra non ci sono stacchi netti. Ogni stanza ha un tema (sudario, macello, presenze, carne...),
// con bassorilievi dal rilievo vero (bump map) e, sui muri, elementi 3D: corpi avvolti appesi, capelli che escono
// dalle fessure, braccia smunte, ganci, catene, punte arrugginite, vene con pustole, costole.
// E solo estetica: la griglia di gioco non cambia. Se qualcosa va storto, t3Build torna ai muri di prima.
// =====================================================================================================================
const HW = { base: null, mats: new Map(), panels: {}, flame: null, soot: null, pulse: [], grp: null, key: '', lvl: null, winC: {}, ready: false };
const HW_FAMS = { ruin: 2, damp: 2, bleed: 2, claws: 3, scrawl: 2, drag: 2, flesh: 2, cracks: 2, shadow: 2 };   // famiglie di segni e numero di varianti
const HW_PLAN = { cripta: 0, fossa: 4, cattedrale: 2, anfiteatro: 1, ziggurat: 6, terrazza: 7 };   // stanze speciali: tema fisso
// Temi di stanza: segni sulle pareti, elementi 3D e bassorilievo (indice di HW_DESIGN). Pesi relativi.
const HW_THEME = [
  { fam: [['shadow', 14], ['ruin', 24], ['damp', 26], ['clean', 20], ['scrawl', 8], ['bleed', 8]], deco: [['bundle', 30], ['hook', 10], ['chain', 20], ['hair', 25], ['ribs', 5], ['hand', 10]], relief: 2 },   // 0 sudario
  { fam: [['bleed', 34], ['drag', 20], ['claws', 12], ['ruin', 14], ['clean', 20]], deco: [['hook', 32], ['chain', 26], ['bundle', 16], ['hand', 8], ['spikes', 8], ['vein', 10]], relief: 3 },   // 1 macello
  { fam: [['shadow', 26], ['scrawl', 22], ['ruin', 22], ['clean', 20], ['cracks', 10]], deco: [['hair', 32], ['hand', 28], ['chain', 14], ['bundle', 14], ['ribs', 6], ['vein', 6]], relief: 6 },   // 2 presenze
  { fam: [['flesh', 42], ['bleed', 16], ['damp', 14], ['clean', 16], ['ruin', 12]], deco: [['vein', 42], ['ribs', 16], ['hair', 16], ['hand', 12], ['bundle', 8], ['hook', 6]], relief: 7 },   // 3 carne
  { fam: [['claws', 34], ['drag', 20], ['scrawl', 16], ['ruin', 14], ['clean', 16]], deco: [['hand', 46], ['chain', 20], ['hair', 12], ['hook', 10], ['spikes', 6], ['bundle', 6]], relief: 1 },   // 4 supplici
  { fam: [['damp', 44], ['flesh', 16], ['ruin', 16], ['clean', 16], ['bleed', 8]], deco: [['vein', 34], ['hair', 30], ['ribs', 12], ['bundle', 12], ['hand', 12]], relief: 0 },   // 5 marcio
  { fam: [['cracks', 36], ['ruin', 30], ['shadow', 10], ['clean', 24]], deco: [['chain', 34], ['hook', 24], ['spikes', 24], ['bundle', 10], ['hand', 8]], relief: 5 },   // 6 fornace
  { fam: [['scrawl', 34], ['claws', 22], ['drag', 10], ['ruin', 14], ['clean', 20]], deco: [['hand', 30], ['chain', 28], ['hair', 20], ['hook', 10], ['bundle', 12]], relief: 4 }   // 7 isolamento
];
const HW_GEN = [['clean', 40], ['ruin', 18], ['damp', 12], ['bleed', 7], ['claws', 8], ['scrawl', 4], ['drag', 4], ['flesh', 3], ['cracks', 2], ['shadow', 2]];   // corridoi e stanze senza tema
const HW_GENDECO = [['hair', 22], ['chain', 22], ['hook', 14], ['hand', 14], ['vein', 10], ['bundle', 8], ['spikes', 6], ['ribs', 4]];

const hwRng = (s) => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hwHash = (x, y, k) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const hwPickW = (tab, q) => { let s = 0; for (const e of tab) s += e[1]; let r = q * s; for (const e of tab) { r -= e[1]; if (r <= 0) return e[0]; } return tab[0][0]; };
const hwSs = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hwCv = (w, h) => { const c = document.createElement('canvas'); c.width = w || TS; c.height = h || w || TS; return [c, c.getContext('2d')]; };
const hwRgb = (b, v) => 'rgb(' + (Math.max(0, Math.min(255, b[0] + v)) | 0) + ',' + (Math.max(0, Math.min(255, b[1] + v)) | 0) + ',' + (Math.max(0, Math.min(255, b[2] + v)) | 0) + ')';
function hwTex(c) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }   // filtro lineare: niente pixel squadrati
function hwGrain(g, R, amt) { const im = g.getImageData(0, 0, TS, TS), d = im.data; for (let i = 0; i < d.length; i += 4) { const v = (R() - 0.5) * amt; d[i] += v; d[i + 1] += v; d[i + 2] += v; } g.putImageData(im, 0, 0); }
function hwStroke(g, ps, col, w) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; for (const p of ps) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.stroke(); } }
function hwWin(m) {   // finestra: 0 sul bordo della cella, 1 dentro (i segni si dissolvono verso i bordi)
  let w = HW.winC[m];
  if (!w) { w = new Float32Array(TS * TS); for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) w[y * TS + x] = hwSs(0, m, Math.min(x, y, TS - 1 - x, TS - 1 - y)); HW.winC[m] = w; }
  return w;
}
function hwNoise(R, cx, cy, S) {   // rumore a valori che si ripete senza stacchi, cx x cy celle
  S = S || TS; const g = new Float32Array(cx * cy), out = new Float32Array(S * S);
  for (let i = 0; i < g.length; i++) g[i] = R();
  for (let y = 0; y < S; y++) {
    const fy = y / S * cy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = y0 % cy, yb = (y0 + 1) % cy;
    for (let x = 0; x < S; x++) {
      const fx = x / S * cx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % cx, xb = (x0 + 1) % cx;
      const a = g[ya * cx + xa], b = g[ya * cx + xb], c = g[yb * cx + xa], d = g[yb * cx + xb];
      out[y * S + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}
function hwFbm(R, S, cells) {   // tre ottave: macchie grandi con dettaglio
  const o1 = hwNoise(R, cells, cells, S), o2 = hwNoise(R, cells * 2, cells * 2, S), o3 = hwNoise(R, cells * 4, cells * 4, S), out = new Float32Array(S * S);
  for (let i = 0; i < out.length; i++) out[i] = o1[i] * 0.55 + o2[i] * 0.3 + o3[i] * 0.15;
  return out;
}
function hwBox1(s, d, r, horiz) {   // sfumatura a scatola su una riga/colonna, bordi che si richiudono
  const w = 2 * r + 1;
  for (let l = 0; l < TS; l++) {
    const base = horiz ? l * TS : l, st = horiz ? 1 : TS; let acc = 0;
    for (let k = -r; k <= r; k++) acc += s[base + (((k % TS) + TS) % TS) * st];
    for (let k = 0; k < TS; k++) { d[base + k * st] = acc / w; acc += s[base + ((k + r + 1) % TS) * st] - s[base + ((((k - r) % TS) + TS) % TS) * st]; }
  }
}
function hwBlurLayer(g, rad, passes) {   // sfuma un livello (canali premoltiplicati) senza sporcare i bordi
  const im = g.getImageData(0, 0, TS, TS), d = im.data, n = TS * TS, ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)], tmp = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; ch[0][i] = d[i * 4] * a; ch[1][i] = d[i * 4 + 1] * a; ch[2][i] = d[i * 4 + 2] * a; ch[3][i] = a; }
  for (const c of ch) for (let p = 0; p < (passes || 2); p++) { hwBox1(c, tmp, rad, true); hwBox1(tmp, c, rad, false); }
  for (let i = 0; i < n; i++) { const a = ch[3][i]; d[i * 4 + 3] = a * 255; if (a > 0.002) { d[i * 4] = ch[0][i] / a; d[i * 4 + 1] = ch[1][i] / a; d[i * 4 + 2] = ch[2][i] / a; } }
  g.putImageData(im, 0, 0);
}
function hwTint(g, M, col, amax) {   // stende un colore dove la maschera e alta, con passaggio graduale
  const im = g.getImageData(0, 0, TS, TS), d = im.data;
  for (let i = 0; i < TS * TS; i++) { const a = Math.max(0, Math.min(1, M[i])) * amax; if (a <= 0.003) continue; const k = i * 4; d[k] += (col[0] - d[k]) * a; d[k + 1] += (col[1] - d[k + 1]) * a; d[k + 2] += (col[2] - d[k + 2]) * a; }
  g.putImageData(im, 0, 0);
}
function hwFeature(g, o, fn) {   // disegna su un livello trasparente, lo sfuma, lo dissolve verso i bordi della cella e lo stende sulla parete
  const cv = hwCv(), L = cv[1]; fn(L);
  if (o.blur) hwBlurLayer(L, o.blur, 2);
  const im = L.getImageData(0, 0, TS, TS), d = im.data, W = hwWin(o.margin || 22);
  for (let i = 0; i < TS * TS; i++) d[i * 4 + 3] *= W[i];
  L.putImageData(im, 0, 0);
  g.save(); g.globalAlpha = o.alpha === undefined ? 1 : o.alpha; g.globalCompositeOperation = o.comp || 'source-over'; g.drawImage(cv[0], 0, 0); g.restore();
}

// Crepe (o vene): elenco di spezzate con qualche ramo, tutte dentro la tessera
function hwCracks(R, n, len, turn) {
  const out = [], tr = turn || 1.1;
  for (let i = 0; i < n; i++) {
    let x = 12 + R() * (TS - 24), y = 12 + R() * (TS - 24), a = R() * 6.28;
    const L = len * (0.6 + R() * 0.8), pts = [[x, y]];
    for (let s = 0; s < L; s += 4) {
      a += (R() - 0.5) * tr; x += Math.cos(a) * 4; y += Math.sin(a) * 4;
      if (x < 2 || y < 2 || x > TS - 2 || y > TS - 2) break;
      pts.push([x, y]);
      if (R() < 0.12 && s > 8) {
        let bx = x, by = y, ba = a + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.6); const bp = [[bx, by]], bl = 5 + (R() * 6 | 0);
        for (let q = 0; q < bl; q++) { ba += (R() - 0.5) * tr * 0.8; bx += Math.cos(ba) * 3.5; by += Math.sin(ba) * 3.5; if (bx < 2 || by < 2 || bx > TS - 2 || by > TS - 2) break; bp.push([bx, by]); }
        if (bp.length > 1) out.push(bp);
      }
    }
    if (pts.length > 1) out.push(pts);
  }
  return out;
}
function hwStain(g, R, n, col) {   // aloni scuri che colano dall'alto
  for (let i = 0; i < n; i++) {
    const x = 20 + R() * (TS - 40), y0 = 14 + R() * 40, w = 5 + R() * 11, L = 30 + R() * 50;
    const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - w / 2, y0, w, L);
  }
}
function hwBlocks(g, R, o) {   // blocchi di pietra irregolari che si richiudono sui bordi della tessera
  const rows = [22, 16, 24, 18, 26, 22], k0 = (R() * 6) | 0, rh = rows.slice(k0).concat(rows.slice(0, k0)), ins = o.ins || 1.5;
  let y = 0;
  for (const h of rh) {
    const n = 3 + (R() < 0.5 ? 1 : 0), cuts = [0];
    for (let i = 1; i < n; i++) cuts.push(Math.round((i + (R() - 0.5) * 0.36) * TS / n));
    cuts.push(TS);
    for (let i = 0; i < n; i++) {
      const x = cuts[i], w = cuts[i + 1] - x, v = (R() - 0.5) * (o.v || 34);
      g.fillStyle = hwRgb(o.base, v); g.fillRect(x + ins, y + ins, w - 2 * ins, h - 2 * ins);
      if (R() < 0.75) {   // spigolo scheggiato
        const left = R() < 0.5, top = R() < 0.5, cx = left ? x + ins : x + w - ins, cy = top ? y + ins : y + h - ins, s = 2 + R() * 4.5;
        g.fillStyle = o.mortar; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (left ? s : -s), cy); g.lineTo(cx, cy + (top ? s : -s)); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + ins, y + ins, w - 2 * ins, 2); g.fillRect(x + ins, y + ins, 2, h - 2 * ins);
      g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(x + ins, y + h - ins - 3, w - 2 * ins, 3); g.fillRect(x + w - ins - 3, y + ins, 3, h - 2 * ins);
      for (let q = 0; q < 5; q++) { g.fillStyle = 'rgba(0,0,0,' + (0.12 + R() * 0.2).toFixed(2) + ')'; g.fillRect(x + 3 + R() * (w - 9), y + 3 + R() * (h - 9), 1 + R() * 4, 1 + R() * 2); }
    }
    y += h;
  }
}
function hwBlurF(src, S, r) {   // sfumatura quadrata su un campo di numeri, bordi tenuti
  const tmp = new Float32Array(S * S), out = new Float32Array(S * S), w = 2 * r + 1;
  for (let y = 0; y < S; y++) {
    let acc = 0; for (let k = -r; k <= r; k++) acc += src[y * S + Math.min(S - 1, Math.max(0, k))];
    for (let x = 0; x < S; x++) { tmp[y * S + x] = acc / w; acc += src[y * S + Math.min(S - 1, x + r + 1)] - src[y * S + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < S; x++) {
    let acc = 0; for (let k = -r; k <= r; k++) acc += tmp[Math.min(S - 1, Math.max(0, k)) * S + x];
    for (let y = 0; y < S; y++) { out[y * S + x] = acc / w; acc += tmp[Math.min(S - 1, y + r + 1) * S + x] - tmp[Math.max(0, y - r) * S + x]; }
  }
  return out;
}

// ---------------- base di pietra: tre disposizioni di blocchi con sporco continuo ----------------
function hwBase(k) {
  const R = hwRng(4000 + k * 977), cv = hwCv(), c = cv[0], g = cv[1], MO = '#070504', n = TS * TS;
  g.fillStyle = MO; g.fillRect(0, 0, TS, TS);
  hwBlocks(g, R, { base: [62 + k * 5, 58 + k * 4, 54 + k * 3], mortar: MO, v: 30 });
  const d = g.getImageData(0, 0, TS, TS).data, jm = new Float32Array(n);
  for (let i = 0; i < n; i++) jm[i] = d[i * 4] < 22 ? 1 : 0;   // le fughe, per la carne che ci cresce dentro
  const jw = hwBlurF(jm, TS, 3); for (let i = 0; i < n; i++) jw[i] = Math.min(1, jw[i] * 3);
  hwBlurLayer(g, 1, 1);   // spigoli dei blocchi meno netti
  const n1 = hwFbm(R, TS, 3), n2 = hwNoise(R, 18, 3, TS), n3 = hwFbm(R, TS, 4), m1 = new Float32Array(n), m2 = new Float32Array(n), m3 = new Float32Array(n);
  for (let i = 0; i < n; i++) { m1[i] = hwSs(0.42, 0.85, n1[i]); m2[i] = hwSs(0.6, 0.9, n2[i]); m3[i] = hwSs(0.62, 0.95, n3[i]); }
  hwTint(g, m1, [4, 3, 3], 0.55); hwTint(g, m2, [8, 10, 9], 0.4); hwTint(g, m3, [70, 42, 30], 0.2);   // fumo, colature d'acqua, ruggine e sporco
  hwGrain(g, R, 14);
  return { c, jw };
}

// ---------------- i segni: ognuno morbido, sfumato e dissolto verso i bordi ----------------
function hwScratchLine(L, x, y, ang, len, w, curve) {   // un graffio che si assottiglia alle estremita, con bordo chiaro
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, n = Math.max(4, Math.round(len / 3));
  const pt = (t) => { const o = Math.sin(Math.PI * t) * curve; return [x + ca * len * t + nx * o, y + sa * len * t + ny * o]; };
  L.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) for (let j = 0; j < n; j++) {
    const t0 = j / n, t1 = (j + 1) / n, a = pt(t0), b = pt(t1), tw = 0.3 + 0.7 * Math.sin(Math.PI * (t0 + t1) / 2);
    if (pass === 0) { L.strokeStyle = 'rgba(6,4,3,.82)'; L.lineWidth = w * tw; } else { L.strokeStyle = 'rgba(210,200,178,.28)'; L.lineWidth = Math.max(0.5, w * 0.35 * tw); }
    const o = pass ? 1 : 0; L.beginPath(); L.moveTo(a[0] + o, a[1] + o); L.lineTo(b[0] + o, b[1] + o); L.stroke();
  }
}
function hwFeat(fam, v, kb) {   // ritorna { c: colore, e: emissiva o null }
  const R = hwRng(7000 + fam.charCodeAt(0) * 131 + fam.length * 17 + v * 389 + kb * 53), cv = hwCv(), c = cv[0], g = cv[1], rp = (a, b) => a + R() * (b - a), n = TS * TS;
  g.drawImage(HW.base[kb].c, 0, 0);
  let e = null;
  if (fam === 'ruin') {   // nube di fumo e crepe sottili
    hwFeature(g, { blur: 7, alpha: 0.7, margin: 18 }, L => { for (let i = 0; i < 3; i++) { const x = rp(30, 98), y = rp(30, 98), r = rp(16, 34), gr = L.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gr; L.fillRect(x - r, y - r, r * 2, r * 2); } });
    hwFeature(g, { blur: 1, alpha: 0.85, margin: 16 }, L => hwStroke(L, hwCracks(R, 2 + v * 2, 46, 0.9), 'rgba(0,0,0,.9)', 1.7));
    if (v === 1) hwFeature(g, { blur: 3, alpha: 0.5, margin: 20 }, L => hwStain(L, R, 3, 'rgba(0,0,0,.6)'));
  } else if (fam === 'damp') {   // muffa nera e verdastra, chiazze pallide, salnitro
    const nf = hwFbm(R, TS, 4), nh = hwNoise(R, 40, 40, TS), ns = hwFbm(R, TS, 5), W = hwWin(18), m = new Float32Array(n), sp = new Float32Array(n), sl = new Float32Array(n);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const i = y * TS + x; m[i] = hwSs(0.42 + 0.1 * v, 0.7, nf[i] * (0.55 + 0.9 * (y / TS))) * W[i];
      sp[i] = hwSs(0.78, 0.9, nh[i]) * m[i]; sl[i] = hwSs(0.66, 0.85, ns[i]) * W[i] * (1 - m[i]);
    }
    hwTint(g, m, [10, 26, 14], 0.78); hwTint(g, sp, [150, 168, 118], 0.35); hwTint(g, sl, [150, 148, 132], 0.22);
    hwFeature(g, { blur: 2, alpha: 0.5, margin: 22 }, L => hwStain(L, R, 4, 'rgba(6,16,12,.7)'));
  } else if (fam === 'bleed') {   // sangue che trasuda dalle fughe e cola
    const cnt = 1 + v + (R() < 0.5 ? 1 : 0);
    hwFeature(g, { blur: 6, alpha: 0.55, margin: 20 }, L => { for (let i = 0; i < cnt; i++) { const x = rp(34, 94), y = rp(24, 50), r = rp(14, 26), gr = L.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,10,10,.85)'); gr.addColorStop(1, 'rgba(70,10,10,0)'); L.fillStyle = gr; L.fillRect(x - r, y - r, r * 2, r * 2); } });
    hwFeature(g, { blur: 1, alpha: 0.9, margin: 14 }, L => {
      for (let i = 0; i < cnt; i++) {
        const x = rp(30, 98), y0 = rp(22, 52), len = rp(36, 86), w = rp(2, 5), wob = rp(-8, 8); L.lineCap = 'round';
        for (let j = 0; j < 12; j++) { const t0 = j / 12, t1 = (j + 1) / 12; L.strokeStyle = 'rgba(' + ((74 - t0 * 20) | 0) + ',6,8,' + (0.9 - t0 * 0.35).toFixed(2) + ')'; L.lineWidth = w * (1 - t0 * 0.45); L.beginPath(); L.moveTo(x + wob * t0 * t0, y0 + len * t0); L.lineTo(x + wob * t1 * t1, y0 + len * t1); L.stroke(); }
        L.fillStyle = 'rgba(80,6,8,.9)'; L.beginPath(); L.ellipse(x + wob, y0 + len + 1, w * 0.8, w * 1.2, 0, 0, 7); L.fill();
      }
    });
  } else if (fam === 'claws') {   // graffi di artiglio: gruppi di grandezza e angolo diversi
    const groups = v === 0 ? 2 : v === 1 ? 3 : 1;
    hwFeature(g, { blur: 0.8, alpha: 1, margin: 14 }, L => {
      for (let q = 0; q < groups; q++) {
        const big = v === 2 ? 1.5 : rp(0.5, 1.4), ang = rp(0, Math.PI), cnt = 2 + ((R() * 4) | 0), sp = rp(3.5, 7) * Math.min(1.2, big), cx = rp(40, 88), cy = rp(40, 88), len = rp(30, 78) * big, nx = Math.cos(ang + 1.5708), ny = Math.sin(ang + 1.5708), curve = rp(-5, 5);
        for (let k = 0; k < cnt; k++) {
          const off = (k - (cnt - 1) / 2) * sp, st = rp(-0.15, 0.15) * len, sx = cx + nx * off + Math.cos(ang) * (st - len / 2), sy = cy + ny * off + Math.sin(ang) * (st - len / 2);
          hwScratchLine(L, sx, sy, ang, len * rp(0.75, 1.05), rp(1.6, 3), curve);
        }
      }
    });
  } else if (fam === 'scrawl') {   // conta dei giorni o scritte frenetiche, col sangue
    hwFeature(g, { blur: 1, alpha: 0.9, margin: 16 }, L => {
      L.lineCap = 'round'; L.lineJoin = 'round'; L.strokeStyle = 'rgba(66,6,8,.9)';
      if (v === 0) {
        const rows = 2 + ((R() * 2) | 0);
        for (let r = 0; r < rows; r++) {
          let x = rp(28, 40); const y = 38 + r * 26 + rp(-3, 3);
          for (let gI = 0; gI < 3; gI++) {
            for (let k = 0; k < 4; k++) { L.lineWidth = rp(1.6, 2.6); L.beginPath(); L.moveTo(x + k * 5 + rp(-0.8, 0.8), y + rp(-1.5, 1.5)); L.lineTo(x + k * 5 + rp(-1.5, 1.5), y + 16 + rp(-2, 2)); L.stroke(); }
            L.lineWidth = 2; L.beginPath(); L.moveTo(x - 3, y + 14 + rp(-1, 1)); L.lineTo(x + 19, y + 2 + rp(-1, 1)); L.stroke(); x += 28; if (x > 90) break;
          }
        }
      } else {
        for (let r = 0; r < 4; r++) { let x = rp(26, 34); const y = 34 + r * 20; while (x < 96) { const w = rp(5, 12); L.lineWidth = rp(1.4, 2.6); L.beginPath(); L.moveTo(x, y + rp(-3, 3)); L.bezierCurveTo(x + rp(-4, 8), y - rp(4, 12), x + rp(0, 10), y + rp(4, 12), x + w, y + rp(-5, 5)); L.stroke(); x += w + rp(2, 6); } }
      }
    });
    hwFeature(g, { blur: 1, alpha: 0.6, margin: 18 }, L => { L.lineCap = 'round'; L.strokeStyle = 'rgba(66,6,8,.7)'; for (let i = 0; i < 3; i++) { const x = rp(34, 92), y = rp(48, 80); L.lineWidth = rp(1, 2); L.beginPath(); L.moveTo(x, y); L.lineTo(x + rp(-1.5, 1.5), y + rp(12, 30)); L.stroke(); } });
  } else if (fam === 'drag') {   // una mano insanguinata trascinata lungo il muro
    const th = rp(-0.5, 0.5), sx = rp(48, 80), sy = rp(26, 44), len = rp(40, 80) * (v ? 1.15 : 1), dx = Math.sin(th), dy = Math.cos(th), lx = Math.cos(th), ly = -Math.sin(th);
    hwFeature(g, { blur: 5, alpha: 0.35, margin: 18 }, L => { L.strokeStyle = 'rgba(60,6,8,.7)'; L.lineWidth = 26; L.lineCap = 'round'; L.beginPath(); L.moveTo(sx, sy); L.lineTo(sx + dx * len, sy + dy * len); L.stroke(); });
    hwFeature(g, { blur: 1.5, alpha: 0.9, margin: 14 }, L => {
      L.fillStyle = 'rgba(80,8,10,.85)'; L.beginPath(); L.ellipse(sx, sy, 11, 9, th, 0, 7); L.fill(); L.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const lat = (k - 1.5) * 7.5, fl = len * rp(0.65, 1), x0 = sx + lx * lat, y0 = sy + ly * lat;
        for (let j = 0; j < 10; j++) { L.strokeStyle = 'rgba(78,6,8,' + (0.9 * (1 - j / 10 * 0.8)).toFixed(2) + ')'; L.lineWidth = 4.5 * (1 - j / 10 * 0.4); L.beginPath(); L.moveTo(x0 + dx * fl * j / 10, y0 + dy * fl * j / 10); L.lineTo(x0 + dx * fl * (j + 1) / 10, y0 + dy * fl * (j + 1) / 10); L.stroke(); }
      }
    });
  } else if (fam === 'flesh') {   // carne viva che spunta dalle fughe, con vene
    const nf = hwFbm(R, TS, 5), nw = hwFbm(R, TS, 6), W = hwWin(24), jw = HW.base[kb].jw, m = new Float32Array(n), wet = new Float32Array(n);
    for (let i = 0; i < n; i++) { m[i] = Math.min(1, jw[i] * hwSs(0.3, 0.6, nf[i]) * 1.2) * W[i]; wet[i] = m[i] * hwSs(0.65, 0.8, nw[i]); }
    hwTint(g, m, [100, 16, 26], 0.85); hwTint(g, wet, [210, 110, 110], 0.18);
    hwFeature(g, { blur: 1.4, alpha: 0.7, margin: 18 }, L => { const vs = hwCracks(R, 3 + v, 50, 0.5); hwStroke(L, vs, 'rgba(112,14,24,.9)', 2.4); hwStroke(L, vs, 'rgba(220,110,110,.3)', 0.8); });
  } else if (fam === 'cracks') {   // crepe incandescenti che pulsano (emissiva animata)
    const cr = hwCracks(R, 3 + v, 70, 0.9), ec = hwCv(); e = ec[0]; ec[1].fillStyle = '#000'; ec[1].fillRect(0, 0, TS, TS);
    hwFeature(g, { blur: 1.2, alpha: 0.95, margin: 14 }, L => { hwStroke(L, cr, 'rgba(0,0,0,.9)', 3.2); hwStroke(L, cr, 'rgba(150,34,10,.9)', 1.5); });
    hwFeature(g, { blur: 4, alpha: 0.35, margin: 18 }, L => hwStroke(L, cr, 'rgba(120,20,6,.9)', 7));
    hwFeature(ec[1], { blur: 3, alpha: 0.9, margin: 14, comp: 'lighter' }, L => hwStroke(L, cr, 'rgba(255,70,20,.7)', 5));
    hwFeature(ec[1], { blur: 1, alpha: 1, margin: 14, comp: 'lighter' }, L => hwStroke(L, cr, 'rgb(255,110,40)', 1.8));
  } else {   // ombra: la sagoma di qualcuno impressa sul muro, sfocata
    hwFeature(g, { blur: 4, alpha: 0.78, margin: 14 }, L => {
      L.fillStyle = 'rgba(0,0,0,.95)'; const cx = rp(52, 76);
      if (v === 0) {   // in piedi, fino alle spalle, la testa un po' troppo lunga
        L.beginPath(); L.ellipse(cx, 44, 10, 14, 0, 0, 7); L.fill(); L.fillRect(cx - 4, 54, 8, 14);
        L.beginPath(); L.moveTo(cx - 8, 66); L.quadraticCurveTo(cx - 30, 70, cx - 34, 104); L.lineTo(cx + 34, 104); L.quadraticCurveTo(cx + 30, 70, cx + 8, 66); L.closePath(); L.fill();
      } else {   // alta e magra, con le braccia troppo lunghe
        L.beginPath(); L.ellipse(cx, 30, 7, 11, 0.1, 0, 7); L.fill();
        L.beginPath(); L.moveTo(cx - 5, 40); L.lineTo(cx - 10, 64); L.lineTo(cx - 16, 112); L.lineTo(cx + 16, 112); L.lineTo(cx + 10, 64); L.lineTo(cx + 5, 40); L.closePath(); L.fill();
        L.lineWidth = 4.5; L.lineCap = 'round'; L.strokeStyle = 'rgba(0,0,0,.95)'; L.beginPath(); L.moveTo(cx - 8, 48); L.lineTo(cx - 26, 82); L.lineTo(cx - 30, 120); L.moveTo(cx + 8, 48); L.lineTo(cx + 24, 84); L.lineTo(cx + 32, 122); L.stroke();
      }
    });
  }
  return { c, e };
}
function hwMat(fam, v, kb) {   // materiale creato solo quando serve
  const key = fam + ':' + v + ':' + kb; let m = HW.mats.get(key); if (m) return m;
  let c = HW.base[kb].c, e = null;
  if (fam !== 'clean') { const f = hwFeat(fam, v, kb); c = f.c; e = f.e; }
  m = new THREE.MeshStandardMaterial({ map: hwTex(c), roughness: fam === 'flesh' ? 0.5 : 0.95, emissive: e ? 0xffffff : 0x000000, emissiveMap: e ? hwTex(e) : null, emissiveIntensity: 0.7 });
  if (e) HW.pulse.push(m);
  HW.mats.set(key, m); return m;
}

// ---------------- bassorilievi: campo di altezze con forme morbide (rilievi e incavi), poi illuminato e sporcato ----------------
// A = altezze (base 0,3) o maschera; mode: undefined somma, 'm' porta almeno a base+amp, 'k' maschera al massimo
function hwE(A, S, cx, cy, rx, ry, amp, rot, mode) {   // ellissoide morbido: amp>0 rilievo, amp<0 incavo
  rot = rot || 0; const c = Math.cos(rot), s = Math.sin(rot), R = Math.max(rx, ry) + 1, x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(S - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(S - 1, Math.ceil(cy + R));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, d2 = u * u + v * v; if (d2 >= 1) continue;
    const val = amp * Math.pow(1 - d2, 0.8), k = y * S + x;
    if (mode === 'm') A[k] = Math.max(A[k], 0.3 + val); else if (mode === 'k') A[k] = Math.max(A[k], val); else A[k] += val;
  }
}
function hwC(A, S, x1, y1, x2, y2, r, amp, mode) {   // capsula morbida (dita, arti, pieghe)
  const x0 = Math.max(0, Math.floor(Math.min(x1, x2) - r)), xe = Math.min(S - 1, Math.ceil(Math.max(x1, x2) + r)), y0 = Math.max(0, Math.floor(Math.min(y1, y2) - r)), ye = Math.min(S - 1, Math.ceil(Math.max(y1, y2) + r)), dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
  for (let y = y0; y <= ye; y++) for (let x = x0; x <= xe; x++) {
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2)), d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) / r; if (d >= 1) continue;
    const val = amp * Math.pow(1 - d * d, 0.8), k = y * S + x;
    if (mode === 'm') A[k] = Math.max(A[k], 0.3 + val); else if (mode === 'k') A[k] = Math.max(A[k], val); else A[k] += val;
  }
}
function hwP(A, S, pts, r, amp, mode) { for (let i = 0; i + 1 < pts.length; i++) hwC(A, S, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, amp, mode); }
function hwFrameF(H, S) {   // cornice a rilievo con una gola interna
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.min(x, y, S - 1 - x, S - 1 - y); H[y * S + x] += 0.24 * Math.exp(-Math.pow((d - 14) / 6, 2)) - 0.05 * Math.exp(-Math.pow((d - 26) / 2.5, 2)); }
}
const HW_DESIGN = [
  (H, K, S, R) => {   // 0: un volto che spinge da dietro la pietra, come sotto un telo teso
    hwE(H, S, 128, 124, 62, 86, 0.34, 0, 'm'); hwE(H, S, 128, 72, 50, 30, 0.07, 0);
    for (const s of [-1, 1]) { hwE(H, S, 128 + s * 34, 118, 18, 8, -0.3, s * 0.12); hwE(H, S, 128 + s * 34, 107, 19, 5, 0.07, s * 0.12); hwE(H, S, 128 + s * 48, 150, 16, 12, 0.06, 0); hwE(K, S, 128 + s * 34, 118, 19, 9, 1, s * 0.12, 'k'); hwE(H, S, 128 + s * 8, 162, 5, 4, -0.12, 0); }
    hwC(H, S, 128, 122, 128, 158, 9, 0.14); hwE(H, S, 128, 190, 22, 11, -0.34, 0); hwE(H, S, 128, 178, 22, 6, 0.06, 0); hwE(H, S, 128, 203, 20, 6, 0.07, 0); hwE(K, S, 128, 190, 23, 12, 1, 0, 'k');
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.2832 + 0.2, c = Math.cos(a), s = Math.sin(a); hwC(H, S, 128 + c * 62 * 1.04, 124 + s * 86 * 1.04, 128 + c * 62 * 1.55, 124 + s * 86 * 1.45, 2.6, 0.035); }   // pieghe di tensione
  },
  (H, K, S, R) => {   // 1: mani che premono dall'altra parte del muro
    const hand = (cx, cy, ang, sc, amp) => {
      const fx = Math.sin(ang), fy = -Math.cos(ang), rx = Math.cos(ang), ry = Math.sin(ang), L = [34, 44, 46, 38], O = [-15, -5, 5, 15];
      hwE(H, S, cx, cy, 22 * sc, 26 * sc, amp, ang, 'm');
      for (let k = 0; k < 4; k++) {
        const bx = cx + fx * 18 * sc + rx * O[k] * sc, by = cy + fy * 18 * sc + ry * O[k] * sc;
        hwP(H, S, [[bx, by], [bx + fx * L[k] * 0.55 * sc + rx * O[k] * 0.12 * sc, by + fy * L[k] * 0.55 * sc + ry * O[k] * 0.12 * sc], [bx + fx * L[k] * sc + rx * O[k] * 0.35 * sc, by + fy * L[k] * sc + ry * O[k] * 0.35 * sc]], 6 * sc, amp, 'm');
      }
      hwP(H, S, [[cx - rx * 18 * sc, cy - ry * 18 * sc + 4], [cx - rx * 36 * sc + fx * 12 * sc, cy - ry * 36 * sc + fy * 12 * sc], [cx - rx * 44 * sc + fx * 30 * sc, cy - ry * 44 * sc + fy * 30 * sc]], 6.5 * sc, amp, 'm');
    };
    hand(100, 152, -0.1, 1.15, 0.34); hand(172, 112, 0.28, 0.9, 0.3); hand(160, 206, 0.05, 0.7, 0.26);
  },
  (H, K, S, R) => {   // 2: un corpo avvolto in un sudario, fasciato e macchiato
    hwC(H, S, 128, 70, 128, 222, 30, 0.3, 'm'); hwE(H, S, 128, 56, 24, 28, 0.33, 0, 'm'); hwE(H, S, 128, 92, 46, 18, 0.3, 0, 'm');
    for (let y = 104; y <= 212; y += 14) hwC(H, S, 98, y, 158, y + (R() - 0.5) * 8, 3.2, 0.05);
    for (const y of [86, 168, 206]) hwC(H, S, 96, y, 160, y, 4.5, 0.1);
    hwE(H, S, 121, 54, 6, 4, -0.05, 0); hwE(H, S, 135, 54, 6, 4, -0.05, 0); hwE(H, S, 128, 70, 6, 5, -0.08, 0);
    hwE(K, S, 118, 120, 26, 34, 0.9, 0.1, 'k'); hwC(K, S, 118, 150, 121, 212, 5, 0.8, 'k');
  },
  (H, K, S, R) => {   // 3: una ferita lunga, cucita con grossi punti
    const pts = [], lipL = [], lipR = [];
    for (let y = 34; y <= 222; y += 12) { const x = 128 + Math.sin(y * 0.05) * 8; pts.push([x, y]); lipL.push([x - 21, y]); lipR.push([x + 21, y]); }
    hwP(H, S, pts, 13, -0.34); hwP(H, S, lipL, 10, 0.13); hwP(H, S, lipR, 10, 0.13);
    for (let y = 50; y <= 210; y += 17) { const cx = 128 + Math.sin(y * 0.05) * 8; hwC(H, S, cx - 30, y - 5, cx + 30, y + 5, 3, 0.22, 'm'); hwE(H, S, cx - 32, y - 5, 5, 5, 0.1, 0, 'm'); hwE(H, S, cx + 32, y + 5, 5, 5, 0.1, 0, 'm'); }
    hwP(K, S, pts, 13, 1, 'k'); for (let i = 0; i < 4; i++) { const y = 60 + i * 40, x = 128 + Math.sin(y * 0.05) * 8 + (i % 2 ? 6 : -6); hwC(K, S, x, y, x + 1, y + 30 + R() * 30, 3, 0.9, 'k'); }
  },
  (H, K, S, R) => {   // 4: colonna vertebrale e costole, in rilievo nell'intonaco
    for (let y = 40; y <= 208; y += 24) {
      hwE(H, S, 128, y, 19, 10, 0.3, 0, 'm'); hwE(H, S, 128, y + 12, 16, 3, -0.06, 0);
      if (y <= 160) for (const s of [-1, 1]) hwP(H, S, [[128 + s * 20, y], [128 + s * 58, y + 8], [128 + s * 84, y + 34]], 5.5, 0.22, 'm');
    }
    hwC(K, S, 128, 30, 128, 220, 22, 0.35, 'k');
  },
  (H, K, S, R) => {   // 5: un groviglio di corpi: arti, mani e facce che emergono dalla massa
    for (let i = 0; i < 18; i++) {
      let x = 40 + R() * 176, y = 40 + R() * 176, a = R() * 6.28; const pts = [[x, y]], r = 8 + R() * 2.5, amp = 0.2 + R() * 0.1;
      for (let s = 0; s < 3; s++) { a += (R() - 0.5) * 1.8; x += Math.cos(a) * (34 + R() * 18); y += Math.sin(a) * (34 + R() * 18); pts.push([x, y]); }
      hwP(H, S, pts, r, amp, 'm'); hwE(H, S, x, y, 11, 9, amp, a, 'm');
      for (let f = -1; f <= 1; f++) hwC(H, S, x, y, x + Math.cos(a + f * 0.5) * 18, y + Math.sin(a + f * 0.5) * 18, 3, amp, 'm');
    }
    for (let k = 0; k < 3; k++) { const cx = 70 + R() * 116, cy = 80 + R() * 100, rot = (R() - 0.5) * 0.8; hwE(H, S, cx, cy, 19, 25, 0.3, rot, 'm'); hwE(H, S, cx - 7, cy - 4, 5, 3, -0.2, 0); hwE(H, S, cx + 7, cy - 4, 5, 3, -0.2, 0); hwE(H, S, cx, cy + 11, 6, 5, -0.22, 0); hwE(K, S, cx, cy + 11, 7, 6, 1, 0, 'k'); }
  },
  (H, K, S, R) => {   // 6: figura incappucciata, il volto e un vuoto
    hwE(H, S, 128, 206, 76, 44, 0.28, 0, 'm'); hwC(H, S, 128, 110, 128, 210, 56, 0.3, 'm'); hwE(H, S, 128, 78, 42, 50, 0.34, 0, 'm'); hwE(H, S, 128, 90, 24, 32, -0.42, 0); hwE(K, S, 128, 90, 26, 36, 1, 0, 'k');
    for (const dx of [-40, -24, -8, 8, 24, 40]) hwP(H, S, [[128 + dx * 0.8, 128], [128 + dx * 1.05, 170], [128 + dx * 1.4, 226]], 3.5, 0.05);
    for (const s of [-1, 1]) { hwP(H, S, [[128 + s * 40, 118], [128 + s * 50, 160], [128 + s * 44, 196]], 14, 0.12, 'm'); for (let k = 0; k < 4; k++) hwC(H, S, 128 + s * 44 + (k - 1.5) * 3, 196, 128 + s * 46 + (k - 1.5) * 4, 232, 2.6, 0.14, 'm'); }
  },
  (H, K, S, R) => {   // 7: un'apertura carnosa a pieghe radiali, che affonda nel buio
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x - 128, dy = y - 128, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), k = y * S + x;
      H[k] += 0.22 * Math.pow(Math.max(0, 1 - r / 108), 0.7) - 0.55 * Math.exp(-Math.pow(r / 26, 2)) + 0.07 * Math.sin(16 * a + r * 0.08) * Math.min(1, r / 24) * Math.max(0, 1 - r / 100) + 0.06 * Math.exp(-Math.pow((r - 62) / 6, 2));
      K[k] = Math.max(K[k], Math.exp(-Math.pow(r / 30, 2)), 0.7 * Math.exp(-Math.pow((r - 62) / 8, 2)));
    }
  }
];
function hwPanel(i) {
  if (HW.panels[i]) return HW.panels[i];
  const S = 256, H = new Float32Array(S * S).fill(0.3), K = new Float32Array(S * S), R = hwRng(900 + i * 31);
  HW_DESIGN[i](H, K, S, R); hwFrameF(H, S);
  const h = hwBlurF(hwBlurF(H, S, 1), S, 1), big = hwBlurF(h, S, 8), mk = hwBlurF(K, S, 3), gn = hwFbm(R, S, 6), gs = hwNoise(R, 24, 3, S);
  const cc = hwCv(S, S), cb = hwCv(S, S), ic = cc[1].createImageData(S, S), ib = cb[1].createImageData(S, S), D = ic.data, E = ib.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y * S + x, x1 = Math.min(S - 1, x + 1), x0 = Math.max(0, x - 1), y1 = Math.min(S - 1, y + 1), y0 = Math.max(0, y - 1);
    const dx = h[y * S + x1] - h[y * S + x0], dy = h[y1 * S + x] - h[y0 * S + x], lit = Math.max(-0.5, Math.min(0.5, -(dx + dy) * 3.2)), ao = Math.max(0, Math.min(1, (big[k] - h[k]) * 4)), m = Math.min(1, mk[k] * 1.1);
    const sh = (0.45 + 0.9 * h[k]) * (1 + lit * 1.1) * (1 - 0.5 * ao) * (0.75 + 0.5 * gn[k]) * (1 - 0.35 * hwSs(0.6, 0.9, gs[k]));   // luce da sinistra, ombra negli incavi, sporco e colature
    D[k * 4] = Math.max(0, Math.min(255, (132 * (1 - m) + 62 * m) * sh)); D[k * 4 + 1] = Math.max(0, Math.min(255, (124 * (1 - m) + 10 * m) * sh)); D[k * 4 + 2] = Math.max(0, Math.min(255, (112 * (1 - m) + 12 * m) * sh)); D[k * 4 + 3] = 255;
    const bv = Math.max(0, Math.min(255, h[k] * 255)) | 0; E[k * 4] = E[k * 4 + 1] = E[k * 4 + 2] = bv; E[k * 4 + 3] = 255;
  }
  cc[1].putImageData(ic, 0, 0); cb[1].putImageData(ib, 0, 0);
  return (HW.panels[i] = { map: new THREE.CanvasTexture(cc[0]), bump: new THREE.CanvasTexture(cb[0]), mat: null });
}
function hwPanelMat(i) { const P = hwPanel(i); if (!P.mat) P.mat = new THREE.MeshStandardMaterial({ map: P.map, bumpMap: P.bump, bumpScale: 2.5, roughness: 0.85, metalness: 0 }); return P.mat; }

// ---------------- preparazione, scelta della variante per ogni blocco, costruzione delle pareti ----------------
function hwPrepare() {
  if (HW.ready) return HW;
  HW.base = [0, 1, 2].map(hwBase);
  const tex = [0, 1, 2, 3].map(f => { const cv = hwCv(64, 80); paintFlame(cv[1], 32, 68, 10, 50, f, { sparks: 1 }); return new THREE.CanvasTexture(cv[0]); });   // fiamma delle torce: 4 fotogrammi
  HW.flame = [0, 1, 2, 3].map(gp => ({ mat: new THREE.SpriteMaterial({ map: tex[gp], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), frames: [0, 1, 2, 3].map(i => tex[(i + gp) % 4]) }));   // 4 gruppi sfasati: le torce non battono tutte insieme
  const sc = hwCv(64, 64), gr = sc[1].createRadialGradient(32, 50, 2, 32, 50, 31); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sc[1].fillStyle = gr; sc[1].fillRect(0, 0, 64, 64);
  HW.soot = new THREE.CanvasTexture(sc[0]); HW.ready = true;
  return HW;
}
function hwLevel() {   // per ogni piano: a che stanza appartiene ogni cella e che tema ha ogni stanza
  const roomAt = new Int16Array(N * N).fill(-1);
  rooms.forEach((r, k) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) roomAt[y * N + x] = k; });
  const theme = rooms.map((r, k) => (hwHash(k, 17, 1) * 8) | 0);
  for (const p of W1.plan) { const k = rooms.indexOf(p.room), v = HW_PLAN[p.kind]; if (k >= 0 && v !== undefined) theme[k] = v; }
  HW.lvl = { roomAt, theme };
}
function hwRoomOf(x, y) {   // stanza che il muro (x,y) guarda: -1 per i corridoi
  const L = HW.lvl;
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + d[0], ny = y + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && map[ny * N + nx] === 0) { const r = L.roomAt[ny * N + nx]; if (r >= 0) return r; } }
  return -1;
}
function hwWallMat(t, x, y) {
  let fam = 'clean';
  if (t === 4) fam = hwHash(x, y, 13) < 0.5 ? 'bleed' : 'drag';   // la vecchia nicchia dei teschi diventa una parete che sanguina
  else if (t !== 3) {
    const rid = hwRoomOf(x, y), th = rid >= 0 ? HW.lvl.theme[rid] : -1, tab = th >= 0 && hwHash(x >> 1, y >> 1, 5) < 0.62 ? HW_THEME[th].fam : HW_GEN;
    fam = hwPickW(tab, hwHash(x >> 1, y >> 1, 3));
    if (t === 2 && hwHash(x, y, 7) < 0.35) fam = 'damp';
  }
  const nv = fam === 'clean' ? 1 : HW_FAMS[fam];
  return hwMat(fam, (hwHash(x, y, 9) * nv) | 0, (hwHash(x, y, 11) * 3) | 0);
}
function hwWalls(root, by) {   // un InstancedMesh per ogni materiale usato; la porta delle scale (tipo 5) resta quella di prima
  const g = new THREE.Group(), grp = new Map();
  for (const t in by) {
    if (t === '5') continue;
    const arr = by[t];
    for (let i = 0; i < arr.length; i += 2) { const mat = hwWallMat(+t, arr[i], arr[i + 1]); let l = grp.get(mat); if (!l) grp.set(mat, l = []); l.push(arr[i], arr[i + 1]); }
  }
  for (const e of grp) {
    const mat = e[0], list = e[1], im = new THREE.InstancedMesh(T3.wbox, mat, list.length / 2), m4 = new THREE.Matrix4();
    for (let i = 0; i < list.length; i += 2) { m4.setPosition(list[i] + 0.5, 1, list[i + 1] + 0.5); im.setMatrixAt(i / 2, m4); }
    g.add(im);
  }
  root.add(g);
}

// ---------------- elementi 3D che escono dai muri ----------------
// Coordinate locali: a = lungo il muro (-0,5..0,5), b = altezza assoluta nel mondo, c = in fuori dalla faccia del muro.
// Ogni pezzo e una piccola mesh con colori di vertice (piu scuri vicino al muro); tutto e fuso in pochi blocchi per zona.
const HW_BONE = [0.62, 0.55, 0.42], HW_IRON = [0.17, 0.16, 0.17], HW_DARK = [0.03, 0.02, 0.02], HW_FLESH = [0.42, 0.07, 0.10], HW_VEIN = [0.34, 0.05, 0.11];
const hwTone = (c, R, k) => { const f = 1 - (k || 0.25) * R(); return [c[0] * f, c[1] * f, c[2] * f]; };
function hwPush(M, T, a, b, c, col) {
  const s = 0.5 + 0.5 * Math.min(1, Math.max(0, c) / 0.06);
  M.p.push(T.ox + T.tx * a + T.nx * c, T.oy + b, T.oz + T.tz * a + T.nz * c); M.c.push(col[0] * s, col[1] * s, col[2] * s);
  return M.p.length / 3 - 1;
}
function hwEll(M, T, a, b, c, rx, ry, rz, col, seg) {   // ellissoide
  seg = seg || 8; const ring = Math.max(3, seg >> 1), base = M.p.length / 3;
  for (let i = 0; i <= ring; i++) {
    const ph = Math.PI * i / ring, sy = Math.cos(ph), sr = Math.sin(ph);
    for (let j = 0; j <= seg; j++) { const th = 6.2831853 * j / seg; hwPush(M, T, a + rx * sr * Math.cos(th), b + ry * sy, c + rz * sr * Math.sin(th), col); }
  }
  for (let i = 0; i < ring; i++) for (let j = 0; j < seg; j++) { const p0 = base + i * (seg + 1) + j, p1 = p0 + 1, p2 = p0 + seg + 1, p3 = p2 + 1; M.i.push(p0, p2, p1, p1, p2, p3); }
}
function hwCyl(M, T, A, B, r0, r1, col, seg) {   // cilindro o cono tra due punti locali
  seg = seg || 6;
  const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(d[0], d[1], d[2]) || 1e-6, n = [d[0] / L, d[1] / L, d[2] / L], h = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [n[1] * h[2] - n[2] * h[1], n[2] * h[0] - n[0] * h[2], n[0] * h[1] - n[1] * h[0]]; const ul = Math.hypot(u[0], u[1], u[2]) || 1; u = [u[0] / ul, u[1] / ul, u[2] / ul];
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]], base = M.p.length / 3;
  for (let e = 0; e < 2; e++) {
    const P = e ? B : A, r = e ? r1 : r0;
    for (let j = 0; j <= seg; j++) { const th = 6.2831853 * j / seg, cs = Math.cos(th) * r, sn = Math.sin(th) * r; hwPush(M, T, P[0] + u[0] * cs + v[0] * sn, P[1] + u[1] * cs + v[1] * sn, P[2] + u[2] * cs + v[2] * sn, col); }
  }
  for (let j = 0; j < seg; j++) { const p0 = base + j, p1 = p0 + 1, p2 = p0 + seg + 1, p3 = p2 + 1; M.i.push(p0, p2, p1, p1, p2, p3); }
  for (let e = 0; e < 2; e++) { const P = e ? B : A, ci = hwPush(M, T, P[0], P[1], P[2], col), r0i = base + e * (seg + 1); for (let j = 0; j < seg; j++) M.i.push(ci, r0i + j, r0i + j + 1); }
}
function hwBox(M, T, a, b, c, hx, hy, hz, col) {   // parallelepipedo allineato al muro
  const F = [[1, 3, 7, 5], [0, 4, 6, 2], [2, 6, 7, 3], [0, 1, 5, 4], [4, 5, 7, 6], [0, 2, 3, 1]];
  for (const f of F) { const base = M.p.length / 3; for (const k of f) hwPush(M, T, a + ((k & 1) ? hx : -hx), b + ((k & 2) ? hy : -hy), c + ((k & 4) ? hz : -hz), col); M.i.push(base, base + 1, base + 2, base, base + 2, base + 3); }
}
function hwHair3(M, T, R, a, top, bot) {   // ciocca di capelli neri che pende da una fessura del muro
  const col = [0.05, 0.035, 0.03], n = 7 + ((R() * 6) | 0), fall = Math.min(1, (top - bot) / 0.5 + 0.2);
  hwEll(M, T, a, top, 0.006, 0.05, 0.016, 0.012, [0.01, 0.01, 0.01], 5);
  for (let i = 0; i < n; i++) {
    let x = a + (R() - 0.5) * 0.07, y = top - 0.01, z = 0.012 + R() * 0.012; const len = (0.22 + R() * 0.3) * fall, sw = (R() - 0.5) * 0.05;
    for (let s = 0; s < 6; s++) {
      const t = (s + 1) / 6, nx = x + sw * 0.07 + (R() - 0.5) * 0.008, ny = top - 0.01 - len * t, nz = 0.012 + 0.012 * t + 0.01 * Math.sin(t * 3 + i);
      if (ny < bot) break; hwCyl(M, T, [x, y, z], [nx, ny, nz], 0.0032, 0.0022, col, 3); x = nx; y = ny; z = nz;
    }
  }
}
function hwBundle3(M, T, R, a, top) {   // corpo avvolto in un sudario, appeso a due catene
  const cloth = hwTone([0.5, 0.45, 0.36], R, 0.3), stain = [0.3, 0.12, 0.09], mid = top - 0.42, ch = [0.2, 0.19, 0.2];
  for (const s of [-1, 1]) { hwBox(M, T, a + s * 0.045, top + 0.01, 0.012, 0.015, 0.012, 0.01, HW_IRON); let y = top - 0.005; for (let i = 0; i < 4; i++) { hwBox(M, T, a + s * (0.045 - i * 0.004), y, 0.02 + i * 0.01, i % 2 ? 0.0035 : 0.009, 0.012, i % 2 ? 0.009 : 0.0035, ch); y -= 0.024; } }
  hwEll(M, T, a, mid + 0.02, 0.095, 0.075, 0.27, 0.07, cloth, 8); hwEll(M, T, a, mid - 0.16, 0.097, 0.062, 0.14, 0.06, stain, 7); hwEll(M, T, a, mid + 0.25, 0.1, 0.05, 0.052, 0.05, cloth, 6);
  for (const y of [mid + 0.18, mid + 0.02, mid - 0.14]) hwCyl(M, T, [a, y - 0.008, 0.095], [a, y + 0.008, 0.095], 0.079, 0.079, [0.28, 0.24, 0.18], 8);
  hwCyl(M, T, [a + 0.01, mid - 0.31, 0.1], [a + 0.012, mid - 0.43, 0.1], 0.004, 0.003, [0.3, 0.03, 0.04], 3);
}
function hwSpikes3(M, T, R, a, b) {   // piastra con punte arrugginite, le cime sporche di sangue
  hwBox(M, T, a, b, 0.008, 0.07, 0.03, 0.008, HW_IRON);
  for (let i = 0; i < 5; i++) {
    const x = a - 0.056 + i * 0.028, up = (R() - 0.5) * 0.06, len = 0.1 + R() * 0.05, dx = (R() - 0.5) * 0.02, p0 = [x, b + (R() - 0.5) * 0.02, 0.012], p1 = [x + dx, b + up, 0.012 + len], pm = [p0[0] + (p1[0] - p0[0]) * 0.62, p0[1] + (p1[1] - p0[1]) * 0.62, p0[2] + (p1[2] - p0[2]) * 0.62];
    hwCyl(M, T, p0, pm, 0.012, 0.0065, [0.26, 0.15, 0.1], 5); hwCyl(M, T, pm, p1, 0.0065, 0.001, [0.28, 0.04, 0.05], 5);
  }
}
function hwHand3(M, T, R, a, b) {   // braccio smunto che esce dalla pietra, le dita troppo lunghe
  const sk = hwTone([0.50, 0.46, 0.40], R, 0.3), W = [a + (R() - 0.5) * 0.05, b + 0.04 + R() * 0.06, 0.085], curl = R() < 0.5 ? 1 : -1;
  hwCyl(M, T, [a, b, -0.03], W, 0.014, 0.009, sk, 5); hwEll(M, T, W[0], W[1], W[2], 0.012, 0.012, 0.012, sk, 4); hwBox(M, T, W[0], W[1] + 0.003, W[2] + 0.018, 0.022, 0.01, 0.017, sk);
  for (let i = 0; i < 4; i++) {
    const len = (i === 1 || i === 2) ? 1.25 : 1; let P = [W[0] + (i - 1.5) * 0.013, W[1] + 0.005, W[2] + 0.034];
    for (let s = 0; s < 3; s++) { const q = [P[0] + (R() - 0.5) * 0.004, P[1] + curl * (0.003 + 0.011 * s), P[2] + (0.022 - 0.003 * s) * len]; hwCyl(M, T, P, q, 0.0042, 0.0036, sk, 4); P = q; }
    hwCyl(M, T, P, [P[0], P[1] + curl * 0.012, P[2] + 0.008], 0.0036, 0.0005, [0.18, 0.14, 0.1], 4);
  }
  hwCyl(M, T, [W[0] - 0.022, W[1], W[2] + 0.012], [W[0] - 0.04, W[1] + 0.014, W[2] + 0.044], 0.0052, 0.004, sk, 4);
}
function hwChain3(M, T, R, a, top, n) {   // catena appesa a una staffa, con un polsino in fondo
  hwBox(M, T, a, top + 0.005, 0.012, 0.022, 0.016, 0.012, HW_IRON); hwEll(M, T, a, top - 0.012, 0.03, 0.012, 0.012, 0.012, HW_IRON, 5);
  let y = top - 0.026;
  for (let i = 0; i < n; i++) { const e = i % 2 === 0; hwBox(M, T, a + (R() - 0.5) * 0.004, y, 0.03 + i * 0.002, e ? 0.011 : 0.0035, 0.0165, e ? 0.0035 : 0.011, [0.2, 0.19, 0.2]); y -= 0.027; }
  hwCyl(M, T, [a - 0.03, y, 0.03 + n * 0.002], [a + 0.03, y, 0.03 + n * 0.002], 0.028, 0.028, HW_IRON, 8);
}
function hwHook3(M, T, R, a, b) {   // gancio da macellaio, a volte con un brandello appeso
  const rust = [0.30, 0.17, 0.10];
  hwBox(M, T, a, b, 0.008, 0.026, 0.045, 0.008, HW_IRON);
  hwCyl(M, T, [a, b + 0.01, 0.01], [a, b + 0.01, 0.1], 0.011, 0.009, HW_IRON, 5);
  hwCyl(M, T, [a, b + 0.01, 0.1], [a, b - 0.025, 0.125], 0.009, 0.008, rust, 5);
  hwCyl(M, T, [a, b - 0.025, 0.125], [a, b - 0.075, 0.11], 0.008, 0.0055, rust, 5);
  hwCyl(M, T, [a, b - 0.075, 0.11], [a, b - 0.095, 0.075], 0.0055, 0.0008, rust, 5);
  if (R() < 0.6) hwEll(M, T, a, b - 0.125, 0.1, 0.032, 0.052, 0.03, hwTone(HW_FLESH, R, 0.3), 6);
}
function hwRibs3(M, T, R, a, b) {   // costole annerite che sbucano dal muro come i cerchi di una gabbia
  const bone = hwTone(HW_BONE, R, 0.35), w = 0.26, n = 5;
  for (let i = 0; i < n; i++) {
    const y = b + (i - (n - 1) / 2) * 0.075, a0 = a - w / 2 + (R() - 0.5) * 0.02, dep = 0.12 - Math.abs(i - 2) * 0.015, pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([a0 + w * t, y + Math.sin(t * Math.PI) * 0.012, Math.sin(t * Math.PI) * dep - 0.01]); }
    for (let k = 0; k < 6; k++) hwCyl(M, T, pts[k], pts[k + 1], 0.011, 0.011, bone, 5);
  }
}
function hwVein3(M, T, R, a, b, lo, hi) {   // vena o radice carnosa che striscia sul muro, con qualche pustola
  const col = hwTone(HW_VEIN, R, 0.3), n = 7 + ((R() * 5) | 0); let ang = R() * 6.28, P = [a, b, 0.02];
  for (let i = 0; i < n; i++) {
    ang += (R() - 0.5) * 1.3; const L = 0.055 + R() * 0.03, r = 0.016 * (1 - i / (n + 2)) + 0.004;
    const q = [Math.max(-0.45, Math.min(0.45, P[0] + Math.cos(ang) * L)), P[1] + Math.sin(ang) * L * 0.9, 0.012 + 0.018 * R()];
    if (q[1] < lo || q[1] > hi) { ang = -ang; q[1] = Math.max(lo, Math.min(hi, q[1])); }
    hwCyl(M, T, P, q, r, r * 0.9, col, 5); hwEll(M, T, q[0], q[1], q[2], r * 1.05, r * 1.05, r * 1.05, col, 4);
    if (R() < 0.3) hwEll(M, T, q[0], q[1], q[2] + 0.012, 0.022, 0.022, 0.018, [0.62, 0.36, 0.3], 6);
    P = q;
  }
}
function hwTorch(M, T, R, b0) {   // sostegno di ferro a braccio con torcia e brace (la fiamma e uno sprite a parte)
  const I = HW_IRON;
  hwBox(M, T, 0, b0, 0.008, 0.04, 0.078, 0.008, I);
  for (const p of [[-0.024, 0.052], [0.024, 0.052], [-0.024, -0.052], [0.024, -0.052]]) hwEll(M, T, p[0], b0 + p[1], 0.017, 0.008, 0.008, 0.006, [0.3, 0.29, 0.3], 4);
  hwCyl(M, T, [0, b0 + 0.078, 0.008], [0, b0 + 0.14, 0.008], 0.012, 0.001, I, 4);
  hwCyl(M, T, [0, b0 + 0.005, 0.015], [0, b0 + 0.035, 0.12], 0.012, 0.011, I, 4);
  hwCyl(M, T, [0, b0 - 0.065, 0.012], [0, b0 + 0.012, 0.085], 0.008, 0.008, I, 4);
  hwCyl(M, T, [0, b0 + 0.03, 0.12], [0, b0 + 0.058, 0.12], 0.03, 0.026, I, 7);
  hwCyl(M, T, [0, b0 + 0.02, 0.12], [0, b0 + 0.26, 0.142], 0.015, 0.016, [0.2, 0.12, 0.07], 5);
  hwCyl(M, T, [0, b0 + 0.2, 0.14], [0, b0 + 0.29, 0.15], 0.022, 0.038, [0.1, 0.07, 0.05], 6);
  hwEll(M, T, 0, b0 + 0.295, 0.15, 0.03, 0.02, 0.03, [0.95, 0.45, 0.1], 5);
}
// Metto tutto insieme per l'intero piano; il risultato resta in cache finche non si cambia piano (le ricostruzioni della porta lo riusano).
function hwDecor(root, hw) {
  for (const f of hw.flame) T3.torchMats.push(f);   // le fiamme animate (T3.torchMats si azzera a ogni t3Build)
  const key = W1.ver + '|' + N + '|' + torches.length + '|' + rooms.length;
  if (HW.grp && HW.key === key) { root.add(HW.grp); return; }
  const grp = new THREE.Group(), DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]], occ = new Uint8Array(N * N * 4), chunks = new Map(), panels = [], flames = [], soots = [];
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < N && y < N && (map[y * N + x] === 0 || W1.rail[y * N + x] === 1);
  const chunk = (x, y) => { const k = (x >> 4) + ',' + (y >> 4); let m = chunks.get(k); if (!m) { m = { p: [], c: [], i: [] }; chunks.set(k, m); } return m; };
  const frame = (x, y, d) => ({ ox: x + 0.5 + DIRS[d][0] * 0.5, oy: 0, oz: y + 0.5 + DIRS[d][1] * 0.5, tx: DIRS[d][1], tz: -DIRS[d][0], nx: DIRS[d][0], nz: DIRS[d][1] });   // base locale sulla faccia del muro: a verso destra, c verso la stanza
  for (const s of W1.shooters) { const i = (s.y | 0) * N + (s.x | 0); for (let d = 0; d < 4; d++) occ[i * 4 + d] = 1; }   // le feritoie delle trappole restano libere
  // bassorilievi: in alcune stanze, su uno o due lati
  for (let rid = 0; rid < rooms.length; rid++) {
    const r = rooms[rid]; if (r.w < 5 || r.h < 5 || hwHash(rid, 3, 4) > 0.55) continue;
    const th = hw.lvl.theme[rid], sides = [[r.x + (r.w >> 1), r.y - 1, 2, 1, 0], [r.x + (r.w >> 1), r.y + r.h, 3, 1, 0], [r.x - 1, r.y + (r.h >> 1), 0, 0, 1], [r.x + r.w, r.y + (r.h >> 1), 1, 0, 1]], first = (hwHash(rid, 9, 6) * 4) | 0;
    let got = 0;
    for (let q = 0; q < 4 && got < 2; q++) {
      const s = sides[(first + q) % 4];
      for (const off of [0, 1, -1, 2, -2]) {
        const wx = s[0] + s[3] * off, wy = s[1] + s[4] * off; if (wx < 1 || wy < 1 || wx >= N - 1 || wy >= N - 1) continue;
        const t = map[wy * N + wx];
        if ((t !== 1 && t !== 2) || W1.rail[wy * N + wx] || !isOpen(wx + DIRS[s[2]][0], wy + DIRS[s[2]][1]) || occ[(wy * N + wx) * 4 + s[2]]) continue;
        occ[(wy * N + wx) * 4 + s[2]] = 1; panels.push({ x: wx, y: wy, d: s[2], design: HW_THEME[th].relief }); got++; break;
      }
    }
  }
  const tIdx = new Map(); for (const q of torches) tIdx.set((q.y | 0) * N + (q.x | 0), q);
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x, t = map[i]; if (t === 0 || t === 5 || W1.rail[i]) continue;
    if (t === 3) {   // torcia: scelgo la faccia che guarda la zona piu aperta
      const q = tIdx.get(i); if (!q) continue;
      let bd = -1, bs = -1;
      for (let d = 0; d < 4; d++) { const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (!isOpen(nx, ny)) continue; let s = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (isOpen(nx + a, ny + b)) s++; if (s > bs) { bs = s; bd = d; } }
      if (bd < 0) continue;
      const nx = x + DIRS[bd][0], ny = y + DIRS[bd][1], H0 = W1.H[ny * N + nx], b0 = H0 + 0.4, T = frame(x, y, bd), R = hwRng((x * 73856093 ^ y * 19349663) >>> 0);
      hwTorch(chunk(x, y), T, R, b0); for (let d = 0; d < 4; d++) occ[i * 4 + d] = 1;
      const fx = T.ox + T.nx * 0.15, fz = T.oz + T.nz * 0.15;
      q.lx = fx; q.ly = b0 + 0.4; q.lz = fz;   // la luce della torcia ora sta davanti al muro, sulla fiamma
      flames.push([fx, b0 + 0.31 + 0.1406, fz, (hwHash(x, y, 77) * 4) | 0]);
      soots.push([T.ox + T.nx * 0.004, b0 + 0.36, T.oz + T.nz * 0.004, T.tx, T.tz, T.nx, T.nz]);
      continue;
    }
    const rid = hwRoomOf(x, y), th = rid >= 0 ? hw.lvl.theme[rid] : -1, tab = th >= 0 ? HW_THEME[th].deco : HW_GENDECO, rate = th >= 0 ? 0.12 : 0.06;
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!isOpen(nx, ny) || occ[i * 4 + d] || hwHash(x, y, 20 + d) > rate) continue;
      const ni = ny * N + nx, H0 = W1.H[ni], hgt = W1.C[ni] - H0; if (hgt < 0.9) continue;
      const R = hwRng((x * 73856093 ^ y * 19349663 ^ d * 83492791) >>> 0), kind = hwPickW(tab, hwHash(x, y, 30 + d)), T = frame(x, y, d), m = chunk(x, y), a = (R() - 0.5) * 0.5;
      switch (kind) {
        case 'bundle': hwBundle3(m, T, R, a * 0.5, H0 + Math.min(hgt - 0.1, 1.05)); break;
        case 'hand': hwHand3(m, T, R, a, H0 + 0.25 + R() * Math.min(0.5, hgt - 0.6)); break;
        case 'chain': hwChain3(m, T, R, a, H0 + Math.min(hgt - 0.08, 1.05), 5 + ((R() * 5) | 0)); break;
        case 'hook': hwHook3(m, T, R, a, H0 + 0.5 + R() * 0.3); break;
        case 'ribs': hwRibs3(m, T, R, a * 0.4, H0 + 0.5); break;
        case 'vein': hwVein3(m, T, R, a, H0 + 0.1 + R() * 0.5, H0 + 0.06, H0 + hgt - 0.1); break;
        case 'spikes': hwSpikes3(m, T, R, a * 0.5, H0 + 0.4 + R() * 0.3); break;
        default: hwHair3(m, T, R, a, H0 + Math.min(hgt - 0.06, 1.1), H0 + 0.08);
      }
    }
  }
  const dm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide });
  for (const m of chunks.values()) {
    if (!m.i.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(m.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(m.c, 3)); g.setIndex(m.i); g.computeVertexNormals();
    grp.add(new THREE.Mesh(g, dm));
  }
  const m4 = new THREE.Matrix4(), vx = new THREE.Vector3(), vy = new THREE.Vector3(), vz = new THREE.Vector3(), plane = new THREE.PlaneGeometry(1, 1), byD = {};
  for (const p of panels) (byD[p.design] = byD[p.design] || []).push(p);
  for (const dsg in byD) {   // bassorilievi: un piano per ognuno, con colore e rilievo (bump) dipinti
    const arr = byD[dsg], im = new THREE.InstancedMesh(plane, hwPanelMat(+dsg), arr.length);
    arr.forEach((p, k) => {
      const T = frame(p.x, p.y, p.d), ni = (p.y + DIRS[p.d][1]) * N + (p.x + DIRS[p.d][0]), H0 = W1.H[ni], hgt = W1.C[ni] - H0, s = Math.min(0.92, 0.62 * hgt);
      vx.set(T.tx * s, 0, T.tz * s); vy.set(0, s, 0); vz.set(T.nx, 0, T.nz); m4.makeBasis(vx, vy, vz); m4.setPosition(T.ox + T.nx * 0.008, H0 + Math.min(hgt * 0.5, 0.7), T.oz + T.nz * 0.008); im.setMatrixAt(k, m4);
    });
    grp.add(im);
  }
  if (soots.length) {   // annerimento sopra ogni torcia
    const im = new THREE.InstancedMesh(plane, new THREE.MeshBasicMaterial({ map: hw.soot, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), soots.length);
    soots.forEach((s, k) => { vx.set(s[3] * 0.7, 0, s[4] * 0.7); vy.set(0, 0.9, 0); vz.set(s[5], 0, s[6]); m4.makeBasis(vx, vy, vz); m4.setPosition(s[0], s[1], s[2]); im.setMatrixAt(k, m4); });
    grp.add(im);
  }
  for (const f of flames) { const sp = new THREE.Sprite(hw.flame[f[3]].mat); sp.scale.set(0.3, 0.375, 1); sp.position.set(f[0], f[1], f[2]); grp.add(sp); }
  HW.grp = grp; HW.key = key; root.add(grp);
}

// ---------- il livello: muri, pavimento, soffitto, scale ----------
function t3Build() {
  const sc = T3.scene, P = PAL[0];
  if (T3.root) sc.remove(T3.root);
  const root = T3.root = new THREE.Group(); sc.add(root);
  for (const m of [T3.mobs, T3.prj, T3.eprj, T3.pick, T3.prop, T3.bars, T3.deb]) m.clear();
  T3.shards.length = T3.puffs.length = T3.rubs.length = 0;
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
  let hw = null, hwDone = false;
  try { hw = hwPrepare(); hwLevel(); } catch (err) { hw = null; console.error('Pareti horror non disponibili, uso i muri di prima:', err); }
  T3.wbox = T3.wbox || (() => { const g = t3Box(1, 6, 1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 6); return g; })();   // muro alto 6, texture ripetuta ogni unita
  if (hw) { try { hwWalls(root, by); hwDone = true; } catch (err) { console.error('Pareti horror non disponibili, uso i muri di prima:', err); } }
  for (const t in by) {
    if (hwDone && t !== '5') continue;   // le pareti horror hanno gia preso tutti i tipi di muro tranne la porta delle scale
    const tx = wallTex[t]; if (!tx) continue;
    const arr = Array.isArray(tx), mat = new THREE.MeshStandardMaterial({ map: t3Tex(arr ? tx[0] : tx), roughness: 1 });
    if (arr) T3.torchMats.push({ mat, frames: tx.map(t3Tex) });
    else if (t == 5) T3.doorTex = mat.map;
    const im = new THREE.InstancedMesh(T3.wbox, mat, by[t].length / 2), m4 = new THREE.Matrix4();
    for (let i = 0; i < by[t].length; i += 2) { m4.setPosition(by[t][i] + 0.5, 1, by[t][i + 1] + 0.5); im.setMatrixAt(i / 2, m4); }
    root.add(im);
  }
  if (hwDone) { try { hwDecor(root, hw); } catch (err) { console.error('Decorazioni murali non disponibili:', err); } }   // torce a braccio, bassorilievi, teschi, mani, catene...
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
// =====================================================================================================================
// VARIANTI DEI DEMONI IN 3D: armi in mano (ascia, mazza, tridente, scimitarra, alabarda, fucile, martello, mannaia) e volumi di pelle
// =====================================================================================================================
function t3Blob(rx, ry, rz, sh) {   // massa di pelle (pancia, gobba): ellissoide con la stessa texture del corpo
  const r = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8 - 0.5) * Math.PI, k = Math.cos(a) * 0.98 + 0.02; r.push([0, Math.sin(a) * ry, 0, rx * k, rz * k, sh === undefined ? 0.95 : sh]); }
  return t3Loft(r, 16, { n: 2, vT: 3 });
}

// arma impugnata: origine nel pugno, asse lungo +y; colori dalla variante (o.blade, o.dark, o.handle, o.rust)
function t3Weapon(B, kind, o) {
  const M = o.blade || '#cfd6dd', D = o.dark || '#7e8791', H = o.handle || '#6b4423', ST = 1.7;
  const shaft = (top, bot, r) => B.seg('wood', [0, bot, 0], [0, top, 0], r, r * 0.9, H, 7);
  const half = (y, R, col, mir) => B.cyl('iron', [R, R, 0.014, 10, 0, 3.1416], [0, y, 0], col, { r: [1.5708, 0, 0], s: [(mir ? -1 : 1) * 1.25, 1, 1], b: ST });   // lama a mezzaluna
  const tip = (a, b, r, col) => B.seg('iron', a, b, r, 0.001, col, 5, { b: ST });   // punta conica
  if (kind === 'axe2') {   // ascia bipenne
    shaft(0.52, -0.12, 0.016); half(0.4, 0.115, M); half(0.4, 0.115, M, true); tip([0, 0.5, 0], [0, 0.65, 0], 0.016, D); B.box('iron', [0.045, 0.04, 0.045], [0, 0.4, 0], D); B.box('iron', [0.04, 0.03, 0.04], [0, 0.53, 0], D);
  } else if (kind === 'mace') {   // mazza chiodata
    shaft(0.4, -0.12, 0.017); B.sph('iron', 0.07, [0, 0.48, 0], D, { w: 10, h: 8, b: 1.4 });
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) dirs.push([sx * 0.577, sy * 0.577, sz * 0.577]);
    for (const d of dirs) tip([d[0] * 0.06, 0.48 + d[1] * 0.06, d[2] * 0.06], [d[0] * 0.125, 0.48 + d[1] * 0.125, d[2] * 0.125], 0.015, M);
  } else if (kind === 'trident') {   // tridente
    shaft(0.5, -0.14, 0.014); B.tor('iron', [0.07, 0.012, 5, 12, 3.1416], [0, 0.48, 0], M, { r: [0, 0, 3.1416], b: ST });
    for (const x of [-0.07, 0, 0.07]) { const y0 = x ? 0.48 : 0.44, top = x ? 0.66 : 0.72; B.seg('iron', [x, y0, 0], [x, top - 0.07, 0], 0.011, 0.011, D, 5, { b: 1.3 }); tip([x, top - 0.07, 0], [x, top, 0], 0.022, M); }
  } else if (kind === 'scimitar') {   // scimitarra: lama curva a segmenti che si assottigliano
    B.seg('wood', [0, -0.08, 0], [0, 0.04, 0], 0.016, 0.016, H, 6); B.box('iron', [0.1, 0.016, 0.03], [0, 0.045, 0], D); B.sph('iron', 0.02, [0, -0.09, 0], D, { w: 6, h: 5 });
    let x = 0, y = 0.05, a = 0; for (let i = 0; i < 6; i++) { const L = 0.09, w = 0.05 * (1 - i * 0.11); B.box('iron', [w, L, 0.012], [x + Math.sin(a) * L / 2, y + Math.cos(a) * L / 2, 0], M, { r: [0, 0, -a], b: ST }); x += Math.sin(a) * L; y += Math.cos(a) * L; a += 0.17; }
  } else if (kind === 'halberd') {   // alabarda: lama, punta e uncino
    shaft(0.62, -0.14, 0.016); half(0.5, 0.12, M); B.seg('iron', [0, 0.48, 0], [-0.075, 0.43, 0], 0.014, 0.001, D, 5, { b: 1.3 }); tip([0, 0.6, 0], [0, 0.78, 0], 0.02, M); B.box('iron', [0.04, 0.03, 0.04], [0, 0.6, 0], D);
  } else if (kind === 'shotgun') {   // fucile a pompa: calcio, castello, doppia canna e fusto di legno
    B.box('wood', [0.045, 0.2, 0.06], [0, -0.2, 0], '#5a3a1c'); B.box('iron', [0.06, 0.14, 0.06], [0, -0.04, 0], '#3a3a44', { b: 1.2 }); B.seg('iron', [0, 0.03, 0], [0, 0.52, 0], 0.02, 0.018, '#2a2a32', 8, { b: 1.4 });
    B.box('wood', [0.07, 0.16, 0.075], [0, 0.2, 0], '#6a4a2a'); B.tor('iron', [0.021, 0.004, 4, 8], [0, 0.52, 0], '#4a4a54', { r: [1.5708, 0, 0] }); B.tor('iron', [0.03, 0.004, 4, 8, 3.1416], [0, -0.07, 0.03], '#3a3a44', { r: [0, 1.5708, 0] });
  } else if (kind === 'hammer') {   // martello da guerra
    shaft(0.6, -0.14, 0.02); B.box('iron', [0.24, 0.13, 0.13], [0, 0.56, 0], D, { b: 1.3 }); for (const sx of [-1, 1]) B.box('iron', [0.03, 0.14, 0.14], [sx * 0.125, 0.56, 0], M, { b: ST }); B.box('iron', [0.2, 0.025, 0.14], [0, 0.63, 0], M, { b: ST });
  } else {   // mannaia: lama larga e bucata (con ruggine se la variante lo prevede)
    B.seg('wood', [0, -0.1, 0], [0, 0.04, 0], 0.017, 0.017, H, 6); B.box('iron', [0.08, 0.018, 0.03], [0, 0.048, 0], D); B.box('iron', [0.13, 0.3, 0.014], [0.03, 0.2, 0], M, { b: ST }); B.box('iron', [0.1, 0.05, 0.014], [0.045, 0.375, 0], M, { r: [0, 0, -0.35], b: ST });
    B.cyl('iron', [0.012, 0.012, 0.02, 6], [0.06, 0.3, 0], '#150404', { r: [1.5708, 0, 0], ao: false }); if (o.rust) B.box('flesh', [0.12, 0.07, 0.016], [0.03, 0.14, 0], '#8a5a3a');
  }
}

// =====================================================================================================================
// ASPETTO DISTINTIVO DEI DEMONI: ogni variante ha pelle, ossa e occhi di un altro colore e i suoi ornamenti
// (corna, spuntoni, placche d'osso, bolle, sacche di plasma). I numeri di forma (altezza, larghezza, arti) stanno in VARS.
// =====================================================================================================================
//  skin/keep: tinta della pelle e quanto del colore originale resta (0 = tutta nuova); bone: ossa e corna; glow: crepe incandescenti;
//  eye: colore degli occhi; halo: alone degli occhi
const T3LOOK = [
  { skin: '#e0583c', keep: 0.75, bone: '#e0c4a8', glow: '#ff3010', eye: '#ff5a38', halo: '#ff3a1a' },   // 0 bruto: rosso sangue
  { skin: '#8fb0ea', keep: 0.05, bone: '#e4ecf4', glow: '#40c0ff', eye: '#d8fff0', halo: '#7affd8' },   // 1 lama: grigio-azzurro cinereo
  { skin: '#b080e8', keep: 0.1, bone: '#ece4f4', glow: '#c060ff', eye: '#ffffff', halo: '#fff070' },    // 2 astuto: viola
  { skin: '#9a9288', keep: 0.0, bone: '#a8a090', glow: '#ff7a18', eye: '#ff9040', halo: '#ff7a20' },    // 3 colosso: grigio pietra
  { skin: '#b8d060', keep: 0.05, bone: '#e4ecb4', glow: '#a8e820', eye: '#c8ff40', halo: '#b8ff30' },   // 4 gonfio: giallo-verde malato
  { skin: '#d8d4c0', keep: 0.1, bone: '#f2ecda', glow: '#ffb040', eye: '#ff4040', halo: '#ff2828' },    // 5 cecchino: pallido, occhi rossi
  { skin: '#c08850', keep: 0.3, bone: '#dcc49c', glow: '#ff8040', eye: '#ffb060', halo: '#ffa040' },    // 6 lanciatore: bruno-arancio
  { skin: '#58c0b0', keep: 0.1, bone: '#dcf2e4', glow: '#a050ff', eye: '#ff7058', halo: '#b060ff' }     // 7 sputaplasma: verde acqua con luce viola
];
function t3Tint(m, hex, keep, id) {   // cambia il colore (non solo lo scurisce): tiene il chiaroscuro della texture e ci mette sopra la tinta
  const c = new THREE.Color(hex);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTint = { value: new THREE.Vector3(c.r, c.g, c.b) }; sh.uniforms.uKeep = { value: keep };
    sh.fragmentShader = 'uniform vec3 uTint;\nuniform float uKeep;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  float lum_ = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));\n  diffuseColor.rgb = mix(vec3(lum_) * uTint * 2.4, diffuseColor.rgb, uKeep);');
  };
  m.customProgramCacheKey = () => 'tint' + id;
}
function t3Extras(v) {   // ornamenti 3D di ogni variante: geometrie da attaccare a testa, torace, corpo e avambracci
  const sp = t3Spike, ho = t3Horn, S = [-1, 1], X = { head: [], chest: [], chestSkin: [], bodySkin: [], fore: [], foreBoth: false, sacs: [], eye3: false };
  if (v === 0) {   // BRUTO: corna d'ariete, spuntoni sulle spalle e lungo la schiena
    for (const s of S) { X.head.push({ g: ho(0.5, 0.06, 0.3, 2.3, 0.9), p: [s * 0.075, 0.09, -0.02], s: [s, 1, 1] }); X.chest.push({ g: sp(0.2, 0.045, { bend: 0.25 }), p: [s * 0.3, 0.3, -0.02], r: [0, 0, -s * 0.7] }, { g: sp(0.13, 0.035), p: [s * 0.34, 0.24, 0.03], r: [0.2, 0, -s * 1.3] }); }
    for (let i = 0; i < 4; i++) X.chest.push({ g: sp(0.17 - i * 0.015, 0.04 - i * 0.004, { bend: 0.3 }), p: [0, 0.3 - i * 0.1, -0.13], r: [-1.9 + i * 0.1, 0, 0] });
  } else if (v === 1) {   // LAMA: corna lunghe e sottili all'indietro, pinna dorsale e lame sugli avambracci
    for (const s of S) X.head.push({ g: ho(0.6, 0.026, 0.15, 1.1, 0.25), p: [s * 0.05, 0.1, -0.03], s: [s, 1, 1] });
    for (let i = 0; i < 6; i++) X.chest.push({ g: sp(0.2 - i * 0.015, 0.012, { bend: 0.1 }), p: [0, 0.34 - i * 0.075, -0.115], r: [-1.6, 0, 0] });
    X.fore.push({ g: sp(0.3, 0.02, { bend: 0.05 }), p: [0, -0.06, -0.05], r: [-1.9, 0, 0] }); X.foreBoth = true;
  } else if (v === 2) {   // ASTUTO: grandi orecchie a pipistrello, cornetti sulla fronte e un terzo occhio
    for (const s of S) { X.head.push({ g: sp(0.2, 0.07, { fl: 0.3 }), p: [s * 0.1, 0.07, -0.03], r: [0.1, 0, -s * 1.15] }, { g: ho(0.12, 0.018, 0.4, 0.8, 0.3), p: [s * 0.03, 0.115, 0.07], s: [s, 1, 1] }); }
    X.eye3 = true;
  } else if (v === 3) {   // COLOSSO: corona d'osso, spallacci a lama, dorso corazzato e borchie sugli avambracci
    for (let i = 0; i < 7; i++) { const a = i * 0.9; X.head.push({ g: sp(0.09, 0.02), p: [Math.cos(a) * 0.07, 0.115, Math.sin(a) * 0.07 - 0.03], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }); }
    for (const s of S) X.chest.push({ g: sp(0.16, 0.12, { fl: 0.4 }), p: [s * 0.32, 0.3, 0], r: [0, 0, -s * 1.0] }, { g: sp(0.12, 0.05), p: [s * 0.36, 0.26, 0.02], r: [0, 0, -s * 1.4] });
    for (let i = 0; i < 5; i++) X.chest.push({ g: sp(0.2 - i * 0.02, 0.05 - i * 0.005, { bend: 0.2 }), p: [(i % 2 ? 1 : -1) * 0.05, 0.33 - i * 0.1, -0.14], r: [-1.8, 0, 0] });
    for (let i = 0; i < 3; i++) X.fore.push({ g: sp(0.07, 0.03), p: [0, -0.08 - i * 0.1, -0.07], r: [-2.2, 0, 0] }); X.foreBoth = true;
  } else if (v === 4) {   // GONFIO: bolle sul ventre e sulla schiena, corna basse e cadenti
    [[-0.1, 0.0, 0.19, 0.06], [0.12, -0.08, 0.18, 0.05], [0.02, 0.1, 0.2, 0.045], [-0.16, -0.09, 0.13, 0.05], [0.17, 0.04, 0.12, 0.04], [-0.04, -0.14, 0.2, 0.04]].forEach(([x, y, z, r]) => X.bodySkin.push({ g: t3Blob(r, r * 0.9, r), p: [x, y, z] }));
    [[0.1, 0.12, -0.1, 0.055], [-0.08, 0.04, -0.12, 0.05], [0.15, 0.2, -0.08, 0.04]].forEach(([x, y, z, r]) => X.chestSkin.push({ g: t3Blob(r, r, r), p: [x, y, z] }));
    for (const s of S) X.head.push({ g: ho(0.2, 0.03, 0.7, 2.0, 0.5), p: [s * 0.08, 0.1, 0.0], s: [s, 1, 1] });
  } else if (v === 5) {   // CECCHINO: cresta di spuntoni sulla testa e un corno spezzato
    for (let i = 0; i < 6; i++) X.head.push({ g: sp(0.12 - i * 0.01, 0.02), p: [0, 0.125 - i * 0.008, 0.02 - i * 0.045], r: [-1.0 - 0.12 * i, 0, 0] });
    X.head.push({ g: ho(0.12, 0.04, 0.3, 1, 0.4), p: [-0.075, 0.09, -0.02], s: [-1, 1, 1] });
  } else if (v === 6) {   // LANCIATORE: borchie sul braccio gigante e grosso spallaccio a spuntoni
    for (let i = 0; i < 4; i++) X.fore.push({ g: sp(0.08, 0.035, { bend: 0.2 }), p: [0, -0.1 - i * 0.07, -0.07], r: [-2.2, 0, 0] });
    X.chest.push({ g: sp(0.2, 0.06), p: [0.33, 0.28, 0], r: [0, 0, -0.8] }, { g: sp(0.14, 0.045), p: [0.36, 0.22, 0.03], r: [0.2, 0, -1.3] }, { g: sp(0.14, 0.045), p: [0.34, 0.24, -0.05], r: [-0.3, 0, -1.1] });
    X.head.push({ g: ho(0.3, 0.05, 0.2, 1.4, 0.0), p: [0, 0.12, 0.02] });
  } else if (v === 7) {   // SPUTAPLASMA: sacche di plasma luminose sulla gobba e spine dorsali
    X.sacs = [[0.08, 0.24, -0.13, 0.065], [-0.06, 0.18, -0.12, 0.05], [0.15, 0.14, -0.1, 0.045]];
    for (let i = 0; i < 4; i++) X.chest.push({ g: sp(0.11 - i * 0.01, 0.018), p: [-0.05, 0.1 + i * 0.07, -0.12], r: [-1.7, 0, 0] });
  }
  const mg = (a) => a.length ? t3Merge(a) : null;
  return { head: mg(X.head), chest: mg(X.chest), chestSkin: mg(X.chestSkin), bodySkin: mg(X.bodySkin), fore: mg(X.fore), foreBoth: X.foreBoth, sacs: X.sacs, eye3: X.eye3 };
}

function t3Mob(e) {
  t3SkinTex();
  const gc = T3.gc = T3.gc || {}, G = (k, f) => gc[k] || (gc[k] = f());
  const S = STY[e.type] || STY.demon, T = TYPES[e.type] || TYPES.demon, mo = (VARS[e.type] && VARS[e.type][e.v | 0] && VARS[e.type][e.v | 0][2]) || {};
  const sc = T.sc * (e.hs || 1), wsc = mo.ws || 1, mc = T3.mc = T3.mc || {};
  const isD = e.type === 'demon', vr = isD ? (VARS.demon[e.v | 0] || VARS.demon[0]) : null;   // forme e armi delle varianti (per ora solo i demoni)
  const mkey = isD ? 'demon#' + (e.v | 0) : e.type;   // ogni variante ha i suoi materiali (colori)
  const kwA = isD ? (mo.lw || 7) / 7 : 1, kwR = isD ? (mo.lwR || mo.lw || 7) / 7 : 1, kwL = isD ? ((mo.lw || 7) + 1) / 8 : 1, akL = isD ? mo.armL || 1 : 1, akR = isD ? mo.armR || 1 : 1;
  if (!mc[mkey]) {
    const ec = S.eye || '#ffe000';
    if (!T3.eyeGlow) {   // alone degli occhi: bianco al centro, sfuma a zero (il colore lo da il materiale)
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.8)'); r.addColorStop(0.5, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = r; x.fillRect(0, 0, 64, 64); T3.eyeGlow = new THREE.CanvasTexture(c);
    }
    mc[mkey] = {
      skin: new THREE.MeshStandardMaterial({ map: T3.skinTex, bumpMap: T3.skinBump, bumpScale: 1.6, vertexColors: true, emissive: 0xff4a10, emissiveMap: T3.glowTex, emissiveIntensity: 0.5, roughness: 0.58, metalness: 0.05 }),
      bone: new THREE.MeshStandardMaterial({ map: T3.boneTex, bumpMap: T3.boneBump, bumpScale: 1.2, vertexColors: true, roughness: 0.5 }),
      flesh: new THREE.MeshStandardMaterial({ color: 0x8a1822, vertexColors: true, roughness: 0.28, emissive: 0x2a0204, emissiveIntensity: 0.6 }),
      tongue: new THREE.MeshStandardMaterial({ color: 0x9a1e2c, vertexColors: true, roughness: 0.22 }),
      drool: new THREE.MeshStandardMaterial({ color: 0xdfe8e0, vertexColors: true, roughness: 0.05, transparent: true, opacity: 0.45 }),
      eye: new THREE.MeshBasicMaterial({ map: T3.eyeTex, fog: false }),
      glow: new THREE.SpriteMaterial({ map: T3.eyeGlow, color: ec, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    };
    if (S.alpha) for (const k in mc[mkey]) if (k !== 'eye' && k !== 'glow') { mc[mkey][k].transparent = true; mc[mkey][k].opacity = S.alpha; }
    if (isD) { const LK = T3LOOK[e.v | 0] || T3LOOK[0], q = mc[mkey]; t3Tint(q.skin, LK.skin, LK.keep, mkey + 's'); t3Tint(q.bone, LK.bone, 0.3, mkey + 'b'); q.skin.emissive.set(LK.glow); q.eye.color.set(LK.eye); q.glow.color.set(LK.halo); q.plasma = new THREE.MeshBasicMaterial({ color: LK.halo }); }   // colori della variante
  }
  const D = G('demon', t3DemonGeos), eyeGeo = G('eye', () => new THREE.SphereGeometry(0.5, 16, 12));
  const M = mc[mkey], g = new THREE.Group(), det = [], all = [], eyes = [];
  const mesh = (geo, mat, p, o) => { const m = new THREE.Mesh(geo, mat); (p || g).add(m); if (!(o && o.keep)) all.push(m); if (o && o.det) det.push(m); return m; };
  const grp = (p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  const body = grp(g, 0, 0.45, 0); mesh(D.pelvis, M.skin, body);
  if (isD && mo.belly) { const bk = mo.belly / 10, bm = mesh(G('belly', () => t3Blob(0.2, 0.17, 0.16)), M.skin, body); bm.position.set(0, -0.02, 0.06); bm.scale.set(wsc * (0.8 + 0.2 * bk), 0.8 + 0.2 * bk, 0.8 + 0.2 * bk); }   // pancia gonfia
  const chest = grp(body, 0, 0.1, 0); mesh(D.torso, M.skin, chest).scale.x = wsc; mesh(D.torsoBone, M.bone, chest).scale.x = wsc;
  if (isD && mo.hump) { const hm = mesh(G('hump', () => t3Blob(0.1, 0.09, 0.1)), M.skin, chest); hm.position.set(0.08 * wsc, 0.2, -0.1); hm.scale.setScalar(mo.hump / 12); }   // gobba sulla schiena
  const hn = isD ? (mo.hunch || 0) : 0, neck = grp(chest, 0, 0.2 - hn * 0.006, 0.05 + hn * 0.005); mesh(D.neck, M.skin, neck);   // schiena curva: la testa scende in avanti
  const head = grp(neck, 0, 0.08, 0.03); head.scale.setScalar(1.22 * (isD ? mo.headS || 1 : 1)); mesh(D.head, M.skin, head); mesh(D.headBone, M.bone, head);
  mesh(D.teeth, M.bone, head, { det: true }); mesh(D.gums, M.flesh, head, { det: true });
  const jaw = grp(head, 0, -0.07, 0.03); mesh(D.jaw, M.skin, jaw); mesh(D.jawTeeth, M.bone, jaw, { det: true });
  const tongue = mesh(D.tongue, M.tongue, jaw, { det: true }); tongue.position.set(0, 0.004, 0.1); mesh(D.drool, M.drool, jaw, { det: true });
  for (const s of [-1, 1]) {   // occhi gialli con pupilla a fessura + alone che li rende visibili da lontano
    const eye = mesh(eyeGeo, M.eye, head, { keep: true }); eye.position.set(s * 0.073, 0.047, 0.142); eye.scale.set(0.058, 0.058, 0.05); eye.rotation.y = -s * 0.2; eye.userData.by = 0.058;
    const gl = new THREE.Sprite(M.glow); gl.position.set(s * 0.078, 0.047, 0.172); head.add(gl); eyes.push([eye, gl]);
  }
  const elbows = [], arms = [-1, 1].map(s => {
    const kw = s > 0 ? kwR : kwA, ak = s > 0 ? akR : akL;   // spessore e lunghezza del braccio (il destro puo essere gigante)
    const a = grp(chest, s * 0.28 * wsc, 0.17, 0); mesh(D.upperArm, M.skin, a).scale.set(s * kw, ak, kw); mesh(D.upperBone, M.bone, a).scale.set(s * kw, ak, kw);
    const el = grp(a, 0, -0.28 * ak, 0); el.rotation.x = -0.35; elbows.push(el); mesh(D.fore, M.skin, el).scale.set(s * kw, ak, kw); mesh(D.foreBone, M.bone, el).scale.set(s * kw, ak, kw);
    return a;
  });
  const gun = !!(vr && (vr[0] === 'shotgun' || vr[0] === 'rifle'));
  if (vr && vr[0]) {   // arma nel pugno destro: segue braccio e avambraccio; le armi da fuoco puntano lungo il braccio, le altre in avanti
    const wg = grp(elbows[1], 0, -0.32 * akR, 0.035 * kwR), wo = vr[1] || {};
    wg.rotation.x = gun ? 2.85 : 1.45; wg.scale.setScalar(0.85 * (wo.sc || 1) * (0.8 + 0.2 * akR));
    for (const p of t3PropGeo('wp_' + e.type + '_' + (e.v | 0), B => t3Weapon(B, vr[0], wo), 0.5)) mesh(p.g, p.m, wg);
  }
  if (isD) {   // ornamenti della variante: corna, spuntoni, placche, bolle, sacche di plasma, terzo occhio
    const XT = G('xt' + (e.v | 0), () => t3Extras(e.v | 0));
    if (XT.head) mesh(XT.head, M.bone, head);
    if (XT.chest) mesh(XT.chest, M.bone, chest).scale.x = wsc;
    if (XT.chestSkin) mesh(XT.chestSkin, M.skin, chest).scale.x = wsc;
    if (XT.bodySkin) mesh(XT.bodySkin, M.skin, body).scale.x = wsc;
    if (XT.fore) for (const el of XT.foreBoth ? elbows : [elbows[1]]) mesh(XT.fore, M.bone, el);
    for (const [x, y, z, r] of XT.sacs) { const sac = mesh(G('sac', () => new THREE.SphereGeometry(1, 10, 8)), M.plasma, chest); sac.position.set(x * wsc, y, z); sac.scale.setScalar(r); }
    if (XT.eye3) { const eye = mesh(eyeGeo, M.eye, head, { keep: true }); eye.position.set(0, 0.125, 0.15); eye.scale.set(0.045, 0.045, 0.04); eye.userData.by = 0.045; const gl = new THREE.Sprite(M.glow); gl.position.set(0, 0.125, 0.172); head.add(gl); eyes.push([eye, gl]); }
  }
  const knees = [], ankles = [], legs = [-1, 1].map(s => {
    const l = grp(g, s * 0.12, 0.44, 0); mesh(D.thigh, M.skin, l).scale.set(kwL, 1, kwL);
    const kn = grp(l, 0, -0.2, 0.12); mesh(D.shin, M.skin, kn).scale.set(kwL, 1, kwL); mesh(D.kneeBone, M.bone, kn).scale.set(kwL, 1, kwL);
    const an = grp(kn, 0, -0.22, -0.07); mesh(D.foot, M.skin, an).scale.set(kwL, 1, kwL); mesh(D.footBone, M.bone, an).scale.set(kwL, 1, kwL);
    knees.push(kn); ankles.push(an); return l;
  });
  const tail = []; let par = body;
  for (let i = 0; i < 4; i++) { const sg = grp(par, 0, i ? 0 : -0.14, i ? -0.16 : -0.14); mesh(D.tail[i].skin, M.skin, sg); mesh(D.tail[i].bone, M.bone, sg); tail.push(sg); par = sg; }
  g.rotation.order = 'YXZ'; g.scale.setScalar(sc);
  g.userData = { mo: isD ? mo : {}, gun, arms, elbows, legs, knees, ankles, body, chest, neck, head, jaw, tongue, tail, eyes, det, all, s: {}, px: e.x, py: e.y, ph: 0, hd: 0, yaw: null, yawRate: 0, spd: 0, spdPrev: 0, stepIdx: 0, atkT: 0, hp: e.hp, hurt: 0, sc, seed: (e.x * 7 + e.y * 13) % 6.28, lod: null, close: null, dead: false };
  return g;
}


// Movimento: molle e inerzia. Ogni arto e un sistema molla-smorzatore che insegue un obiettivo, quindi
// ha ritardo, rimbalzo e oscillazione residua. Passo guidato dalla distanza percorsa (i piedi non scivolano).
function t3Anim(m, e, mv, d2) {
  const u = m.userData, dt = Math.min(0.05, T3.dt || 0.016), t = tNow + u.seed, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  if (!e.alive && !u.deadEyes) { u.deadEyes = true; u.eyes.forEach(([a, b]) => { a.visible = false; b.visible = false; }); }
  const near = d2 < 169;
  const eyeFx = (squint) => {   // occhi gialli: sfarfallano, si stringono quando attacca, sbattono le palpebre; l'alone resta un puntino piccolo a qualunque distanza (il corpo emerge dal buio solo da vicino)
    const fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3), sq = (squint ? 0.5 : 1) * ((t % 4.3) < 0.12 ? 0.1 : 1), gw = (0.04 + Math.sqrt(d2) * 0.0115) / (1.22 * u.sc);
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
    const bn = !!e.burned;   // morto bruciato: i muscoli si contraggono, braccia alzate e gomiti piegati, gambe raccolte
    u.body.rotation.set(sp('dB', bn ? 0.35 : 0.1, 30, 5), 0, 0); u.chest.rotation.set(0.1, 0, 0);
    u.legs.forEach((l, i) => { l.rotation.x = sp('dl' + i, bn ? 1.25 + i * 0.2 : 0.9 + i * 0.35, 40, 5); u.knees[i].rotation.x = sp('dk' + i, bn ? 1.75 : 1.1, 40, 5); });
    u.arms.forEach((a, i) => { a.rotation.x = sp('arm' + i, bn ? -1.5 + i * 0.1 : (i ? -0.2 : 0.5), 18, 3); u.elbows[i].rotation.x = sp('elb' + i, bn ? -1.9 : -0.5, 18, 3); });
    u.jaw.rotation.x = sp('jaw', bn ? 1.15 : 0.9, 40, 5); u.neck.rotation.x = sp('head', -0.5, 30, 4) * 0.5; u.head.rotation.x = u.neck.rotation.x; return;
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
  const pitch = sp('pitch', 0.3 + (u.mo.bend || 0) * 1.3 + sf * 0.18 + cl(acc * 0.05, -0.25, 0.3) + (wind ? -0.45 : 0) + (strike ? 0.55 : 0) + (sum ? -0.4 : 0) + (cow ? 0.5 : 0), 70, 9);
  const bounce = sp('bounce', 0, 80, 6), roll = sp('roll', -u.yawRate * 0.05 + sw * 0.07 * sf + (u.mo.limp ? (-0.08 + sw * 0.08) * sf : 0), 60, 8);
  const twist = sp('twist', Math.cos(ph) * 0.22 * sf + (wind ? 0.5 : 0) + (strike ? -0.7 : 0), 55, 7);          // il torace ruota contro il bacino
  const chestP = sp('chestP', 0.1 + (wind ? -0.25 : 0) + (strike ? 0.35 : 0) + Math.sin(t * 2.3) * 0.03 * (1 - sf), 60, 8), br = Math.sin(t * 2.6 + sf * 3) * 0.5 + 0.5;
  u.body.position.y = 0.45 - 0.04 * (1 - sf) - (cow ? 0.12 : 0) - (wind ? 0.05 : 0) + bounce * 0.035;
  if (u.mo.limp) u.body.position.y -= 0.04 * Math.max(0, sw) * sf;   // zoppia: il corpo affonda a ogni passo sulla gamba corta
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
    const aim = u.gun && atk, tg = aim ? (i ? -1.5 : -1.2) : sum ? -2.6 + Math.sin(t * 22) * 0.12 : cow ? -2.7 : atk ? (wind ? (i ? -2.7 : -1.9) : strike ? (i ? 0.1 : -0.6) : -0.7) : (i ? sw : -sw) * 0.85 * sf - 0.15 - 0.1 * Math.sin(t * 1.4 + i);
    a.rotation.x = sp('arm' + i, tg, atk ? 220 : 55, atk ? 14 : 6); a.rotation.z = (i ? -1 : 1) * (0.08 + sf * 0.06 + 0.05 * Math.sin(t * 1.7 + i));
    u.elbows[i].rotation.x = sp('elb' + i, aim ? -0.15 : -0.35 - ((i ? sw : -sw) > 0 ? 0.6 * sf : 0.1 * sf) - (wind ? 1 : 0) + (strike ? 0.9 : 0), 90, 8);
  });
  // ---- gambe: anca, ginocchio che si piega quando il piede si solleva, caviglia che compensa
  u.legs.forEach((l, i) => {
    const o = i ? Math.PI : 0, a = Math.sin(ph + o), lift = Math.max(0, Math.cos(ph + o)), lk = u.mo.limp && i ? 0.4 : 1;   // zoppia: la gamba destra si trascina
    const hip = sp('hip' + i, a * 0.75 * sf * lk + (cow ? 0.6 : 0.1) + (wind ? -0.1 : 0) + (strike ? (i ? 0.5 : -0.2) : 0), 140, 14), knee = 0.25 + lift * 0.95 * sf * lk + (cow ? 0.7 : 0) + (wind ? 0.35 : 0);
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

// =====================================================================================================================
// OGGETTI DI SCENA HORROR (piano 1)
// Bauli, casse, armature, rastrelliere, barili, ossa, urne e lampadari sono modelli veri: tanti piccoli pezzi (assi, borchie,
// teschi, costole, catene...) uniti in poche mesh, con colori di vertice per lo sporco, texture procedurali con rilievo
// (legno marcio, ferro arrugginito, osso, carne, pietra) e decalcomanie di sangue, mani, graffi, rune e ragnatele.
// Ogni modello si costruisce una sola volta ed e condiviso da tutti gli esemplari presenti nel livello.
// =====================================================================================================================

// texture di colore + rilievo, senza giunture (si ripetono): una per materiale
function t3PaintTex(kind) {
  const N = 256, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
  let sd = 5003 + kind.charCodeAt(0) * 131 + kind.length * 17; const R = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const cm = mk(), cb = mk(), g = cm.getContext('2d'), h = cb.getContext('2d');
  const S = {
    wood: ['#a07a52', ['#5a3c24', '#3a2414', '#7a5a38', '#4a3a20', '#2a1a10'], 7],
    iron: ['#8a8680', ['#4a3a30', '#8a4e2a', '#2e2a28', '#9a6034', '#3a2a24'], 6],
    bone: ['#d6c8a4', ['#a48a64', '#8a7250', '#e6dcc0', '#6a5238', '#b09a76'], 3],
    flesh: ['#9a5a50', ['#5a2a28', '#7a3a34', '#3a1a1a', '#b07a68', '#4a2020'], 4],
    stone: ['#8a847c', ['#5a554e', '#6a6a60', '#3a3632', '#9a958a', '#4e5a4a'], 5],
    skin: ['#d4ae9a', ['#8a4a40', '#a06a5a', '#6a3a40', '#e0c0ae', '#5a3038'], 4]
  }[kind];
  g.fillStyle = S[0]; g.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
  const wr = (f) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.save(); h.save(); g.translate(ox, oy); h.translate(ox, oy); f(); h.restore(); g.restore(); } };
  const line = (c, x, y, L, a, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); };
  const crack = (n, col, w) => {
    for (let i = 0; i < n; i++) {
      const pts = [[R() * N, R() * N]]; for (let k = 0; k < 6; k++) pts.push([pts[k][0] + (R() - 0.5) * 26, pts[k][1] + (R() - 0.2) * 22]);
      wr(() => { for (const [c, cc, ww] of [[g, col, w], [h, 'rgba(0,0,0,.6)', w + 1]]) { c.strokeStyle = cc; c.lineWidth = ww; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); } });
    }
  };
  g.lineCap = h.lineCap = 'round';
  for (let i = 0; i < 64; i++) {   // chiazze di colore e di sporco
    const x = R() * N, y = R() * N, r = 14 + R() * 38, c = S[1][(R() * 5) | 0], al = 0.14 + R() * 0.22;
    wr(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = al; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; });
  }
  if (kind === 'wood') {
    for (let i = 0; i < 110; i++) {   // venature
      const x = R() * N, y = R() * N, L = 50 + R() * 150, a = (R() - 0.5) * 0.06, dk = R() < 0.6, w = 0.8 + R() * 1.6;
      wr(() => { line(g, x, y, L, a, w, dk ? 'rgba(30,16,8,.28)' : 'rgba(230,200,160,.12)'); line(h, x, y, L, a, w + 0.4, dk ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.18)'); });
    }
    for (let i = 0; i < 4; i++) {   // nodi
      const x = R() * N, y = R() * N, r = 4 + R() * 6;
      wr(() => { for (let k = 3; k > 0; k--) { for (const [c, col] of [[g, 'rgba(30,16,8,' + (0.18 + k * 0.1) + ')'], [h, 'rgba(0,0,0,.5)']]) { c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, r * k * 0.5 + 2, r * k * 0.3 + 1, 0, 0, 7); c.stroke(); } } g.fillStyle = 'rgba(20,10,4,.6)'; g.beginPath(); g.ellipse(x, y, r * 0.4, r * 0.25, 0, 0, 7); g.fill(); });
    }
    crack(9, 'rgba(14,8,4,.75)', 1.1);
    for (let i = 0; i < 7; i++) { const x = R() * N, y = R() * N, r = 5 + R() * 11; wr(() => { g.fillStyle = 'rgba(70,92,60,.16)'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill(); }); }   // muffa
  } else if (kind === 'iron') {
    for (let i = 0; i < 26; i++) { const x = R() * N, y = R() * N, L = 12 + R() * 40, a = R() * 6.28; wr(() => { line(g, x, y, L, a, 0.8, 'rgba(210,200,190,.2)'); line(h, x, y, L, a, 1, 'rgba(255,255,255,.2)'); }); }   // graffi
    for (let i = 0; i < 16; i++) { const x = R() * N, y = R() * N * 0.8, L = 18 + R() * 50; wr(() => line(g, x, y, L, 1.57, 2 + R() * 0, 'rgba(140,66,26,.3)')); }
    for (let i = 0; i < 900; i++) { const x = R() * N, y = R() * N, d = R() < 0.6; g.fillStyle = d ? 'rgba(10,6,4,' + (0.2 + R() * 0.3) + ')' : 'rgba(170,84,34,' + (0.2 + R() * 0.3) + ')'; g.fillRect(x, y, 1 + R() * 2, 1 + R() * 2); h.fillStyle = 'rgba(0,0,0,.4)'; h.fillRect(x, y, 1 + R() * 1.5, 1 + R() * 1.5); }   // vaiolature
    crack(3, 'rgba(10,6,4,.7)', 1);
  } else if (kind === 'bone') {
    for (let i = 0; i < 36; i++) { const x = R() * N, y = R() * N, L = 14 + R() * 40, a = 1.4 + (R() - 0.5) * 0.5; wr(() => { line(g, x, y, L, a, 1.2, 'rgba(110,90,60,.25)'); line(h, x, y, L, a, 1.4, 'rgba(0,0,0,.3)'); }); }
    crack(8, 'rgba(40,25,15,.6)', 1);
  } else if (kind === 'flesh' || kind === 'skin') {
    for (let i = 0; i < 16; i++) {   // vene
      const pts = [[R() * N, R() * N]]; for (let k = 0; k < 6; k++) pts.push([pts[k][0] + (R() - 0.5) * 36, pts[k][1] + (R() - 0.5) * 36]); const lw = 1.2 + R() * 1.4;
      wr(() => { for (const [c, col] of [[g, 'rgba(70,16,44,.5)'], [h, 'rgba(255,255,255,.2)']]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); } });
    }
    if (kind === 'flesh') { for (let y = 0; y < N; y += 3) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, y, N, 1); }   // trama di stoffa / cuoio
      for (let x = 0; x < N; x += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x, 0, 1, N); } }
    for (let i = 0; i < 260; i++) { const x = R() * N, y = R() * N, r = 1 + R() * 3; h.fillStyle = 'rgba(255,255,255,.14)'; h.beginPath(); h.arc(x, y, r, 0, 7); h.fill(); }
    crack(4, 'rgba(30,8,8,.6)', 1);
  } else {
    for (let i = 0; i < 10; i++) { const x = R() * N, y = R() * N, r = 6 + R() * 14; wr(() => { g.fillStyle = 'rgba(60,96,50,.2)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, 7); g.fill(); }); }   // muschio
    crack(7, 'rgba(14,12,10,.7)', 1.2);
  }
  for (let i = 0, DR = S[2]; i < DR; i++) {   // sangue colato
    const x = R() * N, y = R() * N * 0.6, L = 24 + R() * 60, w = 1.6 + R() * 3.2;
    wr(() => {
      g.strokeStyle = 'rgba(70,4,6,.5)'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y + L); g.stroke(); g.fillStyle = 'rgba(70,4,6,.6)'; g.beginPath(); g.arc(x + 1, y + L, w * 0.8, 0, 7); g.fill();
      h.strokeStyle = 'rgba(0,0,0,.3)'; h.lineWidth = w; h.beginPath(); h.moveTo(x, y); h.lineTo(x + 1, y + L); h.stroke();
    });
  }
  for (let i = 0; i < 1500; i++) {   // grana e polvere
    const x = R() * N, y = R() * N, d = R() < 0.55;
    g.fillStyle = d ? 'rgba(10,6,4,' + (0.08 + R() * 0.16) + ')' : 'rgba(255,240,215,' + (0.05 + R() * 0.1) + ')'; g.fillRect(x, y, 1 + R() * 1.5, 1 + R() * 1.5);
    h.fillStyle = d ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.12)'; h.fillRect(x, y, 1, 1);
  }
  return { c: cm, b: cb };
}

// atlante delle decalcomanie (8 caselle da 128): mano, schizzo, colature, runa, graffi, pozza, ragnatela
function t3PaintDecals() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  let sd = 9157; const R = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const cell = (i, f) => { g.save(); g.translate((i & 1) * 128, (i >> 1) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); g.lineCap = 'round'; f(); g.restore(); };
  const RED = 'rgba(92,5,8,.88)', DRK = 'rgba(58,3,5,.9)';
  cell(0, () => {   // mano insanguinata
    g.fillStyle = RED; g.beginPath(); g.ellipse(64, 86, 21, 24, 0, 0, 7); g.fill();
    for (const [x, y, a, L] of [[41, 66, -0.38, 28], [54, 56, -0.12, 33], [68, 54, 0.06, 35], [81, 59, 0.3, 29]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, -L / 2 + 8, 6.4, L / 2, 0, 0, 7); g.fill(); g.restore(); }
    g.save(); g.translate(87, 94); g.rotate(1.15); g.beginPath(); g.ellipse(0, -11, 6.6, 17, 0, 0, 7); g.fill(); g.restore();
    g.strokeStyle = DRK; for (const x of [54, 66, 77]) { g.lineWidth = 3 + (x % 3); g.beginPath(); g.moveTo(x, 104); g.lineTo(x + 1, 112 + (x % 4) * 4); g.stroke(); }
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 46; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.2 + R() * 0.4) + ')'; g.fillRect(28 + R() * 76, 36 + R() * 80, 1 + R() * 3, 1 + R() * 3); } g.globalCompositeOperation = 'source-over';
  });
  cell(1, () => {   // schizzo
    g.fillStyle = RED; g.strokeStyle = RED; g.beginPath(); g.ellipse(64, 62, 15, 12, 0, 0, 7); g.fill();
    for (let i = 0; i < 30; i++) { const a = R() * 6.28, d = 14 + R() * 44, r = Math.max(0.9, (1 + R() * 5) * (1 - d / 62)), x = 64 + Math.cos(a) * d, y = 62 + Math.sin(a) * d * 0.92; g.lineWidth = r * 0.7; g.beginPath(); g.moveTo(64 + Math.cos(a) * 10, 62 + Math.sin(a) * 9); g.lineTo(x, y); g.stroke(); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  });
  cell(2, () => {   // colature
    g.strokeStyle = RED; g.fillStyle = RED; g.lineWidth = 9; g.beginPath(); g.moveTo(6, 7); g.lineTo(122, 5); g.stroke();
    for (let i = 0; i < 7; i++) { const x = 12 + i * 16 + R() * 6, L = 20 + R() * 82, w = 2.4 + R() * 3.6; g.lineWidth = w; g.beginPath(); g.moveTo(x, 6); g.lineTo(x + (R() - 0.5) * 3, 6 + L); g.stroke(); g.beginPath(); g.arc(x, 6 + L, w * 0.85, 0, 7); g.fill(); }
  });
  cell(3, () => {   // runa evocativa
    g.strokeStyle = 'rgba(110,8,10,.92)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.arc(64, 64, 42, 0, 7); g.stroke();
    g.lineWidth = 2.6; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -1.5708 + i * 2.513, x = 64 + Math.cos(a) * 42, y = 64 + Math.sin(a) * 42; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
    g.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i * 0.5236; g.beginPath(); g.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); }
  });
  cell(4, () => {   // graffi di artigli
    for (let k = 0; k < 3; k++) { const x0 = 22 + k * 34 + R() * 8; for (let j = 0; j < 4; j++) { for (const [col, off] of [['rgba(22,10,6,.92)', 0], ['rgba(92,5,8,.5)', 1.6]]) { g.strokeStyle = col; g.lineWidth = 2.4 - j * 0.3; g.beginPath(); g.moveTo(x0 + j * 7 + off, 8 + (j * 5) % 7); g.bezierCurveTo(x0 + j * 7 + 4 + off, 40, x0 + j * 7 - 3 + off, 70, x0 + j * 7 + 2 + off, 100 + (j * 7) % 16); g.stroke(); } } }
  });
  cell(5, () => {   // pozza di sangue
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 58); gr.addColorStop(0, 'rgba(70,2,5,.95)'); gr.addColorStop(0.75, 'rgba(96,6,9,.9)'); gr.addColorStop(1, 'rgba(96,6,9,0)'); g.fillStyle = gr;
    g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.2832, r = 34 + R() * 22 * (i % 2 ? 1 : 0.6), x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,200,190,.18)'; g.beginPath(); g.ellipse(52, 52, 12, 5, -0.5, 0, 7); g.fill();
  });
  cell(6, () => {   // ragnatela d'angolo
    g.strokeStyle = 'rgba(235,235,225,.55)'; g.lineWidth = 0.9;
    for (let i = 0; i <= 8; i++) { const a = i * 0.196; g.beginPath(); g.moveTo(8, 8); g.lineTo(8 + Math.cos(a) * 140, 8 + Math.sin(a) * 140); g.stroke(); }
    for (let r = 20; r < 130; r += 17) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * 0.196, rr = r * (1 - 0.1 * Math.sin(i * 2.1 + r)), x = 8 + Math.cos(a) * rr, y = 8 + Math.sin(a) * rr; i ? g.quadraticCurveTo(8 + Math.cos(a - 0.098) * rr * 0.93, 8 + Math.sin(a - 0.098) * rr * 0.93, x, y) : g.moveTo(x, y); } g.stroke(); }
  });
  return c;
}

// materiali condivisi da tutti i modelli (si creano una volta sola)
function t3PropKit() {
  if (T3.pk) return T3.pk;
  const K = T3.pk = { mat: {} }, def = { wood: [0.92, 0, 1.4], iron: [0.6, 0.2, 1.2], bone: [0.78, 0, 1.0], flesh: [0.42, 0, 1.2], stone: [0.95, 0, 1.0], skin: [0.55, 0, 1.0] };
  for (const k in def) { const t = t3PaintTex(k); K.mat[k] = new THREE.MeshStandardMaterial({ map: t3TexL(t.c), bumpMap: t3TexL(t.b), bumpScale: def[k][2], roughness: def[k][0], metalness: def[k][1], vertexColors: true }); }
  K.mat.decal = new THREE.MeshStandardMaterial({ map: t3TexL(t3PaintDecals(), true), vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.4 });
  {   // pelle pulita della mano e dell'avambraccio: colore dai vertici e una grana finissima (niente macchie ne sangue della texture 'skin')
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N); let sd = 4242;
    for (let i = 0; i < N * N; i++) { sd = (sd * 16807) % 2147483647; const v = 120 + (sd % 17); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    K.mat.hand = new THREE.MeshStandardMaterial({ bumpMap: t3TexL(c), bumpScale: 0.3, roughness: 0.6, metalness: 0, vertexColors: true });
  }
  K.mat.glow = new THREE.MeshBasicMaterial({ vertexColors: true });                  // monete e bagliori: non dipendono dalle luci
  K.mat.flame = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });     // fiammelle delle candele: si vedono anche da lontano, come le torce
  return K;
}

// costruttore: raccoglie pezzi (scatole, cilindri, sfere, anelli...) con una pila di trasformazioni, divisi per materiale
function t3PB(R) {
  const e = new THREE.Euler(), qa = new THREE.Quaternion(), va = new THREE.Vector3(), sa = new THREE.Vector3(), st = [new THREE.Matrix4()];
  const B = { R, L: { wood: [], iron: [], bone: [], flesh: [], stone: [], skin: [], hand: [], glow: [], flame: [], decal: [] } };
  const loc = (p, r, s) => { e.set(r[0], r[1], r[2]); qa.setFromEuler(e); return new THREE.Matrix4().compose(va.set(p[0], p[1], p[2]), qa, sa.set(s[0], s[1], s[2])); };
  B.add = (k, g, p, c, o) => { o = o || {}; B.L[k].push({ g, m: st[st.length - 1].clone().multiply(loc(p || [0, 0, 0], o.r || [0, 0, 0], o.s || [1, 1, 1])), c: c || '#ffffff', dc: o.dc, sw: o.sw, ao: o.ao, st: o.st, b: o.b, nz: o.nz, uk: o.uk }); };
  B.in = (p, r, s, f) => { st.push(st[st.length - 1].clone().multiply(loc(p || [0, 0, 0], r || [0, 0, 0], s || [1, 1, 1]))); f(); st.pop(); };   // sotto-gruppo con la sua posizione/rotazione/scala
  B.box = (k, d, p, c, o) => B.add(k, new THREE.BoxGeometry(d[0], d[1], d[2]), p, c, o);
  B.cyl = (k, d, p, c, o) => B.add(k, new THREE.CylinderGeometry(d[0], d[1], d[2], d[3] || 8, 1, false, d[4] || 0, d[5] || 6.2832), p, c, o);
  B.cone = (k, d, p, c, o) => B.add(k, new THREE.ConeGeometry(d[0], d[1], d[2] || 6), p, c, o);
  B.sph = (k, d, p, c, o) => B.add(k, new THREE.SphereGeometry(1, (o && o.w) || 8, (o && o.h) || 6), p, c, Object.assign({}, o, { s: d.length ? d : [d, d, d] }));
  B.tor = (k, d, p, c, o) => B.add(k, new THREE.TorusGeometry(d[0], d[1], d[2] || 5, d[3] || 12, d[4] || 6.2832), p, c, o);
  B.lat = (k, pts, p, c, o) => B.add(k, new THREE.LatheGeometry(pts.map(a => new THREE.Vector2(a[0], a[1])), (o && o.w) || 12), p, c, o);
  B.dec = (cell, w, h, p, r, c) => B.add('decal', new THREE.PlaneGeometry(w, h), p, c || '#ffffff', { dc: cell, ao: false, r: r || [0, 0, 0] });
  B.seg = (k, a, b, ra, rb, c, n, o) => {   // cilindro che unisce due punti (ra al punto a, rb al punto b)
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length() || 0.001;
    qa.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(L)); e.setFromQuaternion(qa);
    B.add(k, new THREE.CylinderGeometry(rb, ra, L, n || 6), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], c, Object.assign({}, o, { r: [e.x, e.y, e.z] }));
  };
  return B;
}

// unisce i pezzi di ogni materiale in una sola geometria: UV a proiezione per asse, sporco in basso e piccole variazioni di tinta nei vertici
function t3PBake(B, R, y0, ctr) {
  const K = t3PropKit(), out = [], v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color(), D = 2.2;
  for (const k in B.L) {
    const L = B.L[k]; if (!L.length) continue;
    const pos = [], nor = [], uv = [], col = [], idx = []; let base = 0;
    for (const it of L) {
      const g = it.g, P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv, I = g.index, GC = g.attributes.color;   // GC: tinta per vertice (solo i modelli che la hanno, come la mano)
      nm.getNormalMatrix(it.m); c.set(it.c);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(it.m); n.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize();
        pos.push(v.x - (ctr ? ctr[0] : 0), v.y - (ctr ? ctr[1] : 0), v.z - (ctr ? ctr[2] : 0)); nor.push(n.x, n.y, n.z);
        if (it.dc !== undefined) uv.push((it.dc & 1) * 0.5 + U.getX(i) * 0.5, 1 - ((it.dc >> 1) + 1) * 0.25 + U.getY(i) * 0.25);
        else {
          const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z); let a, b;
          if (ay >= ax && ay >= az) { a = v.x; b = v.z; } else if (ax >= az) { a = v.z; b = v.y; } else { a = v.x; b = v.y; }
          uv.push((it.sw ? b : a) * D * (it.uk || 1), (it.sw ? a : b) * D * (it.uk || 1));
        }
        let f = it.ao === false ? 1 : 0.55 + 0.45 * Math.min(1, Math.max(0, (v.y + (y0 || 0)) / 0.28));
        if (it.st) f *= 1 - 0.2 * (Math.round(U.getX(i) * it.st) & 1);
        f *= (1 + (R() * 0.16 - 0.08) * (it.nz === undefined ? 1 : it.nz)) * (it.b || 1);
        if (GC) col.push(c.r * f * GC.getX(i), c.g * f * GC.getY(i), c.b * f * GC.getZ(i)); else col.push(c.r * f, c.g * f, c.b * f);
      }
      const fl = it.m.determinant() < 0;
      for (let j = 0; j < I.count; j += 3) { const a = I.getX(j), b = I.getX(j + 1), d = I.getX(j + 2); if (fl) idx.push(base + a, base + d, base + b); else idx.push(base + a, base + b, base + d); }
      base += P.count; g.dispose();
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setIndex(idx);
    out.push({ g: bg, m: K.mat[k] });
  }
  return out;
}

// cache dei modelli: ogni chiave si costruisce una volta sola
function t3PropGeo(key, fn, y0) {
  const C = T3.pg || (T3.pg = {});
  if (!C[key]) {
    let sd = 1013; for (let i = 0; i < key.length; i++) sd = (sd * 31 + key.charCodeAt(i)) % 2147483647; sd = sd || 7;
    const R = () => ((sd = (sd * 16807) % 2147483647) / 2147483647), B = t3PB(R); t3Parts(B); fn(B); const out = t3PBake(B, R, y0); out.B = B; out.R = R; out.y0 = y0; C[key] = out;
  }
  return C[key];
}

// pezzi ricorrenti: teschio, mano, osso, costole, intestino, catena, candela, armi
function t3Parts(B) {
  const BONE = '#e2d6b6';
  B.chain = (a, b, n, c) => {
    const hz = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; B.tor('iron', [0.011, 0.0035, 5, 8], [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], c || '#8a7e76', { r: hz ? [(i % 2) * 1.5708, 0, 1.5708] : [0, (i % 2) * 1.5708, 0], s: [1, 1.5, 1] }); }
  };
  B.skull = (p, s, r, o) => {   // teschio con orbite scure, naso, denti e mandibola che puo pendere aperta
    o = o || {}; const bc = o.c || BONE, jw = o.jaw || 0;
    B.in(p, r, [s, s, s], () => {
      B.sph('bone', [0.054, 0.058, 0.062], [0, 0.02, 0], bc, { w: 10, h: 8 });
      B.box('bone', [0.07, 0.034, 0.05], [0, -0.034, 0.018], bc);
      for (const sx of [-1, 1]) B.sph('bone', [0.017, 0.02, 0.013], [sx * 0.025, 0.003, 0.05], '#0c0806');
      B.box('bone', [0.009, 0.015, 0.008], [0, -0.022, 0.046], '#0c0806');
      B.box('bone', [0.003, 0.032, 0.003], [0.022, 0.05, 0.045], '#2a1c10', { r: [0, 0, 0.5] });
      for (let i = -2; i <= 2; i++) B.box('bone', [0.0075, 0.012, 0.006], [i * 0.0095, -0.05, 0.043], '#f0e8d0');
      B.in([0, -0.052, 0], [jw, 0, 0], null, () => {
        B.box('bone', [0.05, 0.016, 0.04], [0, -0.01, 0.016], bc);
        for (let i = -2; i <= 2; i++) B.box('bone', [0.0075, 0.011, 0.006], [i * 0.0095, -0.001, 0.04], '#e6dcc0');
      });
    });
  };
  B.hand = (p, r, k, c) => B.in(p, r, null, () => {   // mano con le dita piegate (punta verso +z)
    B.box(k, [0.05, 0.014, 0.05], [0, 0, 0], c);
    for (let i = 0; i < 4; i++) { const x = -0.018 + i * 0.012, L = 0.03 + (i === 1 || i === 2 ? 0.006 : 0); B.box(k, [0.009, 0.009, L], [x, 0, 0.025 + L / 2], c); B.in([x, 0, 0.025 + L], [0.9, 0, 0], null, () => B.box(k, [0.008, 0.008, 0.022], [0, 0, 0.011], c)); }
    B.box(k, [0.012, 0.01, 0.03], [-0.033, 0, 0.012], c, { r: [0, -0.6, 0] });
  });
  B.bone = (a, b, c, th) => {   // osso lungo con le due articolazioni
    th = th || 0.008; c = c || BONE; B.seg('bone', a, b, th, th, c, 6);
    for (const p of [a, b]) { B.sph('bone', [th * 1.6, th * 1.6, th * 1.6], p, c, { w: 5, h: 4 }); B.sph('bone', [th * 1.2, th * 1.2, th * 1.2], [p[0], p[1] + th * 1.1, p[2]], c, { w: 5, h: 4 }); }
  };
  B.ribs = (p, r, n, W, c) => B.in(p, r, null, () => {   // gabbia toracica aperta sul davanti, con la colonna dietro
    c = c || BONE;
    B.in([0, 0, 0], [0, 4.17, 0], null, () => { for (let i = 0; i < n; i++) B.tor('bone', [W * (1 - 0.07 * Math.abs(i - (n - 1) / 2)), 0.0065, 4, 14, 5.2], [0, i * 0.036, 0], c, { r: [1.67, 0, 0], s: [1, 0.74, 1] }); });
    for (let i = 0; i <= n; i++) B.box('bone', [0.018, 0.016, 0.02], [0, i * 0.036 - 0.018, -W * 0.74], c);
  });
  B.guts = (a, b, n, r) => {   // budella che penzolano
    for (let i = 0; i < n; i++) { const t = i / (n - 1); B.sph('flesh', [r, r * 0.85, r], [a[0] + (b[0] - a[0]) * t + Math.sin(t * 9) * 0.012, a[1] + (b[1] - a[1]) * t - Math.sin(t * 3.1416) * 0.05, a[2] + (b[2] - a[2]) * t], i % 2 ? '#b8545c' : '#8a343c', { w: 6, h: 5 }); }
  };
  B.candle = (p, h, nf) => {   // moncone di candela con fiammella
    B.cyl('bone', [0.011, 0.013, h, 7], [p[0], p[1] + h / 2, p[2]], '#e8dcbc');
    B.cone('flame', [0.008, 0.026, 6], [p[0], p[1] + h + 0.012, p[2]], '#ffb040', { ao: false }); B.cone('flame', [0.004, 0.016, 5], [p[0], p[1] + h + 0.01, p[2]], '#fff0b0', { ao: false });
    if (!nf) B.cyl('bone', [0.003, 0.003, 0.03, 4], [p[0] + 0.011, p[1] + h - 0.014, p[2]], '#e8dcbc');
  };
  B.sword = (x, y, z, L, rz, bl) => B.in([x, y, z], [0, 0, rz], null, () => {   // spada: origine all'elsa, lama verso l'alto
    B.box('iron', [0.024, L, 0.006], [0, L / 2, 0], '#b8aca0'); B.box('iron', [0.006, L * 0.8, 0.0075], [0, L * 0.45, 0], '#8a7e74');
    B.cone('iron', [0.0125, 0.04, 4], [0, L + 0.02, 0], '#b8aca0', { s: [1, 1, 0.25] });
    if (bl) B.box('flesh', [0.0245, L * 0.5, 0.0066], [0, L * 0.3, 0], '#5a0a0c');
    B.box('iron', [0.09, 0.012, 0.016], [0, -0.004, 0], '#6a5a50'); B.cyl('wood', [0.009, 0.009, 0.075, 6], [0, -0.045, 0], '#4a3226'); B.sph('iron', 0.014, [0, -0.088, 0], '#6a5a50', { w: 6, h: 5 });
  });
  B.axe = (x, y, z, L, rz) => B.in([x, y, z], [0, 0, rz], null, () => {   // ascia (o alabarda se il manico e lungo): lama a mezzaluna con il filo insanguinato
    B.cyl('wood', [0.009, 0.01, L, 6], [0, L / 2, 0], '#9a8068');
    B.cyl('iron', [0.055, 0.055, 0.012, 8, 0, 3.1416], [0.004, L - 0.05, 0], '#a8988a', { r: [1.5708, 0, 0] });
    B.cyl('flesh', [0.056, 0.056, 0.0125, 8, 0, 1.2], [0.004, L - 0.05, 0], '#58080c', { r: [1.5708, 0, 0] });
    B.cone('iron', [0.012, 0.045, 5], [-0.03, L - 0.045, 0], '#8a7a6e', { r: [0, 0, 1.5708] }); B.box('iron', [0.026, 0.02, 0.014], [0, L - 0.05, 0], '#7a6a60');
    if (L > 0.6) B.cone('iron', [0.012, 0.06, 4], [0, L + 0.03, 0], '#a8988a');
  });
  B.spear = (x, y, z, L, rz, sk) => B.in([x, y, z], [0, 0, rz], null, () => {   // lancia, con o senza testa infilzata
    B.cyl('wood', [0.009, 0.01, L, 6], [0, L / 2, 0], '#9a8068'); B.cone('iron', [0.016, 0.07, 4], [0, L + 0.03, 0], '#b0a094'); B.box('flesh', [0.03, 0.012, 0.012], [0, L - 0.01, 0], '#3a2418');
    if (sk) B.skull([0, L - 0.02, 0], 0.62, [0, 0.4, 0], { jaw: 0.4, c: '#cbbd9c' });
  });
  B.mace = (x, y, z, L, rz) => B.in([x, y, z], [0, 0, rz], null, () => {   // mazza chiodata
    B.cyl('wood', [0.01, 0.011, L, 6], [0, L / 2, 0], '#8a7058'); B.sph('iron', 0.035, [0, L + 0.02, 0], '#9a8a7e', { w: 8, h: 6 });
    for (const r of [[0, 0, -1.5708], [0, 0, 1.5708], [1.5708, 0, 0], [-1.5708, 0, 0]]) B.cone('iron', [0.009, 0.034, 4], [-Math.sin(r[2]) * 0.04, L + 0.02, Math.sin(r[0]) * 0.04], '#8a7a6e', { r });
    B.cone('iron', [0.009, 0.034, 4], [0, L + 0.06, 0], '#8a7a6e');
  });
  B.shield = (x, y, z, R, rz, k) => B.in([x, y, z], [0, 0, rz], null, () => {   // scudo rotondo: k 0 colature+teschio, 1 graffi di artigli, 2 runa
    B.cyl('wood', [R, R, 0.02, 14], [0, 0, 0], k ? '#b89a78' : '#a88a6a', { r: [1.5708, 0, 0] }); B.tor('iron', [R, 0.008, 5, 16], [0, 0, 0.01], '#9a8a7e');
    B.sph('iron', [0.03, 0.03, 0.02], [0, 0, 0.014], '#a89888', { w: 8, h: 5 });
    for (let i = 0; i < 6; i++) { const a = i * 1.047; B.cone('iron', [0.007, 0.024, 5], [Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66, 0.02], '#8a7a6e', { r: [1.5708, 0, 0] }); }
    B.dec(k === 1 ? 4 : k === 2 ? 3 : 2, R * 1.7, R * 1.7, [0, 0, 0.0115]);
    if (k === 0) B.skull([0, -R * 0.35, 0.03], 0.36, [0, 0, 0]);
  });
}

// cassa marcia: v 0 mano insanguinata e runa, 1 mano che esce da un varco, 2 teschio con candela, 3 catene e lucchetto
function t3MCrate(B, v) {
  const R = B.R, T = ['#d8c4a4', '#bca486', '#cdb494', '#a88e72'];
  B.box('wood', [0.38, 0.36, 0.38], [0, 0.2, 0], '#120a05', { ao: false });   // il buio dentro si vede tra le assi
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box('wood', [0.046, 0.4, 0.046], [sx * 0.195, 0.2, sz * 0.195], '#a08468', { sw: true });
  for (let f = 0; f < 4; f++) B.in([0, 0, 0], [0, f * 1.5708, 0], null, () => {
    for (let i = 0; i < 4; i++) {
      if (f === 1 && i === 2) continue;                 // un'asse strappata sul retro
      if (v === 1 && f === 0 && i === 1) continue;      // varco sul fronte
      B.box('wood', [0.36 + R() * 0.012, 0.086, 0.016], [(R() - 0.5) * 0.01, 0.052 + i * 0.1, 0.2], T[(R() * 4) | 0], { r: [(R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.05] });
    }
  });
  for (let i = 0; i < 4; i++) B.box('wood', [0.4, 0.02, 0.088], [0, 0.402, -0.153 + i * 0.102], T[(R() * 4) | 0], { r: [0, (R() - 0.5) * 0.04, 0] });
  B.box('wood', [0.46, 0.04, 0.012], [0, 0.2, 0.212], '#8e7458', { r: [0, 0, 0.78] });   // asse diagonale
  for (const x of [-0.17, 0.17]) for (const y of [0.052, 0.152, 0.252, 0.352]) B.cyl('iron', [0.007, 0.007, 0.006, 5], [x, y, 0.206], '#6a5a50', { r: [1.5708, 0, 0] });   // chiodi
  if (v === 0) { B.dec(0, 0.12, 0.12, [0.06, 0.24, 0.2195]); B.dec(2, 0.1, 0.2, [-0.1, 0.25, 0.2195]); B.dec(3, 0.2, 0.2, [0, 0.4125, 0], [-1.5708, 0, 0]); }
  else if (v === 1) {
    B.seg('flesh', [0.03, 0.15, 0.12], [0.04, 0.15, 0.24], 0.02, 0.018, '#b4a592', 6); B.hand([0.04, 0.15, 0.245], [0.8, 0, 0.05], 'flesh', '#b4a592');
    B.dec(2, 0.14, 0.14, [0.04, 0.1, 0.2195]); B.dec(5, 0.42, 0.42, [0.05, 0.003, 0.3], [-1.5708, 0, 0]);
  } else if (v === 2) {
    B.skull([0.04, 0.47, 0.02], 0.95, [0, 0.5, 0.05], { jaw: 0.2 }); B.cyl('bone', [0.03, 0.03, 0.006, 8], [-0.12, 0.416, -0.08], '#e0d4b4'); B.candle([-0.12, 0.419, -0.08], 0.055);
    B.dec(3, 0.2, 0.2, [0, 0.2, 0.2195]);
  } else {
    B.chain([-0.21, 0.26, 0.224], [0.21, 0.26, 0.224], 9); B.box('iron', [0.05, 0.06, 0.025], [0, 0.22, 0.235], '#a89080'); B.tor('iron', [0.018, 0.005, 4, 8, 3.1416], [0, 0.25, 0.235], '#b0a090');
    B.dec(2, 0.1, 0.14, [0, 0.14, 0.2195]);
  }
}

// baule: corpo aperto (dentro: ossa e un po' di oro), coperchio a parte che ruota sulla cerniera
function t3MChest(B) {
  const R = B.R, W = 0.46, D = 0.3, H = 0.2, T = ['#d4bea0', '#b8a084', '#c8b092'];
  B.box('wood', [W, 0.03, D], [0, 0.015, 0], '#6a5440');
  B.box('wood', [W, H, 0.03], [0, H / 2, D / 2 - 0.015], T[0]); B.box('wood', [W, H, 0.03], [0, H / 2, -D / 2 + 0.015], T[1]);
  for (const sx of [-1, 1]) B.box('wood', [0.03, H, D - 0.06], [sx * (W / 2 - 0.015), H / 2, 0], T[2]);
  B.box('wood', [W - 0.06, 0.01, D - 0.06], [0, 0.035, 0], '#0e0806', { ao: false });
  for (let i = 0; i < 7; i++) B.cyl('glow', [0.022, 0.022, 0.006, 8], [(R() - 0.5) * 0.28, 0.045 + R() * 0.02, (R() - 0.5) * 0.14], '#b88a30', { r: [(R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4], ao: false });   // monete
  B.skull([-0.1, 0.085, 0.03], 0.9, [0.1, 0.7, 0.2], { jaw: 0.3 }); B.bone([0.02, 0.05, -0.05], [0.16, 0.06, 0.06]);
  for (const sx of [-1, 1]) { B.box('iron', [0.04, H + 0.004, D + 0.012], [sx * 0.15, H / 2, 0], '#bca494'); for (const sz of [-1, 1]) B.box('iron', [0.04, H + 0.006, 0.04], [sx * (W / 2 - 0.01), H / 2, sz * (D / 2 - 0.01)], '#a8907e'); }
  for (const x of [-0.15, 0.15]) for (const y of [0.05, 0.1, 0.15]) B.sph('iron', 0.007, [x, y, D / 2 + 0.008], '#d0b8a0', { w: 5, h: 4 });   // borchie
  B.box('iron', [0.07, 0.075, 0.012], [0, 0.145, D / 2 + 0.008], '#b09c8c'); B.skull([0, 0.15, D / 2 + 0.02], 0.33, [0, 0, 0]);   // serratura a teschio
  B.dec(2, 0.11, 0.17, [-0.07, 0.1, D / 2 + 0.0016]); B.dec(0, 0.1, 0.1, [0.085, 0.09, D / 2 + 0.0016]); B.dec(5, 0.5, 0.5, [0, 0.003, 0.2], [-1.5708, 0, 0]);
}
function t3MChestLid(B) {
  const W = 0.46, D = 0.3, r = 0.15;
  B.box('wood', [W - 0.01, 0.025, D - 0.01], [0, 0.0125, D / 2], '#5a4632');
  B.cyl('wood', [r, r, W, 14, 0, 3.1416], [0, 0.025, D / 2], '#c8b08e', { r: [0, 0, 1.5708], s: [0.55, 1, 1] });   // cupola
  for (const sx of [-1, 1]) { B.cyl('iron', [r + 0.004, r + 0.004, 0.04, 14, 0, 3.1416], [sx * 0.15, 0.025, D / 2], '#b09888', { r: [0, 0, 1.5708], s: [0.555, 1, 1] }); B.box('iron', [0.05, 0.04, 0.014], [sx * 0.15, 0.02, 0.004], '#9a8678'); }
  B.box('wood', [W, 0.032, 0.02], [0, 0.016, D - 0.01], '#a89078');
  B.dec(4, 0.3, 0.2, [0.04, -0.0025, D / 2 + 0.02], [1.5708, 0, 0]); B.dec(0, 0.1, 0.1, [-0.12, -0.0025, D / 2 - 0.05], [1.5708, 0, 0]); B.dec(2, 0.12, 0.2, [0.15, -0.0025, D / 2], [1.5708, 0, 0]);   // dentro il coperchio: graffi e sangue
}

// barile con sangue e un morto che si aggrappa al bordo
function t3MBarrel(B) {
  const P = [[0.125, 0], [0.15, 0.07], [0.172, 0.2], [0.157, 0.33], [0.136, 0.4]];
  B.lat('wood', P, [0, 0, 0], '#d0b896', { w: 12, st: 12 }); B.lat('wood', P.map(a => [a[0] - 0.012, a[1]]).reverse(), [0, 0, 0], '#6a5440', { w: 12, ao: false });
  for (const [y, r] of [[0.075, 0.152], [0.2, 0.176], [0.33, 0.16]]) B.tor('iron', [r, 0.011, 4, 14], [0, y, 0], '#b09888', { r: [1.5708, 0, 0] });
  B.tor('wood', [0.136, 0.012, 4, 12], [0, 0.4, 0], '#bca486', { r: [1.5708, 0, 0] });
  B.cyl('flesh', [0.13, 0.13, 0.006, 12], [0, 0.352, 0], '#5e0a10', { ao: false });   // liquido rosso
  B.skull([0.02, 0.375, 0.01], 0.8, [0.3, 0.9, 0.1]);
  B.seg('flesh', [-0.06, 0.35, 0], [-0.135, 0.41, 0], 0.02, 0.017, '#a09484', 6); B.hand([-0.146, 0.412, 0], [0, -1.5708, 0], 'flesh', '#a89c8a');
  B.cyl('iron', [0.01, 0.012, 0.04, 6], [0, 0.1, 0.17], '#8a7a70', { r: [1.5708, 0, 0] });
  B.dec(2, 0.1, 0.22, [0.02, 0.23, 0.176]); B.dec(5, 0.55, 0.55, [0.03, 0.003, 0.04], [-1.5708, 0, 0]);
}

// mucchio d'ossa: teschi, femori, costole, vertebre e denti sparsi su una pozza di sangue
function t3MBones(B, v) {
  const R = B.R, P = () => [(R() - 0.5) * 0.46, (R() - 0.5) * 0.46];
  B.dec(5, 0.56, 0.56, [0, 0.002, 0], [-1.5708, 0, 0]);
  for (let i = 0; i < 6; i++) { const [x, z] = P(), a = R() * 6.28, L = 0.09 + R() * 0.08; B.bone([x, 0.012, z], [x + Math.cos(a) * L, 0.012 + R() * 0.02, z + Math.sin(a) * L]); }
  for (let i = 0; i < 3 + (v === 0 ? 1 : 0); i++) { const [x, z] = P(); B.skull([x, 0.055, z], 0.8 + R() * 0.3, [(R() - 0.5) * 1.2, R() * 6.28, (R() - 0.5) * 1.4], { jaw: R() * 0.5, c: i % 2 ? '#d8cbb0' : '#e6dbbd' }); }
  { const [x, z] = P(); B.ribs([x * 0.5, 0.06, z * 0.5], [1.2 + v * 0.3, v, 0.3], 4, 0.06); }
  { const [x, z] = P(); for (let k = 0; k < 7; k++) B.box('bone', [0.016, 0.012, 0.018], [x + k * 0.02, 0.01, z + Math.sin(k) * 0.01], '#e2d6b6', { r: [0, k * 0.2, 0] }); }
  for (let i = 0; i < 10; i++) { const [x, z] = P(); B.box('bone', [0.006, 0.01, 0.005], [x, 0.006, z], '#efe6cc', { r: [0, R() * 6, 0] }); }
  { const [x, z] = P(); B.hand([x, 0.012, z], [0, R() * 6, 0], 'bone', '#d8ccb0'); }
}

// urna funeraria con teschio in rilievo, coperchio scostato, candele e cenere
function t3MUrn(B) {
  const ST = '#b0a090';
  B.dec(5, 0.4, 0.4, [0, 0.002, 0.02], [-1.5708, 0, 0]);
  B.lat('stone', [[0.06, 0], [0.095, 0.05], [0.112, 0.14], [0.1, 0.24], [0.065, 0.3], [0.068, 0.335], [0.082, 0.358]], [0, 0, 0], ST, { w: 12 });
  B.tor('stone', [0.075, 0.008, 4, 12], [0, 0.358, 0], ST, { r: [1.5708, 0, 0] }); B.cyl('stone', [0.063, 0.063, 0.004, 12], [0, 0.352, 0], '#040201', { ao: false });
  for (const sx of [-1, 1]) B.tor('stone', [0.045, 0.011, 5, 10, 3.1416], [sx * 0.1, 0.2, 0], '#a09080', { r: [0, 0, sx * -1.5708] });
  B.skull([0, 0.17, 0.103], 0.55, [0, 0, 0]); B.box('stone', [0.003, 0.09, 0.003], [0.04, 0.17, 0.104], '#1a1410', { r: [0.1, 0, 0.4] });
  B.sph('stone', [0.08, 0.032, 0.08], [0.075, 0.372, 0.045], '#a89888', { w: 10, h: 5, r: [0, 0, 0.3] });
  B.cyl('bone', [0.025, 0.025, 0.005, 8], [-0.04, 0.36, -0.02], '#e0d4b4'); B.candle([-0.04, 0.362, -0.02], 0.05); B.candle([-0.065, 0.36, 0.03], 0.035, true);
  B.sph('stone', [0.1, 0.012, 0.1], [0.1, 0.006, 0.08], '#6a645c', { w: 8, h: 3 }); B.bone([0.12, 0.012, 0.1], [0.2, 0.012, 0.15]);
  for (let i = 0; i < 5; i++) B.box('bone', [0.007, 0.011, 0.006], [0.05 + i * 0.03, 0.007, 0.16 - (i % 2) * 0.05], '#efe6cc', { r: [0, i * 1.3, 0] });
}

// rastrelliera: telaio con teschi sui montanti, catene e manette, sangue; poi le armi di ogni modello
function t3MRack(B, n) {
  const W = '#8a7058', Wd = '#6a5240';
  for (const sx of [-1, 1]) { B.box('wood', [0.06, 0.04, 0.24], [sx * 0.24, 0.02, 0], Wd); B.box('wood', [0.046, 0.64, 0.046], [sx * 0.24, 0.35, 0], W, { sw: true }); B.skull([sx * 0.24, 0.72, 0], 0.55, [0, sx * -0.5, 0]); }
  B.box('wood', [0.56, 0.04, 0.05], [0, 0.62, 0], W); B.box('wood', [0.5, 0.03, 0.04], [0, 0.4, 0.035], Wd); B.box('wood', [0.5, 0.03, 0.04], [0, 0.16, 0.035], Wd);
  for (const sx of [-1, 1]) for (const y of [0.4, 0.16]) B.box('flesh', [0.052, 0.02, 0.052], [sx * 0.24, y, 0.02], '#3a2418');
  B.chain([0.17, 0.6, 0.03], [0.17, 0.46, 0.03], 5); B.tor('iron', [0.022, 0.006, 4, 8], [0.17, 0.43, 0.03], '#9a8a7e', { r: [0, 1.5708, 0] });
  B.dec(2, 0.2, 0.2, [-0.12, 0.54, 0.0285]);
  if (n === 'weaponRack') { B.sword(-0.17, 0.3, 0.012, 0.4, 0.05, true); B.sword(-0.09, 0.27, 0.012, 0.36, -0.03); B.mace(0, 0.1, 0.012, 0.42, 0.02); B.axe(0.08, 0.1, 0.012, 0.42, -0.04); B.spear(0.17, 0.1, 0.012, 0.6, 0.06, false); }
  else if (n === 'rackAxes') { for (const [x, L, rz] of [[-0.18, 0.42, 0.05], [-0.09, 0.4, -0.04], [0, 0.44, 0.03], [0.09, 0.38, -0.05]]) B.axe(x, 0.1, 0.012, L, rz); B.skull([0.19, 0.2, 0.07], 0.8, [0.2, 0.4, 0.2], { jaw: 0.3 }); B.axe(0.19, 0.2, 0.07, 0.26, 0.45); }
  else if (n === 'rackPolearms') { B.spear(-0.18, 0.08, 0.012, 0.72, 0.04, true); B.spear(-0.09, 0.08, 0.012, 0.68, -0.03, false); B.axe(0, 0.08, 0.012, 0.7, 0.02); B.spear(0.09, 0.08, 0.012, 0.66, -0.04, true); B.spear(0.18, 0.08, 0.012, 0.6, 0.05, false); }
  else if (n === 'rackSwords') { for (const [x, y, L, rz, bl] of [[-0.18, 0.3, 0.42, 0.04, 1], [-0.09, 0.28, 0.4, -0.03, 0], [0, 0.3, 0.2, 0.02, 1], [0.09, 0.27, 0.36, 0.05, 0], [0.18, 0.3, 0.42, -0.04, 1]]) B.sword(x, y, 0.012, L, rz, bl); }
  else { B.shield(-0.12, 0.28, 0.032, 0.115, 0.1, 0); B.shield(0.12, 0.28, 0.032, 0.115, -0.1, 1); B.shield(0, 0.5, 0.04, 0.095, 0.05, 2); }
}

// armature sullo stand: pezzi di ferro arrugginito su cadaveri, scheletri e ragnatele
function t3Armor(B, n) {
  const R = B.R, IR = '#c89a78', IR2 = '#b08a6c', IR3 = '#94785f', WD = '#8e7258', BONE = '#e2d6b6';
  const stand = () => {
    B.cyl('wood', [0.17, 0.19, 0.035, 10], [0, 0.0175, 0], '#8a7058'); B.box('wood', [0.04, 0.64, 0.04], [0, 0.35, -0.012], WD, { sw: true });
    B.box('wood', [0.36, 0.03, 0.035], [0, 0.61, -0.012], WD); B.box('wood', [0.2, 0.026, 0.03], [0, 0.33, -0.012], WD);
  };
  const helm = (y) => {   // elmo chiuso con la feritoia nera; sotto si vede la mandibola
    B.cyl('iron', [0.07, 0.076, 0.15, 12], [0, y, 0], IR2); B.sph('iron', [0.07, 0.045, 0.07], [0, y + 0.072, 0], IR, { w: 12, h: 6 }); B.tor('iron', [0.074, 0.006, 4, 12], [0, y - 0.074, 0], IR3, { r: [1.5708, 0, 0] });
    B.box('iron', [0.088, 0.013, 0.012], [0, y + 0.012, 0.068], '#0a0604'); B.box('iron', [0.012, 0.08, 0.012], [0, y - 0.016, 0.071], '#0a0604');
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) B.box('iron', [0.007, 0.007, 0.01], [sx * 0.03, y - 0.035 - i * 0.017, 0.073], '#0a0604');
    B.box('bone', [0.05, 0.02, 0.04], [0, y - 0.095, 0.03], BONE); for (let i = -2; i <= 2; i++) B.box('bone', [0.0075, 0.011, 0.006], [i * 0.0095, y - 0.086, 0.052], '#efe6cc');
  };
  const gorget = () => B.cyl('iron', [0.05, 0.058, 0.05, 10], [0, 0.69, 0], IR3);
  const belt = () => {
    for (const [y, w] of [[0.385, 0.25], [0.36, 0.265], [0.335, 0.27]]) B.box('iron', [w, 0.03, 0.17], [0, y, 0], IR2);
    B.box('flesh', [0.27, 0.022, 0.175], [0, 0.405, 0], '#3a2418'); B.box('iron', [0.04, 0.03, 0.01], [0, 0.405, 0.09], '#a89868');
  };
  const torso = (k) => {
    if (k === 'plate') { B.sph('iron', [0.135, 0.17, 0.085], [0, 0.5, 0.012], IR, { w: 12, h: 8 }); B.sph('iron', [0.125, 0.165, 0.075], [0, 0.5, -0.045], IR3, { w: 12, h: 8 }); B.box('iron', [0.012, 0.28, 0.02], [0, 0.5, 0.092], IR); belt(); }
    else if (k === 'half') {   // mezza corazza: dall'altra parte si vedono costole e cuore
      B.sph('iron', [0.125, 0.165, 0.075], [0, 0.5, -0.045], IR3, { w: 12, h: 8 }); B.sph('iron', [0.07, 0.17, 0.085], [-0.07, 0.5, 0.012], IR, { w: 10, h: 8 });
      B.ribs([0, 0.4, 0], [0, 0, 0], 5, 0.1); B.sph('flesh', [0.032, 0.04, 0.03], [0.025, 0.5, 0.02], '#8a2a32', { w: 7, h: 6 }); belt();
    } else { B.ribs([0, 0.39, 0], [0, 0, 0], 6, 0.105); B.sph('flesh', [0.05, 0.06, 0.035], [0, 0.5, -0.02], '#5a1a22', { w: 7, h: 6 }); B.box('bone', [0.12, 0.03, 0.06], [0, 0.34, 0], BONE); }
  };
  const pauld = (spk, only) => {
    for (const sx of [-1, 1]) {
      if (only && sx !== only) continue;
      B.sph('iron', [0.078, 0.056, 0.078], [sx * 0.165, 0.63, 0], IR, { w: 10, h: 6 });
      for (let i = 0; i < 3; i++) B.box('iron', [0.15 - i * 0.012, 0.016, 0.1 - i * 0.008], [sx * (0.17 + i * 0.004), 0.605 - i * 0.02, 0], i % 2 ? IR3 : IR2, { r: [0, 0, sx * -0.3] });
      if (spk) B.cone('iron', [0.016, 0.07, 6], [sx * 0.175, 0.69, 0], IR3, { r: [0, 0, sx * -0.25] });
    }
  };
  const arm = (sx, k) => {
    const s = [sx * 0.17, 0.62, 0], e = [sx * 0.2, 0.5, 0.02], w = [sx * 0.19, 0.38, 0.05];
    if (k === 'plate') { B.seg('iron', s, e, 0.032, 0.028, IR2, 8); B.sph('iron', 0.03, e, IR, { w: 7, h: 5 }); B.seg('iron', e, w, 0.028, 0.025, IR3, 8); B.box('iron', [0.042, 0.04, 0.046], [w[0], w[1] - 0.02, w[2]], IR2); }
    else { B.bone(s, e, BONE, 0.009); B.bone(e, w, BONE, 0.008); B.hand([w[0], w[1] - 0.01, w[2] + 0.005], [1.4, 0, 0], 'bone', BONE); }
  };
  const legs = (k) => {
    for (const sx of [-1, 1]) {
      const h = [sx * 0.06, 0.34, 0], kn = [sx * 0.06, 0.2, 0.01], an = [sx * 0.06, 0.06, 0.012];
      if (k === 'greave') { B.seg('iron', h, kn, 0.046, 0.04, IR2, 8); B.sph('iron', [0.045, 0.04, 0.045], kn, IR, { w: 7, h: 5 }); B.seg('iron', kn, an, 0.04, 0.034, IR3, 8); B.box('iron', [0.064, 0.035, 0.11], [sx * 0.06, 0.05, 0.035], IR2); }
      else { B.bone(h, kn, BONE, 0.013); B.bone(kn, an, BONE, 0.011); B.box('bone', [0.045, 0.014, 0.085], [sx * 0.06, 0.042, 0.03], BONE); }
    }
  };
  stand();
  if (n === 'armorRusty') { legs('greave'); torso('plate'); pauld(false); gorget(); arm(-1, 'plate'); arm(1, 'plate'); helm(0.76); B.dec(2, 0.11, 0.17, [0, 0.46, 0.0995]); B.dec(0, 0.09, 0.09, [-0.06, 0.53, 0.0985]); }
  else if (n === 'armorShield') {
    legs('greave'); torso('plate'); pauld(false); gorget(); arm(1, 'plate'); arm(-1, 'plate'); helm(0.76);
    for (const sx of [-1, 1]) B.cone('bone', [0.018, 0.1, 6], [sx * 0.08, 0.83, 0], '#d8ccb0', { r: [0, 0, sx * -0.9] });
    B.shield(-0.21, 0.46, 0.07, 0.12, 0.15, 0); B.sword(0.19, 0.33, 0.06, 0.28, 3.0916, true);
  } else if (n === 'armorHalberd') {
    legs('greave'); torso('plate'); pauld(false); gorget(); arm(-1, 'plate'); arm(1, 'plate'); helm(0.76);
    B.axe(0.215, 0.02, 0.05, 0.78, 0); B.skull([0.215, 0.85, 0.05], 0.65, [0.2, 0.5, 0.1], { jaw: 0.5, c: '#cbbd9c' }); B.dec(2, 0.11, 0.17, [0.03, 0.46, 0.0995]);
  } else if (n === 'armorTabard') {
    legs('greave'); torso('plate'); pauld(false); gorget(); arm(-1, 'plate'); arm(1, 'plate');
    B.sph('flesh', [0.085, 0.09, 0.085], [0, 0.775, -0.012], '#34241e', { w: 10, h: 8 }); B.skull([0, 0.77, 0.02], 1.05, [0, 0, 0], { jaw: 0.25 });
    B.box('flesh', [0.17, 0.3, 0.012], [0, 0.47, 0.104], '#5e2a26');
    for (let i = -2; i <= 2; i++) { const L = 0.06 + R() * 0.1; B.box('flesh', [0.032, L, 0.01], [i * 0.034, 0.32 - L / 2, 0.104], '#5e2a26', { r: [0, 0, (R() - 0.5) * 0.15] }); }
    B.dec(3, 0.11, 0.11, [0, 0.5, 0.1105]); B.dec(2, 0.12, 0.16, [0.02, 0.4, 0.1108]);
  } else if (n === 'armorPartial') {
    legs('bone'); torso('half'); pauld(false, -1); arm(-1, 'plate'); arm(1, 'bone'); B.skull([0, 0.76, 0], 1, [0.1, 0, 0.1], { jaw: 0.5 });
    B.guts([0.03, 0.44, 0.07], [-0.04, 0.3, 0.075], 9, 0.018); B.dec(5, 0.6, 0.6, [0, 0.003, 0.1], [-1.5708, 0, 0]);
  } else if (n === 'armorLegs') {
    legs('greave'); B.box('iron', [0.25, 0.03, 0.17], [0, 0.335, 0], IR2); B.box('flesh', [0.24, 0.03, 0.1], [0, 0.358, 0], '#3a2418');
    B.cone('wood', [0.02, 0.08, 5], [0, 0.7, -0.012], WD); B.skull([0, 0.77, -0.012], 0.9, [0, 0.3, 0], { c: '#cbbd9c', jaw: 0.15 });
    arm(1, 'plate'); B.chain([-0.17, 0.6, -0.012], [-0.17, 0.4, -0.012], 8); B.tor('iron', [0.022, 0.006, 4, 8], [-0.17, 0.375, -0.012], '#9a8a7e', { r: [0, 1.5708, 0] });
    B.dec(5, 0.6, 0.6, [0, 0.003, 0.05], [-1.5708, 0, 0]);
  } else if (n === 'armorShoulders') {
    pauld(true); B.skull([0, 0.77, 0], 1.05, [0, 0, 0], { jaw: 0.1 });
    for (let i = 0; i < 5; i++) { const L = 0.16 + R() * 0.14; B.box('flesh', [0.05, L, 0.012], [(i - 2) * 0.06, 0.6 - L / 2, 0.06], '#4a2a24', { r: [0, 0, (R() - 0.5) * 0.12] }); }
    B.chain([-0.17, 0.58, 0.09], [0.17, 0.58, 0.09], 10); B.skull([0, 0.5, 0.1], 0.45, [0, 0, 0]);
  } else if (n === 'armorBreast') {
    torso('half'); B.skull([0, 0.76, 0], 1, [0, 0, 0], { jaw: 0.7 }); arm(-1, 'plate'); B.dec(2, 0.11, 0.17, [-0.07, 0.46, 0.0995]); B.dec(5, 0.5, 0.5, [0, 0.003, 0.08], [-1.5708, 0, 0]);
  } else if (n === 'armorEmpty') {
    B.seg('wood', [0.08, 0.6, -0.012], [0.08, 0.46, 0], 0.005, 0.005, '#a8946a', 5); B.tor('wood', [0.03, 0.005, 4, 10], [0.08, 0.43, 0], '#a8946a'); B.sph('wood', 0.012, [0.08, 0.46, 0], '#a8946a', { w: 6, h: 5 });
    B.dec(0, 0.07, 0.07, [0, 0.45, 0.0085]); B.dec(0, 0.06, 0.06, [0.005, 0.3, 0.0085]); B.dec(5, 0.6, 0.6, [0.04, 0.003, 0.1], [-1.5708, 0, 0]);
    for (let i = 0; i < 9; i++) B.box('bone', [0.007, 0.011, 0.006], [(R() - 0.5) * 0.4, 0.007, (R() - 0.5) * 0.4 + 0.1], '#efe6cc', { r: [0, R() * 6, 0] });
  } else if (n === 'armorWeb') {
    B.sph('bone', [0.1, 0.19, 0.09], [0, 0.47, 0], '#d8d4c8', { w: 10, h: 8 });
    for (let i = 0; i < 6; i++) { const y = 0.34 + i * 0.05, r = 0.1 * Math.sqrt(Math.max(0.05, 1 - Math.pow((y - 0.47) / 0.19, 2))) + 0.004; B.tor('bone', [r, 0.004, 4, 12], [0, y, 0], '#c8c4b6', { r: [1.5708 + 0.15 * (i % 2 ? 1 : -1), 0, 0], s: [1, 0.9, 1] }); }
    B.skull([0, 0.7, 0.015], 0.95, [0.2, 0, 0.1], { jaw: 0.2 });
    for (const [a, b] of [[[-0.17, 0.6, -0.01], [-0.07, 0.5, 0.04]], [[0.17, 0.6, -0.01], [0.07, 0.5, 0.04]], [[-0.15, 0.04, 0.1], [-0.07, 0.38, 0.05]], [[0.15, 0.04, 0.1], [0.07, 0.38, 0.05]]]) B.seg('bone', a, b, 0.002, 0.002, '#e8e8e0', 4);
    B.dec(6, 0.3, 0.3, [-0.03, 0.46, 0.0955]); B.add('decal', new THREE.PlaneGeometry(0.3, 0.3), [0.03, 0.46, 0.0965], '#ffffff', { dc: 6, ao: false, s: [-1, 1, 1] });
  } else {   // armorBroken: stand spezzato e rovesciato, pezzi sparsi sul pavimento
    B.dec(5, 0.6, 0.6, [0, 0.003, 0.05], [-1.5708, 0, 0]);
    B.seg('wood', [-0.2, 0.04, 0.15], [0.18, 0.06, 0.28], 0.02, 0.02, WD, 6); B.box('wood', [0.3, 0.03, 0.035], [-0.05, 0.025, -0.18], WD, { r: [0, 0.5, 0.1] });
    B.cyl('iron', [0.07, 0.076, 0.15, 12], [0.2, 0.08, -0.1], IR2, { r: [1.5708, 0.5, 0] }); B.skull([0.06, 0.05, -0.12], 0.9, [1.2, 0.8, 0.3], { jaw: 0.4 });
    B.sph('iron', [0.135, 0.17, 0.085], [-0.14, 0.07, -0.08], IR, { w: 10, h: 8, r: [1.3, 0.2, 0.3] }); B.bone([0.0, 0.012, 0.0], [0.14, 0.012, 0.12]); B.hand([-0.1, 0.01, 0.1], [0, 0.9, 0], 'bone', BONE);
  }
}

// lampadario: anello di ferro con candele, teschio appeso e catene (si appende al soffitto, y = 1)
function t3MChand(B) {
  B.chain([0, 0.88, 0], [0, 1, 0], 4, '#6a625c'); B.chain([0, 0.88, 0], [0, 0.72, 0], 7, '#6a625c');
  B.tor('iron', [0.18, 0.012, 5, 18], [0, 0.78, 0], '#8a7a70', { r: [1.5708, 0, 0] });
  for (let i = 0; i < 6; i++) { const a = i * 1.0472, x = Math.cos(a) * 0.18, z = Math.sin(a) * 0.18; B.seg('iron', [x, 0.78, z], [0, 0.88, 0], 0.004, 0.004, '#7a6a60', 4); B.candle([x, 0.79, z], 0.055); }
  B.skull([0, 0.66, 0], 0.7, [0, 0.4, 0], { jaw: 0.3 });
}

function t3PropBuild(B, n, v) {
  if (/^armor/.test(n)) t3Armor(B, n);
  else if (/^rack|^weaponRack/.test(n)) t3MRack(B, n);
  else if (n === 'barrel') t3MBarrel(B);
  else if (n === 'urn') t3MUrn(B);
  else if (n === 'bones') t3MBones(B, v);
  else if (n === 'chest') t3MChest(B);
  else t3MCrate(B, v);
}

function t3Props(q) {   // oggetti di scena horror: armature, rastrelliere, casse, barili, bauli, ossa, urne
  const g = new THREE.Group(), n = q.type === 'deco' ? DECOR[0][q.k].n : q.type, hs = Math.abs(Math.floor(q.x * 7.3 + q.y * 11.1));
  if (n === 'xbarrel') {
    for (const [geo, c, y] of [[new THREE.CylinderGeometry(0.17, 0.17, 0.5, 10), '#8a2418', 0.25], [new THREE.CylinderGeometry(0.175, 0.175, 0.05, 10), '#e0b020', 0.3]]) { const o = new THREE.Mesh(geo, t3Mat(c)); o.position.y = y; g.add(o); }
  } else {
    const vr = n === 'crate' ? hs % 4 : n === 'bones' ? hs % 3 : 0;   // variante stabile per ogni oggetto
    for (const p of t3PropGeo(n + '#' + vr, B => t3PropBuild(B, n, vr))) g.add(new THREE.Mesh(p.g, p.m));
    g.userData.brk = n + '#' + vr; g.userData.nm = n;   // serve a spezzarlo quando viene distrutto
    if (n === 'chest') {   // il coperchio ruota sulla cerniera sul retro (t3Sync lo apre)
      const lid = new THREE.Group(); lid.position.set(0, 0.2, -0.15);
      for (const p of t3PropGeo('chestLid', t3MChestLid, 0.2)) lid.add(new THREE.Mesh(p.g, p.m));
      g.add(lid); g.userData.lid = lid;
    }
  }
  if (q.flip) g.rotation.y = Math.PI; g.rotation.y += (q.x * 7.3 + q.y * 3.1) % 1.2;
  return g;
}

// =====================================================================================================================
// RACCOGLIBILI 3D: medikit, munizioni (una cassetta per ogni arma), armi e armature (cuoio, ferro, oro, rubino)
// =====================================================================================================================
function t3PickModel(B, key) {
  const bottle = (x, y, z, s, r, fl, lb) => B.in([x, y, z], r, [s, s, s], () => {   // bottiglia molotov: straccio nel collo, fiamma, etichetta col teschio
    B.lat('stone', [[0.001, -0.09], [0.04, -0.09], [0.048, -0.075], [0.05, 0], [0.045, 0.03], [0.022, 0.06], [0.016, 0.075], [0.017, 0.1], [0.001, 0.1]], [0, 0, 0], '#4a9a50', { w: 10 });
    B.cyl('flesh', [0.017, 0.015, 0.045, 6], [0, 0.11, 0], '#eadfc0');
    if (lb) B.skull([0, -0.02, 0.05], 0.3, [0, 0, 0]);
    if (fl) { B.cone('flame', [0.014, 0.05, 6], [0, 0.16, 0], '#ff9a20', { ao: false }); B.cone('flame', [0.007, 0.03, 5], [0, 0.155, 0], '#fff0b0', { ao: false }); }
  });
  const gren = (x, y, z, s) => B.in([x, y, z], null, [s, s, s], () => {   // granata a ananas con spoletta, leva e anello
    B.sph('iron', [0.05, 0.058, 0.05], [0, 0, 0], '#7a8a5a', { w: 10, h: 8 });
    for (const yy of [-0.03, 0, 0.03]) B.tor('iron', [0.05 * Math.sqrt(1 - Math.pow(yy / 0.058, 2)) + 0.002, 0.004, 4, 12], [0, yy, 0], '#5a6a40', { r: [1.5708, 0, 0] });
    B.cyl('iron', [0.014, 0.016, 0.03, 8], [0, 0.065, 0], '#8a8a82'); B.box('iron', [0.012, 0.05, 0.004], [0.02, 0.055, 0], '#9a9a92', { r: [0, 0, -0.15] }); B.tor('iron', [0.014, 0.003, 4, 8], [0.032, 0.07, 0], '#c8c8c0');
  });
  const ammoBox = (w) => {   // cassetta di legno con fasce di ferro e, sopra, le munizioni dell'arma
    B.box('wood', [0.17, 0.09, 0.11], [0, -0.03, 0], '#c8b090'); B.box('wood', [0.15, 0.004, 0.09], [0, 0.0155, 0], '#120a05', { ao: false });
    for (const sx of [-1, 1]) B.box('iron', [0.012, 0.094, 0.114], [sx * 0.06, -0.03, 0], '#a08a7a');
    B.dec(2, 0.05, 0.08, [0.03, -0.03, 0.0556]);
    if (w === 1) { for (const x of [-0.05, 0, 0.05]) for (const z of [-0.025, 0.025]) { B.cyl('flesh', [0.011, 0.011, 0.045, 7], [x, 0.036, z], '#b8402a'); B.cyl('iron', [0.0115, 0.0115, 0.012, 7], [x, 0.016, z], '#e0b040'); } }
    else if (w === 2) { for (const z of [-0.03, 0, 0.03]) { B.box('iron', [0.032, 0.075, 0.014], [0, 0.045, z], '#4a4a50', { r: [0, 0, 0.1] }); B.box('iron', [0.02, 0.012, 0.01], [0.007, 0.088, z], '#e0b040'); } }
    else if (w === 3) { for (const z of [-0.026, 0.026]) { B.cyl('iron', [0.018, 0.018, 0.2, 8], [0, 0.04, z], '#7a8a62', { r: [0, 0, 1.5708] }); B.cone('iron', [0.018, 0.045, 8], [0.12, 0.04, z], '#b8402a', { r: [0, 0, -1.5708] }); B.box('iron', [0.025, 0.036, 0.003], [-0.09, 0.04, z], '#5a6a48'); B.box('iron', [0.025, 0.003, 0.036], [-0.09, 0.04, z], '#5a6a48'); } }
    else if (w === 4) { bottle(-0.04, 0.06, 0, 0.7, null, true, true); bottle(0.04, 0.06, 0.01, 0.7, [0, 0.5, 0], false, false); }
    else if (w === 5) { gren(-0.05, 0.045, 0, 0.7); gren(0.01, 0.045, -0.02, 0.7); gren(0.05, 0.045, 0.03, 0.7); }
    else if (w === 6) { B.box('iron', [0.07, 0.09, 0.035], [-0.03, 0.06, 0], '#b8402a'); B.tor('iron', [0.02, 0.004, 4, 8, 3.1416], [-0.03, 0.105, 0], '#6a6a64'); B.seg('iron', [0, 0.09, 0], [0.035, 0.115, 0], 0.008, 0.006, '#8a8a82', 6); B.box('iron', [0.05, 0.07, 0.03], [0.05, 0.05, 0.015], '#a03828'); }
    else { for (const x of [-0.05, 0, 0.05]) { B.cyl('iron', [0.018, 0.018, 0.012, 8], [x, 0.02, 0], '#3a3a44'); B.cyl('glow', [0.013, 0.013, 0.05, 8], [x, 0.05, 0], '#4dff6a', { ao: false }); B.cyl('iron', [0.018, 0.018, 0.012, 8], [x, 0.08, 0], '#3a3a44'); } }
  };
  const armorModel = (t) => {   // corazza con spallacci: cuoio borchiato, ferro, oro, rubino
    const C = [['flesh', '#b07a45', '#8a5a30'], ['iron', '#d0d8e0', '#98a0a8'], ['iron', '#f4d040', '#c8a020'], ['iron', '#d04058', '#8a0f28']][t], k = C[0], c1 = C[1], c2 = C[2];
    B.sph(k, [0.1, 0.12, 0.06], [0, 0, 0.02], c1, { w: 12, h: 8 }); B.sph(k, [0.095, 0.115, 0.05], [0, 0, -0.04], c2, { w: 12, h: 8 });
    B.box(t >= 2 ? 'glow' : 'iron', [0.01, 0.2, 0.012], [0, 0, 0.078], t === 2 ? '#d8a820' : t === 3 ? '#a01830' : '#a8a8a0', { ao: false });
    B.cyl(k, [0.05, 0.06, 0.04, 10], [0, 0.13, 0], c2);
    for (const sx of [-1, 1]) {
      B.sph(k, [0.06, 0.045, 0.06], [sx * 0.125, 0.095, 0], c1, { w: 10, h: 6 }); B.box(k, [0.1, 0.014, 0.07], [sx * 0.13, 0.065, 0], c2, { r: [0, 0, sx * -0.35] });
      if (t === 3) B.cone('iron', [0.014, 0.06, 6], [sx * 0.14, 0.14, 0], c2, { r: [0, 0, sx * -0.3] });
    }
    for (const [y, w, i] of [[-0.11, 0.2, 0], [-0.14, 0.21, 1], [-0.17, 0.2, 0]]) B.box(k, [w, 0.03, 0.12], [0, y, 0], i ? c2 : c1);
    if (t === 3) B.sph('glow', [0.02, 0.03, 0.01], [0, 0.03, 0.085], '#ff4a68', { ao: false }); else B.skull([0, 0.04, 0.088], 0.42, [0, 0, 0]);
    if (t === 0) for (let i = 0; i < 6; i++) B.sph('iron', 0.006, [(i % 2 ? 1 : -1) * 0.05, 0.08 - Math.floor(i / 2) * 0.05, 0.078], '#a8a8a0', { w: 5, h: 4 });
  };
  const k = String(key);
  if (k === 'med') {   // medikit col crocione rosso e una macchia di sangue
    B.in([0, 0, 0], null, [1.3, 1.3, 1.3], () => {
      B.box('bone', [0.2, 0.13, 0.1], [0, 0, 0], '#f2f2ee'); B.box('iron', [0.05, 0.012, 0.03], [0, 0.071, 0], '#8a8a82'); B.box('iron', [0.012, 0.03, 0.104], [-0.07, 0, 0], '#a8a8a0'); B.box('iron', [0.012, 0.03, 0.104], [0.07, 0, 0], '#a8a8a0');
      for (const z of [-0.0512, 0.0512]) { B.box('glow', [0.1, 0.03, 0.004], [0, 0.005, z], '#d01818', { ao: false }); B.box('glow', [0.03, 0.1, 0.004], [0, 0.005, z], '#d01818', { ao: false }); }
      B.dec(1, 0.08, 0.08, [0.05, -0.03, 0.0525]);
    });
  } else if (k.startsWith('ammo')) B.in([0, -0.02, 0], null, [1.4, 1.4, 1.4], () => ammoBox(+k.slice(4)));
  else if (k.startsWith('arm')) B.in([0, 0, 0], null, [0.85, 0.85, 0.85], () => armorModel(+k.slice(3)));
  else {
    const w = +k, W = (s, dx, dy, f) => B.in([dx * s, dy * s, 0], null, [s, s, s], f);
    if (w === 1) W(0.75, 0.05, 0, () => {   // fucile a canne mozze affiancate
      for (const z of [-0.012, 0.012]) B.cyl('iron', [0.011, 0.011, 0.26, 8], [0.04, 0.01, z], '#8a8880', { r: [0, 0, 1.5708] });
      B.box('iron', [0.26, 0.004, 0.01], [0.04, 0.01, 0], '#6a6a64'); B.box('iron', [0.07, 0.046, 0.04], [-0.1, 0, 0], '#6a6a64');
      B.seg('wood', [-0.13, 0.01, 0], [-0.26, -0.03, 0], 0.018, 0.028, '#b08a60', 6); B.box('iron', [0.012, 0.07, 0.04], [-0.265, -0.03, 0], '#6a6a64', { r: [0, 0, 0.3] });
      B.box('wood', [0.09, 0.03, 0.04], [0.02, -0.022, 0], '#b08a60'); B.tor('iron', [0.016, 0.003, 4, 8, 3.1416], [-0.085, -0.024, 0], '#6a6a64', { r: [0, 0, 3.1416] });
      B.dec(1, 0.07, 0.07, [0.06, 0.0, 0.0262], [0, 0, 0]);
    });
    else if (w === 2) W(0.9, 0.015, 0, () => {   // mitra con caricatore, calcio a filo e impugnatura
      B.box('iron', [0.16, 0.045, 0.036], [0, 0, 0], '#55555a'); B.cyl('iron', [0.008, 0.008, 0.1, 6], [0.13, 0.008, 0], '#6a6a70', { r: [0, 0, 1.5708] }); B.cyl('iron', [0.014, 0.014, 0.07, 8], [0.07, 0.008, 0], '#4a4a50', { r: [0, 0, 1.5708] });
      B.box('iron', [0.008, 0.016, 0.006], [0.17, 0.022, 0], '#8a8a82'); B.box('iron', [0.12, 0.01, 0.02], [0, 0.026, 0], '#6a6a70');
      for (const z of [-0.012, 0.012]) B.seg('iron', [-0.08, 0.01, z], [-0.2, -0.02, z], 0.004, 0.004, '#8a8a82', 5);
      B.box('iron', [0.01, 0.05, 0.036], [-0.2, -0.02, 0], '#6a6a70'); B.box('iron', [0.03, 0.09, 0.024], [0.0, -0.065, 0], '#3a3a40', { r: [0, 0, 0.12] });
      B.seg('wood', [-0.05, -0.02, 0], [-0.07, -0.08, 0], 0.014, 0.012, '#4a3226', 6); B.tor('iron', [0.016, 0.003, 4, 8, 3.1416], [-0.02, -0.024, 0], '#6a6a70', { r: [0, 0, 3.1416] });
    });
    else if (w === 3) W(0.72, 0.02, 0, () => {   // lanciarazzi: tubo, razzo con la punta rossa, svasatura posteriore
      B.cyl('iron', [0.036, 0.036, 0.32, 10], [0, 0, 0], '#7a8a62', { r: [0, 0, 1.5708] }); B.cone('iron', [0.03, 0.08, 8], [0.2, 0, 0], '#b8402a', { r: [0, 0, -1.5708] });
      B.cyl('iron', [0.046, 0.036, 0.05, 10], [-0.18, 0, 0], '#5a6a48', { r: [0, 0, 1.5708] }); B.box('iron', [0.03, 0.08, 0.03], [-0.02, -0.06, 0], '#4a4a50', { r: [0, 0, 0.2] });
      B.box('iron', [0.05, 0.03, 0.02], [0.03, 0.05, 0], '#6a6a64'); B.tor('iron', [0.038, 0.004, 4, 12], [-0.06, 0, 0], '#4a5a3a', { r: [0, 1.5708, 0] }); B.tor('iron', [0.038, 0.004, 4, 12], [0.08, 0, 0], '#4a5a3a', { r: [0, 1.5708, 0] });
    });
    else if (w === 4) W(1.2, 0, -0.05, () => bottle(0, 0, 0, 1, null, true, true));
    else if (w === 5) W(1.6, 0, -0.01, () => gren(0, 0, 0, 1));
    else if (w === 6) W(0.8, -0.04, 0, () => {   // lanciafiamme: serbatoio rosso, ugello con fiamma pilota
      B.cyl('iron', [0.045, 0.045, 0.2, 10], [-0.06, 0.02, 0], '#b8402a', { r: [0, 0, 1.5708] }); B.box('iron', [0.1, 0.04, 0.036], [0.06, -0.02, 0], '#4a4a50');
      B.seg('iron', [0.11, -0.02, 0], [0.2, -0.02, 0], 0.012, 0.01, '#6a6a70', 6); B.cone('flame', [0.012, 0.04, 6], [0.225, -0.02, 0], '#ff9a20', { r: [0, 0, -1.5708], ao: false }); B.cone('flame', [0.006, 0.025, 5], [0.222, -0.02, 0], '#fff0b0', { r: [0, 0, -1.5708], ao: false });
      for (const x of [-0.1, -0.02]) B.tor('iron', [0.046, 0.004, 4, 12], [x, 0.02, 0], '#8a8a82', { r: [0, 1.5708, 0] });
      B.tor('iron', [0.04, 0.006, 4, 10, 3.1416], [0.0, 0.0, 0], '#2a2a2e', { r: [0, 0, 3.1416] }); B.seg('wood', [0.04, -0.04, 0], [0.03, -0.1, 0], 0.014, 0.012, '#4a3226', 6); B.cyl('iron', [0.012, 0.012, 0.02, 6], [-0.16, 0.02, 0], '#8a8a82', { r: [0, 0, 1.5708] });
    });
    else W(1.15, -0.05, 0, () => {   // pistola al plasma: cella verde luminosa, bobine sulla canna
      B.box('iron', [0.15, 0.05, 0.04], [0, 0, 0], '#3a3a44'); B.cyl('iron', [0.014, 0.018, 0.1, 8], [0.12, 0, 0], '#2a2a32', { r: [0, 0, 1.5708] });
      for (const x of [0.09, 0.12, 0.15]) B.tor('glow', [0.02, 0.004, 4, 10], [x, 0, 0], '#4dff6a', { r: [0, 1.5708, 0], ao: false });
      B.sph('glow', 0.012, [0.178, 0, 0], '#9dffb0', { w: 6, h: 5, ao: false }); B.cyl('glow', [0.022, 0.022, 0.08, 8], [-0.01, 0.04, 0], '#4dff6a', { r: [0, 0, 1.5708], ao: false });
      for (const x of [-0.05, 0.03]) B.cyl('iron', [0.026, 0.026, 0.01, 8], [x, 0.04, 0], '#2a2a32', { r: [0, 0, 1.5708] });
      B.box('iron', [0.035, 0.08, 0.03], [-0.04, -0.06, 0], '#2a2a32', { r: [0, 0, 0.2] }); for (let i = 0; i < 3; i++) B.box('iron', [0.012, 0.01, 0.042], [-0.02 + i * 0.02, -0.02, 0], '#6a6a70');
    });
  }
}
function t3Pickup(key) {
  const g = new THREE.Group();
  for (const p of t3PropGeo('pk_' + key, B => t3PickModel(B, key), 0.5)) g.add(new THREE.Mesh(p.g, p.m));
  if (typeof SH !== 'undefined' && SH.haloW) {   // alone luminoso (verde per il medikit, oro per il resto): resta visibile anche da lontano
    const tx = T3.haloTex || (T3.haloTex = new THREE.CanvasTexture(SH.haloW)), hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: key === 'med' ? 0x50ff78 : 0xffc83c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.45 }));
    hl.scale.set(0.6, 0.6, 1); g.add(hl); g.userData.halo = hl;
  }
  return g;
}

// =====================================================================================================================
// ROTTURA DEGLI OGGETTI DI SCENA: i pezzi del modello volano via, nuvole di polvere, macerie sul pavimento, schegge del gioco
// =====================================================================================================================
function t3MRubble(B, c) {   // macerie per categoria (legno, botte, armatura, rastrelliera, ossa, urna)
  const R = B.R, P = (r) => { const a = R() * 6.28, d = Math.sqrt(R()) * r; return [Math.cos(a) * d, Math.sin(a) * d]; };
  const pl = (k, d, col, r) => { const [x, z] = P(r); B.box(k, d, [x, d[1] / 2 + R() * 0.006, z], col, { r: [0, R() * 6.28, (R() - 0.5) * 0.5] }); };
  const WD = ['#d8c4a4', '#bca486', '#a88e72'], IR = ['#c89a78', '#94785f', '#b08a6c'], bn = (r) => { const [x, z] = P(r), a = R() * 6.28; B.bone([x, 0.01, z], [x + Math.cos(a) * 0.09, 0.012, z + Math.sin(a) * 0.09]); };
  const teeth = (n) => { for (let i = 0; i < n; i++) { const [x, z] = P(0.22); B.box('bone', [0.007, 0.011, 0.006], [x, 0.006, z], '#efe6cc', { r: [0, R() * 6, 0] }); } };
  if (c === 'armor') {
    for (let i = 0; i < 5; i++) pl('iron', [0.05 + R() * 0.05, 0.012, 0.04 + R() * 0.04], IR[i % 3], 0.22);
    { const [x, z] = P(0.18); B.sph('iron', [0.06, 0.035, 0.06], [x, 0.02, z], '#b08a6c', { w: 8, h: 4, r: [0.5, R() * 6, 0.3] }); }
    bn(0.2); bn(0.2); { const [x, z] = P(0.15); B.skull([x, 0.035, z], 0.7, [R() - 0.5, R() * 6, R() - 0.5], { jaw: 0.4 }); }
    pl('wood', [0.2, 0.02, 0.03], WD[0], 0.2); B.dec(5, 0.45, 0.45, [0, 0.002, 0], [-1.5708, 0, 0]);
  } else if (c === 'barrel') {
    for (let i = 0; i < 6; i++) pl('wood', [0.02 + R() * 0.01, 0.014, 0.15 + R() * 0.08], WD[i % 3], 0.2);
    for (const x of [-0.06, 0.07]) B.tor('iron', [0.15, 0.011, 4, 14], [x, 0.014, (R() - 0.5) * 0.1], '#b09888', { r: [1.5708 + (R() - 0.5) * 0.2, 0, (R() - 0.5) * 0.2] });
    B.dec(5, 0.5, 0.5, [0, 0.002, 0], [-1.5708, 0, 0]);
  } else if (c === 'rack') {
    for (let i = 0; i < 4; i++) pl('wood', [0.14 + R() * 0.1, 0.016, 0.035], WD[i % 3], 0.2);
    pl('wood', [0.04, 0.04, 0.2], '#8a7058', 0.15); pl('iron', [0.14, 0.006, 0.024], '#b8aca0', 0.2); pl('iron', [0.09, 0.006, 0.024], '#b8aca0', 0.2);
    { const [x, z] = P(0.15); B.skull([x, 0.035, z], 0.55, [R() - 0.5, R() * 6, R() - 0.5]); } B.dec(2, 0.2, 0.2, [0, 0.002, 0], [-1.5708, 0, 0]);
  } else if (c === 'bones') {
    for (let i = 0; i < 5; i++) bn(0.2); { const [x, z] = P(0.16); B.box('bone', [0.05, 0.016, 0.04], [x, 0.01, z], '#e2d6b6', { r: [0, R() * 6, 0] }); }
    for (let i = 0; i < 2; i++) { const [x, z] = P(0.15); B.sph('bone', [0.04, 0.03, 0.04], [x, 0.016, z], '#d8cbb0', { w: 7, h: 4, r: [R(), R() * 6, 0] }); }
    teeth(8); B.cyl('stone', [0.12, 0.12, 0.004, 10], [0, 0.002, 0], '#8a847c', { ao: false });
  } else if (c === 'urn') {
    for (let i = 0; i < 8; i++) pl('stone', [0.04 + R() * 0.03, 0.008, 0.03 + R() * 0.03], '#b0a090', 0.2);
    B.sph('stone', [0.1, 0.014, 0.1], [0.02, 0.007, 0.02], '#6a645c', { w: 8, h: 3 }); bn(0.18); teeth(5);
    { const [x, z] = P(0.14); B.cyl('bone', [0.011, 0.012, 0.04, 6], [x, 0.012, z], '#e8dcbc', { r: [1.5708, R() * 6, 0] }); }
  } else {
    for (let i = 0; i < 6; i++) pl('wood', [0.12 + R() * 0.1, 0.014, 0.03 + R() * 0.02], WD[i % 3], 0.22);
    for (let i = 0; i < 5; i++) pl('wood', [0.02, 0.01, 0.035], WD[(i + 1) % 3], 0.2);
    for (let i = 0; i < 3; i++) { const [x, z] = P(0.2); B.cyl('iron', [0.004, 0.004, 0.03, 4], [x, 0.004, z], '#6a5a50', { r: [1.5708, R() * 3, 0] }); }
  }
}

function t3PropShards(key) {   // spezza il modello in blocchi di pezzi vicini (si calcola una volta sola, alla prima rottura)
  const src = T3.pg && T3.pg[key]; if (!src || !src.B) return [];
  const C = T3.ps || (T3.ps = {}); if (C[key]) return C[key];
  const cells = new Map();
  for (const k in src.B.L) {
    if (k === 'decal') continue;
    for (const it of src.B.L[k]) {
      const e = it.m.elements, id = Math.floor((e[12] + 0.4) / 0.27) + ',' + Math.floor(e[13] / 0.3) + ',' + Math.floor((e[14] + 0.4) / 0.27);
      let c = cells.get(id); if (!c) { c = { n: 0, p: [0, 0, 0], L: {} }; cells.set(id, c); }
      (c.L[k] = c.L[k] || []).push(it); c.n++; c.p[0] += e[12]; c.p[1] += e[13]; c.p[2] += e[14];
    }
  }
  const out = [];
  for (const c of cells.values()) {
    const ctr = [c.p[0] / c.n, c.p[1] / c.n, c.p[2] / c.n], B2 = { L: { wood: [], iron: [], bone: [], flesh: [], stone: [], glow: [], flame: [], decal: [] } };
    for (const k in c.L) B2.L[k] = c.L[k];
    const parts = t3PBake(B2, src.R, src.y0, ctr); let ext = 0;
    for (const p of parts) { const A = p.g.attributes.position.array; for (let i = 0; i < A.length; i++) ext = Math.max(ext, Math.abs(A[i])); }
    out.push({ ctr, parts, h: Math.min(0.08, ext * 0.5) });
  }
  return C[key] = out;
}

function t3Puff(x, y, z, col, sc) {   // nuvola di polvere (sprite che si allarga e svanisce)
  if (typeof SH === 'undefined' || !SH.smoke) return;
  const tx = T3.smokeTex || (T3.smokeTex = new THREE.CanvasTexture(SH.smoke)), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: col, transparent: true, depthWrite: false, opacity: 0.5 }));
  sp.position.set(x, y, z); sp.scale.set(0.15, 0.15, 1); T3.root.add(sp);
  T3.puffs.push({ sp, t: 0, sc, vx: (Math.random() - 0.5) * 0.5, vy: 0.2 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.5 });
}

function t3Shatter(m, q) {   // l'oggetto e stato distrutto: i suoi pezzi esplodono, resta un mucchio di macerie
  const u = m.userData, P = m.position, ry = m.rotation.y, cs = Math.cos(ry), sn = Math.sin(ry), mat = q.mat || 'wood';
  const far = Math.hypot(q.x - player.x, q.y - player.y) > 22;
  const dust = { wood: 0x8a7a68, rust: 0x8a6a58, stone: 0x9a9488, bone: 0xcfc8b4, metal: 0x909090 }[mat] || 0x8a8070;
  if (!far) {
    for (const s of t3PropShards(u.brk)) {
      const o = s.ctr, wx = o[0] * cs + o[2] * sn, wz = -o[0] * sn + o[2] * cs, g = new THREE.Group();
      for (const p of s.parts) g.add(new THREE.Mesh(p.g, p.m));
      g.position.set(P.x + wx, P.y + o[1], P.z + wz); g.rotation.y = ry; T3.root.add(g);
      const d = Math.hypot(wx, wz) || 1, sp = 0.4 + Math.random() * 1.2;
      T3.shards.push({ g, vx: wx / d * sp + (Math.random() - 0.5) * 0.7, vz: wz / d * sp + (Math.random() - 0.5) * 0.7, vy: 1 + Math.random() * 1.8 + o[1] * 1.5, wx: (Math.random() - 0.5) * 12, wy: (Math.random() - 0.5) * 8, wz: (Math.random() - 0.5) * 12, t: 0, fl: P.y + Math.max(0.015, s.h) });
    }
    for (let i = 0; i < 6; i++) t3Puff(P.x + (Math.random() - 0.5) * 0.3, P.y + 0.08 + Math.random() * 0.25, P.z + (Math.random() - 0.5) * 0.3, dust, 0.35 + Math.random() * 0.25);
  }
  const nm = u.nm || '', cat = /^armor/.test(nm) ? 'armor' : /^rack|^weaponRack/.test(nm) ? 'rack' : (nm === 'barrel' || nm === 'bones' || nm === 'urn') ? nm : 'wood';
  const rg = new THREE.Group(), vr = Math.abs(Math.floor(q.x * 3.7 + q.y * 5.9)) % 3;
  for (const p of t3PropGeo('rubble_' + cat + '#' + vr, B => t3MRubble(B, cat), 0.15)) rg.add(new THREE.Mesh(p.g, p.m));
  rg.position.set(P.x, P.y, P.z); rg.rotation.y = (q.x * 5.1 + q.y * 2.3) % 6.28; rg.scale.setScalar(0.2); T3.root.add(rg);
  T3.rubs.push({ g: rg, t: 0 }); if (T3.rubs.length > 60) T3.root.remove(T3.rubs.shift().g);
}

function t3Chip(d) {   // scheggia lanciata dal gioco quando un oggetto si rompe (legno, ferro, pietra, osso)
  const CH = { wood: ['wood', [0.07, 0.012, 0.02], '#c8b08e'], rust: ['iron', [0.04, 0.01, 0.045], '#b08a6c'], metal: ['iron', [0.04, 0.01, 0.045], '#a8a8a0'], stone: ['stone', [0.035, 0.03, 0.03], '#b0a090'], bone: ['bone', [0.012, 0.012, 0.065], '#e2d6b6'], glass: ['bone', [0.03, 0.006, 0.03], '#cfe0e0'] };
  const mt = CH[d.mat] ? d.mat : 'wood', c = CH[mt], p = t3PropGeo('chip_' + mt, B => B.box(c[0], c[1], [0, 0, 0], c[2], { ao: false }), 0)[0], m = new THREE.Mesh(p.g, p.m);
  m.userData.sc = 0.8 + Math.random() * 0.8; m.userData.sd = Math.random() * 6.28; return m;
}

function t3BreakStep(dt) {   // fa avanzare pezzi, polvere e crescita delle macerie
  const S = T3.shards;
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i], g = s.g; s.t += dt; s.vy -= 9 * dt;
    const nx = g.position.x + s.vx * dt, nz = g.position.z + s.vz * dt;
    if (!isWall(nx, nz)) { g.position.x = nx; g.position.z = nz; } else { s.vx *= -0.3; s.vz *= -0.3; }
    g.position.y += s.vy * dt;
    if (g.position.y < s.fl) { g.position.y = s.fl; if (Math.abs(s.vy) > 0.5) s.vy *= -0.32; else s.vy = 0; s.vx *= 0.55; s.vz *= 0.55; s.wx *= 0.5; s.wy *= 0.5; s.wz *= 0.5; }
    g.rotation.x += s.wx * dt; g.rotation.y += s.wy * dt; g.rotation.z += s.wz * dt;
    g.scale.setScalar(s.t > 1.2 ? Math.max(0.001, 1 - (s.t - 1.2) / 0.4) : 1);
    if (s.t > 1.6) { T3.root.remove(g); S.splice(i, 1); }
  }
  for (let i = T3.puffs.length - 1; i >= 0; i--) {
    const p = T3.puffs[i]; p.t += dt; const k = p.t / 0.9;
    if (k >= 1) { T3.root.remove(p.sp); p.sp.material.dispose(); T3.puffs.splice(i, 1); continue; }
    p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt * (1 - k); p.sp.position.z += p.vz * dt;
    const s = p.sc * (0.5 + k); p.sp.scale.set(s, s, 1); p.sp.material.opacity = 0.5 * (1 - k) * (1 - k);
  }
  for (const r of T3.rubs) if (r.t < 1) { r.t = Math.min(1, r.t + dt / 0.45); r.g.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - r.t, 3))); }
}

// =====================================================================================================================
// SANGUE DEI DEMONI (piano 1)
// - ogni proiettile (pistola, fucile, mitra, e i colpi dei demoni armati) che colpisce un demone vivo gli fa schizzare dal corpo
//   uno spruzzo: gocce 3D che volano, cadono e sporcano pavimento e muri, piu una nebbiolina rossa all'impatto. Uno spruzzo per
//   ogni proiettile, finche il demone non muore (il colpo che lo uccide schizza di piu). Razzi, granate, fuoco e plasma non ne fanno.
// - ogni demone ucciso lascia sotto di se una pozza di sangue che si allarga piano e resta sul pavimento.
// Tutto vive in un gruppo proprio (T3.bl), che si svuota da solo quando si carica un nuovo piano o si ricomincia.
// =====================================================================================================================
const T3BL = { drops: 480, splats: 300, pools: 80, mist: 24, parts: 100 };

function t3BloodTex(kind, seed) {   // 'pool': pozza irregolare (centro denso, bordo sottile, colature e goccioline); 'splat': macchia piccola con qualche goccia attorno
  const pool = kind === 'pool', S = pool ? 256 : 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'); let sd = seed; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const C = S / 2, base = S * (pool ? 0.3 : 0.2), ph = [rnd() * 6.283, rnd() * 6.283, rnd() * 6.283, rnd() * 6.283], am = pool ? [0.13, 0.09, 0.06, 0.04] : [0.16, 0.12, 0.09, 0.06];
  const rad = (a, k) => base * k * (1 + am[0] * Math.sin(2 * a + ph[0]) + am[1] * Math.sin(3 * a + ph[1]) + am[2] * Math.sin(5 * a + ph[2]) + am[3] * Math.sin(9 * a + ph[3]));
  const blob = (k, col, blur) => {
    g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col; g.beginPath();
    for (let i = 0; i <= 72; i++) { const a = i / 72 * 6.2832, r = rad(a, k), x = C + Math.cos(a) * r, y = C + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.closePath(); g.fill();
  };
  blob(1, 'rgba(118,8,12,0.8)', S * 0.03); blob(0.8, 'rgba(94,6,10,0.92)', S * 0.02); blob(0.5, 'rgba(60,3,7,0.97)', S * 0.015);   // bordo sottile, corpo, centro denso e scuro
  g.shadowBlur = 0; g.fillStyle = 'rgba(98,6,10,0.92)';
  for (let f = 0, nf = pool ? 5 : 2; f < nf; f++) {   // colature: catene di cerchi che si assottigliano
    const a = rnd() * 6.283, len = base * (0.2 + rnd() * 0.25), w0 = base * (0.09 + rnd() * 0.06);
    for (let k = 0; k <= 10; k++) { const t = k / 10, r = rad(a, 0.85) + len * t, rr = Math.max(0.7, w0 * Math.pow(1 - t, 0.8)); g.beginPath(); g.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, rr, 0, 6.2832); g.fill(); }
  }
  for (let i = 0, n = pool ? 9 : 5; i < n; i++) {   // goccioline attorno
    const a = rnd() * 6.283, r = base * (1.15 + rnd() * 0.3), s = Math.max(0.8, base * (0.03 + rnd() * 0.07));
    g.beginPath(); g.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, s, 0, 6.2832); g.fill();
  }
  return cv;
}

function t3SootTex(seed) {   // alone di fuliggine: nucleo nero, bordo a lobi irregolari che sfuma, raggi di cenere e macchioline
  const S = 256, C = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'); let sd = seed; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rg = (x, y, r, stops) => { const q = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) q.addColorStop(o, c); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
  rg(C, C, S * 0.46, [[0, 'rgba(6,5,4,0.95)'], [0.5, 'rgba(10,8,6,0.8)'], [0.85, 'rgba(14,11,9,0.25)'], [1, 'rgba(14,11,9,0)']]);   // velo di fondo
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, d = S * (0.1 + rnd() * 0.16), r = S * (0.12 + rnd() * 0.1); rg(C + Math.cos(a) * d, C + Math.sin(a) * d, r, [[0, 'rgba(6,5,4,0.85)'], [0.6, 'rgba(8,6,5,0.55)'], [1, 'rgba(8,6,5,0)']]); }   // lobi: il bordo non e un cerchio
  rg(C, C, S * 0.3, [[0, 'rgba(2,2,2,1)'], [0.7, 'rgba(4,3,3,0.92)'], [1, 'rgba(4,3,3,0)']]);   // nucleo nero
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {   // raggi di cenere
    const a = rnd() * 6.283, r0 = S * (0.15 + rnd() * 0.1), r1 = S * (0.3 + rnd() * 0.15);
    g.strokeStyle = 'rgba(8,6,5,' + (0.2 + rnd() * 0.2) + ')'; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); g.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); g.stroke();
  }
  g.fillStyle = 'rgba(8,6,5,0.5)';
  for (let i = 0; i < 36; i++) { const a = rnd() * 6.283, r = S * (0.28 + rnd() * 0.18), q = 0.8 + rnd() * 2; g.beginPath(); g.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, q, 0, 6.2832); g.fill(); }   // macchioline
  return cv;
}

function t3BloodMistTex() {   // alone morbido: il colore lo da il materiale
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.4, 'rgba(255,255,255,0.4)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
}

function t3BloodGet() {   // crea (una volta) il gruppo del sangue; se e cambiato il piano lo svuota
  let B = T3.bl;
  if (!B) {
    const g = new THREE.Group(), pg = new THREE.PlaneGeometry(1, 1);
    const wet = (cv) => new THREE.MeshStandardMaterial({ map: t3TexL(cv, true), transparent: true, depthWrite: false, roughness: 0.2, metalness: 0, emissive: 0x1c0203, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const soot = (cv) => new THREE.MeshStandardMaterial({ map: t3TexL(cv, true), transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    B = T3.bl = {
      g, pg, ver: W1.ver, drops: [], pools: [], mist: [], part: [], ns: 0,
      dm: new THREE.Object3D(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), v: new THREE.Vector3(), n: new THREE.Vector3(),
      zv: new THREE.Vector3(0, 0, 1), uy: new THREE.Vector3(0, 1, 0), qf: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),   // qf: il piano (che guarda +z) si sdraia sul pavimento
      pm: [11, 23, 37].map(s => wet(t3BloodTex('pool', s))),   // tre forme diverse di pozza
      sm: [5, 17].map(s => soot(t3SootTex(s)))   // due forme di alone annerito (demoni morti bruciati)
    };
    B.di = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x8a0a0e, roughness: 0.16, metalness: 0.1, emissive: 0x2a0204 }), T3BL.drops);   // tutte le gocce in una sola chiamata di disegno
    B.sp = new THREE.InstancedMesh(pg, wet(t3BloodTex('splat', 7)), T3BL.splats);   // tutte le macchie (pavimento e muri) in una sola chiamata
    for (const o of [B.di, B.sp]) { o.count = 0; o.frustumCulled = false; g.add(o); }
    T3.scene.add(g);
  }
  if (B.ver !== W1.ver) t3BloodReset(B);
  return B;
}

function t3BloodReset(B) {   // nuovo piano o nuova partita: via tutto il sangue
  B.ver = W1.ver; B.drops.length = 0; B.ns = 0; B.di.count = 0; B.sp.count = 0;
  for (const p of B.pools) B.g.remove(p.m);
  B.pools.length = 0;
  for (const s of B.mist) s.sp.visible = false;
  for (const q of B.part) q.sp.visible = false;
}

function t3BloodPut(B, x, y, z, q, w, len) {   // una macchia in piu (anello: le piu vecchie vengono sovrascritte)
  const i = B.ns++ % T3BL.splats, dm = B.dm;
  dm.position.set(x, y, z); dm.quaternion.copy(q); dm.scale.set(w, w * len, 1); dm.updateMatrix(); B.sp.setMatrixAt(i, dm.matrix);
  B.sp.count = Math.min(B.ns, T3BL.splats); B.sp.instanceMatrix.needsUpdate = true;
}

function t3BloodFloor(B, d, x, fl, z) {   // goccia caduta a terra: macchia allungata nel verso in cui volava
  const R = Math.random, sp = Math.hypot(d.vx, d.vz), ph = sp > 0.3 ? Math.atan2(-d.vx, -d.vz) + (R() - 0.5) * 0.3 : R() * 6.283;
  B.q2.setFromAxisAngle(B.uy, ph); B.q.copy(B.qf).premultiply(B.q2);
  t3BloodPut(B, x, fl + 0.006, z, B.q, (0.2 + d.r * 7) * (0.8 + R() * 0.5), 1 + Math.min(1.6, sp * 0.3));
}

function t3BloodWall(B, d, nx, ny, nz) {   // goccia contro un muro: macchia sulla faccia colpita
  const hx = isWallMap(nx, d.z), hz = isWallMap(d.x, nz);
  if (!hx && !hz) return;   // spigolo: niente macchia (finirebbe a mezz'aria)
  if (W1.rail[Math.floor(nz) * N + Math.floor(nx)]) return;   // i parapetti sono bassi: niente macchie in alto
  const R = Math.random;
  let fx, fz, sx = 0, sz = 0, k;
  if (hx) { sx = d.vx > 0 ? -1 : 1; fx = d.vx > 0 ? Math.floor(nx) : Math.floor(nx) + 1; k = nx === d.x ? 1 : Math.min(1, Math.max(0, (fx - d.x) / (nx - d.x))); fz = d.z + (nz - d.z) * k; fx += sx * 0.004; }
  else { sz = d.vz > 0 ? -1 : 1; fz = d.vz > 0 ? Math.floor(nz) : Math.floor(nz) + 1; k = nz === d.z ? 1 : Math.min(1, Math.max(0, (fz - d.z) / (nz - d.z))); fx = d.x + (nx - d.x) * k; fz += sz * 0.004; }
  B.n.set(sx, 0, sz); B.q.setFromUnitVectors(B.zv, B.n); B.q2.setFromAxisAngle(B.n, R() * 6.283); B.q.premultiply(B.q2);
  t3BloodPut(B, fx, d.y + (ny - d.y) * k, fz, B.q, (0.2 + d.r * 7) * (0.8 + R() * 0.5), 1);
}

function t3BloodMist(B, x, y, z, big, dx, dz) {   // nebbiolina rossa all'impatto
  let s = B.mist.find(o => !o.sp.visible);
  if (!s) {
    if (B.mist.length >= T3BL.mist) return;
    B.mt = B.mt || t3BloodMistTex();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.mt, color: 0x6a0408, transparent: true, depthWrite: false, opacity: 0 }));
    sp.renderOrder = 4; B.g.add(sp); s = { sp, t: 0, s: 0.5, vx: 0, vz: 0 }; B.mist.push(s);
  }
  s.t = 0; s.s = big ? 0.85 : 0.55; s.vx = -dx * 0.5; s.vz = -dz * 0.5; s.sp.visible = true; s.sp.position.set(x, y, z); s.sp.scale.set(0.1, 0.1, 1);
}

// Chiamata dal motore (ai-and-update.js) quando un proiettile colpisce il demone e: (x, y, z) e il punto d'impatto, (dx, dy) la direzione del colpo
function t3Blood(e, x, y, z, dx, dy) {
  try { t3BloodHit(e, x, y, z, dx, dy); } catch (err) { if (!T3.blErr) { T3.blErr = 1; console.error('Sangue 3D:', err); } }
}
function t3BloodHit(e, x, y, z, dx, dy) {
  if (!e || !T3.on || T3.failed || !T3.scene || curFloor !== 0) return;
  const B = t3BloodGet(), R = Math.random, l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const T = TYPES[e.type] || TYPES.demon, top = T.sc * (e.hs || 1), kill = !e.alive;
  // il proiettile si ferma un poco prima del corpo: lo spruzzo parte dal punto in cui la sua traiettoria entra nel busto (cilindro di raggio rho attorno al demone)
  const rho = 0.17 * top, t = (e.x - x) * dx + (e.y - y) * dy, qx = x + dx * t, qz = y + dy * t, ex = e.x - qx, ez = e.y - qz, dist = Math.hypot(ex, ez), back = Math.sqrt(Math.max(0, rho * rho - dist * dist));
  let ox = qx - dx * back, oz = qz - dy * back;
  if (dist > rho) { const k = (dist - rho) / dist; ox += ex * k; oz += ez * k; }   // colpo di striscio: parte dalla pelle, sul lato piu vicino
  const h = Math.min(top * 0.95, Math.max(0.15, z + (R() - 0.5) * 0.25)), oy = world1H(ox, oz) + h;
  const n = kill ? 26 + (R() * 10 | 0) : 14 + (R() * 8 | 0), px = -dy, pz = dx;
  for (let i = 0; i < n && B.drops.length < T3BL.drops; i++) {
    const fw = R() < 0.28 ? 1 : -0.55, sp = (0.7 + R() * 2.9) * (kill ? 1.25 : 1), sd = (R() - 0.5) * 2.2;   // poche gocce escono dall'altra parte, le altre tornano verso chi spara
    B.drops.push({
      x: ox + (R() - 0.5) * 0.07, y: oy + (R() - 0.5) * 0.07, z: oz + (R() - 0.5) * 0.07,
      vx: dx * fw * sp + px * sd, vy: (R() - 0.35) * 2.4 + 0.5, vz: dy * fw * sp + pz * sd,
      r: 0.011 + R() * R() * 0.02 + (kill ? 0.004 : 0), life: 2.2
    });
  }
  t3BloodMist(B, ox, oy, oz, kill, dx, dy);
}

function t3BloodPool(e, u) {   // il demone e morto: pozza di sangue sotto il corpo; se e morto bruciato, al suo posto un alone nero di fuliggine
  const B = t3BloodGet(), R = Math.random, burn = !!e.burned, sc = u.sc || 1, yaw = (u.yaw === null || u.yaw === undefined) ? (u.hd || 0) : u.yaw;
  const cx = e.x - Math.sin(yaw) * 0.35 * sc, cz = e.y - Math.cos(yaw) * 0.35 * sc, fl = world1H(cx, cz);   // il corpo cade all'indietro: la pozza sta sotto il busto
  let r = (burn ? 0.8 + R() * 0.2 : 0.5 + R() * 0.2) * Math.min(1.5, Math.max(0.75, sc));
  const flat = (q) => { for (let i = 0; i < 8; i++) { const a = i * 0.7854; if (Math.abs(world1H(cx + Math.cos(a) * q, cz + Math.sin(a) * q) - fl) > 0.02) return false; } return true; };
  while (r > 0.22 && !flat(r)) r *= 0.8;   // niente pozza sospesa sul bordo di un gradino o del pozzo
  const m = new THREE.Mesh(B.pg, burn ? B.sm[(R() * B.sm.length) | 0] : B.pm[(R() * B.pm.length) | 0]);
  m.rotation.x = -Math.PI / 2; m.rotation.z = R() * 6.283; m.position.set(cx, fl + 0.012, cz); m.visible = false; m.scale.set(0.001, 0.001, 1);
  if (B.pools.length >= T3BL.pools) B.g.remove(B.pools.shift().m);
  B.g.add(m); B.pools.push({ m, t: burn ? -0.1 : -0.3, k: 0, d: burn ? 1.4 : 2.6, s: r / (burn ? 0.38 : 0.3), sx: 0.9 + R() * 0.2, sy: 0.8 + R() * 0.3 });   // s: lato del quadrato (il raggio visibile e 0,3 del lato per il sangue, 0,38 per la fuliggine); d: secondi per allargarsi
}

function t3BurnPart(B, smoke, x, y, z, vx, vy, vz, s0, s1, life, op) {   // una particella: fumo grigio (smoke) o brace arancione additiva
  let p = B.part.find(o => !o.sp.visible);
  if (!p) {
    if (B.part.length >= T3BL.parts) return;
    B.mt = B.mt || t3BloodMistTex();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.mt, transparent: true, depthWrite: false, opacity: 0 }));
    B.g.add(sp); p = { sp, t: 0 }; B.part.push(p);
  }
  const m = p.sp.material;
  m.color.setHex(smoke ? 0x5a554f : 0xff7a28); m.blending = smoke ? THREE.NormalBlending : THREE.AdditiveBlending; p.sp.renderOrder = smoke ? 4 : 5; m.opacity = 0;
  p.smoke = smoke; p.t = 0; p.vx = vx; p.vy = vy; p.vz = vz; p.s0 = s0; p.s1 = s1; p.life = life; p.op = op;
  p.sp.position.set(x, y, z); p.sp.scale.set(s0, s0, 1); p.sp.visible = true;
}

function t3Burn(m, e, u, d2) {   // demone morto per ustione: il corpo annerisce, le crepe restano brace che si spegne piano, sale fumo con qualche scintilla
  const B = t3BloodGet(), R = Math.random, dt = T3.dt || 0.016, ti = e.deathTimer, k = Math.min(1, ti / 1.4), ks = k * k * (3 - 2 * k);
  if (!u.chr) {   // materiali propri del cadavere: quelli del modello sono condivisi con tutti gli altri demoni della stessa variante
    u.chr = [];
    const M = (T3.mc || {})[e.type === 'demon' ? 'demon#' + (e.v | 0) : e.type], tg = { skin: 0x17120f, bone: 0x2b2723, flesh: 0x0d0807, tongue: 0x120a08, drool: 0x000000 }, cm = new Map();
    if (M) {
      for (const n in tg) if (M[n] && M[n].emissive) { const c = M[n].clone(); cm.set(M[n], c); u.chr.push({ n, m: c, ct: new THREE.Color(tg[n]), c0: c.color.clone(), e0: c.emissive.clone(), ei0: c.emissiveIntensity, r0: c.roughness, b0: c.bumpScale || 0, o0: c.opacity }); }
      m.traverse(o => { if (o.isMesh && cm.has(o.material)) o.material = cm.get(o.material); });
    }
  }
  const emb = T3.embCol || (T3.embCol = new THREE.Color(0xff5a14)), fade = Math.exp(-Math.max(0, ti - 1.4) / 6);
  for (const a of u.chr) {
    const c = a.m; c.color.copy(a.c0).lerp(a.ct, ks); c.roughness = a.r0 + (0.95 - a.r0) * ks;
    if (a.n === 'skin') { c.emissive.copy(a.e0).lerp(emb, ks); c.emissiveIntensity = (0.12 + 0.88 * fade) * (0.55 + 0.45 * ks) * (0.85 + 0.15 * Math.sin(tNow * 6 + u.seed)); c.bumpScale = a.b0 + ks; }   // pelle: nera e screpolata, le crepe brillano come brace
    else if (a.n === 'drool') c.opacity = a.o0 * (1 - ks);
    else { c.emissiveIntensity = a.ei0 * (1 - ks); if (a.n === 'bone') c.bumpScale = a.b0 + 0.8 * ks; }
  }
  const sc = u.sc || 1, yaw = (u.yaw === null || u.yaw === undefined) ? (u.hd || 0) : u.yaw, cx = e.x - Math.sin(yaw) * 0.3 * sc, cz = e.y - Math.cos(yaw) * 0.3 * sc, fl = world1H(cx, cz);
  const smoke = () => t3BurnPart(B, true, cx + (R() - 0.5) * 0.5 * sc, fl + 0.12 + R() * 0.2, cz + (R() - 0.5) * 0.5 * sc, (R() - 0.5) * 0.15, 0.35 + R() * 0.25, (R() - 0.5) * 0.15, 0.25 * sc, (0.8 + R() * 0.4) * sc, 2.4 + R() * 0.9, 0.3);
  const spark = () => t3BurnPart(B, false, cx + (R() - 0.5) * 0.5 * sc, fl + 0.15 + R() * 0.2, cz + (R() - 0.5) * 0.5 * sc, (R() - 0.5) * 0.4, 0.5 + R() * 0.9, (R() - 0.5) * 0.4, 0.07, 0.02, 0.9 + R() * 0.8, 1);
  if (!u.bb) { u.bb = true; for (let i = 0; i < 4; i++) smoke(); for (let i = 0; i < 14; i++) spark(); }   // sbuffo di fumo e scintille nel momento in cui crolla
  if (ti < 6.5) {
    const iv = 0.28 + 0.06 * ti; u.sm = Math.min(iv * 2, (u.sm || 0) + dt);
    for (let n = 0; u.sm > iv && n < 2; n++) { u.sm -= iv; smoke(); }
    if (ti < 5) { const ie = 0.3 + 0.15 * ti; u.em = Math.min(ie * 2, (u.em || 0) + dt); for (let n = 0; u.em > ie && n < 2; n++) { u.em -= ie; spark(); } }
  }
}

function t3BloodStep(dt) {   // gocce, nebbiolina e crescita delle pozze, a ogni fotogramma
  const B = T3.bl; if (!B) return;
  if (B.ver !== W1.ver) t3BloodReset(B);
  const D = B.drops, dm = B.dm, R = Math.random;
  for (let i = D.length - 1; i >= 0; i--) {
    const d = D[i]; d.life -= dt; d.vy -= 9.5 * dt; d.vx *= 1 - 0.6 * dt; d.vz *= 1 - 0.6 * dt;
    const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt, ny = d.y + d.vy * dt;
    let dead = d.life <= 0;
    if (!dead && isWallMap(nx, nz)) { dead = true; if (R() < 0.55) t3BloodWall(B, d, nx, ny, nz); }
    else if (!dead) {
      const fl = world1H(nx, nz);
      if (ny <= fl + 0.01) { dead = true; if (R() < 0.6) t3BloodFloor(B, d, nx, fl, nz); }
      else { d.x = nx; d.y = ny; d.z = nz; }
    }
    if (dead) { D[i] = D[D.length - 1]; D.pop(); }
  }
  B.di.count = D.length;
  for (let i = 0; i < D.length; i++) {   // ogni goccia e un ovale allungato nel verso del moto
    const d = D[i], sp = Math.hypot(d.vx, d.vy, d.vz);
    dm.position.set(d.x, d.y, d.z); B.v.set(d.vx, d.vy, d.vz).normalize(); dm.quaternion.setFromUnitVectors(B.zv, B.v);
    dm.scale.set(d.r, d.r, d.r * (1 + Math.min(2.2, sp * 0.3))); dm.updateMatrix(); B.di.setMatrixAt(i, dm.matrix);
  }
  if (D.length) B.di.instanceMatrix.needsUpdate = true;
  for (const s of B.mist) {
    if (!s.sp.visible) continue;
    s.t += dt; const k = s.t / 0.45;
    if (k >= 1) { s.sp.visible = false; continue; }
    const sc = s.s * (0.35 + 0.65 * Math.sqrt(k)); s.sp.scale.set(sc, sc, 1); s.sp.material.opacity = 0.6 * (1 - k) * (1 - k);
    s.sp.position.x += s.vx * dt; s.sp.position.z += s.vz * dt; s.sp.position.y += 0.25 * dt;
  }
  for (const p of B.pools) {
    if (p.k >= 1) continue;
    p.t += dt; const k = Math.min(1, Math.max(0, p.t / (p.d || 2.6))); p.k = k;
    const s = p.s * (0.06 + 0.94 * (1 - Math.pow(1 - k, 3)));   // sgorga in fretta, poi rallenta
    p.m.scale.set(s * p.sx, s * p.sy, 1); p.m.visible = p.t > 0;
  }
  for (const p of B.part) {   // fumo e scintille dei corpi bruciati
    if (!p.sp.visible) continue;
    p.t += dt; const k = p.t / p.life;
    if (k >= 1) { p.sp.visible = false; continue; }
    const q = p.sp, s = p.s0 + (p.s1 - p.s0) * k;
    q.position.x += p.vx * dt; q.position.y += p.vy * dt; q.position.z += p.vz * dt;
    if (p.smoke) { p.vx *= 1 - 0.5 * dt; p.vz *= 1 - 0.5 * dt; q.material.opacity = p.op * Math.min(1, k * 5) * (1 - k); }
    else { p.vy -= 0.4 * dt; q.material.opacity = p.op * (1 - k) * (0.75 + 0.25 * Math.sin(p.t * 40)); }
    q.scale.set(s, s, 1);
  }
}

// ---------- aggiorna la scena a ogni fotogramma ----------
function t3Stale(map) { for (const [k, m] of map) if (m.userData.f !== T3.stamp) { T3.root.remove(m); map.delete(k); if (m.userData.brk && k.hp <= 0) t3Shatter(m, k); } }
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
  T3.lights.forEach((l, i) => { const o = near[i]; l.visible = !!o && o.d < 100; if (o) { if (o.q.lx !== undefined) l.position.set(o.q.lx, o.q.ly, o.q.lz); else l.position.set(o.q.x, 0.75 + world1Hn(o.q.x, o.q.y), o.q.y); l.color.copy(col); l.intensity = (o.q.k || 1) * T3CFG.torch * flick; } });
  T3.amb.intensity = T3CFG.ambient * powerK; T3.hand.position.copy(cam.position); T3.hand.intensity = T3CFG.hand * powerK;
  const fr = Math.floor(tNow * 9) % 4; for (const k in (T3.mc || {})) T3.mc[k].skin.emissiveIntensity = 0.45 + 0.2 * Math.sin(tNow * 3); for (const t of T3.torchMats) t.mat.map = t.frames[fr];
  { const hb = 0.35 + 0.6 * Math.pow(Math.max(0, Math.sin(tNow * 3.1)), 3); for (const m of HW.pulse) m.emissiveIntensity = hb; }   // le crepe incandescenti battono come un cuore   // fiamme delle torce animate; le crepe dei demoni pulsano
  if (doorAnim && T3.doorTex) T3.doorTex.needsUpdate = true;
  // mostri
  for (const e of enemies) {
    if (!T3.mobs.has(e) && (e.x - px) ** 2 + (e.y - py) ** 2 > 2500) continue;   // piano grande: il modello nasce solo quando ci si avvicina (50 celle)
    const m = t3Get(T3.mobs, e, () => t3Mob(e)), u = m.userData, T = TYPES[e.type] || TYPES.demon;
    if (!e.alive && !e.bp) { e.bp = true; try { t3BloodPool(e, u); } catch (err) { if (!T3.blErr) { T3.blErr = 1; console.error('Sangue 3D:', err); } } }   // demone ucciso: pozza di sangue sotto di lui
    const d2 = (e.x - px) ** 2 + (e.y - py) ** 2, dx = e.x - u.px, dy = e.y - u.py, mv = Math.hypot(dx, dy);
    m.visible = d2 < 2025; u.px = e.x; u.py = e.y; if (!m.visible) continue;   // da lontano si vedono solo gli occhi
    m.position.set(e.x, world1H(e.x, e.y) + (T.lift ? T.lift + Math.sin(tNow * 3 + e.x) * 0.04 : 0), e.y);
    if (mv > 0.002) u.hd = Math.atan2(dx, dy);
    if (e.alive && (e.state === 'attack' || e.state === 'summon' || T.boss || e.fc)) u.hd = Math.atan2(px - e.x, py - e.y);
    t3Anim(m, e, mv, d2);
    if (!e.alive && e.burned && d2 < 400) { try { t3Burn(m, e, u, d2); } catch (err) { if (!T3.blErr) { T3.blErr = 1; console.error('Carbonizzazione 3D:', err); } } }   // morto bruciato: corpo carbonizzato, brace e fumo
    // barra vita: compare solo dopo il primo colpo
    const show = e.alive && e.hp < e.mhp && d2 < 144, b = t3Get(T3.bars, e, () => { const g = new THREE.Group(), mk = (c, z) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.04), new THREE.MeshBasicMaterial({ color: c, fog: false })); o.position.z = z; g.add(o); return o; }; mk(0x000000, 0); g.userData.fg = mk(0xdd2222, 0.001); return g; });
    b.visible = show; if (show) { const q = Math.max(0, e.hp / e.mhp); b.position.set(e.x, world1H(e.x, e.y) + u.sc * 0.98 + 0.12, e.y); b.quaternion.copy(cam.quaternion); b.userData.fg.scale.x = Math.max(0.001, q); b.userData.fg.position.x = -0.2 * (1 - q); }
  }
  t3Stale(T3.mobs); t3Stale(T3.bars);
  // colpi, fiamme, esplosioni e bagliori (sprite additivi + luci dinamiche)
  t3Fx(); t3FxLights();
  // raccoglibili: modelli 3D (medikit, munizioni, armi, armature) che ruotano e fluttuano, con un alone luminoso
  for (const q of pickups) {
    if (q.taken || (!T3.pick.has(q) && (q.x - px) ** 2 + (q.y - py) ** 2 > 2500)) continue;
    const key = q.kind === 'arm' ? 'arm' + q.t : q.kind === 'ammo' ? 'ammo' + q.w : q.kind;
    const m = t3Get(T3.pick, q, () => t3Pickup(key));
    m.position.set(q.x, 0.22 + world1H(q.x, q.y) + Math.sin(tNow * 2.5 + q.x) * 0.03, q.y); m.rotation.y = tNow * 1.5;
    if (m.userData.halo) m.userData.halo.material.opacity = 0.4 + 0.12 * Math.sin(tNow * 4 + q.x * 2);
  }
  t3Stale(T3.pick);
  // oggetti di scena
  for (const q of props) {
    if (!T3.prop.has(q) && (q.x - px) ** 2 + (q.y - py) ** 2 > 2500) continue;
    const m = t3Get(T3.prop, q, () => { const o = t3Props(q); o.position.set(q.x, world1H(q.x, q.y), q.y); return o; });
    if (m.userData.lid) m.userData.lid.rotation.x = q.open ? -1.2 : 0;
    const u = m.userData;   // colpito: il modello trema per un attimo
    if (u.hp === undefined) u.hp = q.hp; if (q.hp < u.hp) u.shake = 0.3; u.hp = q.hp;
    if (u.shake > 0) { u.shake -= T3.dt; const k = Math.max(0, u.shake) / 0.3; m.rotation.x = Math.sin(tNow * 70) * 0.06 * k; m.rotation.z = Math.cos(tNow * 63) * 0.06 * k; }
    else if (m.rotation.x || m.rotation.z) m.rotation.x = m.rotation.z = 0;
  }
  // lampadari appesi al soffitto
  for (const c of chands) {
    if (!T3.prop.has(c) && (c.x - px) ** 2 + (c.y - py) ** 2 > 2500) continue;
    const m = t3Get(T3.prop, c, () => { const g = new THREE.Group(); for (const p of t3PropGeo('chand', t3MChand)) g.add(new THREE.Mesh(p.g, p.m)); g.position.set(c.x, world1C(c.x, c.y) - 1, c.y); return g; });
  }
  t3Stale(T3.prop);
  for (const d of debris) {   // schegge lanciate dalla rottura
    const m = t3Get(T3.deb, d, () => t3Chip(d));
    m.position.set(d.x, world1H(d.x, d.y) + d.z, d.y); m.rotation.set(tNow * 9 + m.userData.sd, tNow * 7, m.userData.sd * 3); m.scale.setScalar(m.userData.sc * Math.min(1, d.life / 0.25));
  }
  t3Stale(T3.deb);
  t3BreakStep(T3.dt);
  try { if (!T3.bl) t3BloodGet(); t3BloodStep(T3.dt); } catch (err) { if (!T3.blErr) { T3.blErr = 1; console.error('Sangue 3D:', err); } }   // sangue: spruzzi e pozze
  world1Sync3D();
}

function t3Tag(s) {   // scritta in alto: versione e motore usato
  const el = document.querySelector('#hudInfo span'); if (!el) return;
  const t = 'CASTEDDISH v6' + (s ? ' [' + s + ']' : ''); if (el.textContent !== t) el.textContent = t;
}

// Chiamata da render(): restituisce true se il fotogramma e stato disegnato in 3D
// =====================================================================================================================
// BRACCIO E ARMI IN PRIMA PERSONA (3D)
// Una scena separata, disegnata sopra il mondo con la profondita azzerata (l'arma non entra mai nei muri): braccio martoriato
// (pelle con vene, manica di cuoio a brandelli, bende, muscolo scoperto, suture, manetta con catena) e le 8 armi in versione horror.
// Rinculo, ondeggio del passo, ritardo nelle rotazioni, cambio arma, carica del lancio e lampi di bocca sono animati.
// =====================================================================================================================
const VMW = [   // s: scala; zg: distanza dell'impugnatura dalla camera; gx: posizione orizzontale sullo schermo (-1..1); top: altezza massima sopra l'impugnatura; gy: altezza sullo schermo (se manca, si ricava da top);
                // muz: bocca; fr: raggio del lampo; lc: colore della luce; rec: rinculo (m); rise: impennata (rad). L'arma punta sempre verso il mirino.
  { s: 1.15, zg: 0.40, gx: 0.24, top: 0.09, muz: [0, 0.055, -0.205], fr: 0.075, lc: 0xffb050, rec: 0.045, rise: 0.12 },   // 0 pistola
  { s: 0.85, zg: 0.38, gx: 0.26, top: 0.07, muz: [0, 0.03, -0.53], fr: 0.12, lc: 0xffb050, rec: 0.08, rise: 0.2 },      // 1 fucile
  { s: 0.8, zg: 0.42, gx: 0.24, top: 0.13, muz: [0, 0.03, -0.47], fr: 0.08, lc: 0xffb050, rec: 0.02, rise: 0.04 },      // 2 mitra
  { s: 0.7, zg: 0.42, gx: 0.24, top: 0.11, muz: [0, 0.03, -0.66], fr: 0.13, lc: 0xff7a20, rec: 0.075, rise: 0.12 },     // 3 razzi
  { s: 0.8, zg: 0.44, gx: 0.3, top: 0.27, gy: -0.62, muz: null, fr: 0, lc: 0xff9a30, rec: -0.07, rise: -0.25 },          // 4 molotov
  { s: 1.0, zg: 0.4, gx: 0.28, top: 0.1, gy: -0.6, muz: null, fr: 0, lc: 0xffffff, rec: -0.07, rise: -0.25 },            // 5 granata
  { s: 0.85, zg: 0.4, gx: 0.24, top: 0.06, muz: [0, 0.03, -0.44], fr: 0.11, lc: 0xff7a20, rec: 0.012, rise: 0.02 },     // 6 lanciafiamme
  { s: 1.1, zg: 0.42, gx: 0.24, top: 0.11, muz: [0, 0.035, -0.34], fr: 0.1, lc: 0x4dff6a, rec: 0.03, rise: 0.08 }      // 7 plasma
];
for (const W of VMW) {   // posizione e orientamento: impugnatura in basso a destra, canna verso il mirino a 2 m
  const tf = 0.4663, X = W.gx * W.zg * tf * 2, Y = W.gy !== undefined ? W.gy * W.zg * tf : -0.2 * W.zg * tf - W.s * W.top;
  W.pos = [X, Y, -W.zg]; W.ry = Math.atan2(X, 2 - W.zg); W.rx = Math.atan2(-Y, 2 - W.zg);
}

const t3Eul = (f, d) => { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(f[0], f[1], f[2]), new THREE.Vector3(d[0], d[1], d[2]).normalize()), e = new THREE.Euler().setFromQuaternion(q); return [e.x, e.y, e.z]; };

// ---------------------------------------------------------------------------------------------------------------------------------
// MANO 3D IN PRIMA PERSONA
// Costruita per la mano destra attorno a un manico verticale (asse y, raggio R): palmo e dorso dietro (z+), quattro dita con tre falangi
// che partono dalle nocche sul lato destro (x+) e avvolgono il manico, pollice a sinistra; la mano sinistra e la stessa, specchiata.
// Tutto e fatto di tubi lisci (vmhTube): dorso a cuneo con tendini, nocche, giunture con pieghe, polpastrelli e unghie.
// Pelle pulita e normale (materiale 'hand'). Lunghezze e larghezze delle dita sono in VMH.F, il pollice in VMH.TH, il colore in VMH.SK.
// ---------------------------------------------------------------------------------------------------------------------------------
const VMH = {
  SK: '#e3baa3', XK: 0.036, YC: -0.003,   // colore pelle; x delle nocche; y del centro del dorso
  TURN: 0.785,   // rotazione della mano attorno al manico: 0 = palmo dritto dietro, 0.785 = palmo sul lato destro del manico (impugnatura vera); la mano sinistra e speculare
  P: [[-0.056, 0.004, 0.016], [-0.05, 0.011, 0.027], [-0.044, 0.017, 0.032], [-0.034, 0.025, 0.036], [-0.022, 0.032, 0.039], [-0.01, 0.037, 0.0405], [0, 0.039, 0.0415],
    [0.01, 0.037, 0.0425], [0.02, 0.032, 0.0435], [0.03, 0.026, 0.0435], [0.037, 0.021, 0.043], [0.043, 0.015, 0.0405], [0.048, 0.007, 0.032]],   // dorso: x, spessore, semilarghezza
  F: [   // dita (indice, medio, anulare, mignolo): L = lunghezza delle tre falangi, w = semilarghezza alla base
    { L: [0.04, 0.024, 0.02], w: 0.0097 }, { L: [0.044, 0.027, 0.021], w: 0.01 }, { L: [0.041, 0.025, 0.02], w: 0.0094 }, { L: [0.033, 0.019, 0.018], w: 0.0084 }],
  TH: [[0, 0.022, 0.023], [0.12, 0.018, 0.0205], [0.28, 0.0138, 0.0155], [0.4, 0.0119, 0.0135], [0.52, 0.0114, 0.013], [0.62, 0.0123, 0.0134], [0.72, 0.0112, 0.0123], [0.9, 0.0101, 0.0117], [1, 0.0095, 0.011]]   // pollice: u, raggio radiale, semilarghezza
};

const vmhInt = (tb, x) => {   // interpolazione lineare su una tabella [[x, v1, v2...]...]
  if (x <= tb[0][0]) return tb[0].slice(1);
  for (let i = 0; i < tb.length - 1; i++) if (x <= tb[i + 1][0]) { const a = tb[i], b = tb[i + 1], t = (x - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t); }
  return tb[tb.length - 1].slice(1);
};
const vmhG = (s, j, k) => Math.exp(-Math.pow((s - j) / k, 2));   // gobba morbida attorno a j
const vmhSm = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const vmhZin = (x, R) => { const rr = R + 0.004, t = Math.max(-1, Math.min(1, x / (rr * 1.9))); return rr * (0.5 + 0.5 * Math.cos(Math.PI * t)); };   // dove il palmo poggia sul manico
const vmhPr = (x, R) => { const p = vmhInt(VMH.P, x); return [p[0] + 0.35 * (vmhZin(0, R) - vmhZin(x, R)), p[1]]; };   // spessore e semilarghezza del dorso: piu spesso dove il palmo si allontana dal manico, cosi il dorso resta piatto
const vmhSurf = (x, y, R) => { const p = vmhPr(x, R), q = Math.min(1, Math.abs((y - VMH.YC) / p[1])), a = p[0] / 2; return vmhZin(x, R) + a + a * Math.pow(1 - Math.pow(q, 2.6), 1 / 2.6); };   // quota del dorso in (x, y)

function vmhTube(rs, seg, n) {   // tubo liscio lungo una spezzata. Anello: { c: centro, d: verso del "dorso", a: raggio lungo d, b: raggio laterale, sh: ombra, t: tinta [r,g,b], o: [spostamento lungo d, laterale] }
  seg = seg || 12; n = n || 2.2;
  const N = rs.length, pos = [], uv = [], col = [], idx = [];
  for (let i = 0; i < N; i++) {
    const r = rs[i], p0 = rs[Math.max(0, i - 1)].c, p1 = rs[Math.min(N - 1, i + 1)].c;
    const T = t3nm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]), k = r.d[0] * T[0] + r.d[1] * T[1] + r.d[2] * T[2];
    const D = t3nm([r.d[0] - T[0] * k, r.d[1] - T[1] * k, r.d[2] - T[2] * k]), W = t3cr(D, T);
    const sh = r.sh === undefined ? 1 : r.sh, t = r.t || [1, 1, 1], o = r.o || [0, 0];
    for (let j = 0; j < seg; j++) {
      const an = j / seg * 6.2831853, cx = Math.cos(an), sy = Math.sin(an);
      const lx = o[0] + r.a * Math.sign(cx) * Math.pow(Math.abs(cx), 2 / n), ly = o[1] + r.b * Math.sign(sy) * Math.pow(Math.abs(sy), 2 / n);
      pos.push(r.c[0] + D[0] * lx + W[0] * ly, r.c[1] + D[1] * lx + W[1] * ly, r.c[2] + D[2] * lx + W[2] * ly);
      uv.push(j / seg, i / Math.max(1, N - 1)); col.push(sh * t[0], sh * t[1], sh * t[2]);
    }
  }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  for (const e of [0, N - 1]) {   // tappi alle due estremita
    const ci = pos.length / 3, r = rs[e], sh = r.sh === undefined ? 1 : r.sh, t = r.t || [1, 1, 1]; let sx = 0, sy = 0, sz = 0;
    for (let j = 0; j < seg; j++) { const q = (e * seg + j) * 3; sx += pos[q]; sy += pos[q + 1]; sz += pos[q + 2]; }
    pos.push(sx / seg, sy / seg, sz / seg); uv.push(0.5, e ? 1 : 0); col.push(sh * t[0], sh * t[1], sh * t[2]);
    for (let j = 0; j < seg; j++) { const a = e * seg + j, b = e * seg + (j + 1) % seg; if (e) idx.push(ci, b, a); else idx.push(ci, a, b); }
  }
  return t3Geo(pos, uv, col, idx);
}

function vmhPath(K, rc) {   // dal punto K (x, z): un tratto dritto tangente al manico (raggio rc), poi l'arco attorno al manico; s = strada percorsa da K (negativa: prima di K)
  const d = Math.hypot(K[0], K[1]), r = Math.min(rc, d * 0.92), aT = Math.atan2(K[0], K[1]) + Math.acos(r / d), Lt = Math.sqrt(d * d - r * r);
  const tx = Math.cos(aT), tz = -Math.sin(aT), nx = Math.sin(aT), nz = Math.cos(aT);
  return (s) => {
    if (s <= Lt) return { p: [r * nx + tx * (s - Lt), r * nz + tz * (s - Lt)], n: [nx, nz] };
    const a = aT + (s - Lt) / r; return { p: [r * Math.sin(a), r * Math.cos(a)], n: [Math.sin(a), Math.cos(a)] };
  };
}

function vmhPoly(pts, step) {   // punti equidistanti lungo una spezzata [[x, y]...], con la direzione del tratto
  const out = []; let acc = 0, next = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    while (next <= acc + L) { const u = (next - acc) / L; out.push({ p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], t }); next += step; }
    acc += L;
  }
  return out;
}

function vmhOnBack(B, R, pts, o) {   // tubo sottile che segue la superficie del dorso: pts [[x, y]...]; o: { k: materiale, c: colore, a, b: raggi, lift: altezza }
  const rs = pts.map(q => ({ c: [q[0], q[1], vmhSurf(q[0], q[1], R) + o.lift], d: [0, 0, 1], a: o.a, b: o.b || o.a }));
  B.add('hand', vmhTube(rs, o.seg || 6, 2), [0, 0, 0], o.c, { ao: false, nz: 0.12, uk: 10 });
}

function vmhFinger(B, R, i) {   // un dito: tre falangi che avvolgono il manico, giunture con pieghe, polpastrello, unghia
  const F = VMH.F[i], y = 0.0275 - 0.0205 * i, SK = VMH.SK, XK = VMH.XK;
  const zk = vmhZin(XK, R) + vmhPr(XK, R)[0] / 2, path = vmhPath([XK, zk], R + 0.0072 * F.w / 0.0097);
  const j1 = F.L[0], j2 = j1 + F.L[1], Lt = j2 + F.L[2], w1 = F.w * 0.78, cap = 0.0065;
  const prof = (s) => {   // forma del dito alla distanza s dalla nocca: raggi, gobbe alle giunture, pieghe e colore
    const w = F.w + (w1 - F.w) * Math.max(0, Math.min(1, s / Lt)), bump = 1 + 0.11 * vmhG(s, j1, 0.005) + 0.075 * vmhG(s, j2, 0.0042);
    const gr = Math.max(Math.exp(-Math.pow((Math.abs(s - j1) - 0.0042) / 0.0013, 2)), Math.exp(-Math.pow((Math.abs(s - j2) - 0.0038) / 0.0012, 2)));
    const jt = Math.max(vmhG(s, j1, 0.006), vmhG(s, j2, 0.005)), pad = vmhSm((s - j2 - 0.002) / 0.012);
    return { a: 0.86 * w * bump * (1 - 0.04 * gr), b: w * bump * (1 - 0.04 * gr), sh: 1 - 0.1 * gr, a0: 0.86 * w * bump, t: [1, 1 - 0.03 * jt - 0.02 * pad, 1 - 0.04 * jt - 0.03 * pad] };
  };
  const rs = [], ring = (s, k) => { const q = path(s), p = prof(Math.max(0, s)); rs.push({ c: [q.p[0], y, q.p[1]], d: [q.n[0], 0, q.n[1]], a: p.a * k, b: p.b * k, sh: p.sh, t: p.t }); };
  for (let s = -0.007; s < Lt - 0.001; s += 0.0032) ring(s, 1);
  ring(Lt, 1);
  for (const f of [0.35, 0.7, 1.0, 1.25, 1.42, 1.53]) ring(Lt + cap * Math.sin(f), Math.cos(f));   // punta arrotondata
  B.add('hand', vmhTube(rs, 12, 2.2), [0, 0, 0], SK, { ao: false, nz: 0.12, uk: 10 });
  B.sph('hand', [0.0108, 0.0102, 0.0108], [XK + 0.004, y, zk + 0.004], SK, { w: 12, h: 8, ao: false, nz: 0.12, uk: 10 });   // nocca
  const bw = 0.0052 * F.w / 0.0097, nr = [];   // unghia pulita: guscio sottile sopra la punta del dito, rosata alla base e piu chiara al bordo
  const s0 = Lt - 0.0125, s1 = Lt - 0.0005, n = Math.round((s1 - s0) / 0.0022);
  for (let k = 0; k <= n; k++) { const u = k / n, s = s0 + (s1 - s0) * u, q = path(s), p = prof(s); nr.push({ c: [q.p[0], y, q.p[1]], d: [q.n[0], 0, q.n[1]], a: 0.0012, b: bw * (0.8 + 0.2 * vmhSm(u * 3)) * (k === n ? 0.82 : 1), o: [p.a0 + 0.0001, 0], t: [1.02 + 0.03 * u, 0.98 + 0.03 * u, 0.97 + 0.03 * u] }); }
  B.add('hand', vmhTube(nr, 10, 2.6), [0, 0, 0], '#f3d3c6', { ao: false, nz: 0.05 });
}

function vmhThumb(B, R) {   // pollice: parte dal rilievo del palmo (tenar) e sale lungo il lato sinistro del manico
  const SK = VMH.SK, rt = R + 0.0105, dA = 0.06 / (R + 0.016), a0 = -0.55;
  const P = (u) => { const a = a0 - dA * Math.pow(u, 0.85), r = rt + 0.011 * Math.pow(1 - u, 1.6); return { c: [r * Math.sin(a), 0.016 + 0.05 * u, r * Math.cos(a)], d: [Math.sin(a), 0, Math.cos(a)] }; };
  const prof = (u) => {
    const q = vmhInt(VMH.TH, Math.min(1, u)), bump = 1 + 0.1 * vmhG(u, 0.62, 0.05) + 0.06 * vmhG(u, 0.34, 0.05), gr = Math.exp(-Math.pow((Math.abs(u - 0.62) - 0.05) / 0.016, 2)), jt = vmhG(u, 0.62, 0.07);
    return { a: q[0] * bump * (1 - 0.04 * gr), b: q[1] * bump * (1 - 0.04 * gr), a0: q[0] * bump, sh: 1 - 0.1 * gr, t: [1, 1 - 0.03 * jt, 1 - 0.04 * jt] };
  };
  const rs = [], n = 24;
  for (let k = 0; k <= n; k++) { const u = k / n, q = P(u), p = prof(u); rs.push({ c: q.c, d: q.d, a: p.a, b: p.b, sh: p.sh, t: p.t }); }
  const e = P(1), e0 = P(0.96), T = t3nm([e.c[0] - e0.c[0], e.c[1] - e0.c[1], e.c[2] - e0.c[2]]), pe = prof(1);
  for (const f of [0.35, 0.7, 1.0, 1.25, 1.42, 1.53]) { const L = 0.0075 * Math.sin(f), k = Math.cos(f); rs.push({ c: [e.c[0] + T[0] * L, e.c[1] + T[1] * L, e.c[2] + T[2] * L], d: e.d, a: pe.a * k, b: pe.b * k, sh: 1, t: [1, 0.98, 0.97] }); }
  B.add('hand', vmhTube(rs, 12, 2.2), [0, 0, 0], SK, { ao: false, nz: 0.12, uk: 10 });
  const nr = [];   // unghia del pollice
  for (let k = 0; k <= 7; k++) { const u = 0.8 + 0.185 * k / 7, q = P(u), p = prof(u); nr.push({ c: q.c, d: q.d, a: 0.0013, b: 0.0072 * (0.8 + 0.2 * vmhSm(k / 7 * 3)) * (k === 7 ? 0.85 : 1), o: [p.a0 + 0.0001, 0], t: [1.02 + 0.03 * k / 7, 0.98 + 0.03 * k / 7, 0.97 + 0.03 * k / 7] }); }
  B.add('hand', vmhTube(nr, 10, 2.6), [0, 0, 0], '#f3d3c6', { ao: false, nz: 0.05 });
}

function vmhBack(B, R) {   // dettagli sul dorso: tendini estensori, dal polso a ogni nocca (appena accennati)
  for (let i = 0; i < 4; i++) {
    const yk = 0.0275 - 0.0205 * i, pts = []; for (let k = 0; k <= 5; k++) { const x = -0.012 + k * 0.0092; pts.push([x, VMH.YC + (yk - VMH.YC) * (0.55 + 0.45 * k / 5)]); }
    vmhOnBack(B, R, pts, { c: VMH.SK, a: 0.0021, b: 0.0024, lift: 0.0003 });
  }
}

function t3VMHand(B, p, r, left, R) {   // mano che stringe un'impugnatura (asse y, raggio R); palmo dietro, dita che girano davanti, pollice sul lato; left = speculare
  R = R || 0.02;
  B.in(p, r, left ? [-1, 1, 1] : null, () => B.in([0, 0, 0], [0, VMH.TURN, 0], null, () => {
    const rs = VMH.P.map(q => { const T = vmhPr(q[0], R)[0]; return { c: [q[0], VMH.YC, vmhZin(q[0], R) + T / 2], d: [0, 0, 1], a: T / 2, b: q[2], sh: (q[0] < -0.044 || q[0] > 0.043) ? 0.96 : 1 }; });
    B.add('hand', vmhTube(rs, 18, 2.6), [0, 0, 0], VMH.SK, { ao: false, nz: 0.12, uk: 10 });   // palmo e dorso
    for (let i = 0; i < 4; i++) vmhFinger(B, R, i);
    vmhThumb(B, R); vmhBack(B, R);
  }));
}

function t3VMForearm(B, a, b) {   // avambraccio martoriato: pelle e vene, manica di cuoio a brandelli, bende, muscolo scoperto con tendini, osso che spunta, suture, manetta con catena
  const SK = '#d9b3a0', CL = '#5e4232', d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]), n = d.map(v => v / L);
  const at = (t, o) => [a[0] + d[0] * t + (o ? o[0] : 0), a[1] + d[1] * t + (o ? o[1] : 0), a[2] + d[2] * t + (o ? o[2] : 0)];
  const u = t3nm(t3cr(n, [0, 1, 0])), up = t3nm(t3cr(u, n)), mul = (v, k) => [v[0] * k, v[1] * k, v[2] * k], add = (v, w) => [v[0] + w[0], v[1] + w[1], v[2] + w[2]];
  const ey = t3Eul([0, 1, 0], n), ez = t3Eul([0, 0, 1], n);
  const FT = [[-0.1, 0.0255, 0.0225], [-0.06, 0.0255, 0.0225], [0, 0.0275, 0.0235], [0.06, 0.0268, 0.0232], [0.12, 0.0275, 0.0245], [0.2, 0.03, 0.0275], [0.3, 0.0335, 0.032], [0.42, 0.0365, 0.0355], [0.55, 0.039, 0.039], [0.7, 0.041, 0.041], [0.85, 0.0425, 0.0425], [1, 0.043, 0.043]];
  B.add('hand', vmhTube(FT.map(q => ({ c: at(q[0]), d: [0, 1, 0], a: q[1], b: q[2], sh: 1 - 0.06 * vmhG(q[0], 0.02, 0.025) })), 16, 2.2), [0, 0, 0], VMH.SK, { ao: false, nz: 0.12, uk: 10 });   // pelle: tubo ovale al polso che si allarga verso il gomito; parte dentro la mano
  B.seg('wood', at(0.42), at(1), 0.047, 0.058, CL, 14);   // manica di cuoio
  for (let i = 0; i < 8; i++) { const ang = i * 0.8, o = add(mul(u, Math.cos(ang) * 0.049), mul(up, Math.sin(ang) * 0.049)); B.box('wood', [0.016, 0.05, 0.004], at(0.4 - 0.025 * (i % 2), o), CL, { r: ey }); }   // brandelli
  for (let i = 0; i < 3; i++) B.tor('bone', [0.033 + i * 0.0015, 0.0075, 4, 12], at(0.08 + i * 0.075), i === 1 ? '#8a5a48' : '#b8a888', { r: ez });   // bende sporche
  B.sph('flesh', [0.03, 0.018, 0.055], at(0.26, mul(up, 0.027)), '#8a2a32', { w: 9, h: 6, r: ez });   // muscolo scoperto
  for (let i = 0; i < 4; i++) { const o = add(mul(up, 0.04), mul(u, -0.012 + 0.008 * i)); B.seg('flesh', at(0.2, o), at(0.34, o), 0.0035, 0.0035, '#e0a8a0', 4); }   // tendini
  B.cone('bone', [0.011, 0.05, 6], at(0.52, add(mul(up, 0.04), mul(u, 0.012))), '#e6dcc0', { r: t3Eul([0, 1, 0], add(up, mul(n, -0.3))) });   // osso che spunta
  B.box('flesh', [0.05, 0.003, 0.004], at(0.72, mul(up, 0.048)), '#2a1410', { r: t3Eul([1, 0, 0], u) });   // cicatrice cucita
  for (let i = 0; i < 6; i++) B.box('flesh', [0.003, 0.004, 0.016], at(0.72, add(mul(up, 0.048), mul(u, -0.02 + i * 0.008))), '#1a0c0a', { r: ez });
  B.seg('skin', at(0.04, mul(up, 0.027)), at(0.38, mul(up, 0.033)), 0.0025, 0.0025, '#6a4670', 4); B.seg('skin', at(0.06, add(mul(up, 0.024), mul(u, 0.014))), at(0.3, add(mul(up, 0.03), mul(u, 0.016))), 0.002, 0.002, '#5a3a60', 4);   // vene
  B.tor('iron', [0.036, 0.008, 5, 12], at(0.02), '#7a746c', { r: ez }); B.chain(at(0.02, mul(u, 0.04)), add(at(0.02, mul(u, 0.04)), [0.0, -0.075, 0.01]), 4);   // manetta con catena spezzata
  B.dec(1, 0.06, 0.06, add(at(0.45, mul(up, 0.058)), [0, 0, 0]), [-1.5708, 0, 0]);
}

function t3VMArms(B, hands, arms) {   // hands: [[p, r, left, R]...]; arms: [[a, b]...]
  for (const h of hands) t3VMHand(B, h[0], h[1], h[2], h[3]);
  arms.forEach((a, i) => t3VMForearm(B, [a[0][0] + (i ? -0.03 : 0.03), a[0][1], a[0][2]], a[1]));   // il polso, con la mano ruotata sul manico, sta 3 cm piu verso il lato del braccio (destro il primo, sinistro il secondo)
}

const VMB = [   // corpi delle armi: origine nell'impugnatura, canna verso -z
  (B) => {   // 0 PISTOLA: carrello di ferro corroso, volata nera, impugnatura di legno con un teschio
    B.box('iron', [0.034, 0.034, 0.21], [0, 0.055, -0.075], '#a8a29a', { b: 1.15 });
    for (let i = 0; i < 6; i++) B.box('iron', [0.0348, 0.03, 0.003], [0, 0.056, 0.012 + i * 0.0065], '#26262a');
    B.box('iron', [0.026, 0.024, 0.18], [0, 0.034, -0.09], '#6e6a62'); B.cyl('iron', [0.0105, 0.0105, 0.03, 10], [0, 0.056, -0.19], '#1a1a1e', { r: [1.5708, 0, 0] });
    B.box('iron', [0.004, 0.011, 0.005], [0, 0.079, -0.18], '#d8d2c8'); B.box('iron', [0.016, 0.01, 0.006], [0, 0.077, 0.02], '#2a2a2e');
    B.box('iron', [0.006, 0.03, 0.006], [0, 0.005, -0.07], '#5a564e'); B.box('iron', [0.006, 0.006, 0.05], [0, -0.01, -0.045], '#5a564e'); B.box('iron', [0.005, 0.016, 0.005], [0, 0.02, -0.03], '#3a3630');
    B.seg('wood', [0, 0.025, 0.012], [0, -0.09, 0.034], 0.022, 0.02, '#5a3a22', 8); B.skull([0, -0.1, 0.034], 0.38, [0.5, 0, 0]);
    B.dec(1, 0.05, 0.08, [0, 0.0725, -0.06], [-1.5708, 0, 0]);
  },
  (B) => {   // 1 FUCILE: doppietta con filo spinato attorno alle canne, castello annerito, calcio di legno
    for (const s of [-1, 1]) { B.cyl('iron', [0.0175, 0.0175, 0.48, 12], [s * 0.0185, 0.03, -0.28], '#74706a', { r: [1.5708, 0, 0], b: 1.1 }); B.cyl('iron', [0.0185, 0.0185, 0.012, 12], [s * 0.0185, 0.03, -0.52], '#1a1a1e', { r: [1.5708, 0, 0] }); B.cyl('iron', [0.0125, 0.0125, 0.004, 10], [s * 0.0185, 0.03, -0.527], '#030303', { r: [1.5708, 0, 0], ao: false }); B.box('iron', [0.012, 0.03, 0.012], [s * 0.018, 0.055, 0.0], '#3a3630', { r: [0.5, 0, 0] }); }
    B.box('iron', [0.012, 0.007, 0.46], [0, 0.0535, -0.28], '#5a564e'); B.sph('iron', 0.006, [0, 0.0585, -0.51], '#d8d2c8', { w: 5, h: 4 });
    B.box('iron', [0.074, 0.06, 0.13], [0, 0.012, -0.06], '#4c4842'); B.dec(1, 0.06, 0.1, [0, 0.0425, -0.06], [-1.5708, 0, 0]);
    B.seg('wood', [0, 0.0, 0.03], [0, -0.025, 0.11], 0.034, 0.042, '#5e4026', 8);
    for (const z of [-0.38, -0.45]) { B.tor('iron', [0.042, 0.0028, 4, 18], [0, 0.03, z], '#8a8a82', { s: [1, 0.62, 1] }); for (let i = 0; i < 8; i++) { const a = i * 0.785; B.cone('iron', [0.004, 0.014, 4], [Math.cos(a) * 0.044, 0.03 + Math.sin(a) * 0.028, z], '#9a9a92', { r: [0, 0, a - 1.5708] }); } }
  },
  (B) => {   // 2 MITRA: cassa con nastro di proiettili, teschio sul castello, maniglia, impugnature; le canne ruotanti sono a parte
    B.box('iron', [0.088, 0.082, 0.17], [0, 0.02, -0.07], '#3c3c42'); B.box('iron', [0.092, 0.012, 0.172], [0, 0.065, -0.07], '#2a2a30');
    B.box('iron', [0.075, 0.09, 0.105], [-0.088, -0.004, -0.04], '#4a4a38'); B.box('iron', [0.077, 0.01, 0.107], [-0.088, 0.044, -0.04], '#3a3a2c');
    for (let i = 0; i < 9; i++) { const t = i / 8; B.cyl('iron', [0.0058, 0.0058, 0.034, 6], [-0.055 + t * 0.03, 0.048 + Math.sin(t * 3.14) * 0.03, -0.04 - t * 0.04], '#e6c458', { r: [1.5708, 0.2, 0.3], b: 1.5 }); }
    for (const z of [-0.01, -0.12]) B.box('iron', [0.012, 0.05, 0.012], [0, 0.1, z], '#5a564e'); B.box('iron', [0.012, 0.012, 0.13], [0, 0.126, -0.065], '#5a564e');
    B.skull([0, 0.075, -0.135], 0.32, [0.2, 0, 0]); B.chain([0.044, 0.06, -0.08], [0.06, -0.05, -0.04], 6); B.dec(1, 0.07, 0.1, [0, 0.0715, -0.07], [-1.5708, 0, 0]);
    B.seg('wood', [0, -0.025, 0.0], [0, -0.095, 0.03], 0.021, 0.02, '#4a3020', 8); B.seg('wood', [0, -0.02, -0.3], [0, -0.09, -0.3], 0.019, 0.019, '#4a3020', 8); B.box('iron', [0.05, 0.03, 0.05], [0, -0.01, -0.3], '#3c3c42');
  },
  (B) => {   // 3 RAZZI: tubo verde arrugginito con cinghie di cuoio e catene, ogiva rossa, mirino, teschio dipinto
    const r = { r: [1.5708, 0, 0] };
    B.cyl('iron', [0.048, 0.048, 0.62, 16], [0, 0.03, -0.22], '#7a8a62', r); B.cyl('iron', [0.064, 0.05, 0.07, 16], [0, 0.03, 0.115], '#5a6a48', r); B.cyl('iron', [0.05, 0.05, 0.022, 16], [0, 0.03, -0.54], '#363c2c', r);
    B.cyl('iron', [0.036, 0.036, 0.08, 14], [0, 0.03, -0.565], '#d8d0b0', r); B.cone('iron', [0.038, 0.1, 14], [0, 0.03, -0.655], '#b8402a', { r: [-1.5708, 0, 0] });
    for (const z of [-0.05, -0.3, -0.44]) B.tor('flesh', [0.05, 0.008, 4, 16], [0, 0.03, z], '#3a2418'); for (const z of [-0.12, -0.38]) B.tor('iron', [0.051, 0.005, 4, 16], [0, 0.03, z], '#8a8a82');
    B.cyl('iron', [0.014, 0.014, 0.09, 10], [0, 0.098, -0.2], '#2a2a30', r); B.box('iron', [0.02, 0.025, 0.012], [0, 0.088, -0.17], '#3a3a40');
    B.seg('wood', [0, 0.0, 0.0], [0, -0.085, 0.02], 0.02, 0.019, '#4a3020', 8); B.seg('wood', [0, -0.01, -0.22], [0, -0.09, -0.22], 0.019, 0.019, '#4a3020', 8);
    B.skull([0, 0.085, -0.34], 0.5, [0, 0, 0]); B.dec(1, 0.09, 0.12, [0, 0.0785, -0.12], [-1.5708, 0, 0]); B.chain([-0.05, 0.0, -0.1], [-0.06, -0.06, -0.2], 5);
  },
  null, null,   // 4 molotov e 5 granata: solo oggetto in mano (vedi VMI)
  (B) => {   // 6 LANCIAFIAMME: tubo con alette, ugello, serbatoio rosso con teschio e tubo flessibile
    const r = { r: [1.5708, 0, 0] };
    B.cyl('iron', [0.026, 0.026, 0.4, 14], [0, 0.03, -0.2], '#6a665e', r); B.cyl('iron', [0.034, 0.028, 0.06, 14], [0, 0.03, -0.41], '#3a3630', r);
    for (let i = 0; i < 5; i++) B.tor('iron', [0.029, 0.004, 4, 14], [0, 0.03, -0.08 - i * 0.06], '#4a4640');
    B.cyl('iron', [0.052, 0.052, 0.3, 16], [-0.08, -0.045, -0.08], '#b8402a', r); for (const z of [-0.18, -0.02]) B.tor('iron', [0.054, 0.006, 4, 16], [-0.08, -0.045, z], '#7a746c');
    B.cyl('iron', [0.054, 0.054, 0.02, 16], [-0.08, -0.045, 0.075], '#8a2a1c', r); B.skull([-0.08, -0.045, 0.092], 0.55, [0, 0, 0]);
    B.seg('iron', [-0.08, -0.02, -0.235], [-0.015, 0.02, -0.06], 0.008, 0.008, '#1a1c20', 6); B.seg('wood', [0, 0.0, 0.0], [0, -0.085, 0.02], 0.02, 0.019, '#4a3020', 8);
    B.box('iron', [0.03, 0.03, 0.07], [0, 0.025, -0.02], '#3a3630'); B.dec(1, 0.05, 0.1, [-0.08, 0.0075, -0.08], [-1.5708, 0, 0]);
  },
  (B) => {   // 7 PLASMA: corpo biomeccanico con vertebre, costole aperte, teschio dagli occhi verdi, anelli di energia
    const r = { r: [1.5708, 0, 0] };
    B.box('iron', [0.07, 0.075, 0.2], [0, 0.035, -0.09], '#4a6a5a'); B.box('iron', [0.074, 0.02, 0.204], [0, 0.07, -0.09], '#2a3a32'); B.cyl('iron', [0.026, 0.034, 0.13, 12], [0, 0.035, -0.255], '#2a3a32', r);
    for (const z of [-0.2, -0.235, -0.27, -0.305]) B.tor('glow', [0.034, 0.0045, 4, 14], [0, 0.035, z], '#4dff6a', { ao: false });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B.cone('bone', [0.005, 0.07, 5], [s * 0.04, 0.045, -0.05 - i * 0.04], '#e0d4b4', { r: [0, 0, -s * 1.1] });
    B.skull([0, 0.085, -0.2], 0.42, [0, 0, 0]); for (const s of [-1, 1]) B.sph('glow', 0.006, [s * 0.0105, 0.0862, -0.1795], '#7dffa0', { w: 5, h: 4, ao: false });
    B.seg('bone', [0, 0.0, 0.0], [0, -0.085, 0.02], 0.02, 0.019, '#5a6a5a', 8); B.dec(1, 0.06, 0.1, [0, 0.0805, -0.09], [-1.5708, 0, 0]);
  }
];

const VMA = [   // mani e avambracci di ogni arma
  (B) => t3VMArms(B, [[[0, -0.005, 0.0177], [-0.189, 0, 0], false, 0.0215]], [[[0, -0.012, 0.086], [0.13, -0.15, 0.34]]]),
  (B) => t3VMArms(B, [[[0, -0.005, 0]], [[0, -0.01, -0.3], [1.5708, 0, 0], true, 0.03]], [[[0, -0.002, 0.075], [0.13, -0.15, 0.34]], [[0, -0.12, -0.3], [-0.13, -0.2, -0.05]]]),
  (B) => t3VMArms(B, [[[0, -0.03, 0]], [[0, -0.04, -0.3], null, true]], [[[0, -0.032, 0.075], [0.13, -0.17, 0.34]], [[0, -0.042, -0.225], [-0.15, -0.2, 0.02]]]),
  (B) => t3VMArms(B, [[[0, -0.035, 0]], [[0, -0.045, -0.22], null, true]], [[[0, -0.037, 0.075], [0.13, -0.16, 0.34]], [[0, -0.047, -0.145], [-0.14, -0.2, 0.08]]]),
  (B) => t3VMArms(B, [[[0, -0.015, 0], null, false, 0.06]], [[[0, -0.012, 0.125], [0.12, -0.16, 0.38]]]),
  (B) => t3VMArms(B, [[[0, -0.01, 0], null, false, 0.05]], [[[0, -0.007, 0.115], [0.12, -0.16, 0.38]]]),
  (B) => t3VMArms(B, [[[0, -0.03, 0]]], [[[0, -0.032, 0.075], [0.13, -0.17, 0.34]]]),
  (B) => t3VMArms(B, [[[0, -0.03, 0]]], [[[0, -0.032, 0.075], [0.13, -0.17, 0.34]]])
];

const VMI = {   // oggetti da lanciare (nascosti dopo il lancio) e parti mobili
  4: (B) => {   // straccio nel collo e teschio sull'etichetta (il vetro e il liquido sono a parte)
    B.cyl('flesh', [0.02, 0.016, 0.07, 8], [0, 0.145, 0], '#e8dcc0'); B.cyl('flesh', [0.021, 0.021, 0.012, 8], [0, 0.115, 0], '#6a4a38');
    B.skull([0, 0.045, 0.05], 0.42, [-0.3, 0, 0]);
    B.tor('iron', [0.063, 0.0025, 4, 18], [0, -0.05, 0], '#8a8a82', { r: [1.5708, 0, 0] });
    for (let i = 0; i < 10; i++) { const a = i * 0.628; B.cone('iron', [0.003, 0.012, 4], [Math.cos(a) * 0.064, -0.05, Math.sin(a) * 0.064], '#9a9a92', { r: [Math.sin(a) * 1.5708, 0, -Math.cos(a) * 1.5708] }); }
  },
  5: (B) => {   // granata: bomba rugosa con teschio inciso, spoletta, leva e anello
    B.sph('iron', [0.058, 0.068, 0.058], [0, 0, 0], '#7a8a5a', { w: 12, h: 9 });
    for (const yy of [-0.04, -0.013, 0.013, 0.04]) B.tor('iron', [0.058 * Math.sqrt(1 - Math.pow(yy / 0.068, 2)) + 0.002, 0.004, 4, 14], [0, yy, 0], '#5a6a40', { r: [1.5708, 0, 0] });
    B.cyl('iron', [0.016, 0.018, 0.034, 8], [0, 0.078, 0], '#8a8a82'); B.box('iron', [0.012, 0.075, 0.005], [0.024, 0.062, 0], '#9a9a92', { r: [0, 0, -0.15] }); B.tor('iron', [0.016, 0.003, 4, 8], [0.038, 0.088, 0], '#c8c8c0');
    B.skull([0, 0.035, 0.05], 0.45, [-0.3, 0, 0]); B.dec(1, 0.07, 0.07, [0, 0.0, 0.0585]);
  },
  2: (B) => {   // canne ruotanti della mitra (asse z, origine al centro)
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 1.57, x = Math.cos(a) * 0.027, y = Math.sin(a) * 0.027; B.cyl('iron', [0.0135, 0.0135, 0.4, 10], [x, y, 0], '#706c66', { r: [1.5708, 0, 0], b: 1.1 }); B.cyl('iron', [0.0145, 0.0145, 0.012, 10], [x, y, -0.2], '#1a1a1e', { r: [1.5708, 0, 0] }); B.cyl('iron', [0.009, 0.009, 0.004, 8], [x, y, -0.206], '#030303', { r: [1.5708, 0, 0], ao: false }); }
    B.cyl('iron', [0.018, 0.018, 0.4, 8], [0, 0, 0], '#4a4640', { r: [1.5708, 0, 0] }); for (const z of [-0.14, 0.0, 0.14]) B.cyl('iron', [0.05, 0.05, 0.012, 14], [0, 0, z], '#58544e', { r: [1.5708, 0, 0] });
  },
  1: (B) => {   // fusto di legno del fucile (scorre all'indietro quando si ricarica)
    B.box('wood', [0.066, 0.05, 0.19], [0, 0, 0], '#6e4c2c'); for (const z of [-0.055, 0.0, 0.055]) B.box('bone', [0.068, 0.004, 0.022], [0, 0.0255, z], '#d6c8a4');
    B.box('flesh', [0.07, 0.054, 0.012], [0, 0, 0.045], '#3a2418'); for (const x of [-0.025, 0, 0.025]) B.sph('iron', 0.004, [x, 0.0, 0.0525], '#a8a8a0', { w: 5, h: 4 }); B.dec(1, 0.06, 0.15, [0, 0.0255, 0], [-1.5708, 0, 0]);
  },
  7: (B) => B.cyl('glow', [0.015, 0.015, 0.12, 10], [0, 0, 0], '#4dff6a', { r: [1.5708, 0, 0], ao: false })   // cella di energia che pulsa
};

function t3VMTex(kind) {   // 'star' lampo di bocca, 'flame' fiammella, 'halo' alone morbido
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  if (kind === 'flame') {
    const gr = g.createRadialGradient(64, 84, 2, 64, 78, 58); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,200,70,.95)'); gr.addColorStop(0.7, 'rgba(255,100,20,.55)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(64, 4); g.quadraticCurveTo(110, 70, 90, 100); g.quadraticCurveTo(64, 126, 38, 100); g.quadraticCurveTo(18, 70, 64, 4); g.fill();
  } else {
    const gl = g.createRadialGradient(64, 64, 0, 64, 64, 64); gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.18, 'rgba(255,240,180,.95)'); gl.addColorStop(0.5, 'rgba(255,160,60,.32)'); gl.addColorStop(1, 'rgba(255,100,20,0)');
    g.fillStyle = gl; g.fillRect(0, 0, 128, 128);
    if (kind === 'star') for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.2, L = 34 + (i % 3) * 12; g.fillStyle = 'rgba(255,248,210,.9)'; g.beginPath(); g.moveTo(64 + Math.cos(a + 1.5708) * 3, 64 + Math.sin(a + 1.5708) * 3); g.lineTo(64 + Math.cos(a) * L, 64 + Math.sin(a) * L); g.lineTo(64 + Math.cos(a - 1.5708) * 3, 64 + Math.sin(a - 1.5708) * 3); g.closePath(); g.fill(); }
  }
  return new THREE.CanvasTexture(c);
}
function t3VMInit() {
  const V = T3.vm = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(T3.cam.fov, T3.cam.aspect, 0.02, 5), w: [], cur: -1, rec: 0, shots: 0, tShot: 9, sw: 1, it: 1, yaw: 0, lx: 0, ly: 0, spin: 0, spinV: 0, ch: 0, tex: { star: t3VMTex('star'), flame: t3VMTex('flame') } };
  V.scene.add(new THREE.AmbientLight(0xb8a090, 0.62));
  const key = new THREE.DirectionalLight(0xffe0c0, 0.95); key.position.set(-0.5, 0.8, 0.6); V.scene.add(key);
  const rim = new THREE.DirectionalLight(0x6a80ff, 0.28); rim.position.set(0.8, 0.2, -0.8); V.scene.add(rim);
  V.light = new THREE.PointLight(0xffb050, 0, 1.4, 1.6); V.scene.add(V.light);
  V.mat = { glass: new THREE.MeshStandardMaterial({ color: 0x4a9a50, transparent: true, opacity: 0.5, roughness: 0.12, metalness: 0.1, depthWrite: false }), liquid: new THREE.MeshBasicMaterial({ color: 0xc8701c }) };
  return V;
}
function t3VMWeapon(k) {   // costruisce braccio + arma k
  const V = T3.vm, W = VMW[k], g = new THREE.Group(), o = { g, k };
  const part = (key, fn, parent) => { const p = new THREE.Group(); for (const q of t3PropGeo('vm_' + key, fn, 0.5)) p.add(new THREE.Mesh(q.g, q.m)); (parent || g).add(p); return p; };
  const spr = (tex, col, sc) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.scale.set(sc, sc, 1); return s; };
  if (VMB[k]) o.body = part('w' + k, VMB[k]);
  o.arm = part('a' + k, VMA[k]);
  if (k === 1) { o.pump = part('w1p', VMI[1]); o.pump.position.set(0, -0.005, -0.3); }
  if (k === 2) { o.spin = part('w2s', VMI[2]); o.spin.position.set(0, 0.03, -0.26); }
  if (k === 7) { o.core = part('w7c', VMI[7]); o.core.position.set(0, 0.088, -0.12); }
  if (k === 4 || k === 5) {
    o.item = part('i' + k, VMI[k]);
    if (k === 4) {
      const prof = (a, s) => a.map(p => new THREE.Vector2(p[0] * s, p[1] * s));
      const outer = new THREE.Mesh(new THREE.LatheGeometry(prof([[0.001, -0.1], [0.05, -0.1], [0.06, -0.085], [0.062, 0], [0.056, 0.04], [0.028, 0.075], [0.02, 0.095], [0.021, 0.125], [0.001, 0.125]], 1), 14), V.mat.glass), liq = new THREE.Mesh(new THREE.LatheGeometry(prof([[0.001, -0.092], [0.044, -0.092], [0.053, -0.078], [0.055, 0], [0.049, 0.034], [0.001, 0.045]], 1), 12), V.mat.liquid);
      o.item.add(liq); o.item.add(outer);
      o.flame = spr(V.tex.flame, 0xffa030, 0.16); o.flame.position.set(0, 0.2, 0); o.item.add(o.flame);
    }
  }
  if (W.muz) {
    o.muz = new THREE.Group(); o.muz.position.set(W.muz[0], W.muz[1], W.muz[2]); g.add(o.muz);
    o.flash = spr(V.tex.star, k === 7 ? 0x70ff90 : k === 3 || k === 6 ? 0xff8a30 : 0xffc860, W.fr); o.flash.renderOrder = 10; o.muz.add(o.flash);
    if (k === 6) { o.pilot = spr(V.tex.flame, 0xffa030, 0.05); o.pilot.position.set(0, 0.012, -0.012); o.muz.add(o.pilot); o.jet = []; for (let i = 0; i < 5; i++) { const s = spr(V.tex.flame, 0xff9a30, 0.1); s.renderOrder = 10; o.muz.add(s); o.jet.push(s); } }
  }
  V.scene.add(g); g.visible = false; return o;
}
function t3VMUpdate(dt) {   // posizione, rinculo, ondeggio, cambio arma, lampi: ogni fotogramma
  const V = T3.vm, W = VMW[cur] || VMW[0];
  if (V.cur !== cur) { if (V.w[V.cur]) V.w[V.cur].g.visible = false; V.cur = cur; V.sw = 0; if (!V.w[cur]) V.w[cur] = t3VMWeapon(cur); V.w[cur].g.visible = true; V.it = 1; }
  const o = V.w[cur], g = o.g, k = cur;
  V.sw = Math.min(1, V.sw + dt / 0.28); const swE = 1 - Math.pow(1 - V.sw, 3);
  if (stats.shots !== V.shots) { V.shots = stats.shots; V.rec = Math.min(1.5, V.rec + 1); V.tShot = 0; } V.tShot += dt; V.rec *= Math.exp(-dt * (k === 6 || k === 2 ? 16 : 9));
  const mv = Math.min(1, Math.hypot(joy.x, joy.y) + (input.fwd || input.back ? 1 : 0));
  const yaw = Math.atan2(player.dirY, player.dirX); let dy = yaw - V.yaw; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI; V.yaw = yaw;
  const av = Math.max(-4, Math.min(4, dy / Math.max(dt, 0.001))); V.lx += (-av * 0.009 - V.lx) * Math.min(1, dt * 9);   // l'arma resta un po' indietro quando giri
  const ch = (thr && thr.shown) ? Math.min(1, Math.max(0, thr.p)) : 0; V.ch += (ch - V.ch) * Math.min(1, dt * 12);
  const ax = W.pos[0] + V.lx + Math.sin(tNow * 9) * 0.006 * mv + Math.sin(tNow * 1.1) * 0.0015;
  const ay = W.pos[1] - Math.abs(Math.cos(tNow * 9)) * 0.005 * mv + Math.sin(tNow * 1.7) * 0.002 - (1 - swE) * 0.28 + V.ch * 0.035;
  const az = W.pos[2] + V.rec * W.rec + V.ch * 0.09 + (1 - swE) * 0.06;
  g.position.set(ax, ay, az); g.rotation.set(W.rx + V.rec * W.rise + (1 - swE) * -0.5 - V.ch * 0.35, W.ry - V.lx * 1.5, V.lx * 2);
  const lay = (typeof LAYOUT !== 'undefined' && LAYOUT.gun) || null, vk = typeof viewK === 'function' ? viewK() : 1;
  if (lay) { const wh = 2 * 0.45 * Math.tan(V.cam.fov * Math.PI / 360); g.position.x += ((lay.dx || 0) / vk) / RENDER_WIDTH * wh * V.cam.aspect; g.position.y -= ((lay.dy || 0) / vk) / RENDER_HEIGHT * wh; g.scale.setScalar(W.s * (lay.s || 1)); } else g.scale.setScalar(W.s);
  const mzK = isFiring && W.fr ? (k === 6 ? 1 : k === 7 ? [0, 1, 0.75, 0.4][fireAnimFrame] || 0 : [0, 1, 0.45, 0][fireAnimFrame] || 0) : 0, fl = 0.85 + 0.15 * Math.sin(tNow * 31) * Math.sin(tNow * 13);
  if (o.flash) { o.flash.material.opacity = mzK * (k === 6 ? 0.55 : 1); const s = W.fr * (0.5 + 1.1 * mzK); o.flash.scale.set(s, s, 1); o.flash.material.rotation = (V.shots * 2.399) % 6.283; }
  let lit = mzK * 2.6;
  if (o.spin) { V.spinV += (((isFiring || V.rec > 0.15) ? 30 : 0) - V.spinV) * Math.min(1, dt * 5); o.spin.rotation.z += V.spinV * dt; }
  if (o.pump) o.pump.position.z = -0.3 + 0.05 * Math.sin(Math.PI * Math.min(1, Math.max(0, (V.tShot - 0.25) / 0.3)));
  if (o.core) { const s = 1 + 0.1 * Math.sin(tNow * 7) + mzK * 0.35; o.core.scale.set(s, s, 1); lit += 0.4 + 0.15 * Math.sin(tNow * 7); }
  if (o.item) { const want = fireCooldown > 0.5 ? 0 : 1; V.it += (want - V.it) * Math.min(1, dt * 7); o.item.visible = V.it > 0.05; o.item.position.y = -0.2 * (1 - V.it); }
  if (o.flame) { const s = 0.15 + 0.03 * Math.sin(tNow * 23) + 0.02 * Math.sin(tNow * 41); o.flame.scale.set(s * 0.8, s, 1); o.flame.material.opacity = o.item.visible ? 0.95 : 0; lit += o.item.visible ? 0.5 * fl : 0; }
  if (o.pilot) { o.pilot.material.opacity = 0.85; o.pilot.scale.set(0.034 + 0.008 * fl, 0.05 + 0.012 * fl, 1); }
  if (o.jet) o.jet.forEach((s, i) => { const on = mzK > 0 ? 1 : 0, t = (tNow * 14 + i * 0.7) % 1; s.material.opacity = on * 0.8 * (1 - t * 0.6); const z = -0.03 - t * 0.28 - i * 0.02, sc = 0.07 + t * 0.12; s.position.set((i - 2) * 0.006 * t, 0.012 + t * 0.02, z); s.scale.set(sc * 0.8, sc * 1.2, 1); });
  V.light.color.setHex(W.lc); V.light.intensity = lit * fl;
  if (o.muz) V.light.position.set(g.position.x + o.muz.position.x, g.position.y + o.muz.position.y, g.position.z + o.muz.position.z); else V.light.position.set(g.position.x, g.position.y + 0.15, g.position.z);
}
function t3VMRender() {   // disegna la scena dell'arma sopra il mondo (profondita azzerata)
  const V = T3.vm || t3VMInit(); const c = V.cam, m = T3.cam;
  if (c.fov !== m.fov || c.aspect !== m.aspect) { c.fov = m.fov; c.aspect = m.aspect; c.updateProjectionMatrix(); }
  t3VMUpdate(T3.dt || 0.016);
  const gl = T3.gl; gl.autoClear = false; gl.clearDepth(); gl.render(V.scene, c); gl.autoClear = true;
}

function render3D() {
  if (T3.failed || typeof THREE === 'undefined' || curFloor !== 0 || !gameStarted) {
    T3.vmOn = false; if (T3.cv) T3.cv.style.display = 'none';
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
    T3.vmOn = false;   // braccio e arma in 3D sopra il mondo; se qualcosa va storto resta l'arma 2D
    if (!T3.vmFailed) { try { t3VMRender(); T3.vmOn = true; } catch (err) { console.error('Arma 3D disattivata, uso quella 2D:', err); T3.vmFailed = true; T3.gl.autoClear = true; } }
    ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);   // il canvas 2D resta sopra: mirino e scritte (e l'arma 2D solo se quella 3D non c'e)
    renderGun();
    if (mm.t > 0 || mm.goal || (frameCount & 3) === 0) renderMinimap();
    return true;
  } catch (err) { console.error('3D disattivato, torno al 2D:', err); T3.failed = true; T3.err = String((err && err.message) || err).slice(0, 60); if (T3.cv) T3.cv.style.display = 'none'; return false; }
}
