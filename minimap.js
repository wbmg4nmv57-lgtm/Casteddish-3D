/* ======================================================================
   CASTEDDISH - Minimappa
   Minimappa, ingrandimento a schermo intero, icone e legenda.
   ====================================================================== */

// ---- Minimap: tap to grow it to full screen (the view zooms out from the area around you to the whole level), tap again to shrink ----
const mm = { box: document.getElementById('miniBox'), shade: document.getElementById('miniShade'), legend: document.getElementById('miniLegend'), t: 0, goal: 0, e: 0, css: 88, small: null };
function toggleMinimap(force) {
  const open = force === undefined ? mm.goal === 0 : force;
  if (mm.t === 0) {   // remember where the small box sits (it depends on the safe area)
    const st = document.getElementById('stage').getBoundingClientRect(), r = mm.box.getBoundingClientRect();
    mm.small = { top: r.top - st.top, right: st.right - r.right, size: r.width };
  }
  if (open && miniCanvas.width !== 512) miniCanvas.width = miniCanvas.height = 512;
  mm.goal = open ? 1 : 0;
}
function stepMinimap(dt) {
  if (mm.t === mm.goal) return;
  mm.t += (mm.goal ? 1 : -1) * dt / 0.45;
  if (mm.goal ? mm.t >= 1 : mm.t <= 0) mm.t = mm.goal;
  const t = mm.t, e = mm.e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const st = document.getElementById('stage'), W = st.clientWidth, H = st.clientHeight, S = Math.min(W, H) - 16, s0 = mm.small, b = mm.box.style;
  if (t === 0) { b.top = b.right = b.width = b.height = b.borderRadius = b.background = b.zIndex = ''; mm.css = s0.size - 8; applyLayout(); if (miniCanvas.width !== 256) miniCanvas.width = miniCanvas.height = 256; }
  else {
    b.translate = ''; b.scale = '';   // the custom position is already part of the rectangle the animation starts from
    const size = s0.size + (S - s0.size) * e;
    b.top = (s0.top + ((H - S) / 2 - s0.top) * e) + 'px'; b.right = (s0.right + ((W - S) / 2 - s0.right) * e) + 'px';
    b.width = b.height = size + 'px'; b.borderRadius = (8 + 8 * e) + 'px'; b.background = 'rgba(0,0,0,' + (0.7 + 0.16 * e) + ')'; b.zIndex = '40';
    mm.css = size - 8;
  }
  mm.shade.style.opacity = (0.62 * e).toFixed(3); mm.legend.style.opacity = Math.max(0, (e - 0.55) / 0.45).toFixed(3);
}

// One recognisable icon per kind of thing on the map; r is the icon radius in canvas pixels
function drawMapIcon(g, kind, x, y, r, ang) {
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineWidth = Math.max(1, r * 0.3); g.strokeStyle = 'rgba(0,0,0,.9)';
  const poly = (pts, col) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0] * r, q[1] * r) : g.moveTo(q[0] * r, q[1] * r)); g.closePath(); g.fillStyle = col; g.stroke(); g.fill(); };
  switch (kind) {
    case 'player': g.rotate(ang); poly([[1.5, 0], [-1, 1.1], [-0.5, 0], [-1, -1.1]], '#00ff66'); break;
    case 'stairs': poly([[-1.1, 1], [-1.1, 0.3], [-0.4, 0.3], [-0.4, -0.4], [0.3, -0.4], [0.3, -1], [1.1, -1], [1.1, 1]], '#66ccff'); break;
    case 'chest':
      poly([[-1.1, -0.8], [1.1, -0.8], [1.1, 0.8], [-1.1, 0.8]], '#c8883a');
      g.fillStyle = '#5a3410'; g.fillRect(-1.1 * r, -0.8 * r, 2.2 * r, 0.65 * r); g.fillStyle = '#ffe27a'; g.fillRect(-0.28 * r, -0.4 * r, 0.56 * r, 0.7 * r); break;
    case 'crate':
      poly([[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]], '#8a6a40');
      g.strokeStyle = '#3d2a12'; g.lineWidth = Math.max(1, r * 0.22); g.beginPath(); g.moveTo(-0.9 * r, -0.9 * r); g.lineTo(0.9 * r, 0.9 * r); g.moveTo(0.9 * r, -0.9 * r); g.lineTo(-0.9 * r, 0.9 * r); g.stroke(); break;
    case 'xbarrel':
      poly([[-0.8, -1], [0.8, -1], [0.8, 1], [-0.8, 1]], '#d8381e');
      g.fillStyle = '#ffd23a'; g.fillRect(-0.8 * r, -0.3 * r, 1.6 * r, 0.6 * r); break;
    case 'med': poly([[-0.4, -1.2], [0.4, -1.2], [0.4, -0.4], [1.2, -0.4], [1.2, 0.4], [0.4, 0.4], [0.4, 1.2], [-0.4, 1.2], [-0.4, 0.4], [-1.2, 0.4], [-1.2, -0.4], [-0.4, -0.4]], '#3cff6a'); break;
    case 'arm': poly([[-1, -1], [1, -1], [1, 0.2], [0, 1.3], [-1, 0.2]], '#7fd8ff'); break;
    case 'ammo': poly([[-0.65, 1.1], [-0.65, -0.3], [0, -1.2], [0.65, -0.3], [0.65, 1.1]], '#ffd23a'); break;
    case 'weap': poly([[-1.3, -0.7], [1.3, -0.7], [1.3, 0.1], [0.2, 0.1], [0.2, 1.2], [-0.5, 1.2], [-0.5, 0.1], [-1.3, 0.1]], '#ff8a1a'); break;
    case 'demon': poly([[0, -1.3], [1.25, 1], [-1.25, 1]], '#ff2a2a'); break;
    case 'ghoul': poly([[-1, -1], [1, -1], [1, 1], [-1, 1]], '#a6d62a'); break;
    case 'wraith': poly([[0, -1.5], [1.05, 0], [0, 1.5], [-1.05, 0]], '#7fe8ff'); break;
    case 'witch': {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 0.65 : 1.45; pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
      poly(pts, '#ff55ff'); break;
    }
    case 'skel': g.beginPath(); g.arc(0, 0, 0.8 * r, 0, 7); g.fillStyle = '#f2f2f2'; g.stroke(); g.fill(); break;
    case 'boss':
      g.beginPath(); g.arc(0, 0, 1.2 * r, 0, 7); g.fillStyle = '#c81414'; g.stroke(); g.fill();
      g.strokeStyle = '#ffd23a'; g.lineWidth = Math.max(1, r * 0.3); g.beginPath(); g.arc(0, 0, 1.2 * r, 0, 7); g.stroke();
      g.fillStyle = '#111'; g.fillRect(-0.6 * r, -0.4 * r, 0.45 * r, 0.5 * r); g.fillRect(0.15 * r, -0.4 * r, 0.45 * r, 0.5 * r); break;
  }
  g.restore();
}
const LEGEND = [['player', 'Giocatore'], ['stairs', 'Scale'], ['chest', 'Forziere'], ['crate', 'Cassa'], ['xbarrel', 'Barile esplosivo'], ['med', 'Medikit'], ['arm', 'Armatura'], ['ammo', 'Munizioni'],
  ['weap', 'Arma'], ['demon', 'Demone'], ['ghoul', 'Ghoul'], ['wraith', 'Spettro'], ['witch', 'Strega'], ['skel', 'Scheletro'], ['boss', 'Boss']];
