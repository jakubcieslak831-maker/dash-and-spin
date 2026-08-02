import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MenuShell } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { seasonTierReward, SEASON_TIERS, XP_PER_TIER } from "@/lib/game/progression";
import { audio, haptic } from "@/lib/game/audio";
import { PaymentModal } from "@/components/game/PaymentModal";

export const Route = createFileRoute("/season")({
  head: () => ({
    meta: [
      { title: "Season Pass — BladeRun" },
      { name: "description", content: "Claim free and premium rewards across 100 tiers in BladeRun Season 1." },
      { property: "og:title", content: "BladeRun Season Pass" },
      { property: "og:description", content: "100 tiers of free and premium rewards." },
    ],
  }),
  component: SeasonPage,
});

function SeasonPage() {
  const hydrated = useHydrated();
  const seasonTier = useGameStore((s) => s.seasonTier);
  const seasonXP = useGameStore((s) => s.seasonXP);
  const seasonPremium = useGameStore((s) => s.seasonPremium);
  const claimedSeasonTiers = useGameStore((s) => s.claimedSeasonTiers);
  const claimSeasonTier = useGameStore((s) => s.claimSeasonTier);
  const setSeasonPremium = useGameStore((s) => s.setSeasonPremium);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const [popup, setPopup] = useState<string[] | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const currentTier = hydrated ? seasonTier : 0;
  const xpIntoTier = hydrated ? seasonXP % XP_PER_TIER : 0;
  const xpPct = (xpIntoTier / XP_PER_TIER) * 100;

  // Render tiers in a scrollable list — show current tier block + nearby + full list
  const tiers = Array.from({ length: SEASON_TIERS }, (_, i) => i + 1);

  const handleClaim = (tier: number) => {
    const result = claimSeasonTier(tier);
    if (result.ok && result.labels.length) {
      audio.play("reward");
      if (hapticsEnabled) haptic([30, 40, 30]);
      setPopup(result.labels);
    }
  };

  const isClaimed = (tier: number) => claimedSeasonTiers.includes(tier);
  const canClaim = (tier: number) => tier <= currentTier && !isClaimed(tier);
  const hasPremiumReward = (tier: number) => {
    const r = seasonTierReward(tier);
    return !!r.premium;
  };

  return (
    <MenuShell title="Season Pass">
      {/* Season header */}
      <div className="mb-5 rounded-3xl border border-gold/40 bg-card p-5 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Season 1</div>
        <div className="font-display text-3xl font-black uppercase tracking-widest text-gold">Battle Pass</div>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div>
            <div className="font-display text-2xl font-black tabular-nums text-primary">{currentTier}</div>
            <div className="text-xs text-muted-foreground">Current Tier</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-display text-2xl font-black tabular-nums">{SEASON_TIERS}</div>
            <div className="text-xs text-muted-foreground">Max Tier</div>
          </div>
        </div>

        {/* XP progress to next tier */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{xpIntoTier} XP</span>
            <span className="tabular-nums">{XP_PER_TIER} XP / tier</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-border bg-background">
            <div className="glow-primary h-full rounded-full bg-primary transition-all" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        {/* Premium toggle */}
        {!seasonPremium ? (
          <button
            onClick={() => setShowPremiumModal(true)}
            className="glow-primary mt-4 w-full rounded-2xl bg-primary px-5 py-3 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground active:scale-95"
          >
            ★ Unlock Premium Track
          </button>
        ) : (
          <div className="mt-4 rounded-2xl border border-gold/50 bg-gold/10 py-2.5 text-center font-display text-sm font-bold uppercase tracking-widest text-gold">
            ★ Premium Unlocked
          </div>
        )}
      </div>

      {/* Tier track */}
      <div className="flex flex-col gap-2">
        {tiers.map((tier) => {
          const reward = seasonTierReward(tier);
          const claimed = isClaimed(tier);
          const reachable = tier <= currentTier;
          const isCurrent = tier === currentTier;
          const isMilestone = tier % 10 === 0;

          return (
            <div
              key={tier}
              className={`flex items-stretch gap-2 rounded-2xl border px-3 py-2.5 transition-all ${
                isCurrent ? "border-primary/60 bg-primary/5 glow-primary" : isMilestone ? "border-gold/40 bg-card" : "border-border bg-card"
              } ${!reachable ? "opacity-50" : ""}`}
            >
              {/* Tier number */}
              <div className="flex w-14 flex-col items-center justify-center">
                <span className={`font-display text-xl font-black tabular-nums ${isMilestone ? "text-gold" : "text-foreground"}`}>
                  {tier}
                </span>
                {isCurrent && <span className="text-[10px] font-bold uppercase text-primary">NOW</span>}
                {claimed && <span className="text-[10px] font-bold uppercase text-muted-foreground">✓</span>}
              </div>

              {/* Free reward */}
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                <span className="text-lg" aria-hidden>{reward.free?.type === "coins" ? "🪙" : reward.free?.type === "gems" ? "💎" : reward.free?.type === "skin" ? "🎨" : reward.free?.type === "trail" ? "✨" : "🎁"}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">{reward.free?.label}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Free</div>
                </div>
              </div>

              {/* Premium reward */}
              <div className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${
                seasonPremium && hasPremiumReward(tier) ? "border-gold/40 bg-gold/5" : "border-border/60 bg-background/30"
              }`}>
                <span className="text-lg" aria-hidden>{reward.premium?.type === "coins" ? "🪙" : reward.premium?.type === "gems" ? "💎" : reward.premium?.type === "skin" ? "🎨" : reward.premium?.type === "trail" ? "✨" : reward.premium?.type === "theme" ? "🌈" : "🎁"}</span>
                <div className="flex-1">
                  <div className={`text-xs font-bold ${seasonPremium ? "text-gold" : "text-muted-foreground"}`}>
                    {reward.premium?.label}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">★ Premium</div>
                </div>
              </div>

              {/* Claim button */}
              <div className="flex w-16 items-center justify-center">
                {canClaim(tier) ? (
                  <button
                    onClick={() => handleClaim(tier)}
                    className="glow-primary rounded-xl bg-primary px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-90"
                  >
                    Claim
                  </button>
                ) : claimed ? (
                  <span className="text-lg" aria-hidden>✅</span>
                ) : reachable ? null : (
                  <span className="text-xs text-muted-foreground">🔒</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim popup */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm" onClick={() => setPopup(null)}>
          <div className="animate-enter mx-6 w-full max-w-xs rounded-3xl border border-gold/50 bg-card p-8 text-center">
            <div className="mb-3 text-5xl" aria-hidden>🎁</div>
            <h2 className="font-display text-lg font-bold uppercase tracking-widest text-gold">Reward Claimed!</h2>
            <div className="mt-3 space-y-1">
              {popup.map((label, i) => (
                <p key={i} className="font-display text-sm font-bold">{label}</p>
              ))}
            </div>
            <button className="glow-primary mt-5 w-full rounded-2xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground">
              Awesome
            </button>
          </div>
        </div>
      )}

      {/* Premium purchase modal */}
      {showPremiumModal && (
        <PaymentModal
          title="Season 1 Premium"
          description="Unlock the premium reward track for all 100 tiers — exclusive skins, trails, themes & bonus gems!"
          price={9.99}
          onClose={() => setShowPremiumModal(false)}
          onSuccess={() => {
            setSeasonPremium();
            audio.play("levelup");
            if (hapticsEnabled) haptic([50, 30, 50, 30, 80]);
            setShowPremiumModal(false);
            setPopup(["★ Premium Track Unlocked!", "All premium rewards are now claimable!"]);
          }}
        />
      )}
    </MenuShell>
  );
}
