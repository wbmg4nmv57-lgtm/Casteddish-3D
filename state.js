/* ======================================================================
   CASTEDDISH - Stato di gioco e controlli
   Liste di nemici e proiettili, stato dei comandi (tastiera, joystick)
   e variabili di fuoco.
   ====================================================================== */

let enemies = [], hordes = [];
let projectiles = [], explosions = [];
let isFiring = false, fireAnimFrame = 0, fireTimer = 0, fireCooldown = 0, audioCtx = null;

// Keyboard / rotation-button state
const input = { fwd: false, back: false, strafeL: false, strafeR: false, rotL: false, rotR: false };
// Keyboard commands switch on only on a PC (mouse + hover) or as soon as a real keyboard key is pressed (tablet or phone with a keyboard attached)
const kb = { on: false, mouse: false };
let menuApi = null;
// Analog joystick state: x (right +), y (down +), both in [-1, 1]
const joy = { x: 0, y: 0, id: null };
