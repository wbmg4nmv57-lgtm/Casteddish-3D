/* ######################################################################
   CASTEDDISH - Disegno sprite, interfaccia e avvio
   Disegno di nemici e oggetti, arma in mano, minimappa, ciclo di gioco, menu, impostazioni, avvio.
   Sezioni, in ordine: sprites-render.js, first-person-weapon.js, minimap.js, game-loop.js, menu.js, settings-editor.js, main.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Disegno di nemici e oggetti
   Barre vita dei nemici, cadaveri, e disegno di tutti gli sprite
   (nemici, oggetti, proiettili).
   ====================================================================== */

const shc = mk(); shc.width = shc.height = 320;
const shx = shc.getContext('2d');

const HPTOP = {};
function hpTop(type) {
  if (HPTOP[type] !== undefined) return HPTOP[type];
  let top = 0.05;
  try {
    const cv = SPR[type][0].walk[0], W = cv.width, H = cv.height, d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    scan: for (let y = 0; y < H; y++) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 40) { top = y / H; break scan; }
  } catch (err) { /* keep the default */ }
  return (HPTOP[type] = top);
}

// Corpse effects that move: ghouls lie in bubbling rancid bile, wraiths give off a pale, semi-transparent vapor (no blood for either)
const hash1 = (a) => { const q = Math.sin(a * 12.9898 + 78.233) * 43758.5453; return q - Math.floor(q); };
function corpseFx(list, e, T) {
  const dt = e.deathTimer, S = T.sc * (e.hs || 1), seed = e.x * 13.7 + e.y * 7.1, out = Math.min(1, Math.max(0, (8 - dt) / 1.5));
  if (e.type === 'ghoul') {
    const pf = Math.min(4, Math.floor(dt / 0.14)), half = (8 + pf * 9) / 96 * 0.8, dep = (3 + pf * 1.5) / 96 * 0.7;   // the pool's size, as a fraction of the sprite
    for (let k = 0; k < 6; k++) {
      const t = tNow * 0.8 + k * 0.53 + seed * (k + 1), cyc = Math.floor(t), u = t - cyc;   // each bubble swells, then pops, then another starts elsewhere
      const lat = (hash1(cyc * 3.1 + k * 7.7 + seed) * 2 - 1) * half, dy = (hash1(cyc * 5.3 + k * 2.9 + seed) * 2 - 1) * dep * S;
      const bm = 0.05 + hash1(cyc * 1.7 + k) * 0.05, pop = u > 0.82 ? (u - 0.82) / 0.18 : 0;
      const b = bm * (0.25 + 0.75 * Math.min(1, u / 0.82)) * (1 + 0.5 * pop);
      list.push({ x: e.x, y: e.y, canvas: SH.bubble, scale: b, ox: lat * S / b, floor: 0.5 + dy / b, emit: true, alpha: Math.min(1, u * 8) * (1 - pop) * 0.9 * Math.min(1, dt * 3) * out });
    }
  } else if (e.type === 'wraith') {
    const k = Math.min(1, dt / 0.6) * out;
    for (let i = 0; i < 4; i++) {   // a low cloud lying on the floor
      const sway = Math.sin(tNow * 0.7 + i * 1.9 + seed);
      list.push({ x: e.x, y: e.y, canvas: SH.vapor, scale: (0.5 + 0.12 * i) * S * (0.9 + 0.1 * sway), ox: (i - 1.5) * 0.28, z: 0.07 + 0.02 * i, emit: true, alpha: 0.3 * k * (0.8 + 0.2 * sway) });
    }
    for (let i = 0; i < 6; i++) {   // wisps that rise slowly and thin out
      const t = tNow * 0.3 + i / 6 + seed * 0.37, u = t - Math.floor(t);
      list.push({ x: e.x, y: e.y, canvas: SH.vapor, scale: S * (0.25 + 0.3 * u), ox: Math.sin(t * 8.2 + i) * 0.35, z: 0.1 + u * 0.55, emit: true, alpha: 0.34 * Math.sin(u * Math.PI) * k });
    }
  }
}

