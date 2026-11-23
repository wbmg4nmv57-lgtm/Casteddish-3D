/* ######################################################################
   CASTEDDISH - Piano 2 in 3D (Three.js)
   EDIFICIO ABBANDONATO: muri di intonaco scrostato, piastrelle, mattoni e lamiera, pavimenti e soffitti,
   lampade, porte, tubi, ghoul in 3D, arredi veri (scrivanie, armadietti, frigoriferi...), barili esplosivi,
   bile dei ghoul. Tutto quello che e in comune con il piano 1 (motore 3D T3, raccoglibili, casse e bauli,
   braccio e armi in prima persona, segni d'impatto sui muri, rottura degli oggetti) arriva da world-3d.js.
   Se qualcosa va storto, il piano 2 torna da solo al motore 2D (gli altri piani non cambiano).
   Sezioni, in ordine: textures (A), livello (B), ghoul (C), arredi (D), bile e ciclo (E)
   ###################################################################### */

/* ======================================================================
   CASTEDDISH - Piano 2: configurazione e texture
   Ogni texture e una cella (un muro alto 2,8 m): il colore si calcola su una griglia di 256 punti, poi si ingrandisce a 512 e
   sopra si disegnano i dettagli fini (crepe, colature, granulo). Nascono solo quando servono e restano in cache.
   ====================================================================== */
const L2 = { mats: {}, ready: false, bile: null };
const L2CFG = { ambient: 0.21, hand: 1.2, torch: 1.55, fog: 0.17 };   // luminosita del piano 2: alza o abbassa questi numeri
const L2S = 512, L2P = 256, L2H = 128;
const l2Cv = () => hwCv(L2S, L2S);
const l2Fld = (R, cells) => hwFbm(R, L2H, cells);              // campo morbido a 128 punti (si legge con l2At sulla griglia a 256)
const l2At = (f, x, y) => f[(y >> 1) * L2H + (x >> 1)];
const l2Mx = (c, r, g, b, t) => { c[0] += (r - c[0]) * t; c[1] += (g - c[1]) * t; c[2] += (b - c[2]) * t; };   // mescola il colore c verso (r,g,b), senza creare oggetti
const l2Tex = (cv) => hwTex(cv);
// griglia di calcolo a 256 punti: fn(x, y, c) scrive in c il colore; poi tutto si ingrandisce a 512
function l2Pass(fn, base) {
  const cs = base || document.createElement('canvas'); if (!base) cs.width = cs.height = L2P;
  const gs = cs.getContext('2d'), im = base ? gs.getImageData(0, 0, L2P, L2P) : gs.createImageData(L2P, L2P), d = im.data, c = [0, 0, 0];
  for (let y = 0, k = 0; y < L2P; y++) for (let x = 0; x < L2P; x++, k += 4) {
    if (base) { c[0] = d[k]; c[1] = d[k + 1]; c[2] = d[k + 2]; }
    fn(x, y, c); d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;   // il Uint8ClampedArray limita da solo a 0..255
  }
  gs.putImageData(im, 0, 0);
  const cv = l2Cv(), g = cv[1]; g.imageSmoothingEnabled = true; g.drawImage(cs, 0, 0, L2S, L2S);
  return cv;
}
// granulo fine: puntini chiari e scuri a bassa opacita
function l2Grain(g, R, n) {
  const S = L2S; g.fillStyle = 'rgba(0,0,0,0.07)'; for (let i = 0; i < n; i++) g.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < n; i++) g.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
}

// mattoni (griglia a 256): luminosita 0..1 di ogni punto, malta scura, si ripete senza stacchi in orizzontale
function l2BrickField(R, bw, bh) {
  const S = L2P, out = new Float32Array(S * S), rows = Math.ceil(S / bh), per = Math.round(S / bw);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2, y0 = r * bh;
    for (let b = 0; b <= per; b++) {
      const x0 = Math.round(b * bw - off), v = 0.62 + (R() - 0.5) * 0.4;
      for (let y = y0 + 1; y < y0 + bh - 1 && y < S; y++) for (let xx = x0 + 1; xx < x0 + bw - 1; xx++) {
        const x = ((xx % S) + S) % S, e = Math.min(xx - x0 - 1, x0 + bw - 2 - xx, y - y0 - 1, y0 + bh - 2 - y);
        out[y * S + x] = v * (e < 2 ? 0.82 + 0.09 * e : 1) + (xx - x0 < 3 || y - y0 < 3 ? 0.06 : 0);
      }
    }
  }
  for (let i = 0; i < out.length; i++) if (out[i] === 0) out[i] = 0.28;   // malta
  return out;
}
// crepe: linee spezzate scure con un filo chiaro accanto, sempre dentro la tessera (coordinate a 512)
function l2Cracks(g, R, n, len, vert) {
  const S = L2S;
  for (let i = 0; i < n; i++) {
    let x = 30 + R() * (S - 60), y = 20 + R() * (S - 40), a = vert ? 1.57 + (R() - 0.5) * 0.8 : R() * 6.28;
    const pts = [[x, y]], L = len * (0.6 + R() * 0.8);
    for (let s = 0; s < L; s += 5) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * 5; y += Math.sin(a) * 5; if (x < 8 || y < 6 || x > S - 8 || y > S - 6) break; pts.push([x, y]); }
    if (pts.length < 3) continue;
    g.lineCap = g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2.6; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0] + 1.5, p[1] + 1) : g.moveTo(p[0] + 1.5, p[1] + 1)); g.stroke();
    g.strokeStyle = 'rgba(14,10,8,0.8)'; g.lineWidth = 1.5 + R(); g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  }
}
// colature: strisce verticali che sfumano verso il basso
function l2Drips(g, R, n, col, y0min, y0max) {
  const S = L2S;
  for (let i = 0; i < n; i++) {
    const x = 16 + R() * (S - 32), y0 = y0min + R() * (y0max - y0min), w = 4 + R() * 12, L = 40 + R() * 150;
    const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - w / 2, y0, w, L);
  }
}
// macchie scure (sporco, urti) con poca opacita
function l2Smudge(g, R, n, y0, y1, col) {
  const S = L2S;
  for (let i = 0; i < n; i++) {
    const x = 14 + R() * (S - 28), y = y0 + R() * (y1 - y0), rx = 4 + R() * 16, ry = 2 + R() * 7;
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, R() * 3, 0, 7); g.fill();
  }
}

// ---------------- intonaco scrostato: cornicione, parete alta, corrimano, vernice a meta altezza, zoccolo ----------------
const L2_WP = [
  { up: [214, 206, 184], lo: [88, 118, 102], rail: [200, 192, 170] },    // crema sopra, verde ospedale sotto
  { up: [206, 196, 160], lo: [126, 96, 66], rail: [190, 178, 146] },     // giallino sopra, marrone sotto
  { up: [196, 202, 204], lo: [66, 94, 118], rail: [180, 186, 190] },     // grigio sopra, blu sotto
  { up: [224, 222, 212], lo: [58, 108, 104], rail: [206, 204, 194] }     // bianco sporco sopra, verde acqua sotto
];
function l2PlasterTex(v) {
  const R = hwRng(9100 + v * 313), P = L2_WP[v % 4], f1 = l2Fld(R, 3), f2 = l2Fld(R, 6), f4 = l2Fld(R, 4), f5 = l2Fld(R, 5), br = l2BrickField(R, 32, 14), S = L2P;
  const cv = l2Pass((x, y, c) => {
    const i = y * S + x, yy = y / S, gr = R() - 0.5; let src = P.up, k = 1, up = false, lo = false;
    if (y < 11) k = y > 9 ? 0.66 : y > 7 ? 1.08 : 0.92;
    else if (y < 134) up = true;
    else if (y < 138) { src = P.rail; k = y < 135 ? 1.1 : y > 136 ? 0.6 : 1; }
    else if (y < 243) { src = P.lo; lo = true; }
    else { src = [44, 36, 30]; }
    c[0] = src[0] * k; c[1] = src[1] * k; c[2] = src[2] * k;
    const a1 = l2At(f1, x, y), a2 = l2At(f2, x, y), a4 = l2At(f4, x, y), a5 = l2At(f5, x, y);
    if (up || lo) {   // la vernice si stacca: sotto c'e intonaco grezzo e, piu in profondita, mattoni
      const pv = a1 * 0.75 + a2 * 0.25 + (lo ? 0.1 * Math.max(0, (y - 138) / 105) : 0), pm = hwSs(0.6, 0.68, pv);
      if (pm > 0) {
        const deep = hwSs(0.69, 0.74, pv), bl = br[i];
        let ur = 152 + gr * 16, ug = 144 + gr * 16, ub = 130 + gr * 14;
        if (deep > 0) { const bR = bl < 0.3 ? 112 : 136 * bl + 40, bG = bl < 0.3 ? 106 : 74 * bl + 22, bB = bl < 0.3 ? 96 : 56 * bl + 18; ur += (bR - ur) * deep; ug += (bG - ug) * deep; ub += (bB - ub) * deep; }
        l2Mx(c, ur, ug, ub, pm);
        if (pm < 1 && pm > 0.5) { c[0] *= 0.82; c[1] *= 0.82; c[2] *= 0.82; }   // bordo della scrostatura in ombra
      }
    }
    const st = hwSs(0.6, 0.78, a4) * (up ? 0.6 + 0.6 * (1 - yy * 2) : 0.28);   // aloni d'acqua
    if (st > 0) l2Mx(c, 150, 122, 74, Math.min(0.55, st * 0.55));
    const md = hwSs(0.64, 0.8, a5) * (up ? Math.max(0, 1 - y / 100) : lo ? Math.max(0, (y - 190) / 53) : 0);   // muffa: in alto e in basso
    if (md > 0) l2Mx(c, 46, 62, 46, Math.min(0.6, md * 0.65));
    const dirt = 1 - 0.28 * hwSs(0.62, 1, yy) - 0.1 * hwSs(0.1, 0, yy);
    c[0] = c[0] * dirt + gr * 14; c[1] = c[1] * dirt + gr * 14; c[2] = c[2] * dirt + gr * 14;
  }), g = cv[1];
  l2Grain(g, R, 2200); l2Drips(g, R, 7, 'rgba(78,56,30,0.3)', 24, 300); l2Smudge(g, R, 22, 300, 480, 'rgba(10,8,6,0.1)'); l2Cracks(g, R, 3, 120, true);
  return { cv: cv[0], bump: 0.9 };
}

// ---------------- piastrelle di bagno / cucina: fughe sporche, pezzi caduti, crepe, muffa e una fascia colorata ----------------
function l2TileWallTex(v) {
  const R = hwRng(9300 + v * 211), T = 16, S = L2P, cs = document.createElement('canvas'); cs.width = cs.height = S; const gb = cs.getContext('2d');
  const cols = [[208, 214, 210], [188, 204, 192], [214, 204, 182]][v % 3], band = [[40, 78, 70], [60, 70, 100], [100, 52, 44]][v % 3];
  const f4 = l2Fld(R, 4), f5 = l2Fld(R, 5), f1 = l2Fld(R, 3);
  gb.fillStyle = '#5a564c'; gb.fillRect(0, 0, S, S);
  for (let ty = 0; ty < S / T; ty++) for (let tx = 0; tx < S / T; tx++) {
    const x = tx * T, y = ty * T, b = ty === 7 ? band : cols, vv = (R() - 0.5) * 22;
    if (R() < 0.035) { gb.fillStyle = hwRgb([120, 116, 106], (R() - 0.5) * 20); gb.fillRect(x + 1, y + 1, T - 2, T - 2); gb.fillStyle = 'rgba(0,0,0,0.35)'; gb.fillRect(x + 1, y + 1, T - 2, 2); continue; }   // piastrella caduta
    gb.fillStyle = hwRgb(b, vv); gb.fillRect(x + 1, y + 1, T - 2, T - 2);
    gb.fillStyle = 'rgba(255,255,255,0.18)'; gb.fillRect(x + 1, y + 1, T - 2, 1); gb.fillRect(x + 1, y + 1, 1, T - 2);
    gb.fillStyle = 'rgba(0,0,0,0.22)'; gb.fillRect(x + 1, y + T - 2, T - 2, 1); gb.fillRect(x + T - 2, y + 1, 1, T - 2);
  }
  const cv = l2Pass((x, y, c) => {
    const st = hwSs(0.6, 0.8, l2At(f4, x, y)), md = hwSs(0.62, 0.82, l2At(f5, x, y)) * hwSs(100, 250, y), gm = c[0] < 100 ? 1 : 0;
    l2Mx(c, 140, 112, 66, st * 0.5); l2Mx(c, 40, 56, 40, Math.min(0.75, md * (0.5 + gm * 0.5)));
    const dirt = 1 - 0.3 * hwSs(0.55, 1, y / S) - 0.12 * l2At(f1, x, y); c[0] *= dirt; c[1] *= dirt; c[2] *= dirt;
  }, cs), g = cv[1];
  l2Grain(g, R, 1200); l2Drips(g, R, 6, 'rgba(90,60,26,0.3)', 10, 200); l2Cracks(g, R, 3, 90, false);
  return { cv: cv[0], bump: 1.1 };
}

// ---------------- mattoni a vista: dove l'intonaco e caduto, con sali, fuliggine e muschio in basso ----------------
function l2BrickWallTex(v) {
  const R = hwRng(9500 + v * 173), br = l2BrickField(R, v ? 40 : 32, v ? 17 : 14), f1 = l2Fld(R, 3), f2 = l2Fld(R, 6), f5 = l2Fld(R, 5), base = v ? [128, 70, 54] : [150, 82, 60], S = L2P;
  const cv = l2Pass((x, y, c) => {
    const i = y * S + x, bl = br[i], a1 = l2At(f1, x, y), a2 = l2At(f2, x, y), gr = R() - 0.5;
    if (bl < 0.31) { c[0] = 116 + gr * 16; c[1] = 110 + gr * 16; c[2] = 100 + gr * 14; } else { c[0] = base[0] * bl * 1.35 + gr * 20; c[1] = base[1] * bl * 1.35 + gr * 14; c[2] = base[2] * bl * 1.35 + gr * 12; }
    const pl = hwSs(0.56, 0.62, a1 * 0.8 + a2 * 0.2) * hwSs(0.75, 0.05, y / S);   // resti di intonaco in alto
    if (pl > 0) l2Mx(c, 190 + gr * 14, 182 + gr * 14, 164 + gr * 12, Math.min(1, pl));
    const sl = hwSs(0.62, 0.8, l2At(f5, x, y)); if (sl > 0) l2Mx(c, 214, 210, 196, sl * 0.4 * (bl < 0.31 ? 1.2 : 0.6));   // salnitro
    const mo = hwSs(0.6, 0.8, a2) * hwSs(150, 250, y); if (mo > 0) l2Mx(c, 58, 78, 44, Math.min(0.7, mo * 0.8));
    const dirt = 1 - 0.3 * hwSs(0.5, 1, y / S); c[0] *= dirt; c[1] *= dirt; c[2] *= dirt;
  }), g = cv[1];
  l2Grain(g, R, 1800); l2Drips(g, R, 5, 'rgba(30,24,18,0.3)', 10, 120); l2Cracks(g, R, 2, 110, true);
  return { cv: cv[0], bump: 1.6 };
}

// ---------------- lamiera ondulata arrugginita (muri di tipo 2): ondulazioni verticali, vernice scrostata, ruggine, rivetti ----------------
function l2MetalTex(v) {
  const R = hwRng(9700 + v * 97), f1 = l2Fld(R, 3), f2 = l2Fld(R, 7), f3 = l2Fld(R, 5), paint = v ? [98, 112, 92] : [84, 104, 120], S = L2P;
  const cv = l2Pass((x, y, c) => {
    const w = Math.cos(x / 16 * 6.2832), a1 = l2At(f1, x, y), a2 = l2At(f2, x, y), a3 = l2At(f3, x, y), gr = R() - 0.5;
    c[0] = 128 + w * 34 + gr * 14; c[1] = 124 + w * 32 + gr * 14; c[2] = 116 + w * 30 + gr * 14;
    const pm = hwSs(0.42, 0.5, a1 * 0.8 + a2 * 0.2);
    if (pm < 1) l2Mx(c, paint[0] + w * 22 + gr * 12, paint[1] + w * 22 + gr * 12, paint[2] + w * 22 + gr * 12, 1 - pm);   // vernice dove non e saltata
    const ru = hwSs(0.5, 0.75, a3 * 0.6 + a2 * 0.4) * (0.5 + 0.5 * pm); if (ru > 0) l2Mx(c, 138 + gr * 40, 62 + gr * 20, 26, Math.min(0.85, ru));
    const dirt = 1 - 0.3 * hwSs(0.5, 1, y / S) - 0.15 * hwSs(0.1, 0, y / S); c[0] *= dirt; c[1] *= dirt; c[2] *= dirt;
  }), g = cv[1];
  for (const y of [12, L2S - 12]) for (let i = 0; i < 16; i++) { const x = i * 32 + 16; g.fillStyle = 'rgba(20,16,14,0.8)'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x - 2, y - 3, 3, 2); }
  g.fillStyle = 'rgba(20,16,12,0.5)'; g.fillRect(0, 254, L2S, 4);   // giunzione tra due fogli
  l2Grain(g, R, 1800); l2Drips(g, R, 10, 'rgba(100,46,18,0.42)', 12, 250);
  return { cv: cv[0], bump: 1.5 };
}

