// Keyboard and mouse, read as the game needs them: held movement keys, the mouse aim in
// logical field coordinates, held fire, and one-shot actions (confirm, pause, mute,
// restart, upgrade choices 1-3, and clicks on screen buttons). The canvas is scaled to
// fit the window, so mouse pixels are mapped back into the 1280x720 logical field.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;
export const ACTION_CHOICE_1 = 16;
export const ACTION_CHOICE_2 = 32;
export const ACTION_CHOICE_3 = 64;

const KEY_ACTIONS = {
  Space: ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  KeyR: ACTION_RESTART,
  Digit1: ACTION_CHOICE_1,
  Digit2: ACTION_CHOICE_2,
  Digit3: ACTION_CHOICE_3,
  Numpad1: ACTION_CHOICE_1,
  Numpad2: ACTION_CHOICE_2,
  Numpad3: ACTION_CHOICE_3,
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = FIELD.width / 2;
  let mouseY = FIELD.height / 2 - 160;
  let mouseDown = false;
  let clicked = false;
  let clickX = 0;
  let clickY = 0;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action !== undefined) {
      actions |= action;
      event.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const point = toLogical(event);
    mouseX = point.x;
    mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toLogical(event);
    mouseX = point.x;
    mouseY = point.y;
    mouseDown = true;
    clicked = true;
    clickX = point.x;
    clickY = point.y;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** One-shot actions since the last call; reading them clears them. */
  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** The click since the last call, if any, in logical coordinates. */
  function takeClick() {
    if (!clicked) return null;
    clicked = false;
    return { x: clickX, y: clickY };
  }

  return {
    direction,
    takeActions,
    takeClick,
    aim: () => ({ x: mouseX, y: mouseY }),
    firing: () => mouseDown,
  };
}
