/**
 * Deterministic seeded RNG (mulberry32) used for Daily Challenge levels
 * and reproducible blade layouts.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed derived from today's UTC date — everyone worldwide gets the same daily level. */
export function dailySeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** YYYY-MM-DD key in UTC, used for daily resets. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
