/* ======================================================================
   CASTEDDISH - Scale 3D
   Gradini e portale delle scale tra un piano e l'altro.
   ====================================================================== */

// The alcove is one cell wide. The stairs are eight stone slabs, each a sprite at a different depth and height, so they shift against each other as you move,
// plus a glowing arch on the back wall.
const STAIR_STEPS = 8;
let stairSlabs = [], stairPortal = null;
function makeStairs() {
  let sd = 11; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  stairSlabs = [];
  for (let i = 0; i < STAIR_STEPS; i++) {
    const c = mk(); c.width = c.height = 256; const g = c.getContext('2d');
    const hh = Math.round(0.07 * (i + 1) * 256), y0 = 256 - hh, k = i / (STAIR_STEPS - 1);
    const bg = g.createLinearGradient(0, y0, 0, 256);
    bg.addColorStop(0, `rgb(${150 + k * 20},${144 + k * 18},${128 + k * 14})`);
    bg.addColorStop(0.22, `rgb(${112 + k * 14},${106 + k * 12},${96 + k * 10})`);
    bg.addColorStop(1, `rgb(${64 + k * 8},${60 + k * 7},${54 + k * 6})`);
    g.fillStyle = bg; g.fillRect(0, y0, 256, hh);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath();
    const mid = y0 + hh * 0.6; g.moveTo(0, mid); g.lineTo(256, mid);
    for (let x = (i % 2 ? 40 : 90); x < 256; x += 110) { g.moveTo(x, y0 + 8); g.lineTo(x, mid); }
    for (let x = (i % 2 ? 90 : 40); x < 256; x += 110) { g.moveTo(x, mid); g.lineTo(x, 256); }
    g.stroke();
    for (let j = 0; j < 160; j++) { g.fillStyle = rn() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,240,.08)'; g.fillRect(rn() * 256, y0 + rn() * hh, 1 + rn() * 3, 1 + rn() * 2); }
    g.fillStyle = 'rgba(255,250,225,.5)'; g.fillRect(0, y0, 256, 3);   // lit edge of the tread
    const sg = g.createLinearGradient(0, 0, 256, 0);   // darker toward the alcove walls
    sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(0.18, 'rgba(0,0,0,0)'); sg.addColorStop(0.82, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = sg; g.fillRect(0, y0, 256, hh);
    g.fillStyle = `rgba(255,205,120,${(0.03 + k * 0.17).toFixed(3)})`; g.fillRect(0, y0, 256, hh);   // warmer toward the light
    stairSlabs.push(c);
  }
  const c = mk(); c.width = c.height = 256; const g = c.getContext('2d');
  const glow = g.createRadialGradient(128, 150, 20, 128, 150, 128); glow.addColorStop(0, 'rgba(255,230,160,.55)'); glow.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
  const arch = () => { g.beginPath(); g.moveTo(44, 256); g.lineTo(44, 120); g.arc(128, 120, 84, Math.PI, 0); g.lineTo(212, 256); g.closePath(); };
  arch(); g.lineJoin = 'round'; g.strokeStyle = '#2e2a26'; g.lineWidth = 26; g.stroke(); g.strokeStyle = '#5a544b'; g.lineWidth = 12; g.stroke();
  arch(); const lg = g.createRadialGradient(128, 190, 6, 128, 170, 120);
  lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, '#fff3c0'); lg.addColorStop(0.75, '#ffc65a'); lg.addColorStop(1, '#ff9a2e'); g.fillStyle = lg; g.fill();
  g.save(); arch(); g.clip(); g.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(128, 230); g.lineTo(128 + i * 70 - 14, 20); g.lineTo(128 + i * 70 + 14, 20); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle = '#6a645a'; g.strokeStyle = '#1c1916'; g.lineWidth = 2; g.fillRect(118, 18, 20, 24); g.strokeRect(118, 18, 20, 24);
  stairPortal = c;
}

function stairsArt() {
  const c = mk(); c.width = c.height = 96; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(1, '#3a2a18');
  g.fillStyle = gr; g.fillRect(14, 4, 68, 92);
  for (let i = 0; i < 7; i++) {
    const y = 90 - i * 12, w = 76 - i * 8;
    g.fillStyle = `rgb(${120 - i * 10},${108 - i * 10},${92 - i * 9})`; g.fillRect(48 - w / 2, y, w, 12);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(48 - w / 2, y, w, 2);
  }
  return c;
}
