// The Lantern Keeper: a wisp of living ember. Movement, aim, the ember bolts, the
// level and experience curve, and the numbers every upgrade feeds into. The world calls
// stepPlayer each fixed step; upgrades mutate the fields here.

import { FIELD, LANTERN, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 170,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    level: 1,
    xp: 0,
    xpNext: PLAYER.xpNextBase + PLAYER.xpNextPerLevel,
    speed: PLAYER.speed,
    damage: PLAYER.boltDamage,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    multishot: 1,
    pierce: 0,
    magnet: PLAYER.pickupRadius,
    novaLevel: 0,
    novaTimer: 0,
    auraLevel: 0,
    invulnerable: 0,
    walkPhase: 0,
    moving: false,
  };
}

export function resetPlayer(player) {
  const fresh = createPlayer();
  Object.assign(player, fresh);
}

/** Move toward `move` (a unit-ish {x, y}), face `aim`, and count down the fire timer. */
export function stepPlayer(player, dt, move, aim) {
  player.moving = move.x !== 0 || move.y !== 0;
  player.x = Math.min(FIELD.width - 40, Math.max(40, player.x + move.x * player.speed * dt));
  player.y = Math.min(FIELD.height - 40, Math.max(40, player.y + move.y * player.speed * dt));
  // The lantern's post is solid: never stand inside it.
  const dx = player.x - LANTERN.x;
  const dy = player.y - LANTERN.y;
  const dist = Math.hypot(dx, dy);
  const minDist = LANTERN.radius + player.radius + 6;
  if (dist < minDist && dist > 0) {
    player.x = LANTERN.x + (dx / dist) * minDist;
    player.y = LANTERN.y + (dy / dist) * minDist;
  }
  player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
  if (player.moving) player.walkPhase += dt * 10;
  if (player.fireTimer > 0) player.fireTimer -= dt;
  if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (player.novaLevel > 0) player.novaTimer -= dt;
}

/** True when a bolt may leave the lantern-light: the trigger is held and the timer is spent. */
export function canFire(player, firing) {
  return firing && player.fireTimer <= 0;
}

export function markFired(player) {
  player.fireTimer = player.fireInterval;
}

/** Add experience; returns how many levels were gained. */
export function gainXp(player, amount) {
  player.xp += amount;
  let gained = 0;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level += 1;
    player.xpNext = PLAYER.xpNextBase + PLAYER.xpNextPerLevel * player.level;
    gained += 1;
  }
  return gained;
}

/** Hurt the keeper; returns true when this blow ends the game. */
export function hurtPlayer(player, damage) {
  if (player.invulnerable > 0) return false;
  player.hp -= damage;
  player.invulnerable = PLAYER.invulnerable;
  return player.hp <= 0;
}

export function healPlayer(player, amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
}

export function xpFraction(player) {
  return Math.min(1, player.xp / player.xpNext);
}