// ---------------- pavimenti: piastrelle crema, scacchiera da ospedale, cemento, moquette consunta ----------------
function l2FloorTex(kind) {
  const R = hwRng(9900 + kind * 131), f1 = l2Fld(R, 3), f2 = l2Fld(R, 5), f3 = l2Fld(R, 7), T = 32;
  const cv = l2Pass((x, y, c) => {
    const gr = R() - 0.5, a1 = l2At(f1, x, y), a2 = l2At(f2, x, y), a3 = l2At(f3, x, y);
    if (kind === 0 || kind === 1) {   // piastrelle
      const tx = (x / T) | 0, ty = (y / T) | 0, lx = x % T, ly = y % T, e = Math.min(lx, ly, T - 1 - lx, T - 1 - ly);
      const th = ((tx * 73856093) ^ (ty * 19349663) ^ (kind * 83492791)) >>> 0, tv = ((th >>> 8) % 100) / 100, odd = (tx + ty) & 1;
      const b0 = kind === 0 ? (odd ? 188 : 200) : (odd ? 60 : 214), b1 = kind === 0 ? (odd ? 178 : 190) : (odd ? 88 : 208), b2 = kind === 0 ? (odd ? 152 : 164) : (odd ? 72 : 190);
      if (e < 0.7) { c[0] = 62; c[1] = 58; c[2] = 50; }
      else if (tv > 0.965) { c[0] = 28 + gr * 10; c[1] = 24 + gr * 10; c[2] = 20; }   // piastrella saltata: si vede il fondo
      else { const k = e < 2 ? (lx < 2 || ly < 2 ? 1.1 : 0.82) : 1; c[0] = (b0 + (tv - 0.5) * 24 + gr * 10) * k; c[1] = (b1 + (tv - 0.5) * 24 + gr * 10) * k; c[2] = (b2 + (tv - 0.5) * 22 + gr * 8) * k; }
    } else if (kind === 2) {   // cemento
      c[0] = 112 + gr * 22 + (a3 - 0.5) * 36; c[1] = 110 + gr * 22 + (a3 - 0.5) * 36; c[2] = 104 + gr * 20 + (a3 - 0.5) * 34;
      if (x < 1 || y < 1) { c[0] *= 0.6; c[1] *= 0.6; c[2] *= 0.6; }
    } else {   // moquette
      const w = R() * 0.5 + 0.5; c[0] = 92 * w + 18 + gr * 18; c[1] = 52 * w + 14 + gr * 12; c[2] = 54 * w + 16 + gr * 12;
    }
    const st = hwSs(0.6, 0.78, a2); if (st > 0) { if (kind === 3) l2Mx(c, 36, 22, 20, st * 0.5); else l2Mx(c, 92, 76, 48, st * 0.5); }   // macchie
    if (kind === 2) { const oil = hwSs(0.74, 0.82, a1); if (oil > 0) l2Mx(c, 22, 22, 24, oil * 0.7); }
    const dirt = 0.78 + 0.22 * (1 - a1); c[0] *= dirt; c[1] *= dirt; c[2] *= dirt;
  }), g = cv[1];
  l2Grain(g, R, 2200); if (kind !== 3) l2Cracks(g, R, 2, 110, false);
  l2Smudge(g, R, 30, 0, L2S, 'rgba(10,8,6,0.1)');
  return { cv: cv[0], bump: kind === 3 ? 0.6 : 0.9 };
}

// ---------------- soffitti: pannelli acustici con aloni d'acqua e pannelli caduti, oppure intonaco crepato ----------------
function l2CeilTex(kind) {
  const R = hwRng(9950 + kind * 71), f1 = l2Fld(R, 3), f2 = l2Fld(R, 5), T = 64;
  const cv = l2Pass((x, y, c) => {
    const gr = R() - 0.5, a1 = l2At(f1, x, y), a2 = l2At(f2, x, y);
    c[0] = 196 + gr * 18; c[1] = 192 + gr * 18; c[2] = 176 + gr * 16;
    if (kind === 0) {
      const tx = (x / T) | 0, ty = (y / T) | 0, lx = x % T, ly = y % T, e = Math.min(lx, ly, T - 1 - lx, T - 1 - ly), th = (((tx * 73856093) ^ (ty * 19349663)) >>> 8) % 100;
      if (e < 1.5) { c[0] = 150; c[1] = 150; c[2] = 146; } else if (th > 94) { c[0] = 22 + gr * 8; c[1] = 20 + gr * 8; c[2] = 18; }   // pannello caduto: buio dietro
      else { const k = 0.9 + 0.1 * ((th % 7) / 7) - (R() < 0.05 ? 0.3 : 0); c[0] *= k; c[1] *= k; c[2] *= k; }   // forellini
    }
    const st = hwSs(0.58, 0.78, a2); if (st > 0) l2Mx(c, 150, 120, 70, st * 0.55);
    const md = hwSs(0.68, 0.84, a1); if (md > 0) l2Mx(c, 60, 70, 54, md * 0.5);
  }), g = cv[1];
  l2Grain(g, R, 1600); if (kind === 1) l2Cracks(g, R, 4, 150, false);
  return { cv: cv[0], bump: 0.7 };
}

// materiali: ogni variante nasce alla prima richiesta e resta in cache per tutta la partita
function l2Mat(key, make, o) {
  let m = L2.mats[key];
  if (!m) {
    const t = make(), tx = l2Tex(t.cv); o = o || {};
    m = new THREE.MeshStandardMaterial({ map: tx, bumpMap: tx, bumpScale: t.bump * (o.bump || 1), roughness: o.rough || 0.95, metalness: o.metal || 0 });
    L2.mats[key] = m;
  }
  return m;
}
const l2WallMat = (fam, v) => l2Mat('w' + fam + v, () => fam === 'tile' ? l2TileWallTex(v) : fam === 'brick' ? l2BrickWallTex(v) : fam === 'metal' ? l2MetalTex(v) : l2PlasterTex(v), fam === 'metal' ? { rough: 0.62, metal: 0.35 } : fam === 'tile' ? { rough: 0.5 } : {});
const l2FloorMat = (k) => l2Mat('f' + k, () => l2FloorTex(k), k === 0 || k === 1 ? { rough: 0.55 } : {});
const l2CeilMat = (k) => l2Mat('c' + k, () => l2CeilTex(k));

/* ======================================================================
   CASTEDDISH - Piano 2: il livello in 3D
   Muri, pavimenti e soffitti per stanza (ufficio, corsia, bagno, rovina, magazzino, atrio), poi tutto quello che sporge
   dai muri: battiscopa, porte (anche socchiuse), uscite di sicurezza, estintori, bacheche, finestre sbarrate, quadri
   elettrici, orologi fermi, griglie, tubi, lampade a gabbia, scaffali. Lampade appese al soffitto, pannelli caduti,
   cavi, cartacce e pozzanghere a terra. E solo estetica: la griglia di gioco non cambia.
   ====================================================================== */
const L2D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const l2K = (r, g, b) => [r / 255, g / 255, b / 255];
const l2Frame = (x, y, d) => ({ ox: x + 0.5 + L2D[d][0] * 0.5, oz: y + 0.5 + L2D[d][1] * 0.5, tx: L2D[d][1], tz: -L2D[d][0], nx: L2D[d][0], nz: L2D[d][1] });   // a: lungo il muro, b: altezza, c: in fuori
const l2P = (F, a, b, c) => [F.ox + F.tx * a + F.nx * c, b, F.oz + F.tz * a + F.nz * c];
const l2M = () => ({ p: [], n: [], c: [], i: [] });

// parallelepipedo orientato: centro, mezze misure, tre assi (destrorsi), colore
function l2OBox(M, c, h, ax, ay, az, col, flat) {
  const A = [ax, ay, az];
  for (let u = 0; u < 3; u++) for (const s of [1, -1]) {
    const n = [A[u][0] * s, A[u][1] * s, A[u][2] * s], v = A[(u + 1) % 3], w = A[(u + 2) % 3], hv = h[(u + 1) % 3], hw = h[(u + 2) % 3];
    const ce = [c[0] + n[0] * h[u], c[1] + n[1] * h[u], c[2] + n[2] * h[u]];
    const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(e => [ce[0] + v[0] * hv * e[0] + w[0] * hw * e[1], ce[1] + v[1] * hv * e[0] + w[1] * hw * e[1], ce[2] + v[2] * hv * e[0] + w[2] * hw * e[1]]);
    if (s < 0) q.reverse();
    const k = flat ? 1 : n[1] > 0.5 ? 1 : n[1] < -0.5 ? 0.55 : 0.86, o = M.p.length / 3;
    for (const p of q) { M.p.push(p[0], p[1], p[2]); M.n.push(n[0], n[1], n[2]); M.c.push(col[0] * k, col[1] * k, col[2] * k); }
    M.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
}
const l2AX = [1, 0, 0], l2AY = [0, 1, 0], l2AZ = [0, 0, 1];
function l2Box(M, c, h, col, flat) { l2OBox(M, c, h, l2AX, l2AY, l2AZ, col, flat); }
// assi ruotati: prima attorno a z (rz), poi attorno a y (ry)
function l2Axes(rz, ry) {
  const cz = Math.cos(rz), sz = Math.sin(rz), cy = Math.cos(ry), sy = Math.sin(ry);
  const rot = (v) => [v[0] * cy + v[2] * sy, v[1], -v[0] * sy + v[2] * cy];
  return [rot([cz, sz, 0]), rot([-sz, cz, 0]), rot([0, 0, 1])];
}
// cilindro (o cono) tra due punti
function l2Cyl(M, a, b, r0, r1, seg, col, caps) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1e-4, ax = [d[0] / L, d[1] / L, d[2] / L];
  const ref = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let u = [ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]]; const ul = Math.hypot(u[0], u[1], u[2]) || 1; u = [u[0] / ul, u[1] / ul, u[2] / ul];
  const v = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]], o = M.p.length / 3;
  for (let ring = 0; ring < 2; ring++) {
    const ce = ring ? b : a, r = ring ? r1 : r0;
    for (let j = 0; j <= seg; j++) {
      const an = j / seg * 6.2832, cs = Math.cos(an), sn = Math.sin(an), n = [u[0] * cs + v[0] * sn, u[1] * cs + v[1] * sn, u[2] * cs + v[2] * sn];
      M.p.push(ce[0] + n[0] * r, ce[1] + n[1] * r, ce[2] + n[2] * r); M.n.push(n[0], n[1], n[2]); M.c.push(col[0], col[1], col[2]);
    }
  }
  for (let j = 0; j < seg; j++) { const a0 = o + j, b0 = a0 + 1, c0 = a0 + seg + 1, d0 = c0 + 1; M.i.push(a0, b0, d0, a0, d0, c0); }
  if (caps !== false) for (let ring = 0; ring < 2; ring++) {
    const ce = ring ? b : a, r = ring ? r1 : r0, o2 = M.p.length / 3, s = ring ? 1 : -1;
    M.p.push(ce[0], ce[1], ce[2]); M.n.push(ax[0] * s, ax[1] * s, ax[2] * s); M.c.push(col[0], col[1], col[2]);
    for (let j = 0; j <= seg; j++) { const an = j / seg * 6.2832, cs = Math.cos(an), sn = Math.sin(an); M.p.push(ce[0] + (u[0] * cs + v[0] * sn) * r, ce[1] + (u[1] * cs + v[1] * sn) * r, ce[2] + (u[2] * cs + v[2] * sn) * r); M.n.push(ax[0] * s, ax[1] * s, ax[2] * s); M.c.push(col[0], col[1], col[2]); }
    for (let j = 0; j < seg; j++) { if (ring) M.i.push(o2, o2 + 1 + j, o2 + 2 + j); else M.i.push(o2, o2 + 2 + j, o2 + 1 + j); }
  }
}
function l2Ell(M, c, r, col, seg) {   // ellissoide (lampadine, borse, sacche)
  seg = seg || 8; const o = M.p.length / 3, rows = seg >> 1;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= seg; j++) {
    const ph = i / rows * Math.PI, th = j / seg * 6.2832, x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th);
    const n = [x / r[0], y / r[1], z / r[2]], nl = Math.hypot(n[0], n[1], n[2]) || 1;
    M.p.push(c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]); M.n.push(n[0] / nl, n[1] / nl, n[2] / nl); M.c.push(col[0], col[1], col[2]);
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) { const a = o + i * (seg + 1) + j, b = a + 1, c2 = a + seg + 1, d = c2 + 1; M.i.push(a, b, c2, b, d, c2); }
}
// pezzi nel riferimento di una faccia di muro
function l2FBox(M, F, a, b, c, ha, hb, hc, col, flat) { l2OBox(M, l2P(F, a, b, c), [ha, hb, hc], [F.tx, 0, F.tz], l2AY, [F.nx, 0, F.nz], col, flat); }
function l2FTilt(M, F, a, b, c, ha, hb, hc, ang, col) {   // tavola inclinata nel piano muro (a, b)
  const cs = Math.cos(ang), sn = Math.sin(ang);
  l2OBox(M, l2P(F, a, b, c), [ha, hb, hc], [F.tx * cs, sn, F.tz * cs], [-F.tx * sn, cs, -F.tz * sn], [F.nx, 0, F.nz], col);
}
function l2FCyl(M, F, A, B, r0, r1, col, seg, caps) { l2Cyl(M, l2P(F, A[0], A[1], A[2]), l2P(F, B[0], B[1], B[2]), r0, r1, seg || 8, col, caps); }
function l2Mesh(M, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(M.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(M.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(M.c, 3)); g.setIndex(M.i);
  return new THREE.Mesh(g, mat);
}

// ---------------- stanze: tema, muri, pavimenti e soffitti ----------------
// wall: [famiglia, peso]; fl: pavimento (0 piastrelle, 1 scacchiera, 2 cemento, 3 moquette); ce: soffitto (0 pannelli, 1 intonaco)
const L2_TH = [
  { wall: [['plaster', 80], ['brick', 12], ['tile', 8]], fl: 3, ce: 0 },   // 0 ufficio
  { wall: [['plaster', 76], ['brick', 14], ['tile', 10]], fl: 1, ce: 0 },  // 1 corsia
  { wall: [['tile', 86], ['plaster', 14]], fl: 0, ce: 1 },                 // 2 bagno
  { wall: [['brick', 58], ['plaster', 42]], fl: 2, ce: 1 },                // 3 rovina
  { wall: [['plaster', 46], ['brick', 24], ['metal', 30]], fl: 2, ce: 1 }, // 4 magazzino
  { wall: [['plaster', 90], ['tile', 10]], fl: 0, ce: 0 }                  // 5 atrio
];
function l2Level() {
  const roomAt = new Int16Array(N * N).fill(-1);
  rooms.forEach((r, k) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) roomAt[y * N + x] = k; });
  const theme = rooms.map((r, k) => (hwHash(k, 29, 3) * 6) | 0);
  return { roomAt, theme, roomOf(x, y) { for (const d of L2D) { const nx = x + d[0], ny = y + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && map[ny * N + nx] === 0) { const r = roomAt[ny * N + nx]; if (r >= 0) return r; } } return -1; } };
}
function l2WallFor(lv, t, x, y) {
  if (t === 2) return l2WallMat('metal', (hwHash(x, y, 7) * 2) | 0);
  const rid = lv.roomOf(x, y), th = rid >= 0 ? L2_TH[lv.theme[rid]] : null;
  const fam = th ? hwPickW(th.wall, hwHash(x >> 1, y >> 1, 3)) : (hwHash(x >> 2, y >> 2, 4) < 0.08 ? 'brick' : 'plaster');
  const nv = fam === 'plaster' ? 4 : fam === 'tile' ? 3 : 2;
  return l2WallMat(fam, (hwHash(x, y, 9) * nv) | 0);
}
function l2Flick(seed) {   // sfarfallio delle lampade a tubo: ogni tanto si spengono per un attimo
  const t = tNow * 7 + seed * 13.1, k = Math.floor(t), f = t - k, h = hwHash(k, seed | 0, 5);
  return h < 0.05 ? (f < 0.5 ? 0.12 : 0.55) : h < 0.09 ? 0.72 + 0.28 * Math.sin(t * 40) : 1;
}
function l2Halo(col, sc, op) {   // alone luminoso di una lampada
  if (typeof SH === 'undefined' || !SH.haloW) return null;
  const tx = T3.haloTex || (T3.haloTex = new THREE.CanvasTexture(SH.haloW));
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: op }));
  sp.scale.set(sc, sc, 1); return sp;
}

