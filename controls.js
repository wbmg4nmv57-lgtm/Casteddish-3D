/* ======================================================================
   CASTEDDISH - Comandi
   Joystick a schermo, rotazione, tastiera, mouse, scorciatoie del
   menu.
   ====================================================================== */

/* ---------- Input ---------- */
const look = { x: 0, y: 0, id: null, dx: 0 };
const pads = [];

function makePad(baseId, knobId, st, DEADZONE, xOnly) {
  const base = document.getElementById(baseId), knob = document.getElementById(knobId);

  function moveKnob(e) {
    const r = base.getBoundingClientRect();
    const travel = r.width * (xOnly ? 0.32 : 0.3);
    let nx = (e.clientX - (r.left + r.width / 2)) / travel;
    let ny = xOnly ? 0 : (e.clientY - (r.top + r.height / 2)) / travel;
    let mag = Math.hypot(nx, ny);
    if (mag > 1) { nx /= mag; ny /= mag; mag = 1; }
    knob.style.transform = `translate(${nx * travel}px, ${ny * travel}px)`;
    if (mag < DEADZONE) { st.x = 0; st.y = 0; return; }
    const k = ((mag - DEADZONE) / (1 - DEADZONE)) / mag;
    st.x = nx * k; st.y = ny * k;
  }

  function release(e) {
    if (e.pointerId !== st.id) return;
    st.id = null; st.x = 0; st.y = 0;
    base.classList.remove('active');
    knob.style.transition = 'transform 0.12s ease-out';
    knob.style.transform = 'translate(0px, 0px)';
  }

  base.addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio();
    st.id = e.pointerId;
    try { base.setPointerCapture(e.pointerId); } catch (err) { st.id = null; return; }
    base.classList.add('active');
    knob.style.transition = 'none';
    moveKnob(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== st.id) return;
    e.preventDefault(); moveKnob(e);
  });
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
  base.addEventListener('lostpointercapture', release);
  base.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  pads.push(() => release({ pointerId: st.id }));
}

