/* ======================================================================
   CASTEDDISH - Motore audio
   Caricamento dei suoni, mixer, effetti sonori posizionali e suoni
   delle luci (torce, neon, candele).
   ====================================================================== */

// ---- Loading: worker thread when possible, otherwise small steps on the main thread
const SND_SR = 44100;
const ASSETS = (() => {
  const a = [['demon_idle', 2], ['demon_hurt', 2], ['demon_death', 1], ['step_demon', 3], ['shot_pistol', 2], ['hit_flesh', 3], ['impact', 3], ['switch', 1], ['step_p_stone', 3], ['loop_torch', 1],
    ['pickup_med', 1], ['pickup_ammo', 1], ['pickup_weapon', 1], ['pickup_armor', 1], ['hurt_player', 2], ['shot_shotgun', 2], ['shot_rifle', 3], ['rocket', 1], ['explosion', 2], ['throw', 2], ['glass', 1],
    ['plasma', 2], ['sizzle', 2], ['loop_fire', 1], ['crate_hit', 2], ['crate_break', 1], ['chest_open', 1], ['key', 1], ['armor_break', 1],
    ['hit_metal', 2], ['hit_stone', 2], ['hit_glass', 2], ['hit_bone', 2], ['break_metal', 1], ['break_stone', 1], ['break_glass', 1], ['break_bone', 1], ['key_whoosh', 1], ['key_insert', 1], ['key_turn', 1], ['lock_open', 1], ['lock_fall', 1], ['door_rumble', 1], ['witch_cast', 1], ['witch_zap', 1], ['summon', 1], ['splash', 2], ['sludge', 2],
    ['step_p_concrete', 3], ['step_p_marble', 3], ['step_p_mud', 3], ['step_p_metal', 3], ['step_p_water', 2], ['step_p_toxic', 2],
    ['step_ghoul', 3], ['step_witch', 3], ['step_skel', 3], ['step_boss', 3]];
  for (const t of ['ghoul', 'wraith', 'witch', 'skel', 'boss']) for (const k of ['idle', 'hurt', 'death']) a.push([t + '_' + k, k === 'death' ? 1 : 2]);
  for (const l of ['brazier', 'candle', 'tube', 'bulb', 'lantern', 'moss', 'sodium', 'warn']) a.push(['loop_' + l, 1]);
  return a;
})();
const raw = {}, bufs = {};
function startAudioLoad() {
  const jobs = [];
  for (const [name, n] of ASSETS) for (let v = 0; v < n; v++) jobs.push({ name, v });
  const store = (name, v, x) => { (raw[name] = raw[name] || [])[v] = x; };
  const fallback = (rest) => {
    const lib = dspLib(SND_SR); let i = 0;
    const step = () => { if (i >= rest.length) return; const j = rest[i++]; if (!(raw[j.name] && raw[j.name][j.v])) store(j.name, j.v, lib.render(j.name)); setTimeout(step, 30); };
    step();
  };
  try {
    const src = 'const lib = (' + dspLib.toString() + ')(' + SND_SR + '); onmessage = (e) => { const x = lib.render(e.data.name); postMessage({ name: e.data.name, v: e.data.v, x }, [x.buffer]); };';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = (e) => store(e.data.name, e.data.v, e.data.x);
    w.onerror = () => fallback(jobs);
    jobs.forEach(j => w.postMessage(j));
  } catch (err) { fallback(jobs); }
}

