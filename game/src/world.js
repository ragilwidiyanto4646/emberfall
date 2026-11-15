// The game's rules and state, with no drawing and no browser in it: the keeper, the
// lantern, the enemies, bolts, shards, particles and waves. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react (sounds, screens)
// without the world knowing about them. Nothing here calls Math.random: all chance flows
// through the seeded generator, so the same seed always plays the same game.

import {
  BETWEEN_WAVES, BOLT, FIELD, LANTERN, LANTERN_AURA_BASE_RADIUS, LANTERN_FLAME_DPS, LANTERN_MAX_HP,
  LANTERN_MEND_BETWEEN_WAVES, MAX_ALIVE, NOVA, PLAYER, SHARD, STEP, WAVES_TO_WIN,
} from './config.js';
import { bossSpawnTimer, enemyTarget, isBoss, moveEnemy, spawnEnemy } from './enemies.js';
import { applyUpgrade, auraDps, auraRadius, novaStats, rollChoices } from './upgrades.js';
import { createPlayer, canFire, gainXp, healPlayer, hurtPlayer, markFired, resetPlayer, stepPlayer } from './player.js';
import { createWaves, enemiesRemaining, resetWaves, startBetweenWaves, startWave, stepWaves, waveCleared } from './waves.js';

export const EVENT_KILL = 1;
export const EVENT_SHARD = 2;
export const EVENT_LEVELUP = 4;
export const EVENT_HURT = 8;
export const EVENT_LANTERN_HIT = 16;
export const EVENT_WAVE_CLEAR = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;
export const EVENT_NOVA = 256;
export const EVENT_BOSS = 512;
export const EVENT_WAVE_START = 1024;

const MAX_PARTICLES = 420;
const MAX_FLOATERS = 24;

function addParticle(state, x, y, vx, vy, life, size, colour, gravity = 0) {
  if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
  state.particles.push({ x, y, vx, vy, life, maxLife: life, size, colour, gravity });
}

function burst(state, x, y, count, colour, speed, life = 0.5, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.random() * Math.PI * 2;
    const v = speed * (0.3 + state.random() * 0.7);
    addParticle(state, x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + state.random() * 0.7), size, colour, 60);
  }
}

function addFloater(state, x, y, text, colour, size = 14) {
  if (state.floaters.length >= MAX_FLOATERS) state.floaters.shift();
  state.floaters.push({ x, y, text, colour, size, life: 0.9, maxLife: 0.9 });
}