// ---------------- lampade appese: a tubo (v 0) e a cupola (v 1); ognuna ha la sua lampadina per poter sfarfallare ----------------
function t3Chand2(c) {
  const g = new THREE.Group(), R = hwRng((c.x * 7919 + c.y * 104729) | 0), M = l2M(), iron = l2K(58, 58, 62);
  const geo = T3.l2g || (T3.l2g = {});
  let bulb;
  if (c.v === 0) {   // tubo fluorescente sospeso a due catenelle, a volte storto
    const dx = 0.2 + R() * 0.03, drop = [0.06 + R() * 0.03, 0.06 + R() * 0.12];
    for (const s of [-1, 1]) l2Cyl(M, [s * dx, 1, 0], [s * dx, 1 - (s < 0 ? drop[0] : drop[1]), 0], 0.004, 0.004, 4, iron, false);
    const tilt = (drop[1] - drop[0]) / (2 * dx);
    const gm = new THREE.Group(); gm.rotation.z = -Math.atan(tilt); gm.position.y = 1 - (drop[0] + drop[1]) / 2;
    const HM = l2M(); l2Box(HM, [0, 0, 0], [0.24, 0.011, 0.045], l2K(86, 86, 90)); l2Box(HM, [0.24, 0, 0], [0.01, 0.014, 0.05], iron); l2Box(HM, [-0.24, 0, 0], [0.01, 0.014, 0.05], iron);
    gm.add(l2Mesh(HM, T3.l2m.lit));
    bulb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.012, 0.03), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, fog: false })); bulb.position.y = -0.012; gm.add(bulb);
    const halo = l2Halo(0xbfe0ff, 0.9, 0.42); if (halo) { halo.position.y = -0.05; gm.add(halo); g.userData.halo = halo; }
    g.add(gm); g.rotation.y = R() < 0.5 ? 0 : Math.PI / 2;
  } else {   // lampadina a cupola, con un filo che pende
    l2Cyl(M, [0, 1, 0], [0, 0.9, 0], 0.004, 0.004, 4, iron, false);
    const sh = geo.shade || (geo.shade = new THREE.CylinderGeometry(0.03, 0.12, 0.07, 14, 1, true));
    const sm = geo.shadeM || (geo.shadeM = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }));
    const s = new THREE.Mesh(sh, sm); s.position.y = 0.9 - 0.035; g.add(s);
    bulb = new THREE.Mesh(geo.bulb || (geo.bulb = new THREE.SphereGeometry(0.033, 10, 8)), new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false })); bulb.position.y = 0.86; g.add(bulb);
    const halo = l2Halo(0xffd890, 0.75, 0.45); if (halo) { halo.position.y = 0.84; g.add(halo); g.userData.halo = halo; }
  }
  g.add(l2Mesh(M, T3.l2m.lit)); g.userData.bulb = bulb; g.userData.bc = bulb.material.color.clone(); g.userData.hop = g.userData.halo ? g.userData.halo.material.opacity : 0; g.userData.fz = c.fz;
  g.position.set(c.x, 0, c.y);
  return g;
}

// ---------------- elementi che sporgono dal muro ----------------
function l2Door(M, G, F, R) {
  const cols = [l2K(88, 72, 54), l2K(70, 82, 76), l2K(98, 94, 88), l2K(66, 52, 42)], col = cols[(R() * cols.length) | 0], dk = col.map(q => q * 0.8), fr = l2K(54, 46, 40);
  const ajar = R() < 0.3;
  l2FBox(M, F, 0, 0.375, 0.01, 0.2, 0.375, 0.01, fr);
  if (ajar) {   // varco scuro e anta socchiusa
    l2FBox(M, F, 0, 0.36, 0.021, 0.17, 0.355, 0.004, l2K(6, 5, 5), true);
    const th = 0.5 + R() * 0.45, hinge = R() < 0.5 ? -1 : 1, da = -hinge * Math.cos(th), dc = Math.sin(th);
    const cw = l2P(F, hinge * 0.17 + 0.17 * da, 0.36, 0.024 + 0.17 * dc), ex = [da * F.tx + dc * F.nx, 0, da * F.tz + dc * F.nz];
    l2OBox(M, cw, [0.17, 0.355, 0.011], ex, l2AY, [-ex[2], 0, ex[0]], col);
  } else {
    l2FBox(M, F, 0, 0.36, 0.024, 0.17, 0.355, 0.012, col);
    l2FBox(M, F, 0, 0.55, 0.037, 0.12, 0.12, 0.004, dk); l2FBox(M, F, 0, 0.2, 0.037, 0.12, 0.14, 0.004, dk);
    l2FBox(M, F, 0.125, 0.36, 0.042, 0.012, 0.012, 0.014, l2K(176, 170, 158)); l2FBox(M, F, 0, 0.67, 0.038, 0.032, 0.014, 0.003, l2K(206, 202, 188));
  }
  if (R() < 0.25) { l2FBox(G, F, 0, 0.8, 0.02, 0.07, 0.025, 0.01, l2K(40, 230, 110)); l2FBox(M, F, 0, 0.8, 0.012, 0.085, 0.034, 0.008, l2K(30, 30, 32)); }   // uscita di sicurezza sopra la porta
}
function l2Extinguisher(M, F, R) {
  l2FBox(M, F, 0, 0.62, 0.008, 0.045, 0.045, 0.006, l2K(150, 30, 26));   // cartello
  l2FCyl(M, F, [0, 0.2, 0.05], [0, 0.46, 0.05], 0.032, 0.032, l2K(170, 28, 24), 10);
  l2FCyl(M, F, [0, 0.46, 0.05], [0, 0.5, 0.05], 0.015, 0.015, l2K(30, 30, 32), 8); l2FBox(M, F, 0, 0.44, 0.012, 0.016, 0.03, 0.008, l2K(60, 60, 64));
  l2FBox(M, F, 0, 0.36, 0.034, 0.04, 0.008, 0.026, l2K(50, 50, 54));
}
function l2Board(M, F, R) {
  l2FBox(M, F, 0, 0.5, 0.01, 0.12, 0.085, 0.01, l2K(70, 52, 34)); l2FBox(M, F, 0, 0.5, 0.016, 0.105, 0.07, 0.006, l2K(150, 116, 74));
  for (let i = 0; i < 4; i++) { const a = (R() - 0.5) * 0.15, b = 0.5 + (R() - 0.5) * 0.08, c = R() < 0.5 ? l2K(214, 210, 196) : l2K(214, 200, 130); l2FTilt(M, F, a, b, 0.024 + i * 0.0015, 0.025 + R() * 0.012, 0.03 + R() * 0.01, 0.0015, (R() - 0.5) * 0.4, c); }
}
function l2Window(M, F, R) {   // finestra sbarrata da assi inchiodate
  l2FBox(M, F, 0, 0.58, 0.006, 0.17, 0.21, 0.004, l2K(4, 5, 7), true);
  l2FBox(M, F, 0, 0.8, 0.014, 0.19, 0.012, 0.012, l2K(64, 52, 40)); l2FBox(M, F, 0, 0.36, 0.014, 0.19, 0.012, 0.012, l2K(64, 52, 40));
  l2FBox(M, F, -0.18, 0.58, 0.014, 0.012, 0.23, 0.012, l2K(64, 52, 40)); l2FBox(M, F, 0.18, 0.58, 0.014, 0.012, 0.23, 0.012, l2K(64, 52, 40));
  for (let i = 0; i < 3; i++) l2FTilt(M, F, (R() - 0.5) * 0.06, 0.42 + i * 0.12 + (R() - 0.5) * 0.04, 0.03 + i * 0.004, 0.22, 0.02, 0.007, (R() - 0.5) * 0.5, l2K(116 + R() * 24, 90 + R() * 16, 62 + R() * 12));
}
function l2FuseBox(M, F, R) {
  l2FBox(M, F, 0, 0.55, 0.018, 0.075, 0.095, 0.018, l2K(110, 114, 112)); l2FBox(M, F, 0, 0.55, 0.038, 0.065, 0.085, 0.003, l2K(94, 98, 96));
  l2FBox(M, F, 0.045, 0.55, 0.043, 0.008, 0.02, 0.006, l2K(30, 30, 32)); l2FBox(M, F, 0, 0.62, 0.043, 0.03, 0.02, 0.002, l2K(220, 180, 30));
}
function l2Clock(M, F, R) {
  l2FCyl(M, F, [0, 0.86, 0.006], [0, 0.86, 0.014], 0.062, 0.062, l2K(30, 30, 32), 14); l2FCyl(M, F, [0, 0.86, 0.014], [0, 0.86, 0.018], 0.054, 0.054, l2K(214, 210, 194), 14);
  const a = R() * 6.28; l2FTilt(M, F, Math.cos(a) * 0.014, 0.86 + Math.sin(a) * 0.014, 0.02, 0.018, 0.0025, 0.001, a, l2K(20, 20, 20)); l2FTilt(M, F, 0.012, 0.866, 0.021, 0.025, 0.002, 0.001, 1.9, l2K(20, 20, 20));
}
function l2Vent(M, F, R) {
  l2FBox(M, F, 0, 0.9, 0.01, 0.1, 0.055, 0.01, l2K(120, 122, 120));
  for (let i = 0; i < 5; i++) l2FBox(M, F, 0, 0.9 - 0.036 + i * 0.018, 0.022, 0.085, 0.004, 0.006, l2K(24, 24, 26));
}
function l2Pipes(M, F, R, hi) {   // tubi lungo la parete, con staffe e un gomito verso il soffitto
  const y = hi ? 0.86 : 0.78, rr = 0.016 + R() * 0.008, col = R() < 0.5 ? l2K(110, 112, 114) : l2K(120, 84, 56);
  l2FCyl(M, F, [-0.5, y, 0.03], [0.5, y, 0.03], rr, rr, col, 8, false);
  for (const a of [-0.3, 0.3]) l2FBox(M, F, a, y, 0.016, 0.01, rr + 0.008, 0.01, l2K(50, 50, 54));
  if (R() < 0.5) l2FCyl(M, F, [0.1 + R() * 0.3, y, 0.03], [0.1 + R() * 0.3, 1, 0.03], 0.012, 0.012, col, 6, false);
  if (R() < 0.3) { l2FCyl(M, F, [-0.5, y - 0.07, 0.03], [0.5, y - 0.07, 0.03], 0.009, 0.009, l2K(20, 20, 22), 6, false); }
}
function l2Sconce(M, G, F, R) {   // lampada a gabbia (muri di tipo 3): ritorna dove sta la lampadina
  const b = 0.62;
  l2FBox(M, F, 0, b, 0.008, 0.035, 0.06, 0.008, l2K(46, 46, 50)); l2FCyl(M, F, [0, b, 0.014], [0, b + 0.02, 0.085], 0.009, 0.009, l2K(46, 46, 50), 6);
  l2Ell(G, l2P(F, 0, b + 0.035, 0.105), [0.03, 0.036, 0.03], l2K(255, 236, 170), 8);
  l2FCyl(M, F, [0, b + 0.012, 0.105], [0, b + 0.012 + 0.002, 0.105], 0.042, 0.042, l2K(46, 46, 50), 10, false);
  for (let i = 0; i < 6; i++) { const an = i / 6 * 6.28, ca = Math.cos(an) * 0.042, cc = Math.sin(an) * 0.042; l2FCyl(M, F, [ca, b + 0.008, 0.105 + cc], [ca * 0.8, b + 0.08, 0.105 + cc * 0.8], 0.0035, 0.0035, l2K(40, 40, 44), 4, false); }
  l2FCyl(M, F, [0, b + 0.082, 0.105], [0, b + 0.086, 0.105], 0.034, 0.034, l2K(46, 46, 50), 8);
  return [0, b + 0.04, 0.13];
}
function l2Shelf(M, F, R) {   // scaffale a muro (muri di tipo 4): assi, fianchi e roba sopra
  const W = 0.3, D = 0.075, wood = l2K(104, 82, 58), dk = l2K(60, 46, 32);
  l2FBox(M, F, 0, 0.48, 0.008, W + 0.02, 0.38, 0.008, dk, true);
  for (const s of [-1, 1]) l2FBox(M, F, s * W, 0.48, D, 0.012, 0.38, D, wood);
  for (const b of [0.12, 0.32, 0.52, 0.72, 0.86]) {
    l2FBox(M, F, 0, b, D, W, 0.009, D, wood);
    if (b > 0.8) continue;
    let x = -W + 0.04;
    while (x < W - 0.05) {
      const w = 0.02 + R() * 0.045, h = 0.03 + R() * 0.07, k = R();
      const col = k < 0.3 ? l2K(150 + R() * 40, 124 + R() * 30, 84) : k < 0.5 ? l2K(70 + R() * 30, 90 + R() * 30, 100) : k < 0.7 ? l2K(150, 50 + R() * 20, 40) : l2K(196, 190, 170);
      if (R() < 0.12) { x += w * 2; continue; }   // posto vuoto
      if (R() < 0.15) l2FTilt(M, F, x + w, b + 0.009 + h * 0.5, D, w, h * 0.5, 0.03, 0.9 + R() * 0.4, col); else l2FBox(M, F, x + w, b + 0.009 + h, D, w, h, 0.035 + R() * 0.015, col);
      x += w * 2 + 0.01;
    }
  }
}
function l2Sign(G, F, y) { l2FBox(G, F, 0, y, 0.022, 0.085, 0.03, 0.006, l2K(40, 230, 110)); }   // uscita di sicurezza (luminosa)

