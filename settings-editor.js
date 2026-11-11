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
