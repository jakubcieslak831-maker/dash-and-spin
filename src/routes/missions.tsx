import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MenuShell, GameButton } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { DAILY_REWARDS } from "@/lib/game/progression";
import { audio, haptic } from "@/lib/game/audio";
import { AdModal } from "@/components/game/AdModal";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title: "Missions & Daily Rewards — BladeRun" },
      { name: "description", content: "Complete daily missions and claim consecutive login rewards to earn coins and cosmetics in BladeRun." },
      { property: "og:title", content: "BladeRun Missions" },
      { property: "og:description", content: "Daily missions and login rewards." },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  const hydrated = useHydrated();
  const store = useGameStore();
  const [showAd, setShowAd] = useState(false);
  const [, force] = useState(0);

  if (!hydrated)
    return (
      <MenuShell title="Missions">
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      </MenuShell>
    );

  const missions = store.todaysMissions();
  const rewardDay = ((Math.max(1, store.loginStreak) - 1) % 7) + 1;
  const canClaim = store.canClaimDailyReward();

  return (
    <MenuShell title="Missions">
      {/* Daily login rewards */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Login streak · Day {store.loginStreak || 1}
        </h2>
        <div className="grid grid-cols-7 gap-1.5">
          {DAILY_REWARDS.map((r) => {
            const isToday = r.day === rewardDay;
            const past = r.day < rewardDay || (r.day === rewardDay && !canClaim);
            return (
              <div
                key={r.day}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${
                  isToday && canClaim ? "animate-pulse-glow border-gold/60 bg-gold/10" : past ? "border-border bg-muted opacity-50" : "border-border bg-card"
                }`}
              >
                <span className="text-[9px] uppercase text-muted-foreground">D{r.day}</span>
                <span className="text-base" aria-hidden>{r.type === "coins" ? "🪙" : r.type === "skin" ? "🔮" : "✨"}</span>
                <span className="text-[8px] leading-tight text-muted-foreground">{r.label}</span>
              </div>
            );
          })}
        </div>
        {canClaim && (
          <GameButton
            variant="gold"
            className="mt-3 w-full"
            onClick={() => {
              const r = store.claimDailyReward();
              if (r.ok) {
                audio.play("reward");
                if (store.hapticsEnabled) haptic([30, 40, 30]);
              }
            }}
          >
            Claim Day {rewardDay}: {DAILY_REWARDS[rewardDay - 1].label}
          </GameButton>
        )}
      </section>

      {/* Missions */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Today's missions</h2>
        <div className="flex flex-col gap-3">
          {missions.map((m) => {
            const progress = store.missionProgress(m);
            const done = progress >= m.target;
            const claimed = store.daily.claimedMissions.includes(m.id);
            return (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-sm font-bold">{m.name}</div>
                    <div className="text-xs text-gold">+{m.reward} 🪙</div>
                  </div>
                  {claimed ? (
                    <span className="text-xl text-success" aria-label="Claimed">✓</span>
                  ) : (
                    <GameButton
                      variant={done ? "gold" : "ghost"}
                      className="!px-4 !py-2 text-[11px]"
                      disabled={!done}
                      onClick={() => {
                        if (store.claimMission(m.id)) {
                          audio.play("reward");
                          force((x) => x + 1);
                        }
                      }}
                    >
                      {done ? "Claim" : `${progress}/${m.target}`}
                    </GameButton>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress / m.target) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bonus rewarded ad */}
      <section className="mt-6">
        <GameButton variant="ghost" className="w-full" onClick={() => setShowAd(true)}>
          📺 Watch ad · +75 coins
        </GameButton>
      </section>

      {showAd && (
        <AdModal
          kind="rewarded"
          onSkip={() => setShowAd(false)}
          onComplete={() => {
            store.recordAdWatch();
            store.addCoins(75);
            audio.play("reward");
            setShowAd(false);
          }}
        />
      )}
    </MenuShell>
  );
}
