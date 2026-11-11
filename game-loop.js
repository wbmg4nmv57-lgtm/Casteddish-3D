/* ======================================================================
   CASTEDDISH - Ciclo di gioco
   gameLoop(): chiama update() e render() a ogni fotogramma.
   ====================================================================== */

/* ---------- Game loop ---------- */
let lastTime = performance.now(), frameCount = 0, fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  rawDt = lastTime ? Math.min((now - lastTime) / 1000, 0.5) : 0;
  lastTime = now;
  frameCount++; fpsTimer += dt;
  if (fpsTimer >= 1.0) {
    fpsEl.textContent = `FPS: ${frameCount}`;
    frameCount = 0; fpsTimer = 0;
  }
  if (gameStarted) { stepMinimap(dt); if (!paused) { update(dt); if (!endShown && (player.hp <= 0 || won)) showEnd(); } }
  render();
  if (ed.on) placeHandles();
  requestAnimationFrame(gameLoop);
}
