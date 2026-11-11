/* ======================================================================
   CASTEDDISH - Piano 1 in 3D (Three.js)
   Muri, pavimento, soffitto, luci, mostri, oggetti di scena e raccoglibili
   sono veri oggetti 3D. Gli altri piani usano ancora il motore 2D.
   Se Three.js non si carica o qualcosa va storto, torna da solo al 2D.
   ====================================================================== */
const T3 = { on: false, failed: false, sig: '', stamp: 0, mobs: new Map(), prj: new Map(), eprj: new Map(), pick: new Map(), prop: new Map(), icons: new Map(), bars: new Map(), chd: [] };

function t3Tex(cv) { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t; }
function t3Mat(c, r) { return new THREE.MeshStandardMaterial({ color: c, roughness: r || 0.85 }); }
const t3Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function t3Init() {
  const gl = new THREE.WebGLRenderer({ antialias: true });
  gl.setSize(RENDER_WIDTH * 2, RENDER_HEIGHT * 2, false);
  gl.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
  document.getElementById('stage').insertBefore(gl.domElement, canvas);   // sotto il canvas 2D (arma e scritte)
  T3.gl = gl; T3.cv = gl.domElement; T3.scene = new THREE.Scene();
  T3.cam = new THREE.PerspectiveCamera(50, 2, 0.05, 40);
  T3.amb = new THREE.AmbientLight(0xffffff, 0.3); T3.scene.add(T3.amb);
  T3.hand = new THREE.PointLight(0xffd9a0, 0.45, 5, 1.5); T3.scene.add(T3.hand);
  T3.lights = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffaa44, 1, 7, 1.6); T3.scene.add(l); T3.lights.push(l); }
  T3.on = true;
}

// ---------- il livello: muri, pavimento, soffitto, scale ----------
function t3Build() {
  const sc = T3.scene, P = PAL[0];
  if (T3.root) sc.remove(T3.root);
  const root = T3.root = new THREE.Group(); sc.add(root);
  for (const m of [T3.mobs, T3.prj, T3.eprj, T3.pick, T3.prop, T3.bars]) m.clear();
  T3.chd = [];
  const fog = new THREE.Color(fogC[0] / 255, fogC[1] / 255, fogC[2] / 255);
  sc.fog = new THREE.FogExp2(fog, 0.17); T3.gl.setClearColor(fog);
  const tile = (buf) => {
    const c = document.createElement('canvas'); c.width = c.height = TS;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length * 4).slice(), TS, TS), 0, 0);
    const t = t3Tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(N, N); return t;
  };
  const plane = (buf, y, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshStandardMaterial({ map: buf ? tile(buf) : null, color: buf ? 0xffffff : 0x333333, roughness: 1 })); m.rotation.x = rx; m.position.set(N / 2, y, N / 2); root.add(m); };
  plane(floorBuf, 0, -Math.PI / 2); plane(ceilBuf, 1, Math.PI / 2);
  // muri: solo quelli che toccano uno spazio libero, un InstancedMesh per tipo di texture
  const open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && map[y * N + x] === 0;
  const by = {};
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = map[y * N + x];
    if (t > 0 && (open(x + 1, y) || open(x - 1, y) || open(x, y + 1) || open(x, y - 1))) (by[t] = by[t] || []).push(x, y);
  }
  T3.torchMats = [];
  for (const t in by) {
    const tx = wallTex[t]; if (!tx) continue;
    const arr = Array.isArray(tx), mat = new THREE.MeshStandardMaterial({ map: t3Tex(arr ? tx[0] : tx), roughness: 1 });
    if (arr) T3.torchMats.push({ mat, frames: tx.map(t3Tex) });
    else if (t == 5) T3.doorTex = mat.map;
    const im = new THREE.InstancedMesh(T3.box = T3.box || t3Box(1, 1, 1), mat, by[t].length / 2), m4 = new THREE.Matrix4();
    for (let i = 0; i < by[t].length; i += 2) { m4.setPosition(by[t][i] + 0.5, 0.5, by[t][i + 1] + 0.5); im.setMatrixAt(i / 2, m4); }
    root.add(im);
  }
  // scale: otto gradini veri che salgono verso il portale
  if (stairs) {
    const g = new THREE.Group(), y0 = stairs.y - 0.5;
    for (let i = 0; i < STAIR_STEPS; i++) { const h = 0.05 * (STAIR_STEPS - i) + 0.04, s = new THREE.Mesh(t3Box(0.8, h, 0.1), t3Mat(i % 2 ? '#6a6a70' : '#85858c')); s.position.set(stairs.x, h / 2, y0 + 0.8 - i * 0.085); g.add(s); }
    const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshBasicMaterial({ map: t3Tex(stairPortal), transparent: true, fog: false }));
    pt.position.set(stairs.x, 0.5, y0 + 0.1); g.add(pt); root.add(g);
  }
}