// ---------------- costruzione ----------------
function l2Dec(root, lv) {
  const chunks = new Map(), occ = new Uint8Array(N * N * 4), marks = [], tIdx = new Map(), sconces = [];
  const ch = (x, y) => { const k = (x >> 4) + ',' + (y >> 4); let m = chunks.get(k); if (!m) chunks.set(k, m = { lit: l2M(), glow: l2M() }); return m; };
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < N && y < N && map[y * N + x] === 0;
  for (const q of torches) tIdx.set((q.y | 0) * N + (q.x | 0), q);
  const stairsCell = stairs ? (stairs.y | 0) * N + (stairs.x | 0) : -1;
  const MK = [['claws', 40], ['stain', 34], ['print', 26]];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x, t = map[i]; if (t === 0) continue;
    const C = ch(x, y);
    if (t === 5) {   // porta delle scale: telaio e uscita di sicurezza dalla parte della stanza
      for (let d = 0; d < 4; d++) {
        const nx = x + L2D[d][0], ny = y + L2D[d][1]; if (!isOpen(nx, ny) || ny * N + nx === stairsCell) continue;
        const F = l2Frame(x, y, d); occ[i * 4 + d] = 1;
        for (const s of [-1, 1]) l2FBox(C.lit, F, s * 0.47, 0.5, 0.02, 0.04, 0.5, 0.025, l2K(40, 42, 46));
        l2FBox(C.lit, F, 0, 0.93, 0.02, 0.5, 0.07, 0.025, l2K(40, 42, 46)); l2Sign(C.glow, F, 0.8);
      }
      continue;
    }
    if (t === 3) {   // lampada a gabbia: scelgo la faccia che guarda la zona piu aperta
      const q = tIdx.get(i); let bd = -1, bs = -1;
      for (let d = 0; d < 4; d++) { const nx = x + L2D[d][0], ny = y + L2D[d][1]; if (!isOpen(nx, ny)) continue; let s = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (isOpen(nx + a, ny + b)) s++; if (s > bs) { bs = s; bd = d; } }
      if (bd >= 0) {
        const F = l2Frame(x, y, bd), R = hwRng((x * 73856093 ^ y * 19349663) >>> 0), lp = l2Sconce(C.lit, C.glow, F, R), w = l2P(F, lp[0], lp[1], lp[2]);
        for (let d = 0; d < 4; d++) occ[i * 4 + d] = 1;
        if (q) { q.lx = w[0]; q.ly = w[1]; q.lz = w[2]; q.lc = new THREE.Color(1, 0.84, 0.5); if (hwHash(x, y, 12) < 0.35) q.fz = hwHash(x, y, 13) * 90; }
        sconces.push(w);
      }
    }
    const metal = t === 2;
    for (let d = 0; d < 4; d++) {
      const nx = x + L2D[d][0], ny = y + L2D[d][1]; if (!isOpen(nx, ny)) continue;
      const F = l2Frame(x, y, d), R = hwRng((x * 73856093 ^ y * 19349663 ^ d * 83492791) >>> 0);
      if (!metal) l2FBox(C.lit, F, 0, 0.022, 0.007, 0.5, 0.022, 0.007, l2K(44, 36, 30));   // battiscopa
      if (metal || occ[i * 4 + d]) continue;
      const r = hwHash(x, y, 20 + d);
      if (t === 4) { if (!occ[i * 4 + 0] && !occ[i * 4 + 1] && !occ[i * 4 + 2] && !occ[i * 4 + 3]) { l2Shelf(C.lit, F, R); for (let k = 0; k < 4; k++) occ[i * 4 + k] = 1; } continue; }
      let used = true;
      if (r < 0.07) l2Door(C.lit, C.glow, F, R);
      else if (r < 0.10) { l2FBox(C.lit, F, 0, 0.86, 0.012, 0.1, 0.034, 0.008, l2K(30, 30, 32)); l2Sign(C.glow, F, 0.86); }
      else if (r < 0.135) l2Extinguisher(C.lit, F, R);
      else if (r < 0.17) l2Board(C.lit, F, R);
      else if (r < 0.21) l2Window(C.lit, F, R);
      else if (r < 0.235) l2FuseBox(C.lit, F, R);
      else if (r < 0.255) l2Clock(C.lit, F, R);
      else if (r < 0.29) l2Vent(C.lit, F, R);
      else used = false;
      if (used) { occ[i * 4 + d] = 1; continue; }
      if (hwHash(x >> 2, y >> 2, 90 + d) < 0.2) l2Pipes(C.lit, F, R, hwHash(x >> 2, y >> 2, 95 + d) < 0.4);
      if (hwHash(x, y, 40 + d) < 0.055) {   // segni: artigli, macchie, mani di chi e passato prima
        const cat = hwPickW(MK, hwHash(x, y, 50 + d)), idx = (hwHash(x, y, 60 + d) * Math.min(3, HWD_V[cat].length)) | 0;
        try {
          const D = hwdGet(cat, idx);
          if (D.wu <= 0.96 && D.hu <= 0.9) { const a = (R() - 0.5) * 2 * Math.max(0, 0.5 - D.wu / 2 - 0.02), lo = D.hu / 2 + 0.02, hi = 1 - D.hu / 2 - 0.02; marks.push({ D, cat, idx, x, y, d, a, b: Math.max(lo, Math.min(hi, 0.5 + (R() - 0.5) * 0.3)), rot: cat === 'claws' ? 0 : (R() - 0.5) * 0.2 }); }
        } catch (err) { /* il segno manca e basta */ }
      }
    }
  }
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  for (const m of chunks.values()) {
    if (m.lit.i.length) root.add(l2Mesh(m.lit, T3.l2m.lit));
    if (m.glow.i.length) root.add(l2Mesh(m.glow, glow));
  }
  const byM = new Map(), m4 = new THREE.Matrix4(), vx = new THREE.Vector3(), vy = new THREE.Vector3(), vz = new THREE.Vector3(), plane = new THREE.PlaneGeometry(1, 1);
  for (const mk of marks) { const k = mk.cat + ':' + mk.idx; let q = byM.get(k); if (!q) byM.set(k, q = []); q.push(mk); }
  for (const arr of byM.values()) {   // un InstancedMesh per ogni disegno
    const D = arr[0].D, im = new THREE.InstancedMesh(plane, hwdMat(D), arr.length); im.frustumCulled = false; im.renderOrder = -5;
    arr.forEach((p, k) => {
      const F = l2Frame(p.x, p.y, p.d), c = Math.cos(p.rot), sn = Math.sin(p.rot);
      vx.set(F.tx * c * D.wu, sn * D.wu, F.tz * c * D.wu); vy.set(-F.tx * sn * D.hu, c * D.hu, -F.tz * sn * D.hu); vz.set(F.nx, 0, F.nz);
      m4.makeBasis(vx, vy, vz); m4.setPosition(F.ox + F.tx * p.a + F.nx * 0.006, p.b, F.oz + F.tz * p.a + F.nz * 0.006); im.setMatrixAt(k, m4);
    });
    root.add(im);
  }
  for (const w of sconces) { const h = l2Halo(0xffd890, 0.5, 0.4); if (h) { h.position.set(w[0], w[1], w[2]); root.add(h); } }
}

// il pavimento e il soffitto: cartacce, pezzi di intonaco, cavi, pannelli caduti, pozzanghere
function l2Clutter(root, lv) {
  const M = l2M(), W = l2M(), wet = l2M();
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x; if (map[i] !== 0) continue;
    const R = hwRng((x * 668265263 ^ y * 374761393 ^ 0x2545F491) >>> 0), cx = x + 0.15 + R() * 0.7, cz = y + 0.15 + R() * 0.7;
    if (hwHash(x, y, 70) < 0.17) {   // cartacce e calcinacci
      const n = 1 + ((R() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const px = x + 0.1 + R() * 0.8, pz = y + 0.1 + R() * 0.8, ax = l2Axes(0, R() * 6.28), paper = R() < 0.55;
        if (paper) l2OBox(M, [px, 0.002, pz], [0.03 + R() * 0.02, 0.0015, 0.04 + R() * 0.02], ax[0], ax[1], ax[2], R() < 0.7 ? l2K(206, 202, 186) : l2K(210, 196, 130), true);
        else { const s = 0.012 + R() * 0.03, ax2 = l2Axes((R() - 0.5) * 0.8, R() * 6.28); l2OBox(M, [px, s * 0.5, pz], [s, s * 0.6, s * 0.8], ax2[0], ax2[1], ax2[2], R() < 0.5 ? l2K(150, 144, 130) : l2K(120, 70, 54)); }
      }
    }
    if (hwHash(x, y, 71) < 0.04) {   // pozzanghera
      const rr = 0.08 + R() * 0.12; l2Cyl(wet, [cx, 0.003, cz], [cx, 0.004, cz], rr * (0.8 + R() * 0.4), rr, 14, l2K(26, 32, 34), true);
    }
    if (hwHash(x, y, 72) < 0.028) {   // pannello del controsoffitto caduto o penzolante
      const lying = R() < 0.5, an = lying ? l2Axes((R() - 0.5) * 0.1, R() * 6.28) : l2Axes((0.35 + R() * 0.4) * (R() < 0.5 ? 1 : -1), R() * 6.28), px = x + 0.3 + R() * 0.4, pz = y + 0.3 + R() * 0.4;
      l2OBox(M, [px, lying ? 0.012 : 0.86, pz], [0.19, 0.008, 0.19], an[0], an[1], an[2], l2K(196, 190, 170));
    }
    if (hwHash(x, y, 73) < 0.035) {   // cavo che pende dal soffitto
      const px = x + 0.2 + R() * 0.6, pz = y + 0.2 + R() * 0.6, L = 0.18 + R() * 0.4, sw = (R() - 0.5) * 0.12;
      l2Cyl(M, [px, 1, pz], [px + sw * 0.5, 1 - L * 0.55, pz], 0.0045, 0.0045, 4, l2K(20, 20, 22), false); l2Cyl(M, [px + sw * 0.5, 1 - L * 0.55, pz], [px + sw, 1 - L, pz + sw * 0.4], 0.0045, 0.0045, 4, l2K(20, 20, 22), false);
      if (R() < 0.5) l2Ell(W, [px + sw, 1 - L - 0.008, pz + sw * 0.4], [0.008, 0.012, 0.008], l2K(255, 190, 60), 6);   // filo scoperto
    }
  }
  if (M.i.length) root.add(l2Mesh(M, T3.l2m.lit));
  if (W.i.length) root.add(l2Mesh(W, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
  if (wet.i.length) { const wm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); root.add(l2Mesh(wet, wm)); }
}

function t3Build2() {
  const sc = T3.scene;
  if (T3.root) sc.remove(T3.root);
  const root = T3.root = new THREE.Group(); sc.add(root);
  for (const m of [T3.mobs, T3.prj, T3.eprj, T3.pick, T3.prop, T3.bars, T3.deb]) m.clear();
  T3.shards.length = T3.puffs.length = T3.rubs.length = 0; T3.chd = []; T3.torchMats = []; L2.bub = null;
  const fog = new THREE.Color(fogC[0] / 255, fogC[1] / 255, fogC[2] / 255).multiplyScalar(0.55);
  sc.fog = new THREE.FogExp2(fog, L2CFG.fog); T3.gl.setClearColor(fog);
  T3.l2m = T3.l2m || { lit: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.15 }) };
  const lv = l2Level(), sb = t3Box(1, 3, 1), m4 = new THREE.Matrix4();
  // pavimenti e soffitti: un blocco per cella, raggruppati per materiale
  const fl = new Map(), ce = new Map();
  for (let i = 0; i < N * N; i++) {
    if (map[i] !== 0) continue;
    const r = lv.roomAt[i], th = r >= 0 ? L2_TH[lv.theme[r]] : null, x = i % N, y = (i / N) | 0;
    const fk = th ? th.fl : (hwHash(x >> 2, y >> 2, 8) < 0.15 ? 2 : 0), ck = th ? th.ce : (hwHash(x >> 2, y >> 2, 9) < 0.2 ? 1 : 0);
    (fl.get(fk) || fl.set(fk, []).get(fk)).push(i); (ce.get(ck) || ce.set(ck, []).get(ck)).push(i);
  }
  const slab = (mat, cells, yy) => { const im = new THREE.InstancedMesh(sb, mat, cells.length); cells.forEach((c, k) => { m4.setPosition((c % N) + 0.5, yy, ((c / N) | 0) + 0.5); im.setMatrixAt(k, m4); }); root.add(im); };
  for (const [k, cells] of fl) slab(l2FloorMat(k), cells, -1.5);
  for (const [k, cells] of ce) slab(l2CeilMat(k), cells, 1.5);
  // muri: solo quelli che toccano uno spazio libero
  const open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && map[y * N + x] === 0;
  T3.wbox = T3.wbox || (() => { const g = t3Box(1, 6, 1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 6); return g; })();   // muro alto 6, texture ripetuta ogni unita
  const grp = new Map(), doors = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = map[y * N + x]; if (t === 0 || !(open(x + 1, y) || open(x - 1, y) || open(x, y + 1) || open(x, y - 1))) continue;
    if (t === 5) { doors.push(x, y); continue; }
    const mat = l2WallFor(lv, t, x, y); let l = grp.get(mat); if (!l) grp.set(mat, l = []); l.push(x, y);
  }
  for (const [mat, list] of grp) { const im = new THREE.InstancedMesh(T3.wbox, mat, list.length / 2); for (let i = 0; i < list.length; i += 2) { m4.setPosition(list[i] + 0.5, 1, list[i + 1] + 0.5); im.setMatrixAt(i / 2, m4); } root.add(im); }
  if (doors.length && wallTex[5]) {   // la porta delle scale: la stessa del motore 2D (si apre con le tre chiavi)
    const dm = new THREE.MeshStandardMaterial({ map: t3Tex(wallTex[5]), roughness: 1 }); T3.doorTex = dm.map;
    const im = new THREE.InstancedMesh(T3.wbox, dm, doors.length / 2); for (let i = 0; i < doors.length; i += 2) { m4.setPosition(doors[i] + 0.5, 1, doors[i + 1] + 0.5); im.setMatrixAt(i / 2, m4); } root.add(im);
  }
  try { l2Dec(root, lv); } catch (err) { console.error('Decorazioni murali del piano 2 non disponibili:', err); }
  try { l2Clutter(root, lv); } catch (err) { console.error('Dettagli del piano 2 non disponibili:', err); }
  // le lampade appese: la luce sta sotto la lampada; i tubi sfarfallano, le cupole no
  const cI = new Map(); for (const q of torches) if (q.k === 1.3) cI.set((q.y | 0) * N + (q.x | 0), q);
  for (const c of chands) {
    const q = cI.get((c.y | 0) * N + (c.x | 0)); if (!q) continue;
    q.lx = c.x; q.ly = c.v === 0 ? 0.88 : 0.83; q.lz = c.y; q.lc = c.v === 0 ? new THREE.Color(0.82, 0.92, 1) : new THREE.Color(1, 0.86, 0.54);
    if (c.v === 0) c.fz = hwHash(c.x * 7 | 0, c.y * 7 | 0, 14) * 90 + 1;
    q.fz = c.fz;
  }
  // scale: otto gradini veri che salgono verso il portale
  if (stairs) {
    const g = new THREE.Group(), y0 = stairs.y - 0.5;
    for (let i = 0; i < STAIR_STEPS; i++) { const h = 0.05 * (STAIR_STEPS - i) + 0.04, s = new THREE.Mesh(t3Box(0.8, h, 0.1), t3Mat(i % 2 ? '#6a6a70' : '#85858c')); s.position.set(stairs.x, h / 2, y0 + 0.8 - i * 0.085); g.add(s); }
    const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshBasicMaterial({ map: t3Tex(stairPortal), transparent: true, fog: false }));
    pt.position.set(stairs.x, 0.5, y0 + 0.1); g.add(pt); root.add(g);
  }
}

/* ======================================================================
   CASTEDDISH - Piano 2: il ghoul in 3D
   Cadavere scheletrico e curvo, pelle grigio-verde marcescente con vene, ematomi e piaghe, costole e vertebre che spingono
   sotto la pelle, abiti a brandelli, bocca cadente con denti storti e lingua penzoloni, occhi giallo-verdi che si vedono
   nel buio. Ha lo stesso scheletro del demone (bacino, torace, collo, testa, braccia, gambe), quindi cammino, giravolte,
   attacco, colpo subito e morte sono le animazioni di t3Anim (world-3d.js). Le 8 varianti (VARS.ghoul) cambiano arma,
   corporatura, braccia, gobba e colori. I ghoul non sanguinano: perdono bile (vedi la sezione E).
   ====================================================================== */
// texture della pelle: grigio-verde con chiazze scure, ematomi viola, zone itteriche, vene, rughe, piaghe che brillano appena
function l2GhoulTex() {
  if (T3.gSkin) return T3.gSkin;
  const S = 256, R = hwRng(4747), mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const ca = mk(), cb = mk(), cg = mk(), g = ca.getContext('2d'), h = cb.getContext('2d'), q = cg.getContext('2d');
  const f1 = hwFbm(R, S, 3), f2 = hwFbm(R, S, 6), f3 = hwFbm(R, S, 10), im = g.createImageData(S, S), hm = h.createImageData(S, S), d = im.data, e = hm.data;
  const c = [0, 0, 0];
  for (let i = 0; i < S * S; i++) {
    const k = i * 4, gr = R() - 0.5;
    c[0] = 128 + gr * 14; c[1] = 138 + gr * 14; c[2] = 112 + gr * 12;
    l2Mx(c, 66, 78, 58, hwSs(0.5, 0.76, f1[i]) * 0.8); l2Mx(c, 112, 84, 116, hwSs(0.64, 0.82, f2[i]) * 0.55); l2Mx(c, 164, 160, 92, hwSs(0.68, 0.86, f3[i]) * 0.35);
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    const hv = 128 + (f3[i] - 0.5) * 70 + gr * 26; e[k] = e[k + 1] = e[k + 2] = hv; e[k + 3] = 255;
  }
  g.putImageData(im, 0, 0); h.putImageData(hm, 0, 0);
  q.fillStyle = '#000'; q.fillRect(0, 0, S, S);
  const wrap = (cs, x, y, r, f) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox + r < 0 || x + ox - r > S || y + oy + r < 0 || y + oy - r > S) continue; for (const c of cs) { c.save(); c.translate(ox, oy); } f(); for (const c of cs) c.restore(); } };
  g.lineCap = h.lineCap = 'round';
  for (let i = 0; i < 34; i++) {   // rughe e pieghe
    const x = R() * S, y = R() * S, L = 10 + R() * 30, a = (R() - 0.5) * 1.2;
    wrap([g, h], x, y, 44, () => { g.strokeStyle = 'rgba(24,30,20,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); h.strokeStyle = 'rgba(0,0,0,0.5)'; h.lineWidth = 1.6; h.beginPath(); h.moveTo(x, y); h.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); h.stroke(); });
  }
  for (let i = 0; i < 18; i++) {   // vene scure verde-blu
    const x = R() * S, y = R() * S, pts = [[x, y]]; let px = x, py = y, a = R() * 6.28;
    for (let k = 0; k < 7; k++) { a += (R() - 0.5) * 1.3; px += Math.cos(a) * (12 + R() * 12); py += Math.sin(a) * (12 + R() * 12); pts.push([px, py]); }
    const lw = 1.3 + R();
    wrap([g, h], x, y, 130, () => { g.strokeStyle = 'rgba(40,60,72,0.55)'; g.lineWidth = lw; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); h.strokeStyle = 'rgba(255,255,255,0.18)'; h.lineWidth = lw + 0.8; h.beginPath(); pts.forEach((p, k) => k ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1])); h.stroke(); });
  }
  for (let i = 0; i < 9; i++) {   // piaghe: carne umida e scura, con un'ombra di pus che brilla
    const x = R() * S, y = R() * S, rx = 8 + R() * 8, ry = 5 + R() * 5, a = R() * 3;
    wrap([g, h, q], x, y, 22, () => {
      g.save(); g.translate(x, y); g.rotate(a); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(70,40,30,0.9)'); gr.addColorStop(0.7, 'rgba(110,70,56,0.85)'); gr.addColorStop(1, 'rgba(150,140,90,0.35)'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill(); g.restore();
      h.save(); h.translate(x, y); h.rotate(a); h.fillStyle = 'rgba(0,0,0,0.5)'; h.beginPath(); h.ellipse(0, 0, rx * 0.8, ry * 0.8, 0, 0, 7); h.fill(); h.restore();
      q.save(); q.translate(x, y); q.rotate(a); const gq = q.createRadialGradient(0, 0, 0, 0, 0, rx * 0.8); gq.addColorStop(0, 'rgba(170,255,60,0.85)'); gq.addColorStop(1, 'rgba(170,255,60,0)'); q.fillStyle = gq; q.beginPath(); q.ellipse(0, 0, rx * 0.8, ry * 0.8, 0, 0, 7); q.fill(); q.restore();
    });
  }
  for (let i = 0; i < 1400; i++) { const x = R() * S, y = R() * S, dk = R() < 0.55; g.fillStyle = dk ? 'rgba(14,20,10,' + (0.1 + R() * 0.2) + ')' : 'rgba(190,200,140,' + (0.07 + R() * 0.1) + ')'; g.fillRect(x, y, 1 + R() * 1.5, 1 + R() * 1.5); }
  const tx = (c, w) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  return T3.gSkin = { c: tx(ca), b: tx(cb), g: tx(cg) };
}
function l2EyeGlow() {
  if (L2.eyeGlow) return L2.eyeGlow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.8)'); r.addColorStop(0.5, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = r; x.fillRect(0, 0, 64, 64); return L2.eyeGlow = new THREE.CanvasTexture(c);
}

