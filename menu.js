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