// All the glowing effects (fires, shots, explosions, flashes) as a list of sprites. The 2D engine draws them in renderSprites;
// the 3D floor (world-3d.js, t3Fx) turns the very same list into additive Three.js sprites. 'add' = blended additively (light, not paint).
function pushFxSprites(list) {
  const near = (x, y) => (x - player.x) * (x - player.x) + (y - player.y) * (y - player.y) < 289;
  const fl = (n) => flameFrames[n & 3];
  const glow = (x, y, cvs, sc, z, al) => list.push({ x, y, canvas: cvs, scale: sc, z, emit: true, add: true, alpha: al });
  const tail = (x, y, dx, dy, cvs, sc, z, n, step, al) => {   // a fading comet tail behind a fast shot
    for (let k = 1; k <= n; k++) { const u = 1 - k / (n + 1); list.push({ x: x - dx * k * step, y: y - dy * k * step, canvas: cvs, scale: sc * (0.4 + 0.6 * u), z, emit: true, add: true, alpha: al * u * u }); }
  };
  for (const f of fires) {
    if (!near(f.x, f.y)) continue;
    const k = Math.min(1, f.life / 1.5), ph = (tNow * 0.8 + f.x * 3.1 + f.y * 1.7) % 1;
    glow(f.x, f.y, SH.haloW, (1.0 + f.r * 0.8) * (0.92 + 0.08 * Math.sin(tNow * 13 + f.x * 5)), 0.3, 0.5 * k);   // light cast around the fire
    for (const pt of f.pts) list.push({ x: f.x + pt.dx, y: f.y + pt.dy, canvas: fl(tNow * 10 + pt.ph | 0), scale: (0.45 + f.r * 0.25) * (0.5 + 0.5 * k), floor: 0.05, emit: true, add: true });
    glow(f.x + Math.sin(ph * 9 + f.x) * 0.15, f.y, SH.bullet, 0.06 * (1 - ph * 0.5), 0.2 + ph * 0.9, k * (1 - ph));   // an ember climbing
    list.push({ x: f.x, y: f.y, canvas: SH.smoke, scale: 0.3 + ph * 0.35, z: 0.75 + ph * 0.5, emit: true, alpha: 0.3 * Math.sin(ph * Math.PI) * k });   // and a wisp of smoke
  }
  for (const n of nebulas) list.push({ x: n.x, y: n.y, canvas: blobCanvas, scale: n.s * (1.6 - 0.6 * n.life / n.max), z: n.z, emit: true, alpha: Math.max(0, n.life / n.max) * 0.5 });
  for (const p of projectiles) {
    const dx = p.dirX || 0, dy = p.dirY || 0;
    if (p.kind === 'molotov' || p.kind === 'grenade') {
      list.push({ x: p.x, y: p.y, canvas: p.kind === 'molotov' ? bottleCanvas : grenadeCanvas, scale: 0.2, z: p.z, emit: true });
      list.push({ x: p.x, y: p.y, canvas: shadowCanvas, scale: 0.3, floor: 0.5, emit: true });
      if (p.kind === 'molotov') list.push({ x: p.x, y: p.y, canvas: fl(tNow * 14 | 0), scale: 0.24, z: p.z + 0.13, emit: true, add: true });   // the burning rag
    } else if (p.kind === 'flame') {
      const u = Math.min(1, p.distTraveled / 6.5);
      list.push({ x: p.x, y: p.y, canvas: fl(tNow * 14 + p.x * 7 | 0), scale: 0.2 + u * 0.5, z: p.z, emit: true, add: true, alpha: Math.max(0.2, 0.95 - p.distTraveled / 8) });
      glow(p.x, p.y, SH.haloW, 0.5 + u * 0.8, p.z, 0.45 * (1 - u * 0.7));
    } else if (p.kind === 'fireball') {
      list.push({ x: p.x, y: p.y, canvas: fl(tNow * 14 + p.x * 7 | 0), scale: 0.55, z: p.z, emit: true, add: true });
      glow(p.x, p.y, SH.haloW, 1.4, p.z, 0.7);
      tail(p.x, p.y, dx, dy, fl(tNow * 14 + 2 | 0), 0.45, p.z, 3, 0.3, 0.6);
    } else if (p.kind === 'plasma') {
      const pu = 1 + 0.1 * Math.sin(tNow * 28 + p.x * 3);
      list.push({ x: p.x, y: p.y, canvas: BOLT_F[(tNow * 16 + p.x * 5 | 0) & 3], scale: 0.34 * pu, z: p.z, emit: true, add: true });
      glow(p.x, p.y, SH.haloG, 1.0 * pu, p.z, 0.75);
      tail(p.x, p.y, dx, dy, SH.haloG, 0.55, p.z, 5, 0.2, 0.55);
    } else {
      list.push({ x: p.x, y: p.y, canvas: projectileCanvas, scale: p.big ? 0.5 : 0.2, z: p.z, emit: true, add: true });
      glow(p.x, p.y, SH.haloW, p.big ? 1.3 : 0.5, p.z, p.big ? 0.8 : 0.55);
      if (p.big) {   // rocket: fiery exhaust and a trail of smoke
        tail(p.x, p.y, dx, dy, fl(tNow * 16 | 0), 0.38, p.z, 4, 0.28, 0.9);
        for (let k = 1; k <= 4; k++) list.push({ x: p.x - dx * k * 0.5, y: p.y - dy * k * 0.5, canvas: SH.smoke, scale: 0.2 + k * 0.07, z: p.z, emit: true, alpha: 0.4 * (1 - k / 5) });
      } else tail(p.x, p.y, dx, dy, SH.bullet, 0.16, p.z, 3, 0.2, 0.6);
    }
  }
  for (const b of eShots) {
    const k = b.kind || 'bolt', nm = k === 'throw' ? ['rock', 'barrel', 'crate'][b.obj | 0] : k === 'boulder' ? 'rock' : k;
    const sc = ({ bolt: 0.3, plasma: 0.36, fire: 0.34, venom: 0.28, bullet: 0.14, bone: 0.22, skull: 0.3, web: 0.3, ice: 0.26, bat: 0.28, dark: 0.34, rock: 0.3, barrel: 0.34, crate: 0.3 })[nm] || 0.3;
    const big = b.big || (k === 'boulder' ? 1.6 : 1), dx = b.dx || 0, dy = b.dy || 0;
    if (nm === 'plasma') {
      const pu = 1 + 0.1 * Math.sin(tNow * 26 + b.x * 3);
      list.push({ x: b.x, y: b.y, canvas: PLASMA_F[(tNow * 16 + b.x * 5 | 0) & 3], scale: sc * 1.15 * big * pu, z: 0.45, emit: true, add: true });
      glow(b.x, b.y, SH.haloV, sc * 3 * big * pu, 0.45, 0.7);
      tail(b.x, b.y, dx, dy, SH.haloV, sc * 1.6 * big, 0.45, 4, 0.22, 0.5);
    } else if (nm === 'fire') {
      list.push({ x: b.x, y: b.y, canvas: fl(tNow * 14 + b.x * 7 | 0), scale: sc * 1.5 * big, z: 0.45, emit: true, add: true });
      glow(b.x, b.y, SH.haloW, sc * 3.4 * big, 0.45, 0.6);
      tail(b.x, b.y, dx, dy, fl(tNow * 14 | 0), sc * 1.2 * big, 0.45, 3, 0.25, 0.5);
    } else {
      list.push({ x: b.x, y: b.y, canvas: SH[nm] || boltCanvas, scale: sc * big, z: 0.45, emit: nm !== 'rock' && nm !== 'barrel' && nm !== 'crate', add: nm === 'bolt' || nm === 'venom' || nm === 'bullet' });
      if (nm === 'bolt') glow(b.x, b.y, SH.haloG, sc * 2.6 * big, 0.45, 0.6);
      else if (nm === 'venom') glow(b.x, b.y, SH.haloG, sc * 2.8 * big, 0.45, 0.55);
      else if (nm === 'bullet') tail(b.x, b.y, dx, dy, SH.bullet, sc * 0.9, 0.45, 3, 0.18, 0.6);
    }
  }
  for (const k of strikes) list.push({ x: k.x, y: k.y, canvas: SH[k.kind === 'bolt' ? 'markB' : 'markR'], scale: 0.55 + 0.12 * Math.sin(tNow * 14), floor: 0, emit: true, add: true });
  for (const f of fxs) { const u = f.t / f.life; list.push({ x: f.x, y: f.y, canvas: SH[f.cv], scale: f.s0 + (f.s1 - f.s0) * u, floor: 0, emit: true, add: true, alpha: 1 - u }); }
  for (const b of beams) if (b.ok) {   // sparks along the beam from the attacker to the player
    const e = b.e;
    for (let k = 0; k < 9; k++) { const u = (k + Math.random() * 0.6) / 9; list.push({ x: e.x + (player.x - e.x) * u + (Math.random() - 0.5) * 0.5, y: e.y + (player.y - e.y) * u + (Math.random() - 0.5) * 0.5, canvas: SH['spark' + b.col], scale: 0.18 + Math.random() * 0.12, z: 0.6 + (Math.random() - 0.5) * 0.3, emit: true, add: true }); }
  }
  for (const ex of explosions) {   // impacts grow, glow and fade; hits on a wall or a monster also throw sparks
    const fire = ex.kind === 'fire', u = Math.min(1, ex.timer / (ex.maxTime || 0.3)), base = ex.big ? 1.3 : fire ? 0.8 : ex.kind === 'plasma' ? 0.55 : 0.5;
    list.push({ x: ex.x, y: ex.y, canvas: ex.kind === 'plasma' ? plasmaImpactCanvas : fire ? fl(tNow * 12 | 0) : impactCanvas,
      scale: base * (0.55 + 0.75 * Math.sqrt(u)), floor: fire ? 0.05 : undefined, emit: true, add: true, alpha: 1 - u * u });
    glow(ex.x, ex.y, ex.kind === 'plasma' ? SH.haloG : SH.haloW, base * 2.6 * (0.6 + 0.4 * u), 0.5, 0.85 * (1 - u));
    if (!fire) for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + ex.x * 3, d = 0.12 + 0.55 * Math.sqrt(u);
      glow(ex.x + Math.cos(a) * d * 0.6, ex.y + Math.sin(a) * d * 0.6, ex.kind === 'plasma' ? SH.sparkB : SH.bullet, 0.08 * (1 - u), 0.45 + 0.35 * Math.sin(a * 2) * u - 0.4 * u * u, 1 - u);
    }
  }
  for (const b of blasts) {   // barrel explosion: white flash, fireball, flames, embers, rising smoke
    const t = b.t;
    if (t < 0.14) list.push({ x: b.x, y: b.y, canvas: SH.bullet, scale: 0.6 + 2.6 * (t / 0.14), z: 0.45, emit: true, add: true, alpha: 1 - 0.4 * (t / 0.14) });
    if (t < 0.5) { const u = t / 0.5; list.push({ x: b.x, y: b.y, canvas: SH.fire, scale: 0.9 + 2.0 * Math.sqrt(u), z: 0.42 + 0.18 * u, emit: true, add: true, alpha: 0.95 * (1 - u * u) }); }
    if (t < 0.7) { const u = t / 0.7; list.push({ x: b.x, y: b.y, canvas: fl(tNow * 14 | 0), scale: 0.8 + 1.4 * u, z: 0.35 + 0.3 * u, emit: true, add: true, alpha: 1 - u }); }
    if (t < 0.6) glow(b.x, b.y, SH.haloW, 2.2 + 3.2 * Math.sqrt(t / 0.6), 0.5, 0.9 * (1 - t / 0.6));
    for (const p of b.ps) {
      const u = 1 - p.life / p.max;
      if (p.k === 'ember') list.push({ x: p.x, y: p.y, canvas: SH.bullet, scale: p.s * (1 - u * 0.5), z: p.z, emit: true, add: true, alpha: 1 - u * u });
      else if (p.k === 'fire') list.push({ x: p.x, y: p.y, canvas: fl(tNow * 12 + p.ph | 0), scale: p.s * (0.7 + 0.8 * u), z: p.z, emit: true, add: true, alpha: 1 - u });
      else list.push({ x: p.x, y: p.y, canvas: SH.smoke, scale: p.s * (0.5 + 1.3 * u), z: p.z, emit: true, alpha: 0.75 * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) });
    }
  }
}

