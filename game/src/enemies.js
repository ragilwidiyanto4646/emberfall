// The things that crawl out of the dark: shadow moths, thorn wisps, ember-eaters and,
// every fifth wave, the Gloom Moth boss. An enemy knows its kind, its target (the keeper
// or the lantern), and how to walk toward it; the world owns the lists and the damage.

import { ENEMY, FIELD, LANTERN } from './config.js';
import { randomEdgePoint } from './rng.js';

export const KIND_MOTH = 'moth';
export const KIND_THORN = 'thorn';
export const KIND_EATER = 'eater';
export const KIND_BOSS = 'boss';

/** Spawn one enemy of `kind` at the field edge, scaled for `wave`. */
export function spawnEnemy(random, kind, wave, hpScale, speedScale) {
  const def = ENEMY[kind];
  const point = randomEdgePoint(random, FIELD.width, FIELD.height, 36);
  return {
    kind,
    x: point.x,
    y: point.y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * speedScale * (0.9 + random() * 0.2),
    touch: def.touch,
    lanternTouch: def.lanternTouch,
    score: def.score,
    shards: def.shards,
    target: def.target,
    colour: def.colour,
    wobble: random() * Math.PI * 2,
    wobbleSpeed: 1.5 + random() * 2,
    hitFlash: 0,
    spawnTimer: 0,
    touchCooldown: 0,
  };
}

/** Where this enemy is walking toward right now: the keeper, the lantern, or the nearer of the two. */
export function enemyTarget(enemy, player, lantern) {
  if (enemy.target === 'player') return player;
  if (enemy.target === 'lantern') return lantern;
  const toPlayer = (enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2;
  const toLantern = (enemy.x - lantern.x) ** 2 + (enemy.y - lantern.y) ** 2;
  return toPlayer < toLantern ? player : lantern;
}

/** One fixed step of movement: steer at the target with a sideways wobble so the swarm never marches in a straight line. */
export function moveEnemy(enemy, dt, target, time) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wobble = Math.sin(time * enemy.wobbleSpeed + enemy.wobble) * 0.45;
  const nx = dx / dist;
  const ny = dy / dist;
  // Perpendicular component gives the wobble.
  const px = -ny * wobble;
  const py = nx * wobble;
  let mx = nx + px;
  let my = ny + py;
  const mLen = Math.hypot(mx, my) || 1;
  mx /= mLen;
  my /= mLen;
  enemy.x += mx * enemy.speed * dt;
  enemy.y += my * enemy.speed * dt;
  enemy.vx = mx * enemy.speed;
  enemy.vy = my * enemy.speed;
  if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  if (enemy.touchCooldown > 0) enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
}

/** The boss sheds two moths every few seconds while it lives. */
export function bossSpawnTimer(enemy, dt) {
  enemy.spawnTimer -= dt;
  if (enemy.spawnTimer <= 0) {
    enemy.spawnTimer = 8;
    return true;
  }
  return false;
}

export function isBoss(enemy) {
  return enemy.kind === KIND_BOSS;
}

export function enemyDef(kind) {
  return ENEMY[kind];
}
