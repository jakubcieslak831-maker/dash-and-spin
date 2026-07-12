import { createFileRoute } from "@tanstack/react-router";
import { MenuShell } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { ACHIEVEMENTS } from "@/lib/game/progression";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — BladeRun" },
      { name: "description", content: "Earn 32 achievements in BladeRun — from your first win to surviving 50 blades in Endless mode." },
      { property: "og:title", content: "BladeRun Achievements" },
      { property: "og:description", content: "32 achievements to unlock." },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const hydrated = useHydrated();
  const unlocked = useGameStore((s) => s.unlockedAchievements);

  return (
    <MenuShell title="Awards">
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {hydrated ? unlocked.length : 0} / {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="flex flex-col gap-2">
        {ACHIEVEMENTS.map((a) => {
          const got = hydrated && unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${got ? "border-gold/50 bg-gold/5" : "border-border bg-card opacity-70"}`}
            >
              <span className="text-2xl" aria-hidden>{got ? "🏅" : "🔒"}</span>
              <div className="flex-1">
                <div className={`font-display text-sm font-bold ${got ? "text-gold" : ""}`}>{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <span className="text-xs font-bold text-gold">+{a.reward}🪙</span>
            </div>
          );
        })}
      </div>
    </MenuShell>
  );
}
