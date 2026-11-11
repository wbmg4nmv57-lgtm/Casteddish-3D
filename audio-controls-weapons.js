/* ######################################################################
   CASTEDDISH - Audio, comandi e armi
   Sintesi audio, motore audio, comandi touch/tastiera, armi e magia, versi e passi.
   Sezioni, in ordine: dsp-library.js, audio-engine.js, controls.js, weapons.js, voices-steps.js
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Libreria di sintesi audio
   ATTENZIONE: dspLib viene copiata in un Worker, quindi deve restare
   autonoma (non usare variabili di altri file).
   ====================================================================== */

/* ---------- Audio ---------- */
// All sounds are synthesized sample by sample in 32-bit float (in a worker thread when the browser allows it),
// then played through a mixer with a compressor and a convolution reverb.
function dspLib(SR) {
  const RND = Math.random, TAU = 6.2832, N = (s) => Math.floor(s * SR);
  const buf = (s) => new Float32Array(N(s));
  const lerp = (a, b, u) => a + (b - a) * (u < 0 ? 0 : u > 1 ? 1 : u);
  const adsr = (att, hold, rel) => (t) => t < att ? t / att : t < att + hold ? 1 : Math.exp(-(t - att - hold) / rel);
  const noise = (s) => { const x = buf(s); for (let i = 0; i < x.length; i++) x[i] = RND() * 2 - 1; return x; };
  function mix(d, s2, off, g) { for (let i = 0; i < s2.length; i++) { const j = off + i; if (j >= d.length) break; if (j >= 0) d[j] += s2[i] * g; } }
  function norm(x) {
    let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; }
    const k = 0.85 / (m || 1); for (let i = 0; i < x.length; i++) x[i] *= k;
    return x;
  }
  // State-variable filter, cutoff may move over time (fc number or function of seconds). q is the damping.
  function filt(x, type, fc, q) {
    const y = new Float32Array(x.length), qq = q || 0.7, cap = SR / 6;
    let low = 0, band = 0;
    for (let i = 0; i < x.length; i++) {
      const c = typeof fc === 'function' ? fc(i / SR) : fc, f = 2 * Math.sin(Math.PI * (c > cap ? cap : c) / SR);
      low += f * band; const high = x[i] - low - qq * band; band += f * high;
      y[i] = type === 'lp' ? low : type === 'hp' ? high : band * qq;
    }
    return y;
  }
  function burst(sec, type, fc, q, dec, att) {
    const y = filt(noise(sec), type, fc, q);
    for (let i = 0; i < y.length; i++) { const t = i / SR; y[i] *= Math.min(1, t / (att || 0.001)) * Math.exp(-t / dec); }
    return y;
  }
  function thump(sec, f0, f1, dec) {
    const x = buf(sec); let ph = 0;
    for (let i = 0; i < x.length; i++) { const t = i / SR; ph += TAU * lerp(f0, f1, t / (sec * 0.7)) / SR; x[i] = Math.sin(ph) * Math.exp(-t / dec); }
    return x;
  }
  function click(d, i0, f, dec, amp) {
    const L = Math.floor(dec * 6 * SR), ph = RND() * 6.28;
    for (let k = 0; k < L && i0 + k < d.length; k++) d[i0 + k] += amp * Math.exp(-k / (dec * SR)) * (Math.sin(ph + TAU * f * k / SR) * 0.8 + (RND() * 2 - 1) * 0.4);
  }
  function reverb(x, wet, fb, tail) {
    const n = x.length + Math.floor(tail * SR), y = new Float32Array(n);
    const dl = [1116, 1188, 1277, 1356, 1422].map(v => Math.floor(v * SR / 44100)), bufs = dl.map(m => new Float32Array(m)), idx = dl.map(() => 0), dmp = dl.map(() => 0);
    for (let i = 0; i < n; i++) {
      const inp = i < x.length ? x[i] : 0; let acc = 0;
      for (let k = 0; k < 5; k++) {
        const bk = bufs[k], j = idx[k], v = bk[j];
        dmp[k] += (v - dmp[k]) * 0.4; bk[j] = inp * 0.3 + dmp[k] * fb; acc += v; idx[k] = (j + 1) % bk.length;
      }
      y[i] = inp + wet * acc * 0.4;
    }
    return y;
  }
  const rv = (x, wet, fb, tail) => norm(reverb(x, wet, fb, tail));
  function loopify(x, L) { const F = x.length - L, y = x.slice(0, L); for (let i = 0; i < F; i++) { const u = i / F; y[i] = x[i] * u + x[L + i] * (1 - u); } return y; }

  // Glottal-style source (jitter, vibrato, sub-octave) -> three moving formant filters -> saturation
  function voiceCore(sec, o) {
    const n = N(sec), out = new Float32Array(n);
    let ph = 0, ph2 = 0, jit = 0, l1 = 0, b1 = 0, l2 = 0, b2 = 0, l3 = 0, b3 = 0;
    const q = o.fq || 0.12, g = o.fg || [1, 0.7, 0.4], fadeN = N(0.05), cap = SR / 7;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      jit += ((RND() * 2 - 1) - jit) * 0.02;
      const f = o.f0(t) * (1 + (o.jit || 0) * jit + (o.vib ? o.vibD * Math.sin(TAU * o.vib * t) : 0));
      ph += f / SR; ph -= Math.floor(ph); ph2 += f * 0.5 / SR; ph2 -= Math.floor(ph2);
      let x = (2 * ph - 1) * 0.7 + (o.sub || 0) * (2 * ph2 - 1) + (RND() * 2 - 1) * (o.noise || 0);
      if (o.am) x *= 1 - o.amD * (0.5 + 0.5 * Math.sin(TAU * o.am * t));
      const F = o.form(t);
      const c1 = 2 * Math.sin(Math.PI * Math.min(F[0], cap) / SR), c2 = 2 * Math.sin(Math.PI * Math.min(F[1], cap) / SR), c3 = 2 * Math.sin(Math.PI * Math.min(F[2], cap) / SR);
      l1 += c1 * b1; b1 += c1 * (x - l1 - q * b1);
      l2 += c2 * b2; b2 += c2 * (x - l2 - q * b2);
      l3 += c3 * b3; b3 += c3 * (x - l3 - q * b3);
      let y = (b1 * g[0] + b2 * g[1] + b3 * g[2]) * q + (o.low || 0) * Math.sin(TAU * ph);
      y = Math.tanh(y * (o.drive || 1) * 3) * o.env(t);
      if (i > n - fadeN) y *= (n - i) / fadeN;
      out[i] = y;
    }
    return out;
  }
  function cackle(sec, n, f0, dur) {
    const d = buf(sec);
    for (let k = 0; k < n; k++) {
      const b = voiceCore(dur, { f0: t => lerp(f0 + k * 22, f0 * 0.78, t / dur), jit: 0.15, noise: 0.3, form: t => [850, 1700, 2700], fq: 0.1, drive: 2.5, env: adsr(0.01, dur * 0.3, dur * 0.35) });
      mix(d, b, N(k * (dur + 0.025) + RND() * 0.02), 0.9 - k * 0.04);
    }
    return d;
  }
  function choir(sec, notes) {
    const n = N(sec), d = new Float32Array(n);
    for (const f of notes) {
      const vf = 4 + RND() * 2.5, det = (RND() - 0.5) * 5; let ph = RND() * 6.28;
      for (let i = 0; i < n; i++) {
        const t = i / SR; ph += TAU * (f + det) * (1 + 0.007 * Math.sin(TAU * vf * t)) / SR;
        const e = Math.min(1, t / 0.35) * Math.exp(-Math.max(0, t - 0.5) / 0.9) * Math.min(1, (sec - t) / 0.05);
        d[i] += (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * e * 0.25;
      }
    }
    return d;
  }
  function rattle(sec, times, f0, f1, amp) {
    const d = buf(sec);
    times.forEach((t, k) => click(d, N(t), lerp(f0, f1, k / Math.max(1, times.length - 1)) * (0.9 + RND() * 0.2), 0.006 + RND() * 0.006, amp * (0.6 + RND() * 0.4)));
    for (let i = 0; i < d.length; i++) d[i] += (RND() * 2 - 1) * 0.015 * Math.exp(-i / (0.25 * SR));
    return d;
  }

  const G = {};
  // ---- Weapons and impacts
  G.shot_pistol = () => { const d = buf(0.35); mix(d, burst(0.3, 'hp', 1800, 0.8, 0.012, 0.0005), 0, 1); mix(d, burst(0.3, 'lp', 1400, 0.9, 0.05, 0.001), 0, 0.8); mix(d, thump(0.3, 160, 55, 0.07), 0, 0.9); return rv(d, 0.28, 0.8, 0.5); };
  G.shot_shotgun = () => { const d = buf(0.7); mix(d, burst(0.6, 'hp', 900, 0.8, 0.04, 0.0005), 0, 1); mix(d, burst(0.6, 'lp', 900, 0.9, 0.12, 0.001), 0, 0.9); mix(d, thump(0.6, 110, 38, 0.16), 0, 1); mix(d, burst(0.5, 'bp', 2500, 0.4, 0.02, 0.0005), 0, 0.5); return rv(d, 0.35, 0.82, 0.8); };
  G.shot_rifle = () => { const d = buf(0.2); mix(d, burst(0.2, 'hp', 2500, 0.8, 0.008, 0.0004), 0, 1); mix(d, burst(0.2, 'lp', 2000, 0.9, 0.03, 0.0005), 0, 0.8); mix(d, thump(0.15, 180, 70, 0.04), 0, 0.8); return rv(d, 0.2, 0.75, 0.4); };
  G.rocket = () => { const d = buf(1.1); mix(d, burst(1, 'bp', t => lerp(400, 2600, t / 0.8), 0.5, 0.45, 0.08), 0, 0.9); mix(d, thump(0.7, 90, 40, 0.25), 0, 1); mix(d, burst(0.6, 'hp', 1500, 0.8, 0.08, 0.001), 0, 0.4); return rv(d, 0.3, 0.85, 0.8); };
  G.explosion = () => { const d = buf(2.6); mix(d, thump(1.8, 75, 28, 0.6), 0, 1.1); mix(d, burst(2.2, 'lp', t => lerp(3500, 180, t / 1.6), 0.8, 0.55, 0.002), 0, 0.9); mix(d, burst(1.2, 'bp', 600, 0.5, 0.3, 0.01), 0, 0.5); for (let k = 0; k < 14; k++) click(d, N(0.1 + RND() * 1.2), 600 + RND() * 2400, 0.01, 0.25); return rv(d, 0.5, 0.88, 1.6); };
  G.throw = () => { const d = buf(0.45); mix(d, burst(0.4, 'bp', t => lerp(500, 1400, t / 0.3), 0.6, 0.12, 0.05), 0, 0.7); return rv(d, 0.15, 0.7, 0.3); };
  G.glass = () => { const d = buf(1.4); mix(d, burst(0.5, 'hp', 3500, 0.8, 0.07, 0.0005), 0, 0.8); for (let k = 0; k < 14; k++) click(d, N(RND() * 0.45), 3000 + RND() * 6000, 0.004, 0.35); mix(d, thump(0.2, 220, 120, 0.04), 0, 0.5); mix(d, burst(1.2, 'lp', 700, 1, 0.35, 0.12), N(0.05), 0.6); return rv(d, 0.3, 0.7, 0.6); };
  G.plasma = () => {
    const n = N(0.9), d = new Float32Array(n); let p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = lerp(2200, 380, t / 0.35) * (1 + 0.02 * Math.sin(TAU * 38 * t)); p1 += TAU * f / SR; p2 += TAU * f * 1.012 / SR;
      d[i] = Math.tanh((Math.sin(p1) + 0.4 * Math.sin(2 * p1) + 0.6 * Math.sin(p2)) * 1.4) * Math.exp(-t / 0.18) * Math.min(1, t / 0.002);
    }
    mix(d, burst(0.5, 'hp', 5000, 0.8, 0.15, 0.001), 0, 0.25); mix(d, thump(0.2, 90, 50, 0.1), 0, 0.5);
    return rv(d, 0.45, 0.85, 0.7);
  };
  G.sizzle = () => { const d = buf(0.7); mix(d, burst(0.6, 'bp', 4200, 0.4, 0.22, 0.002), 0, 0.7); for (let k = 0; k < 12; k++) click(d, N(RND() * 0.4), 3000 + RND() * 4000, 0.004, 0.3); mix(d, thump(0.2, 300, 120, 0.05), 0, 0.4); return rv(d, 0.2, 0.7, 0.3); };
  G.impact = () => {
    const d = buf(0.3); mix(d, burst(0.25, 'bp', 3200, 0.35, 0.025, 0.0005), 0, 0.9); mix(d, burst(0.2, 'lp', 700, 0.8, 0.04, 0.001), 0, 0.7); mix(d, thump(0.12, 200, 90, 0.03), 0, 0.4);
    if (RND() < 0.5) { const n = N(0.14); for (let i = 0; i < n && i < d.length; i++) { const t = i / SR; d[i] += 0.12 * Math.sin(TAU * lerp(3200, 1500, t / 0.14) * t) * Math.exp(-t / 0.05); } }
    return rv(d, 0.15, 0.6, 0.3);
  };
  G.hit_flesh = () => { const d = buf(0.3); mix(d, burst(0.25, 'lp', 900, 0.8, 0.07, 0.002), 0, 0.9); mix(d, thump(0.2, 150, 60, 0.06), 0, 0.8); mix(d, burst(0.15, 'bp', 350, 0.3, 0.05, 0.005), 0, 0.5); return rv(d, 0.15, 0.6, 0.3); };
  G.hurt_player = () => { const d = voiceCore(0.3, { f0: t => lerp(180, 110, t / 0.3), jit: 0.1, noise: 0.4, form: t => [600, 1000, 2400], drive: 2, env: adsr(0.01, 0.05, 0.12) }); mix(d, thump(0.25, 120, 50, 0.08), 0, 0.7); mix(d, burst(0.1, 'lp', 900, 0.8, 0.03, 0.001), 0, 0.6); return rv(d, 0.15, 0.7, 0.3); };
  G.switch = () => { const d = buf(0.2); click(d, 0, 2200, 0.004, 0.6); mix(d, thump(0.08, 200, 120, 0.02), 0, 0.5); click(d, N(0.06), 1400, 0.006, 0.5); return rv(d, 0.1, 0.6, 0.2); };
  G.witch_cast = () => { const n = N(0.9), d = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; d[i] = Math.sin(TAU * lerp(400, 1400, t / 0.7) * t + 3 * Math.sin(TAU * 6 * t)) * Math.min(1, t / 0.1) * Math.exp(-t / 0.4) * 0.5; } mix(d, burst(0.7, 'hp', 3000, 0.6, 0.25, 0.05), 0, 0.3); return rv(d, 0.4, 0.85, 0.7); };
  G.witch_zap = () => { const d = buf(0.4); mix(d, burst(0.3, 'bp', 3000, 0.4, 0.08, 0.001), 0, 0.8); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] += 0.5 * Math.sin(TAU * lerp(900, 200, t / 0.25) * t) * Math.exp(-t / 0.1); } return rv(d, 0.2, 0.7, 0.4); };
  G.summon = () => { const d = buf(2.4); mix(d, thump(2.2, 48, 30, 1.2), 0, 1); const w = burst(2.2, 'bp', t => lerp(1800, 2600, t / 2.2), 0.2, 1.2, 0.8); for (let i = 0; i < w.length; i++) w[i] *= 0.6 + 0.4 * Math.sin(TAU * 5 * i / SR); mix(d, w, 0, 0.7); return rv(d, 0.6, 0.9, 1.2); };

  // ---- Scenery and pickups
  G.crate_hit = () => { const d = buf(0.3); mix(d, thump(0.2, 260, 170, 0.05), 0, 0.7); mix(d, burst(0.15, 'bp', 900, 0.4, 0.03, 0.0005), 0, 0.7); return rv(d, 0.15, 0.6, 0.25); };
  G.crate_break = () => { const d = buf(0.9); for (let k = 0; k < 6; k++) { const t = N(RND() * 0.35); mix(d, thump(0.15, 200 + RND() * 120, 120, 0.04), t, 0.5); mix(d, burst(0.12, 'bp', 700 + RND() * 600, 0.4, 0.03, 0.0005), t, 0.5); } for (let k = 0; k < 5; k++) mix(d, burst(0.2, 'hp', 2500, 0.6, 0.05, 0.001), N(RND() * 0.3), 0.3); mix(d, thump(0.4, 90, 45, 0.12), 0, 0.7); return rv(d, 0.25, 0.75, 0.5); };
  G.chest_open = () => {
    const n = N(1.0), d = new Float32Array(n), c = filt(noise(1.0), 'bp', t => lerp(260, 640, t / 0.8), 0.12);
    for (let i = 0; i < n; i++) { const t = i / SR; d[i] = c[i] * (0.55 + 0.45 * Math.sin(TAU * 14 * t)) * Math.min(1, t / 0.05) * Math.max(0, Math.min(1, (0.78 - t) / 0.03)) * 0.9; }
    mix(d, thump(0.25, 120, 60, 0.1), N(0.75), 0.9); click(d, N(0.78), 1400, 0.02, 0.4); click(d, N(0.3), 2200, 0.003, 0.3);
    return rv(d, 0.2, 0.75, 0.5);
  };
  G.key = () => {
    const n = N(1.6), d = new Float32Array(n);
    for (const [f, a, dec] of [[1318.5, 0.5, 0.5], [1760, 0.4, 0.4], [2637, 0.3, 0.3], [3520, 0.15, 0.2]])
      for (let i = 0; i < n; i++) { const t = i / SR; d[i] += a * Math.sin(TAU * f * t + 1.2 * Math.sin(TAU * f * 1.41 * t) * Math.exp(-t / 0.2)) * Math.exp(-t / dec) * Math.min(1, t / 0.002); }
    return rv(d, 0.5, 0.86, 1.2);
  };
  G.pickup_med = () => { const n = N(1.4), d = new Float32Array(n); for (const f of [523.25, 659.25, 783.99, 1046.5]) for (let i = 0; i < n; i++) { const t = i / SR; d[i] += 0.3 * Math.sin(TAU * f * t) * Math.min(1, t / 0.1) * Math.exp(-t / 0.5); } return rv(d, 0.5, 0.85, 1.0); };
  G.pickup_ammo = () => { const d = buf(0.4); click(d, 0, 2400, 0.005, 0.8); click(d, N(0.06), 1800, 0.008, 0.7); mix(d, burst(0.15, 'bp', 3500, 0.3, 0.03, 0.001), N(0.02), 0.3); mix(d, thump(0.12, 200, 120, 0.03), 0, 0.3); return rv(d, 0.15, 0.7, 0.3); };
  G.pickup_weapon = () => { const d = buf(0.6); click(d, 0, 1800, 0.06, 0.6); click(d, N(0.09), 2600, 0.012, 0.6); click(d, N(0.16), 1500, 0.015, 0.5); mix(d, burst(0.2, 'bp', 2500, 0.4, 0.05, 0.001), 0, 0.3); mix(d, thump(0.2, 140, 70, 0.06), 0, 0.5); return rv(d, 0.25, 0.75, 0.5); };
  G.pickup_armor = () => { const d = buf(0.6); mix(d, burst(0.4, 'bp', 1800, 0.5, 0.12, 0.03), 0, 0.5); click(d, N(0.12), 2800, 0.03, 0.5); click(d, N(0.2), 3600, 0.02, 0.3); mix(d, thump(0.2, 130, 70, 0.08), 0, 0.4); return rv(d, 0.2, 0.75, 0.4); };
  G.armor_break = () => { const d = buf(0.9); mix(d, burst(0.5, 'hp', 2000, 0.7, 0.1, 0.001), 0, 0.7); for (let k = 0; k < 7; k++) click(d, N(RND() * 0.4), 1500 + RND() * 2500, 0.03, 0.4); mix(d, thump(0.3, 150, 60, 0.1), 0, 0.7); return rv(d, 0.3, 0.8, 0.6); };

  // ---- Scenery materials
  G.hit_metal = () => { const d = buf(0.5); click(d, 0, 1700 + RND() * 500, 0.05, 0.7); click(d, 0, 3400, 0.03, 0.4); mix(d, thump(0.1, 200, 120, 0.03), 0, 0.4); return rv(d, 0.2, 0.75, 0.4); };
  G.hit_stone = () => { const d = buf(0.3); mix(d, burst(0.2, 'bp', 1800, 0.35, 0.03, 0.0005), 0, 0.8); mix(d, thump(0.15, 160, 90, 0.04), 0, 0.6); return rv(d, 0.2, 0.7, 0.3); };
  G.hit_glass = () => { const d = buf(0.5); click(d, 0, 4200 + RND() * 800, 0.03, 0.5); click(d, N(0.01), 6200, 0.02, 0.3); mix(d, burst(0.2, 'hp', 4000, 0.6, 0.04, 0.0005), 0, 0.4); return rv(d, 0.25, 0.8, 0.5); };
  G.hit_bone = () => { const d = buf(0.3); for (let k = 0; k < 3; k++) click(d, N(k * 0.03), 2200 + RND() * 1500, 0.006, 0.5); mix(d, thump(0.1, 220, 150, 0.03), 0, 0.3); return rv(d, 0.15, 0.7, 0.25); };
  G.break_metal = () => { const d = buf(1.2); mix(d, thump(0.4, 120, 50, 0.1), 0, 0.8); mix(d, burst(0.6, 'hp', 1800, 0.7, 0.12, 0.001), 0, 0.6); for (let k = 0; k < 9; k++) click(d, N(RND() * 0.6), 1200 + RND() * 2600, 0.04, 0.35); return rv(d, 0.3, 0.8, 0.6); };
  G.break_stone = () => { const d = buf(1.0); mix(d, thump(0.5, 100, 40, 0.15), 0, 0.9); mix(d, burst(0.7, 'lp', t => lerp(2500, 400, t / 0.6), 0.7, 0.2, 0.002), 0, 0.8); for (let k = 0; k < 10; k++) click(d, N(0.05 + RND() * 0.6), 500 + RND() * 1500, 0.01, 0.3); return rv(d, 0.3, 0.8, 0.7); };
  G.break_glass = () => { const d = buf(1.2); mix(d, burst(0.5, 'hp', 3500, 0.7, 0.1, 0.0005), 0, 0.8); for (let k = 0; k < 24; k++) click(d, N(RND() * 0.8), 3000 + RND() * 6500, 0.005, 0.3); return rv(d, 0.35, 0.8, 0.8); };
  G.break_bone = () => { const d = buf(1.0); for (let k = 0; k < 14; k++) click(d, N(RND() * 0.7), 1800 + RND() * 2400, 0.007, 0.5); mix(d, thump(0.2, 200, 100, 0.06), 0, 0.4); return rv(d, 0.25, 0.75, 0.5); };

  // ---- Door
  G.key_whoosh = () => rv(burst(0.45, 'bp', t => lerp(500, 1800, t / 0.35), 0.5, 0.14, 0.06), 0.2, 0.7, 0.3);
  G.key_insert = () => { const d = buf(0.25); click(d, 0, 2800, 0.004, 0.8); click(d, N(0.02), 1500, 0.01, 0.5); mix(d, thump(0.1, 220, 120, 0.03), 0, 0.4); return rv(d, 0.15, 0.7, 0.3); };
  G.key_turn = () => { const d = buf(0.4); mix(d, thump(0.15, 180, 90, 0.04), 0, 0.6); click(d, N(0.08), 1200, 0.015, 0.7); click(d, N(0.12), 2600, 0.006, 0.4); const n = N(0.15), o = N(0.1); for (let i = 0; i < n; i++) { const t = i / SR; d[o + i] += 0.2 * Math.sin(TAU * lerp(1800, 900, t / 0.15) * t) * Math.exp(-t / 0.05); } return rv(d, 0.15, 0.7, 0.3); };
  G.lock_open = () => { const d = buf(0.9); click(d, 0, 1500, 0.02, 0.8); click(d, N(0.03), 2200, 0.015, 0.6); const o = N(0.02); for (const [f, a] of [[2400, 0.4], [3300, 0.25], [4700, 0.12]]) for (let i = 0; i < N(0.6); i++) { const t = i / SR; d[o + i] += a * Math.sin(TAU * f * t) * Math.exp(-t / 0.2); } return rv(d, 0.25, 0.8, 0.6); };
  G.lock_fall = () => { const d = buf(1.0); [[0, 0.7], [0.18, 0.5], [0.3, 0.35], [0.38, 0.2]].forEach(([t, a], k) => { click(d, N(t), 1800 + k * 300, 0.03, a); mix(d, thump(0.1, 200, 100, 0.03), N(t), a * 0.4); }); return rv(d, 0.25, 0.8, 0.5); };
  G.door_rumble = () => { const d = buf(2.2); mix(d, burst(2, 'lp', t => lerp(220, 90, t / 2), 0.9, 1.2, 0.3), 0, 1); mix(d, thump(1.8, 55, 30, 0.9), 0, 0.8); const sc = burst(1.6, 'bp', t => lerp(700, 350, t / 1.6), 0.4, 0.8, 0.2); for (let i = 0; i < sc.length; i++) sc[i] *= 0.6 + 0.4 * Math.sin(TAU * 9 * i / SR); mix(d, sc, 0, 0.5); return rv(d, 0.4, 0.88, 1.0); };

  // ---- Liquids
  G.splash = () => { const d = buf(0.7); mix(d, burst(0.5, 'bp', t => lerp(900, 400, t / 0.4), 0.3, 0.14, 0.01), 0, 0.9); for (let k = 0; k < 6; k++) click(d, N(0.05 + RND() * 0.3), 2000 + RND() * 2000, 0.01, 0.2); return rv(d, 0.2, 0.7, 0.4); };
  G.sludge = () => { const d = buf(0.6); mix(d, burst(0.4, 'lp', 500, 0.5, 0.12, 0.01), 0, 0.9); for (let k = 0; k < 3; k++) { const n = N(0.06), o = N(0.04 + k * 0.1); for (let i = 0; i < n; i++) { const t = i / SR; d[o + i] += 0.3 * Math.sin(TAU * lerp(200, 600, t / 0.06) * t) * Math.exp(-t / 0.03); } } return rv(d, 0.2, 0.75, 0.4); };

  // ---- Player footsteps by surface
  G.step_p_stone = () => { const d = buf(0.3); mix(d, thump(0.18, 120, 70, 0.04), 0, 0.5); mix(d, burst(0.2, 'bp', 1600 + RND() * 400, 0.4, 0.025, 0.001), 0, 0.6); mix(d, burst(0.15, 'lp', 500, 0.8, 0.05, 0.001), 0, 0.4); return rv(d, 0.25, 0.8, 0.35); };
  G.step_p_concrete = () => { const d = buf(0.25); mix(d, thump(0.15, 110, 65, 0.035), 0, 0.5); mix(d, burst(0.15, 'hp', 3000, 0.7, 0.02, 0.001), 0, 0.3); mix(d, burst(0.18, 'bp', 1200, 0.4, 0.03, 0.001), 0, 0.5); for (let k = 0; k < 4; k++) click(d, N(RND() * 0.1), 2500 + RND() * 3000, 0.004, 0.15); return rv(d, 0.12, 0.7, 0.25); };
  G.step_p_marble = () => { const d = buf(0.3); mix(d, burst(0.15, 'bp', 2400 + RND() * 300, 0.3, 0.015, 0.0005), 0, 0.9); mix(d, thump(0.15, 140, 90, 0.03), 0, 0.4); return rv(d, 0.35, 0.85, 0.6); };
  G.step_p_mud = () => { const d = buf(0.4); mix(d, burst(0.3, 'lp', t => lerp(600, 250, t / 0.25), 0.6, 0.08, 0.01), 0, 0.9); mix(d, thump(0.15, 90, 50, 0.05), 0, 0.5); const n = N(0.05), o = N(0.1); for (let i = 0; i < n; i++) { const t = i / SR; d[o + i] += 0.3 * Math.sin(TAU * lerp(300, 700, t / 0.05) * t) * Math.exp(-t / 0.02); } return rv(d, 0.15, 0.7, 0.25); };
  G.step_p_metal = () => { const d = buf(0.35); click(d, 0, 1100, 0.04, 0.6); click(d, 0, 2400, 0.03, 0.4); mix(d, thump(0.12, 160, 90, 0.03), 0, 0.5); mix(d, burst(0.2, 'bp', 3000, 0.3, 0.05, 0.001), 0, 0.2); return rv(d, 0.3, 0.8, 0.5); };
  G.step_p_water = () => G.splash();
  G.step_p_toxic = () => G.sludge();

  // ---- Monster footsteps
  G.step_demon = () => { const d = buf(0.45); mix(d, thump(0.35, 85, 38, 0.12), 0, 1); mix(d, burst(0.3, 'lp', 400, 0.8, 0.08, 0.002), 0, 0.6); mix(d, burst(0.2, 'hp', 2500, 0.7, 0.02, 0.001), N(0.02), 0.25); return rv(d, 0.3, 0.85, 0.5); };
  G.step_ghoul = () => { const d = buf(0.55); mix(d, burst(0.5, 'bp', t => lerp(1400, 700, t / 0.4), 0.3, 0.25, 0.02), 0, 0.7); mix(d, thump(0.15, 100, 60, 0.05), N(0.12), 0.35); mix(d, burst(0.3, 'hp', 3500, 0.7, 0.08, 0.01), 0, 0.15); return rv(d, 0.15, 0.7, 0.3); };
  G.step_witch = () => { const d = buf(0.3); click(d, 0, 3200, 0.006, 0.9); click(d, N(0.01), 1800, 0.01, 0.5); click(d, N(0.09), 2600, 0.004, 0.5); mix(d, thump(0.06, 300, 150, 0.015), 0, 0.3); return rv(d, 0.3, 0.8, 0.5); };
  G.step_skel = () => { const d = buf(0.3); for (let k = 0; k < 4; k++) click(d, N(k * 0.025 + RND() * 0.01), 2200 + RND() * 2000, 0.005, 0.5 - k * 0.08); mix(d, thump(0.1, 220, 160, 0.03), 0, 0.3); return rv(d, 0.2, 0.7, 0.3); };
  G.step_boss = () => {
    const d = buf(0.7); mix(d, burst(0.4, 'lp', t => lerp(700, 200, t / 0.3), 0.5, 0.1, 0.004), 0, 0.9); mix(d, thump(0.4, 60, 32, 0.14), 0, 0.9);
    const n = N(0.08); for (let i = 0; i < n; i++) { const t = i / SR; d[N(0.05) + i] += 0.3 * Math.sin(TAU * lerp(150, 350, t / 0.08) * t) * Math.exp(-t / 0.04); }
    const j = burst(0.3, 'lp', 300, 0.6, 0.15, 0.02); for (let i = 0; i < j.length; i++) j[i] *= 0.5 + 0.5 * Math.sin(TAU * 7 * i / SR); mix(d, j, N(0.1), 0.4);
    return rv(d, 0.35, 0.85, 0.6);
  };

  // ---- Light sources (seamless loops, 2 s)
  function crackleLoop(sec, rate, big, rumble, hiss) {
    const L = N(sec), n = L + N(0.15), len = sec + 0.15;
    const x = filt(noise(len), 'lp', 260, 1); for (let i = 0; i < n; i++) x[i] *= rumble * (0.7 + 0.3 * Math.sin(TAU * 0.5 * i / SR));
    const h = filt(noise(len), 'bp', 4500, 0.25); for (let i = 0; i < n; i++) x[i] += h[i] * hiss * (0.4 + 0.6 * Math.abs(Math.sin(TAU * 1.5 * i / SR + 1)) * (RND() < 0.5 ? 1 : 0.6));
    for (let k = 0; k < rate * len; k++) click(x, Math.floor(RND() * n), 1500 + RND() * 4500, 0.002 + RND() * 0.006, 0.12 + RND() * 0.25);
    for (let k = 0; k < big * len; k++) click(x, Math.floor(RND() * n), 600 + RND() * 1200, 0.012 + RND() * 0.01, 0.5 + RND() * 0.3);
    return loopify(x, L);
  }
  function humLoop(sec, f0, harm, buzz, bz, dips) {
    const L = N(sec), n = L + N(0.15), x = new Float32Array(n);
    for (let k = 0; k < harm.length; k++) for (let i = 0; i < n; i++) x[i] += harm[k] * Math.sin(TAU * f0 * (k + 1) * i / SR);
    const b = filt(noise(sec + 0.15), 'bp', bz, 0.3); for (let i = 0; i < n; i++) x[i] += b[i] * buzz;
    for (const [t0, dd] of dips || []) for (let i = N(t0); i < Math.min(n, N(t0 + dd)); i++) x[i] *= 0.12;
    const y = loopify(x, L); for (const [t0, dd] of dips || []) { click(y, N(t0), 2500, 0.004, 0.35); click(y, N(t0 + dd), 3200, 0.003, 0.3); }
    return y;
  }
  G.loop_torch = () => norm(crackleLoop(2, 22, 3, 0.5, 0.5));
  G.loop_brazier = () => norm(crackleLoop(2, 34, 5, 0.9, 0.7));
  G.loop_candle = () => norm(crackleLoop(2, 6, 0.5, 0.12, 0.12));
  G.loop_tube = () => norm(humLoop(2, 100, [0.5, 0.25, 0.3, 0.12, 0.1], 0.06, 1800, [[0.7, 0.05], [0.78, 0.04], [1.55, 0.08]]));
  G.loop_bulb = () => { const y = humLoop(2, 100, [0.45, 0.3, 0.35, 0.2, 0.2, 0.12], 0.1, 2500, [[1.1, 0.03], [1.2, 0.03]]); for (let k = 0; k < 5; k++) click(y, N(RND() * 1.9), 2800 + RND() * 2000, 0.003, 0.25); return norm(y); };
  G.loop_lantern = () => { const y = humLoop(2, 85, [0.12, 0.05], 0.02, 3000, []); mix(y, crackleLoop(2, 5, 0.3, 0.1, 0.1), 0, 1); return norm(y); };
  G.loop_moss = () => {
    const L = N(2), x = new Float32Array(L);
    for (const [f, a] of [[520, 0.3], [524.5, 0.3], [780, 0.2]]) for (let i = 0; i < L; i++) x[i] += a * Math.sin(TAU * f * i / SR) * (0.6 + 0.4 * Math.sin(TAU * 0.5 * i / SR + f));
    for (let k = 0; k < 6; k++) click(x, N(RND() * 1.9), 2500 + RND() * 3000, 0.04, 0.15);
    return norm(x);
  };
  G.loop_sodium = () => norm(humLoop(2, 120, [0.4, 0.3, 0.2, 0.1], 0.05, 2500, []));
  G.loop_warn = () => { const y = humLoop(2, 50, [0.35, 0.25, 0.2, 0.12, 0.1], 0.05, 1500, []); for (let i = 0; i < y.length; i++) y[i] *= 0.55 + 0.45 * (Math.sin(TAU * 2 * i / SR) > 0 ? 1 : 0.2); for (let k = 0; k < 4; k++) click(y, N(k * 0.5), 1800, 0.004, 0.6); return norm(y); };
  G.loop_fire = () => { const L = N(2), n = L + N(0.15), x = filt(noise(2.15), 'lp', 1100, 0.8); for (let i = 0; i < n; i++) x[i] *= 0.5 + 0.5 * Math.abs(Math.sin(TAU * 1.5 * i / SR) * Math.sin(TAU * 0.5 * i / SR + 1)); const y = loopify(x, L); mix(y, crackleLoop(2, 40, 6, 0.5, 0.8), 0, 0.8); return norm(y); };

  // ---- Monster cries: idle = base cry at full health, hurt = aggressive cry when wounded, death = desperate cry
  const VOX = {
    demon: {
      idle: () => rv(voiceCore(1.5, { f0: t => 64 + 6 * Math.sin(5 * t) - 5 * t, jit: 0.08, sub: 0.7, low: 0.5, noise: 0.1, form: t => [lerp(300, 620, t / 1.2), lerp(850, 1100, t / 1.2), 2300], am: 26, amD: 0.55, drive: 2.4, env: adsr(0.07, 0.5, 0.5) }), 0.35, 0.84, 1.2),
      hurt: () => rv(voiceCore(0.85, { f0: t => lerp(240, 100, t / 0.85) + 12 * Math.sin(40 * t), jit: 0.14, sub: 0.5, low: 0.3, noise: 0.35, form: t => [720, 1150, 2500], am: 60, amD: 0.6, drive: 4, env: adsr(0.01, 0.25, 0.25) }), 0.3, 0.8, 0.8),
      death: () => rv(voiceCore(2.4, { f0: t => t < 0.35 ? lerp(140, 400, t / 0.35) : lerp(400, 34, Math.pow((t - 0.35) / 2.05, 0.6)), vib: 6, vibD: 0.04, jit: 0.1, sub: 0.6, low: 0.4, noise: 0.3, form: t => [lerp(850, 300, t / 2.4), lerp(1200, 700, t / 2.4), 2400], am: 16, amD: 0.5, drive: 3, env: adsr(0.02, 0.5, 0.9) }), 0.45, 0.88, 1.4)
    },
    ghoul: {
      idle: () => { const d = voiceCore(1.6, { f0: t => 95 - 12 * t / 1.6, jit: 0.2, sub: 0.3, low: 0.2, noise: 0.9, form: t => [lerp(500, 380, t / 1.6), 1500, 2600], fq: 0.09, fg: [1, 0.6, 0.4], am: 11, amD: 0.7, drive: 1.6, env: adsr(0.1, 0.5, 0.6) });
        for (let k = 0; k < 7; k++) click(d, N(RND() * 1.4), 900 + RND() * 700, 0.004, 0.25);
        return rv(d, 0.35, 0.82, 1.0); },
      hurt: () => rv(voiceCore(0.7, { f0: t => lerp(520, 300, t / 0.7), jit: 0.25, sub: 0.2, noise: 0.55, form: t => [1100, 2300, 3400], fq: 0.08, fg: [1, 0.8, 0.6], drive: 5, am: 38, amD: 0.5, env: adsr(0.01, 0.2, 0.2) }), 0.3, 0.8, 0.7),
      death: () => { const d = voiceCore(2.6, { f0: t => lerp(210, 42, Math.pow(t / 2.6, 0.7)), jit: 0.3, sub: 0.5, low: 0.3, noise: 0.7, form: t => [lerp(700, 350, t / 2.6), 1300, 2400], am: 17, amD: 0.85, drive: 3, env: adsr(0.03, 0.7, 0.9) });
        for (let k = 0; k < 10; k++) click(d, N(RND() * 2.2), 300 + RND() * 200, 0.02, 0.35);
        return rv(d, 0.45, 0.86, 1.2); }
    },
    wraith: {
      idle: () => rv(choir(2.4, [330, 349, 415, 494]), 0.6, 0.9, 1.8),
      hurt: () => rv(voiceCore(0.8, { f0: t => lerp(1000, 1900, t / 0.5), vib: 13, vibD: 0.05, jit: 0.1, noise: 0.3, form: t => [1300, 2700, 3600], drive: 2.2, env: adsr(0.02, 0.3, 0.3) }), 0.5, 0.88, 1.2),
      death: () => { const f0 = t => lerp(1700, 110, Math.pow(t / 3.0, 0.55)), form = t => [lerp(1400, 500, t / 3), 2800, 3700];
        const a = voiceCore(3.0, { f0, vib: 7, vibD: 0.06, jit: 0.15, noise: 0.25, form, drive: 2, env: adsr(0.03, 0.8, 1.0) });
        const b = voiceCore(3.0, { f0: t => f0(t) * 1.012, vib: 6, vibD: 0.05, jit: 0.15, noise: 0.2, form, drive: 2, env: adsr(0.15, 0.8, 1.0) });
        mix(a, b, 0, 0.7); return rv(a, 0.7, 0.9, 2.0); }
    },
    witch: {
      idle: () => rv(cackle(1.5, 7, 560, 0.12), 0.3, 0.8, 0.9),
      hurt: () => rv(voiceCore(0.9, { f0: t => lerp(850, 1500, t / 0.6), vib: 11, vibD: 0.07, jit: 0.25, noise: 0.75, form: t => [1300, 2900, 3800], fq: 0.08, drive: 3.5, env: adsr(0.02, 0.35, 0.3) }), 0.35, 0.82, 0.8),
      death: () => { const d = voiceCore(2.8, { f0: t => lerp(1150, 95, Math.pow(t / 2.8, 0.6)), vib: 8, vibD: 0.06, jit: 0.2, noise: 0.4, form: t => [lerp(1300, 600, t / 2.8), 2500, 3500], drive: 3, env: adsr(0.03, 0.9, 0.9) });
        mix(d, cackle(0.9, 4, 480, 0.14), N(1.9), 0.8); return rv(d, 0.5, 0.88, 1.6); }
    },
    boss: {
      idle: () => { const d = voiceCore(2.0, { f0: t => 50 - 3 * t, jit: 0.12, sub: 0.8, low: 0.8, noise: 0.4, form: t => [lerp(220, 320, t / 2), 640, 1400], fq: 0.15, am: 3.5, amD: 0.6, drive: 2.5, env: adsr(0.1, 0.6, 0.7) });
        for (let k = 0; k < 6; k++) click(d, N(RND() * 1.8), 140 + RND() * 120, 0.03, 0.3);
        return rv(d, 0.4, 0.85, 1.5); },
      hurt: () => rv(voiceCore(1.1, { f0: t => lerp(135, 66, t / 1.1), jit: 0.16, sub: 0.6, low: 0.5, noise: 0.5, form: t => [500, 950, 2100], am: 9, amD: 0.5, drive: 5, env: adsr(0.02, 0.35, 0.45) }), 0.4, 0.84, 1.0),
      death: () => rv(voiceCore(3.6, { f0: t => lerp(160, 24, Math.pow(t / 3.6, 0.5)), vib: 4, vibD: 0.05, jit: 0.15, sub: 0.9, low: 0.7, noise: 0.5, form: t => [lerp(600, 200, t / 3.6), 900, 1800], am: 5.5, amD: 0.6, drive: 3.5, env: adsr(0.04, 1.2, 1.3) }), 0.55, 0.9, 2.0)
    },
    skel: {
      idle: () => rv(rattle(0.7, [0, 0.07 + RND() * 0.03, 0.14 + RND() * 0.04, 0.26, 0.31], 2800, 3800, 0.8), 0.3, 0.7, 0.6),
      hurt: () => { const d = rattle(0.7, Array.from({ length: 10 }, (_, k) => k * 0.035 + RND() * 0.01), 3300, 2400, 0.9);
        mix(d, voiceCore(0.25, { f0: t => lerp(1500, 850, t / 0.25), vib: 20, vibD: 0.04, noise: 0.2, form: t => [1600, 3000, 4000], drive: 2, env: adsr(0.01, 0.08, 0.1) }), 0, 0.5);
        return rv(d, 0.25, 0.7, 0.5); },
      death: () => { const d = buf(1.4);
        for (let k = 0; k < 16; k++) click(d, N(Math.pow(k / 15, 1.3) * 0.9), lerp(4200, 1800, k / 15), 0.008, 0.7);
        for (let i = 0; i < N(0.35); i++) { const t = i / SR; d[N(0.45) + i] += 0.7 * Math.sin(TAU * lerp(110, 45, t / 0.35) * t) * Math.exp(-t / 0.12); }
        return rv(d, 0.4, 0.85, 1.0); }
    }
  };
  for (const t in VOX) for (const k in VOX[t]) G[t + '_' + k] = VOX[t][k];

  return {
    render(name) {
      const g = G[name]; if (!g) return new Float32Array(1);
      const x = g();
      if (name.indexOf('loop_') !== 0) { const f = N(0.02); for (let i = 0; i < f && i < x.length; i++) x[x.length - 1 - i] *= i / f; }
      return x;
    }
  };
}

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

