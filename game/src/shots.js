// The screenshot scenes behind ?shot=start|play|levelup|end|victory. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (keep clear of the nearest shadow, chase light shards, always fire at the
// nearest enemy, take the strongest blessing), so the frame is what a real game looks
// like and the same seed always gives the same frame.

import { STEP } from './config.js';
import {
  EVENT_LEVELUP, EVENT_OVER, EVENT_WIN,
} from './world.js';
import {
  SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY,
} from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 150;
const LEVELUP_LIMIT_SECONDS = 180;
const END_LIMIT_SECONDS = 600;
const VICTORY_LIMIT_SECONDS = 1200;

/** Blessings the autopilot prefers, best first, when a level-up offers a choice. */
const CHOICE_PRIORITY = ['split', 'heavy', 'rapid', 'pierce', 'nova', 'aura', 'heart', 'swift', 'magnet', 'mend'];

/** The nearest enemy to a point, or null when the field is empty. */
function nearestShard(state, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const shard of state.shards) {
    const d = (shard.x - x) ** 2 + (shard.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = shard;
    }
  }
  return best;
}

/**
 * Steer the keeper: flee anything too close, stand between the lantern and whatever
 * threatens it, gather shards when it is safe, and always shoot at the greatest
 * threat — the shadow nearest the lantern, else the one nearest the keeper.
 */
export function autopilot(state) {
  const player = state.player;
  const lantern = state.lantern;
  let threat = null;
  let threatLanternDist = Infinity;
  let nearest = null;
  let nearestDist = Infinity;
  for (const enemy of state.enemies) {
    const toLantern = Math.hypot(enemy.x - lantern.x, enemy.y - lantern.y);
    if (toLantern < threatLanternDist) {
      threatLanternDist = toLantern;
      threat = enemy;
    }
    const toPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (toPlayer < nearestDist) {
      nearestDist = toPlayer;
      nearest = enemy;
    }
  }
  let mx = 0;
  let my = 0;

  // 1. Flee anything about to bite.
  if (nearest && nearestDist < 140) {
    mx += ((player.x - nearest.x) / (nearestDist || 1)) * 1.6;
    my += ((player.y - nearest.y) / (nearestDist || 1)) * 1.6;
  }
  // 2. Stand between the lantern and its nearest threat.
  if (threat && threatLanternDist < 430) {
    const dx = threat.x - lantern.x;
    const dy = threat.y - lantern.y;
    const len = Math.hypot(dx, dy) || 1;
    const gx = lantern.x + (dx / len) * 150;
    const gy = lantern.y + (dy / len) * 150;
    const gdx = gx - player.x;
    const gdy = gy - player.y;
    const glen = Math.hypot(gdx, gdy) || 1;
    if (glen > 24) {
      mx += (gdx / glen) * 1.3;
      my += (gdy / glen) * 1.3;
    }
  } else {
    // 3. No threat near the lantern: gather shards, then close in on the nearest shadow.
    const shard = nearestShard(state, player.x, player.y);
    if (shard) {
      const dx = shard.x - player.x;
      const dy = shard.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 320 && !(nearest && nearestDist < 180)) {
        mx += (dx / dist) * 1.1;
        my += (dy / dist) * 1.1;
      }
    }
    if (nearest && nearestDist > 380) {
      mx += ((nearest.x - player.x) / nearestDist) * 0.8;
      my += ((nearest.y - player.y) / nearestDist) * 0.8;
    }
  }
  // Drift back toward the lantern's light when nothing pulls elsewhere.
  if (mx === 0 && my === 0) {
    const dx = lantern.x - player.x;
    const dy = lantern.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > 230) {
      mx += (dx / dist) * 0.7;
      my += (dy / dist) * 0.7;
    }
  }
  // Never walk into the lantern post.
  const toLantern = Math.hypot(player.x - lantern.x, player.y - lantern.y);
  if (toLantern < 80) {
    mx += ((player.x - lantern.x) / (toLantern || 1)) * 1.2;
    my += ((player.y - lantern.y) / (toLantern || 1)) * 1.2;
  }
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  const aimTarget = threat && threatLanternDist < 520 ? threat : nearest;
  const aim = aimTarget ? { x: aimTarget.x, y: aimTarget.y } : { x: lantern.x, y: lantern.y - 120 };
  return { move: { x: mx, y: my }, aim, firing: true };
}

/** A pilot that does nothing at all: the night takes the lantern, as a hurried player might. */
function idlePilot() {
  return { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false };
}

/** The autopilot's feet without its fire: it kites and gathers while the swarm builds. */
function gatherPilot(state) {
  const control = autopilot(state);
  control.firing = false;
  return control;
}

/** Take the best blessing on offer, by the priority list above. */
function chooseBest(world) {
  const choices = world.state.pendingChoices;
  if (!choices || choices.length === 0) return;
  let best = choices[0];
  for (const choice of choices) {
    if (CHOICE_PRIORITY.indexOf(choice.id) < CHOICE_PRIORITY.indexOf(best.id)) best = choice;
  }
  world.chooseUpgrade(best.id);
}

/** One autopilot step, taking any level-up the step opens (unless told to leave it). Returns the step's events. */
function autoStep(world, pilot, takeChoice = true) {
  const state = world.state;
  const control = pilot(state);
  const events = world.step(STEP, control.move, control.aim, control.firing, false);
  if (takeChoice && (events & EVENT_LEVELUP)) chooseBest(world);
  return events;
}

/**
 * Set `world` to the named scene (start, play, levelup, end or victory; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'levelup' && name !== 'end' && name !== 'victory') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 200 }, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const events = autoStep(world, () => idlePilot());
      if (events & EVENT_OVER) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'levelup') {
    for (let i = 0; i < LEVELUP_LIMIT_SECONDS / STEP; i += 1) {
      const events = autoStep(world, autopilot, false);
      if (events & EVENT_OVER) break;
      if (world.state.pendingChoices) {
        return { screen: SCREEN_LEVELUP, best: world.state.score };
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'victory') {
    for (let i = 0; i < VICTORY_LIMIT_SECONDS / STEP; i += 1) {
      const events = autoStep(world, autopilot);
      if (events & EVENT_WIN) return { screen: SCREEN_VICTORY, best: world.state.score };
      if (events & EVENT_OVER) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  // play: a busy mid-fight frame. First fight to wave 4, then hold fire for a few
  // seconds so the swarm builds around the lantern, then open fire again — the shot
  // catches the fight at its thickest, with bolts, shards and shadows on screen.
  for (let i = 0; i < PLAY_LIMIT_SECONDS / STEP; i += 1) {
    const events = autoStep(world, autopilot);
    if (events & EVENT_OVER) break;
    if (world.state.waves.wave >= 4) break;
  }
  for (let i = 0; i < 8 / STEP && !world.state.over; i += 1) autoStep(world, gatherPilot);
  for (let i = 0; i < 1.5 / STEP && !world.state.over; i += 1) autoStep(world, autopilot);
  return { screen: SCREEN_PLAY, best: world.state.score };
}
