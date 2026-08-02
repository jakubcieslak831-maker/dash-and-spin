/**
 * Achievements catalog (30+) and mission pool.
 * Achievements are evaluated against lifetime stats; missions reset daily.
 */
import type { GameStats } from "./store";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
  check: (s: GameStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_run", name: "First Steps", desc: "Play your first run", reward: 50, check: (s) => s.totalRuns >= 1 },
  { id: "first_win", name: "First Win", desc: "Beat Classic Mode once", reward: 100, check: (s) => s.classicWins >= 1 },
  { id: "runs_10", name: "Warming Up", desc: "Play 10 runs", reward: 100, check: (s) => s.totalRuns >= 10 },
  { id: "runs_50", name: "Regular", desc: "Play 50 runs", reward: 250, check: (s) => s.totalRuns >= 50 },
  { id: "runs_200", name: "Addicted", desc: "Play 200 runs", reward: 500, check: (s) => s.totalRuns >= 200 },
  { id: "deaths_10", name: "Learning Curve", desc: "Die 10 times", reward: 50, check: (s) => s.totalDeaths >= 10 },
  { id: "deaths_100", name: "100 Deaths", desc: "Die 100 times", reward: 300, check: (s) => s.totalDeaths >= 100 },
  { id: "deaths_500", name: "Unbreakable Spirit", desc: "Die 500 times", reward: 1000, check: (s) => s.totalDeaths >= 500 },
  { id: "blade_5", name: "Getting Sharp", desc: "Reach blade 5", reward: 75, check: (s) => s.bestBlade >= 5 },
  { id: "blade_10", name: "Reach Blade 10", desc: "Reach blade 10 in any mode", reward: 150, check: (s) => s.bestBlade >= 10 },
  { id: "blade_15", name: "Reach Blade 15", desc: "Reach the final blade", reward: 300, check: (s) => s.bestBlade >= 15 },
  { id: "endless_10", name: "Survivor", desc: "Pass 10 blades in Endless", reward: 150, check: (s) => s.bestEndless >= 10 },
  { id: "endless_25", name: "Marathon", desc: "Pass 25 blades in Endless", reward: 400, check: (s) => s.bestEndless >= 25 },
  { id: "endless_50", name: "Immortal", desc: "Pass 50 blades in Endless", reward: 1000, check: (s) => s.bestEndless >= 50 },
  { id: "wins_5", name: "Champion", desc: "Beat Classic 5 times", reward: 250, check: (s) => s.classicWins >= 5 },
  { id: "wins_25", name: "Legend", desc: "Beat Classic 25 times", reward: 750, check: (s) => s.classicWins >= 25 },
  { id: "flawless", name: "Finish Without Dying", desc: "Win a run on your first try of a session", reward: 300, check: (s) => s.flawlessWins >= 1 },
  { id: "speed_40", name: "Speedrunner", desc: "Beat Classic in under 40 seconds", reward: 500, check: (s) => s.bestTime !== null && s.bestTime < 40 },
  { id: "speed_30", name: "Lightning", desc: "Beat Classic in under 30 seconds", reward: 1000, check: (s) => s.bestTime !== null && s.bestTime < 30 },
  { id: "daily_1", name: "Complete Daily Challenge", desc: "Beat one Daily Challenge", reward: 150, check: (s) => s.dailiesCompleted >= 1 },
  { id: "daily_7", name: "Devoted", desc: "Beat 7 Daily Challenges", reward: 500, check: (s) => s.dailiesCompleted >= 7 },
  { id: "coins_1000", name: "Collect 1000 Coins", desc: "Earn 1,000 coins lifetime", reward: 100, check: (s) => s.lifetimeCoins >= 1000 },
  { id: "coins_10000", name: "Rich", desc: "Earn 10,000 coins lifetime", reward: 500, check: (s) => s.lifetimeCoins >= 10000 },
  { id: "skins_5", name: "Collector", desc: "Unlock 5 skins", reward: 200, check: (s) => s.skinsOwned >= 5 },
  { id: "skins_10", name: "Unlock 10 Skins", desc: "Unlock 10 skins", reward: 500, check: (s) => s.skinsOwned >= 10 },
  { id: "skins_20", name: "Fashionista", desc: "Unlock every skin", reward: 2000, check: (s) => s.skinsOwned >= 20 },
  { id: "trails_5", name: "Leaving a Mark", desc: "Unlock 5 trails", reward: 200, check: (s) => s.trailsOwned >= 5 },
  { id: "themes_3", name: "Decorator", desc: "Unlock 3 tunnel themes", reward: 300, check: (s) => s.themesOwned >= 3 },
  { id: "streak_3", name: "Habit Forming", desc: "3-day login streak", reward: 150, check: (s) => s.bestStreak >= 3 },
  { id: "streak_7", name: "Week Warrior", desc: "7-day login streak", reward: 500, check: (s) => s.bestStreak >= 7 },
  { id: "ads_1", name: "Second Chance", desc: "Use one revive", reward: 50, check: (s) => s.adsWatched >= 1 },
  { id: "dash_500", name: "Dash Master", desc: "Dash 500 times", reward: 250, check: (s) => s.totalDashes >= 500 },
];

