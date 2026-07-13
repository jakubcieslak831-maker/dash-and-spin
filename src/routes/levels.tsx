import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MenuShell } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { MAX_LEVEL, WORLD_NAMES } from "@/lib/game/levels";
import { audio, haptic } from "@/lib/game/audio";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Levels — BladeRun" },
      { name: "description", content: "Progress through 100 BladeRun levels — each one longer and tougher than the last. Steer through the blades and clear them all." },
      { property: "og:title", content: "BladeRun Levels" },
      { property: "og:description", content: "100 handcrafted levels of escalating blade-dodging chaos." },
    ],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const unlocked = useGameStore((s) => s.unlockedLevel);
  const bestTimes = useGameStore((s) => s.levelBestTimes);
  const haptics = useGameStore((s) => s.hapticsEnabled);

  const play = (level: number) => {
    audio.play("click");
    if (haptics) haptic();
    void navigate({ to: "/play", search: { mode: "level", level } });
  };

  // group into worlds of 10
  const worlds = Array.from({ length: MAX_LEVEL / 10 }, (_, w) => w);

  return (
    <MenuShell title="Levels">
      {!hydrated ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-center text-sm text-muted-foreground">
            Unlocked <span className="font-bold text-primary">{unlocked}</span> of {MAX_LEVEL} levels
          </p>
          {worlds.map((w) => {
            const start = w * 10 + 1;
            const worldUnlocked = unlocked >= start;
            return (
              <section key={w}>
                <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">World {w + 1}</span>
                  <span className="text-primary">{WORLD_NAMES[w]}</span>
                  {!worldUnlocked && <span aria-hidden>🔒</span>}
                </h2>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => {
                    const level = start + i;
                    const locked = level > unlocked;
                    const cleared = bestTimes[level] !== undefined;
                    return (
                      <button
                        key={level}
                        disabled={locked}
                        onClick={() => play(level)}
                        className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border font-display text-sm font-bold transition-transform active:scale-90 ${
                          locked
                            ? "border-border bg-muted/40 text-muted-foreground/40"
                            : cleared
                              ? "border-primary/50 bg-card text-foreground glow-primary"
                              : "border-gold/50 bg-card text-gold"
                        }`}
                        aria-label={locked ? `Level ${level} locked` : `Play level ${level}`}
                      >
                        {locked ? <span aria-hidden>🔒</span> : <span>{level}</span>}
                        {cleared && <span className="absolute bottom-1 text-[8px] text-primary" aria-hidden>★</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </MenuShell>
  );
}