function renderSprites() {
  const list = [], P = PAL[curFloor];
  const near = (x, y) => (x - player.x) * (x - player.x) + (y - player.y) * (y - player.y) < 289;
  for (const e of enemies) {
    if ((e.x - player.x) ** 2 + (e.y - player.y) ** 2 > 576) continue;
    const T = TYPES[e.type], S = SPR[e.type][e.v | 0];
    let cv;
    if (!e.alive) cv = S.die[Math.min(4, Math.floor(e.deathTimer / 0.14))];
    else if (e.state === 'cower') cv = extraSprites(e.type, e.v | 0).cower[e.frame % 2];
    else if (e.foe && e.view && !T.boss) cv = duelFrame(e, S);
    else if (e.state === 'attack' || e.state === 'summon') cv = S.attack[e.frame % 4];
    else if (e.back) cv = extraSprites(e.type, e.v | 0).flee[e.frame % 8];
    else cv = S.walk[e.frame % 8];
    let ox = 0;
    if (e.alive && T.boss) ox = e.state === 'attack' ? (Math.random() - 0.5) * 0.08 : Math.sin(tNow * 3) * 0.07;
    list.push({ x: e.x, y: e.y, canvas: cv, scale: T.sc * (e.hs || 1), floor: 0.06, lift: T.lift ? T.lift + Math.sin(tNow * 3 + e.x) * 0.04 : 0, ox, hp: e.alive && e.hp < e.mhp ? Math.max(0, e.hp / e.mhp) : undefined, ht: e.type, en: true, alpha: e.mist > 0 ? 0.4 : undefined });
    if (!e.alive && (e.type === 'ghoul' || e.type === 'wraith') && e.deathTimer < 8 && (e.x - player.x) ** 2 + (e.y - player.y) ** 2 < 144) corpseFx(list, e, T);
  }
  if (stairs) {
    const by = stairs.y - 0.5;   // the alcove spans by .. by + 1
    list.push({ x: stairs.x, y: by + 0.12, canvas: stairPortal, scale: 0.72, floor: 0, lift: 0.28, emit: true });
    for (let i = 0; i < STAIR_STEPS; i++) list.push({ x: stairs.x, y: by + 0.8 - i * 0.085, canvas: stairSlabs[i], scale: 1, floor: 0 });
  }
  if (aim) list.push({ x: aim.x, y: aim.y, canvas: ringCanvas, scale: 0.4, floor: 0.5, emit: true });
  if (doorAnim && doorAnim.s === 1) { const u = Math.min(1, doorAnim.t - 3.7); list.push({ x: (doorCell % N) + 0.5, y: Math.floor(doorCell / N) + 0.5, canvas: doorTexCv, scale: 1, floor: 0, lift: u * u * (3 - 2 * u), clip: true }); }
  for (const q of pickups) if (!q.taken) list.push({ x: q.x, y: q.y, canvas: pickupIcons[q.kind === 'arm' ? 'arm' + q.t : q.kind], scale: 0.38, floor: 0.1, bob: true, emit: true });
  for (const q of props) {
    if (!near(q.x, q.y)) continue;
    if (q.type === 'deco') list.push({ x: q.x, y: q.y, canvas: (q.flip ? decoFlip : decoArt)[q.k], scale: DECOR[curFloor][q.k].sc, floor: 0.08 });
    else if (q.type === 'xbarrel') {
      list.push({ x: q.x, y: q.y, canvas: xbarrelArt, scale: 0.62, floor: 0.04 });
      if (q.hp < q.max) {   // a damaged barrel smokes (and starts to burn when nearly gone): it is about to blow
        const ph = (tNow * 0.7 + q.x * 3) % 1;
        list.push({ x: q.x, y: q.y, canvas: SH.smoke, scale: 0.3 + ph * 0.3, z: 0.65 + ph * 0.35, emit: true, alpha: 0.55 * (1 - ph) });
        if (q.hp < q.max * 0.5) list.push({ x: q.x, y: q.y, canvas: flameFrames[(tNow * 10 | 0) & 3], scale: 0.28, z: 0.72, emit: true });
      }
    }
    else list.push({ x: q.x, y: q.y, canvas: q.type === 'crate' ? crateArt : q.open ? chestOpenArt : chestArt, scale: q.type === 'crate' ? 0.6 : 0.5, floor: 0.04 });
  }
  for (const r of rubble) if (near(r.x, r.y)) list.push({ x: r.x, y: r.y, canvas: rubbleArt[r.mat], scale: 0.3, floor: 0.02 });
  for (const d of debris) list.push({ x: d.x, y: d.y, canvas: debrisArt[d.mat], scale: 0.1, z: d.z, emit: true });
  for (const c of chands) if (near(c.x, c.y)) list.push({ x: c.x, y: c.y, canvas: chandArt[c.v], scale: 0.5, z: 0.75, emit: true });
  pushFxSprites(list);   // fires, shots, explosions, glows (shared with the 3D floor)
  for (const sp of list) sp.d = (sp.x - player.x) * (sp.x - player.x) + (sp.y - player.y) * (sp.y - player.y);
  list.sort((a, b) => b.d - a.d);

  const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
  for (const spr of list) {
    const sx = spr.x - player.x, sy = spr.y - player.y;
    const tX = invDet * (player.dirY * sx - player.dirX * sy);
    const tY = invDet * (-player.planeY * sx + player.planeX * sy);
    if (tY <= 0.15) continue;

    const screenX = Math.floor((RENDER_WIDTH / 2) * (1 + tX / tY));
    const lh = RENDER_HEIGHT / tY, size = Math.floor(lh * spr.scale);
    let startY;
    if (spr.floor !== undefined) startY = horizon + lh / 2 - size + size * spr.floor - lh * (spr.lift || 0);
    else startY = horizon + (0.5 - (spr.z === undefined ? 0.5 : spr.z)) * lh - size / 2;
    if (spr.bob) startY -= lh * 0.05 * (1 + Math.sin(tNow * 3 + spr.x));
    const startX = -size / 2 + screenX + (spr.ox || 0) * size;

    let img = spr.canvas, isz = spr.canvas.width;
    if (!spr.emit && size > 4 && size <= 320) {
      const sh = Math.min(1, Math.max(0.12, 1 - tY / 10) * P.amb * flick + lightAt(spr.x, spr.y) * 0.5 + (spr.en ? (1 - powerK) * 0.16 : 0));
      if (sh < 0.97) {
        shx.globalCompositeOperation = 'source-over'; shx.clearRect(0, 0, 320, 320);
        shx.drawImage(spr.canvas, 0, 0, size, size);
        shx.globalCompositeOperation = 'source-atop'; shx.fillStyle = `rgba(${fogS},${(1 - sh).toFixed(3)})`; shx.fillRect(0, 0, size, size);
        img = shc; isz = size;
      }
    }

    ctx.globalAlpha = spr.alpha === undefined ? 1 : spr.alpha;
    ctx.globalCompositeOperation = spr.add ? 'lighter' : 'source-over';   // glows add light instead of painting over
    if (spr.clip) { ctx.save(); ctx.beginPath(); ctx.rect(0, horizon - lh / 2, RENDER_WIDTH, lh); ctx.clip(); }
    const a = Math.max(0, Math.floor(startX)), b = Math.min(RENDER_WIDTH, Math.floor(startX + size));
    for (let stripe = a; stripe < b; stripe++) {
      if (tY < zBuffer[stripe]) {
        const texX = Math.floor((stripe - startX) / size * isz);
        if (texX >= 0 && texX < isz) ctx.drawImage(img, texX, 0, 1, isz, stripe, startY, 1, size);
      }
    }
    if (spr.clip) ctx.restore();
    if (spr.add) ctx.globalCompositeOperation = 'source-over';
    if (spr.hp !== undefined && size >= 5) {   // HP bar: red = life left, black = life lost
      const bw = Math.max(6, Math.round(size * 0.5)), bh = Math.max(2, Math.round(size * 0.05)), bx = Math.round(startX + size / 2 - bw / 2);
      const by = Math.round(startY + size * hpTop(spr.ht) - bh - 2), fw = spr.hp > 0 ? Math.max(1, Math.round(bw * spr.hp)) : 0;
      ctx.globalAlpha = 1;
      for (let x = Math.max(0, bx - 1); x <= Math.min(RENDER_WIDTH - 1, bx + bw); x++) {
        if (tY >= zBuffer[x]) continue;
        ctx.fillStyle = '#4b4b52'; ctx.fillRect(x, by - 1, 1, bh + 2);
        if (x >= bx && x < bx + bw) { ctx.fillStyle = x - bx < fw ? '#e11d1d' : '#000'; ctx.fillRect(x, by, 1, bh); }
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* ======================================================================
   CASTEDDISH - Arma in prima persona
   Disegno dell'arma e delle mani del giocatore.
   ====================================================================== */

/* ---------- First-person weapon art ---------- */
const gunArt = [];
if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };

function metal(g, x, y, w, h, c1, c2, r) {
  const gr = g.createLinearGradient(x, y, x + w, y);
  gr.addColorStop(0, c1); gr.addColorStop(0.45, c2); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r || 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 1, y + 1, w - 2, 1.5);
}

function hand(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y);
  gr.addColorStop(0, '#8a5a3a'); gr.addColorStop(0.5, '#d9a07a'); gr.addColorStop(1, '#8a5a3a');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 4; i++) g.fillRect(x + (w * i) / 4, y + 2, 1, h * 0.45);
}

