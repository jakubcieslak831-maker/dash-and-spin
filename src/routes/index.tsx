import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { audio, haptic } from "@/lib/game/audio";
import { CoinBadge } from "@/components/game/MenuShell";
import { DAILY_REWARDS } from "@/lib/game/progression";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BladeRun — Dash Through the Blades" },
      { name: "description", content: "BladeRun: a fast neon tunnel-runner. Dash through 15 spinning blades, beat the clock, and reach the treasure. Classic, Endless & Daily Challenge modes." },
      { property: "og:title", content: "BladeRun — Dash Through the Blades" },
      { property: "og:description", content: "A fast neon tunnel-runner. Dash through spinning blades and reach the treasure." },
    ],
  }),
  component: MainMenu,
});

function MainMenu() {
  const hydrated = useHydrated();
  const store = useGameStore();
  const [rewardPopup, setRewardPopup] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    store.checkLogin();
    audio.setVolumes(store.musicVolume, store.sfxVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // start menu music on first interaction (mobile audio unlock)
  useEffect(() => {
    const unlock = () => {
      if (useGameStore.getState().musicVolume > 0) audio.startMusic("menu");
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const canClaim = hydrated && store.canClaimDailyReward();
  const rewardDay = hydrated ? ((Math.max(1, store.loginStreak) - 1) % 7) + 1 : 1;

  const claim = () => {
    const r = store.claimDailyReward();
    if (r.ok) {
      audio.play("reward");
      if (store.hapticsEnabled) haptic([30, 40, 30]);
      setRewardPopup(r.label);
    }
  };

  return (
    <div className="bg-arena flex min-h-dvh flex-col items-center px-5 pb-8 pt-6">
      <div className="flex w-full max-w-lg items-center justify-between">
        {hydrated && store.premium ? (
          <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">★ Premium</span>
        ) : (
          <span />
        )}
        <CoinBadge amount={hydrated ? store.coins : 0} />
      </div>

      {/* Logo */}
      <div className="mt-10 text-center">
        <div className="animate-float mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/50 bg-card text-5xl glow-primary" aria-hidden>
          ⚔️
        </div>
        <h1 className="text-glow font-display text-5xl font-black uppercase italic tracking-tight">
          Blade<span className="text-primary">Run</span>
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">Dash through the blades</p>
      </div>

      {/* Daily reward banner */}
      {canClaim && (
        <button
          onClick={claim}
          className="animate-pulse-glow mt-8 flex w-full max-w-lg items-center justify-between rounded-2xl border border-gold/50 bg-card px-5 py-4 active:scale-95"
        >
          <div className="text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Day {rewardDay} login reward</div>
            <div className="font-display font-bold text-gold">{DAILY_REWARDS[rewardDay - 1].label}</div>
          </div>
          <span className="text-3xl" aria-hidden>🎁</span>
        </button>
      )}

      {/* Play buttons */}
      <nav className="mt-8 flex w-full max-w-lg flex-col gap-3">
        <PlayLink
          to="/play"
          search={{ mode: "level", level: hydrated ? store.unlockedLevel : 1 }}
          big
          label={hydrated ? `Play Level ${store.unlockedLevel}` : "Play"}
          sub={`Campaign • ${hydrated ? store.unlockedLevel : 1}/100`}
          icon="▶"
        />
        <div className="grid grid-cols-2 gap-3">
          <PlayLink to="/play" search={{ mode: "endless" }} label="Endless" sub="Speeds up forever" icon="∞" />
          <PlayLink to="/play" search={{ mode: "daily" }} label="Daily" sub={hydrated && store.daily.dailyChallengeDone ? "Completed ✓" : "New challenge"} icon="📅" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <NavCard to="/levels" icon="🗺️" label="Levels" />
          <NavCard to="/shop" icon="🛍️" label="Shop" />
          <NavCard to="/missions" icon="🎯" label="Missions" />
          <NavCard to="/leaderboards" icon="🏆" label="Ranks" />
          <NavCard to="/achievements" icon="🏅" label="Awards" />
          <NavCard to="/settings" icon="⚙️" label="Settings" />
        </div>
      </nav>

      {hydrated && (
        <p className="mt-6 text-xs text-muted-foreground">
          Level {store.unlockedLevel}/100 · Endless best: {store.stats.bestEndless} blades
        </p>
      )}

      {rewardPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm" onClick={() => setRewardPopup(null)}>
          <div className="animate-enter mx-6 w-full max-w-xs rounded-3xl border border-gold/50 bg-card p-8 text-center">
            <div className="mb-3 text-5xl" aria-hidden>🎁</div>
            <h2 className="font-display text-lg font-bold uppercase tracking-widest text-gold">{rewardPopup}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Come back tomorrow for more!</p>
            <button className="glow-primary mt-5 w-full rounded-2xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground">
              Awesome
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayLink({ to, search, label, sub, icon, big }: { to: string; search: { mode: "level" | "endless" | "daily"; level?: number }; label: string; sub: string; icon: string; big?: boolean }) {
  const haptics = useGameStore((s) => s.hapticsEnabled);
  return (
    <Link
      to="/play"
      search={search}
      onClick={() => {
        audio.play("click");
        if (haptics) haptic();
      }}
      className={`flex items-center gap-4 rounded-2xl px-5 transition-transform active:scale-95 ${
        big ? "glow-primary bg-primary py-5 text-primary-foreground" : "border border-border bg-card py-4"
      }`}
    >
      <span className={`font-display ${big ? "text-3xl" : "text-xl text-primary"}`} aria-hidden>{icon}</span>
      <span className="flex flex-col text-left">
        <span className="font-display text-lg font-bold uppercase tracking-widest">{label}</span>
        <span className={`text-xs ${big ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</span>
      </span>
    </Link>
  );
}

function NavCard({ to, icon, label, wide }: { to: string; icon: string; label: string; wide?: boolean }) {
  const haptics = useGameStore((s) => s.hapticsEnabled);
  return (
    <Link
      to={to}
      onClick={() => {
        audio.play("click");
        if (haptics) haptic();
      }}
      className={`flex items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 transition-transform active:scale-95 ${wide ? "" : ""}`}
    >
      <span className="text-xl" aria-hidden>{icon}</span>
      <span className="font-display text-sm font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}
