/* ======================================================================
   CASTEDDISH - Interazione con gli oggetti
   Ricompense dei bauli, distruzione degli oggetti di scena, apertura
   (tasto USA) e raccolta dei pickup.
   ====================================================================== */

function dropReward(x, y) {
  const r = Math.random();
  const it = r < 0.25 ? { kind: 'med' } : r < 0.62 ? { kind: 'ammo', w: 1 + Math.floor(Math.random() * 7) } : { kind: 1 + Math.floor(Math.random() * 7) };
  const off = [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [0.5, 0.5], [-0.5, -0.5]], st = Math.floor(Math.random() * off.length);
  for (let k = 0; k < off.length; k++) {
    const o = off[(st + k) % off.length];
    if (!isWall(x + o[0], y + o[1])) { pickups.push({ ...it, x: x + o[0], y: y + o[1], taken: false }); return; }
  }
  pickups.push({ ...it, x, y, taken: false });
}

function hurtProp(q, d, silent) {
  if (q.type === 'chest') return;
  q.hp -= d;
  const mat = q.mat || 'wood', sn = SNDM[mat];
  if (!silent) sfxAt(sn[0], q.x, q.y, 10, 0.8, false);
  if (q.hp > 0) return;
  stats.objects++; stats.dollars += q.type === 'crate' ? 180 : ({ wood: 220, stone: 1400, metal: 900, glass: 2600, bone: 450, rust: 600 }[mat] || 300);
  props.splice(props.indexOf(q), 1); if (q.solid !== false) blk[q.cell] = 0;
  sfxAt(sn[1], q.x, q.y, 14, 1);
  for (let i = 0; i < 9; i++) { const a = Math.random() * 6.28, sp = 1 + Math.random() * 2.2; debris.push({ x: q.x, y: q.y, z: 0.2 + Math.random() * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 1.5 + Math.random() * 2, life: 1.0, mat }); }
  if (rubble.length > 90) rubble.shift();
  rubble.push({ x: q.x, y: q.y, mat });
  if (q.type === 'crate') { say('CASSA DISTRUTTA'); if (Math.random() < 0.8) dropReward(q.x, q.y); }
  if (q.type === 'xbarrel') barrelBlast(q);
}

function tryUse() {
  const q = props.find(c => c.type === 'chest' && !c.open && Math.hypot(c.x - player.x, c.y - player.y) < 1.5);
  if (!q) return;
  q.open = true;
  if (q.key) { keys++; say('CHIAVE TROVATA (' + keys + '/' + keysNeed + ')'); sfx('chest_open', 0.9); setTimeout(() => sfx('key', 0.9), 450); }
  else { say('IL BAULE \u00c8 VUOTO'); sfx('chest_open', 0.9); }
}

const pickups = [];

function updatePickups() {
  for (const q of pickups) {
    if (q.taken || Math.hypot(q.x - player.x, q.y - player.y) > 0.6) continue;
    if (q.kind === 'med') {
      if (player.hp >= 100) continue;
      player.hp = Math.min(100, player.hp + 30);
      say('MEDIKIT +30 HP'); sfx('pickup_med', 0.9);
    } else if (q.kind === 'arm') {
      const A = ARMORS[q.t];
      if (q.t >= armor.t) {
        if (q.t === armor.t && armor.ap >= A.ap) continue;
        armor.t = q.t; armor.ap = A.ap; say('ARMATURA DI ' + A.name + ' (' + A.ap + ')');
      } else {
        const cap = ARMORS[armor.t].ap;
        if (armor.ap >= cap) continue;
        armor.ap = Math.min(cap, armor.ap + 25); say('+25 ARMATURA');
      }
      sfx('pickup_armor', 0.9);
    } else if (q.kind === 'ammo') {
      const w = WEAPONS[q.w]; ammo[q.w] += w.give;
      say('+' + w.give + ' ' + w.name); sfx('pickup_ammo', 0.9);
    } else {
      const w = WEAPONS[q.kind], first = !owned[q.kind];
      owned[q.kind] = true; ammo[q.kind] += w.give;
      say(w.name + (first ? ' RACCOLTO!' : ' +' + w.give + ' MUNIZIONI'));
      sfx('pickup_weapon', 0.9);
    }
    q.taken = true;
  }
}
