import { createFileRoute } from "@tanstack/react-router";
import { MenuShell } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { xpToNext, RANKS, rankForLevel } from "@/lib/game/progression";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Player Profile — BladeRun" },
      { name: "description", content: "Track your player level, rank, lifetime stats, and season progress in BladeRun." },
      { property: "og:title", content: "BladeRun Player Profile" },
      { property: "og:description", content: "Your level, rank, and lifetime stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const hydrated = useHydrated();
  const playerXP = useGameStore((s) => s.playerXP);
  const seasonXP = useGameStore((s) => s.seasonXP);
  const seasonTier = useGameStore((s) => s.seasonTier);
  const stats = useGameStore((s) => s.stats);
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const ownedSkins = useGameStore((s) => s.ownedSkins);
  const ownedTrails = useGameStore((s) => s.ownedTrails);
  const ownedThemes = useGameStore((s) => s.ownedThemes);
  const unlockedAchievements = useGameStore((s) => s.unlockedAchievements);
  const loginStreak = useGameStore((s) => s.loginStreak);

  const xpInfo = hydrated ? xpToNext(playerXP) : { into: 0, need: 60, level: 1 };
  const rank = hydrated ? rankForLevel(xpInfo.level) : RANKS[0];
  const nextRank = RANKS.find((r) => r.minLevel > xpInfo.level);
  const seasonPct = hydrated ? (seasonXP % 120) / 120 * 100 : 0;

  const statRows: { label: string; value: string }[] = [
    { label: "Total Runs", value: `${stats.totalRuns}` },
    { label: "Total Deaths", value: `${stats.totalDeaths}` },
    { label: "Total Dashes", value: `${stats.totalDashes}` },
    { label: "Classic Wins", value: `${stats.classicWins}` },
    { label: "Flawless Wins", value: `${stats.flawlessWins}` },
    { label: "Daily Wins", value: `${stats.dailiesCompleted}` },
    { label: "Best Blade (Level)", value: `${stats.bestBlade}` },
    { label: "Best Endless", value: `${stats.bestEndless} blades` },
    { label: "Best Classic Time", value: stats.bestTime !== null ? `${stats.bestTime.toFixed(1)}s` : "—" },
    { label: "Lifetime Coins", value: `${stats.lifetimeCoins.toLocaleString()}` },
    { label: "Lifetime Gems", value: `${stats.lifetimeGems.toLocaleString()}` },
    { label: "Ads Watched", value: `${stats.adsWatched}` },
    { label: "Best Login Streak", value: `${stats.bestStreak} days` },
    { label: "Campaign Progress", value: `Level ${unlockedLevel}/300` },
    { label: "Skins Owned", value: `${ownedSkins.length}` },
    { label: "Trails Owned", value: `${ownedTrails.length}` },
    { label: "Themes Owned", value: `${ownedThemes.length}` },
    { label: "Achievements", value: `${unlockedAchievements.length}/32` },
  ];

  return (
    <MenuShell title="Profile">
      {/* Rank card */}
      <div className="mb-5 rounded-3xl border border-primary/40 bg-card p-6 text-center">
        <div className="animate-float mx-auto mb-2 text-5xl" aria-hidden>{rank.emoji}</div>
        <h2 className="font-display text-2xl font-black uppercase tracking-widest text-primary">{rank.name}</h2>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Player Level {xpInfo.level}</p>
        {nextRank && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Level {nextRank.minLevel} → {nextRank.emoji} {nextRank.name}
          </p>
        )}

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{xpInfo.into} XP</span>
            <span className="tabular-nums">{xpInfo.need} XP to level up</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-border bg-background">
            <div
              className="glow-primary h-full rounded-full bg-primary transition-all"
              style={{ width: `${(xpInfo.into / xpInfo.need) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Season summary */}
      <div className="mb-5 rounded-2xl border border-gold/40 bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-sm font-bold uppercase tracking-widest text-gold">Season 1</span>
          <span className="font-display text-lg font-black text-gold">Tier {seasonTier}/100</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-border bg-background">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${seasonPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {120 - (seasonXP % 120)} season XP to next tier
        </p>
      </div>

      {/* Login streak */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <div>
          <div className="font-display text-sm font-bold uppercase tracking-widest">Login Streak</div>
          <div className="text-xs text-muted-foreground">Keep it going!</div>
        </div>
        <div className="text-3xl font-display font-black text-primary tabular-nums">{loginStreak}🔥</div>
      </div>

      {/* Stats grid */}
      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">Lifetime Stats</h3>
      <div className="grid grid-cols-2 gap-2">
        {statRows.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="font-display text-lg font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>
    </MenuShell>
  );
}