export interface MissionDef {
  id: string;
  name: string;
  target: number;
  reward: number;
  /** which daily counter this mission tracks */
  metric: "runs" | "bladesPassed" | "coinsEarned" | "wins" | "dashes" | "adsWatched";
}

export const MISSION_POOL: MissionDef[] = [
  { id: "m_runs5", name: "Finish 5 runs", target: 5, reward: 100, metric: "runs" },
  { id: "m_runs10", name: "Finish 10 runs", target: 10, reward: 200, metric: "runs" },
  { id: "m_blades20", name: "Pass 20 blades total", target: 20, reward: 150, metric: "bladesPassed" },
  { id: "m_blades40", name: "Pass 40 blades total", target: 40, reward: 300, metric: "bladesPassed" },
  { id: "m_coins300", name: "Earn 300 coins", target: 300, reward: 150, metric: "coinsEarned" },
  { id: "m_win1", name: "Beat Classic Mode", target: 1, reward: 200, metric: "wins" },
  { id: "m_dash50", name: "Dash 50 times", target: 50, reward: 100, metric: "dashes" },
  { id: "m_ad1", name: "Watch one rewarded ad", target: 1, reward: 150, metric: "adsWatched" },
];

export interface DailyRewardDef {
  day: number;
  type: "coins" | "skin" | "trail";
  amount?: number;
  itemId?: string;
  label: string;
}

export const DAILY_REWARDS: DailyRewardDef[] = [
  { day: 1, type: "coins", amount: 100, label: "100 Coins" },
  { day: 2, type: "coins", amount: 150, label: "150 Coins" },
  { day: 3, type: "skin", itemId: "toxic", label: "Toxic Skin" },
  { day: 4, type: "coins", amount: 250, label: "250 Coins" },
  { day: 5, type: "trail", itemId: "volt", label: "Volt Trail" },
  { day: 6, type: "coins", amount: 500, label: "500 Coins" },
  { day: 7, type: "skin", itemId: "plasma", label: "Epic Plasma Skin" },
];

/* ===================================================================
 * Player XP & Rank system (Phase 2)
 * =================================================================== */

export interface RankDef {
  name: string;
  minLevel: number;
  emoji: string;
}

/** Rank tiers by player level. The last matching entry wins. */
export const RANKS: RankDef[] = [
  { name: "Rookie", minLevel: 1, emoji: "🔰" },
  { name: "Apprentice", minLevel: 5, emoji: "⚡" },
  { name: "Runner", minLevel: 12, emoji: "🏃" },
  { name: "Veteran", minLevel: 22, emoji: "🛡️" },
  { name: "Elite", minLevel: 35, emoji: "💠" },
  { name: "Master", minLevel: 50, emoji: "👑" },
  { name: "Legend", minLevel: 75, emoji: "🏆" },
];