// stoffa strappata: anello che si allarga con l'orlo a frange; alcuni pezzi mancano
function l2Rags(rt, rb, h, seg, rows, seed, hole, cx, cz) {
  const R = hwRng(seed), pos = [], uv = [], col = [], idx = [], W = seg + 1;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    for (let j = 0; j <= seg; j++) {
      const an = j / seg * 6.2832, k = rt + (rb - rt) * t, jag = i === rows ? 0.4 * h * Math.abs(Math.sin(j * 2.3 + seed)) * R() : 0;
      pos.push(Math.cos(an) * k * (cx || 1), -(t * h + jag), Math.sin(an) * k * (cz || 0.78)); uv.push(j / seg * 2, t * 2);
      const sh = 1 - 0.3 * t + (R() - 0.5) * 0.12; col.push(sh, sh, sh);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
    if (i > 0 && R() < hole * (0.4 + i / rows)) continue;
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// testa: cranio con orbite profonde, zigomi alti, guance scavate, naso rotto e un solco per la bocca; la parte bassa e scura (l'interno della bocca)
function t3GhoulSurf() {
  const F = [], add = (x, y, z, s, a, d, mir) => { F.push([x, y, z, s, a, d || 0]); if (mir) F.push([-x, y, z, s, a, d || 0]); };
  add(0.036, 0.018, 0.083, 0.026, -0.036, 0.85, 1);   // orbite
  add(0.043, 0.05, 0.085, 0.024, 0.014, 0, 1);        // arcate
  add(0.066, -0.012, 0.07, 0.028, 0.014, 0, 1);       // zigomi
  add(0.05, -0.056, 0.068, 0.03, -0.02, 0.4, 1);      // guance scavate
  add(0.078, 0.035, 0.01, 0.035, -0.012, 0.3, 1);     // tempie
  add(0, 0.0, 0.106, 0.016, 0.016, 0, 0);             // radice del naso
  add(0, -0.026, 0.113, 0.013, 0.013, 0, 0);          // punta del naso
  add(0.012, -0.034, 0.104, 0.007, -0.012, 0.9, 1);   // narici
  add(0, -0.066, 0.092, 0.03, -0.006, 0.8, 0);        // solco della bocca
  return (dx, dy, dz) => {
    const lo = Math.max(0, -dy), w = 0.082 * (1 - 0.3 * lo), h = 0.108, L = 0.098 * (1 - 0.18 * lo);
    const p0 = [w * dx, h * dy, L * dz], n = t3nm([dx / w, dy / h, dz / L]); let ao = 1; const p = p0.slice();
    for (const f of F) {
      const d2 = (p0[0] - f[0]) ** 2 + (p0[1] - f[1]) ** 2 + (p0[2] - f[2]) ** 2, gs = Math.exp(-d2 / (2 * f[3] * f[3]));
      if (gs < 0.003) continue; p[0] += n[0] * f[4] * gs; p[1] += n[1] * f[4] * gs; p[2] += n[2] * f[4] * gs; ao *= 1 - f[5] * gs;
    }
    if (p0[2] > 0.02) ao *= 1 - 0.75 * hwSs(-0.066, -0.08, p0[1]);   // dentro la bocca: buio
    return [p[0], p[1], p[2], ao];
  };
}

function t3GhoulGeos() {
  const G = {}, ball = t3Ball(), surf = t3GhoulSurf();
  const B = (r, p, sx, sy, sz) => ({ g: ball, p: p || [0, 0, 0], s: [r * (sx || 1), r * (sy || 1), r * (sz || 1)] });
  const BONE_B = [0.66, 0.5, 0.36], CLAW = [0.34, 0.28, 0.2];
  // --- bacino e torace magro, con costole e vertebre
  G.pelvis = t3Loft([[0, -0.15, 0, 0.04, 0.045, 0.8], [0, -0.11, 0, 0.085, 0.07], [0, -0.05, 0, 0.1, 0.078], [0, 0.02, 0, 0.085, 0.07], [0, 0.08, 0, 0.07, 0.06, 0.85]], 16, { n: 2.2 });
  const TT = [[-0.24, 0.085, 0.07, 0], [-0.16, 0.1, 0.075, 0], [-0.08, 0.115, 0.082, 0.005], [0, 0.14, 0.092, 0.012], [0.08, 0.165, 0.1, 0.018], [0.15, 0.18, 0.1, 0.018], [0.21, 0.17, 0.09, 0], [0.25, 0.12, 0.075, -0.005], [0.275, 0.05, 0.05, 0], [0.285, 0.02, 0.02, 0]];
  const tr = [];
  for (let i = 0; i < 52; i++) {
    const y = -0.24 + i / 51 * 0.525, v = t3Tab(TT, y), rib = y > -0.12 && y < 0.2 ? Math.cos((y + 0.12) / 0.05 * 6.2832) : 0;
    tr.push([0, y, 0, v[1] * (1 + 0.05 * rib), v[2] * (1 + 0.05 * rib), i && i < 51 ? 0.88 + 0.12 * rib : 0.8, 0, v[3]]);
  }
  G.torso = t3Loft(tr, 26, { n: 2.3, vT: 3 });
  const tb = [];
  [0.24, 0.2, 0.16, 0.12, 0.08, 0.04, 0, -0.04, -0.08, -0.12, -0.16].forEach((y, i) => { const v = t3Tab(TT, y); tb.push(B(0.015 - (i % 2) * 0.002, [0, y, v[3] - v[2] * 0.97], 1, 0.9, 0.9)); });   // vertebre
  for (const s of [-1, 1]) {
    [0.15, 0.1, 0.05, 0.0, -0.05, -0.1].forEach((y, k) => {   // costole che spingono sotto la pelle
      const v = t3Tab(TT, y), rg = [];
      for (let i = 0; i <= 8; i++) { const ph = 0.4 + i / 8 * 1.3, r = 0.009 * (1 - 0.45 * Math.pow(Math.abs(i - 4) / 4, 2)); rg.push([s * v[1] * 1.035 * Math.sin(ph), y - 0.014 * ph, v[3] + v[2] * 1.035 * Math.cos(ph), r, r * 0.8, 1, 0, 0, t3Mix([0.9, 0.84, 0.68], [0.55, 0.36, 0.26], 0.5 + 0.5 * Math.sin(k * 2 + i))]); }
      tb.push({ g: t3Loft(rg, 6, { vT: 2 }) });
    });
    tb.push({ g: t3Loft([[s * 0.025, 0.235, 0.07, 0.008, 0.008, 1], [s * 0.08, 0.245, 0.075, 0.009, 0.009], [s * 0.14, 0.235, 0.05, 0.008, 0.008, 1]], 6), t: [0.9, 0.85, 0.7] });   // clavicola
  }
  G.torsoBone = t3Merge(tb);
  G.neck = t3Merge([{ g: t3Loft([[0, -0.05, -0.005, 0.065, 0.06, 0.8], [0, 0, 0.01, 0.045, 0.043], [0, 0.05, 0.02, 0.04, 0.04], [0, 0.085, 0.03, 0.045, 0.045, 0.85]], 14) }].concat([-1, 1].map(s => ({ g: t3Loft(t3Path([s * 0.03, 0.08, 0.045], 4, 0.13, t => [s * (0.2 + 0.2 * t), -1, -0.1], t => [0.009 - 0.002 * t, 0.008]), 6) }))));
  // --- testa
  G.head = t3HeadGeo(surf);
  const tt = [];
  [[-0.046, 0.026, 0.14], [-0.03, 0.016, 0.08], [-0.012, 0.03, 0.12], [0.01, 0.014, 0.09], [0.028, 0.034, 0.18], [0.046, 0.02, 0.1]].forEach((q, i) => {   // denti superiori: pochi, storti, a volte rotti
    const x = q[0], z = 0.067 - Math.abs(x) * 0.5;
    tt.push({ g: t3Spike(q[1] * (i % 3 === 1 ? 0.7 : 1), 0.0075 + q[2] * 0.03, { cb: BONE_B, bend: -0.1 }), p: [x, -0.062, z], r: [Math.PI + 0.15 * Math.sin(i * 3.1), 0, 0.2 * Math.sin(i * 5.3)] });
  });
  G.teeth = t3Merge(tt);
  // mandibola (origine = cerniera): due rami che si uniscono nel mento, denti inferiori, lingua penzoloni, bava
  const ramus = (s) => t3Loft([[s * 0.062, 0, 0, 0.018, 0.017, 0.8], [s * 0.06, -0.004, 0.03, 0.019, 0.018], [s * 0.045, -0.008, 0.06, 0.016, 0.016], [s * 0.02, -0.01, 0.088, 0.013, 0.013], [s * 0.004, -0.008, 0.1, 0.011, 0.011, 0.8]], 8);
  G.jaw = t3Merge([{ g: ramus(1) }, { g: ramus(-1) }, B(0.014, [0, -0.008, 0.1])]);
  const jt = [];
  [[-0.04, 0.06], [-0.026, 0.083], [-0.012, 0.096], [0.012, 0.096], [0.028, 0.084], [0.042, 0.06], [-0.055, 0.03], [0.056, 0.028]].forEach((q, i) => jt.push({ g: t3Spike(0.014 + (i % 3) * 0.006, 0.0075, { cb: BONE_B, bend: 0.1 }), p: [q[0], 0.008, q[1]], r: [0.15 * Math.sin(i * 4.3), 0, 0.2 * Math.sin(i * 2.7)] }));
  G.jawTeeth = t3Merge(jt);
  const tg = t3Path([0, 0, -0.065], 8, 0.15, () => [0, 0, 1], t => [0.017 * (1 - 0.45 * t * t), 0.006]).map(r => { r[1] = 0.004 * Math.sin(r[2] * 30) - 0.004 * (r[2] + 0.065) * 4; return r; });
  G.tongue = t3Loft(tg, 8, { n: 2.4, vT: 2 });
  const dr = [];
  [[-0.03, 0.08, 0.09], [0.022, 0.05, 0.06], [0.0, 0.09, 0.12], [0.03, 0.02, 0.05]].forEach(([x, z, L]) => dr.push({ g: t3Loft(t3Path([x, 0.006, z], 4, L, () => [0, -1, 0], t => [0.003 * (1 - 0.5 * t), 0.003 * (1 - 0.5 * t)]), 4, { vT: 2 }) }));
  G.drool = t3Merge(dr);
  // --- braccio destro: lungo e secco, gomito che sporge, mano a quattro dita con unghie nere (il sinistro e lo stesso modello specchiato)
  G.upperArm = t3Merge([{ g: t3Loft([[0, 0.045, 0, 0.042, 0.042, 0.8], [0, 0.01, 0, 0.05, 0.048, 0.9], [0, -0.06, 0.004, 0.04, 0.038], [0, -0.14, 0.006, 0.034, 0.034], [0, -0.22, 0, 0.032, 0.032], [0, -0.27, 0, 0.034, 0.034, 0.8]], 14) }, B(0.05)]);
  G.upperBone = t3Merge([{ g: t3Spike(0.07, 0.016, { bend: 0.2, cb: BONE_B }), p: [0.03, -0.1, -0.02], r: [-0.4, 0, -1.1] }]);
  const fi = [{ g: t3Loft([[0, 0.012, 0, 0.038, 0.038, 0.75], [0, -0.03, 0, 0.034, 0.034], [0, -0.1, 0.004, 0.03, 0.03], [0, -0.18, 0.003, 0.025, 0.024], [0, -0.25, 0.002, 0.022, 0.02], [0, -0.275, 0.004, 0.024, 0.018, 0.85]], 14, { n: 2.2 }) }, B(0.04, [0, 0, 0])], cl = [];
  fi.push({ g: t3Loft([[0, -0.27, 0.005, 0.03, 0.012, 0.85], [0, -0.3, 0.008, 0.034, 0.012], [0, -0.325, 0.012, 0.03, 0.011, 0.85]], 10) });
  const finger = (x0, y0, z0, L, cu, sp, claw) => {
    const hf = (t) => [sp * t, -Math.cos(cu * t), Math.sin(cu * t)], rg = t3Path([x0, y0, z0], 4, L, hf, t => [0.0095 - 0.0035 * t, 0.009 - 0.003 * t]);
    fi.push({ g: t3Loft(rg, 6, { vT: 2 }) }); const e = rg[rg.length - 1];
    const hc = (t) => [sp, -Math.cos(cu + 1.0 * t), Math.sin(cu + 1.0 * t)];
    cl.push({ g: t3Loft(t3Path([e[0], e[1], e[2]], 6, claw, hc, t => [0.006 * (1 - 0.9 * t) + 0.0004, 0.007 * (1 - 0.9 * t) + 0.0004], t => t3Mix([0.5, 0.42, 0.3], CLAW, t)), 6, { vT: 3, uT: 1 }) });
  };
  finger(-0.026, -0.325, 0.012, 0.075, 0.6, -0.08, 0.06); finger(-0.009, -0.328, 0.014, 0.085, 0.65, -0.02, 0.07); finger(0.009, -0.328, 0.014, 0.08, 0.65, 0.02, 0.065); finger(0.026, -0.325, 0.012, 0.07, 0.6, 0.08, 0.055);
  finger(-0.036, -0.3, 0.008, 0.05, 0.45, -0.6, 0.04);
  G.fore = t3Merge(fi);
  G.foreBone = t3Merge(cl.concat([{ g: t3Spike(0.06, 0.014, { bend: 0.1, cb: BONE_B }), p: [0, -0.01, -0.045], r: [-2.4, 0, 0] }]));
  // --- gamba: coscia e stinco magri, ginocchio nodoso, piede lungo con artigli
  G.thigh = t3Merge([{ g: t3Loft([[0, 0.03, -0.01, 0.055, 0.055, 0.8], [0, -0.04, 0.005, 0.06, 0.058], [0, -0.12, 0.012, 0.05, 0.05], [0, -0.2, 0.02, 0.037, 0.037, 0.85]], 14) }, B(0.055)]);
  G.shin = t3Merge([B(0.04, [0, 0, 0.01]), { g: t3Loft([[0, 0.0, 0, 0.04, 0.04, 0.8], [0, -0.05, -0.004, 0.042, 0.045], [0, -0.12, -0.008, 0.03, 0.03], [0, -0.2, -0.01, 0.024, 0.024, 0.85]], 12) }]);
  G.kneeBone = t3Merge([{ g: t3Spike(0.045, 0.014, { cb: BONE_B }), p: [0, 0.0, 0.04], r: [Math.PI / 2, 0, 0] }]);
  const ft = [{ g: t3Loft([[0, 0.015, -0.025, 0.026, 0.026, 0.8], [0, 0.0, 0.0, 0.03, 0.022], [0, -0.01, 0.06, 0.034, 0.018], [0, -0.015, 0.1, 0.036, 0.014, 0.9]], 10, { vT: 3 }) }], fc = [];
  for (const x of [-0.027, -0.009, 0.009, 0.027]) {
    const hf = () => [x * 0.3, -0.15, 1], rg = t3Path([x, -0.016, 0.1], 3, 0.045, hf, t => [0.0085 - 0.0025 * t, 0.007 - 0.002 * t]);
    ft.push({ g: t3Loft(rg, 6, { vT: 2 }) }); const e = rg[rg.length - 1];
    fc.push({ g: t3Loft(t3Path([e[0], e[1], e[2]], 5, 0.05, (t) => [0, -Math.sin(0.2 + 0.9 * t), Math.cos(0.2 + 0.9 * t)], t => [0.0055 * (1 - 0.9 * t) + 0.0004, 0.0065 * (1 - 0.9 * t) + 0.0004], t => t3Mix([0.5, 0.42, 0.3], CLAW, t)), 5, { vT: 3, uT: 1 }) });
  }
  G.foot = t3Merge(ft); G.footBone = t3Merge(fc);
  // --- stracci: pantaloni consunti, camicia a brandelli (alcune varianti)
  G.rags = l2Rags(0.1, 0.15, 0.24, 18, 5, 31, 0.28);
  G.shirt = l2Rags(0.2, 0.17, 0.5, 20, 7, 77, 0.2, 0.9, 0.62);
  return G;
}

// armi dei ghoul: quelle del demone (t3Weapon) piu mazza chiodata, mazza d'osso e flagello
function l2Weapon(B, kind, o) {
  o = o || {};
  const H = o.handle || '#6b4423';
  if (kind === 'club') {   // mazza di legno con i chiodi, o un grosso osso
    const bone = !!o.bone, k = bone ? 'bone' : 'wood', col = bone ? '#d8ccb0' : '#7a5a38';
    B.seg(k, [0, -0.12, 0], [0, 0.46, 0], 0.017, 0.045, col, 8);
    if (bone) { B.sph('bone', 0.05, [0.0, 0.5, 0.0], col, { w: 8, h: 6 }); B.sph('bone', 0.04, [0.03, 0.46, 0], col, { w: 7, h: 5 }); }
    else for (const r of [[0, 0, -1.5708], [0, 0, 1.5708], [1.5708, 0, 0], [-1.5708, 0, 0], [0.8, 0, -0.8], [-0.8, 0, 0.8]]) B.cone('iron', [0.007, 0.034, 4], [-Math.sin(r[2]) * 0.044, 0.4 + 0.02 * r[0], Math.sin(r[0]) * 0.044], '#8a7a6e', { r });
    if (!bone) B.box('flesh', [0.08, 0.04, 0.08], [0, 0.34, 0], '#4a2a1c', { nz: 0.5 });
  } else if (kind === 'flail') {   // flagello: manico, catena e palla chiodata
    B.seg('wood', [0, -0.1, 0], [0, 0.28, 0], 0.017, 0.015, H, 7); B.tor('iron', [0.02, 0.005, 4, 8], [0, 0.29, 0], '#8a7a6e', { r: [1.5708, 0, 0] });
    B.chain([0, 0.3, 0], [0.05, 0.52, 0.12], 8, '#8a7e76');
    B.sph('iron', 0.065, [0.055, 0.56, 0.135], '#7a7068', { w: 9, h: 7 });
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]]) B.seg('iron', [0.055 + d[0] * 0.055, 0.56 + d[1] * 0.055, 0.135 + d[2] * 0.055], [0.055 + d[0] * 0.105, 0.56 + d[1] * 0.105, 0.135 + d[2] * 0.105], 0.013, 0.001, '#8a7a6e', 5);
  } else t3Weapon(B, kind === 'rifle' ? 'shotgun' : kind, o);
}