export function createWorld(random) {
  const player = createPlayer();
  const lantern = { x: LANTERN.x, y: LANTERN.y, hp: LANTERN_MAX_HP, maxHp: LANTERN_MAX_HP, flicker: 0 };
  const waves = createWaves();

  // The garden, laid out once: grass tufts and fireflies that never move, so the
  // backdrop is the same every visit and every screenshot.
  const decor = { grass: [], fireflies: [] };
  for (let i = 0; i < 70; i += 1) {
    const x = 30 + random() * (FIELD.width - 60);
    const y = 30 + random() * (FIELD.height - 60);
    if (Math.hypot(x - LANTERN.x, y - LANTERN.y) < 130) continue;
    decor.grass.push({ x, y, size: 5 + random() * 9, phase: random() * Math.PI * 2 });
  }
  for (let i = 0; i < 26; i += 1) {
    decor.fireflies.push({ x: 40 + random() * (FIELD.width - 80), y: 40 + random() * (FIELD.height - 80), phase: random() * Math.PI * 2, speed: 0.4 + random() * 0.8 });
  }

  const state = {
    random,
    player,
    lantern,
    waves,
    decor,
    enemies: [],
    bullets: [],
    shards: [],
    particles: [],
    floaters: [],
    novas: [],
    time: 0,
    score: 0,
    kills: 0,
    over: false,
    overReason: '',
    won: false,
    shake: 0,
    flash: 0,
    hurtFlash: 0,
    pendingChoices: null,
    levelUpsPending: 0,
    attractTimer: 0,
    wave: 0,
  };

  function reset() {
    resetPlayer(player);
    lantern.hp = LANTERN_MAX_HP;
    lantern.flicker = 0;
    resetWaves(waves);
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.shards.length = 0;
    state.particles.length = 0;
    state.floaters.length = 0;
    state.novas.length = 0;
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.over = false;
    state.overReason = '';
    state.won = false;
    state.shake = 0;
    state.flash = 0;
    state.hurtFlash = 0;
    state.pendingChoices = null;
    state.levelUpsPending = 0;
    state.attractTimer = 0;
    waves.betweenTimer = 1.2;
    waves.wave = 0;
  }

  function spawnShards(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const dist = 8 + random() * 26;
      state.shards.push({
        x: Math.min(FIELD.width - 20, Math.max(20, x + Math.cos(angle) * dist)),
        y: Math.min(FIELD.height - 20, Math.max(20, y + Math.sin(angle) * dist)),
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        value: SHARD.value,
        life: SHARD.life,
        phase: random() * Math.PI * 2,
      });
    }
  }

  /** Damage one enemy; returns true when it dies (score, shards and sparks included). */
  function damageEnemy(enemy, damage, events) {
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    if (enemy.hp > 0) return events;
    enemy.dead = true;
    state.kills += 1;
    state.score += enemy.score;
    addFloater(state, enemy.x, enemy.y - enemy.radius - 6, `+${enemy.score}`, '#ffe08a', 15);
    burst(state, enemy.x, enemy.y, isBoss(enemy) ? 46 : 14, enemy.colour, isBoss(enemy) ? 260 : 170, 0.7, 4);
    burst(state, enemy.x, enemy.y, 8, '#ffe9b0', 120, 0.5, 3);
    spawnShards(enemy.x, enemy.y, enemy.shards);
    if (isBoss(enemy)) {
      state.shake = Math.max(state.shake, 0.6);
      addFloater(state, enemy.x, enemy.y - 60, 'THE GLOOM MOTH FALLS', '#ff9db0', 20);
    }
    return events | EVENT_KILL;
  }

  function fireBolts() {
    const p = player;
    const count = p.multishot;
    const spread = 0.13;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const angle = p.angle + offset;
      state.bullets.push({
        x: p.x + Math.cos(p.angle) * (p.radius + 8),
        y: p.y + Math.sin(p.angle) * (p.radius + 8),
        vx: Math.cos(angle) * PLAYER.boltSpeed,
        vy: Math.sin(angle) * PLAYER.boltSpeed,
        damage: p.damage,
        pierce: p.pierce,
        life: BOLT.life,
        radius: BOLT.radius,
        hit: [],
      });
    }
    markFired(p);
    burst(state, p.x + Math.cos(p.angle) * (p.radius + 10), p.y + Math.sin(p.angle) * (p.radius + 10), 3, '#ffd166', 90, 0.25, 2);
  }

  function fireNova() {
    const stats = novaStats(player);
    state.novas.push({ x: player.x, y: player.y, radius: 20, maxRadius: stats.radius, life: 0.45, maxLife: 0.45, damage: stats.damage });
    player.novaTimer = NOVA.cooldown;
    return stats;
  }

  function stepParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 1.6 * dt;
      pt.vy *= 1 - 1.6 * dt;
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    for (let i = state.novas.length - 1; i >= 0; i -= 1) {
      const n = state.novas[i];
      n.life -= dt;
      n.radius += (n.maxRadius - 20) * (dt / 0.45);
      if (n.life <= 0) state.novas.splice(i, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.4);
    if (state.hurtFlash > 0) state.hurtFlash = Math.max(0, state.hurtFlash - dt * 2.2);
  }

  function stepAttract(dt) {
    state.attractTimer -= dt;
    if (state.attractTimer <= 0 && state.enemies.length < 6) {
      state.attractTimer = 1.6 + random() * 1.4;
      const kind = random() < 0.7 ? 'moth' : 'eater';
      state.enemies.push(spawnEnemy(random, kind, 1, 1, 1));
    }
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      moveEnemy(enemy, dt, lantern, state.time);
      if (Math.hypot(enemy.x - lantern.x, enemy.y - lantern.y) < LANTERN.radius + enemy.radius) {
        burst(state, enemy.x, enemy.y, 8, enemy.colour, 110, 0.5, 3);
        state.enemies.splice(i, 1);
      }
    }
    stepParticles(dt);
  }

  /**
   * One fixed step of play. `move` is a unit-ish {x, y}, `aim` a field point, `firing`
   * whether the trigger is held. With `harmless` set (the title backdrop) moths drift
   * into the lantern and nothing can die. Returns a bitmask of EVENT_* flags.
   */
  function step(dt, move, aim, firing, harmless) {
    state.time += dt;
    lantern.flicker = Math.sin(state.time * 7.3) * 0.5 + Math.sin(state.time * 13.7) * 0.3 + Math.sin(state.time * 3.1) * 0.2;
    if (harmless) {
      stepAttract(dt);
      return 0;
    }
    if (state.over || state.won) {
      stepParticles(dt);
      return 0;
    }
    let events = 0;

    stepPlayer(player, dt, move, aim);
    if (canFire(player, firing)) fireBolts();

    // Nova burst.
    if (player.novaLevel > 0 && player.novaTimer <= 0) {
      const stats = fireNova();
      for (const enemy of state.enemies) {
        if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= stats.radius + enemy.radius) {
          events = damageEnemy(enemy, stats.damage, events);
        }
      }
      events |= EVENT_NOVA;
    }

    // Waves: trickle spawns, then the next wave when the lull ends.
    const kind = stepWaves(waves, dt, state.enemies.length);
    if (kind !== null) {
      const enemy = spawnEnemy(random, kind, waves.wave, waves.hpScale, waves.speedScale);
      state.enemies.push(enemy);
      if (isBoss(enemy)) events |= EVENT_BOSS;
    }
    if (waves.readyForNext) {
      startWave(waves, random, waves.wave + 1);
      events |= EVENT_WAVE_START;
    }

    // The lantern's own flame sears whatever touches it: the light defends itself a
    // little, so a lone shadow cannot chew the lantern down while the keeper is away.
    for (const enemy of state.enemies) {
      if (Math.hypot(enemy.x - lantern.x, enemy.y - lantern.y) <= LANTERN.radius + 8) {
        events = damageEnemy(enemy, LANTERN_FLAME_DPS * dt, events);
      }
    }

    // Lantern aura sears whatever crowds the light.
    const auraR = auraRadius(player);
    if (auraR > 0) {
      const dps = auraDps(player);
      for (const enemy of state.enemies) {
        if (Math.hypot(enemy.x - lantern.x, enemy.y - lantern.y) <= auraR + enemy.radius) {
          events = damageEnemy(enemy, dps * dt, events);
        }
      }
    }

    // Bullets fly, and pierce through what they are allowed to.
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.bullets.splice(i, 1);
        continue;
      }
      for (const enemy of state.enemies) {
        if (enemy.dead || bullet.hit.includes(enemy)) continue;
        const rr = enemy.radius + bullet.radius;
        if ((enemy.x - bullet.x) ** 2 + (enemy.y - bullet.y) ** 2 < rr * rr) {
          bullet.hit.push(enemy);
          events = damageEnemy(enemy, bullet.damage, events);
          burst(state, bullet.x, bullet.y, 4, '#ffe08a', 130, 0.3, 2);
          if (bullet.hit.length > bullet.pierce) {
            state.bullets.splice(i, 1);
          }
          break;
        }
      }
    }

    // The dead leave the field (and the boss's brood with them).
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      if (state.enemies[i].dead) state.enemies.splice(i, 1);
    }

    // Enemies walk, bite, and gnaw at the lantern.
    for (const enemy of state.enemies) {
      const target = enemyTarget(enemy, player, lantern);
      moveEnemy(enemy, dt, target, state.time);
      if (isBoss(enemy) && bossSpawnTimer(enemy, dt) && state.enemies.length < MAX_ALIVE) {
        for (let k = 0; k < 2; k += 1) {
          const moth = spawnEnemy(random, 'moth', waves.wave, waves.hpScale, waves.speedScale);
          moth.x = enemy.x + (random() - 0.5) * 90;
          moth.y = enemy.y + (random() - 0.5) * 90;
          state.enemies.push(moth);
        }
      }
      if (enemy.touchCooldown > 0) continue;
      const toPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (toPlayer < enemy.radius + player.radius) {
        enemy.touchCooldown = 1.1;
        enemy.x += ((enemy.x - player.x) / (toPlayer || 1)) * 26;
        enemy.y += ((enemy.y - player.y) / (toPlayer || 1)) * 26;
        if (hurtPlayer(player, enemy.touch)) {
          state.over = true;
          state.overReason = 'slain';
          state.shake = 0.8;
          state.hurtFlash = 1;
          burst(state, player.x, player.y, 40, '#ffd166', 260, 0.9, 4);
          return events | EVENT_HURT | EVENT_OVER;
        }
        state.shake = Math.max(state.shake, 0.35);
        state.hurtFlash = 1;
        events |= EVENT_HURT;
        continue;
      }
      const toLantern = Math.hypot(enemy.x - lantern.x, enemy.y - lantern.y);
      if (toLantern < enemy.radius + LANTERN.radius) {
        enemy.touchCooldown = 1.1;
        enemy.x += ((enemy.x - lantern.x) / (toLantern || 1)) * 60;
        enemy.y += ((enemy.y - lantern.y) / (toLantern || 1)) * 60;
        lantern.hp -= enemy.lanternTouch;
        state.flash = 0.5;
        events |= EVENT_LANTERN_HIT;
        burst(state, enemy.x, enemy.y, 10, '#ffb347', 150, 0.5, 3);
        if (lantern.hp <= 0) {
          lantern.hp = 0;
          state.over = true;
          state.overReason = 'lantern';
          state.shake = 0.8;
          burst(state, lantern.x, lantern.y, 60, '#ffb347', 300, 1.2, 5);
          return events | EVENT_OVER;
        }
      }
    }

    // Shards drift, magnetise, and feed the keeper's level.
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const shard = state.shards[i];
      shard.life -= dt;
      if (shard.life <= 0) {
        state.shards.splice(i, 1);
        continue;
      }
      const dx = player.x - shard.x;
      const dy = player.y - shard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < player.magnet) {
        const pull = 560 * (1 - dist / (player.magnet + 1)) + 160;
        shard.vx += (dx / (dist || 1)) * pull * dt * 4;
        shard.vy += (dy / (dist || 1)) * pull * dt * 4;
      } else {
        shard.vx *= 1 - 2 * dt;
        shard.vy *= 1 - 2 * dt;
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (dist < player.radius + SHARD.radius + 4) {
        state.shards.splice(i, 1);
        state.score += 1;
        const gained = gainXp(player, shard.value);
        burst(state, shard.x, shard.y, 5, '#7df9d4', 100, 0.35, 2);
        events |= EVENT_SHARD;
        if (gained > 0) {
          state.levelUpsPending += gained;
          if (state.pendingChoices === null) {
            state.pendingChoices = rollChoices(random, player, lantern);
            events |= EVENT_LEVELUP;
          }
        }
      }
    }

    // Wave cleared: bonus, a mended lantern, and either dawn or the next wave.
    if (waveCleared(waves, state.enemies.length)) {
      const bonus = 100 * waves.wave;
      state.score += bonus;
      addFloater(state, LANTERN.x, LANTERN.y - 70, `WAVE ${waves.wave} CLEAR  +${bonus}`, '#ffe08a', 18);
      lantern.hp = Math.min(lantern.maxHp, lantern.hp + LANTERN_MEND_BETWEEN_WAVES);
      events |= EVENT_WAVE_CLEAR;
      if (waves.wave >= WAVES_TO_WIN) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        startBetweenWaves(waves);
      }
    }

    stepParticles(dt);
    return events;
  }

  /** Take one offered blessing; opens the next queued level-up, or closes the choice. */
  function chooseUpgrade(id) {
    if (state.pendingChoices === null) return null;
    const chosen = state.pendingChoices.find((u) => u.id === id) ?? null;
    if (chosen === null) return null;
    applyUpgrade(id, player, lantern);
    state.levelUpsPending -= 1;
    if (state.levelUpsPending > 0) {
      state.pendingChoices = rollChoices(random, player, lantern);
    } else {
      state.pendingChoices = null;
    }
    return chosen;
  }

  function enemiesLeft() {
    return enemiesRemaining(waves, state.enemies.length);
  }

  reset();
  return { state, reset, step, chooseUpgrade, enemiesLeft };
}
