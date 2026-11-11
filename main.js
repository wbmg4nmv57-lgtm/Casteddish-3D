/* ======================================================================
   CASTEDDISH - Avvio del gioco
   window.onload: carica l'audio, genera gli sprite e avvia comandi,
   menu e impostazioni.
   ====================================================================== */

window.onload = () => {
  startAudioLoad();
  generateDemonSprites();
  setupInput();
  drawMiniLegend();
  const prefs = loadPrefs() || {};
  setupMenu(prefs);
  measureStage(); window.addEventListener('resize', measureStage); window.addEventListener('orientationchange', measureStage);
  loadLayout(); applyLayout(); for (const [id] of ELEMS) clampLayoutEl(id);
  setupSettings();
  document.getElementById('btnRetry').addEventListener('click', () => { if (diffKey === 'hard') relaunch(true); else respawn(); });
  document.getElementById('btnMenu').addEventListener('click', () => relaunch(false));
  if (prefs.auto && DIFFS[prefs.diff]) { savePrefs({ diff: prefs.diff, timed: !!prefs.timed, level: prefs.level || 0, auto: false }); startGame(prefs.diff, !!prefs.timed, prefs.level || 0); }
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
};
