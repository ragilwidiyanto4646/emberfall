// EMBERFALL — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. Palette: warm amber and cyan light against deep indigo dark.

export const FIELD = { width: 1280, height: 720 };
export const LANTERN = { x: 640, y: 360, radius: 30, lightRadius: 300 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Survive this many waves and dawn breaks: you win. */
export const WAVES_TO_WIN = 10;

export const PLAYER = {
  radius: 14,
  speed: 255,
  maxHp: 100,
  pickupRadius: 46,
  fireInterval: 0.34,
  boltSpeed: 640,
  boltDamage: 14,
  boltRadius: 5,
  invulnerable: 0.8,
  xpNextBase: 5,
  xpNextPerLevel: 4,
};

export const BOLT = { radius: 5, life: 1.4 };

export const SHARD = { radius: 7, value: 1, life: 25 };

/** Enemy kinds. `target` is who they hunt: 'player', 'lantern', or 'nearest'. */
export const ENEMY = {
  moth: { hp: 18, speed: 98, radius: 13, touch: 8, lanternTouch: 5, score: 10, shards: 1, target: 'nearest', colour: '#b78cff' },
  thorn: { hp: 58, speed: 52, radius: 18, touch: 14, lanternTouch: 8, score: 25, shards: 3, target: 'lantern', colour: '#7fe08a' },
  eater: { hp: 30, speed: 132, radius: 12, touch: 10, lanternTouch: 7, score: 15, shards: 2, target: 'player', colour: '#ff9d5c' },
  boss: { hp: 540, speed: 62, radius: 42, touch: 18, lanternTouch: 10, score: 200, shards: 10, target: 'nearest', colour: '#e5536b' },
};

/** Wave n (1-based) composition: how many of each kind queue up, and how fast they arrive. */
export function waveComposition(n) {
  const moths = 4 + 3 * n;
  const thorns = n >= 2 ? 1 + Math.floor(n / 2) : 0;
  const eaters = n >= 3 ? 2 * n - 2 : 0;
  const boss = n % 5 === 0 ? 1 : 0;
  const interval = Math.max(0.42, 1.05 - 0.05 * n);
  const hpScale = 1 + 0.09 * (n - 1);
  const speedScale = 1 + 0.02 * (n - 1);
  return { moths, thorns, eaters, boss, interval, hpScale, speedScale };
}

/** Seconds of calm between waves; the lantern mends a little in the lull. */
export const BETWEEN_WAVES = 4;
export const LANTERN_MEND_BETWEEN_WAVES = 12;

/** Damage per second the lantern's own flame deals to anything touching it. */
export const LANTERN_FLAME_DPS = 6;

/** At most this many enemies alive at once; the rest wait in the wave queue. */
export const MAX_ALIVE = 22;

export const LANTERN_MAX_HP = 100;
export const LANTERN_AURA_BASE_RADIUS = 95;
export const LANTERN_AURA_BASE_DPS = 0;

export const NOVA = { radius: 170, damage: 26, cooldown: 7 };

export const PALETTE = {
  backdrop: '#0d0f24',
  ground: '#141732',
  groundEdge: '#1c2050',
  lanternGlow: '#ffb347',
  lanternCore: '#ffe9b0',
  ember: '#ff9d3c',
  cyan: '#6fe3e0',
  violet: '#b78cff',
  player: '#ffd166',
  bolt: '#ffe08a',
  shard: '#7df9d4',
  text: '#f4ead8',
  muted: '#9a94c7',
  danger: '#ff5d73',
  panel: 'rgba(16, 18, 44, 0.92)',
  panelEdge: '#4a3f7a',
  card: '#1d2148',
  cardEdge: '#6f5bb5',
  cardHover: '#2a2f66',
};

export const FONT = '"Trebuchet MS", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
export const MUTE_KEY = 'emberfall.muted';
