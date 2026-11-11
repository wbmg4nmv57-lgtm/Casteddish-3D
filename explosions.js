/* ======================================================================
   CASTEDDISH - Esplosioni
   Esplosioni di barili e granate, onda d'urto, reazione a catena.
   ====================================================================== */

// ---- Explosive barrels: blast damage, chain reaction, flying embers, fire and smoke ----
const BLAST_R = 3.6, BLAST_D = 140;
function mkBlast(x, y) {
  const b = { x, y, t: 0, life: 2.4, ps: [] }, R = Math.random;
  for (let i = 0; i < 16; i++) {   // embers and burning scrap flung outward
    const a = R() * 6.283, sp = 1.5 + R() * 4.5, life = 0.8 + R() * 0.8;
    b.ps.push({ k: 'ember', x, y, z: 0.25 + R() * 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 2.5 + R() * 4, life, max: life, s: 0.07 + R() * 0.06 });
  }
  for (let i = 0; i < 6; i++) {   // fire billows
    const a = R() * 6.283, life = 0.55 + R() * 0.35;
    b.ps.push({ k: 'fire', x: x + Math.cos(a) * 0.3, y: y + Math.sin(a) * 0.3, z: 0.2 + R() * 0.25, vx: Math.cos(a) * 0.7, vy: Math.sin(a) * 0.7, vz: 0.9 + R() * 0.9, life, max: life, s: 0.7 + R() * 0.5, ph: i });
  }
  for (let i = 0; i < 6; i++) {   // smoke column that rises and spreads
    const a = R() * 6.283, life = 1.6 + R() * 0.8;
    b.ps.push({ k: 'smoke', x: x + Math.cos(a) * 0.2, y: y + Math.sin(a) * 0.2, z: 0.35 + R() * 0.2, vx: Math.cos(a) * 0.35, vy: Math.sin(a) * 0.35, vz: 0.5 + R() * 0.5, life, max: life, s: 0.6 + R() * 0.4 });
  }
  return b;
}
// The explosion itself, shared by barrels and grenades: fireball and flying embers, shock rings, sound, camera shake, hot flash, flames left burning on the floor and scorch marks on the walls. Returns the player's distance from the blast.
function blastFx(x, y, marked) {
  blasts.push(mkBlast(x, y));
  fxs.push({ x, y, cv: 'ringR', life: 0.5, t: 0, s0: 0.5, s1: BLAST_R * 2.3 });
  fxs.push({ x, y, cv: 'ringW', life: 0.85, t: 0, s0: 0.4, s1: BLAST_R * 2.9 });
  sfxAt('explosion', x, y, 30, 1.0);
  const dp = Math.hypot(x - player.x, y - player.y), k = Math.max(0, 1 - dp / 14);
  if (k > 0) {   // camera shake and a hot flash, stronger the closer you are
    shake.a = Math.max(shake.t > 0 ? shake.a : 0, 16 * k); shake.t = shake.max = 0.5;
    flashA = Math.max(flashA, 0.65 * k);
    if (!flashEl) {
      const ov = document.getElementById('damageOverlay');
      flashEl = document.createElement('div');
      flashEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 55%,rgba(255,240,190,.95),rgba(255,140,40,.7) 55%,rgba(255,60,0,.35))';
      ov.parentNode.insertBefore(flashEl, ov.nextSibling);
    }
  }
  addFire(x, y, 1.1, 6);
  if (!marked) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) wallMark(x, y, dx, dy, 0.3, 'blast', 1.3, MARK_SIZE.blast);
  return dp;
}
function barrelBlast(q) {
  const x = q.x, y = q.y, dp = blastFx(x, y);
  for (const e of enemies) {
    const d = Math.hypot(x - e.x, y - e.y);
    if (e.alive && d < BLAST_R && (d < 1.2 || los(x, y, e.x, e.y))) damageEnemy(e, BLAST_D * (1 - (d / BLAST_R) * 0.6));
  }
  if (dp < BLAST_R && (dp < 1.2 || los(x, y, player.x, player.y))) hurt(BLAST_D * 0.3 * (1 - dp / BLAST_R));
  for (const o of props.slice()) {   // neighbours: other barrels go off a moment later (chain reaction), the rest breaks
    const d = Math.hypot(o.x - x, o.y - y);
    if (d >= BLAST_R) continue;
    if (o.type === 'xbarrel') { if (o.fuse === undefined) { o.fuse = 0.12 + d * 0.09; fuses.push(o); } }
    else hurtProp(o, BLAST_D * (1 - (d / BLAST_R) * 0.5));
  }
}
// Grenade: the very same explosion as the barrels (animation, shake, flash, flames on the floor); the damage keeps the grenade's own range
function grenadeBlast(x, y, dmg, rad, wallHit) {
  const dp = blastFx(x, y, wallHit);   // a wall hit has already left its mark
  for (const e of enemies) { const d = Math.hypot(x - e.x, y - e.y); if (e.alive && d < rad) damageEnemy(e, dmg * (1 - (d / rad) * 0.6)); }
  if (dp < rad) hurt(dmg * 0.3 * (1 - dp / rad));
  for (const q of props.slice()) if (Math.hypot(q.x - x, q.y - y) < rad) hurtProp(q, dmg);
}
