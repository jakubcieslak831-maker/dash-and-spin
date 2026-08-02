/**
 * Persistent game state — auto-saved to localStorage via zustand/persist.
 * Structured so a cloud-save layer can later sync the same serialized shape.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACHIEVEMENTS, MISSION_POOL, DAILY_REWARDS, type MissionDef, levelFromXp, xpForLevel, rankForLevel, tierFromSeasonXp, seasonTierReward, SEASON_NUMBER, XP_PER_TIER } from "./progression";
import { mulberry32, dailySeed, todayKey } from "./rng";

export interface GameStats {
  totalRuns: number;
  totalDeaths: number;
  totalDashes: number;
  classicWins: number;
  flawlessWins: number;
  dailiesCompleted: number;
  lifetimeCoins: number;
  lifetimeGems: number;
  bestBlade: number;
  bestEndless: number;
  bestTime: number | null;
  adsWatched: number;
  bestStreak: number;
  skinsOwned: number;
  trailsOwned: number;
  themesOwned: number;
}

interface DailyProgress {
  date: string;
  runs: number;
  bladesPassed: number;
  coinsEarned: number;
  wins: number;
  dashes: number;
  adsWatched: number;
  claimedMissions: string[];
  dailyChallengeDone: boolean;
}

export interface RunRecord {
  mode: "level" | "endless" | "daily";
  score: number;
  date: string;
}

interface GameStore {
  coins: number;
  gems: number;
  ownedSkins: string[];
  ownedTrails: string[];
  ownedExplosions: string[];
  ownedThemes: string[];
  equippedSkin: string;
  equippedTrail: string;
  equippedExplosion: string;
  equippedTheme: string;
  stats: GameStats;
  daily: DailyProgress;
  unlockedAchievements: string[];
  loginStreak: number;
  lastLoginDate: string | null;
  lastRewardClaimDate: string | null;
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
  /** Calmer visuals: no camera shake, fewer particles. */
  reducedMotion: boolean;
  adsRemoved: boolean;
  premium: boolean;
  tutorialSeen: boolean;
  records: RunRecord[];
  sessionDeaths: number;
  /** highest level the player has unlocked in the Levels campaign */
  unlockedLevel: number;
  /** best completion time per level number */
  levelBestTimes: Record<number, number>;
  /** timestamp of last free gem via rewarded ad, to rate-limit farming */
  lastFreeGemAt: number | null;
  /** total player XP — drives player level & rank (Phase 2) */
  playerXP: number;
  /** season pass state (Phase 3) */
  seasonXP: number;
  seasonTier: number;
  seasonPremium: boolean;
  seasonNumber: number;
  /** tiers the player has already claimed (avoids double-claiming) */
  claimedSeasonTiers: number[];

  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  addGems: (n: number) => void;
  spendGems: (n: number) => boolean;
  buyItem: (kind: "skin" | "trail" | "explosion" | "theme", id: string, price: number) => boolean;
  buyItemGems: (kind: "skin" | "trail" | "explosion" | "theme", id: string, gemPrice: number) => boolean;
  equip: (kind: "skin" | "trail" | "explosion" | "theme", id: string) => void;
  recordRun: (r: { mode: "level" | "endless" | "daily"; won: boolean; bladesPassed: number; coinsEarned: number; time: number; dashes: number; level?: number }) => { newlyAchievements: string[]; gemsAwarded: number };
  recordAdWatch: () => void;
  checkLogin: () => void;
  claimDailyReward: () => { ok: boolean; label: string };
  canClaimDailyReward: () => boolean;
  todaysMissions: () => MissionDef[];
  missionProgress: (m: MissionDef) => number;
  claimMission: (id: string) => boolean;
  setAudio: (music: number, sfx: number) => void;
  setHaptics: (on: boolean) => void;
  setReducedMotion: (on: boolean) => void;
  setAdsRemoved: (v: boolean) => void;
  setPremium: (v: boolean) => void;
  setTutorialSeen: () => void;
  grantItem: (kind: "skin" | "trail", id: string) => void;
  checkAchievements: () => string[];
  resetDailyIfNeeded: () => void;
}