// ---- Mixer
let master, comp, conv, wetBus, sfxN = 0, hsT = 0, ambT = 0, flameSrc = null, flameG = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    master = audioCtx.createGain(); master.gain.value = 0.9;
    comp = audioCtx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(audioCtx.destination);
    const sr = audioCtx.sampleRate, L = Math.floor(1.8 * sr), ir = audioCtx.createBuffer(2, L, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c); let lp = 0;
      for (let i = 0; i < L; i++) { const t = i / sr; lp += ((Math.random() * 2 - 1) - lp) * (0.35 - 0.3 * t / 1.8); d[i] = lp * Math.exp(-t / 0.45) * (i < 0.01 * sr ? i / (0.01 * sr) : 1) * 0.6; }
    }
    conv = audioCtx.createConvolver(); conv.buffer = ir;
    wetBus = audioCtx.createGain(); wetBus.gain.value = 0.5; wetBus.connect(conv); conv.connect(master);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function pickBuf(name) {
  const r = raw[name]; if (!r || !audioCtx) return null;
  const b = bufs[name] || (bufs[name] = []), ready = [];
  for (let i = 0; i < r.length; i++) if (r[i]) ready.push(i);
  if (!ready.length) return null;
  const k = ready[Math.floor(Math.random() * ready.length)];
  if (!b[k]) { b[k] = audioCtx.createBuffer(1, r[k].length, SND_SR); b[k].getChannelData(0).set(r[k]); }
  return b[k];
}
function playBuf(name, o) {
  if (!audioCtx || (sfxN >= 28 && !o.hi)) return null;
  const b = pickBuf(name); if (!b) return null;
  const src = audioCtx.createBufferSource(); src.buffer = b; src.playbackRate.value = o.rate || 1;
  let node = src;
  if (o.lp) { const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
  const g = audioCtx.createGain(); g.gain.value = o.vol === undefined ? 1 : o.vol; node.connect(g);
  let out = g;
  if (audioCtx.createStereoPanner) { const pn = audioCtx.createStereoPanner(); pn.pan.value = o.pan || 0; g.connect(pn); out = pn; }
  out.connect(master);
  if (o.wet !== 0) { const w = audioCtx.createGain(); w.gain.value = o.wet === undefined ? 0.12 : o.wet; out.connect(w); w.connect(wetBus); }
  sfxN++; src.addEventListener('ended', () => { sfxN--; }); src.start();
  return src;
}
const relPan = (dx, dy) => Math.max(-1, Math.min(1, Math.sin(Math.atan2(dy, dx) - Math.atan2(player.dirY, player.dirX))));
const sfx = (name, vol, pan, hi) => playBuf(name, { vol: vol === undefined ? 1 : vol, pan: pan || 0, hi: hi !== false });
function sfxAt(name, x, y, R, vol, hi) {
  const dx = x - player.x, dy = y - player.y, d = Math.hypot(dx, dy);
  if (d > R) return;
  const v = Math.pow(1 - Math.max(0, d - 1) / (R - 1), 2) * (vol === undefined ? 1 : vol);
  const seen = d < 2.5 || los(x, y, player.x, player.y);
  playBuf(name, { vol: v, pan: relPan(dx, dy), lp: (seen ? 5000 : 700) + 9000 * v, rate: 0.97 + Math.random() * 0.06, hi: hi !== false });
}
const playGunshotSound = () => sfx('shot_pistol');
const playWallImpactSound = () => sfx('impact', 0.6, 0, false);
const playHitSound = () => sfx('hit_flesh', 0.7);
const playDemonDeathSound = () => {};
const tone = () => {};

// ---- Light sources: the nearest ones crackle, hum or buzz, with volume and stereo position from where they are
const STRIDE = { demon: 0.95, ghoul: 0.8, witch: 0.65, skel: 0.45, boss: 1.3 };      // distance per step (wraiths float: no steps)
const CHSND = [['candle', 'brazier'], ['tube', 'bulb'], ['candle', 'candle'], ['lantern', 'moss'], ['sodium', 'warn']];
const LOUD = { torch: 0.55, brazier: 0.65, candle: 0.25, tube: 0.5, bulb: 0.45, lantern: 0.32, moss: 0.3, sodium: 0.45, warn: 0.45, fire: 0.9 };
const EM = Array.from({ length: 6 }, () => ({ kind: null, src: null, g: null, lp: null, pn: null }));
function setEmitter(em, c) {
  const now = audioCtx.currentTime;
  if (!c) { if (em.g) em.g.gain.setTargetAtTime(0, now, 0.12); return; }
  if (em.kind !== c.snd) {
    const b = pickBuf('loop_' + c.snd); if (!b) return;
    if (em.src) { try { em.src.stop(now + 0.3); } catch (e) { } }
    const src = audioCtx.createBufferSource(); src.buffer = b; src.loop = true;
    const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
    const g = audioCtx.createGain(); g.gain.value = 0;
    const pn = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    src.connect(lp); lp.connect(g); if (pn) { g.connect(pn); pn.connect(master); } else g.connect(master);
    src.start(0, Math.random() * b.duration);
    em.src = src; em.g = g; em.lp = lp; em.pn = pn; em.kind = c.snd;
  }
  const d = Math.sqrt(c.d2), R = 7.5, seen = d < 2.5 || los(c.x, c.y, player.x, player.y);
  const vol = (LOUD[c.snd] || 0.4) * Math.pow(Math.max(0, 1 - Math.max(0, d - 0.8) / (R - 0.8)), 2) * (c.v || 1);
  em.g.gain.setTargetAtTime(seen ? vol : vol * 0.5, now, 0.1);
  em.lp.frequency.setTargetAtTime(seen ? 9000 : 900, now, 0.1);
  if (em.pn) em.pn.pan.setTargetAtTime(relPan(c.x - player.x, c.y - player.y), now, 0.1);
}
function updateAudio(dt) {
  hsT -= dt;
  if (!audioCtx) return;
  const want = input.fire && cur === 6 && ammo[6] > 0 && !doorAnim && player.hp > 0 && !won;
  if (want && !flameSrc) {
    const b = pickBuf('loop_fire');
    if (b) { flameSrc = audioCtx.createBufferSource(); flameSrc.buffer = b; flameSrc.loop = true; flameG = audioCtx.createGain(); flameG.gain.value = 0; flameSrc.connect(flameG); flameG.connect(master); flameSrc.start(); flameG.gain.setTargetAtTime(0.7, audioCtx.currentTime, 0.04); }
  } else if (!want && flameSrc) {
    flameG.gain.setTargetAtTime(0, audioCtx.currentTime, 0.06); const old = flameSrc; flameSrc = null;
    setTimeout(() => { try { old.stop(); } catch (e) { } }, 400);
  }
  ambT -= dt; if (ambT > 0) return; ambT = 0.15;
  const cand = [];
  for (const t of torches) { if (!t.snd) continue; const dx = t.x - player.x, dy = t.y - player.y, d2 = dx * dx + dy * dy; if (d2 < 56) cand.push({ x: t.x, y: t.y, snd: t.snd, d2, v: 1 }); }
  for (const f of fires) { const dx = f.x - player.x, dy = f.y - player.y, d2 = dx * dx + dy * dy; if (d2 < 64) cand.push({ x: f.x, y: f.y, snd: 'fire', d2, v: (f.r > 1 ? 1.2 : 0.7) * Math.min(1, f.life / 1.5) }); }
  cand.sort((a, b) => a.d2 - b.d2);
  for (let i = 0; i < EM.length; i++) setEmitter(EM[i], cand[i]);
}