// ---------- mostri: veri modelli 3D con gambe e braccia che si muovono ----------
function t3Mob(e) {
  const S = STY[e.type] || STY.demon, T = TYPES[e.type] || TYPES.demon, sc = T.sc * (e.hs || 1);
  const body = t3Mat(S.c2), dark = t3Mat(S.c1), g = new THREE.Group();
  const add = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (p || g).add(o); return o; };
  const limb = (x, y, w, l, m) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); add(t3Box(w, l, w), m, 0, -l / 2, 0, p); return p; };
  add(t3Box(0.3, 0.34, 0.18), body, 0, 0.52, 0); add(t3Box(0.22, 0.1, 0.16), dark, 0, 0.34, 0);
  add(new THREE.SphereGeometry(0.1, 10, 8), body, 0, 0.79, 0.01);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: S.eye || '#ffd23a', fog: false }), s * 0.055, 0.8, 0.095);
    add(new THREE.ConeGeometry(0.03, 0.14, 6), t3Mat(S.horn || '#d9cfae'), s * 0.07, 0.9, 0).rotation.z = -s * 0.35;
  }
  const arms = [limb(-0.2, 0.68, 0.075, 0.34, t3Mat(S.arm || S.c2)), limb(0.2, 0.68, 0.075, 0.34, t3Mat(S.arm || S.c2))];
  const legs = [limb(-0.08, 0.33, 0.09, 0.33, t3Mat(S.limb || S.c1)), limb(0.08, 0.33, 0.09, 0.33, t3Mat(S.limb || S.c1))];
  add(t3Box(0.025, 0.025, 0.5), t3Mat('#5a3e22'), 0, -0.3, 0.2, arms[1]); add(t3Box(0.03, 0.18, 0.14), t3Mat('#bfc6cc', 0.4), 0, -0.3, 0.42, arms[1]);   // ascia
  g.rotation.order = 'YXZ'; g.scale.setScalar(sc); if (S.alpha) g.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = S.alpha; } });
  g.userData = { arms, legs, px: e.x, py: e.y, ph: 0, hd: 0, sc };
  return g;
}

function t3Props(q) {   // oggetti di scena: armature, rastrelliere, casse, barili, bauli
  const g = new THREE.Group(), n = q.type === 'deco' ? DECOR[0][q.k].n : q.type;
  const add = (geo, c, x, y, z, p) => { const o = new THREE.Mesh(geo, t3Mat(c)); o.position.set(x, y, z); (p || g).add(o); return o; };
  if (/^armor/.test(n)) { add(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 6), '#3a2c1c', 0, 0.06, 0); add(t3Box(0.04, 0.3, 0.04), '#3a2c1c', 0, 0.25, 0); if (n !== 'armorEmpty' && n !== 'armorWeb' && n !== 'armorBroken') { add(t3Box(0.2, 0.26, 0.12), '#8a5a38', 0, 0.45, 0); add(new THREE.SphereGeometry(0.07, 8, 6), '#7a4e30', 0, 0.68, 0); } }
  else if (/rack|^weaponRack/.test(n)) { add(t3Box(0.5, 0.04, 0.06), '#4a2c14', 0, 0.5, 0); add(t3Box(0.04, 0.5, 0.06), '#4a2c14', -0.25, 0.25, 0); add(t3Box(0.04, 0.5, 0.06), '#4a2c14', 0.25, 0.25, 0); for (let i = 0; i < 4; i++) add(t3Box(0.025, 0.45, 0.025), '#7a7e86', -0.18 + i * 0.12, 0.3, 0.05); }
  else if (n === 'barrel') add(new THREE.CylinderGeometry(0.17, 0.15, 0.4, 10), '#7a5230', 0, 0.2, 0);
  else if (n === 'urn') add(new THREE.CylinderGeometry(0.1, 0.07, 0.3, 8), '#8a8a8a', 0, 0.15, 0);
  else if (n === 'bones') add(t3Box(0.3, 0.04, 0.2), '#e0d8c0', 0, 0.02, 0);
  else if (n === 'crate') add(t3Box(0.4, 0.4, 0.4), '#7a5230', 0, 0.2, 0);
  else if (n === 'xbarrel') { add(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 10), '#8a2418', 0, 0.25, 0); add(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 10), '#e0b020', 0, 0.3, 0); }
  else if (q.type === 'deco') add(t3Box(0.3, 0.3, 0.3), '#7a5230', 0, 0.15, 0);
  else { add(t3Box(0.4, 0.2, 0.28), '#5a3a1a', 0, 0.1, 0); g.userData.lid = add(t3Box(0.4, 0.1, 0.28), '#7a5230', 0, 0.25, 0); g.userData.lid.geometry.translate(0, 0, 0.14); g.userData.lid.position.z = -0.14; }   // baule
  if (q.flip) g.rotation.y = Math.PI; g.rotation.y += (q.x * 7.3 + q.y * 3.1) % 1.2;
  return g;
}