const freshDaily = (): DailyProgress => ({
  date: todayKey(),
  runs: 0,
  bladesPassed: 0,
  coinsEarned: 0,
  wins: 0,
  dashes: 0,
  adsWatched: 0,
  claimedMissions: [],
  dailyChallengeDone: false,
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      coins: 0,
      gems: 5, // small welcome pouch so the gem economy is discoverable
      ownedSkins: ["classic"],
      ownedTrails: ["none"],
      ownedExplosions: ["burst"],
      ownedThemes: ["neon"],
      equippedSkin: "classic",
      equippedTrail: "none",
      equippedExplosion: "burst",
      equippedTheme: "neon",
      stats: {
        totalRuns: 0,
        totalDeaths: 0,
        totalDashes: 0,
        classicWins: 0,
        flawlessWins: 0,
        dailiesCompleted: 0,
        lifetimeCoins: 0,
        lifetimeGems: 0,
        bestBlade: 0,
        bestEndless: 0,
        bestTime: null,
        adsWatched: 0,
        bestStreak: 0,
        skinsOwned: 1,
        trailsOwned: 1,
        themesOwned: 1,
      },
      daily: freshDaily(),
      unlockedAchievements: [],
      loginStreak: 0,
      lastLoginDate: null,
      lastRewardClaimDate: null,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      hapticsEnabled: true,
      reducedMotion: false,
      adsRemoved: false,
      premium: false,
      tutorialSeen: false,
      records: [],
      sessionDeaths: 0,
      unlockedLevel: 1,
      levelBestTimes: {},
      lastFreeGemAt: null,

      addCoins: (n) =>
        set((s) => ({
          coins: s.coins + n,
          stats: { ...s.stats, lifetimeCoins: s.stats.lifetimeCoins + Math.max(0, n) },
        })),

      spendCoins: (n) => {
        if (get().coins < n) return false;
        set((s) => ({ coins: s.coins - n }));
        return true;
      },

      addGems: (n) =>
        set((s) => ({
          gems: s.gems + n,
          stats: { ...s.stats, lifetimeGems: s.stats.lifetimeGems + Math.max(0, n) },
        })),

      spendGems: (n) => {
        if (get().gems < n) return false;
        set((s) => ({ gems: s.gems - n }));
        return true;
      },

      buyItem: (kind, id, price) => {
        const s = get();
        if (!s.spendCoins(price)) return false;
        const key = kind === "skin" ? "ownedSkins" : kind === "trail" ? "ownedTrails" : kind === "explosion" ? "ownedExplosions" : "ownedThemes";
        set((st) => {
          const owned = [...(st[key] as string[]), id];
          return {
            [key]: owned,
            stats: {
              ...st.stats,
              skinsOwned: kind === "skin" ? owned.length : st.stats.skinsOwned,
              trailsOwned: kind === "trail" ? owned.length : st.stats.trailsOwned,
              themesOwned: kind === "theme" ? owned.length : st.stats.themesOwned,
            },
          } as Partial<GameStore>;
        });
        get().checkAchievements();
        return true;
      },

      buyItemGems: (kind, id, gemPrice) => {
        const s = get();
        if (!s.spendGems(gemPrice)) return false;
        const key = kind === "skin" ? "ownedSkins" : kind === "trail" ? "ownedTrails" : kind === "explosion" ? "ownedExplosions" : "ownedThemes";
        set((st) => {
          const owned = [...(st[key] as string[]), id];
          return {
            [key]: owned,
            stats: {
              ...st.stats,
              skinsOwned: kind === "skin" ? owned.length : st.stats.skinsOwned,
              trailsOwned: kind === "trail" ? owned.length : st.stats.trailsOwned,
              themesOwned: kind === "theme" ? owned.length : st.stats.themesOwned,
            },
          } as Partial<GameStore>;
        });
        get().checkAchievements();
        return true;
      },

      grantItem: (kind, id) => {
        const key = kind === "skin" ? "ownedSkins" : "ownedTrails";
        set((st) => {
          if ((st[key] as string[]).includes(id)) return {};
          const owned = [...(st[key] as string[]), id];
          return {
            [key]: owned,
            stats: {
              ...st.stats,
              skinsOwned: kind === "skin" ? owned.length : st.stats.skinsOwned,
              trailsOwned: kind === "trail" ? owned.length : st.stats.trailsOwned,
            },
          } as Partial<GameStore>;
        });
      },

      equip: (kind, id) => {
        const key = kind === "skin" ? "equippedSkin" : kind === "trail" ? "equippedTrail" : kind === "explosion" ? "equippedExplosion" : "equippedTheme";
        set({ [key]: id } as Partial<GameStore>);
      },

      recordRun: ({ mode, won, bladesPassed, coinsEarned, time, dashes, level }) => {
        get().resetDailyIfNeeded();
        // Award gems for meaningful wins so the premium currency has an
        // organic (but slow) free path in addition to the shop bundles.
        let gemsAwarded = 0;
        if (won && mode === "level") gemsAwarded = 1;
        if (won && mode === "daily") gemsAwarded = 3;
        set((s) => {
          const stats = { ...s.stats };
          stats.totalRuns += 1;
          stats.totalDashes += dashes;
          if (!won) stats.totalDeaths += 1;
          stats.bestBlade = Math.max(stats.bestBlade, bladesPassed);
          if (mode === "endless") stats.bestEndless = Math.max(stats.bestEndless, bladesPassed);
          if (won && mode === "level") {
            stats.classicWins += 1;
            if (s.sessionDeaths === 0) stats.flawlessWins += 1;
            if (stats.bestTime === null || time < stats.bestTime) stats.bestTime = time;
          }
          if (won && mode === "daily" && !s.daily.dailyChallengeDone) stats.dailiesCompleted += 1;
          stats.lifetimeCoins += coinsEarned;
          stats.lifetimeGems += gemsAwarded;

          const records = [...s.records, { mode, score: mode === "endless" ? bladesPassed : time, date: todayKey() }]
            .slice(-200);

          let unlockedLevel = s.unlockedLevel;
          const levelBestTimes = { ...s.levelBestTimes };
          if (won && mode === "level" && level) {
            unlockedLevel = Math.max(unlockedLevel, Math.min(300, level + 1));
            if (levelBestTimes[level] === undefined || time < levelBestTimes[level]) {
              levelBestTimes[level] = time;
            }
          }

          return {
            coins: s.coins + coinsEarned,
            gems: s.gems + gemsAwarded,
            stats,
            sessionDeaths: won ? s.sessionDeaths : s.sessionDeaths + 1,
            records,
            unlockedLevel,
            levelBestTimes,
            daily: {
              ...s.daily,
              runs: s.daily.runs + 1,
              bladesPassed: s.daily.bladesPassed + bladesPassed,
              coinsEarned: s.daily.coinsEarned + coinsEarned,
              wins: s.daily.wins + (won && mode === "level" ? 1 : 0),
              dashes: s.daily.dashes + dashes,
              dailyChallengeDone: s.daily.dailyChallengeDone || (won && mode === "daily"),
            },
          };
        });
        return { newlyAchievements: get().checkAchievements(), gemsAwarded };
      },

      recordAdWatch: () => {
        get().resetDailyIfNeeded();
        set((s) => ({
          stats: { ...s.stats, adsWatched: s.stats.adsWatched + 1 },
          daily: { ...s.daily, adsWatched: s.daily.adsWatched + 1 },
        }));
        get().checkAchievements();
      },

      checkLogin: () => {
        const today = todayKey();
        const s = get();
        if (s.lastLoginDate === today) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = s.lastLoginDate === yesterday ? s.loginStreak + 1 : 1;
        set((st) => ({
          loginStreak: streak,
          lastLoginDate: today,
          stats: { ...st.stats, bestStreak: Math.max(st.stats.bestStreak, streak) },
        }));
        get().resetDailyIfNeeded();
        get().checkAchievements();
      },

      canClaimDailyReward: () => get().lastRewardClaimDate !== todayKey(),

      claimDailyReward: () => {
        const s = get();
        if (!s.canClaimDailyReward()) return { ok: false, label: "" };
        const day = ((Math.max(1, s.loginStreak) - 1) % 7) + 1;
        const reward = DAILY_REWARDS[day - 1];
        set({ lastRewardClaimDate: todayKey() });
        if (reward.type === "coins") get().addCoins(reward.amount!);
        else if (reward.type === "skin") get().grantItem("skin", reward.itemId!);
        else get().grantItem("trail", reward.itemId!);
        // bonus gem on day 7 for the streak
        if (day === 7) get().addGems(5);
        get().checkAchievements();
        return { ok: true, label: reward.label };
      },

      todaysMissions: () => {
        const rng = mulberry32(dailySeed() + 777);
        const pool = [...MISSION_POOL];
        const picked: MissionDef[] = [];
        for (let i = 0; i < 4 && pool.length; i++) {
          picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        }
        return picked;
      },

      missionProgress: (m) => {
        const d = get().daily;
        return Math.min(m.target, d[m.metric]);
      },

      claimMission: (id) => {
        const s = get();
        const m = MISSION_POOL.find((x) => x.id === id);
        if (!m || s.daily.claimedMissions.includes(id)) return false;
        if (s.missionProgress(m) < m.target) return false;
        set((st) => ({ daily: { ...st.daily, claimedMissions: [...st.daily.claimedMissions, id] } }));
        get().addCoins(m.reward);
        return true;
      },

      setAudio: (music, sfx) => set({ musicVolume: music, sfxVolume: sfx }),
      setHaptics: (on) => set({ hapticsEnabled: on }),
      setReducedMotion: (on) => set({ reducedMotion: on }),
      setAdsRemoved: (v) => set({ adsRemoved: v }),
      setPremium: (v) => set({ premium: v }),
      setTutorialSeen: () => set({ tutorialSeen: true }),

      checkAchievements: () => {
        const s = get();
        const newly: string[] = [];
        for (const a of ACHIEVEMENTS) {
          if (!s.unlockedAchievements.includes(a.id) && a.check(s.stats)) newly.push(a.id);
        }
        if (newly.length) {
          set((st) => ({ unlockedAchievements: [...st.unlockedAchievements, ...newly] }));
          const bonus = newly.reduce((sum, id) => sum + (ACHIEVEMENTS.find((a) => a.id === id)?.reward ?? 0), 0);
          if (bonus) set((st) => ({ coins: st.coins + bonus, stats: { ...st.stats, lifetimeCoins: st.stats.lifetimeCoins + bonus } }));
        }
        return newly;
      },

      resetDailyIfNeeded: () => {
        if (get().daily.date !== todayKey()) set({ daily: freshDaily() });
      },
    }),
    {
      name: "bladerun-save-v1",
      partialize: (s) => {
        const { sessionDeaths: _omit, ...rest } = s;
        return rest as GameStore;
      },
    },
  ),
);
