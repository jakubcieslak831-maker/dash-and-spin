import { createFileRoute, Link } from "@tanstack/react-router";
import { useGameStore } from "@/lib/game/store";
import { MenuShell, GameButton } from "@/components/game/MenuShell";
import { useHydrated } from "@/hooks/use-hydrated";
import { audio, haptic } from "@/lib/game/audio";
import { useState } from "react";

export const Route = createFileRoute("/tournament")({
  head: () => ({
    meta: [
      { title: "Weekly Tournament — BladeRun" },
      { name: "description", content: "Compete in the weekly endless tournament for gems and coins." },
      { property: "og:title", content: "Weekly Tournament — BladeRun" },
      { property: "og:description", content: "Compete in the weekly endless tournament for gems and coins." },
    ],
  }),
  component: TournamentScreen,
});

const REWARD_TIERS = [
  { min: 200, label: "Legend", gems: 50, coins: 5000 },
  { min: 100, label: "Champion", gems: 25, coins: 2000 },
  { min: 50, label: "Veteran", gems: 10, coins: 500 },
  { min: 1, label: "Rookie", gems: 0, coins: 0 },
];

function TournamentScreen() {
  const hydrated = useHydrated();
  const tournament = useGameStore((s) => s.tournament);
  const claimTournamentRewards = useGameStore((s) => s.claimTournamentRewards);
  const haptics = useGameStore((s) => s.hapticsEnabled);
  const [claimed, setClaimed] = useState<{ gems: number; coins: number } | null>(null);

  const tier = REWARD_TIERS.find((t) => tournament.bestScore >= t.min) ?? REWARD_TIERS[REWARD_TIERS.length - 1];
  const nextTier = REWARD_TIERS.find((t) => t.min > tournament.bestScore);

  const handleClaim = () => {
    const res = claimTournamentRewards();
    if (res.ok) {
      audio.play("win");
      if (haptics) haptic([30, 30, 60]);
      setClaimed({ gems: res.gems, coins: res.coins });
    }
  };

  return (
    <MenuShell title="Weekly Tournament">
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Current Week</div>
          <div className="mt-1 font-display text-2xl font-black text-primary">{hydrated ? tournament.weekKey || "—" : "—"}</div>
          <div className="mt-4 text-5xl font-black tabular-nums text-foreground">{hydrated ? tournament.bestScore : 0}</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Best Endless Score</div>
          <div className="mt-3 text-sm text-muted-foreground">Total runs: {hydrated ? tournament.totalRuns : 0}</div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">Current Tier</h2>
          <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
            <div>
              <div className="font-display text-lg font-bold text-foreground">{tier.label}</div>
              <div className="text-xs text-muted-foreground">Score {tournament.bestScore}+</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-primary">{tier.gems > 0 ? `💎 ${tier.gems}` : "—"}</div>
              <div className="font-bold text-gold">{tier.coins > 0 ? `🪙 ${tier.coins}` : "—"}</div>
            </div>
          </div>
          {nextTier && (
            <div className="mt-3 text-xs text-muted-foreground">
              Reach <span className="font-bold text-foreground">{nextTier.min}</span> blades for{" "}
              <span className="text-primary">💎 {nextTier.gems}</span> +{" "}
              <span className="text-gold">🪙 {nextTier.coins}</span>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">Rewards</h2>
          <div className="space-y-2">
            {REWARD_TIERS.map((t) => (
              <div
                key={t.label}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  t.label === tier.label ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="font-bold">{t.label}</span>
                <span className="tabular-nums">{t.min}+ blades</span>
                <span>
                  {t.gems > 0 && <span className="mr-2">💎 {t.gems}</span>}
                  {t.coins > 0 && <span>🪙 {t.coins.toLocaleString()}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {claimed ? (
          <div className="rounded-3xl border border-primary/40 bg-primary/10 p-6 text-center">
            <div className="text-3xl" aria-hidden>🎉</div>
            <h3 className="mt-2 font-display text-lg font-bold text-primary">Rewards Claimed!</h3>
            <div className="mt-1 text-sm">
              {claimed.gems > 0 && <span className="mr-3">💎 +{claimed.gems}</span>}
              {claimed.coins > 0 && <span>🪙 +{claimed.coins.toLocaleString()}</span>}
            </div>
          </div>
        ) : tournament.claimed ? (
          <div className="rounded-3xl border border-muted/40 bg-muted/10 p-5 text-center text-sm text-muted-foreground">
            You already claimed this week&apos;s rewards. Come back next week!
          </div>
        ) : (
          <GameButton
            className="w-full"
            disabled={tier.gems === 0 && tier.coins === 0}
            onClick={handleClaim}
          >
            Claim Rewards
          </GameButton>
        )}

        <Link
          to="/play"
          search={{ mode: "endless" }}
          className="block rounded-2xl border border-border bg-card py-3.5 text-center font-display text-sm font-bold uppercase tracking-widest text-foreground transition-transform active:scale-95"
          onClick={() => {
            audio.play("click");
            if (haptics) haptic();
          }}
        >
          Play Endless →
        </Link>
      </div>
    </MenuShell>
  );
}