function drawGuns() {
  for (let k = 0; k < 8; k++) {
    const c = mk(); c.width = c.height = 128; gunArt.push(c);
    const g = c.getContext('2d');
    if (k === 0) {
      metal(g, 54, 16, 20, 66, '#15181c', '#6a7078', 4);
      metal(g, 58, 8, 12, 12, '#0a0b0d', '#30343a', 3);
      g.fillStyle = '#d8dce2'; g.fillRect(62, 6, 4, 4);
      g.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 6; i++) g.fillRect(55, 58 + i * 4, 18, 1.5);
      metal(g, 52, 80, 24, 16, '#101216', '#3a3e46', 3);
      metal(g, 55, 92, 18, 36, '#26180f', '#6a4630', 4);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 7; i++) g.fillRect(56, 98 + i * 4, 16, 1);
      hand(g, 40, 100, 48, 28); hand(g, 34, 90, 14, 22);
    } else if (k === 1) {
      metal(g, 44, 4, 16, 74, '#14161a', '#707780', 5); metal(g, 68, 4, 16, 74, '#14161a', '#707780', 5);
      metal(g, 60, 6, 8, 70, '#1a1c20', '#4a5058', 2);
      metal(g, 36, 58, 56, 24, '#4a2c16', '#a0703c', 8);
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 8, 60, 2, 20);
      metal(g, 42, 80, 44, 24, '#14161a', '#4a5058', 4);
      metal(g, 54, 100, 20, 28, '#4a2c16', '#a0703c', 5);
      hand(g, 30, 64, 22, 22); hand(g, 46, 106, 38, 22);
    } else if (k === 2) {
      for (let i = 0; i < 3; i++) metal(g, 42 + i * 16, 2, 12, 66, '#1b1d22', '#8a9098', 4);
      metal(g, 36, 36, 56, 10, '#101216', '#5a6068', 3); metal(g, 36, 56, 56, 8, '#101216', '#5a6068', 3);
      metal(g, 30, 66, 68, 42, '#1b1d22', '#505660', 8);
      g.fillStyle = '#c8a020'; for (let i = 0; i < 5; i++) g.fillRect(12 + i * 3, 72 + i * 7, 16, 5);
      metal(g, 54, 56, 20, 12, '#101216', '#3a3e46', 3);
      hand(g, 36, 96, 56, 32);
    } else if (k === 3) {
      metal(g, 34, 0, 60, 92, '#2c3a24', '#74905a', 12);
      g.fillStyle = '#050605'; g.beginPath(); g.ellipse(64, 6, 26, 8, 0, 0, 7); g.fill();
      g.fillStyle = '#c03020'; g.beginPath(); g.ellipse(64, 8, 9, 4, 0, 0, 7); g.fill();
      metal(g, 34, 30, 60, 6, '#14180f', '#3a4430', 2); metal(g, 34, 62, 60, 6, '#14180f', '#3a4430', 2);
      metal(g, 96, 24, 8, 34, '#14161a', '#5a6068', 2);
      metal(g, 52, 88, 24, 22, '#14161a', '#4a5058', 4);
      hand(g, 38, 98, 52, 30);
    } else if (k === 4) {
      const gb = g.createLinearGradient(46, 0, 82, 0); gb.addColorStop(0, '#16301a'); gb.addColorStop(0.35, '#4a9a52'); gb.addColorStop(1, '#16301a');
      g.fillStyle = gb; g.beginPath(); g.roundRect(46, 58, 36, 62, 14); g.fill(); g.fillRect(57, 32, 14, 30);
      g.fillStyle = 'rgba(230,160,40,.85)'; g.fillRect(49, 82, 30, 34);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(52, 62, 4, 50); g.fillRect(60, 34, 3, 24);
      g.fillStyle = '#d8d0b0'; g.fillRect(58, 22, 12, 14);
      g.fillStyle = '#ff6a00'; g.beginPath(); g.moveTo(58, 22); g.quadraticCurveTo(54, 10, 64, 0); g.quadraticCurveTo(76, 12, 70, 22); g.fill();
      g.fillStyle = '#ffe070'; g.beginPath(); g.moveTo(61, 22); g.quadraticCurveTo(59, 14, 64, 7); g.quadraticCurveTo(69, 14, 67, 22); g.fill();
      hand(g, 40, 98, 48, 30); hand(g, 38, 88, 12, 20);
    } else if (k === 5) {
      const gg = g.createRadialGradient(56, 70, 4, 64, 80, 40); gg.addColorStop(0, '#5a7a3a'); gg.addColorStop(1, '#1c2a14');
      g.fillStyle = gg; g.beginPath(); g.ellipse(64, 80, 24, 32, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(64 + i * 8, 50); g.quadraticCurveTo(64 + i * 10, 80, 64 + i * 8, 110); g.stroke(); }
      for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(42, 58 + j * 12); g.quadraticCurveTo(64, 62 + j * 12, 86, 58 + j * 12); g.stroke(); }
      metal(g, 58, 38, 12, 14, '#2a2a2e', '#7a7e86', 2);
      g.strokeStyle = '#8a8e96'; g.lineWidth = 5; g.beginPath(); g.moveTo(70, 46); g.quadraticCurveTo(94, 42, 88, 80); g.stroke();
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 2.5; g.beginPath(); g.arc(50, 42, 7, 0, 7); g.stroke();
      hand(g, 36, 96, 56, 32); hand(g, 34, 80, 14, 26);
    } else if (k === 6) {
      metal(g, 56, 6, 16, 78, '#222428', '#7a7e86', 4); metal(g, 52, 2, 24, 12, '#0e0f12', '#3a3e46', 3);
      for (const y of [30, 52]) metal(g, 52, y, 24, 6, '#14161a', '#555b63', 2);
      metal(g, 14, 62, 34, 62, '#6a1a12', '#d0482e', 14);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(20, 68, 4, 50);
      metal(g, 22, 56, 18, 10, '#1a1c20', '#5a6068', 3);
      g.strokeStyle = '#1a1c20'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 58); g.quadraticCurveTo(40, 40, 58, 78); g.stroke();
      metal(g, 60, 84, 18, 36, '#222', '#555', 4);
      hand(g, 44, 100, 52, 28);
    } else if (k === 7) {
      metal(g, 50, 22, 28, 62, '#14221a', '#4e7060', 8);
      g.fillStyle = '#4dff6a'; g.fillRect(62, 30, 4, 44);
      const pg = g.createRadialGradient(64, 52, 2, 64, 52, 30); pg.addColorStop(0, 'rgba(120,255,150,.55)'); pg.addColorStop(1, 'rgba(120,255,150,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = pg; g.fillRect(34, 22, 60, 60); g.globalCompositeOperation = 'source-over';
      metal(g, 42, 38, 10, 28, '#14221a', '#3a5a48', 3); metal(g, 76, 38, 10, 28, '#14221a', '#3a5a48', 3);
      g.fillStyle = '#7dffa0'; g.beginPath(); g.ellipse(64, 20, 11, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#0a1a10'; g.beginPath(); g.ellipse(64, 20, 6, 2.5, 0, 0, 7); g.fill();
      metal(g, 54, 82, 20, 34, '#18201c', '#3a4a40', 5);
      hand(g, 40, 100, 48, 28); hand(g, 34, 90, 14, 22);
    }
    g.fillStyle = '#1a1f2a'; g.fillRect(40, 119, 48, 9);
    finish(g, 128);
  }
}

