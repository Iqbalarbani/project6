// ============================================================
// config.js â€” Konstanta & konfigurasi terpusat
// Semua angka balance menara, musuh, wave, skill, dan tile ada
// di sini agar mudah di-tuning tanpa menyentuh logika permainan.
// ============================================================

export const GRID = {
  cols: 15,
  rows: 10,
  tileSize: 64,
};

export const COLORS = {
  bg: '#0f1420',
  bg2: '#1a2233',
  panel: '#222c40',
  grid: '#2c3a52',
  gridHover: '#3a4b68',
  accent: '#4ecca3',
  danger: '#e94560',
  gold: '#f2c94c',
  text: '#e8edf5',
  muted: '#8b9bb4',
  towerArrow: '#4ecca3',
  towerCannon: '#e94560',
  towerIce: '#56b6ff',
  spawn: '#b06bff',
  base: '#f2c94c',
  rock: '#3a4560',
  boss: '#b06bff',
  skill: '#f2c94c',
};

export const TILE = {
  EMPTY: 0,
  SPAWN: 2,
  BASE: 3,
  BLOCKED: 4,
};

export const SPAWN_POS = { c: 0, r: 4 };
export const BASE_POS = { c: 14, r: 5 };

export const ROCK_POSITIONS = [
  [2, 1], [2, 2], [2, 7], [2, 8],
  [5, 4], [5, 5], [9, 4], [9, 5],
  [12, 1], [12, 2], [12, 7], [12, 8],
  [7, 0], [7, 9],
];

// Konfigurasi menara (balancing Tahap 6)
export const TOWER_TYPES = {
  arrow: {
    name: 'Menara Panah',
    cost: 50,
    range: 2.5,
    damage: 9,
    fireRate: 1.5,
    projectileSpeed: 420,
    color: COLORS.towerArrow,
    upgrades: [
      { cost: 55, damage: 13, fireRate: 1.8, range: 2.8 },
      { cost: 85, damage: 19, fireRate: 2.2, range: 3.1 },
    ],
  },
  cannon: {
    name: 'Menara Meriam',
    cost: 85,
    range: 2.2,
    damage: 22,
    fireRate: 0.5,
    splash: 1.2,
    projectileSpeed: 300,
    color: COLORS.towerCannon,
    upgrades: [
      { cost: 95, damage: 34, fireRate: 0.6, splash: 1.4 },
      { cost: 135, damage: 50, fireRate: 0.7, splash: 1.6 },
    ],
  },
  ice: {
    name: 'Menara Es',
    cost: 70,
    range: 2.0,
    damage: 4,
    fireRate: 1.0,
    slowFactor: 0.5,
    slowDuration: 1.5,
    projectileSpeed: 380,
    color: COLORS.towerIce,
    upgrades: [
      { cost: 70, damage: 7, slowFactor: 0.4, slowDuration: 2.0 },
      { cost: 100, damage: 10, slowFactor: 0.3, slowDuration: 2.5 },
    ],
  },
};

// Konfigurasi musuh (Tahap 6: tambah boss)
export const ENEMY_TYPES = {
  normal: {
    name: 'Normal',
    hp: 40,
    speed: 70,
    reward: 8,
    color: '#c0c8d8',
    radius: 14,
  },
  fast: {
    name: 'Cepat',
    hp: 25,
    speed: 120,
    reward: 6,
    color: '#56b6ff',
    radius: 11,
  },
  tank: {
    name: 'Tank',
    hp: 140,
    speed: 40,
    reward: 20,
    color: '#e94560',
    radius: 18,
  },
  // Boss: HP tinggi, lambat, punya aura yang memperlambat menara di dekatnya
  boss: {
    name: 'Boss',
    hp: 1400,
    speed: 30,
    reward: 300,
    color: COLORS.boss,
    radius: 26,
    isBoss: true,
    auraRadius: 3.0,     // dalam tile
    auraSlow: 0.5,       // menara di aura menembak 50% lebih lambat
  },
};

// Skill aktif: Serangan Udara
export const SKILLS = {
  airStrike: {
    name: 'Serangan Udara',
    cooldown: 25,        // detik
    radius: 2.5,         // tile
    damage: 160,
    color: COLORS.skill,
  },
};

// Pengaturan awal permainan
export const GAME = {
  startingGold: 175,
  startingLives: 20,
  sellRatio: 0.6,
};

// Konfigurasi wave (10 wave; wave terakhir ada boss)
export const WAVES = [
  { groups: [{ type: 'normal', count: 5 }], spawnInterval: 1.0 },
  { groups: [{ type: 'normal', count: 8 }], spawnInterval: 0.9 },
  { groups: [{ type: 'fast', count: 6 }, { type: 'normal', count: 3 }], spawnInterval: 0.8 },
  { groups: [{ type: 'normal', count: 6 }, { type: 'tank', count: 1 }], spawnInterval: 1.0 },
  { groups: [{ type: 'fast', count: 10 }], spawnInterval: 0.6 },
  { groups: [{ type: 'normal', count: 8 }, { type: 'tank', count: 2 }], spawnInterval: 0.9 },
  { groups: [{ type: 'fast', count: 8 }, { type: 'tank', count: 3 }], spawnInterval: 0.8 },
  { groups: [{ type: 'normal', count: 10 }, { type: 'fast', count: 6 }], spawnInterval: 0.7 },
  { groups: [{ type: 'tank', count: 5 }, { type: 'fast', count: 10 }], spawnInterval: 0.8 },
  { groups: [{ type: 'normal', count: 8 }, { type: 'fast', count: 8 }, { type: 'tank', count: 4 }, { type: 'boss', count: 1 }], spawnInterval: 0.7 },
];
