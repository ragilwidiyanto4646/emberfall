// Everything the garden looks like: the dark ground, the lantern's warm light, the
// keeper, the shadows, bolts, shards and sparks. This file draws the world only — the
// HUD and the menu screens live in ui.js. It paints the fixed 1280x720 field onto the
// canvas, scaled to fit, and shakes the whole view when the world says so.

import { FIELD, FONT, LANTERN, PALETTE } from './config.js';
import { enemyTarget } from './enemies.js';
import { auraRadius } from './upgrades.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
    return { dpr, width, height };
  }

  function drawGround(state) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // The garden floor: a soft radial wash, darker at the edges. The wash shifts with
    // the night — boss waves burn red at the edges, late waves sink deeper violet —
    // so each wave reads differently in a screenshot.
    const wave = state.waves.wave;
    const washStops = wave % 5 === 0 && wave > 0
      ? ['#2c1f4e', '#1c1436', '#120a24']
      : wave >= 8 ? ['#1d2350', '#141736', '#0a0c20']
        : wave >= 5 ? ['#262a58', '#181b3c', '#0c0e22']
          : ['#232650', '#171a38', '#0b0d20'];
    const wash = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 60, LANTERN.x, LANTERN.y, 700);
    wash.addColorStop(0, washStops[0]);
    wash.addColorStop(0.55, washStops[1]);
    wash.addColorStop(1, washStops[2]);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Grass tufts sway in the dark.
    ctx.strokeStyle = '#2c3a6e';
    ctx.lineWidth = 2;
    for (const tuft of state.decor.grass) {
      const sway = Math.sin(state.time * 0.9 + tuft.phase) * 2;
      ctx.beginPath();
      ctx.moveTo(tuft.x - tuft.size / 2, tuft.y);
      ctx.quadraticCurveTo(tuft.x + sway, tuft.y - tuft.size, tuft.x - tuft.size / 4 + sway, tuft.y - tuft.size * 1.4);
      ctx.moveTo(tuft.x + tuft.size / 2, tuft.y);
      ctx.quadraticCurveTo(tuft.x + sway, tuft.y - tuft.size, tuft.x + tuft.size / 4 + sway, tuft.y - tuft.size * 1.4);
      ctx.stroke();
    }
    // A faint stone ring marks the lantern's garden bed.
    ctx.strokeStyle = 'rgba(120, 110, 190, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(LANTERN.x, LANTERN.y, 74, 0, Math.PI * 2);
    ctx.stroke();
    // Fireflies drift and blink.
    for (const fly of state.decor.fireflies) {
      const twinkle = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(state.time * fly.speed + fly.phase));
      ctx.fillStyle = `rgba(190, 255, 220, ${twinkle.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fly.x + Math.sin(state.time * 0.3 + fly.phase) * 14, fly.y + Math.cos(state.time * 0.23 + fly.phase) * 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLanternLight(state) {
    const flicker = 1 + state.lantern.flicker * 0.05;
    const radius = LANTERN.lightRadius * flicker;
    const glow = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 10, LANTERN.x, LANTERN.y, radius);
    glow.addColorStop(0, 'rgba(255, 196, 90, 0.34)');
    glow.addColorStop(0.45, 'rgba(255, 170, 70, 0.14)');
    glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(LANTERN.x - radius, LANTERN.y - radius, radius * 2, radius * 2);
  }

  function drawLantern(state) {
    const lantern = state.lantern;
    const auraR = auraRadius(state.player);
    if (auraR > 0) {
      ctx.strokeStyle = 'rgba(255, 190, 90, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(lantern.x, lantern.y, auraR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // The post.
    ctx.fillStyle = '#3a2f22';
    ctx.fillRect(lantern.x - 5, lantern.y + 8, 10, 34);
    ctx.fillStyle = '#54432c';
    ctx.fillRect(lantern.x - 12, lantern.y + 40, 24, 6);
    // The cage.
    ctx.strokeStyle = '#8a6a35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y, LANTERN.radius, 0, Math.PI * 2);
    ctx.stroke();
    // The flame: brighter and taller while the lantern is healthy, guttering when hurt.
    const health = lantern.hp / lantern.maxHp;
    const flameH = 12 + 16 * health + lantern.flicker * 2;
    const flame = ctx.createRadialGradient(lantern.x, lantern.y - 4, 1, lantern.x, lantern.y - 4, 26);
    flame.addColorStop(0, '#fff6d8');
    flame.addColorStop(0.4, health > 0.3 ? '#ffcf5e' : '#ff9d5c');
    flame.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(lantern.x, lantern.y - 4, 13, flameH, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lantern health ring: amber while strong, red while failing.
    ctx.strokeStyle = health > 0.5 ? 'rgba(255, 200, 90, 0.8)' : health > 0.25 ? 'rgba(255, 150, 60, 0.9)' : 'rgba(255, 93, 115, 0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y, LANTERN.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * health);
    ctx.stroke();
  }

  function drawShards(state) {
    for (const shard of state.shards) {
      const bob = Math.sin(state.time * 4 + shard.phase) * 2;
      const blink = 0.65 + 0.35 * Math.sin(state.time * 5 + shard.phase);
      ctx.save();
      ctx.translate(shard.x, shard.y + bob);
      ctx.rotate(state.time * 1.2 + shard.phase);
      ctx.fillStyle = `rgba(125, 249, 212, ${blink.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemy(state, enemy) {
    const flash = enemy.hitFlash > 0;
    // Telegraph: a shadow marching on the lantern shows a dashed red thread to it,
    // pulsing hard when it is about to bite — the keeper can see the danger coming
    // and which foe to burn first. The boss always wears a pulsing danger ring.
    const target = enemyTarget(enemy, state.player, state.lantern);
    const toLantern = Math.hypot(enemy.x - LANTERN.x, enemy.y - LANTERN.y);
    if (target === state.lantern && toLantern < 300) {
      const near = toLantern < 120;
      const pulse = 0.35 + 0.3 * Math.sin(state.time * 8);
      ctx.strokeStyle = `rgba(255, 93, 115, ${near ? Math.max(0.55, pulse + 0.3).toFixed(3) : pulse.toFixed(3)})`;
      ctx.lineWidth = near ? 3 : 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(LANTERN.x, LANTERN.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (near) {
        ctx.strokeStyle = `rgba(255, 93, 115, ${Math.max(0.4, pulse).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 8 + Math.sin(state.time * 8) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (enemy.kind === 'boss') {
      ctx.strokeStyle = `rgba(255, 93, 115, ${(0.4 + 0.25 * Math.sin(state.time * 5)).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 92 + Math.sin(state.time * 5) * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.kind === 'moth') {
      // Shadow moth: a dark body, violet wings that beat.
      const beat = Math.sin(state.time * 14 + enemy.wobble) * 0.5;
      ctx.fillStyle = flash ? '#ffffff' : '#5a4a8a';
      ctx.beginPath();
      ctx.ellipse(-9, 0, 10, 6 + beat * 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(9, 0, 10, 6 + beat * 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : '#2c2350';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9a6ff';
      ctx.beginPath();
      ctx.arc(0, -4, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'thorn') {
      // Thorn wisp: a bristling green knot.
      ctx.fillStyle = flash ? '#ffffff' : '#3f7a4a';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = flash ? '#ffffff' : '#7fe08a';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + state.time * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * enemy.radius * 0.6, Math.sin(a) * enemy.radius * 0.6);
        ctx.lineTo(Math.cos(a) * (enemy.radius + 7), Math.sin(a) * (enemy.radius + 7));
        ctx.stroke();
      }
      ctx.fillStyle = '#d8ffd0';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'eater') {
      // Ember-eater: an orange maw that snaps.
      const snap = 0.7 + 0.3 * Math.sin(state.time * 9 + enemy.wobble);
      ctx.fillStyle = flash ? '#ffffff' : '#a34a28';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : '#ff9d5c';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, enemy.radius * snap, -0.7, 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff2d8';
      ctx.beginPath();
      ctx.arc(-4, -4, 2, 0, Math.PI * 2);
      ctx.arc(4, -4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Gloom Moth boss: a huge ragged moth with a bleeding crown.
      const beat = Math.sin(state.time * 6 + enemy.wobble) * 0.4;
      ctx.fillStyle = flash ? '#ffffff' : '#6e2a3d';
      ctx.beginPath();
      ctx.ellipse(-34, 0, 34, 20 + beat * 8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(34, 0, 34, 20 + beat * 8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : '#3d1424';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff5d73';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, 12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = '#ffb3c0';
      ctx.beginPath();
      ctx.arc(-6, -8, 3, 0, Math.PI * 2);
      ctx.arc(6, -8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Health bar for anything hurt — bosses always show one.
    if (enemy.hp < enemy.maxHp || enemy.kind === 'boss') {
      const w = enemy.radius * 2;
      const frac = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
      ctx.fillStyle = enemy.kind === 'boss' ? '#ff5d73' : '#ff9d5c';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * frac, 5);
    }
  }

  function drawBullets(state) {
    for (const bullet of state.bullets) {
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius + 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawNovas(state) {
    for (const nova of state.novas) {
      const frac = 1 - nova.life / nova.maxLife;
      ctx.strokeStyle = `rgba(255, 160, 60, ${(1 - frac).toFixed(3)})`;
      ctx.lineWidth = 6 * (1 - frac) + 2;
      ctx.beginPath();
      ctx.arc(nova.x, nova.y, nova.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 220, 130, ${(0.7 * (1 - frac)).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nova.x, nova.y, nova.radius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    const blink = p.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    // A soft glow under the wisp.
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.5)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -34, 68, 68);
    if (!blink) {
      // The wisp: a flame body with a bright core, trailing embers behind.
      const bob = Math.sin(p.walkPhase) * 2;
      ctx.fillStyle = '#ff9d3c';
      ctx.beginPath();
      ctx.ellipse(-Math.cos(p.angle) * 8, -Math.sin(p.angle) * 8 + bob, 9, 12, p.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, bob * 0.5, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(0, bob * 0.5, p.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Eyes look where the keeper aims.
      ctx.fillStyle = '#3a2a10';
      ctx.beginPath();
      ctx.arc(Math.cos(p.angle) * 5 - 2, bob * 0.5 + Math.sin(p.angle) * 5 - 2, 2.2, 0, Math.PI * 2);
      ctx.arc(Math.cos(p.angle) * 5 + 2, bob * 0.5 + Math.sin(p.angle) * 5 + 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // The aim: a short ember line toward the mouse.
      ctx.strokeStyle = 'rgba(255, 224, 138, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(p.angle) * (p.radius + 4), Math.sin(p.angle) * (p.radius + 4));
      ctx.lineTo(Math.cos(p.angle) * (p.radius + 16), Math.sin(p.angle) * (p.radius + 16));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      const frac = pt.life / pt.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, frac * 1.4));
      ctx.fillStyle = pt.colour;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (0.5 + frac * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    for (const f of state.floaters) {
      const frac = f.life / f.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, frac * 1.6));
      ctx.font = `bold ${f.size}px ${FONT}`;
      ctx.fillStyle = f.colour;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette(state) {
    const vig = ctx.createRadialGradient(640, 360, 300, 640, 360, 720);
    vig.addColorStop(0, 'rgba(5, 6, 18, 0)');
    vig.addColorStop(1, 'rgba(5, 6, 18, 0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 70, ${(state.hurtFlash * 0.22).toFixed(3)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 170, 60, ${(state.flash * 0.18).toFixed(3)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // A failing lantern throbs red at the screen's edge — impossible to miss.
    const lfrac = state.lantern.hp / state.lantern.maxHp;
    if (lfrac < 0.3 && !state.over) {
      const throb = 0.10 + 0.08 * Math.sin(state.time * 6);
      const edge = ctx.createRadialGradient(640, 360, 260, 640, 360, 720);
      edge.addColorStop(0, 'rgba(255, 40, 70, 0)');
      edge.addColorStop(1, `rgba(255, 40, 70, ${throb.toFixed(3)})`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  /** Paint the world (no HUD, no screens) with the current shake applied. */
  function drawWorld(state) {
    const shakeX = state.shake > 0 ? (Math.sin(state.time * 61) * state.shake * 7) : 0;
    const shakeY = state.shake > 0 ? (Math.cos(state.time * 53) * state.shake * 7) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawGround(state);
    drawLanternLight(state);
    drawLantern(state);
    drawShards(state);
    for (const enemy of state.enemies) drawEnemy(state, enemy);
    drawBullets(state);
    drawNovas(state);
    drawPlayer(state);
    drawParticles(state);
    drawFloaters(state);
    ctx.restore();
    drawVignette(state);
  }

  return { fitCanvas, drawWorld, ctx };
}