// colori delle 8 varianti: pelle (moltiplica la texture), ossa, brillio delle piaghe, occhi, alone, stracci
const L2_GLOOK = [
  { skin: 0xd8e0c8, bone: 0xcfc6a6, glow: 0x9aff30, eye: 0xe0ff60, halo: 0xc8ff40, cloth: 0x4a3c30 },   // 0 clava: grigio-verde
  { skin: 0xd8d8d0, bone: 0xd8d0b8, glow: 0xb8ff50, eye: 0xf0ff90, halo: 0xd8ff70, cloth: 0x2c2c30 },   // 1 mannaia: pallido e magro
  { skin: 0xbcc896, bone: 0xc4c090, glow: 0xc8ff20, eye: 0xd8ff30, halo: 0xb8ff10, cloth: 0x5a4a34 },   // 2 flagello: giallastro, gonfio
  { skin: 0x9ab0a8, bone: 0xc8c8b0, glow: 0x40ffa0, eye: 0xa8ffe0, halo: 0x70ffd0, cloth: 0x2a3a3a },   // 3 tridente: verde-azzurro
  { skin: 0xe0d8c8, bone: 0xe0d8c0, glow: 0xa0ff40, eye: 0xffff90, halo: 0xfff070, cloth: 0xa8a090 },   // 4 mazza d'osso: biancastro, camice
  { skin: 0xa8a890, bone: 0xbab090, glow: 0x88ff30, eye: 0xc0ff40, halo: 0xa0ff30, cloth: 0x4a3028 },   // 5 martello: bruno-verdastro
  { skin: 0xb0b8c0, bone: 0xc8c8c0, glow: 0x80ffc0, eye: 0xff9a40, halo: 0xff8830, cloth: 0x203040 },   // 6 fucile: grigio, occhi arancio
  { skin: 0x90c090, bone: 0xc0c8a0, glow: 0x60ff40, eye: 0xb0ff50, halo: 0x90ff50, cloth: 0x383a24 }    // 7 gobbo: verde marcio, sacche di plasma
];
const L2_SHIRT = [1, 0, 1, 1, 1, 1, 0, 0];   // chi ha ancora una camicia (a brandelli)

function t3Ghoul(e) {
  t3SkinTex();
  const sk = l2GhoulTex(), gc = T3.gc = T3.gc || {}, G = (k, f) => gc[k] || (gc[k] = f());
  const T = TYPES.ghoul, v = e.v | 0, vr = VARS.ghoul[v] || VARS.ghoul[0], mo = vr[2] || {}, mc = T3.mc = T3.mc || {}, mkey = 'ghoul#' + v;
  const sc = T.sc * (e.hs || 1), wsc = mo.ws || 1;
  const kwA = (mo.lw || 6) / 6, kwR = (mo.lwR || mo.lw || 6) / 6, kwL = ((mo.lw || 6) + 1) / 7, akL = Math.min(1.4, mo.armL || 1), akR = Math.min(1.4, mo.armR || 1);   // braccia lunghe, ma senza bucare il pavimento
  if (!mc[mkey]) {
    const LK = L2_GLOOK[v] || L2_GLOOK[0];
    mc[mkey] = {
      skin: new THREE.MeshStandardMaterial({ map: sk.c, bumpMap: sk.b, bumpScale: 1.4, vertexColors: true, color: LK.skin, emissive: LK.glow, emissiveMap: sk.g, emissiveIntensity: 0.5, roughness: 0.66, metalness: 0.02 }),
      bone: new THREE.MeshStandardMaterial({ map: T3.boneTex, bumpMap: T3.boneBump, bumpScale: 1.2, vertexColors: true, color: LK.bone, roughness: 0.55, emissive: 0x000000 }),
      flesh: new THREE.MeshStandardMaterial({ color: 0x6a2c2a, vertexColors: true, roughness: 0.3, emissive: 0x180404, emissiveIntensity: 0.6 }),
      tongue: new THREE.MeshStandardMaterial({ color: 0x7a5262, vertexColors: true, roughness: 0.25 }),
      drool: new THREE.MeshStandardMaterial({ color: 0xc8e080, vertexColors: true, roughness: 0.05, transparent: true, opacity: 0.5 }),
      cloth: new THREE.MeshStandardMaterial({ map: T3.boneBump, color: LK.cloth, vertexColors: true, roughness: 1, side: THREE.DoubleSide, emissive: 0x000000 }),
      bile: new THREE.MeshStandardMaterial({ color: 0xa8c840, roughness: 0.08, transparent: true, opacity: 0.8, emissive: 0x2a3a04, emissiveIntensity: 0.7 }),
      eye: new THREE.MeshBasicMaterial({ map: T3.eyeTex, color: LK.eye, fog: false }),
      glow: new THREE.SpriteMaterial({ map: l2EyeGlow(), color: LK.halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      plasma: new THREE.MeshBasicMaterial({ color: LK.halo })
    };
  }
  const D = G('ghoul', t3GhoulGeos), eyeGeo = G('eye', () => new THREE.SphereGeometry(0.5, 16, 12));
  const M = mc[mkey], g = new THREE.Group(), det = [], all = [], eyes = [];
  const mesh = (geo, mat, p, o) => { const m = new THREE.Mesh(geo, mat); (p || g).add(m); if (!(o && o.keep)) all.push(m); if (o && o.det) det.push(m); return m; };
  const grp = (p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  const body = grp(g, 0, 0.45, 0); mesh(D.pelvis, M.skin, body); mesh(D.rags, M.cloth, body).position.set(0, -0.03, 0);
  if (mo.belly) { const bk = mo.belly / 10, bm = mesh(G('belly', () => t3Blob(0.19, 0.16, 0.15)), M.skin, body); bm.position.set(0, -0.02, 0.07); bm.scale.set(wsc * (0.8 + 0.2 * bk), 0.8 + 0.2 * bk, 0.8 + 0.2 * bk); mesh(G('bellyW', () => t3Blob(0.05, 0.035, 0.03)), M.flesh, body).position.set(0.05, -0.03, 0.21 * (0.8 + 0.2 * bk)); }   // pancia gonfia, con una piaga
  const chest = grp(body, 0, 0.1, 0); mesh(D.torso, M.skin, chest).scale.x = wsc; mesh(D.torsoBone, M.bone, chest).scale.x = wsc;
  if (L2_SHIRT[v]) mesh(D.shirt, M.cloth, chest).position.set(0, 0.2, 0);
  if (mo.hump) { const hm = mesh(G('hump', () => t3Blob(0.1, 0.09, 0.1)), M.skin, chest); hm.position.set(0.07 * wsc, 0.2, -0.1); hm.scale.setScalar(mo.hump / 11); }   // gobba
  const hn = mo.hunch !== undefined ? mo.hunch : 5, neck = grp(chest, 0, 0.26 - hn * 0.005, 0.03 + hn * 0.005); mesh(D.neck, M.skin, neck);
  const head = grp(neck, 0, 0.1, 0.035); head.scale.setScalar(1.22 * (mo.headS || 1)); mesh(D.head, M.skin, head); mesh(D.teeth, M.bone, head, { det: true });
  const jaw = grp(head, 0, -0.07, 0.03); mesh(D.jaw, M.skin, jaw); mesh(D.jawTeeth, M.bone, jaw, { det: true });
  const tongue = mesh(D.tongue, M.tongue, jaw, { det: true }); tongue.position.set(0, 0.004, 0.1); mesh(D.drool, M.drool, jaw, { det: true });
  for (const s of [-1, 1]) {   // occhi nelle orbite, con un alone che li fa vedere nel buio
    const eye = mesh(eyeGeo, M.eye, head, { keep: true }); eye.position.set(s * 0.035, 0.02, 0.054); eye.scale.set(0.044, 0.044, 0.04); eye.rotation.y = -s * 0.15; eye.userData.by = 0.044;
    const gl = new THREE.Sprite(M.glow); gl.position.set(s * 0.036, 0.02, 0.082); head.add(gl); eyes.push([eye, gl]);
  }
  const elbows = [], arms = [-1, 1].map(s => {
    const kw = s > 0 ? kwR : kwA, ak = s > 0 ? akR : akL;
    const a = grp(chest, s * 0.2 * wsc, 0.19, 0); mesh(D.upperArm, M.skin, a).scale.set(s * kw, ak, kw); mesh(D.upperBone, M.bone, a).scale.set(s * kw, ak, kw);
    const el = grp(a, 0, -0.28 * ak, 0); el.rotation.x = -0.35; elbows.push(el); mesh(D.fore, M.skin, el).scale.set(s * kw, ak, kw); mesh(D.foreBone, M.bone, el).scale.set(s * kw, ak, kw);
    return a;
  });
  const gun = vr[0] === 'rifle';
  if (vr[0]) {   // arma nel pugno destro: segue braccio e avambraccio
    const wg = grp(elbows[1], 0, -0.34 * akR, 0.03 * kwR), wo = vr[1] || {};
    wg.rotation.x = gun ? 2.85 : 1.45; wg.scale.setScalar(0.85 * (wo.sc || 1) * (0.8 + 0.2 * akR));
    for (const p of t3PropGeo('wp_ghoul_' + v, B => l2Weapon(B, vr[0], wo), 0.5)) mesh(p.g, p.m, wg);
  }
  if (v === 7) for (const [x, y, z, r] of [[0.07, 0.22, -0.12, 0.05], [-0.06, 0.16, -0.11, 0.04], [0.13, 0.12, -0.09, 0.035]]) { const sac = mesh(G('sac', () => new THREE.SphereGeometry(1, 10, 8)), M.plasma, chest); sac.position.set(x * wsc, y, z); sac.scale.setScalar(r); }   // sacche di plasma sulla gobba
  if (v === 2 || v === 5) for (const [x, y, z, r] of [[0.1, 0.1, 0.1, 0.035], [-0.09, 0.02, 0.1, 0.03], [0.04, -0.04, 0.105, 0.028]]) { const bl = mesh(G('boil', () => t3Blob(1, 0.9, 0.7)), M.bile, chest); bl.position.set(x * wsc, y, z); bl.scale.setScalar(r); }   // bolle di bile sul petto
  const knees = [], ankles = [], legs = [-1, 1].map(s => {
    const l = grp(g, s * 0.085, 0.44, 0); mesh(D.thigh, M.skin, l).scale.set(kwL, 1, kwL);
    const kn = grp(l, 0, -0.21, 0.02); mesh(D.shin, M.skin, kn).scale.set(kwL, 1, kwL); mesh(D.kneeBone, M.bone, kn).scale.set(kwL, 1, kwL);
    const an = grp(kn, 0, -0.21, -0.01); mesh(D.foot, M.skin, an).scale.set(kwL, 1, kwL); mesh(D.footBone, M.bone, an).scale.set(kwL, 1, kwL);
    knees.push(kn); ankles.push(an); return l;
  });
  g.rotation.order = 'YXZ'; g.scale.setScalar(sc);
  g.userData = { mo, gun, arms, elbows, legs, knees, ankles, body, chest, neck, head, jaw, tongue, tail: [], eyes, det, all, s: {}, px: e.x, py: e.y, ph: 0, hd: 0, yaw: null, yawRate: 0, spd: 0, spdPrev: 0, stepIdx: 0, atkT: 0, hp: e.hp, hurt: 0, sc, seed: (e.x * 7 + e.y * 13) % 6.28, lod: null, close: null, dead: false, ghoul: true };
  return g;
}

/* ======================================================================
   CASTEDDISH - Piano 2: arredi in 3D
   Gli arredi del catalogo DECOR[1] (scrivania, schedario, tv, distributore, bidone, spazzatura, divano, frigorifero, rete
   del letto, carrello, armadietti, computer, distributore d'acqua, scatoloni, pianta secca, gomme, sedia, fotocopiatrice,
   materasso) e il barile esplosivo sono modelli veri, fatti di tanti pezzi uniti in poche mesh con lo stesso sistema del
   piano 1 (t3PropGeo). Casse e bauli sono quelli del piano 1. Rottura: i pezzi del modello volano via (t3Shatter) e restano
   macerie adatte al materiale (lamiera, vetro, legno).
   ====================================================================== */
function l2Kit() {   // materiali in piu rispetto al piano 1: stoffa, plastica, vernice liscia, vetro
  const K = t3PropKit(); if (K.l2) return K; K.l2 = true;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), R = hwRng(55);
  for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) { const v = 196 + R() * 44 - (((x + y) >> 1) & 1) * 16; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(x, y, 2, 2); }
  const ft = t3TexL(cv);
  K.mat.fabric = new THREE.MeshStandardMaterial({ map: ft, bumpMap: ft, bumpScale: 0.6, roughness: 1, vertexColors: true });
  K.mat.plastic = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, vertexColors: true });
  K.mat.paint = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3, vertexColors: true });
  K.mat.glass = new THREE.MeshStandardMaterial({ roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.38, vertexColors: true, depthWrite: false });
  return K;
}
function l2Keys(B) { for (const k of ['fabric', 'plastic', 'paint', 'glass']) if (!B.L[k]) B.L[k] = []; }