// ---------- aggiorna la scena a ogni fotogramma ----------
function t3Stale(map) { for (const [k, m] of map) if (m.userData.f !== T3.stamp) { T3.root.remove(m); map.delete(k); } }
function t3Get(map, key, make) { let m = map.get(key); if (!m) { m = make(); map.set(key, m); T3.root.add(m); } m.userData.f = T3.stamp; return m; }

function t3Sync() {
  const cam = T3.cam, px = player.x, py = player.y, P = PAL[0], st = ++T3.stamp;
  const k = shake && shake.t > 0 ? shake.a * shake.t / shake.max * 0.004 : 0, r = () => (Math.random() - 0.5) * k;
  cam.position.set(px + r(), 0.5 + r(), py + r()); cam.lookAt(px + player.dirX, 0.5, py + player.dirY);
  // luci: le 6 torce piu vicine illuminano davvero i muri
  const gc = P.glow.split(',').map(Number), col = new THREE.Color(gc[0] / 255, gc[1] / 255, gc[2] / 255);
  const near = torches.map(q => ({ q, d: (q.x - px) ** 2 + (q.y - py) ** 2 })).sort((a, b) => a.d - b.d);
  T3.lights.forEach((l, i) => { const o = near[i]; l.visible = !!o && o.d < 120; if (o) { l.position.set(o.q.x, 0.75, o.q.y); l.color.copy(col); l.intensity = (o.q.k || 1) * 1.7 * flick; } });
  T3.amb.intensity = 0.28 * (P.amb || 1) * powerK; T3.hand.position.copy(cam.position); T3.hand.intensity = 0.45 * powerK;
  const fr = Math.floor(tNow * 9) % 4; for (const t of T3.torchMats) t.mat.map = t.frames[fr];
  if (doorAnim && T3.doorTex) T3.doorTex.needsUpdate = true;
  // mostri
  for (const e of enemies) {
    const m = t3Get(T3.mobs, e, () => t3Mob(e)), u = m.userData, T = TYPES[e.type] || TYPES.demon;
    const d2 = (e.x - px) ** 2 + (e.y - py) ** 2, dx = e.x - u.px, dy = e.y - u.py, mv = Math.hypot(dx, dy);
    m.visible = d2 < 484; u.px = e.x; u.py = e.y; if (!m.visible) continue;
    m.position.set(e.x, T.lift ? T.lift + Math.sin(tNow * 3 + e.x) * 0.04 : 0, e.y);
    if (mv > 0.002) u.hd = Math.atan2(dx, dy);
    if (e.alive && (e.state === 'attack' || e.state === 'summon' || T.boss)) u.hd = Math.atan2(px - e.x, py - e.y);
    m.rotation.y = u.hd; u.ph += mv * 14;
    const sw = Math.sin(u.ph) * Math.min(1, mv * 40);
    if (e.alive) {
      m.rotation.x = 0; u.legs[0].rotation.x = sw * 0.8; u.legs[1].rotation.x = -sw * 0.8;
      if (e.state === 'attack' || e.state === 'summon') { u.arms[0].rotation.x = u.arms[1].rotation.x = -1.5 + Math.sin(tNow * 14) * 0.35; }
      else if (e.state === 'cower') { u.arms[0].rotation.x = u.arms[1].rotation.x = -2.8; m.scale.y = u.sc * 0.6; }
      else { u.arms[0].rotation.x = -sw * 0.6; u.arms[1].rotation.x = sw * 0.6; m.scale.y = u.sc; }
    } else { m.rotation.x = -Math.min(1, e.deathTimer / 0.5) * 1.45; m.position.y += 0.05; }
    // barra vita: compare solo dopo il primo colpo
    const show = e.alive && e.hp < e.mhp && d2 < 144, b = t3Get(T3.bars, e, () => { const g = new THREE.Group(), mk = (c, z) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.04), new THREE.MeshBasicMaterial({ color: c, fog: false })); o.position.z = z; g.add(o); return o; }; mk(0x000000, 0); g.userData.fg = mk(0xdd2222, 0.001); return g; });
    b.visible = show; if (show) { const q = Math.max(0, e.hp / e.mhp); b.position.set(e.x, u.sc * 0.98 + 0.12, e.y); b.quaternion.copy(cam.quaternion); b.userData.fg.scale.x = Math.max(0.001, q); b.userData.fg.position.x = -0.2 * (1 - q); }
  }
  t3Stale(T3.mobs); t3Stale(T3.bars);
  // colpi del giocatore e dei nemici
  const dot = (map, list, size, c0) => { for (const s of list) { const m = t3Get(map, s, () => new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color: s.col || c0, fog: false }))); m.position.set(s.x, s.z != null ? s.z : 0.5, s.y); m.scale.setScalar(s.big ? 2 : 1); } };
  dot(T3.prj, projectiles, 0.06, 0xffc060); dot(T3.eprj, eShots, 0.07, 0xb04bff); t3Stale(T3.prj); t3Stale(T3.eprj);
  // raccoglibili: cubetti con l'icona, che ruotano e fluttuano
  for (const q of pickups) {
    if (q.taken) continue;
    const key = q.kind === 'arm' ? 'arm' + q.t : q.kind;
    const m = t3Get(T3.pick, q, () => { let tx = T3.icons.get(key); if (!tx && pickupIcons[key]) { tx = t3Tex(pickupIcons[key]); T3.icons.set(key, tx); } return new THREE.Mesh(t3Box(0.18, 0.18, 0.18), new THREE.MeshBasicMaterial({ map: tx, transparent: true, fog: false })); });
    m.position.set(q.x, 0.2 + Math.sin(tNow * 2.5 + q.x) * 0.03, q.y); m.rotation.y = tNow * 1.5;
  }
  t3Stale(T3.pick);
  // oggetti di scena
  for (const q of props) {
    const m = t3Get(T3.prop, q, () => { const o = t3Props(q); o.position.set(q.x, 0, q.y); return o; });
    if (m.userData.lid) m.userData.lid.rotation.x = q.open ? -1.2 : 0;
  }
  t3Stale(T3.prop);
  // lampadari appesi al soffitto
  for (const c of chands) {
    const m = t3Get(T3.prop, c, () => { const g = new THREE.Group(), fl = new THREE.MeshBasicMaterial({ color: 0xffb040, fog: false }); g.add(Object.assign(new THREE.Mesh(t3Box(0.015, 0.2, 0.015), t3Mat('#222')), { position: new THREE.Vector3(0, 0.9, 0) })); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 14), t3Mat('#3a3a3a')); ring.rotation.x = Math.PI / 2; ring.position.y = 0.78; g.add(ring); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), fl); f.position.set(Math.cos(i * 1.57) * 0.16, 0.82, Math.sin(i * 1.57) * 0.16); g.add(f); } g.position.set(c.x, 0, c.y); return g; });
  }
}

// Chiamata da render(): restituisce true se il fotogramma e stato disegnato in 3D
function render3D() {
  if (T3.failed || typeof THREE === 'undefined' || curFloor !== 0 || !gameStarted) { if (T3.cv) T3.cv.style.display = 'none'; return false; }
  try {
    if (!T3.on) t3Init();
    T3.cv.style.display = '';
    const sig = curFloor + '|' + torches.length + '|' + (torches[0] ? torches[0].x + ',' + torches[0].y : '') + '|' + map[doorCell] + '|' + (doorAnim ? doorAnim.s : '');
    if (sig !== T3.sig) { T3.sig = sig; t3Build(); }
    flick = (0.9 + 0.1 * Math.sin(tNow * 17) * Math.sin(tNow * 5.3) + (Math.random() - 0.5) * 0.06) * powerK;
    t3Sync(); T3.gl.render(T3.scene, T3.cam);
    ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);   // il canvas 2D resta sopra: arma, mirino e scritte
    renderGun();
    if (mm.t > 0 || mm.goal || (frameCount & 3) === 0) renderMinimap();
    return true;
  } catch (err) { console.error('3D disattivato, torno al 2D:', err); T3.failed = true; if (T3.cv) T3.cv.style.display = 'none'; return false; }
}
