// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, paused, level-up, game over
// and victory. The keeper fires on its own when the mouse is held — and also when it
// is not, so a keyboard-only player still shoots at what they face.
//
// ?seed=N fixes the wave pattern. ?shot=start|play|levelup|end|victory (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './rng.js';
import {
  EVENT_BOSS, EVENT_HURT, EVENT_KILL, EVENT_LANTERN_HIT, EVENT_LEVELUP, EVENT_NOVA,
  EVENT_OVER, EVENT_SHARD, EVENT_WAVE_CLEAR, EVENT_WAVE_START, EVENT_WIN,
  createWorld,
} from './world.js';
import { ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { createUi } from './ui.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const ui = createUi();
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.fitCanvas();
    renderer.drawWorld(world.state);
    if (scene.screen === SCREEN_TITLE) ui.drawTitle(renderer.ctx, world.state, scene.best);
    else if (scene.screen === SCREEN_LEVELUP) {
      ui.drawHud(renderer.ctx, world.state, audio.isMuted(), false);
      ui.drawLevelUp(renderer.ctx, world.state);
    } else if (scene.screen === SCREEN_OVER) ui.drawOver(renderer.ctx, world.state, scene.best);
    else if (scene.screen === SCREEN_VICTORY) ui.drawVictory(renderer.ctx, world.state, scene.best);
    else ui.drawHud(renderer.ctx, world.state, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Guard the lantern through 10 waves.');
  }

  function endGame(won) {
    screen = won ? SCREEN_VICTORY : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.victory();
      announce(`Dawn breaks. You win with score ${world.state.score}.`);
    } else {
      audio.defeat();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function react(events) {
    if (events & EVENT_KILL) audio.kill();
    if (events & EVENT_SHARD) audio.pickup();
    if (events & EVENT_HURT) audio.hurt();
    if (events & EVENT_LANTERN_HIT) audio.lanternHit();
    if (events & EVENT_NOVA) audio.nova();
    if (events & EVENT_WAVE_START) audio.waveHorn();
    if (events & EVENT_BOSS) announce(`The Gloom Moth comes. Wave ${world.state.waves.wave}.`);
    if (events & EVENT_WAVE_CLEAR) announce(`Wave ${world.state.waves.wave} clear. Score ${world.state.score}.`);
    if (events & EVENT_LEVELUP) {
      audio.levelUp();
      screen = SCREEN_LEVELUP;
      announce(`Level ${world.state.player.level}. Choose a blessing.`);
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 200 }, false, true);
      return;
    }
    // Auto-fire: holding the mouse fires, and so does simply playing — the keeper's
    // embers answer the aim without a trigger finger.
    const events = world.step(STEP, input.direction(), input.aim(), true, false);
    react(events);
  }

  function chooseCard(index) {
    const choices = world.state.pendingChoices;
    if (!choices || index >= choices.length) return;
    const chosen = world.chooseUpgrade(choices[index].id);
    if (chosen) {
      audio.pickup();
      announce(`Blessing taken: ${chosen.name}.`);
    }
    if (world.state.pendingChoices === null) screen = SCREEN_PLAY;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_OVER || screen === SCREEN_VICTORY)) {
      startGame();
      return;
    }
    if (screen === SCREEN_LEVELUP) {
      if (actions & ACTION_CHOICE_1) chooseCard(0);
      else if (actions & ACTION_CHOICE_2) chooseCard(1);
      else if (actions & ACTION_CHOICE_3) chooseCard(2);
    } else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    const click = input.takeClick();
    if (click) {
      audio.unlock();
      const hit = ui.hitAt(click.x, click.y);
      if (hit === 'start' && screen === SCREEN_TITLE) startGame();
      else if (hit === 'restart' && (screen === SCREEN_OVER || screen === SCREEN_VICTORY)) startGame();
      else if (hit === 'resume' && screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_LEVELUP && hit && hit.startsWith('choice-')) chooseCard(Number(hit.slice(7)));
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.fitCanvas();
    renderer.drawWorld(world.state);
    if (screen === SCREEN_TITLE) ui.drawTitle(renderer.ctx, world.state, best);
    else if (screen === SCREEN_PAUSED) {
      ui.drawHud(renderer.ctx, world.state, audio.isMuted());
      ui.drawPaused(renderer.ctx, world.state);
    } else if (screen === SCREEN_LEVELUP) {
      ui.drawHud(renderer.ctx, world.state, audio.isMuted(), false);
      ui.drawLevelUp(renderer.ctx, world.state);
    } else if (screen === SCREEN_OVER) ui.drawOver(renderer.ctx, world.state, best);
    else if (screen === SCREEN_VICTORY) ui.drawVictory(renderer.ctx, world.state, best);
    else ui.drawHud(renderer.ctx, world.state, audio.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting shadows feed unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A small handle for playtesting and debugging (screen, score, wave, world state).
  window.__emberfall = {
    world,
    get screen() { return screen; },
    get best() { return best; },
  };

  announce('Emberfall. Press Space or click to light the lantern.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
