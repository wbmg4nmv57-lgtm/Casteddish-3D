/* ======================================================================
   CASTEDDISH - Costruzione degli sprite dei mostri
   Genera e mette in cache tutti gli sprite dei nemici (fronte, retro,
   lato, litigi).
   ====================================================================== */

const styleOf = (k, v) => Object.assign({}, STY[k], VARS[k][v][2] || {}, { weapon: VARS[k][v][0], wopt: VARS[k][v][1] });
function extraSprites(k, v) {   // the view from behind and the cowering pose are only drawn the first time an enemy needs them
  const S = SPR[k][v];
  if (!S.flee) {
    const st = styleOf(k, v), add = (arr, mode, f) => { const c = mk(); c.width = c.height = DS; drawDemon(c.getContext('2d'), mode, f, st); arr.push(c); };
    S.flee = []; S.cower = [];
    for (let f = 0; f < 8; f++) add(S.flee, 'flee', f);
    for (let f = 0; f < 2; f++) add(S.cower, 'cower', f);
  }
  return S;
}
// Views used while two monsters fight each other: attacking seen from behind, and the two flanks (built the first time a fight needs them)
function duelSprites(k, v) {
  const S = SPR[k][v];
  if (!S.side) {
    const st = styleOf(k, v), mkc = (draw) => { const c = mk(); c.width = c.height = DS; const g = c.getContext('2d'); draw(g); return c; };
    const flip = (src) => { const c = mk(); c.width = c.height = DS; const g = c.getContext('2d'); g.translate(DS, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; };
    const lit = (c) => { finish(c.getContext('2d'), DS); return c; };
    S.battack = []; S.side = []; S.sideAtk = []; S.sideL = []; S.sideLAtk = [];
    for (let f = 0; f < 4; f++) S.battack.push(mkc(g => drawDemon(g, 'battack', f, st)));
    for (let f = 0; f < 8; f++) { S.side.push(lit(mkc(g => drawSide(g, 'swalk', f, st, false)))); S.sideL.push(lit(flip(mkc(g => drawSide(g, 'swalk', f, st, true))))); }
    for (let f = 0; f < 4; f++) { S.sideAtk.push(lit(mkc(g => drawSide(g, 'sattack', f, st, false)))); S.sideLAtk.push(lit(flip(mkc(g => drawSide(g, 'sattack', f, st, true))))); }
  }
  return S;
}
function duelFrame(e, S) {   // a monster fighting another one: the sprite of the side it turns to us
  const at = e.state === 'attack', v = e.view;
  if (v === 'front') return at ? S.attack[e.frame % 4] : S.walk[e.frame % 8];
  if (v === 'back' && !at) return extraSprites(e.type, e.v | 0).flee[e.frame % 8];
  const D = duelSprites(e.type, e.v | 0);
  if (v === 'back') return D.battack[e.frame % 4];
  if (v === 'sideR') return at ? D.sideAtk[e.frame % 4] : D.side[e.frame % 8];
  return at ? D.sideLAtk[e.frame % 4] : D.sideL[e.frame % 8];
}
function ensureSprites(types, keep) {
  if (!keep) for (const k of Object.keys(SPR)) if (!types.includes(k)) delete SPR[k];   // free the previous floor's sprites
  for (const k of types) {
    SPR[k] = SPR[k] || [];
    for (let v = 0; v < VARS[k].length; v++) {
      if (SPR[k][v]) continue;
      const S = SPR[k][v] = { walk: [], attack: [], die: [] }, st = styleOf(k, v);
      const add = (arr, mode, f) => { const c = mk(); c.width = c.height = DS; if (BOSSART[k]) BOSSART[k](c.getContext('2d'), mode, f); else drawDemon(c.getContext('2d'), mode, f, st); arr.push(c); };
      for (let f = 0; f < 8; f++) add(S.walk, 'walk', f);
      for (let f = 0; f < 4; f++) add(S.attack, 'attack', f);
      for (let f = 0; f < 5; f++) add(S.die, 'die', f);
    }
  }
}

function generateDemonSprites() {
  radialSprite(projectileCanvas, [[0, '#ffffff'], [0.3, '#ffff00'], [0.7, '#ff3300'], [1, 'rgba(255,0,0,0)']]);
  radialSprite(impactCanvas, [[0, '#ffffff'], [0.4, '#ffaa00'], [0.8, '#aa0000'], [1, 'rgba(0,0,0,0)']]);
  radialSprite(boltCanvas, [[0, '#ffffff'], [0.3, '#b6ff7a'], [0.7, '#1faa3a'], [1, 'rgba(0,80,0,0)']]);
  ['med', 'ammo', 'arm0', 'arm1', 'arm2', 'arm3', 1, 2, 3, 4, 5, 6, 7].forEach(k => { pickupIcons[k] = pickupIcon(k); });
  makeExtras();
  makeStairs(); makeFx();
  drawGuns();
  loadFloor(0);
}