/** Total XP required to *reach* a given player level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (l - 1) * (l - 1) * 60;
}

/** Derive the player level from total accumulated XP. */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  // invert xpForLevel: xp = (l-1)^2 * 60  →  l = 1 + sqrt(xp/60)
  return 1 + Math.floor(Math.sqrt(xp / 60));
}

/** XP still needed to advance from current XP to the next level. */
export function xpToNext(xp: number): { into: number; need: number; level: number } {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { into: xp - floor, need: next - floor, level };
}

export function rankForLevel(level: number): RankDef {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
}

/* ===================================================================
 * Season / Battle Pass (Phase 3)
 * =================================================================== */

export const SEASON_NUMBER = 1;
export const SEASON_TIERS = 100;
/** Season XP needed to advance one tier. */
export const XP_PER_TIER = 120;

export function tierFromSeasonXp(seasonXp: number): number {
  return Math.min(SEASON_TIERS, Math.floor(seasonXp / XP_PER_TIER));
}

export interface SeasonRewardEntry {
  type: "coins" | "gems" | "skin" | "trail" | "theme";
  amount?: number;
  itemId?: string;
  label: string;
  premium?: boolean;
}

export interface SeasonTierReward {
  tier: number;
  free?: SeasonRewardEntry;
  premium?: SeasonRewardEntry;
}

/** Premium-track exclusive cosmetics unlocked at milestone tiers. */
const SEASON_PREMIUM_ITEMS: Record<number, SeasonRewardEntry> = {
  10: { type: "trail", itemId: "comet", label: "Comet Trail", premium: true },
  25: { type: "skin", itemId: "aurelian", label: "Aurelian Skin", premium: true },
  40: { type: "theme", itemId: "sakura", label: "Sakura Theme", premium: true },
  55: { type: "trail", itemId: "stardust", label: "Stardust Trail", premium: true },
  70: { type: "skin", itemId: "midnight", label: "Midnight Bloom", premium: true },
  85: { type: "theme", itemId: "vaporwave", label: "Vaporwave Theme", premium: true },
  100: { type: "skin", itemId: "cyberdream", label: "Cyberdream Skin", premium: true },
};

/**
 * Deterministically derive the reward for a given tier (1-100).
 * Free track: coins/gems on a repeating pattern.
 * Premium track: gems every tier + milestone cosmetics.
 */
export function seasonTierReward(tier: number): SeasonTierReward {
  const t = Math.max(1, Math.min(SEASON_TIERS, Math.floor(tier)));
  const result: SeasonTierReward = { tier: t };

  // Free track
  if (t % 10 === 0) result.free = { type: "gems", amount: 5 + Math.floor(t / 10) * 2, label: `${5 + Math.floor(t / 10) * 2} Gems` };
  else if (t % 5 === 0) result.free = { type: "coins", amount: 200 + t * 3, label: `${200 + t * 3} Coins` };
  else result.free = { type: "coins", amount: 80 + t * 2, label: `${80 + t * 2} Coins` };

  // Premium track
  if (SEASON_PREMIUM_ITEMS[t]) result.premium = SEASON_PREMIUM_ITEMS[t];
  else if (t % 10 === 0) result.premium = { type: "gems", amount: 20 + Math.floor(t / 10) * 5, label: `${20 + Math.floor(t / 10) * 5} Gems`, premium: true };
  else if (t % 5 === 0) result.premium = { type: "gems", amount: 12, label: "12 Gems", premium: true };
  else result.premium = { type: "gems", amount: 5 + Math.floor(t / 20), label: `${5 + Math.floor(t / 20)} Gems`, premium: true };

  return result;
}