// Invisible controls: a touch on the left half of the screen drops the stick under the finger (gone when released); a drag on the right half turns the view
function makeTouchZones() {
  const layer = document.getElementById('touchLayer'), stage = document.getElementById('stage'), base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
  let jid = null, lid = null, jx = 0, jy = 0, lx = 0;
  const TR = () => 40 * ((LAYOUT.joy && LAYOUT.joy.s) || 1), dead = 0.12;
  const moveJoy = (e) => {
    const travel = TR();
    let nx = (e.clientX - jx) / travel, ny = (e.clientY - jy) / travel, mag = Math.hypot(nx, ny);
    if (mag > 1) { nx /= mag; ny /= mag; mag = 1; }
    knob.style.transform = `translate(${nx * 40}px, ${ny * 40}px)`;
    if (mag < dead) { joy.x = joy.y = 0; return; }
    const k = ((mag - dead) / (1 - dead)) / mag; joy.x = nx * k; joy.y = ny * k;
  };
  const endJoy = () => { jid = null; joy.id = null; joy.x = joy.y = 0; base.style.display = 'none'; base.classList.remove('active'); knob.style.transform = 'translate(0px, 0px)'; };
  layer.addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio();
    if (player.hp <= 0 || won || !gameStarted) return;
    if (e.pointerType === 'mouse' && stage.requestPointerLock) { kb.mouse = true; requestMouseLock(); return; }
    if (e.clientX < innerWidth / 2) {
      if (jid !== null) return;
      jid = e.pointerId; joy.id = jid; jx = e.clientX; jy = e.clientY;
      const r = stage.getBoundingClientRect();
      base.style.left = (jx - r.left - 64) + 'px'; base.style.top = (jy - r.top - 64) + 'px'; base.style.bottom = 'auto'; base.style.display = 'block'; base.classList.add('active');
      knob.style.transition = 'none'; knob.style.transform = 'translate(0px, 0px)';
    } else {
      if (lid !== null) return;
      lid = e.pointerId; lx = e.clientX;
    }
    try { layer.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  layer.addEventListener('pointermove', (e) => {
    if (e.pointerId === jid) { e.preventDefault(); moveJoy(e); }
    else if (e.pointerId === lid) { e.preventDefault(); look.dx += e.clientX - lx; lx = e.clientX; }
  });
  const up = (e) => { if (e.pointerId === jid) endJoy(); if (e.pointerId === lid) lid = null; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => layer.addEventListener(t, up));
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  pads.push(() => { endJoy(); lid = null; });
}

function setupJoystick() {
  makeTouchZones();
  document.getElementById('btnUse').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); tryUse(); });
  const fb = document.getElementById('btnFire');
  let fid = null;
  const slider = document.getElementById('throwSlider'), tknob = document.getElementById('throwKnob'), tlabel = document.getElementById('throwLabel');
  const isThrowable = () => { const k = WEAPONS[cur].kind; return k === 'molotov' || k === 'grenade'; };
  const drawSlider = () => { tknob.style.bottom = (8 + thr.p * 138) + 'px'; tlabel.textContent = 'GITTATA ' + ((4.5 + thr.p * 8.5) * 0.7424).toFixed(0) + ' m'; };
  const showSlider = () => { if (!thr) return; thr.shown = true; slider.style.display = 'block'; fb.style.opacity = '0'; toggleWeaponMenu(false); document.getElementById('btnWeapon').style.visibility = 'hidden'; drawSlider(); };
  const endThrow = (doThrow) => {
    if (!thr) return;
    clearTimeout(thr.timer); const pw = thr.p; thr = null; aim = null;
    slider.style.display = 'none'; fb.style.opacity = '1'; document.getElementById('btnWeapon').style.visibility = 'visible';
    if (doThrow) { initAudio(); fireWeapon(pw); }
  };
  const cancelThrow = () => endThrow(false);
  // Tap = standard throw on release; hold = slider replaces the button, drag up for a longer throw
  const on = (e) => {
    e.preventDefault(); fid = e.pointerId;
    if (isThrowable()) thr = { id: e.pointerId, y0: e.clientY, p: THROW_STD, shown: false, timer: setTimeout(showSlider, 220) };
    else input.fire = true;
  }, off = (e) => { if (e && e.pointerId !== fid) return; input.fire = false; };
  window.addEventListener('pointermove', (e) => {
    if (!thr || e.pointerId !== thr.id || !thr.shown) return;
    thr.p = Math.max(0, Math.min(1, THROW_STD + (thr.y0 - e.clientY) / 130)); drawSlider();
  });
  window.addEventListener('pointerup', (e) => { if (thr && e.pointerId === thr.id) endThrow(true); });
  window.addEventListener('pointercancel', (e) => { if (thr && e.pointerId === thr.id) endThrow(false); });
  fb.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => fb.addEventListener(t, off));
  window.addEventListener('pointerup', off); window.addEventListener('pointercancel', off);
  // Safety net: when the app loses focus or every finger is lifted, release all controls
  const resetAll = () => { pads.forEach(f => f()); cancelThrow(); input.fire = false; input.fwd = input.back = input.strafeL = input.strafeR = input.rotL = input.rotR = false; };
  window.addEventListener('blur', resetAll); window.addEventListener('pagehide', resetAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); });
  const lifted = (e) => { if (e.touches && e.touches.length === 0) resetAll(); };
  window.addEventListener('touchend', lifted, { passive: true }); window.addEventListener('touchcancel', lifted, { passive: true });
}

function requestMouseLock() {
  const st = document.getElementById('stage');
  if (!st.requestPointerLock || document.pointerLockElement === st) return;
  try { const r = st.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* not allowed right now */ }
}
function toggleKbHelp(force) {
  const h = document.getElementById('kbHelp'), show = force === undefined ? h.style.display !== 'block' : force;
  h.style.display = show ? 'block' : 'none';
}
function menuKey(e, k) {   // start menu: arrows / 1-3 choose the difficulty, T toggles timed mode, Enter starts
  if (!menuApi) return;
  if (k === 'arrowleft' || k === 'a') menuApi.move(-1);
  else if (k === 'arrowright' || k === 'd') menuApi.move(1);
  else if (k === '1' || k === '2' || k === '3') menuApi.pick(+k - 1);
  else if (k === 'arrowup') menuApi.level(-1);
  else if (k === 'arrowdown') menuApi.level(1);
  else if (k === 't') menuApi.timed();
  else if (k === 'enter' || k === ' ') menuApi.start();
  else if (k === 'escape') { if (!menuApi.close()) return; }
  else return;
  e.preventDefault();
}
function endKey(e, k) {   // end screen: Enter retries (or goes back to the menu after a win), Esc / M go to the main menu
  if (k === 'enter' || k === ' ') { const r = document.getElementById('btnRetry'); (r.style.display === 'none' ? document.getElementById('btnMenu') : r).click(); }
  else if (k === 'escape' || k === 'm') document.getElementById('btnMenu').click();
  else return;
  e.preventDefault();
}

