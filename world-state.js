/* ======================================================================
   CASTEDDISH - Stato del mondo
   Armature, chiavi, lancio, casse, esplosioni, fuochi, segni sui muri
   e funzioni per sapere cosa c'e in una cella.
   ====================================================================== */

// ---- Armor, keys, throw state ----
const ARMORS = [
  { name: 'CUOIO', ap: 40, abs: 0.12, col: '#c08a50' },
  { name: 'FERRO', ap: 70, abs: 0.2, col: '#b8c2ce' },
  { name: 'ORO', ap: 100, abs: 0.3, col: '#f4c830' },
  { name: 'RUBINO', ap: 140, abs: 0.42, col: '#ff5070' }
];
const armor = { t: -1, ap: 0 };
let keys = 0, keysNeed = 3, hinted = false, thr = null, aim = null, doorAnim = null, readyMsg = false, doorHintT = 0;
const THROW_STD = (8.2 - 4.5) / 8.5;

const blk = new Uint8Array(N * N);
const CHEST_CELL = 8;   // chests block walking like any solid, but shots and throws fly over them
const blasts = [], fuses = [], shake = { t: 0, max: 1, a: 0 };
let flashA = 0, flashEl = null;
const fires = [], nebulas = [], props = [], chands = [], decals = new Map(), debris = [], rubble = [];
const SNDM = { wood: ['crate_hit', 'crate_break'], metal: ['hit_metal', 'break_metal'], stone: ['hit_stone', 'break_stone'], glass: ['hit_glass', 'break_glass'], bone: ['hit_bone', 'break_bone'], rust: ['hit_metal', 'break_metal'] };
const MARK_SIZE = { hole: 0.1, blast: 0.9, scorch: 0.55, plasma: 0.32 };
const MARK_OF = { flame: 'scorch', molotov: 'scorch', grenade: 'blast', plasma: 'plasma' };
const isWallMap = (x, y) => { const mx = Math.floor(x), my = Math.floor(y); return mx < 0 || my < 0 || mx >= N || my >= N || map[my * N + mx] > 0; };
const propAt = (x, y) => props.find(q => q.cell === Math.floor(y) * N + Math.floor(x) && q.solid !== false);
