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
  for (const f of fires) {
    if (!near(f.x, f.y)) continue;
    const k = Math.min(1, f.life / 1.5);
    for (const pt of f.pts) list.push({ x: f.x + pt.dx, y: f.y + pt.dy, canvas: flameFrames[(tNow * 10 + pt.ph | 0) & 3], scale: (0.45 + f.r * 0.25) * (0.5 + 0.5 * k), floor: 0.05, emit: true });
  }
  for (const n of nebulas) list.push({ x: n.x, y: n.y, canvas: blobCanvas, scale: n.s * (1.6 - 0.6 * n.life / n.max), z: n.z, emit: true, alpha: Math.max(0, n.life / n.max) * 0.5 });
  for (const p of projectiles) {
    if (p.kind === 'molotov' || p.kind === 'grenade') {
      list.push({ x: p.x, y: p.y, canvas: p.kind === 'molotov' ? bottleCanvas : grenadeCanvas, scale: 0.2, z: p.z, emit: true });
      list.push({ x: p.x, y: p.y, canvas: shadowCanvas, scale: 0.3, floor: 0.5, emit: true });
    } else if (p.kind === 'flame') {
      list.push({ x: p.x, y: p.y, canvas: flameFrames[(tNow * 14 + p.x * 7 | 0) & 3], scale: 0.2 + Math.min(1, p.distTraveled / 6.5) * 0.5, z: p.z, emit: true, alpha: Math.max(0.2, 0.95 - p.distTraveled / 8) });
    } else if (p.kind === 'fireball') {
      list.push({ x: p.x, y: p.y, canvas: flameFrames[(tNow * 14 + p.x * 7 | 0) & 3], scale: 0.55, z: p.z, emit: true });
    } else if (p.kind === 'plasma') {
      list.push({ x: p.x, y: p.y, canvas: boltCanvas, scale: 0.26, z: p.z, emit: true });
    } else list.push({ x: p.x, y: p.y, canvas: projectileCanvas, scale: p.big ? 0.5 : 0.2, z: p.z, emit: true });
  }
  for (const b of eShots) {
    const k = b.kind || 'bolt', nm = k === 'throw' ? ['rock', 'barrel', 'crate'][b.obj | 0] : k === 'boulder' ? 'rock' : k;
    const sc = ({ bolt: 0.3, plasma: 0.36, fire: 0.34, venom: 0.28, bullet: 0.14, bone: 0.22, skull: 0.3, web: 0.3, ice: 0.26, bat: 0.28, dark: 0.34, rock: 0.3, barrel: 0.34, crate: 0.3 })[nm] || 0.3;
    list.push({ x: b.x, y: b.y, canvas: SH[nm] || boltCanvas, scale: sc * (b.big || (k === 'boulder' ? 1.6 : 1)), z: 0.45, emit: nm !== 'rock' && nm !== 'barrel' && nm !== 'crate' });
  }
  for (const k of strikes) list.push({ x: k.x, y: k.y, canvas: SH[k.kind === 'bolt' ? 'markB' : 'markR'], scale: 0.55 + 0.12 * Math.sin(tNow * 14), floor: 0, emit: true });
  for (const f of fxs) { const u = f.t / f.life; list.push({ x: f.x, y: f.y, canvas: SH[f.cv], scale: f.s0 + (f.s1 - f.s0) * u, floor: 0, emit: true, alpha: 1 - u }); }
  for (const b of beams) if (b.ok) {   // sparks along the beam from the attacker to the player
    const e = b.e;
    for (let k = 0; k < 9; k++) { const u = (k + Math.random() * 0.6) / 9; list.push({ x: e.x + (player.x - e.x) * u + (Math.random() - 0.5) * 0.5, y: e.y + (player.y - e.y) * u + (Math.random() - 0.5) * 0.5, canvas: SH['spark' + b.col], scale: 0.18 + Math.random() * 0.12, z: 0.6 + (Math.random() - 0.5) * 0.3, emit: true }); }
  }
  for (const ex of explosions) {
    const fire = ex.kind === 'fire';
    list.push({ x: ex.x, y: ex.y, canvas: ex.kind === 'plasma' ? plasmaImpactCanvas : fire ? flameFrames[(tNow * 12 | 0) & 3] : impactCanvas,
      scale: ex.big ? 1.3 : fire ? 0.8 : 0.5, floor: fire ? 0.05 : undefined, emit: true });
  }
  for (const b of blasts) {   // barrel explosion: white flash, fireball, flames, embers, rising smoke
    const t = b.t;
    if (t < 0.14) list.push({ x: b.x, y: b.y, canvas: SH.bullet, scale: 0.6 + 2.6 * (t / 0.14), z: 0.45, emit: true, alpha: 1 - 0.4 * (t / 0.14) });
    if (t < 0.5) { const u = t / 0.5; list.push({ x: b.x, y: b.y, canvas: SH.fire, scale: 0.9 + 2.0 * Math.sqrt(u), z: 0.42 + 0.18 * u, emit: true, alpha: 0.95 * (1 - u * u) }); }
    if (t < 0.7) { const u = t / 0.7; list.push({ x: b.x, y: b.y, canvas: flameFrames[(tNow * 14 | 0) & 3], scale: 0.8 + 1.4 * u, z: 0.35 + 0.3 * u, emit: true, alpha: 1 - u }); }
    for (const p of b.ps) {
      const u = 1 - p.life / p.max;
      if (p.k === 'ember') list.push({ x: p.x, y: p.y, canvas: SH.bullet, scale: p.s * (1 - u * 0.5), z: p.z, emit: true, alpha: 1 - u * u });
      else if (p.k === 'fire') list.push({ x: p.x, y: p.y, canvas: flameFrames[(tNow * 12 + p.ph | 0) & 3], scale: p.s * (0.7 + 0.8 * u), z: p.z, emit: true, alpha: 1 - u });
      else list.push({ x: p.x, y: p.y, canvas: SH.smoke, scale: p.s * (0.5 + 1.3 * u), z: p.z, emit: true, alpha: 0.75 * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) });
    }
  }
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
    if (spr.clip) { ctx.save(); ctx.beginPath(); ctx.rect(0, horizon - lh / 2, RENDER_WIDTH, lh); ctx.clip(); }
    const a = Math.max(0, Math.floor(startX)), b = Math.min(RENDER_WIDTH, Math.floor(startX + size));
    for (let stripe = a; stripe < b; stripe++) {
      if (tY < zBuffer[stripe]) {
        const texX = Math.floor((stripe - startX) / size * isz);
        if (texX >= 0 && texX < isz) ctx.drawImage(img, texX, 0, 1, isz, stripe, startY, 1, size);
      }
    }
    if (spr.clip) ctx.restore();
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