// Muzzle flash: the room lights up, a warm glow, a spiky star and a white-hot core (green and crackling for the plasma gun, a roaring jet for the flamethrower)
function muzzleCast(k) {
  const c = cur === 7 ? '70,255,130' : cur === 6 ? '255,110,20' : '255,170,50';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(${c},${(0.09 * k).toFixed(3)})`; ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
  ctx.restore();
}
function muzzleFlash(fx, fy, r, k, gx, gy, sz) {
  const warm = cur === 7 ? '70,255,130' : cur === 6 ? '255,120,25' : cur === 3 ? '255,105,15' : '255,175,55';
  const hot = cur === 7 ? '215,255,225' : cur === 6 ? '255,230,150' : '255,246,205';
  const seed = (stats.shots + 1) * 12.9898, rr = (i) => { const v = Math.sin(seed + i * 78.233) * 43758.5453; return v - Math.floor(v); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = 0.3 * k; ctx.drawImage(gunArt[cur], gx, gy, sz, sz); ctx.globalAlpha = 1;   // the weapon is lit by its own flash
  const R = r * 4.4, gl = ctx.createRadialGradient(fx, fy, 0, fx, fy, R);
  gl.addColorStop(0, `rgba(${warm},${(0.7 * k).toFixed(3)})`); gl.addColorStop(0.3, `rgba(${warm},${(0.26 * k).toFixed(3)})`); gl.addColorStop(1, `rgba(${warm},0)`);
  ctx.fillStyle = gl; ctx.fillRect(fx - R, fy - R, R * 2, R * 2);
  if (cur === 6) {   // flamethrower: a jet of tongues leaving the nozzle
    const f = (tNow * 14 | 0) & 3;
    for (let i = 0; i < 5; i++) paintFlame(ctx, fx + (i - 2) * 4.5, fy + 10, 6.5 - Math.abs(i - 2) * 0.9, 34 - Math.abs(i - 2) * 6 + rr(i) * 8, (f + i) & 3, { ph: i * 1.3, halo: 0, sparks: i === 2 ? 1 : 0 });
  } else {
    const n = cur === 1 ? 9 : 6;
    for (let i = 0; i < n; i++) {   // thin spikes, longer upwards (the muzzle points away from us)
      const a = (i + rr(i) * 0.6) / n * 6.283, up = Math.max(0, -Math.sin(a)), L = r * (1.5 + rr(i + 7) * 2.4) * (1 + up * 1.1) * (0.55 + 0.45 * k), wd = r * 0.2;
      ctx.fillStyle = `rgba(${hot},${(0.85 * k).toFixed(3)})`; ctx.beginPath();
      ctx.moveTo(fx + Math.cos(a + 1.5708) * wd, fy + Math.sin(a + 1.5708) * wd); ctx.lineTo(fx + Math.cos(a) * L, fy + Math.sin(a) * L);
      ctx.lineTo(fx + Math.cos(a - 1.5708) * wd, fy + Math.sin(a - 1.5708) * wd); ctx.closePath(); ctx.fill();
    }
    if (cur === 7) {   // plasma: crackling arcs around the muzzle
      ctx.strokeStyle = `rgba(${hot},${(0.9 * k).toFixed(3)})`; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        let a = rr(i + 20) * 6.283, d = r * 0.4; ctx.beginPath(); ctx.moveTo(fx, fy);
        while (d < r * 2.1) { d += r * 0.3; a += (rr(i * 9 + d) - 0.5) * 1.3; ctx.lineTo(fx + Math.cos(a) * d, fy + Math.sin(a) * d); }
        ctx.stroke();
      }
    }
  }
  const core = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 1.15);
  core.addColorStop(0, `rgba(255,255,255,${(0.98 * k).toFixed(3)})`); core.addColorStop(0.45, `rgba(${hot},${(0.7 * k).toFixed(3)})`); core.addColorStop(1, `rgba(${warm},0)`);
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(fx, fy, r * 1.15, 0, 7); ctx.fill();
  ctx.restore();
}

function renderGun() {
  const W = RENDER_WIDTH, H = RENDER_HEIGHT, cx = W / 2;
  const oy = isFiring ? (fireAnimFrame % 2 === 1 ? 7 : -3) : 0;
  const mv = Math.min(1, Math.hypot(joy.x, joy.y) + (input.fwd || input.back ? 1 : 0));
  const sz = 104, gx = cx - 52 + Math.sin(tNow * 9) * 4 * mv, gy = H - sz + 10 + oy + Math.abs(Math.cos(tNow * 9)) * 3 * mv;
  CVBOX.gun = { cx: gx + sz / 2, cy: gy + sz / 2, w: sz, h: sz };
  const FLASH = [['#ffcc00', 15, 12], ['#ffcc00', 15, 8], ['#ffcc00', 15, 4], ['#ff6a00', 20, 6], null, null, ['#ff8a20', 17, 4], ['#4dff6a', 13, 18]][cur];
  const mzK = isFiring && FLASH ? (cur === 6 ? 1 : cur === 7 ? [0, 1, 0.75, 0.4][fireAnimFrame] || 0 : [0, 1, 0.45, 0][fireAnimFrame] || 0) : 0;   // the flash dies out over the first frames
  if (mzK > 0) muzzleCast(mzK);
  const lyG = layoutBegin('gun', gx + sz / 2, gy + sz / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(gunArt[cur], gx, gy, sz, sz);
  ctx.imageSmoothingEnabled = false;
  if (mzK > 0) muzzleFlash(gx + sz * 0.5, gy + FLASH[2] * sz / 128, FLASH[1], mzK, gx, gy, sz);
  layoutEnd(lyG);
  ctx.font = 'bold 12px monospace';
  const txt = (t, x, y, col, al) => {
    ctx.textAlign = al || 'left';
    ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  const lyI = layoutBegin('info', 100, 34.5);
  txt('PIANO ' + (progress + 1) + '/5', 8, 16, '#dddddd');
  const ready = remaining === 0 && keys >= keysNeed;
  txt(curFloor === 4 ? 'COPPIA ' + (pairIdx + 1) + '/5  UCCIDI I BOSS' : ready ? 'VAI ALLE SCALE!' : 'NEMICI: ' + remaining + '  CHIAVI: ' + keys + '/' + keysNeed, 8, 30, curFloor === 4 || !ready ? '#ffff77' : '#77ff77');
  txt(WEAPONS[cur].name + ' ' + (ammo[cur] === Infinity ? '\u221e' : ammo[cur]), 8, 44, '#ffd24a');
  txt(armor.t >= 0 ? 'ARMATURA ' + ARMORS[armor.t].name + ' ' + Math.ceil(armor.ap) : 'SENZA ARMATURA', 8, 58, armor.t >= 0 ? ARMORS[armor.t].col : '#999999');
  layoutEnd(lyI);
  const lyC = layoutBegin('cross', cx, H / 2);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(cx - 6, H / 2); ctx.lineTo(cx - 2, H / 2); ctx.moveTo(cx + 2, H / 2); ctx.lineTo(cx + 6, H / 2);
  ctx.moveTo(cx, H / 2 - 6); ctx.lineTo(cx, H / 2 - 2); ctx.moveTo(cx, H / 2 + 2); ctx.lineTo(cx, H / 2 + 6); ctx.stroke();
  layoutEnd(lyC);
  const bosses = enemies.filter(e => e.alive && TYPES[e.type].boss);
  if (bosses.length || ed.on) {
    const lyB = layoutBegin('boss', cx, 49);
    for (let i = 0; i < Math.max(1, bosses.length); i++) {
      const b = bosses[i], y = 38 + i * 15, frac = b ? Math.max(0, b.hp) / b.mhp : 1;
      ctx.font = 'bold 8px monospace'; txt(b ? TYPES[b.type].name : 'BOSS', cx, y - 2, '#ffd9d0', 'center');
      ctx.fillStyle = '#300'; ctx.fillRect(cx - 110, y, 220, 6); ctx.fillStyle = '#d22'; ctx.fillRect(cx - 110, y, 220 * frac, 6);
    }
    layoutEnd(lyB);
    ctx.font = 'bold 12px monospace';
  }
  if (toastT > 0 || ed.on) {
    const lyT = layoutBegin('toast', cx, H * 0.3 - 4);
    txt(toastT > 0 ? toast : 'MESSAGGIO', cx, H * 0.3, '#ffffff', 'center');
    layoutEnd(lyT);
  }
  if (player.hp <= 0 || won) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H); }
}

/* ======================================================================
   CASTEDDISH - Minimappa
   Minimappa, ingrandimento a schermo intero, icone e legenda.
   ====================================================================== */

// ---- Minimap: tap to grow it to full screen (the view zooms out from the area around you to the whole level), tap again to shrink ----
const mm = { box: document.getElementById('miniBox'), shade: document.getElementById('miniShade'), legend: document.getElementById('miniLegend'), t: 0, goal: 0, e: 0, css: 88, small: null };
function toggleMinimap(force) {
  const open = force === undefined ? mm.goal === 0 : force;
  if (mm.t === 0) {   // remember where the small box sits (it depends on the safe area)
    const st = document.getElementById('stage').getBoundingClientRect(), r = mm.box.getBoundingClientRect();
    mm.small = { top: r.top - st.top, right: st.right - r.right, size: r.width };
  }
  if (open && miniCanvas.width !== 512) miniCanvas.width = miniCanvas.height = 512;
  mm.goal = open ? 1 : 0;
}
function stepMinimap(dt) {
  if (mm.t === mm.goal) return;
  mm.t += (mm.goal ? 1 : -1) * dt / 0.45;
  if (mm.goal ? mm.t >= 1 : mm.t <= 0) mm.t = mm.goal;
  const t = mm.t, e = mm.e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const st = document.getElementById('stage'), W = st.clientWidth, H = st.clientHeight, S = Math.min(W, H) - 16, s0 = mm.small, b = mm.box.style;
  if (t === 0) { b.top = b.right = b.width = b.height = b.borderRadius = b.background = b.zIndex = ''; mm.css = s0.size - 8; applyLayout(); if (miniCanvas.width !== 256) miniCanvas.width = miniCanvas.height = 256; }
  else {
    b.translate = ''; b.scale = '';   // the custom position is already part of the rectangle the animation starts from
    const size = s0.size + (S - s0.size) * e;
    b.top = (s0.top + ((H - S) / 2 - s0.top) * e) + 'px'; b.right = (s0.right + ((W - S) / 2 - s0.right) * e) + 'px';
    b.width = b.height = size + 'px'; b.borderRadius = (8 + 8 * e) + 'px'; b.background = 'rgba(0,0,0,' + (0.7 + 0.16 * e) + ')'; b.zIndex = '40';
    mm.css = size - 8;
  }
  mm.shade.style.opacity = (0.62 * e).toFixed(3); mm.legend.style.opacity = Math.max(0, (e - 0.55) / 0.45).toFixed(3);
}

// One recognisable icon per kind of thing on the map; r is the icon radius in canvas pixels
function drawMapIcon(g, kind, x, y, r, ang) {
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineWidth = Math.max(1, r * 0.3); g.strokeStyle = 'rgba(0,0,0,.9)';
  const poly = (pts, col) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0] * r, q[1] * r) : g.moveTo(q[0] * r, q[1] * r)); g.closePath(); g.fillStyle = col; g.stroke(); g.fill(); };
  switch (kind) {
    case 'player': g.rotate(ang); poly([[1.5, 0], [-1, 1.1], [-0.5, 0], [-1, -1.1]], '#00ff66'); break;
    case 'stairs': poly([[-1.1, 1], [-1.1, 0.3], [-0.4, 0.3], [-0.4, -0.4], [0.3, -0.4], [0.3, -1], [1.1, -1], [1.1, 1]], '#66ccff'); break;
    case 'chest':
      poly([[-1.1, -0.8], [1.1, -0.8], [1.1, 0.8], [-1.1, 0.8]], '#c8883a');
      g.fillStyle = '#5a3410'; g.fillRect(-1.1 * r, -0.8 * r, 2.2 * r, 0.65 * r); g.fillStyle = '#ffe27a'; g.fillRect(-0.28 * r, -0.4 * r, 0.56 * r, 0.7 * r); break;
    case 'crate':
      poly([[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]], '#8a6a40');
      g.strokeStyle = '#3d2a12'; g.lineWidth = Math.max(1, r * 0.22); g.beginPath(); g.moveTo(-0.9 * r, -0.9 * r); g.lineTo(0.9 * r, 0.9 * r); g.moveTo(0.9 * r, -0.9 * r); g.lineTo(-0.9 * r, 0.9 * r); g.stroke(); break;
    case 'xbarrel':
      poly([[-0.8, -1], [0.8, -1], [0.8, 1], [-0.8, 1]], '#d8381e');
      g.fillStyle = '#ffd23a'; g.fillRect(-0.8 * r, -0.3 * r, 1.6 * r, 0.6 * r); break;
    case 'med': poly([[-0.4, -1.2], [0.4, -1.2], [0.4, -0.4], [1.2, -0.4], [1.2, 0.4], [0.4, 0.4], [0.4, 1.2], [-0.4, 1.2], [-0.4, 0.4], [-1.2, 0.4], [-1.2, -0.4], [-0.4, -0.4]], '#3cff6a'); break;
    case 'arm': poly([[-1, -1], [1, -1], [1, 0.2], [0, 1.3], [-1, 0.2]], '#7fd8ff'); break;
    case 'ammo': poly([[-0.65, 1.1], [-0.65, -0.3], [0, -1.2], [0.65, -0.3], [0.65, 1.1]], '#ffd23a'); break;
    case 'weap': poly([[-1.3, -0.7], [1.3, -0.7], [1.3, 0.1], [0.2, 0.1], [0.2, 1.2], [-0.5, 1.2], [-0.5, 0.1], [-1.3, 0.1]], '#ff8a1a'); break;
    case 'demon': poly([[0, -1.3], [1.25, 1], [-1.25, 1]], '#ff2a2a'); break;
    case 'ghoul': poly([[-1, -1], [1, -1], [1, 1], [-1, 1]], '#a6d62a'); break;
    case 'wraith': poly([[0, -1.5], [1.05, 0], [0, 1.5], [-1.05, 0]], '#7fe8ff'); break;
    case 'witch': {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 0.65 : 1.45; pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
      poly(pts, '#ff55ff'); break;
    }
    case 'skel': g.beginPath(); g.arc(0, 0, 0.8 * r, 0, 7); g.fillStyle = '#f2f2f2'; g.stroke(); g.fill(); break;
    case 'boss':
      g.beginPath(); g.arc(0, 0, 1.2 * r, 0, 7); g.fillStyle = '#c81414'; g.stroke(); g.fill();
      g.strokeStyle = '#ffd23a'; g.lineWidth = Math.max(1, r * 0.3); g.beginPath(); g.arc(0, 0, 1.2 * r, 0, 7); g.stroke();
      g.fillStyle = '#111'; g.fillRect(-0.6 * r, -0.4 * r, 0.45 * r, 0.5 * r); g.fillRect(0.15 * r, -0.4 * r, 0.45 * r, 0.5 * r); break;
  }
  g.restore();
}
const LEGEND = [['player', 'Giocatore'], ['stairs', 'Scale'], ['chest', 'Forziere'], ['crate', 'Cassa'], ['xbarrel', 'Barile esplosivo'], ['med', 'Medikit'], ['arm', 'Armatura'], ['ammo', 'Munizioni'],
  ['weap', 'Arma'], ['demon', 'Demone'], ['ghoul', 'Ghoul'], ['wraith', 'Spettro'], ['witch', 'Strega'], ['skel', 'Scheletro'], ['boss', 'Boss']];
function drawMiniLegend() {
  const cv = mm.legend, g = cv.getContext('2d'); cv.width = 264; cv.height = 420; g.scale(2, 2);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); if (g.roundRect) g.roundRect(0, 0, 132, 210, 8); else g.rect(0, 0, 132, 210); g.fill();
  g.font = 'bold 10px "Courier New", monospace'; g.textBaseline = 'middle';
  LEGEND.forEach(([k, name], i) => { drawMapIcon(g, k, 14, 7 + i * 14, 4.4, 0); g.fillStyle = '#e5e7eb'; g.fillText(name, 28, 7.5 + i * 14); });
}

function renderMinimap() {
  const size = miniCanvas.width, e = mm.e, g = miniCtx, Rz = 12 + 12 * e;   // half-width of the view in cells: 12 around the player, 24 = the whole level
  const cx = player.x + (N / 2 - player.x) * e, cy = player.y + (N / 2 - player.y) * e;
  const cw = size / (Rz * 2), ox = cx - Rz, oy = cy - Rz, r = (3.2 + 3 * e) * size / mm.css;
  g.fillStyle = '#05060a'; g.fillRect(0, 0, size, size);
  const X0 = Math.max(0, Math.floor(ox)), X1 = Math.min(N, Math.ceil(ox + 2 * Rz)), Y0 = Math.max(0, Math.floor(oy)), Y1 = Math.min(N, Math.ceil(oy + 2 * Rz));
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const v = map[y * N + x];
    if (v) g.fillStyle = v === 5 ? '#c8883a' : '#454a66';
    else if (e > 0.01) g.fillStyle = 'rgba(70,84,120,' + (0.22 * e).toFixed(3) + ')';
    else continue;
    g.fillRect((x - ox) * cw, (y - oy) * cw, cw + 0.5, cw + 0.5);
  }
  const ic = (kind, x, y, k) => { const sx = (x - ox) * cw, sy = (y - oy) * cw; if (sx > -r * 3 && sy > -r * 3 && sx < size + r * 3 && sy < size + r * 3) drawMapIcon(g, kind, sx, sy, r * (k || 1), 0); };
  if (stairs) ic('stairs', stairs.x, stairs.y, 1.15);
  for (const q of props) if (q.type === 'crate' || q.type === 'xbarrel' || (q.type === 'chest' && !q.open)) ic(q.type, q.x, q.y, q.type === 'chest' ? 1 : 0.8);
  for (const p of pickups) if (!p.taken) ic(p.kind === 'med' ? 'med' : p.kind === 'arm' ? 'arm' : p.kind === 'ammo' ? 'ammo' : 'weap', p.x, p.y, 0.9);
  for (const en of enemies) if (en.alive) ic(TYPES[en.type].boss ? 'boss' : en.type, en.x, en.y, TYPES[en.type].boss ? 1.4 : en.type === 'skel' ? 0.65 : 0.95);
  const px = (player.x - ox) * cw, py = (player.y - oy) * cw, pa = Math.atan2(player.dirY, player.dirX);
  g.fillStyle = 'rgba(0,255,102,.13)'; g.beginPath(); g.moveTo(px, py); g.arc(px, py, cw * 4, pa - 0.6, pa + 0.6); g.closePath(); g.fill();
  drawMapIcon(g, 'player', px, py, r * 1.1, pa);
}

/* ======================================================================
   CASTEDDISH - Ciclo di gioco
   gameLoop(): chiama update() e render() a ogni fotogramma.
   ====================================================================== */

/* ---------- Game loop ---------- */
let lastTime = performance.now(), frameCount = 0, fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  rawDt = lastTime ? Math.min((now - lastTime) / 1000, 0.5) : 0;
  lastTime = now;
  frameCount++; fpsTimer += dt;
  if (fpsTimer >= 1.0) {
    fpsEl.textContent = `FPS: ${frameCount}`;
    frameCount = 0; fpsTimer = 0;
  }
  if (gameStarted) { stepMinimap(dt); if (!paused) { update(dt); if (!endShown && (player.hp <= 0 || won)) showEnd(); } }
  render();
  if (ed.on) placeHandles();
  requestAnimationFrame(gameLoop);
}

/* ======================================================================
   CASTEDDISH - Menu, difficolta e fine partita
   Difficolta, modalita a tempo, salvataggio preferenze, inizio
   partita, schermata finale con statistiche.
   ====================================================================== */

/* ---------- Difficulty, start menu, timed mode, end of run ---------- */
const DIFFS = {
  easy: { name: 'FACILE', count: 0.4, hp: 0.55, dmg: 0.5 },
  normal: { name: 'MEDIA', count: 0.7, hp: 0.8, dmg: 0.75 },
  hard: { name: 'DIFFICILE', count: 1, hp: 1, dmg: 1 }   // the rules the game had before the menu existed
};
const DESC = { easy: 'Pochi nemici, fragili e poco pericolosi', normal: 'Un buon equilibrio tra sfida e sopravvivenza', hard: 'Orde numerose, nemici resistenti e letali' };
const LEVEL_TIME = [540, 600, 660, 660, 420];   // seconds allowed per floor in timed mode
const stats = { time: 0, shots: 0, objects: 0, dollars: 0 };
let DIFF = DIFFS.hard, diffKey = 'hard', startLevel = 0, TIMED = false, gameStarted = false, endShown = false, checkpoint = null, timeLeft = 0, deathCause = '';

const loadPrefs = () => { try { return JSON.parse(localStorage.getItem('casteddish') || 'null'); } catch (e) { return null; } };
const savePrefs = (o) => { try { localStorage.setItem('casteddish', JSON.stringify(o)); } catch (e) { /* storage unavailable */ } };
function relaunch(auto) { savePrefs({ diff: diffKey, timed: TIMED, level: startLevel, auto }); location.reload(); }

// Called every time a floor starts: resets the floor timer and remembers weapons, ammo and health for the retry after a defeat
function startLevelState(f) {
  timeLeft = LEVEL_TIME[f] || 600;
  checkpoint = { floor: f, hp: player.hp, armor: { t: armor.t, ap: armor.ap }, owned: owned.slice(), ammo: ammo.slice(), cur };
}
function resetRun() {
  player.hp = 100; player.kills = 0; armor.t = -1; armor.ap = 0;
  owned.fill(false); owned[0] = true; ammo.fill(0); ammo[0] = Infinity; cur = 0;
  won = false; endShown = false; deathCause = '';
  stats.time = stats.shots = stats.objects = stats.dollars = 0;
  magic.t = 0; magic.ready = false; magic.burst = null; magic.shown = -1;
  if (startLevel > 0) for (let i = 1; i <= Math.min(NW - 1, startLevel * 2 + 1); i++) { owned[i] = true; ammo[i] = (WEAPONS[i].give || 10) * 4; }   // starting later: arrive with a fair arsenal
  loadFloor(startLevel);
}
function respawn() {   // easy / medium: back to the start of the last floor, with what you had when you entered it
  const c = checkpoint;
  won = false; endShown = false; deathCause = '';
  loadFloor(c.floor);
  player.hp = c.hp; armor.t = c.armor.t; armor.ap = c.armor.ap;
  owned.splice(0, owned.length, ...c.owned); ammo.splice(0, ammo.length, ...c.ammo); cur = c.cur;
  startLevelState(c.floor);
  document.getElementById('endScreen').classList.add('hide');
}
function startGame(key, timed, level) {
  diffKey = key; DIFF = DIFFS[key]; TIMED = !!timed && key === 'hard'; startLevel = level || 0;
  document.getElementById('menu').classList.add('hide');
  setTimeout(() => { document.getElementById('menu').style.display = 'none'; }, 700);
  initAudio(); resetRun();
  const th = document.getElementById('timerHud'); th.style.display = TIMED ? 'block' : 'none'; th._t = -1;
  gameStarted = true; lastTime = performance.now();
  if (kb.on) { toggleKbHelp(true); setTimeout(() => toggleKbHelp(false), 6000); }
  if (kb.mouse) { requestMouseLock(); setTimeout(() => { if (!document.pointerLockElement) say('CLICCA PER USARE IL MOUSE'); }, 500); }
}
function showEnd() {
  endShown = true;
  if (document.pointerLockElement) document.exitPointerLock();
  const el = document.getElementById('endScreen'), soft = diffKey !== 'hard', win = won;
  el.classList.toggle('win', win);
  document.getElementById('endTitle').textContent = win ? 'VITTORIA!' : deathCause === 'time' ? 'TEMPO SCADUTO' : 'SEI MORTO';
  document.getElementById('endSub').textContent = win ? 'Il castello è libero: Casteddish è salvo!' : soft ? 'Riparti dall\'inizio del piano ' + (checkpoint.floor + 1) + ' con le armi, le munizioni e la vita che avevi.' : 'In modalità difficile si riparte da zero.';
  const retry = document.getElementById('btnRetry');
  retry.style.display = win ? 'none' : ''; retry.textContent = soft ? 'RIPRENDI DAL PIANO ' + (checkpoint.floor + 1) : 'RICOMINCIA DA ZERO';
  const t = Math.floor(stats.time), total = stats.dollars + player.kills * 500 + stats.shots * 6, f = (n) => n.toLocaleString('it-IT');
  const rows = [['Tempo impiegato', Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')], ['Nemici eliminati', f(player.kills)], ['Colpi sparati', f(stats.shots)], ['Oggetti distrutti', f(stats.objects)], ['Danni causati', '$ ' + f(total)]];
  document.getElementById('endStats').innerHTML = rows.map(r => '<span>' + r[0] + '</span><b>' + r[1] + '</b>').join('');
  el.classList.remove('hide');
}
function setupMenu(prefs) {
  let sel = DIFFS[prefs.diff] ? prefs.diff : 'hard', timed = !!prefs.timed, lvl = Number.isInteger(prefs.level) && prefs.level >= 0 && prefs.level <= 4 ? prefs.level : 0;
  const btns = [...document.querySelectorAll('#menu .diffs button')], row = document.getElementById('timedRow');
  const desc = document.getElementById('diffDesc'), lname = document.getElementById('lvlName'), lnum = document.getElementById('lvlNum');
  const dd = document.getElementById('lvlDd'), lbtn = document.getElementById('lvlBtn'), llist = document.getElementById('lvlList');
  llist.innerHTML = FLOOR_ORDER.map((f, i) => '<button type="button" role="option" data-l="' + i + '"><b>' + (i + 1) + '</b>' + FLOOR_NAMES[f] + '</button>').join('');
  const lbtns = [...llist.children];
  const openDd = (v) => {   // the level list drops down below the button, or up when there is no room underneath
    dd.classList.toggle('open', v); lbtn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (!v) return;
    const r = lbtn.getBoundingClientRect(), need = llist.scrollHeight + 8, below = innerHeight - r.bottom - 8, above = r.top - 8, up = below < need && above > below;
    dd.classList.toggle('up', up); llist.style.setProperty('--mh', Math.max(90, Math.min(need, up ? above : below)) + 'px');
    const s = llist.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  };
  const paint = () => {
    if (sel !== 'hard') timed = false;
    btns.forEach(b => b.classList.toggle('sel', b.dataset.d === sel));
    lbtns.forEach(b => { const on = +b.dataset.l === lvl; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    lname.textContent = FLOOR_NAMES[FLOOR_ORDER[lvl]]; lnum.textContent = lvl + 1;
    row.classList.toggle('off', sel !== 'hard'); row.classList.toggle('on', timed);
    desc.textContent = DESC[sel] + (timed ? ' \u00b7 tempo limite per ogni piano' : '');
  };
  const order = ['easy', 'normal', 'hard'];
  menuApi = {
    move: (d) => { sel = order[(order.indexOf(sel) + d + 3) % 3]; paint(); }, pick: (i) => { sel = order[i]; paint(); },
    level: (d) => { lvl = (lvl + d + 5) % 5; paint(); },
    timed: () => { if (sel === 'hard') { timed = !timed; paint(); } },
    close: () => { const was = dd.classList.contains('open'); if (was) openDd(false); return was; },
    start: () => { if (dd.classList.contains('open')) openDd(false); else document.getElementById('btnStart').click(); }
  };
  btns.forEach(b => b.addEventListener('click', () => { sel = b.dataset.d; paint(); }));
  lbtn.addEventListener('click', () => openDd(!dd.classList.contains('open')));
  lbtns.forEach(b => b.addEventListener('click', () => { lvl = +b.dataset.l; paint(); openDd(false); }));
  document.addEventListener('pointerdown', (e) => { if (dd.classList.contains('open') && !dd.contains(e.target)) openDd(false); }, true);
  row.addEventListener('click', () => { if (sel === 'hard') { timed = !timed; paint(); } });
  document.getElementById('btnStart').addEventListener('click', () => { savePrefs({ diff: sel, timed, level: lvl, auto: false }); startGame(sel, timed, lvl); });
  paint();
}

/* ======================================================================
   CASTEDDISH - Pausa e impostazioni dell'interfaccia
   Menu di pausa e editor per spostare e ridimensionare i controlli a
   schermo.
   ====================================================================== */

/* ---------- Pause and interface layout (settings) ---------- */
let paused = false;
const LAYOUT_KEY = 'casteddish_layout';
let LAYOUT = {};   // id -> { dx, dy, s }: offset in screen pixels from the default position, and size multiplier
const DOMEL = { fire: ['btnFire', 'throwSlider'], weapon: ['btnWeapon'], use: ['btnUse'], magic: ['btnMagic'], map: ['miniBox'], timer: ['timerHud'], top: ['hudInfo'], gear: ['btnGear'] };
const CVBOX = { info: { cx: 100, cy: 34.5, w: 192, h: 60 }, cross: { cx: 256, cy: 128, w: 20, h: 20 }, boss: { cx: 256, cy: 49, w: 224, h: 28 }, toast: { cx: 256, cy: 72.8, w: 270, h: 18 }, gun: { cx: 256, cy: 205, w: 104, h: 104 } };
const ELEMS = [['gun', 'Arma in mano'], ['info', 'Info di gioco'], ['top', 'Barra in alto'], ['toast', 'Messaggi'], ['boss', 'Vita del boss'], ['cross', 'Mirino'], ['map', 'Minimappa'], ['timer', 'Timer'],
  ['gear', 'Pausa'], ['joy', 'Joystick (solo grandezza)'], ['magic', 'Magia di fuoco'], ['use', 'Pulsante APRI'], ['weapon', 'Pulsante ARMA'], ['fire', 'Pulsante fuoco e barra di lancio']];
const ed = { on: false, sel: null, backup: '', from: 'menu', saved: null, handles: {} };

let VK = 1;
function measureStage() { const st = document.getElementById('stage'); VK = Math.min(st.clientWidth / RENDER_WIDTH, st.clientHeight / RENDER_HEIGHT) || 1; }
const viewK = () => VK;
function layoutBegin(id, ax, ay) {   // canvas HUD groups: move and scale around their own centre
  const l = LAYOUT[id]; if (!l) return false;
  const k = viewK(); ctx.save(); ctx.translate(ax + (l.dx || 0) / k, ay + (l.dy || 0) / k); ctx.scale(l.s || 1, l.s || 1); ctx.translate(-ax, -ay); return true;
}
function layoutEnd(on) { if (on) ctx.restore(); }

function loadLayout() { try { const o = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); LAYOUT = o && typeof o === 'object' ? o : {}; } catch (e) { LAYOUT = {}; } }
function saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(LAYOUT)); return true; } catch (e) { return false; } }
function applyLayout() {
  for (const id in DOMEL) {
    if (id === 'map' && mm.t > 0) continue;   // the full-screen animation positions it by itself
    const l = LAYOUT[id] || {}, sc = l.s || 1;
    for (const eid of DOMEL[id]) { const el = document.getElementById(eid); el.style.translate = (l.dx || 0) + 'px ' + (l.dy || 0) + 'px'; el.style.scale = sc; }
  }
  const l = LAYOUT.weapon || {}, sc = l.s || 1, m = document.getElementById('weaponMenu');   // the weapon menu stays attached to the ARMA button
  m.style.translate = ((l.dx || 0) - 42 * (sc - 1)) + 'px ' + ((l.dy || 0) + 19 * (sc - 1)) + 'px'; m.style.scale = sc;
  document.getElementById('joyBase').style.scale = (LAYOUT.joy && LAYOUT.joy.s) || 1;
}
function rectOf(id) {   // where an element is on screen, in stage pixels
  const st = document.getElementById('stage'), sr = st.getBoundingClientRect();
  if (id === 'joy' || DOMEL[id]) {
    const r = document.getElementById(id === 'joy' ? 'joyBase' : DOMEL[id][0]).getBoundingClientRect();
    return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
  }
  const b = CVBOX[id], k = viewK(), l = LAYOUT[id] || {}, sc = l.s || 1;
  const cx = (st.clientWidth - RENDER_WIDTH * k) / 2 + b.cx * k + (l.dx || 0), cy = (st.clientHeight - RENDER_HEIGHT * k) / 2 + b.cy * k + (l.dy || 0);
  return { x: cx - b.w * sc * k / 2, y: cy - b.h * sc * k / 2, w: b.w * sc * k, h: b.h * sc * k };
}
function clampLayoutEl(id) {   // keep an element inside the screen
  if (id === 'joy' || (id === 'map' && mm.t > 0)) return;
  const st = document.getElementById('stage'), W = st.clientWidth, H = st.clientHeight, r = rectOf(id);
  if (!r.w || !r.h) return;
  let ddx = 0, ddy = 0;
  if (r.x < 2) ddx = 2 - r.x; else if (r.x + r.w > W - 2) ddx = W - 2 - (r.x + r.w);
  if (r.y < 2) ddy = 2 - r.y; else if (r.y + r.h > H - 2) ddy = H - 2 - (r.y + r.h);
  if (ddx || ddy) { const l = LAYOUT[id] || (LAYOUT[id] = { dx: 0, dy: 0, s: 1 }); l.dx = (l.dx || 0) + ddx; l.dy = (l.dy || 0) + ddy; applyLayout(); }
}

function releaseInputs() { pads.forEach(f => f()); for (const k in input) input[k] = false; }
function setPaused(on) {
  if (!gameStarted || endShown || ed.on) return;
  paused = on;
  document.getElementById('pauseMenu').classList.toggle('hide', !on);
  if (on) {
    releaseInputs(); toggleMinimap(false); toggleWeaponMenu(false); toggleKbHelp(false);
    if (document.pointerLockElement) document.exitPointerLock();
    if (audioCtx && audioCtx.suspend) audioCtx.suspend();
  } else {
    if (audioCtx && audioCtx.resume) audioCtx.resume();
    if (kb.mouse) requestMouseLock();
  }
}

// ---- interface editor ----
function placeHandles() {
  for (const [id] of ELEMS) { const r = rectOf(id), h = ed.handles[id]; h.style.left = r.x + 'px'; h.style.top = r.y + 'px'; h.style.width = r.w + 'px'; h.style.height = r.h + 'px'; }
}
function selectEl(id) {
  ed.sel = id;
  for (const k in ed.handles) ed.handles[k].classList.toggle('sel', k === id);
  const size = document.getElementById('edSize'), val = document.getElementById('edVal'), r1 = document.getElementById('edReset1');
  if (!id) { document.getElementById('edName').textContent = 'Tocca un elemento per modificarlo'; size.disabled = r1.disabled = true; val.textContent = ''; return; }
  const sc = Math.round(((LAYOUT[id] && LAYOUT[id].s) || 1) * 100);
  document.getElementById('edName').textContent = ELEMS.find(x => x[0] === id)[1];
  size.disabled = r1.disabled = false; size.value = sc; val.textContent = sc + '%';
}
function buildHandles() {
  const box = document.getElementById('edHandles'); box.innerHTML = ''; ed.handles = {};
  let drag = null;
  const end = (e) => { if (drag && drag.pid === e.pointerId) drag = null; };
  for (const [id, label] of ELEMS) {
    const h = document.createElement('div'); h.className = 'edh'; h.innerHTML = '<b>' + label + '</b>';
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); selectEl(id);
      if (id === 'joy') return;   // the stick appears under your finger, so only its size can change
      try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const l = LAYOUT[id] || (LAYOUT[id] = { dx: 0, dy: 0, s: 1 });
      drag = { id, x: e.clientX, y: e.clientY, dx: l.dx || 0, dy: l.dy || 0, pid: e.pointerId };
    });
    h.addEventListener('pointermove', (e) => {
      if (!drag || drag.pid !== e.pointerId) return;
      const l = LAYOUT[drag.id]; l.dx = drag.dx + e.clientX - drag.x; l.dy = drag.dy + e.clientY - drag.y;
      applyLayout(); clampLayoutEl(drag.id);
    });
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    box.appendChild(h); ed.handles[id] = h;
  }
}
function openEditor(from) {
  ed.from = from; ed.backup = JSON.stringify(LAYOUT); ed.on = true;
  document.getElementById('menu').classList.add('hide'); document.getElementById('pauseMenu').classList.add('hide');
  const use = document.getElementById('btnUse'), th = document.getElementById('timerHud'), jb = document.getElementById('joyBase'), st = document.getElementById('stage');
  ed.saved = { use: use.style.display, thText: th.textContent };
  use.style.display = 'block'; th.style.display = 'block'; th.textContent = '\u23f1 9:00';   // show what is normally hidden
  jb.style.left = (st.clientWidth * 0.16 - 64) + 'px'; jb.style.top = (st.clientHeight * 0.6 - 64) + 'px'; jb.style.bottom = 'auto'; jb.style.display = 'block'; jb.classList.add('active');
  document.getElementById('edMsg').textContent = '';
  applyLayout(); buildHandles(); selectEl(null); placeHandles();
  document.getElementById('editor').classList.remove('hide');
}
function closeEditor(save) {
  let ok = true;
  if (save) ok = saveLayout(); else { LAYOUT = JSON.parse(ed.backup); applyLayout(); }
  const finish = () => {
    ed.on = false;
    const use = document.getElementById('btnUse'), th = document.getElementById('timerHud'), jb = document.getElementById('joyBase');
    use.style.display = ed.saved.use; th.style.display = TIMED ? 'block' : 'none'; th.textContent = ed.saved.thText; th._t = -1;
    jb.style.display = 'none'; jb.classList.remove('active');
    document.getElementById('editor').classList.add('hide');
    document.getElementById(ed.from === 'pause' ? 'pauseMenu' : 'menu').classList.remove('hide');
  };
  if (ok) finish(); else { document.getElementById('edMsg').textContent = 'Salvataggio non riuscito: la disposizione vale solo per questa sessione.'; setTimeout(finish, 2200); }
}
function setupSettings() {
  document.getElementById('btnSettings').addEventListener('click', () => openEditor('menu'));
  document.getElementById('btnGear').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); setPaused(true); });
  document.getElementById('pRes').addEventListener('click', () => setPaused(false));
  document.getElementById('pSet').addEventListener('click', () => openEditor('pause'));
  document.getElementById('btnPMenu').addEventListener('click', () => relaunch(false));
  const size = document.getElementById('edSize'), val = document.getElementById('edVal');
  size.addEventListener('input', () => {
    if (!ed.sel) return;
    const l = LAYOUT[ed.sel] || (LAYOUT[ed.sel] = { dx: 0, dy: 0, s: 1 });
    l.s = size.value / 100; val.textContent = size.value + '%'; applyLayout(); clampLayoutEl(ed.sel);
  });
  document.getElementById('edReset1').addEventListener('click', () => { if (ed.sel) { delete LAYOUT[ed.sel]; applyLayout(); selectEl(ed.sel); } });
  document.getElementById('edResetAll').addEventListener('click', () => { LAYOUT = {}; applyLayout(); selectEl(ed.sel); });
  document.getElementById('edCancel').addEventListener('click', () => closeEditor(false));
  document.getElementById('edSave').addEventListener('click', () => closeEditor(true));
  document.getElementById('editor').addEventListener('pointerdown', () => selectEl(null));
  const pn = document.getElementById('edPanel'), grip = document.getElementById('edGrip');
  let pd = null;
  pn.addEventListener('pointerdown', (e) => e.stopPropagation());
  grip.addEventListener('pointerdown', (e) => { e.preventDefault(); const r = pn.getBoundingClientRect(); pd = { x: e.clientX - r.left, y: e.clientY - r.top }; try { grip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
  grip.addEventListener('pointermove', (e) => {
    if (!pd) return;
    pn.style.transform = 'none';
    pn.style.left = Math.max(0, Math.min(innerWidth - pn.offsetWidth, e.clientX - pd.x)) + 'px';
    pn.style.top = Math.max(0, Math.min(innerHeight - pn.offsetHeight, e.clientY - pd.y)) + 'px';
  });
  grip.addEventListener('pointerup', () => { pd = null; }); grip.addEventListener('pointercancel', () => { pd = null; });
  window.addEventListener('resize', () => { if (!ed.on) for (const [id] of ELEMS) clampLayoutEl(id); });
}

/* ======================================================================
   CASTEDDISH - Avvio del gioco
   window.onload: carica l'audio, genera gli sprite e avvia comandi,
   menu e impostazioni.
   ====================================================================== */

window.onload = () => {
  startAudioLoad();
  generateDemonSprites();
  setupInput();
  drawMiniLegend();
  const prefs = loadPrefs() || {};
  setupMenu(prefs);
  measureStage(); window.addEventListener('resize', measureStage); window.addEventListener('orientationchange', measureStage);
  loadLayout(); applyLayout(); for (const [id] of ELEMS) clampLayoutEl(id);
  setupSettings();
  document.getElementById('btnRetry').addEventListener('click', () => { if (diffKey === 'hard') relaunch(true); else respawn(); });
  document.getElementById('btnMenu').addEventListener('click', () => relaunch(false));
  if (prefs.auto && DIFFS[prefs.diff]) { savePrefs({ diff: prefs.diff, timed: !!prefs.timed, level: prefs.level || 0, auto: false }); startGame(prefs.diff, !!prefs.timed, prefs.level || 0); }
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
};
