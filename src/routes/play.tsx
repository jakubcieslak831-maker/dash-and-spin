import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BladeRunEngine, type HudState, type ActivePowerup, type GameMode } from "@/lib/game/engine";
import { useGameStore } from "@/lib/game/store";
import { skinById, trailById, explosionById, themeById } from "@/lib/game/cosmetics";
import { audio, haptic } from "@/lib/game/audio";
import { dailySeed } from "@/lib/game/rng";
import { getLevelConfig, MAX_LEVEL } from "@/lib/game/levels";
import { AdModal } from "@/components/game/AdModal";
import { GameButton } from "@/components/game/MenuShell";

const GEM_CONTINUE_COST = 5;
const VIP_FREE_REVIVES = 1;

export const Route = createFileRoute("/play")({
  validateSearch: (s: Record<string, unknown>): { mode: GameMode; level?: number } => ({
    mode: s.mode === "endless" || s.mode === "daily" ? s.mode : "level",
    level: typeof s.level === "number" ? s.level : s.level ? Number(s.level) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Play — BladeRun" },
      { name: "description", content: "Steer your ball through spinning blades and reach the treasure chest." },
      { property: "og:title", content: "Play BladeRun" },
      { property: "og:description", content: "Steer through spinning blades and reach the treasure." },
    ],
  }),
  component: PlayScreen,
});

type Phase = "loading" | "tutorial" | "playing" | "paused" | "dead" | "won";

const WIN_BONUS: Record<GameMode, number> = { level: 100, daily: 150, endless: 0 };

