// The HUD and the screens: title, pause, level-up cards, game over and victory, plus
// the wave banner. This file draws text and panels only; the world is render.js's job.
// It also owns the clickable regions (start / restart buttons and upgrade cards) so the
// main loop can answer a click without knowing where anything was drawn.

import { FIELD, FONT, LANTERN, PALETTE, WAVES_TO_WIN } from './config.js';
import { upgradeLevel } from './upgrades.js';
import { xpFraction } from './player.js';

const CARD_W = 250;
const CARD_H = 190;
const CARD_GAP = 28;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(8, 8, 22, 0.75)') {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(244, 234, 216, 0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

function dim(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(6, 7, 20, ${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function titleText(ctx, text, x, y, size, colour, font = FONT) {
  ctx.font = `bold ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

function bodyText(ctx, text, x, y, size, colour, align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

export function createUi() {
  let regions = [];

  function setRegions(list) {
    regions = list;
  }

  /** The button or card under a logical point, or null. Regions are set by the last draw call. */
  function hitAt(x, y) {
    for (const region of regions) {
      if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region.id;
    }
    return null;
  }

  function drawHud(ctx, state, muted, showBanner = true) {
    const p = state.player;
    const lantern = state.lantern;
    // Top-left: keeper health and experience.
    ctx.textAlign = 'left';
    bodyText(ctx, 'KEEPER', 24, 30, 13, PALETTE.muted, 'left');
    bar(ctx, 24, 38, 220, 16, p.hp / p.maxHp, p.hp / p.maxHp > 0.3 ? '#ffd166' : '#ff5d73');
    bodyText(ctx, `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`, 252, 51, 13, PALETTE.text, 'left');
    bodyText(ctx, `LEVEL ${p.level}`, 24, 78, 13, PALETTE.muted, 'left');
    bar(ctx, 24, 86, 220, 9, xpFraction(p), '#7df9d4');
    bodyText(ctx, `${p.xp} / ${p.xpNext} XP`, 252, 95, 12, PALETTE.text, 'left');

    // Top-centre: wave and foes remaining.
    const waveLabel = state.won ? 'DAWN' : `WAVE ${Math.max(1, state.waves.wave)} / ${WAVES_TO_WIN}`;
    titleText(ctx, waveLabel, FIELD.width / 2, 44, 26, PALETTE.text);
    const remaining = state.enemies.length + state.waves.queue.length;
    bodyText(ctx, state.waves.active ? `${remaining} shadow${remaining === 1 ? '' : 's'} remain` : 'the garden breathes…', FIELD.width / 2, 68, 14, PALETTE.muted);

    // Top-right: score, kills, mute.
    ctx.textAlign = 'right';
    bodyText(ctx, `SCORE  ${state.score}`, FIELD.width - 24, 34, 20, PALETTE.text, 'right');
    bodyText(ctx, `${state.kills} vanquished`, FIELD.width - 24, 58, 13, PALETTE.muted, 'right');
    bodyText(ctx, muted ? 'M — sound off' : 'M — sound on', FIELD.width - 24, 80, 12, PALETTE.muted, 'right');

    // Lantern health, under the wave label: the flame you are guarding.
    const lfrac = lantern.hp / lantern.maxHp;
    bodyText(ctx, 'LANTERN', FIELD.width / 2 - 130, 108, 12, lfrac > 0.3 ? '#ffcf5e' : '#ff5d73', 'right');
    bar(ctx, FIELD.width / 2 - 120, 96, 240, 13, lfrac, lfrac > 0.5 ? '#ffb347' : lfrac > 0.25 ? '#ff9d5c' : '#ff5d73');
    bodyText(ctx, `${Math.max(0, Math.ceil(lantern.hp))}`, FIELD.width / 2 + 130, 108, 12, PALETTE.text, 'left');

    // Wave banner, fading in the middle of the screen (hidden under overlay screens).
    if (showBanner && state.waves.banner > 0) {
      const alpha = Math.min(1, state.waves.banner / 0.6);
      ctx.globalAlpha = alpha;
      titleText(ctx, state.waves.bannerText, FIELD.width / 2, 210, 40, '#ffe9b0');
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(ctx, state, best) {
    dim(ctx, 0.42);
    // A warm halo behind the title.
    const halo = ctx.createRadialGradient(640, 250, 10, 640, 250, 330);
    halo.addColorStop(0, 'rgba(255, 190, 90, 0.20)');
    halo.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(310, -80, 660, 660);
    titleText(ctx, 'EMBERFALL', 640, 205, 84, '#ffe9b0');
    titleText(ctx, 'Keeper of the Last Lantern', 640, 250, 26, '#ffb347');
    bodyText(ctx, 'The dark is hungry. Guard the last lantern through 10 waves —', 640, 312, 18, PALETTE.text);
    bodyText(ctx, 'and hold until dawn breaks.', 640, 338, 18, PALETTE.text);
    bodyText(ctx, 'WASD / arrows — move      Mouse — aim      Hold click — shoot (or it fires on its own)', 640, 388, 16, PALETTE.muted);
    bodyText(ctx, 'Shadows hunt you AND the lantern. Gather light shards, level up, choose blessings.', 640, 414, 16, PALETTE.muted);
    bodyText(ctx, 'P — pause      M — mute      R — restart', 640, 440, 16, PALETTE.muted);
    // Start button.
    const bw = 300;
    const bh = 62;
    const bx = (FIELD.width - bw) / 2;
    const by = 486;
    ctx.fillStyle = '#ffb347';
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffe9b0';
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.stroke();
    titleText(ctx, 'LIGHT THE LANTERN', 640, by + 40, 24, '#3a2a10');
    bodyText(ctx, 'or press Space', 640, by + 92, 14, PALETTE.muted);
    if (best > 0) bodyText(ctx, `Best score: ${best}`, 640, 640, 16, '#ffe9b0');
    bodyText(ctx, 'A game of light against the dark — every shadow you burn feeds your flame.', 640, 672, 13, PALETTE.muted);
    setRegions([{ id: 'start', x: bx, y: by, w: bw, h: bh }]);
  }

  function drawPaused(ctx, state) {
    dim(ctx, 0.6);
    titleText(ctx, 'PAUSED', 640, 300, 56, PALETTE.text);
    bodyText(ctx, 'The night waits.', 640, 340, 18, PALETTE.muted);
    bodyText(ctx, 'P / Esc or click — resume      R — restart from wave 1', 640, 392, 16, PALETTE.text);
    const bw = 240;
    const bh = 54;
    const bx = (FIELD.width - bw) / 2;
    const by = 430;
    ctx.fillStyle = '#2a2f66';
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.stroke();
    titleText(ctx, 'RESUME', 640, by + 35, 22, PALETTE.text);
    setRegions([{ id: 'resume', x: bx, y: by, w: bw, h: bh }]);
  }

  function drawLevelUp(ctx, state) {
    dim(ctx, 0.62);
    titleText(ctx, 'LEVEL UP', 640, 150, 52, '#ffe9b0');
    bodyText(ctx, `Level ${state.player.level} — choose a blessing for your flame`, 640, 190, 18, PALETTE.text);
    const choices = state.pendingChoices ?? [];
    const totalW = choices.length * CARD_W + (choices.length - 1) * CARD_GAP;
    const startX = (FIELD.width - totalW) / 2;
    const y = 250;
    const list = [];
    choices.forEach((upgrade, i) => {
      const x = startX + i * (CARD_W + CARD_GAP);
      ctx.fillStyle = PALETTE.card;
      roundRect(ctx, x, y, CARD_W, CARD_H, 14);
      ctx.fill();
      ctx.strokeStyle = PALETTE.cardEdge;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, CARD_W, CARD_H, 14);
      ctx.stroke();
      titleText(ctx, `${i + 1}`, x + CARD_W / 2, y + 44, 26, '#ffb347');
      titleText(ctx, upgrade.name, x + CARD_W / 2, y + 82, 21, PALETTE.text);
      // Owned pips.
      const level = upgradeLevel(upgrade, state.player);
      const pips = '●'.repeat(level) + '○'.repeat(Math.max(0, Math.min(upgrade.max, 5) - level));
      bodyText(ctx, pips, x + CARD_W / 2, y + 112, 14, '#7df9d4');
      // Wrapped description.
      ctx.font = `15px ${FONT}`;
      ctx.textAlign = 'center';
      const words = upgrade.desc.split(' ');
      let line = '';
      let ly = y + 140;
      for (const word of words) {
        if (ctx.measureText(`${line} ${word}`.trim()).width > CARD_W - 28) {
          ctx.fillStyle = PALETTE.muted;
          ctx.fillText(line.trim(), x + CARD_W / 2, ly);
          line = word;
          ly += 20;
        } else {
          line = `${line} ${word}`.trim();
        }
      }
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(line, x + CARD_W / 2, ly);
      list.push({ id: `choice-${i}`, x, y, w: CARD_W, h: CARD_H });
    });
    bodyText(ctx, 'Click a card or press 1 / 2 / 3', 640, y + CARD_H + 44, 16, PALETTE.muted);
    setRegions(list);
  }

  function drawStats(ctx, state, y) {
    bodyText(ctx, `Score ${state.score}    •    Waves held ${Math.min(state.waves.wave, WAVES_TO_WIN)} / ${WAVES_TO_WIN}    •    ${state.kills} shadows vanquished    •    Level ${state.player.level}`, 640, y, 17, PALETTE.text);
  }

  function drawOver(ctx, state, best) {
    dim(ctx, 0.62);
    const lanternLost = state.overReason === 'lantern';
    titleText(ctx, lanternLost ? 'THE LIGHT HAS FADED' : 'THE KEEPER HAS FALLEN', 640, 260, 52, '#ff8ba0');
    bodyText(ctx, lanternLost
      ? 'The lantern is dark. The garden belongs to the shadows now.'
      : 'The shadows overwhelmed the keeper — but the lantern still burns for the next.', 640, 302, 18, PALETTE.text);
    drawStats(ctx, state, 352);
    if (state.score >= best && state.score > 0) bodyText(ctx, '★ New best score! ★', 640, 392, 18, '#ffe9b0');
    else if (best > 0) bodyText(ctx, `Best score: ${best}`, 640, 392, 16, PALETTE.muted);
    const bw = 300;
    const bh = 62;
    const bx = (FIELD.width - bw) / 2;
    const by = 440;
    ctx.fillStyle = '#ffb347';
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    titleText(ctx, 'TRY AGAIN', 640, by + 40, 24, '#3a2a10');
    bodyText(ctx, 'or press R', 640, by + 92, 14, PALETTE.muted);
    setRegions([{ id: 'restart', x: bx, y: by, w: bw, h: bh }]);
  }

  function drawVictory(ctx, state, best) {
    dim(ctx, 0.5);
    // Dawn: a warm wash rising from the horizon.
    const dawn = ctx.createLinearGradient(0, 200, 0, 720);
    dawn.addColorStop(0, 'rgba(255, 214, 130, 0.22)');
    dawn.addColorStop(1, 'rgba(255, 150, 80, 0.05)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    titleText(ctx, '☀  DAWN BREAKS  ☀', 640, 240, 60, '#ffe9b0');
    bodyText(ctx, 'Ten waves held. The shadows retreat, and the lantern burns on into morning.', 640, 288, 19, PALETTE.text);
    drawStats(ctx, state, 340);
    if (state.score >= best && state.score > 0) bodyText(ctx, '★ New best score! ★', 640, 380, 18, '#ffe9b0');
    else if (best > 0) bodyText(ctx, `Best score: ${best}`, 640, 380, 16, PALETTE.muted);
    bodyText(ctx, 'You kept the last light alive. The garden remembers its keeper.', 640, 414, 16, PALETTE.muted);
    const bw = 320;
    const bh = 62;
    const bx = (FIELD.width - bw) / 2;
    const by = 462;
    ctx.fillStyle = '#ffb347';
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    titleText(ctx, 'KEEP THE LIGHT  (R)', 640, by + 40, 22, '#3a2a10');
    bodyText(ctx, 'Play again — can you beat this score?', 640, by + 92, 14, PALETTE.muted);
    setRegions([{ id: 'restart', x: bx, y: by, w: bw, h: bh }]);
  }

  return { drawHud, drawTitle, drawPaused, drawLevelUp, drawOver, drawVictory, hitAt };
}
