/* ======================================================================
   CASTEDDISH - Sprite degli effetti
   Sprite dei colpi nemici e degli effetti speciali (makeFx).
   ====================================================================== */

// ---- sprites for the enemy shots and the effects ----
const SH = {};
function makeFx() {
  const cv = (name, size, draw) => { const c = mk(); c.width = c.height = size; draw(c.getContext('2d'), size); SH[name] = c; };
  const rad = (name, stops) => cv(name, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(q => gr.addColorStop(q[0], q[1])); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  rad('plasma', [[0, '#ffffff'], [0.3, '#f0b0ff'], [0.65, '#a020e0'], [1, 'rgba(80,0,140,0)']]);
  rad('fire', [[0, '#fff6c0'], [0.35, '#ffb020'], [0.7, '#e03a0a'], [1, 'rgba(120,20,0,0)']]);
  rad('venom', [[0, '#f4ffd0'], [0.4, '#8aff3a'], [0.75, '#2a9a1a'], [1, 'rgba(0,80,0,0)']]);
  rad('bullet', [[0, '#ffffff'], [0.4, '#ffe066'], [1, 'rgba(255,160,0,0)']]);
  rad('sparkB', [[0, '#ffffff'], [0.35, '#bfe8ff'], [1, 'rgba(60,140,255,0)']]);
  rad('sparkR', [[0, '#ffffff'], [0.35, '#ffb0a0'], [1, 'rgba(255,40,20,0)']]);
  rad('markR', [[0, 'rgba(255,60,40,0)'], [0.5, 'rgba(255,60,40,.35)'], [0.8, 'rgba(255,120,60,.9)'], [1, 'rgba(255,60,40,0)']]);
  rad('smoke', [[0, 'rgba(70,64,58,.95)'], [0.55, 'rgba(38,34,31,.6)'], [1, 'rgba(14,12,11,0)']]);
  rad('vapor', [[0, 'rgba(238,244,255,.7)'], [0.45, 'rgba(222,230,246,.38)'], [1, 'rgba(210,220,240,0)']]);
  cv('bubble', 64, (g) => {
    const gr = g.createRadialGradient(26, 24, 2, 32, 32, 28);
    gr.addColorStop(0, 'rgba(240,255,170,.95)'); gr.addColorStop(0.35, 'rgba(170,205,40,.6)'); gr.addColorStop(0.85, 'rgba(110,150,20,.55)'); gr.addColorStop(1, 'rgba(60,90,10,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
    g.strokeStyle = 'rgba(225,255,120,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 25, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,230,.9)'; g.beginPath(); g.ellipse(23, 21, 6, 4, -0.6, 0, 7); g.fill();
  });
  rad('markB', [[0, 'rgba(60,140,255,0)'], [0.5, 'rgba(60,140,255,.35)'], [0.8, 'rgba(160,220,255,.9)'], [1, 'rgba(60,140,255,0)']]);
  const ring = (name, col, fillc) => cv(name, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2); gr.addColorStop(0, fillc + '00'); gr.addColorStop(0.7, fillc + '55'); gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
    g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 5, 0, 7); g.stroke();
  });
  ring('ringW', '#e8dcc0', '#c8b890'); ring('ringR', '#ff6a3a', '#ff3a1a'); ring('ringB', '#8ad8ff', '#4a9aff'); ring('ringP', '#d070ff', '#9020e0');
  cv('col', 64, (g, w) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(120,190,255,0)'); gr.addColorStop(0.5, 'rgba(200,230,255,.8)'); gr.addColorStop(1, 'rgba(120,190,255,0)');
    g.fillStyle = gr; g.fillRect(w * 0.2, 0, w * 0.6, w); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(32, 0); g.lineTo(26, 14); g.lineTo(38, 26); g.lineTo(28, 40); g.lineTo(36, 52); g.lineTo(32, 64); g.stroke();
  });
  cv('rock', 64, (g) => { g.beginPath(); g.moveTo(12, 44); g.lineTo(8, 28); g.lineTo(22, 12); g.lineTo(44, 10); g.lineTo(56, 26); g.lineTo(50, 46); g.lineTo(30, 54); g.closePath(); g.fillStyle = '#8a8a82'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#2a2a26'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(20, 18, 14, 5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(30, 36, 16, 8); });
  cv('barrel', 64, (g) => { g.fillStyle = '#7a4a22'; g.beginPath(); g.ellipse(32, 32, 20, 26, 0, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#2a1608'; g.stroke(); g.strokeStyle = '#2a2a30'; g.lineWidth = 4; for (const y of [16, 32, 48]) { g.beginPath(); g.moveTo(14, y); g.lineTo(50, y); g.stroke(); } });
  cv('crate', 64, (g) => { g.fillStyle = '#9a6a34'; g.fillRect(10, 10, 44, 44); g.strokeStyle = '#2a1608'; g.lineWidth = 3; g.strokeRect(10, 10, 44, 44); g.beginPath(); g.moveTo(10, 10); g.lineTo(54, 54); g.moveTo(54, 10); g.lineTo(10, 54); g.stroke(); });
  cv('bone', 64, (g) => { g.lineCap = 'round'; g.strokeStyle = '#100000'; g.lineWidth = 9; g.beginPath(); g.moveTo(14, 50); g.lineTo(50, 14); g.stroke(); g.strokeStyle = '#efe8d0'; g.lineWidth = 5; g.stroke(); for (const q of [[12, 44], [20, 52], [44, 12], [52, 20]]) { g.fillStyle = '#efe8d0'; g.beginPath(); g.arc(q[0], q[1], 5, 0, 7); g.fill(); } });
  cv('skull', 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(120,255,160,.9)'); gr.addColorStop(1, 'rgba(0,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e8e8d8'; g.strokeStyle = '#102010'; g.lineWidth = 2; g.beginPath(); g.ellipse(32, 28, 13, 14, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(24, 38, 16, 8); g.fillStyle = '#0a1a0a'; g.beginPath(); g.ellipse(26, 28, 4, 5, 0, 0, 7); g.ellipse(38, 28, 4, 5, 0, 0, 7); g.fill(); });
  cv('web', 64, (g) => { g.strokeStyle = 'rgba(240,240,255,.95)'; g.lineWidth = 2.2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); g.stroke(); } for (const r of [9, 17, 25]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4; if (i) g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); else g.moveTo(32 + r, 32); } g.stroke(); } });
  cv('ice', 64, (g) => { g.fillStyle = '#bfeaff'; g.strokeStyle = '#2a78c8'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 4); g.lineTo(44, 30); g.lineTo(32, 60); g.lineTo(20, 30); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(32, 10); g.lineTo(38, 30); g.lineTo(32, 30); g.closePath(); g.fill(); });
  cv('bat', 64, (g) => { g.fillStyle = '#1a0a1a'; g.strokeStyle = '#000000'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 26); g.lineTo(14, 10); g.lineTo(4, 26); g.lineTo(14, 24); g.lineTo(18, 34); g.lineTo(26, 30); g.lineTo(32, 38); g.lineTo(38, 30); g.lineTo(46, 34); g.lineTo(50, 24); g.lineTo(60, 26); g.lineTo(50, 10); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff2a3a'; g.fillRect(28, 26, 3, 3); g.fillRect(34, 26, 3, 3); });
  cv('dark', 64, (g) => { const gr = g.createRadialGradient(32, 32, 6, 32, 32, 32); gr.addColorStop(0, 'rgba(210,120,255,.9)'); gr.addColorStop(1, 'rgba(60,0,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a0630'; g.strokeStyle = '#c070ff'; g.lineWidth = 2.5; g.beginPath(); g.arc(32, 32, 22, -1.2, 1.2); g.arc(26, 32, 17, 1.0, -1.0, true); g.closePath(); g.fill(); g.stroke(); });
}
