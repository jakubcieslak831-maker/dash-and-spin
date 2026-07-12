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
