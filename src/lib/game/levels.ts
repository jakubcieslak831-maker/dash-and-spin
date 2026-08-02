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
  /** boss finale: every 10th level ends with a Mega Blade */
  isBoss: boolean;
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
  // 6 blades at L1 growing to ~70 at L300
  const blades = Math.round(clamp(6 + (l - 1) * 0.22, 6, 70));
  // constant forward speed ramps gently from 6 to ~12
  const speed = clamp(6 + (l - 1) * 0.02, 6, 12);
  // difficulty stays capped so hardest levels remain reachable
  const difficulty = clamp(1 + (l - 1) * 0.008, 1, 2.8);
  return {
    level: l,
    blades,
    speed,
    difficulty,
    seed: (0x9e37 + l * 2654435761) >>> 0,
    isBoss: l % 10 === 0,
  };
}

export function worldOf(level: number): number {
  return Math.floor((clamp(level, 1, MAX_LEVEL) - 1) / 10) + 1;
}

export const WORLD_NAMES = [
  "Rookie Run", "Neon Rush", "Blade Storm", "Iron Gauntlet", "Velocity",
  "Overdrive", "Meltdown", "Hyperblade", "Singularity", "Legend",
  "Ascension", "Chromatic", "Event Horizon", "Infinity Loop", "Apex",
  "Nova Reach", "Prism Gate", "Void Descent", "Chrono Break", "Starforge",
  "Eclipse", "Quantum", "Nebula", "Cosmos", "Meteor Run",
  "Solar Flare", "Black Hole", "Warp Drive", "Hyperspace", "Ascendant",
];

