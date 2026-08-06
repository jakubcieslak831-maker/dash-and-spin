import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { audio, haptic } from "@/lib/game/audio";
import { CoinBadge, GemBadge } from "@/components/game/MenuShell";
import { DAILY_REWARDS } from "@/lib/game/progression";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BladeRun — Steer Through the Blades" },
      { name: "description", content: "BladeRun: a fast neon tunnel-runner. Steer your ball through spinning blades across 100 levels. Level campaign, Endless & Daily Challenge modes." },
      { property: "og:title", content: "BladeRun — Steer Through the Blades" },
      { property: "og:description", content: "A fast neon tunnel-runner. Steer through spinning blades across 100 levels and reach the treasure." },
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
    <div className="bg-arena flex min-h-dvh flex-col items-center px-5 pb-10 pt-5">
      <header className="flex w-full max-w-lg items-center justify-between">
        <Link
          to="/settings"
          onClick={() => {
            audio.play("click");
            if (store.hapticsEnabled) haptic();
          }}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/70 text-base backdrop-blur-md transition-transform active:scale-90"
        >
          ⚙️
        </Link>
        <div className="flex items-center gap-2">
          {hydrated && store.premium && (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">★</span>
          )}
          <GemBadge amount={hydrated ? store.gems : 0} />
          <CoinBadge amount={hydrated ? store.coins : 0} />
        </div>
      </header>

      {/* Logo */}
      <div className="mt-12 text-center">
        <div className="animate-float mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-card/60 text-4xl backdrop-blur-md glow-primary" aria-hidden>
          ⚔️
        </div>
        <h1 className="text-glow font-display text-5xl font-black uppercase italic tracking-tight">
          Blade<span className="text-primary">Run</span>
        </h1>
        <p className="mt-2 text-[11px] uppercase tracking-[0.4em] text-muted-foreground">Steer through the blades</p>
      </div>

      {/* Daily reward banner */}
      {canClaim && (
        <button
          onClick={claim}
          className="animate-pulse-glow mt-8 flex w-full max-w-lg items-center justify-between rounded-2xl border border-gold/40 bg-card/70 px-5 py-3.5 backdrop-blur-md active:scale-95"
        >
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Day {rewardDay} reward</div>
            <div className="font-display text-sm font-bold text-gold">{DAILY_REWARDS[rewardDay - 1].label}</div>
          </div>
          <span className="text-2xl" aria-hidden>🎁</span>
        </button>
      )}

      {/* Play */}
      <nav className="mt-auto flex w-full max-w-lg flex-col gap-2.5 pt-10">
        <PlayLink
          to="/play"
          search={{ mode: "level", level: hydrated ? store.unlockedLevel : 1 }}
          big
          label={hydrated ? `Level ${store.unlockedLevel}` : "Play"}
          sub={`Campaign • ${hydrated ? store.unlockedLevel : 1}/300`}
          icon="▶"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <PlayLink to="/play" search={{ mode: "endless" }} label="Endless" sub="Speeds up" icon="∞" />
          <PlayLink to="/play" search={{ mode: "daily" }} label="Daily" sub={hydrated && store.daily.dailyChallengeDone ? "Done ✓" : "Challenge"} icon="📅" />
        </div>

        {/* Primary hub — everything else lives one tap deeper */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <NavCard to="/levels" icon="🗺️" label="Levels" />
          <NavCard to="/shop" icon="🛍️" label="Shop" />
          <NavCard to="/season" icon="🎫" label="Season" />
          <NavCard to="/profile" icon="👤" label="You" />
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] uppercase tracking-widest text-muted-foreground">
          <SubLink to="/missions">Missions</SubLink>
          <span aria-hidden>·</span>
          <SubLink to="/leaderboards">Ranks</SubLink>
          <span aria-hidden>·</span>
          <SubLink to="/achievements">Awards</SubLink>
        </div>
      </nav>

      {hydrated && (
        <p className="mt-6 text-[11px] text-muted-foreground">
          Endless best: {store.stats.bestEndless} blades
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

function PlayLink({ search, label, sub, icon, big }: { to: string; search: { mode: "level" | "endless" | "daily"; level?: number }; label: string; sub: string; icon: string; big?: boolean }) {
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
        big ? "glow-primary bg-primary py-5 text-primary-foreground" : "border border-border/70 bg-card/70 py-3.5 backdrop-blur-md"
      }`}
    >
      <span className={`font-display ${big ? "text-2xl" : "text-lg text-primary"}`} aria-hidden>{icon}</span>
      <span className="flex flex-col text-left">
        <span className={`font-display font-bold uppercase tracking-widest ${big ? "text-lg" : "text-sm"}`}>{label}</span>
        <span className={`text-[11px] ${big ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</span>
      </span>
    </Link>
  );
}

function NavCard({ to, icon, label }: { to: string; icon: string; label: string }) {
  const haptics = useGameStore((s) => s.hapticsEnabled);
  return (
    <Link
      to={to}
      onClick={() => {
        audio.play("click");
        if (haptics) haptic();
      }}
      className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/70 bg-card/70 py-3 backdrop-blur-md transition-transform active:scale-95"
    >
      <span className="text-lg" aria-hidden>{icon}</span>
      <span className="font-display text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}

function SubLink({ to, children }: { to: string; children: ReactNode }) {
  const haptics = useGameStore((s) => s.hapticsEnabled);
  return (
    <Link
      to={to}
      onClick={() => {
        audio.play("click");
        if (haptics) haptic();
      }}
      className="transition-colors active:text-primary"
    >
      {children}
    </Link>
  );
}