/* ======================================================================
   CASTEDDISH - Versi e passi
   Versi dei mostri e passi del giocatore e dei nemici.
   ====================================================================== */

// ---- Monster cries and footsteps (the sounds themselves come from the audio engine) ----
let voices = 0;
function enemyVoice(e, kind) {
  if (!audioCtx || voices >= 8) return;
  const R = { idle: 7, hurt: 9, death: 11 }[kind] * (TYPES[e.type].boss ? 1.6 : 1);
  const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
  if (d > R) return;
  const vol = Math.pow(1 - Math.max(0, d - 1.5) / (R - 1.5), 2);
  const seen = d < 2.5 || los(e.x, e.y, player.x, player.y);
  const sn = playBuf((TYPES[e.type].boss ? 'boss' : e.type) + '_' + kind, { vol: 0.95 * vol, pan: relPan(dx, dy), lp: (seen ? 3000 : 600) + 9000 * vol, wet: 0.2, hi: true });
  if (sn) { voices++; sn.addEventListener('ended', () => { voices--; }); }
}
function enemyStep(e) { sfxAt('step_' + (TYPES[e.type].boss ? 'boss' : e.type), e.x, e.y, TYPES[e.type].boss ? 9 : 6.5, TYPES[e.type].boss ? 1.1 : 0.7, false); }
function playerStepTick(moved, liquid) {
  player.sd = (player.sd || 0) + moved;
  if (player.sd < 1.05) return;
  player.sd -= 1.05; player.foot = !player.foot;
  const surf = liquid ? (curFloor === 4 ? 'toxic' : 'water') : ['stone', 'concrete', 'marble', 'mud', 'metal'][curFloor];
  sfx('step_p_' + surf, liquid ? 0.5 : 0.42, player.foot ? 0.15 : -0.15, false);
}
