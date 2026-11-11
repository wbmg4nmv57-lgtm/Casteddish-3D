/* ======================================================================
   CASTEDDISH - Armi, magia e menu armi
   Elenco armi e munizioni, cambio arma, magia di fuoco con barra di
   ricarica, menu di selezione delle armi.
   ====================================================================== */

const WEAPONS = [
  { name: 'PISTOLA', cd: 0.3, dmg: 50, n: 1, spread: 0, speed: 18, give: 0 },
  { name: 'FUCILE', cd: 0.8, dmg: 26, n: 6, spread: 0.14, speed: 18, give: 8 },
  { name: 'MITRA', cd: 0.1, dmg: 20, n: 1, spread: 0.05, speed: 20, give: 40 },
  { name: 'RAZZI', cd: 1.0, dmg: 120, n: 1, spread: 0, speed: 9, give: 5, splash: 1.7, mark: 'blast' },
  { name: 'MOLOTOV', cd: 1.0, dmg: 0, n: 1, spread: 0, speed: 8.2, give: 3, kind: 'molotov' },
  { name: 'GRANATA', cd: 1.0, dmg: 140, n: 1, spread: 0, speed: 8.2, give: 4, splash: 2.0, kind: 'grenade' },
  { name: 'LANCIAFIAMME', cd: 0.06, dmg: 5, n: 1, spread: 0.06, speed: 9, give: 80, kind: 'flame' },
  { name: 'PLASMA', cd: 0.28, dmg: 38, n: 1, spread: 0, speed: 13, give: 30, kind: 'plasma' }
];
const NW = WEAPONS.length;
const owned = [true, false, false, false, false, false, false, false], ammo = [Infinity, 0, 0, 0, 0, 0, 0, 0];
let cur = 0, toast = '', toastT = 0;
const say = (t) => { toast = t; toastT = 2; };

function switchWeapon(i) { if (owned[i] && ammo[i] > 0 && cur !== i) { cur = i; fireCooldown = 0.15; sfx('switch', 0.6); } }
function stepWeapon(dir) {
  for (let k = 1; k <= NW; k++) {
    const i = (cur + dir * k + NW * 2) % NW;
    if (owned[i] && ammo[i] > 0) { cur = i; fireCooldown = 0.15; sfx('switch', 0.6); return; }
  }
}
function cycleWeapon() {
  for (let k = 1; k <= NW; k++) {
    const i = (cur + k) % NW;
    if (owned[i] && ammo[i] > 0) { cur = i; fireCooldown = 0.15; sfx('switch', 0.6); return; }
  }
}

// ---- Fire magic: the ring fills in 60 s of play, then one tap sends fireballs in every direction (their fire does double damage) ----
const MAGIC_TIME = 60, MG_C = 2 * Math.PI * 28.5, magic = { t: 0, ready: false, burst: null, shown: -1 };
function refreshMagicUI() {
  const prog = magic.ready ? 1 : magic.t / MAGIC_TIME, q = Math.round(prog * 600) + (magic.ready ? 1000 : 0);
  if (q === magic.shown) return;
  magic.shown = q;
  document.getElementById('mgRing').style.strokeDashoffset = (MG_C * (1 - prog)).toFixed(2);
  document.getElementById('btnMagic').classList.toggle('ready', magic.ready);
}
function castMagic() {
  if (player.hp <= 0 || won || doorAnim) return;
  if (!magic.ready) { say('MAGIA DI FUOCO: ANCORA ' + Math.ceil(MAGIC_TIME - magic.t) + ' S'); return; }
  magic.ready = false; magic.t = 0; magic.burst = { w: 0, t: 0 };
  sfx('rocket', 0.9); say('PALLE INCENDIARIE!');
  refreshMagicUI();
}
function updateMagic(dt, raw) {
  if (!magic.ready) { magic.t += raw; if (magic.t >= MAGIC_TIME) { magic.t = MAGIC_TIME; magic.ready = true; } }
  const b = magic.burst;
  if (b && (b.t -= dt) <= 0) {   // three waves of 10 fireballs, each turned a little so the gaps get filled
    b.t = 0.22;
    for (let i = 0; i < 10; i++) {
      const a = b.w * 0.21 + i * (Math.PI * 2 / 10), cs = Math.cos(a), sn = Math.sin(a);
      projectiles.push({ x: player.x + cs * 0.4, y: player.y + sn * 0.4, dirX: cs, dirY: sn, z: 0.5, vz: 0, speed: 7, distTraveled: 0, dmg: 0, splash: 0, big: false, kind: 'fireball', mark: 'scorch', nf: 1.0, nb: 0 });
    }
    if (++b.w >= 3) magic.burst = null;
  }
  refreshMagicUI();
}

