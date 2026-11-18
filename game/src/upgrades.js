// The level-up blessings: ten upgrades, each with its own cap, picked three at a time.
// A choice is offered only while it still does something — a maxed blessing never shows
// again, and the lantern-mending blessing only appears while the lantern is hurt.

import { LANTERN_AURA_BASE_RADIUS, NOVA, PLAYER } from './config.js';

export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Embers',
    desc: '+18% fire rate — your bolts fly faster.',
    max: 5,
    level: (p) => Math.round((PLAYER.fireInterval / p.fireInterval - 1) / 0.18),
    canOffer: (p) => p.fireInterval > PLAYER.fireInterval / 1.18 ** 5 + 0.001,
    apply: (p) => { p.fireInterval /= 1.18; },
  },
  {
    id: 'split',
    name: 'Split Shot',
    desc: '+1 ember bolt per volley, fanning outward.',
    max: 3,
    level: (p) => p.multishot - 1,
    canOffer: (p) => p.multishot < 4,
    apply: (p) => { p.multishot += 1; },
  },
  {
    id: 'heavy',
    name: 'Heavy Embers',
    desc: '+30% bolt damage — shadows burst sooner.',
    max: 5,
    level: (p) => Math.round((p.damage / PLAYER.boltDamage - 1) / 0.3),
    canOffer: (p) => p.damage < PLAYER.boltDamage * 1.3 ** 5 + 0.01,
    apply: (p) => { p.damage *= 1.3; },
  },
  {
    id: 'pierce',
    name: 'Piercing Flame',
    desc: 'Bolts pass through +1 enemy.',
    max: 3,
    level: (p) => p.pierce,
    canOffer: (p) => p.pierce < 3,
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'nova',
    name: 'Nova Burst',
    desc: 'Every 7s a ring of fire sears everything near you.',
    max: 3,
    level: (p) => p.novaLevel,
    canOffer: (p) => p.novaLevel < 3,
    apply: (p) => { p.novaLevel += 1; if (p.novaTimer <= 0) p.novaTimer = 1.5; },
  },
  {
    id: 'swift',
    name: 'Swift Wisp',
    desc: '+12% movement speed — outrun the dark.',
    max: 4,
    level: (p) => Math.round((p.speed / PLAYER.speed - 1) / 0.12),
    canOffer: (p) => p.speed < PLAYER.speed * 1.12 ** 4 + 0.01,
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    desc: '+60% pickup radius — light shards fly to you.',
    max: 4,
    level: (p) => Math.round((p.magnet / 46 - 1) / 0.6),
    canOffer: (p) => p.magnet < 46 * 1.6 ** 4 + 0.01,
    apply: (p) => { p.magnet *= 1.6; },
  },
  {
    id: 'heart',
    name: 'Ember Heart',
    desc: '+25 max health and mend 25 now.',
    max: 4,
    level: (p) => Math.round((p.maxHp / PLAYER.maxHp - 1) / 0.25),
    canOffer: (p) => p.maxHp < PLAYER.maxHp + 100,
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'aura',
    name: 'Lantern Aura',
    desc: 'The lantern burns attackers: +10 damage/s in its light.',
    max: 4,
    level: (p) => p.auraLevel,
    canOffer: (p) => p.auraLevel < 4,
    apply: (p) => { p.auraLevel += 1; },
  },
  {
    id: 'mend',
    name: 'Lantern Mend',
    desc: 'Tend the flame: restore 30 lantern health.',
    max: 99,
    level: () => 0,
    canOffer: (_p, lantern) => lantern.hp < lantern.maxHp,
    apply: (_p, lantern) => { lantern.hp = Math.min(lantern.maxHp, lantern.hp + 30); },
  },
];

/** Lantern aura damage per second at the keeper's current aura level. */
export function auraDps(player) {
  return player.auraLevel * 10;
}

/** Lantern aura radius at the keeper's current aura level. */
export function auraRadius(player) {
  return player.auraLevel > 0 ? LANTERN_AURA_BASE_RADIUS + player.auraLevel * 14 : 0;
}

/** Nova damage and radius at the keeper's current nova level. */
export function novaStats(player) {
  return { damage: NOVA.damage * player.novaLevel, radius: NOVA.radius + (player.novaLevel - 1) * 25 };
}

/** Draw three distinct blessings the keeper can still use, in a shuffled order. */
export function rollChoices(random, player, lantern) {
  const available = UPGRADES.filter((u) => u.canOffer(player, lantern));
  // Shuffle a copy, then take three.
  const pool = available.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, 3);
}

/** Apply a blessing by id; returns the blessing, or null when the id is unknown. */
export function applyUpgrade(id, player, lantern) {
  const upgrade = UPGRADES.find((u) => u.id === id);
  if (!upgrade) return null;
  upgrade.apply(player, lantern);
  return upgrade;
}

/** How many pips of this blessing the keeper already holds (for the card display). */
export function upgradeLevel(upgrade, player) {
  return Math.min(upgrade.max, upgrade.level(player));
}