function PlayScreen() {
  const search = Route.useSearch() as { mode: GameMode; level?: number };
  const mode = search.mode;
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BladeRunEngine | null>(null);
  const lastX = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [level, setLevel] = useState<number>(() => search.level ?? useGameStore.getState().unlockedLevel);
  const [hud, setHud] = useState<HudState>({ timeLeft: 0, elapsed: 0, blade: 0, totalBlades: 0, coins: 0, combo: 0 });
  const [result, setResult] = useState<{ blades: number; coins: number; time: number; won: boolean } | null>(null);
  const [ad, setAd] = useState<null | "continue" | "double" | "interstitial">(null);
  const [powerups, setPowerups] = useState<ActivePowerup[]>([]);
  const [bossIntro, setBossIntro] = useState<string | null>(null);
  const [xpInfo, setXpInfo] = useState<{ gained: number; leveledUp: boolean; newLevel: number } | null>(null);
  const usedContinue = useRef(false);
  const recorded = useRef(false);
  const doubled = useRef(false);
  const reviveCount = useRef(0);
  const nearMisses = useRef(0);
  const powerupsCollected = useRef(0);
  const [runKey, setRunKey] = useState(0);
  const [summary, setSummary] = useState<{
    bestBlade: number;
    coins: number;
    nearMisses: number;
    powerups: number;
    time: number;
  } | null>(null);

  const store = useGameStore;

  /** Build (or rebuild) the engine for a fresh run. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = store.getState();
    audio.setVolumes(s.musicVolume, s.sfxVolume);

    // per-mode tuning
    let seed: number;
    let blades: number | undefined;
    let speed: number | undefined;
    let difficulty: number | undefined;
    let isBoss = false;
    if (mode === "level") {
      const lc = getLevelConfig(level);
      seed = lc.seed;
      blades = lc.blades;
      speed = lc.speed;
      difficulty = lc.difficulty;
      isBoss = !!lc.isBoss;
    } else if (mode === "daily") {
      seed = dailySeed();
      blades = 18;
      speed = 7.5;
      difficulty = 1.3;
    } else {
      seed = Math.floor(Math.random() * 1e9);
    }

    let engine: BladeRunEngine;
    try {
      engine = new BladeRunEngine(
        canvas,
        {
          mode,
          seed,
          level: mode === "level" ? level : undefined,
          blades,
          speed,
          difficulty,
          isBoss,
          reducedMotion: s.reducedMotion,
          skin: skinById(s.equippedSkin),
          trail: trailById(s.equippedTrail),
          explosion: explosionById(s.equippedExplosion),
          theme: themeById(s.equippedTheme),
        },
        {
          onHud: setHud,
          onCoin: () => {
            audio.play("coin");
            if (store.getState().hapticsEnabled) haptic(8);
          },
          onDash: () => {},
          onBladePass: () => audio.play("whoosh"),
          onNearMiss: () => {
            nearMisses.current += 1;
            audio.play("nearmiss");
            if (store.getState().hapticsEnabled) haptic(12);
          },
          onCombo: (combo) => {
            if (combo > 0 && combo % 5 === 0) {
              audio.play("combo");
              if (store.getState().hapticsEnabled) haptic(15);
            }
          },
          onPowerup: (active) => {
            // count newly activated powerups by comparing length
            if (active.length > powerupsCollected.current) {
              powerupsCollected.current = active.length;
            }
            setPowerups(active);
          },
          onBossIntro: (name) => {
            setBossIntro(name);
            audio.play("levelup");
            setTimeout(() => setBossIntro(null), 2500);
          },
          onDeath: (bladesPassed, coins) => {
            audio.play("lose");
            audio.stopMusic();
            if (store.getState().hapticsEnabled && !store.getState().reducedMotion) haptic([60, 40, 80]);
            setResult({ blades: bladesPassed, coins, time: hud.elapsed, won: false });
            setSummary({ bestBlade: bladesPassed, coins, nearMisses: nearMisses.current, powerups: powerupsCollected.current, time: hud.elapsed });
            if (mode === "endless") store.getState().recordTournamentScore(bladesPassed);
            setPhase("dead");
          },
          onWin: (time, coins, totalBlades) => {
            audio.play(mode === "level" ? "levelup" : "win");
            audio.stopMusic();
            if (store.getState().hapticsEnabled) haptic([30, 30, 30, 30, 60]);
            setResult({ blades: totalBlades, coins, time, won: true });
            setSummary({ bestBlade: totalBlades, coins, nearMisses: nearMisses.current, powerups: powerupsCollected.current, time });
            setPhase("won");
          },
        },
      );
    } catch (e) {
      console.error("Engine init failed", e);
      void navigate({ to: "/" });
      return;
    }
    engineRef.current = engine;

    const onResize = () => engine.resize(canvas.clientWidth, canvas.clientHeight);
    window.addEventListener("resize", onResize);
    onResize();

    usedContinue.current = false;
    recorded.current = false;
    doubled.current = false;
    reviveCount.current = 0;
    nearMisses.current = 0;
    powerupsCollected.current = 0;
    setResult(null);
    setSummary(null);

    // brief loading beat, then tutorial (first run) or straight in
    const t = setTimeout(() => {
      if (!store.getState().tutorialSeen) {
        setPhase("tutorial");
      } else {
        beginRun(engine);
      }
    }, 700);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      audio.stopMusic();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level, runKey]);

  const beginRun = (engine: BladeRunEngine) => {
    setPhase("playing");
    engine.start();
    if (store.getState().musicVolume > 0) audio.startMusic("game");
  };

  const commitRun = useCallback(
    (extraCoins = 0) => {
      if (recorded.current || !result) return;
      recorded.current = true;
      const s = store.getState();
      const bonus = result.won ? WIN_BONUS[mode] : 0;
      let earned = result.coins + bonus + extraCoins;
      if (s.premium) earned *= 2;
      const res = s.recordRun({
        mode,
        won: result.won,
        bladesPassed: result.blades,
        coinsEarned: earned,
        time: result.time,
        dashes: engineRef.current?.dashCount ?? 0,
        level: mode === "level" ? level : undefined,
      });
      setXpInfo({ gained: res.xpAwarded, leveledUp: res.leveledUp, newLevel: s.playerLevel() });
    },
    [result, mode, level, store],
  );

  const totalEarned = (() => {
    if (!result) return 0;
    const s = store.getState();
    let e = result.coins + (result.won ? WIN_BONUS[mode] : 0);
    if (doubled.current) e *= 2;
    if (s.premium) e *= 2;
    return e;
  })();

  /* ---- steering input (drag left/right to move the ball around the tunnel) ---- */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    lastX.current = e.clientX;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (lastX.current === null) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    engineRef.current?.steer(dx);
  }, []);

  const onPointerUp = useCallback(() => {
    lastX.current = null;
  }, []);

  // keyboard steering for desktop testing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") engineRef.current?.steer(-24);
      else if (e.key === "ArrowRight") engineRef.current?.steer(24);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const restart = () => {
    commitRun();
    const s = store.getState();
    const runs = s.stats.totalRuns;
    if (!s.adsRemoved && !s.premium && runs > 0 && runs % 4 === 0) {
      setAd("interstitial");
    } else {
      setRunKey((k) => k + 1);
    }
  };

  const nextLevel = () => {
    commitRun();
    const next = Math.min(MAX_LEVEL, level + 1);
    setLevel(next);
    void navigate({ to: "/play", search: { mode: "level", level: next }, replace: true });
    setRunKey((k) => k + 1);
  };

  const goHome = () => {
    commitRun();
    void navigate({ to: "/" });
  };

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const sec = (t % 60).toFixed(1);
    return m > 0 ? `${m}:${sec.padStart(4, "0")}` : `${sec}s`;
  };

  const canAdvance = mode === "level" && level < MAX_LEVEL;

  return (
    <div
      className="fixed inset-0 touch-none bg-background"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas ref={canvasRef} className="h-full w-full" style={{ touchAction: "none" }} />

      {/* HUD */}
      {(phase === "playing" || phase === "paused") && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="rounded-2xl bg-background/60 px-4 py-2 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {mode === "level" ? `Level ${level}` : mode === "daily" ? "Daily" : "Endless"}
            </div>
            <div className="font-display text-xl font-bold tabular-nums text-foreground">{fmt(hud.elapsed)}</div>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-background/60 px-4 py-2 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Blade</div>
            <div className="font-display text-xl font-bold text-primary">
              {hud.blade}
              {hud.totalBlades > 0 && <span className="text-sm text-muted-foreground">/{hud.totalBlades}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-2xl bg-background/60 px-4 py-2 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Coins</div>
              <div className="font-display text-xl font-bold tabular-nums text-gold">🪙 {hud.coins}</div>
            </div>
            <button
              className="pointer-events-auto rounded-xl border border-border bg-card/80 px-3 py-2 text-sm backdrop-blur-sm active:scale-90"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                audio.play("click");
                engineRef.current?.pause();
                audio.stopMusic();
                setPhase("paused");
              }}
              aria-label="Pause"
            >
              ⏸
            </button>
          </div>
        </div>
      )}

      {/* Combo indicator + power-up icons */}
      {phase === "playing" && (
        <>
          {hud.combo >= 3 && (
            <div className="animate-fade-in pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2 text-center">
              <div className="text-glow font-display text-4xl font-black tabular-nums text-primary">
                {hud.combo}×
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Combo</div>
            </div>
          )}
          {powerups.length > 0 && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {powerups.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 rounded-xl bg-background/70 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-lg">
                    {p.type === "shield" ? "🛡" : p.type === "magnet" ? "🧲" : p.type === "slowmo" ? "⏱" : p.type === "double" ? "✕2" : "⚡"}
                  </span>
                  <div className="h-1 w-8 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-100"
                      style={{ width: `${(p.remaining / p.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Boss intro banner */}
      {bossIntro && (
        <div className="animate-fade-in pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="mb-2 text-6xl" aria-hidden>⚔️</div>
            <h2 className="text-glow font-display text-3xl font-black uppercase tracking-widest text-destructive">
              BOSS BLADE
            </h2>
            <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">{bossIntro}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
          <div className="glow-primary mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">Loading tunnel…</p>
        </div>
      )}

      {/* Tutorial */}
      {phase === "tutorial" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center">
            <div className="mb-3 text-5xl" aria-hidden>👈👉</div>
            <h2 className="font-display text-xl font-bold uppercase tracking-widest">How to play</h2>
            <ul className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
              <li>⚡ Your ball rolls forward at a steady speed.</li>
              <li>👆 <b className="text-foreground">Drag left or right</b> to steer it around the tunnel.</li>
              <li>🌀 Guide the ball into the gap of each spinning blade.</li>
              <li>🪙 Grab coins and reach the treasure chest to clear the level!</li>
            </ul>
            <GameButton
              className="mt-6 w-full"
              onClick={() => {
                store.getState().setTutorialSeen();
                if (engineRef.current) beginRun(engineRef.current);
              }}
            >
              Let's go
            </GameButton>
          </div>
        </div>
      )}

      {/* Pause */}
      {phase === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="mx-6 flex w-full max-w-xs flex-col gap-3 rounded-3xl border border-border bg-card p-7 text-center">
            <h2 className="font-display text-xl font-bold uppercase tracking-widest">Paused</h2>
            <GameButton
              onClick={() => {
                engineRef.current?.resume();
                if (store.getState().musicVolume > 0) audio.startMusic("game");
                setPhase("playing");
              }}
            >
              Resume
            </GameButton>
            <GameButton variant="ghost" onClick={() => setRunKey((k) => k + 1)}>
              Restart
            </GameButton>
            <GameButton variant="ghost" onClick={goHome}>
              Main menu
            </GameButton>
          </div>
        </div>
      )}

      {/* Game over */}
      {phase === "dead" && result && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="mx-6 flex w-full max-w-xs flex-col gap-3 rounded-3xl border border-destructive/40 bg-card p-7 text-center">
            <div className="text-4xl" aria-hidden>💥</div>
            <h2 className="font-display text-2xl font-black uppercase tracking-widest text-destructive">Sliced!</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label={mode === "endless" ? "Score" : "Blade reached"} value={String(result.blades)} />
              <Stat label="Coins earned" value={`🪙 ${totalEarned}`} />
            </div>
            {!usedContinue.current && !recorded.current && (
              <GameButton
                variant="gold"
                onClick={() => {
                  usedContinue.current = true;
                  setAd("continue");
                }}
              >
                📺 Watch ad to continue
              </GameButton>
            )}
            <GameButton onClick={restart}>Restart</GameButton>
            <GameButton variant="ghost" onClick={goHome}>
              Main menu
            </GameButton>
          </div>
        </div>
      )}

      {/* Victory */}
      {phase === "won" && result && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="glow-primary mx-6 flex w-full max-w-xs flex-col gap-3 rounded-3xl border border-primary/40 bg-card p-7 text-center">
            <div className="animate-float text-5xl" aria-hidden>🏆</div>
            <h2 className="text-glow font-display text-2xl font-black uppercase tracking-widest text-primary">
              {mode === "level" ? `Level ${level} Clear!` : "Treasure!"}
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Time" value={fmt(result.time)} />
              <Stat label="Coins" value={`🪙 ${totalEarned}`} />
            </div>
            {(mode === "level" || mode === "daily") && (
              <div className="rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-bold text-gold">
                💎 +{mode === "daily" ? 3 : 1} Gem{mode === "daily" ? "s" : ""} earned!
              </div>
            )}
            {xpInfo && (
              <div className={`rounded-xl border py-2 text-sm font-bold ${xpInfo.leveledUp ? "border-primary/40 bg-primary/10 text-primary" : "border-muted/40 bg-muted/10 text-muted-foreground"}`}>
                ⭐ +{xpInfo.gained} XP{xpInfo.leveledUp ? ` — Level Up! → Lv.${xpInfo.newLevel}` : ""}
              </div>
            )}
            {!doubled.current && !recorded.current && (
              <GameButton variant="gold" onClick={() => setAd("double")}>
                📺 Double coins
              </GameButton>
            )}
            {canAdvance ? (
              <GameButton onClick={nextLevel}>Next level →</GameButton>
            ) : mode === "level" ? (
              <GameButton onClick={goHome}>All levels done! 🎉</GameButton>
            ) : (
              <GameButton onClick={restart}>Play again</GameButton>
            )}
            {canAdvance && (
              <GameButton variant="ghost" onClick={restart}>
                Replay level
              </GameButton>
            )}
            <GameButton variant="ghost" onClick={goHome}>
              Main menu
            </GameButton>
          </div>
        </div>
      )}

      {/* Ads */}
      {ad === "continue" && (
        <AdModal
          kind="rewarded"
          onSkip={() => setAd(null)}
          onComplete={() => {
            store.getState().recordAdWatch();
            setAd(null);
            setPhase("playing");
            engineRef.current?.revive();
            if (store.getState().musicVolume > 0) audio.startMusic("game");
          }}
        />
      )}
      {ad === "double" && (
        <AdModal
          kind="rewarded"
          onSkip={() => setAd(null)}
          onComplete={() => {
            store.getState().recordAdWatch();
            doubled.current = true;
            const extra = result ? result.coins + WIN_BONUS[mode] : 0;
            commitRun(extra);
            setAd(null);
          }}
        />
      )}
      {ad === "interstitial" && (
        <AdModal
          kind="interstitial"
          onComplete={() => {
            setAd(null);
            setRunKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display font-bold">{value}</div>
    </div>
  );
}