// i modelli: origine al centro della cella, a terra; il davanti guarda +z
function l2PropBuild(B, n, v) {
  const R = B.R, rn = (a, b) => a + (b - a) * R();
  if (n === 'desk') {
    B.box('wood', [0.5, 0.025, 0.25], [0, 0.285, 0], '#8c6c4a'); B.box('wood', [0.2, 0.2, 0.012], [0, 0.17, -0.11], '#6a4c30');
    for (const s of [-1, 1]) {
      B.box('wood', [0.14, 0.27, 0.23], [s * 0.17, 0.135, 0], '#7a5a3a');
      for (let i = 0; i < 3; i++) { B.box('wood', [0.125, 0.075, 0.012], [s * 0.17, 0.215 - i * 0.082, 0.118], '#86663f'); B.box('iron', [0.04, 0.008, 0.012], [s * 0.17, 0.222 - i * 0.082, 0.128], '#b8b0a0'); }
    }
    if (v === 1) B.box('wood', [0.12, 0.07, 0.13], [0.17, 0.2, 0.18], '#86663f', { r: [0, 0.1, 0] });   // un cassetto tirato fuori
    for (let i = 0; i < 4; i++) B.box('bone', [0.07, 0.002, 0.095], [rn(-0.18, 0.05), 0.2985 + i * 0.002, rn(-0.05, 0.06)], i % 2 ? '#e6e2d2' : '#d8d2bc', { r: [0, rn(-0.5, 0.5), 0], ao: false });
    B.cyl('plastic', [0.02, 0.02, 0.04, 8], [0.2, 0.31, -0.07], '#3a4a40'); B.box('plastic', [0.07, 0.02, 0.05], [0.09, 0.31, 0.06], '#2a2a2c', { r: [0, 0.3, 0] });
    B.box('iron', [0.5, 0.004, 0.25], [0, 0.0, 0], '#4a3a2a', { ao: false });
  } else if (n === 'cabinet') {
    B.box('paint', [0.2, 0.44, 0.2], [0, 0.22, 0], '#6a7078');
    for (let i = 0; i < 3; i++) {
      const y = 0.075 + i * 0.14;
      if (v === 1 && i === 1) { B.box('paint', [0.18, 0.1, 0.13], [0, y, 0.15], '#5a6068'); B.box('bone', [0.15, 0.012, 0.1], [0, y + 0.056, 0.15], '#d8d2bc', { ao: false }); continue; }   // cassetto aperto con le carte
      B.box('paint', [0.18, 0.12, 0.01], [0, y, 0.105], '#5a6068'); B.box('iron', [0.07, 0.014, 0.014], [0, y + 0.025, 0.115], '#2a2d33'); B.box('bone', [0.04, 0.016, 0.004], [0, y + 0.01, 0.112], '#e0e0d8', { ao: false });
    }
    B.box('iron', [0.12, 0.14, 0.004], [0.05, 0.12, 0.101], '#7a4a2a', { r: [0, 0, 0.3] });
  } else if (n === 'tv') {
    B.box('wood', [0.38, 0.02, 0.2], [0, 0.2, 0], '#6a4a2e'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box('wood', [0.02, 0.2, 0.02], [sx * 0.17, 0.1, sz * 0.08], '#5a3c24');
    B.box('plastic', [0.3, 0.22, 0.22], [0, 0.32, -0.01], '#34343a'); B.box('plastic', [0.26, 0.18, 0.04], [0, 0.32, 0.12], '#2a2a30');
    B.box('glass', [0.22, 0.15, 0.008], [0, 0.325, 0.142], '#7a9a96'); B.box('glow', [0.2, 0.13, 0.004], [0, 0.325, 0.136], '#1c2e2a', { ao: false });
    B.box('plastic', [0.03, 0.14, 0.012], [0.12, 0.32, 0.14], '#1a1a1e');
    B.seg('iron', [-0.04, 0.43, -0.02], [-0.14, 0.56, 0], 0.003, 0.003, '#8a8e96', 4); B.seg('iron', [0.04, 0.43, -0.02], [0.15, 0.55, 0.02], 0.003, 0.003, '#8a8e96', 4);
  } else if (n === 'vending') {
    B.box('paint', [0.3, 0.62, 0.28], [0, 0.31, 0], '#8a2424'); B.box('plastic', [0.3, 0.05, 0.02], [0, 0.575, 0.146], '#d8d0b0');
    B.box('glass', [0.2, 0.34, 0.008], [-0.03, 0.4, 0.145], '#8aa0a8'); B.box('plastic', [0.19, 0.33, 0.01], [-0.03, 0.4, 0.138], '#101418');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (R() > 0.2) B.box('plastic', [0.028, 0.05, 0.012], [-0.1 + c * 0.047, 0.52 - r * 0.075, 0.13], ['#d8a020', '#4a8a30', '#3a5aa0', '#c8c8c0'][(r + c) % 4], { ao: false });
    B.box('plastic', [0.06, 0.2, 0.014], [0.115, 0.43, 0.148], '#2a2d33'); B.box('plastic', [0.04, 0.012, 0.016], [0.115, 0.4, 0.152], '#d8d8c0', { ao: false });
    B.box('plastic', [0.22, 0.07, 0.014], [-0.01, 0.075, 0.147], '#10141a'); B.box('iron', [0.3, 0.006, 0.28], [0, 0.003, 0], '#2a2a2c', { ao: false });
    B.box('iron', [0.012, 0.3, 0.003], [0.1, 0.35, 0.15], '#7a4a2a', { r: [0, 0, 0.1] });
  } else if (n === 'drum') {
    B.cyl('paint', [0.09, 0.09, 0.33, 14], [0, 0.165, 0], '#9a5a28'); B.cyl('iron', [0.092, 0.092, 0.012, 14], [0, 0.04, 0], '#6a3a18'); B.cyl('iron', [0.092, 0.092, 0.012, 14], [0, 0.165, 0], '#6a3a18'); B.cyl('iron', [0.092, 0.092, 0.012, 14], [0, 0.29, 0], '#6a3a18');
    B.cyl('iron', [0.088, 0.088, 0.008, 14], [0, 0.331, 0], '#4a2c14'); B.cyl('iron', [0.016, 0.016, 0.014, 8], [0.04, 0.336, 0.02], '#2a2a2a');
    B.box('paint', [0.07, 0.06, 0.004], [0, 0.17, 0.0915], '#e8c020', { r: [0, 0, 0.78], ao: false }); B.box('plastic', [0.012, 0.03, 0.004], [0, 0.17, 0.094], '#1a1a1a', { ao: false });
    B.box('iron', [0.03, 0.2, 0.004], [-0.06, 0.18, 0.066], '#5a2a10', { r: [0, 0.6, 0] });
  } else if (n === 'trash') {
    const bag = (x, z, s, c) => { B.sph('plastic', [0.1 * s, 0.075 * s, 0.09 * s], [x, 0.06 * s, z], c, { w: 9, h: 7, r: [0, R() * 3, 0] }); B.cone('plastic', [0.015 * s, 0.04 * s, 5], [x, 0.14 * s, z], c); };
    bag(-0.08, 0, 1, '#1c1c20'); bag(0.09, 0.03, 0.9, '#2a3a50'); bag(0.0, -0.09, 0.85, '#1c1c20'); bag(0.12, -0.08, 0.7, '#a03030');
    for (let i = 0; i < 6; i++) { const x = rn(-0.2, 0.2), z = rn(-0.15, 0.2); if (i % 3 === 0) B.cyl('iron', [0.016, 0.016, 0.04, 8], [x, 0.02, z], '#a8a8a0', { r: [1.5, R() * 3, 0] }); else if (i % 3 === 1) B.cyl('glass', [0.012, 0.016, 0.07, 8], [x, 0.01, z], '#6a8a50', { r: [1.5708, R() * 3, 0] }); else B.box('bone', [0.07, 0.003, 0.05], [x, 0.004, z], '#d8d2bc', { r: [0, R() * 3, 0], ao: false }); }
    B.box('wood', [0.14, 0.05, 0.1], [-0.06, 0.025, 0.14], '#8a6a40', { r: [0, 0.5, 0.1] });
  } else if (n === 'couch') {
    const F = '#6a5238';
    B.box('fabric', [0.5, 0.11, 0.22], [0, 0.085, 0], F); B.box('fabric', [0.5, 0.2, 0.06], [0, 0.22, -0.09], '#5a4630', { r: [-0.12, 0, 0] });
    for (const s of [-1, 1]) B.box('fabric', [0.06, 0.17, 0.22], [s * 0.26, 0.17, 0], '#5a4630');
    B.box('fabric', [0.2, 0.05, 0.18], [-0.12, 0.165, 0.01], '#7a6248'); B.box('fabric', [0.2, 0.05, 0.18], [0.12, 0.17, 0.02], '#7a6248', { r: [0.12, 0, 0.18] });
    for (const sx of [-1, 1]) B.box('wood', [0.025, 0.03, 0.025], [sx * 0.24, 0.015, 0.09], '#2a2018');
    B.box('fabric', [0.12, 0.04, 0.06], [-0.16, 0.2, 0.0], '#c8b878', { r: [0.4, 0.3, 0] });   // imbottitura che esce da uno strappo
    B.seg('iron', [0.2, 0.14, 0.06], [0.26, 0.22, 0.05], 0.004, 0.004, '#8a8e96', 4);
  } else if (n === 'fridge') {
    const C = '#b4b09a';
    B.box('paint', [0.2, 0.5, 0.2], [0, 0.25, -0.01], C); B.box('paint', [0.2, 0.17, 0.02], [0, 0.415, 0.1], C); B.box('iron', [0.012, 0.09, 0.012], [0.08, 0.42, 0.116], '#5a5648');
    B.box('plastic', [0.17, 0.25, 0.16], [0, 0.15, -0.0], '#14120e', { ao: false });
    for (const y of [0.1, 0.19]) B.box('glass', [0.17, 0.004, 0.15], [0, y, 0.0], '#9aa090'); B.box('plastic', [0.05, 0.03, 0.04], [-0.04, 0.115, 0.03], '#5a7a3a'); B.sph('plastic', [0.04, 0.025, 0.04], [0.04, 0.2, 0.02], '#4a6a30', { w: 7, h: 5 });   // muffa
    B.in([-0.1, 0.15, 0.09], [0, -1.3 - 0.4 * (v % 2), 0], null, () => { B.box('paint', [0.2, 0.29, 0.02], [0.1, 0, 0.01], C); B.box('iron', [0.012, 0.12, 0.012], [0.17, 0.02, 0.03], '#5a5648'); B.box('plastic', [0.17, 0.02, 0.02], [0.1, -0.05, 0.03], '#8a8678'); });
    B.box('iron', [0.012, 0.12, 0.004], [0.04, 0.4, 0.111], '#6a4a2a', { r: [0, 0, 0.2] });
  } else if (n === 'bedframe') {
    const I = '#3a2e26';
    B.box('iron', [0.02, 0.24, 0.22], [-0.23, 0.15, 0], I); B.box('iron', [0.02, 0.14, 0.22], [0.23, 0.1, 0], I);
    for (const z of [-0.1, 0.1]) { B.box('iron', [0.46, 0.02, 0.016], [0, 0.07, z], I); }
    for (const x of [-0.23, 0.23]) for (const z of [-0.1, 0.1]) B.box('iron', [0.016, 0.07, 0.016], [x, 0.035, z], I);
    for (let i = 0; i < 6; i++) B.box('iron', [0.012, 0.012, 0.2], [-0.19 + i * 0.076, 0.082, 0], I, { ao: false });
    B.box('fabric', [0.43, 0.045, 0.2], [0, 0.105, 0], '#a89c80', { r: [0, 0, 0.02] }); B.sph('fabric', [0.06, 0.025, 0.055], [-0.16, 0.14, 0], '#cfc7ae', { w: 8, h: 6 });
    B.box('fabric', [0.22, 0.03, 0.2], [0.1, 0.14, 0], '#5e4e3e', { r: [0.1, 0.2, 0.06], nz: 2 }); B.sph('fabric', [0.08, 0.025, 0.06], [-0.03, 0.14, 0.02], '#5e4e3e', { w: 7, h: 5 });
  } else if (n === 'cart') {
    const I = '#8a8e96';
    B.box('iron', [0.3, 0.008, 0.18], [0, 0.07, 0], I, { ao: false });
    for (const z of [-0.09, 0.09]) { B.box('iron', [0.3, 0.006, 0.006], [0, 0.07, z], I); B.box('iron', [0.4, 0.006, 0.006], [0, 0.26, z], I, { ao: false }); }
    for (let i = 0; i <= 6; i++) for (const z of [-0.09, 0.09]) { const t = i / 6; B.seg('iron', [-0.15 + t * 0.3, 0.07, z], [-0.2 + t * 0.4, 0.26, z], 0.0028, 0.0028, I, 4); }
    for (const x of [-0.15, 0.15]) B.seg('iron', [x, 0.07, -0.09], [x * 1.33, 0.26, -0.09], 0.0028, 0.0028, I, 4);
    for (let i = 1; i < 4; i++) for (const z of [-0.09, 0.09]) B.box('iron', [0.36, 0.004, 0.004], [0, 0.07 + i * 0.047, z], I, { ao: false });
    for (const z of [-0.09, 0.09]) B.seg('iron', [-0.2, 0.26, z], [-0.25, 0.34, z], 0.004, 0.004, I, 4); B.seg('iron', [-0.25, 0.34, -0.09], [-0.25, 0.34, 0.09], 0.005, 0.005, '#2a2a2c', 5);
    for (const [x, z] of [[-0.13, -0.08], [-0.13, 0.08], [0.13, -0.08], [0.13, 0.08]]) { B.seg('iron', [x, 0.07, z], [x, 0.03, z], 0.004, 0.004, I, 4); B.cyl('plastic', [0.022, 0.022, 0.014, 8], [x, 0.022, z], '#1a1a1c', { r: [1.5708, 0, 0] }); }
    B.box('wood', [0.14, 0.08, 0.1], [0.04, 0.115, 0], '#a8845a', { r: [0, 0.4, 0.1] }); B.sph('fabric', [0.06, 0.03, 0.05], [-0.06, 0.1, 0.02], '#5e5240', { w: 6, h: 5 });
  } else if (n === 'lockers') {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.145;
      B.box('paint', [0.14, 0.5, 0.15], [x, 0.25, 0], '#4e604e');
      if (i === 1) { B.box('plastic', [0.118, 0.46, 0.13], [x, 0.25, 0.01], '#0c100c', { ao: false }); B.in([x - 0.07, 0.25, 0.075], [0, -1.7, 0], null, () => { B.box('paint', [0.136, 0.48, 0.012], [0.068, 0, 0.0], '#5a6c5a'); for (let k = 0; k < 3; k++) B.box('plastic', [0.07, 0.006, 0.014], [0.068, 0.17 - k * 0.012, 0.0], '#1a221a'); }); continue; }
      B.box('paint', [0.13, 0.47, 0.012], [x, 0.25, 0.076], '#5a6c5a');
      for (let k = 0; k < 4; k++) B.box('plastic', [0.07, 0.006, 0.014], [x, 0.43 - k * 0.014, 0.082], '#1a221a', { ao: false });
      B.box('iron', [0.012, 0.05, 0.014], [x + 0.045, 0.22, 0.088], '#c8c8c0'); B.box('bone', [0.025, 0.012, 0.004], [x, 0.33, 0.083], '#d8d2bc', { ao: false });
    }
    B.box('iron', [0.12, 0.12, 0.004], [0.15, 0.1, 0.079], '#7a4a2a', { r: [0, 0, 0.5] });
  } else if (n === 'computer') {
    B.box('wood', [0.44, 0.025, 0.22], [0, 0.23, 0], '#7a6040'); for (const sx of [-1, 1]) B.box('wood', [0.03, 0.22, 0.2], [sx * 0.2, 0.11, 0], '#5a4630'); B.box('wood', [0.37, 0.18, 0.012], [0, 0.12, -0.09], '#5a4630');
    B.box('plastic', [0.2, 0.18, 0.2], [-0.07, 0.35, -0.02], '#c8c0a8'); B.box('plastic', [0.17, 0.15, 0.04], [-0.07, 0.35, 0.09], '#b8b09a');
    B.box('glass', [0.14, 0.11, 0.008], [-0.07, 0.355, 0.112], '#7a9a8a'); B.box('glow', [0.13, 0.1, 0.004], [-0.07, 0.355, 0.108], '#17382a', { ao: false });
    B.box('plastic', [0.2, 0.012, 0.07], [-0.06, 0.249, 0.07], '#b8b09c'); B.box('plastic', [0.03, 0.014, 0.045], [0.07, 0.25, 0.07], '#c0b8a4');
    B.box('plastic', [0.09, 0.24, 0.2], [0.14, 0.12, 0.0], '#b8b09c'); B.box('plastic', [0.07, 0.014, 0.01], [0.14, 0.16, 0.101], '#2a2a2c');
    B.seg('plastic', [-0.1, 0.34, -0.12], [0.1, 0.24, -0.15], 0.004, 0.004, '#202022', 4);
  } else if (n === 'cooler') {
    B.box('plastic', [0.15, 0.29, 0.15], [0, 0.145, 0], '#cdd2d6'); B.box('plastic', [0.15, 0.03, 0.15], [0, 0.3, 0], '#b4bac0');
    B.box('plastic', [0.02, 0.02, 0.02], [-0.03, 0.215, 0.078], '#3a6ab0'); B.box('plastic', [0.02, 0.02, 0.02], [0.03, 0.215, 0.078], '#c03a3a'); B.box('plastic', [0.1, 0.01, 0.04], [0, 0.17, 0.08], '#8a8e96'); B.box('plastic', [0.12, 0.012, 0.012], [0, 0.04, 0.075], '#5a5e66');
    B.cyl('glass', [0.055, 0.058, 0.17, 12], [0, 0.4, 0], '#8cc0e0'); B.cone('glass', [0.058, 0.04, 12], [0, 0.505, 0], '#8cc0e0', { r: [Math.PI, 0, 0] }); B.cyl('glass', [0.054, 0.054, 0.1, 12], [0, 0.36, 0], '#6a9a50');
    B.box('plastic', [0.14, 0.008, 0.06], [0, 0.0, 0.0], '#3a3226', { ao: false });
  } else if (n === 'boxes') {
    const W = '#a8845a', box = (x, y, z, w, h, d, c, ry) => { B.box('wood', [w, h, d], [x, y + h / 2, z], c, { r: [0, ry || 0, 0] }); B.box('bone', [0.02, 0.003, d * 0.9], [x, y + h + 0.001, z], '#d6c28c', { r: [0, ry || 0, 0], ao: false }); };
    box(-0.08, 0, 0, 0.26, 0.2, 0.22, W, 0.05); box(0.15, 0, 0.04, 0.17, 0.15, 0.17, '#9a784e', -0.1); box(-0.05, 0.2, 0.01, 0.22, 0.16, 0.2, '#b08a5e', 0.2);
    B.box('wood', [0.2, 0.004, 0.1], [-0.15, 0.37, -0.04], '#a07c54', { r: [-0.9, 0.2, 0] }); B.box('wood', [0.2, 0.004, 0.1], [0.05, 0.37, 0.07], '#8e6c46', { r: [0.9, 0.2, 0] });
    B.box('plastic', [0.07, 0.04, 0.003], [-0.12, 0.1, 0.116], '#e8e0c8', { ao: false });
  } else if (n === 'plant') {
    B.lat('stone', [[0.001, 0], [0.065, 0], [0.085, 0.14], [0.095, 0.15], [0.09, 0.17], [0.07, 0.17]], [0, 0, 0], '#9a5a3a', { w: 12 }); B.cyl('stone', [0.075, 0.075, 0.004, 12], [0, 0.155, 0], '#2a1a0e');
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.28 + R(), L = 0.2 + R() * 0.18, tip = [Math.cos(a) * (0.1 + R() * 0.12), 0.16 + L, Math.sin(a) * (0.1 + R() * 0.12)], mid = [tip[0] * 0.4, 0.16 + L * 0.7, tip[2] * 0.4];
      B.seg('wood', [0, 0.16, 0], mid, 0.006, 0.004, '#5a4a30', 5); B.seg('wood', mid, tip, 0.004, 0.002, '#5a4a30', 5);
      B.sph('wood', [0.04, 0.006, 0.02], [tip[0], tip[1] - 0.01, tip[2]], '#6a5230', { w: 6, h: 4, r: [0.5, a, 0.8] }); B.sph('wood', [0.035, 0.005, 0.018], [mid[0], mid[1], mid[2]], '#7a6038', { w: 6, h: 4, r: [0.3, a, 0.5] });
    }
    B.box('wood', [0.03, 0.002, 0.018], [0.1, 0.004, 0.08], '#6a5230', { r: [0, 0.6, 0], ao: false });
  } else if (n === 'tires') {
    const tx = [0, 0.025, -0.02], tz = [0, 0.01, -0.015];
    for (let i = 0; i < 3; i++) B.tor('plastic', [0.085, 0.036, 8, 16], [tx[i], 0.038 + i * 0.07, tz[i]], '#1c1c20', { r: [1.5708, 0, 0], s: [1, 1, 0.9] });
    B.tor('iron', [0.05, 0.004, 4, 12], [0.025, 0.178, 0.01], '#6a6e76', { r: [1.5708, 0, 0] });
  } else if (n === 'chair') {
    const C = '#364450';
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + 0.3, x = Math.cos(a) * 0.1, z = Math.sin(a) * 0.1; B.seg('plastic', [0, 0.07, 0], [x, 0.045, z], 0.01, 0.008, '#2a2a2e', 5); B.sph('plastic', 0.015, [x, 0.02, z], '#111', { w: 6, h: 4 }); }
    B.cyl('iron', [0.012, 0.012, 0.1, 8], [0, 0.12, 0], '#2a2a2e'); B.box('fabric', [0.17, 0.03, 0.17], [0, 0.18, 0.0], C); B.box('fabric', [0.16, 0.2, 0.028], [0, 0.3, -0.085], C, { r: [-0.15, 0, 0] });
    B.box('plastic', [0.02, 0.12, 0.02], [0, 0.22, -0.08], '#2a2a2e', { r: [-0.15, 0, 0] });
    for (const s of [-1, 1]) B.box('plastic', [0.015, 0.012, 0.1], [s * 0.095, 0.24, 0.0], '#2a2a2e'); B.sph('fabric', [0.035, 0.012, 0.03], [0.03, 0.2, 0.02], '#c8c0a0', { w: 6, h: 4 });
  } else if (n === 'copier') {
    B.box('paint', [0.32, 0.2, 0.22], [0, 0.12, 0], '#b4b0a0'); B.box('iron', [0.32, 0.02, 0.22], [0, 0.02, 0], '#2a2a28', { ao: false });
    B.in([0, 0.225, -0.1], [-0.6, 0, 0], null, () => { B.box('paint', [0.32, 0.03, 0.22], [0, 0.015, 0.11], '#8e8a78'); B.box('glass', [0.28, 0.004, 0.18], [0, -0.003, 0.11], '#9aa8aa'); });
    B.box('plastic', [0.1, 0.05, 0.02], [0.09, 0.16, 0.112], '#161e20'); for (let i = 0; i < 3; i++) B.sph('glow', 0.007, [0.062 + i * 0.026, 0.12, 0.118], ['#d03030', '#30d060', '#d0b020'][i], { w: 5, h: 4, ao: false });
    B.box('paint', [0.22, 0.04, 0.12], [-0.03, 0.08, 0.15], '#7a7666'); B.box('bone', [0.2, 0.003, 0.1], [-0.03, 0.102, 0.15], '#f0ece0', { ao: false }); B.box('bone', [0.08, 0.002, 0.1], [0.05, 0.01, 0.2], '#eae6d8', { r: [0, 0.5, 0], ao: false });
  } else if (n === 'mattress') {
    B.box('fabric', [0.42, 0.045, 0.22], [0, 0.0225, 0], '#a89c80', { r: [0, 0, 0.0] }); B.box('fabric', [0.43, 0.012, 0.23], [0, 0.05, 0], '#c0b498', { nz: 1.5 });
    B.sph('fabric', [0.07, 0.003, 0.04], [-0.06, 0.057, 0.02], '#5a4024', { w: 8, h: 4, ao: false }); B.box('fabric', [0.14, 0.03, 0.1], [0.12, 0.03, 0.1], '#7a6e56', { r: [0, 0.5, 0.1], nz: 2 });
    for (let i = 0; i < 4; i++) B.seg('iron', [0.12 + i * 0.01, 0.052, -0.06], [0.14 + i * 0.012, 0.075, -0.05], 0.003, 0.003, '#6a6e76', 4);
  } else if (n === 'xbarrel') {
    B.cyl('paint', [0.085, 0.085, 0.3, 14], [0, 0.15, 0], '#9a2216'); B.cyl('iron', [0.088, 0.088, 0.012, 14], [0, 0.04, 0], '#5a1810'); B.cyl('iron', [0.088, 0.088, 0.012, 14], [0, 0.26, 0], '#5a1810');
    B.cyl('paint', [0.087, 0.087, 0.05, 14], [0, 0.16, 0], '#e0b020'); B.cyl('iron', [0.082, 0.082, 0.008, 14], [0, 0.304, 0], '#4a1008'); B.cyl('iron', [0.016, 0.016, 0.016, 8], [0.035, 0.31, 0.02], '#2a2a2a');
    B.cone('plastic', [0.02, 0.05, 3], [0, 0.16, 0.0875], '#1a1a1a', { r: [1.5708, 0, 0], s: [1, 0.2, 1], ao: false }); B.box('plastic', [0.07, 0.008, 0.004], [0, 0.205, 0.088], '#1a1a1a', { ao: false });
    B.box('plastic', [0.024, 0.036, 0.004], [-0.03, 0.095, 0.083], '#e0b020', { r: [0, -0.4, 0], ao: false });
  } else B.box('wood', [0.3, 0.3, 0.3], [0, 0.15, 0], '#8a6a48');
}

