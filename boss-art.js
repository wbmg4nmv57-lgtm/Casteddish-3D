/* ======================================================================
   CASTEDDISH - Grafica dei boss
   Dieci boss disegnati a mano: Re Scheletro, Golem, Negromante,
   Cavaliere Nero, Ragno, Demone Infernale, Ciclope, Vampiro, Viverna,
   Arcimago.
   ====================================================================== */

// ---- Boss art: ten different bosses, each drawn by hand ----
const bo = (c, fill, lw) => { c.fillStyle = fill; c.fill(); if (lw !== 0) { c.lineWidth = lw || 2; c.strokeStyle = '#100505'; c.lineJoin = 'round'; c.stroke(); } };
const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); bo(c, fill, lw); };
const ell = (c, x, y, rx, ry, fill, lw, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 7); bo(c, fill, lw); };
const lgr = (c, x0, y0, x1, y1, ...cols) => { const g = c.createLinearGradient(x0, y0, x1, y1); cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k)); return g; };
const glowAt = (c, x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, col + '00'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
function bossFrame(c, mode, f, draw) {
  c.clearRect(0, 0, DS, DS); c.scale(DS / 96, DS / 96);
  const ph = f / 8 * Math.PI * 2, a = { s: Math.sin(ph), ph, u: f / 3, mode, f };
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(48, 91, 30, 5, 0, 0, 7); c.fill();
  if (mode === 'die') { c.translate(48, 90); c.rotate([0.04, 0.2, 0.4, 0.7, 0.95][f]); c.scale(1, [1, 0.92, 0.78, 0.58, 0.4][f]); c.translate(-48, -90); }
  c.save(); c.translate(0, mode === 'walk' ? -Math.abs(a.s) * 2.5 : mode === 'attack' ? -3 * (1 - a.u) : 0);
  draw(c, a);
  c.restore();
  finish(c, DS);
}
const BOSSART = {};
BOSSART.bk = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Skeleton King: crown, royal cape, glowing mace
  const s = a.s, u = a.u, atk = a.mode === 'attack', bone = '#e9e1c9', shade = '#b0a688', pos = Math.max(0, s), neg = Math.max(0, -s);
  poly(c, [[30, 26], [66, 26], [80, 90], [16, 90]], lgr(c, 0, 26, 0, 90, '#7a1f8a', '#2a0a3a'), 2);
  c.strokeStyle = '#d4a017'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 90); c.lineTo(80, 90); c.stroke();
  limb(c, 41, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 4.5, bone); limb(c, 55, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 4.5, bone);
  ell(c, 48, 62, 12, 5, shade); ell(c, 48, 43, 15, 18, bone);
  c.strokeStyle = '#7d7358'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(48, 28); c.lineTo(48, 60);
  for (let i = 0; i < 5; i++) { c.moveTo(35, 33 + i * 5.5); c.quadraticCurveTo(48, 37 + i * 5.5, 61, 33 + i * 5.5); } c.stroke();
  ell(c, 31, 29, 10, 6, bone); ell(c, 65, 29, 10, 6, bone);
  poly(c, [[24, 27], [20, 18], [29, 24]], '#cfc6a8'); poly(c, [[72, 27], [76, 18], [67, 24]], '#cfc6a8');
  limb(c, 31, 31, -0.4 - 0.3 * s, 14, 0.5, 15, 3.8, bone);
  const AR = atk ? [2.6 - 2.3 * u, -0.4] : [0.4 - 0.3 * s, -0.5], hr = limb(c, 65, 31, AR[0], 14, AR[1], 15, 3.8, bone);
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -0.2 + u * 2.2 : 0.15);
  c.strokeStyle = '#100505'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -30); c.stroke(); c.strokeStyle = '#d4a017'; c.lineWidth = 3; c.stroke();
  glowAt(c, 0, -37, 9, '#9a3aff'); ell(c, 0, -37, 5.5, 5.5, '#6a1ad0', 1.5);
  for (let i = 0; i < 6; i++) { const q = i * 1.05; poly(c, [[Math.cos(q) * 5, -37 + Math.sin(q) * 5], [Math.cos(q + 0.3) * 9, -37 + Math.sin(q + 0.3) * 9], [Math.cos(q + 0.6) * 5, -37 + Math.sin(q + 0.6) * 5]], '#d4a017', 1); }
  c.restore();
  ell(c, 48, 21, 11, 10, bone); ell(c, 48, 31, 7, 3.5, shade);
  ell(c, 43, 20, 3.4, 4, '#120a0a', 1); ell(c, 53, 20, 3.4, 4, '#120a0a', 1); glowAt(c, 43, 20, 5, '#ff8a1a'); glowAt(c, 53, 20, 5, '#ff8a1a');
  poly(c, [[47, 24], [49, 24], [48, 27]], '#2a1a1a', 1);
  c.strokeStyle = '#2a1a1a'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 5; i++) { c.moveTo(43 + i * 2.5, 29); c.lineTo(43 + i * 2.5, 32); } c.stroke();
  poly(c, [[37, 13], [38, 2], [43, 9], [48, 0], [53, 9], [58, 2], [59, 13]], '#d4a017', 1.5);
  ell(c, 48, 9, 2, 2, '#e02a3a', 1); ell(c, 40, 11, 1.4, 1.4, '#3a7aff', 0.6); ell(c, 56, 11, 1.4, 1.4, '#3affa0', 0.6);
});
BOSSART.golem = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Stone Golem: mossy boulders, glowing runes, huge fists
  const s = a.s, u = a.u, atk = a.mode === 'attack', rock = lgr(c, 0, 14, 0, 92, '#9a9a92', '#4a4a44'), dark = '#3c3c38';
  poly(c, [[29, 64], [45, 64], [47, 91], [27, 91]], rock, 2.5); poly(c, [[51, 64], [67, 64], [69, 91], [49, 91]], rock, 2.5);
  c.fillStyle = dark; c.fillRect(27, 86, 20, 5); c.fillRect(49, 86, 20, 5);
  poly(c, [[22, 38], [30, 22], [48, 18], [66, 22], [74, 38], [70, 62], [58, 70], [38, 70], [26, 62]], rock, 3);
  ell(c, 36, 26, 8, 3.5, '#4f7a3a', 0); ell(c, 62, 66, 9, 3.5, '#4f7a3a', 0); ell(c, 28, 50, 4, 6, '#587f3e', 0);
  c.strokeStyle = '#2a2a26'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(34, 30); c.lineTo(40, 44); c.lineTo(36, 58); c.moveTo(60, 28); c.lineTo(56, 42); c.lineTo(62, 56); c.stroke();
  c.strokeStyle = '#ff8a1a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(48, 28); c.lineTo(44, 40); c.lineTo(50, 52); c.lineTo(46, 64); c.moveTo(44, 40); c.lineTo(36, 42); c.moveTo(50, 52); c.lineTo(58, 50); c.stroke();
  glowAt(c, 48, 46, 9, '#ff9a2a');
  const up = atk ? 2.7 - 2.5 * u : 0.15 + 0.25 * s;
  for (const sd of [-1, 1]) {
    const hx = limb(c, 48 + sd * 26, 36, sd * (atk ? up : 0.25 + 0.25 * sd * s), 16, sd * (atk ? 0.3 : 0.2), 17, 11, '#7a7a72');
    ell(c, hx[0], hx[1] + 4, 11, 10, rock, 3); ell(c, hx[0] - 4, hx[1] + 1, 3, 3, dark, 0); ell(c, hx[0] + 4, hx[1] + 1, 3, 3, dark, 0);
  }
  poly(c, [[38, 16], [58, 16], [60, 26], [36, 26]], rock, 2.5); poly(c, [[40, 10], [56, 10], [58, 16], [38, 16]], '#8a8a82', 2);
  c.fillStyle = '#ffd23a'; c.fillRect(41, 18, 5, 3); c.fillRect(51, 18, 5, 3); glowAt(c, 43.5, 19.5, 6, '#ffc040'); glowAt(c, 53.5, 19.5, 6, '#ffc040');
});
BOSSART.lich = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Necromancer: floating robe, skull face, green-flame staff
  const s = a.s, u = a.u, atk = a.mode === 'attack';
  glowAt(c, 48, 50, 44, '#2aff6a');
  poly(c, [[34, 30], [62, 30], [78, 90], [70, 82], [62, 92], [54, 84], [46, 94], [38, 84], [30, 92], [24, 82], [18, 90]], lgr(c, 0, 30, 0, 94, '#2a2a3a', '#0a0a14'), 2);
  c.strokeStyle = 'rgba(80,255,140,.45)'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(40 + i * 6, 40); c.quadraticCurveTo(36 + i * 8 + s * 3, 66, 30 + i * 12, 88); } c.stroke();
  ell(c, 48, 42, 11, 9, '#cfc8b0', 1.5); c.strokeStyle = '#6a644e'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(39, 38 + i * 4); c.lineTo(57, 38 + i * 4); } c.stroke();
  limb(c, 34, 34, -0.5 - 0.2 * s, 14, 0.7, 14, 3, '#cfc8b0');
  const AR = atk ? [2.4 - 0.5 * u, -0.5] : [0.5 + 0.2 * s, -0.7], hr = limb(c, 62, 34, AR[0], 14, AR[1], 14, 3, '#cfc8b0');
  c.save(); c.translate(hr[0], hr[1]); c.strokeStyle = '#100505'; c.lineWidth = 4.6; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -34); c.stroke(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 2.6; c.stroke();
  glowAt(c, 0, -40, 11 + (atk ? 6 * u : 0), '#3aff7a'); ell(c, 0, -40, 5, 5, '#8affb0', 1.5);
  for (const sd of [-1, 1]) { c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(sd * 8, -34, sd * 5, -44); c.stroke(); }
  c.restore();
  poly(c, [[30, 22], [48, 4], [66, 22], [62, 34], [34, 34]], '#1a1a28', 2);
  ell(c, 48, 24, 9, 9.5, '#e8e0c8', 1.5); poly(c, [[40, 30], [56, 30], [52, 35], [44, 35]], '#d8d0b8', 1.2);
  ell(c, 44, 23, 2.6, 3.6, '#0a0a0a', 1); ell(c, 52, 23, 2.6, 3.6, '#0a0a0a', 1); glowAt(c, 44, 23, 5, '#3aff7a'); glowAt(c, 52, 23, 5, '#3aff7a');
  poly(c, [[47, 27], [49, 27], [48, 29.5]], '#2a2a2a', 0.8); c.fillStyle = '#e0d8c0'; c.fillRect(43, 33, 10, 1.5);
});
BOSSART.knight = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Black Knight: plate armour, shield, runic great sword
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), steel = lgr(c, 0, 0, 96, 0, '#1a1a22', '#4a4a58', '#1a1a22'), trim = '#c8102e';
  poly(c, [[28, 26], [68, 26], [84, 90], [12, 90]], lgr(c, 0, 26, 0, 90, '#a01022', '#400510'), 2);
  limb(c, 40, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 7, '#2a2a34'); limb(c, 56, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 7, '#2a2a34');
  ell(c, 38, 90, 7, 3.5, '#14141a', 1.5); ell(c, 58, 90, 7, 3.5, '#14141a', 1.5);
  poly(c, [[26, 62], [70, 62], [64, 74], [32, 74]], steel, 2.5);
  poly(c, [[26, 32], [70, 32], [66, 62], [30, 62]], steel, 3); c.strokeStyle = trim; c.lineWidth = 2; c.beginPath(); c.moveTo(48, 32); c.lineTo(48, 62); c.moveTo(30, 46); c.lineTo(66, 46); c.stroke();
  poly(c, [[44, 38], [52, 38], [52, 44], [48, 48], [44, 44]], trim, 1);
  for (const sd of [-1, 1]) { ell(c, 48 + sd * 24, 32, 11, 8, steel, 2.5); poly(c, [[48 + sd * 22, 26], [48 + sd * 28, 14], [48 + sd * 30, 28]], '#2a2a34', 2); }
  const sh = limb(c, 24, 36, -0.5 - 0.2 * s, 12, 0.4, 12, 7, '#2a2a34');
  poly(c, [[sh[0] - 13, sh[1] - 15], [sh[0] + 9, sh[1] - 15], [sh[0] + 9, sh[1] + 8], [sh[0] - 2, sh[1] + 20], [sh[0] - 13, sh[1] + 8]], '#22222c', 3);
  poly(c, [[sh[0] - 7, sh[1] - 8], [sh[0] + 3, sh[1] - 8], [sh[0] - 2, sh[1] + 8]], trim, 1.2);
  const AR = atk ? [2.6 - 2.4 * u, -0.4] : [0.4 - 0.3 * s, -0.4], hr = limb(c, 72, 36, AR[0], 13, AR[1], 13, 7, '#2a2a34');
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -0.3 + u * 2.4 : 0.35);
  c.fillStyle = '#7a7a88'; c.fillRect(-6, -2, 12, 4); poly(c, [[-3.4, -4], [3.4, -4], [4.2, -44], [0, -54], [-4.2, -44]], lgr(c, -4, 0, 4, 0, '#8a8a98', '#e8e8f4', '#8a8a98'), 2);
  c.strokeStyle = '#ff2a3a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -46); c.stroke(); glowAt(c, 0, -26, 8, '#ff2a3a'); c.restore();
  poly(c, [[36, 10], [60, 10], [62, 28], [34, 28]], steel, 3); c.fillStyle = '#ff2a2a'; c.fillRect(38, 17, 20, 3); glowAt(c, 48, 18.5, 9, '#ff3a3a');
  poly(c, [[36, 12], [28, 0], [40, 10]], '#d8d8e0', 2); poly(c, [[60, 12], [68, 0], [56, 10]], '#d8d8e0', 2);
});
BOSSART.spider = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Giant Spider: eight legs, skull-marked abdomen, six eyes, venom fangs
  const ph = a.ph, atk = a.mode === 'attack', u = a.u;
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const w = Math.sin(ph + i * 1.3 + (sd > 0 ? 0 : Math.PI)) * 4, lift = atk && i === 0 ? -14 * u : 0;
    const kx = 48 + sd * (24 + i * 3), ky = 34 + i * 6 + lift, fx = 48 + sd * (40 + i * 3), fy = 88 - i * 4 + w * 0.3;
    c.strokeStyle = '#100505'; c.lineWidth = 5.5; c.beginPath(); c.moveTo(48 + sd * 10, 52); c.lineTo(kx, ky); c.lineTo(fx + w * sd, fy); c.stroke();
    c.strokeStyle = '#3a2a4a'; c.lineWidth = 3; c.stroke();
  }
  ell(c, 48, 64, 20, 22, lgr(c, 0, 42, 0, 88, '#4a2a5a', '#14081c'), 3);
  poly(c, [[48, 50], [54, 58], [52, 70], [48, 76], [44, 70], [42, 58]], '#d8c8e0', 0); ell(c, 45, 62, 2, 2.6, '#14081c', 0); ell(c, 51, 62, 2, 2.6, '#14081c', 0);
  c.fillStyle = '#c8102e'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(38 + i * 7.5, 72 + (i % 2) * 6, 1.8, 0, 7); c.fill(); }
  ell(c, 48, 38, 13, 11, lgr(c, 0, 28, 0, 48, '#5a3a6a', '#24103a'), 3);
  for (const e of [[42, 34, 2.8], [54, 34, 2.8], [38, 38, 2], [58, 38, 2], [45, 31, 1.6], [51, 31, 1.6]]) { glowAt(c, e[0], e[1], e[2] * 2.2, '#ff2a2a'); ell(c, e[0], e[1], e[2], e[2], '#ff6a4a', 0.8); }
  for (const sd of [-1, 1]) { poly(c, [[48 + sd * 4, 44], [48 + sd * 9, atk ? 54 : 52], [48 + sd * 6, 56]], '#e8e0d8', 1.5); c.fillStyle = '#7aff3a'; c.beginPath(); c.arc(48 + sd * 8, 56 + (a.f % 2) * 2, 1.2, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 8; i++) { const q = i * 0.8; c.moveTo(48 + Math.cos(q) * 17, 62 + Math.sin(q) * 19); c.lineTo(48 + Math.cos(q) * 21, 62 + Math.sin(q) * 23); } c.stroke();
});
BOSSART.inferno = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Infernal Demon: bat wings, lava cracks, flame mane, whip of fire
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), fl = Math.sin(a.ph * 2);
  glowAt(c, 48, 46, 46, '#ff5a1a');
  for (const sd of [-1, 1]) {
    poly(c, [[48 + sd * 16, 30], [48 + sd * 46, 6 + fl * 2], [48 + sd * 40, 24], [48 + sd * 46, 34], [48 + sd * 34, 40], [48 + sd * 38, 52], [48 + sd * 22, 48]], lgr(c, 48, 0, 48 + sd * 46, 0, '#6a0a0a', '#b81a0a'), 2.5);
    c.strokeStyle = '#ff9a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(48 + sd * 18, 32); c.lineTo(48 + sd * 44, 8 + fl * 2); c.moveTo(48 + sd * 24, 40); c.lineTo(48 + sd * 40, 26); c.stroke();
  }
  limb(c, 40, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 8, '#7a1008'); limb(c, 56, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 8, '#7a1008');
  ell(c, 38, 91, 8, 3, '#1a0404', 1.5); ell(c, 58, 91, 8, 3, '#1a0404', 1.5);
  poly(c, [[26, 34], [70, 34], [66, 64], [30, 64]], lgr(c, 0, 34, 0, 64, '#c8200a', '#6a0a04'), 3);
  c.strokeStyle = '#ffae2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(48, 36); c.lineTo(44, 46); c.lineTo(50, 54); c.lineTo(46, 62); c.moveTo(34, 42); c.lineTo(41, 48); c.moveTo(62, 44); c.lineTo(55, 50); c.stroke(); glowAt(c, 48, 50, 8, '#ff9a2a');
  limb(c, 28, 36, -0.5 - 0.3 * s, 15, 0.5, 16, 9, '#8a1208');
  const AR = atk ? [2.6 - 2.3 * u, -0.4] : [0.5 - 0.3 * s, -0.5], hr = limb(c, 68, 36, AR[0], 15, AR[1], 16, 9, '#8a1208');
  c.save(); c.translate(hr[0], hr[1]); c.strokeStyle = '#ff8a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0);
  const wp = atk ? 1 : 0.5; c.bezierCurveTo(-12 * wp, -18, 14, -26 * wp, 4 + 14 * u, -40); c.stroke(); glowAt(c, 4 + 14 * u, -40, 9, '#ffd23a'); c.restore();
  poly(c, [[34, 14], [62, 14], [64, 32], [32, 32]], '#a81408', 3);
  for (const sd of [-1, 1]) { c.strokeStyle = '#100505'; c.lineWidth = 5; c.beginPath(); c.moveTo(48 + sd * 12, 14); c.quadraticCurveTo(48 + sd * 22, 6, 48 + sd * 18, -2); c.stroke(); c.strokeStyle = '#e8d8c0'; c.lineWidth = 3; c.stroke(); }
  c.fillStyle = '#ffd23a'; c.fillRect(38, 20, 7, 3); c.fillRect(51, 20, 7, 3); glowAt(c, 41.5, 21.5, 7, '#ffb020'); glowAt(c, 54.5, 21.5, 7, '#ffb020');
  c.fillStyle = '#1a0404'; c.fillRect(40, 27, 16, 3); c.fillStyle = '#f0e8d0'; for (let i = 0; i < 4; i++) c.fillRect(41 + i * 4, 27, 2, 2);
  for (let i = 0; i < 5; i++) { const x = 38 + i * 5; poly(c, [[x, 14], [x + 2.5, 2 + fl * 2 + (i % 2) * 3], [x + 5, 14]], '#ff9a1a', 0); }
});
BOSSART.cyclops = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Cyclops: one huge eye, tusks, spiked tree-trunk club
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), skin = lgr(c, 0, 14, 0, 90, '#b09a78', '#6a5a42');
  limb(c, 38, 62, -0.1 - 0.25 * pos, 14, 0.35 * pos, 16, 12, '#8a7658'); limb(c, 58, 62, 0.1 + 0.25 * neg, 14, -0.35 * neg, 16, 12, '#8a7658');
  ell(c, 36, 90, 10, 4, '#4a3a28', 2); ell(c, 60, 90, 10, 4, '#4a3a28', 2);
  poly(c, [[22, 36], [30, 24], [66, 24], [74, 36], [70, 66], [26, 66]], skin, 3);
  c.strokeStyle = 'rgba(60,40,20,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(48, 30); c.lineTo(48, 62); c.moveTo(32, 40); c.quadraticCurveTo(40, 46, 47, 40); c.moveTo(64, 40); c.quadraticCurveTo(56, 46, 49, 40); c.moveTo(36, 54); c.lineTo(46, 52); c.moveTo(60, 54); c.lineTo(50, 52); c.stroke();
  c.strokeStyle = '#7a2a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(56, 30); c.lineTo(64, 44); c.moveTo(58, 34); c.lineTo(62, 33); c.stroke();
  poly(c, [[28, 62], [68, 62], [64, 78], [32, 78]], '#5a3a22', 2.5); c.fillStyle = '#d4a017'; c.fillRect(44, 62, 8, 5);
  limb(c, 24, 36, -0.5 - 0.3 * s, 15, 0.5, 16, 12, '#a08a68');
  const AR = atk ? [2.7 - 2.5 * u, -0.4] : [0.5 - 0.3 * s, -0.5], hr = limb(c, 72, 36, AR[0], 15, AR[1], 16, 12, '#a08a68');
  ell(c, hr[0], hr[1] + 2, 8, 7, '#a08a68', 2.5);
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -0.2 + u * 2.2 : 0.25);
  poly(c, [[-4, 10], [4, 10], [8, -30], [10, -44], [-10, -44], [-8, -30]], lgr(c, -10, 0, 10, 0, '#4a3018', '#7a5a34', '#4a3018'), 2.5);
  for (const [x, y] of [[-8, -30], [8, -34], [-9, -40], [9, -42], [0, -46]]) poly(c, [[x - 2, y + 2], [x + (x < 0 ? -5 : 5), y - 1], [x + 2, y - 3]], '#cfc8b0', 1);
  c.restore();
  ell(c, 48, 20, 16, 14, skin, 3);
  ell(c, 48, 19, 8.5, 7, '#f4f0e0', 2); glowAt(c, 48, 19, 12, '#ff3a2a'); ell(c, 48 + Math.sin(a.ph) * 1.5, 19, 4.2, 4.2, '#d01818', 1); ell(c, 48 + Math.sin(a.ph) * 1.5, 19, 1.8, 3.2, '#000000', 0);
  poly(c, [[36, 12], [48, 8], [60, 12], [58, 14], [38, 14]], '#5a3a22', 1.5);
  c.fillStyle = '#2a0a0a'; c.fillRect(40, 28, 16, 4); for (let i = 0; i < 4; i++) { c.fillStyle = '#e8e0c8'; c.fillRect(41 + i * 4, 28, 2, 2.2); }
  poly(c, [[38, 28], [34, 36], [42, 30]], '#f0e8d0', 1.2); poly(c, [[58, 28], [62, 36], [54, 30]], '#f0e8d0', 1.2);
});
BOSSART.vamp = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Vampire Lord: bat-wing cape, high collar, rapier, fangs
  const s = a.s, u = a.u, atk = a.mode === 'attack', pos = Math.max(0, s), neg = Math.max(0, -s), flap = Math.sin(a.ph);
  for (const sd of [-1, 1]) poly(c, [[48 + sd * 12, 30], [48 + sd * (44 + (atk ? 6 : 0)), 12 + flap * 3], [48 + sd * 38, 36], [48 + sd * 44, 54], [48 + sd * 30, 50], [48 + sd * 28, 74], [48 + sd * 16, 60]], lgr(c, 48, 0, 48 + sd * 44, 0, '#5a0a1a', '#1a0208'), 2.5);
  limb(c, 42, 62, -0.1 - 0.3 * pos, 15, 0.4 * pos, 17, 5, '#14101a'); limb(c, 54, 62, 0.1 + 0.3 * neg, 15, -0.4 * neg, 17, 5, '#14101a');
  ell(c, 40, 90, 6, 3, '#0a0a0a', 1.5); ell(c, 56, 90, 6, 3, '#0a0a0a', 1.5);
  poly(c, [[34, 32], [62, 32], [58, 64], [38, 64]], '#1a1420', 3); poly(c, [[44, 32], [52, 32], [50, 60], [46, 60]], '#e8e0e8', 1.5);
  c.fillStyle = '#c8102e'; c.beginPath(); c.moveTo(48, 36); c.lineTo(52, 42); c.lineTo(48, 48); c.lineTo(44, 42); c.closePath(); c.fill();
  poly(c, [[30, 24], [38, 32], [34, 44], [28, 30]], '#c8102e', 2); poly(c, [[66, 24], [58, 32], [62, 44], [68, 30]], '#c8102e', 2);
  limb(c, 32, 36, -0.4 - 0.3 * s, 14, 0.5, 15, 4, '#1a1420');
  const AR = atk ? [1.2 - 0.6 * u, -0.3] : [0.4 - 0.3 * s, -0.5], hr = limb(c, 64, 36, AR[0], 14, AR[1], 15, 4, '#1a1420');
  ell(c, hr[0], hr[1], 3, 3, '#e8e0e8', 1);
  c.save(); c.translate(hr[0], hr[1]); c.rotate(atk ? -1.1 + u * 0.4 : 0.5);
  c.fillStyle = '#d4a017'; c.beginPath(); c.arc(0, -1, 5, 0, 3.14); c.fill(); poly(c, [[-1, -3], [1, -3], [0.4, -48], [-0.4, -48]], '#e8e8f4', 1.4); c.restore();
  ell(c, 48, 22, 10, 11, '#e8dce0', 2);
  poly(c, [[38, 18], [42, 8], [48, 10], [54, 8], [58, 18], [52, 14], [44, 14]], '#0a0610', 2);
  c.fillStyle = '#ff2a3a'; c.fillRect(42, 21, 4, 2); c.fillRect(51, 21, 4, 2); glowAt(c, 44, 22, 6, '#ff2a3a'); glowAt(c, 53, 22, 6, '#ff2a3a');
  c.fillStyle = '#7a1a2a'; c.fillRect(44, 28, 8, 2); poly(c, [[44, 29], [45.5, 29], [45, 33]], '#ffffff', 0.8); poly(c, [[50.5, 29], [52, 29], [51, 33]], '#ffffff', 0.8);
});
BOSSART.wyrm = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Frost Wyrm: ice wings, long neck, frost breath
  const u = a.u, atk = a.mode === 'attack', fl = Math.sin(a.ph), ice = lgr(c, 0, 10, 0, 90, '#bfe8ff', '#2a6ab8');
  glowAt(c, 48, 50, 46, '#6ac8ff');
  for (const sd of [-1, 1]) {
    poly(c, [[48 + sd * 14, 42], [48 + sd * 46, 14 + fl * 4], [48 + sd * 40, 34], [48 + sd * 46, 50], [48 + sd * 32, 52], [48 + sd * 30, 66], [48 + sd * 20, 56]], lgr(c, 48, 0, 48 + sd * 46, 0, '#8ad8ff', '#2a78c8'), 2.5);
    c.strokeStyle = '#e8f8ff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(48 + sd * 16, 44); c.lineTo(48 + sd * 44, 16 + fl * 4); c.moveTo(48 + sd * 22, 50); c.lineTo(48 + sd * 40, 36); c.stroke();
  }
  c.lineCap = 'round'; c.strokeStyle = '#100505'; c.lineWidth = 17; c.beginPath(); c.moveTo(48, 90); c.bezierCurveTo(20, 84, 24, 62, 48, 58); c.stroke(); c.strokeStyle = '#4a98d8'; c.lineWidth = 13; c.stroke();
  poly(c, [[30, 46], [66, 46], [62, 84], [34, 84]], ice, 3); ell(c, 48, 64, 10, 14, '#e8f8ff', 1.5);
  for (let i = 0; i < 4; i++) { c.strokeStyle = 'rgba(40,80,140,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(40, 52 + i * 7); c.lineTo(56, 52 + i * 7); c.stroke(); }
  glowAt(c, 48, 52, 8, '#6ac8ff');
  for (let i = 0; i < 4; i++) poly(c, [[44 + i * 3, 46], [46 + i * 3, 36 - (i % 2) * 3], [48 + i * 3, 46]], '#e8f8ff', 1.2);
  const lx = atk ? u * 10 : fl * 2;
  c.strokeStyle = '#100505'; c.lineWidth = 15; c.beginPath(); c.moveTo(48, 48); c.bezierCurveTo(40 - lx, 36, 60 - lx, 28, 48 - lx, 18); c.stroke(); c.strokeStyle = '#5aa8e8'; c.lineWidth = 11; c.stroke();
  const hx = 48 - lx, hy = 14;
  poly(c, [[hx - 12, hy + 4], [hx + 12, hy + 4], [hx + 10, hy - 8], [hx - 10, hy - 8]], '#6ab0f0', 3);
  poly(c, [[hx - 8, hy + 4], [hx + 8, hy + 4], [hx + 5, hy + 12 + (atk ? 5 * u : 0)], [hx - 5, hy + 12 + (atk ? 5 * u : 0)]], '#4a90d8', 2.5);
  c.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) c.fillRect(hx - 6 + i * 4, hy + 5, 1.8, 3);
  for (const sd of [-1, 1]) { poly(c, [[hx + sd * 8, hy - 6], [hx + sd * 18, hy - 18], [hx + sd * 12, hy - 4]], '#e8f8ff', 1.8); ell(c, hx + sd * 5, hy - 2, 2.4, 2.4, '#e8ffff', 0.8); glowAt(c, hx + sd * 5, hy - 2, 6, '#9affff'); }
  if (atk) glowAt(c, hx, hy + 14, 10 + 6 * u, '#9ae8ff');
});
BOSSART.storm = (c, mode, f) => bossFrame(c, mode, f, (c, a) => {   // Storm Archmage: cloud cloak, lightning staff and crown
  const s = a.s, u = a.u, atk = a.mode === 'attack', ph = a.ph;
  glowAt(c, 48, 48, 46, '#4a8aff');
  poly(c, [[32, 28], [64, 28], [84, 70], [70, 90], [58, 82], [48, 94], [38, 82], [26, 90], [12, 70]], lgr(c, 0, 28, 0, 94, '#2a3a7a', '#0a1030'), 2.5);
  c.strokeStyle = 'rgba(160,210,255,.55)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(34 + i * 10, 40); c.quadraticCurveTo(24 + i * 16 + s * 3, 62, 22 + i * 18, 84); } c.stroke();
  c.strokeStyle = '#e8f4ff'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(26, 62); c.lineTo(32, 68); c.lineTo(28, 72); c.lineTo(35, 80); c.moveTo(70, 56); c.lineTo(64, 64); c.lineTo(68, 68); c.lineTo(62, 78); c.stroke();
  ell(c, 48, 42, 12, 14, '#3a4a8a', 2);
  limb(c, 34, 34, -0.5 - 0.2 * s, 14, 0.8, 14, 4, '#d8c8b0');
  const AR = atk ? [2.5 - 0.4 * u, -0.5] : [0.5 + 0.2 * s, -0.7], hr = limb(c, 62, 34, AR[0], 14, AR[1], 14, 4, '#d8c8b0');
  c.save(); c.translate(hr[0], hr[1]); c.strokeStyle = '#100505'; c.lineWidth = 4.6; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -34); c.stroke(); c.strokeStyle = '#6a5a3a'; c.lineWidth = 2.6; c.stroke();
  glowAt(c, 0, -40, 12 + (atk ? 8 * u : 0), '#7ac8ff'); ell(c, 0, -40, 4.5, 4.5, '#ffffff', 1);
  c.strokeStyle = '#d8f0ff'; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 4; i++) { const q = ph + i * 1.6; c.moveTo(0, -40); c.lineTo(Math.cos(q) * 11, -40 + Math.sin(q) * 11); } c.stroke(); c.restore();
  ell(c, 48, 22, 10, 11, '#d8c8b0', 2); poly(c, [[38, 28], [58, 28], [54, 44], [48, 48], [42, 44]], '#e8e8f0', 2);
  poly(c, [[34, 18], [48, 2], [62, 18], [58, 16], [48, 10], [38, 16]], '#1a2a5a', 2);
  c.strokeStyle = '#9ad8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(38, 14); c.lineTo(44, 8); c.lineTo(42, 4); c.lineTo(48, 0); c.lineTo(54, 5); c.lineTo(52, 9); c.lineTo(58, 14); c.stroke(); glowAt(c, 48, 6, 6, '#9ad8ff');
  c.fillStyle = '#ffffff'; c.fillRect(42, 21, 4, 2.5); c.fillRect(51, 21, 4, 2.5); glowAt(c, 44, 22, 6, '#bfe8ff'); glowAt(c, 53, 22, 6, '#bfe8ff');
});
