// Waves: the night's assault, one wave at a time. A wave is a queue of kinds built from
// its composition; they trickle in from the edges while the queue lasts, and the wave
// ends when the queue is empty and nothing hostile remains. Every fifth wave the Gloom
// Moth comes with them. Between waves the garden breathes for a few seconds.

import { BETWEEN_WAVES, MAX_ALIVE, waveComposition } from './config.js';
import { KIND_BOSS, KIND_EATER, KIND_MOTH, KIND_THORN } from './enemies.js';

export function createWaves() {
  return {
    wave: 0,
    queue: [],
    spawnTimer: 0,
    interval: 1,
    hpScale: 1,
    speedScale: 1,
    betweenTimer: 0,
    active: false,
    banner: 0,
    bannerText: '',
    bannerSub: '',
  };
}

export function resetWaves(waves) {
  Object.assign(waves, createWaves());
}

/** Build the queue for wave `n` and start the trickle. */
export function startWave(waves, random, n) {
  const comp = waveComposition(n);
  const queue = [];
  const push = (kind, count) => {
    for (let i = 0; i < count; i += 1) queue.push(kind);
  };
  push(KIND_THORN, comp.thorns);
  push(KIND_EATER, comp.eaters);
  push(KIND_MOTH, comp.moths);
  // Shuffle the escorts, then the boss strides in last, once the wave is thinned.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  push(KIND_BOSS, comp.boss);
  waves.wave = n;
  waves.queue = queue;
  waves.interval = comp.interval;
  waves.hpScale = comp.hpScale;
  waves.speedScale = comp.speedScale;
  waves.spawnTimer = 0.6;
  waves.active = true;
  waves.betweenTimer = 0;
  waves.banner = 2.4;
  waves.bannerText = n % 5 === 0 ? `WAVE ${n} — THE GLOOM MOTH` : `WAVE ${n}`;
  waves.bannerSub = n % 5 === 0
    ? 'burn the boss — its brood follows'
    : n === 3 ? 'new foe: thorn wisps creep for the lantern'
      : n === 4 ? 'new foe: ember-eaters hunt the keeper'
        : n === 1 ? 'moths drift in — guard the flame'
          : '';
}

/** Begin the calm between waves. */
export function startBetweenWaves(waves) {
  waves.active = false;
  waves.betweenTimer = BETWEEN_WAVES;
  waves.banner = 2.0;
  waves.bannerText = 'THE GARDEN BREATHES…';
  waves.bannerSub = 'the lantern mends — catch your breath';
}

/**
 * Advance the wave clock. Returns the next kind to spawn this step (or null), and sets
 * `waves.readyForNext` when the lull has run out and the next wave should begin.
 */
export function stepWaves(waves, dt, aliveCount) {
  waves.readyForNext = false;
  if (waves.banner > 0) waves.banner = Math.max(0, waves.banner - dt);
  if (waves.active) {
    if (waves.queue.length > 0 && aliveCount < MAX_ALIVE) {
      waves.spawnTimer -= dt;
      if (waves.spawnTimer <= 0) {
        waves.spawnTimer = waves.interval;
        return waves.queue.shift();
      }
    }
    return null;
  }
  if (waves.betweenTimer > 0) {
    waves.betweenTimer -= dt;
    if (waves.betweenTimer <= 0) waves.readyForNext = true;
  }
  return null;
}

/** True when the wave is over: nothing left to spawn and nothing left alive. */
export function waveCleared(waves, aliveCount) {
  return waves.active && waves.queue.length === 0 && aliveCount === 0;
}

/** How many foes are still coming or still standing, for the HUD. */
export function enemiesRemaining(waves, aliveCount) {
  return waves.queue.length + aliveCount;
}
