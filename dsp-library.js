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