function drawMiniLegend() {
  const cv = mm.legend, g = cv.getContext('2d'); cv.width = 264; cv.height = 420; g.scale(2, 2);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); if (g.roundRect) g.roundRect(0, 0, 132, 210, 8); else g.rect(0, 0, 132, 210); g.fill();
  g.font = 'bold 10px "Courier New", monospace'; g.textBaseline = 'middle';
  LEGEND.forEach(([k, name], i) => { drawMapIcon(g, k, 14, 7 + i * 14, 4.4, 0); g.fillStyle = '#e5e7eb'; g.fillText(name, 28, 7.5 + i * 14); });
}

function renderMinimap() {
  const size = miniCanvas.width, e = mm.e, g = miniCtx, Rz = 12 + 12 * e;   // half-width of the view in cells: 12 around the player, 24 = the whole level
  const cx = player.x + (N / 2 - player.x) * e, cy = player.y + (N / 2 - player.y) * e;
  const cw = size / (Rz * 2), ox = cx - Rz, oy = cy - Rz, r = (3.2 + 3 * e) * size / mm.css;
  g.fillStyle = '#05060a'; g.fillRect(0, 0, size, size);
  const X0 = Math.max(0, Math.floor(ox)), X1 = Math.min(N, Math.ceil(ox + 2 * Rz)), Y0 = Math.max(0, Math.floor(oy)), Y1 = Math.min(N, Math.ceil(oy + 2 * Rz));
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const v = map[y * N + x];
    if (v) g.fillStyle = v === 5 ? '#c8883a' : '#454a66';
    else if (e > 0.01) g.fillStyle = 'rgba(70,84,120,' + (0.22 * e).toFixed(3) + ')';
    else continue;
    g.fillRect((x - ox) * cw, (y - oy) * cw, cw + 0.5, cw + 0.5);
  }
  const ic = (kind, x, y, k) => { const sx = (x - ox) * cw, sy = (y - oy) * cw; if (sx > -r * 3 && sy > -r * 3 && sx < size + r * 3 && sy < size + r * 3) drawMapIcon(g, kind, sx, sy, r * (k || 1), 0); };
  if (stairs) ic('stairs', stairs.x, stairs.y, 1.15);
  for (const q of props) if (q.type === 'crate' || q.type === 'xbarrel' || (q.type === 'chest' && !q.open)) ic(q.type, q.x, q.y, q.type === 'chest' ? 1 : 0.8);
  for (const p of pickups) if (!p.taken) ic(p.kind === 'med' ? 'med' : p.kind === 'arm' ? 'arm' : p.kind === 'ammo' ? 'ammo' : 'weap', p.x, p.y, 0.9);
  for (const en of enemies) if (en.alive) ic(TYPES[en.type].boss ? 'boss' : en.type, en.x, en.y, TYPES[en.type].boss ? 1.4 : en.type === 'skel' ? 0.65 : 0.95);
  const px = (player.x - ox) * cw, py = (player.y - oy) * cw, pa = Math.atan2(player.dirY, player.dirX);
  g.fillStyle = 'rgba(0,255,102,.13)'; g.beginPath(); g.moveTo(px, py); g.arc(px, py, cw * 4, pa - 0.6, pa + 0.6); g.closePath(); g.fill();
  drawMapIcon(g, 'player', px, py, r * 1.1, pa);
}