// ---- Weapon menu: tap ARMA, pick from the grid, it closes by itself. Movement pads stay live (no backdrop). ----
const WMENU = [['🔫', '#cbd5e1'], ['💥', '#fb923c'], ['⚙️', '#facc15'], ['🚀', '#f87171'], ['🍾', '#a3e635'], ['💣', '#94a3b8'], ['🔥', '#f97316'], ['✨', '#34d399']];
let wmOpen = false, wmCards = null;
function buildWeaponMenu() {
  const m = document.getElementById('weaponMenu'); wmCards = [];
  for (let r = NW - (NW % 2 ? 1 : 2); r >= 0; r -= 2) {
    const row = document.createElement('div'); row.className = 'wrow';
    for (let i = r; i < r + 2 && i < NW; i++) {
      const el = document.createElement('button'); el.type = 'button'; el.style.setProperty('--c', WMENU[i][1]);
      el.innerHTML = '<span class="wi">' + WMENU[i][0] + '</span><span class="wt"><b>' + WEAPONS[i].name + '</b><i></i></span>';
      const pick = () => {
        initAudio();
        if (!(owned[i] && ammo[i] > 0)) { say(owned[i] ? 'MUNIZIONI FINITE' : 'ARMA NON ANCORA RACCOLTA'); return; }
        switchWeapon(i); toggleWeaponMenu(false);
      };
      // Pointer events, not click: while a finger is already on the movement stick, mobile browsers do not synthesise a click for the second touch.
      // A tap (finger barely moves) picks the weapon on release; a vertical drag still scrolls the menu (the browser then cancels the pointer).
      let tap = null;
      el.addEventListener('pointerdown', (e) => { tap = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
      el.addEventListener('pointermove', (e) => { if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null; });
      el.addEventListener('pointerup', (e) => { if (!tap || e.pointerId !== tap.id) return; tap = null; e.preventDefault(); pick(); });
      ['pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => { tap = null; }));
      el.addEventListener('click', (e) => { e.preventDefault(); if (e.detail === 0) pick(); });   // keyboard activation only
      row.appendChild(el); wmCards[i] = { el, am: el.querySelector('i') };
    }
    m.appendChild(row);
  }
}
function refreshWeaponMenu() {
  if (!wmCards) return;
  wmCards.forEach((c, i) => {
    const ok = owned[i] && ammo[i] > 0, cls = (i === cur ? 'cur' : '') + (ok ? '' : ' off'), t = !owned[i] ? '🔒' : ammo[i] === Infinity ? '∞' : String(ammo[i]);
    if (c.el.className !== cls) c.el.className = cls;
    if (c.am.textContent !== t) c.am.textContent = t;
  });
}
function toggleWeaponMenu(force) {
  wmOpen = force === undefined ? !wmOpen : force;
  if (wmOpen && !wmCards) buildWeaponMenu();
  document.getElementById('weaponMenu').style.display = wmOpen ? 'flex' : 'none';
  document.getElementById('btnWeapon').classList.toggle('on', wmOpen);
  document.getElementById('btnMagic').style.visibility = wmOpen ? 'hidden' : 'visible';
  if (wmOpen) {
    refreshWeaponMenu();
    const m = document.getElementById('weaponMenu'); m.scrollTop = m.scrollHeight;   // open on the bottom row, then bring the current weapon into view
    const row = wmCards[cur].el.parentNode;
    if (row.offsetTop - 8 < m.scrollTop) m.scrollTop = Math.max(0, row.offsetTop - 8);
  }
}
