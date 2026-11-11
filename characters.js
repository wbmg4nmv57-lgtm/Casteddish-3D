/* ======================================================================
   CASTEDDISH - Personaggi: giocatore e tipi di nemico
   Oggetto player, statistiche dei nemici (TYPES: vita, velocita,
   danno) e mkEnemy() che crea un nemico.
   ====================================================================== */

const player = { x: 3.5, y: 3.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.9, moveSpeed: 3.2, rotSpeed: 2.4, radius: 0.25, hp: 100, kills: 0, pitch: 0 };

const TYPES = {
  demon: { hp: 100, spd: 1.3, dmg: 12, sc: 1 },
  ghoul: { hp: 170, spd: 1.75, dmg: 16, sc: 0.95 },
  wraith: { hp: 140, spd: 2.0, dmg: 20, sc: 1, lift: 0.12 },
  witch: { hp: 260, spd: 1.5, dmg: 14, sc: 1 },
  boss: { hp: 1500, spd: 0.75, dmg: 28, sc: 1.9, r: 1.0 },
  bk: { hp: 900, spd: 0.8, dmg: 22, sc: 1.7, r: 0.9, boss: true, name: 'RE SCHELETRO' },
  golem: { hp: 1500, spd: 0.6, dmg: 30, sc: 2.1, r: 1.1, boss: true, name: 'GOLEM DI PIETRA' },
  lich: { hp: 800, spd: 1.0, dmg: 18, sc: 1.6, r: 0.7, lift: 0.2, boss: true, name: 'NEGROMANTE' },
  knight: { hp: 1100, spd: 1.3, dmg: 28, sc: 1.8, r: 0.85, boss: true, name: 'CAVALIERE NERO' },
  spider: { hp: 700, spd: 2.2, dmg: 18, sc: 1.6, r: 0.9, boss: true, name: 'RAGNO GIGANTE' },
  inferno: { hp: 1000, spd: 0.9, dmg: 26, sc: 2.0, r: 1.0, boss: true, name: 'DEMONE INFERNALE' },
  cyclops: { hp: 1600, spd: 0.7, dmg: 32, sc: 2.2, r: 1.1, boss: true, name: 'CICLOPE' },
  vamp: { hp: 850, spd: 1.8, dmg: 20, sc: 1.6, r: 0.7, boss: true, name: 'SIGNORE DEI VAMPIRI' },
  wyrm: { hp: 1300, spd: 1.0, dmg: 24, sc: 2.0, r: 1.0, boss: true, name: 'DRAGO DI GHIACCIO' },
  storm: { hp: 1200, spd: 1.1, dmg: 22, sc: 1.8, r: 0.8, lift: 0.3, boss: true, name: 'ARCIMAGO DELLA TEMPESTA' },
  skel: { hp: 30, spd: 2.4, dmg: 6, sc: 0.5, r: 0.3, minion: true }
};
const mkEnemy = (x, y, type) => {
  const T = TYPES[type], z0 = T.lift || 0, v = Math.floor(Math.random() * VARS[type].length), hs = (VARS[type][v][2] && VARS[type][v][2].hs) || 1;
  const mo = VARS[type][v][2] || {}, roll = Math.random(), bh = mo.abil ? 'normal' : type === 'demon' ? (roll < 0.35 ? 'normal' : roll < 0.65 ? 'flank' : roll < 0.85 ? 'feint' : 'arc') : type === 'ghoul' || type === 'witch' ? (roll < 0.33 ? 'normal' : roll < 0.55 ? 'flank' : roll < 0.7 ? 'feint' : roll < 0.84 ? 'arc' : 'coward') : type === 'wraith' ? (roll < 0.45 ? 'normal' : roll < 0.75 ? 'flank' : 'arc') : type === 'skel' ? (roll < 0.5 ? 'normal' : roll < 0.8 ? 'arc' : 'flank') : 'normal';
  return { x, y, type, hp: T.hp * DIFF.hp, alive: true, state: 'walk', frame: 0, animTimer: 0, deathTimer: 0,
    r: T.r || 0.45, z0, z1: z0 + T.sc * hs + 0.1, shotT: 1 + Math.random(), cast: 0, t: 0, waves: 0, sumT: 0, mhp: T.hp * DIFF.hp, vT: 1 + Math.random() * 3, vC: 0, v, hs, bh, bs: 'idle', bt: 0, act: false, back: false, sp: mo.sp || 1, pw: mo.pw || 1, abil: mo.abil || null, ai: null, side: Math.random() < 0.5 ? 1 : -1, escT: 0, path: null, pi: 0 };
};
