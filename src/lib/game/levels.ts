/**
 * Level progression config for BladeRun.
 *
 * There are MAX_LEVEL hand-tuned-by-formula levels. Players start at level 1
 * and unlock the next level by reaching the treasure chest. Levels get longer
 * (more blades) and more complex (faster blades, tighter gaps, more gaps,
 * wobble) as the number climbs.
 *
 * IMPORTANT: every level must be *reachable* — the blade rotation speed is
 * capped below the player's maximum steering speed and the gap size has a
 * generous floor, so no obstacle is physically impossible to line up with.
 *
 * Everything here is deterministic from the level number, so a given level
 * always plays the same — great for practice and fair competition.
 */

export const MAX_LEVEL = 300;

export interface LevelConfig {
  level: number;
  /** number of blades in the run */
  blades: number;
  /** constant forward speed (units/s) */
  speed: number;
  /** difficulty multiplier feeding blade speed / gap size / gap count */
  difficulty: number;
  /** seed so the layout is stable for this level */
  seed: number;
}

/** Clamp helper. */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Derive a level's configuration from its number.
 * Tuned so early levels are gentle and late levels are a real gauntlet,
 * yet every level remains completable with careful steering.
 */
export function getLevelConfig(level: number): LevelConfig {
  const l = clamp(Math.round(level), 1, MAX_LEVEL);
  // 6 blades at L1 growing to ~50 at L150
  const blades = Math.round(clamp(6 + (l - 1) * 0.32, 6, 50));
  // constant forward speed ramps gently from 6 to ~11
  const speed = clamp(6 + (l - 1) * 0.035, 6, 11);
  // difficulty scales blade rotation speed + gap tightness, capped so the
  // hardest levels still stay reachable within the player's steering limit.
  const difficulty = clamp(1 + (l - 1) * 0.014, 1, 2.6);
  return {
    level: l,
    blades,
    speed,
    difficulty,
    // distinct, stable seed per level
    seed: (0x9e37 + l * 2654435761) >>> 0,
  };
}

/** Human-friendly grouping into "worlds" of 10 levels for the level select UI. */
export function worldOf(level: number): number {
  return Math.floor((clamp(level, 1, MAX_LEVEL) - 1) / 10) + 1;
}

export const WORLD_NAMES = [
  "Rookie Run",
  "Neon Rush",
  "Blade Storm",
  "Iron Gauntlet",
  "Velocity",
  "Overdrive",
  "Meltdown",
  "Hyperblade",
  "Singularity",
  "Legend",
  "Ascension",
  "Chromatic",
  "Event Horizon",
  "Infinity Loop",
  "Apex",
];