// macerie: lamiera piegata, vetri, assi e imbottitura
function t3MRubble2(B, c) {
  l2Kit(); l2Keys(B);
  const R = B.R, P = (r) => { const a = R() * 6.28, d = Math.sqrt(R()) * r; return [Math.cos(a) * d, Math.sin(a) * d]; };
  const pl = (k, d, col, r) => { const [x, z] = P(r); B.box(k, d, [x, d[1] / 2 + R() * 0.006, z], col, { r: [0, R() * 6.28, (R() - 0.5) * 0.5] }); };
  if (c === 'l2metal') {
    for (let i = 0; i < 6; i++) pl('iron', [0.07 + R() * 0.1, 0.008, 0.05 + R() * 0.08], i % 2 ? '#9a9a96' : '#7a7e84', 0.2);
    for (let i = 0; i < 4; i++) { const [x, z] = P(0.2); B.cyl('iron', [0.004, 0.004, 0.04, 4], [x, 0.004, z], '#6a6a66', { r: [1.5708, R() * 3, 0] }); }
    { const [x, z] = P(0.12); B.box('plastic', [0.05, 0.02, 0.04], [x, 0.01, z], '#2a2a2c', { r: [0, R() * 3, 0] }); }
    B.box('iron', [0.12, 0.004, 0.1], [0, 0.002, 0], '#4a3a2a', { ao: false });
  } else if (c === 'l2glass') {
    for (let i = 0; i < 9; i++) { const [x, z] = P(0.18); B.box('glass', [0.015 + R() * 0.035, 0.004, 0.015 + R() * 0.03], [x, 0.003, z], '#cfe0e0', { r: [0, R() * 6, (R() - 0.5) * 0.3], ao: false }); }
    for (let i = 0; i < 4; i++) pl('plastic', [0.04 + R() * 0.05, 0.012, 0.03 + R() * 0.04], '#2a2a2e', 0.18);
    B.box('glow', [0.05, 0.002, 0.04], [0.02, 0.003, 0.0], '#1a2c26', { ao: false });
  } else if (c === 'l2fabric') {
    for (let i = 0; i < 5; i++) { const [x, z] = P(0.16); B.sph('fabric', [0.05 + R() * 0.04, 0.02, 0.04 + R() * 0.03], [x, 0.012, z], i % 2 ? '#c8b878' : '#6a5238', { w: 7, h: 4, r: [0, R() * 6, 0] }); }
    for (let i = 0; i < 4; i++) pl('wood', [0.14 + R() * 0.08, 0.016, 0.03], '#6a4a2e', 0.2);
    for (let i = 0; i < 3; i++) { const [x, z] = P(0.18); B.seg('iron', [x, 0.01, z], [x + R() * 0.06, 0.02, z + R() * 0.06], 0.003, 0.003, '#8a8e96', 4); }
  } else t3MRubble(B, 'wood');
}
function l2RubbleCat(q) {   // la categoria delle macerie dipende dal materiale dell'arredo
  const m = q.mat || 'wood';
  return m === 'metal' ? 'l2metal' : m === 'glass' ? 'l2glass' : (m === 'wood' && q.type === 'deco' && DECOR[1][q.k] && /couch|mattress|bedframe|chair|plant/.test(DECOR[1][q.k].n)) ? 'l2fabric' : 'wood';
}

// scala di ogni arredo rispetto al vero (gli sprite 2D e l'altezza dei colpi sono piu grandi)
const L2_PSC = { vending: 1.15, lockers: 1.2, fridge: 1.2, cabinet: 1.2, cooler: 1.3, xbarrel: 1.4 };
// la funzione che usa t3Sync: casse e bauli restano quelli del piano 1
function t3Props2(q) {
  if (q.type === 'crate' || q.type === 'chest') return t3Props(q);
  l2Kit();
  const n = q.type === 'xbarrel' ? 'xbarrel' : DECOR[1][q.k].n, hs = Math.abs(Math.floor(q.x * 7.3 + q.y * 11.1)), g = new THREE.Group();
  const v = hs % 3, key = 'l2_' + n + '#' + v;
  const k = L2_PSC[n] || 1.3;   // i pezzi 2D sono piu grandi del vero: la scala e cotta nella geometria, cosi anche i frammenti della rottura la rispettano
  for (const p of t3PropGeo(key, B => { l2Keys(B); B.in([0, 0, 0], null, [k, k, k], () => l2PropBuild(B, n, v)); })) g.add(new THREE.Mesh(p.g, p.m));
  g.userData.brk = key; g.userData.nm = key;
  if (q.flip) g.rotation.y = Math.PI; g.rotation.y += (q.x * 7.3 + q.y * 3.1) % 1.2;
  return g;
}

/* ======================================================================
   CASTEDDISH - Piano 2: bile dei ghoul e aggiornamento a ogni fotogramma
   I ghoul non sanguinano: ogni proiettile che li colpisce fa schizzare bile giallo-verde (gocce, macchie su muri e pavimento,
   nebbiolina) e da morti restano in una pozza di bile con bolle che salgono e scoppiano. Il sistema e quello del sangue di
   world-3d.js (stesso codice, secondo gruppo T3.bile con colori propri): qui c'e solo il ricolore e le bolle.
   t3Sync2 gira a ogni fotogramma del piano 2: sfarfallio dei tubi e bolle dei cadaveri.
   ====================================================================== */
function l2Bilify(cv) {   // il sangue disegnato in rosso scuro diventa bile: stessa forma, canali riordinati (rosso -> verde)
  const g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const r = d[i]; d[i] = r * 0.62; d[i + 1] = Math.min(255, r * 1.1); d[i + 2] = d[i + 2] * 0.6; }
  g.putImageData(im, 0, 0); return cv;
}

// bolle sui ghoul morti (come corpseFx del motore 2D): ognuna gonfia, scoppia e ne nasce un'altra altrove sulla pozza
function l2Bubbles() {
  const BU = L2.bub || (L2.bub = { sp: [], tex: null }); let used = 0;
  if (curFloor === 1 && typeof SH !== 'undefined' && SH.bubble && T3.root) {
    BU.tex = BU.tex || new THREE.CanvasTexture(SH.bubble);
    for (const e of enemies) {
      if (e.type !== 'ghoul' || e.alive || e.burned || e.deathTimer > 8 || (e.x - player.x) ** 2 + (e.y - player.y) ** 2 > 196) continue;
      const m = T3.mobs.get(e); if (!m || !m.visible) continue;
      const u = m.userData, S = u.sc || 1, dt = e.deathTimer, seed = e.x * 13.7 + e.y * 7.1, out = Math.min(1, Math.max(0, (8 - dt) / 1.5)), yaw = (u.yaw === null || u.yaw === undefined) ? (u.hd || 0) : u.yaw;
      const cx = e.x - Math.sin(yaw) * 0.35 * S, cz = e.y - Math.cos(yaw) * 0.35 * S, fl = world1H(cx, cz), half = 0.2 * S * (0.35 + 0.65 * Math.min(1, dt / 0.6));
      for (let k = 0; k < 6; k++) {
        const t = tNow * 0.8 + k * 0.53 + seed * (k + 1), cyc = Math.floor(t), uu = t - cyc;
        const lx = (hash1(cyc * 3.1 + k * 7.7 + seed) * 2 - 1) * half, lz = (hash1(cyc * 5.3 + k * 2.9 + seed) * 2 - 1) * half;
        const bm = 0.05 + hash1(cyc * 1.7 + k) * 0.05, pop = uu > 0.82 ? (uu - 0.82) / 0.18 : 0, b = bm * (0.25 + 0.75 * Math.min(1, uu / 0.82)) * (1 + 0.5 * pop) * 1.5;
        let sp = BU.sp[used];
        if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: BU.tex, transparent: true, depthWrite: false, opacity: 0 })); sp.renderOrder = 3; T3.root.add(sp); BU.sp.push(sp); }
        used++; sp.visible = true; sp.position.set(cx + lx, fl + 0.015 + b * 0.5, cz + lz); sp.scale.set(b, b, 1);
        sp.material.opacity = Math.min(1, uu * 8) * (1 - pop) * 0.9 * Math.min(1, dt * 3) * out;
      }
    }
  }
  for (let i = used; i < BU.sp.length; i++) BU.sp[i].visible = false;
}

function t3Sync2() {
  for (const c of chands) {   // i tubi fluorescenti sfarfallano: la lampadina e l'alone seguono la luce
    const m = T3.prop.get(c); if (!m) continue;
    const u = m.userData; if (!u.bulb || !u.bc) continue;
    const f = c.fz !== undefined ? l2Flick(c.fz) : 1;
    u.bulb.material.color.copy(u.bc).multiplyScalar(0.25 + 0.75 * f);
    if (u.halo) u.halo.material.opacity = u.hop * f;
  }
  l2Bubbles();
}
