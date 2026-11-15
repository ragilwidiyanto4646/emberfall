// A small seeded generator (mulberry32) so the world is deterministic: the same seed
// always plays the same waves, which is what the screenshot scenes rely on. Nothing in
// the simulation ever calls Math.random; all chance flows through this.

export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [0, n). */
export function randomInt(random, n) {
  return Math.floor(random() * n);
}

/** Pick one element of an array. */
export function randomPick(random, array) {
  return array[randomInt(random, array.length)];
}

/** A point on a random edge of the field, just inside the border. */
export function randomEdgePoint(random, width, height, margin) {
  const side = randomInt(random, 4);
  if (side === 0) return { x: margin + random() * (width - 2 * margin), y: margin };
  if (side === 1) return { x: margin + random() * (width - 2 * margin), y: height - margin };
  if (side === 2) return { x: margin, y: margin + random() * (height - 2 * margin) };
  return { x: width - margin, y: margin + random() * (height - 2 * margin) };
}
