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