function setupInput() {
  const throwable = () => WEAPONS[cur].kind === 'molotov' || WEAPONS[cur].kind === 'grenade';
  const enableKb = () => {
    if (kb.on) return;
    kb.on = true; document.getElementById('kbHint').style.display = 'block';
    if (gameStarted) { say('TASTIERA ATTIVA - PREMI H PER I COMANDI'); }
  };
  try { if (matchMedia('(pointer: fine) and (hover: hover)').matches) enableKb(); } catch (err) { /* no matchMedia */ }
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave browser shortcuts alone
    if (!kb.on) { if (!e.isTrusted) return; enableKb(); }
    const k = e.key.toLowerCase();
    initAudio();
    if (ed.on) { if (k === 'escape') closeEditor(false); return; }
    if (paused) { if (k === 'escape' || k === 'p') { setPaused(false); e.preventDefault(); } return; }
    if (!gameStarted) { menuKey(e, k); return; }
    if (endShown && !document.getElementById('endScreen').classList.contains('hide')) { endKey(e, k); return; }
    let used = true;
    switch (k) {
      case 'w': case 'arrowup': input.fwd = true; break;
      case 's': case 'arrowdown': input.back = true; break;
      case 'a': input.strafeL = true; break;
      case 'd': input.strafeR = true; break;
      case 'q': case 'arrowleft': input.rotL = true; break;
      case 'e': case 'arrowright': input.rotR = true; break;
      case ' ': if (!e.repeat) { if (throwable()) fireWeapon(THROW_STD); else input.fire = true; } break;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': switchWeapon(+k - 1); toggleWeaponMenu(false); break;
      case 'f': tryUse(); break;
      case 'r': cycleWeapon(); break;
      case 'g': castMagic(); break;
      case 'm': toggleMinimap(); break;
      case 'h': case '?': toggleKbHelp(); break;
      case 'escape':
        if (mm.goal || wmOpen || document.getElementById('kbHelp').style.display === 'block') { toggleMinimap(false); toggleWeaponMenu(false); toggleKbHelp(false); } else setPaused(true);
        break;
      case 'p': setPaused(true); break;
      default: used = false;
    }
    if (used) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': input.fwd = false; break;
      case 's': case 'arrowdown': input.back = false; break;
      case 'a': input.strafeL = false; break;
      case 'd': input.strafeR = false; break;
      case 'q': case 'arrowleft': input.rotL = false; break;
      case 'e': case 'arrowright': input.rotR = false; break;
      case ' ': input.fire = false; break;
    }
  });

  // ---- Mouse (PC): click the screen to capture the pointer. Move = turn, left click = fire, right click = fire magic, wheel = change weapon ----
  const stage = document.getElementById('stage'), locked = () => document.pointerLockElement === stage, live = () => gameStarted && !endShown && player.hp > 0 && !won;
  try { if (matchMedia('(pointer: fine) and (hover: hover)').matches) kb.mouse = true; } catch (err) { /* no matchMedia */ }
  window.addEventListener('mousemove', (e) => { if (locked() && live()) look.dx += e.movementX * 0.45; });
  window.addEventListener('mousedown', (e) => {
    if (!locked() || !live()) return;
    e.preventDefault(); initAudio();
    if (e.button === 0) { if (throwable()) fireWeapon(THROW_STD); else input.fire = true; }
    else if (e.button === 2) castMagic();
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; });
  let wheelAcc = 0, wheelT = 0;
  window.addEventListener('wheel', (e) => {
    if (!locked() || !live()) return;
    e.preventDefault();
    wheelAcc += e.deltaY; const now = performance.now();
    if (Math.abs(wheelAcc) >= 40 && now - wheelT > 140) { stepWeapon(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; wheelT = now; }
  }, { passive: false });
  window.addEventListener('contextmenu', (e) => { if (locked() || kb.mouse) e.preventDefault(); });
  document.addEventListener('pointerlockchange', () => { if (!locked()) input.fire = false; });

  function attachControl(btnId, key) {
    const btn = document.getElementById(btnId);
    const on = (e) => { e.preventDefault(); initAudio(); input[key] = true; };
    const off = (e) => { e.preventDefault(); input[key] = false; };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('pointercancel', off);
  }
  document.getElementById('btnWeapon').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); toggleWeaponMenu(); });
  document.getElementById('btnMagic').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); castMagic(); });
  mm.box.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleMinimap(); });

  document.getElementById('btnFire').addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio();
    const k = WEAPONS[cur].kind;
    if (k !== 'molotov' && k !== 'grenade') fireWeapon();   // thrown weapons fire on release, see the range slider
  });

  setupJoystick();
}
