import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MenuShell } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { mulberry32, dailySeed } from "@/lib/game/rng";
import { audio } from "@/lib/game/audio";

export const Route = createFileRoute("/leaderboards")({
  head: () => ({
    meta: [
      { title: "Leaderboards — BladeRun" },
      { name: "description", content: "See the fastest Classic completion times and the highest Endless survival scores in BladeRun." },
      { property: "og:title", content: "BladeRun Leaderboards" },
      { property: "og:description", content: "Fastest times and highest Endless scores." },
    ],
  }),
  component: LeaderboardsPage,
});

const NAMES = ["NovaStrike", "BladeKing", "TunnelRat", "GapGhost", "DashQueen", "RollerX", "PixelPete", "NeonNinja", "FanDodger", "SpinDoctor", "CoreRunner", "VoidWalker", "TurboTess", "GritGamer", "ZoomZara", "OrbitOllie", "FluxFiona", "RiftRider", "EchoEli"];

/** Deterministic simulated global entries (until cloud sync is enabled). */
function fakeEntries(mode: "classic" | "endless") {
  const rng = mulberry32(dailySeed() + (mode === "classic" ? 11 : 22));
  return Array.from({ length: 12 }, (_, i) => ({
    name: NAMES[Math.floor(rng() * NAMES.length)] + Math.floor(rng() * 99),
    score: mode === "classic" ? 28 + i * 3.5 + rng() * 3 : Math.max(3, 70 - i * 5 - Math.floor(rng() * 4)),
  }));
}

function LeaderboardsPage() {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"classic" | "endless">("classic");
  const stats = useGameStore((s) => s.stats);

  const entries = fakeEntries(mode);
  const playerScore = mode === "classic" ? stats.bestTime : stats.bestEndless || null;

  type Row = { name: string; score: number; you?: boolean };
  let rows: Row[] = entries.map((e) => ({ ...e }));
  if (hydrated && playerScore !== null) {
    rows.push({ name: "You", score: playerScore, you: true });
  }
  rows.sort((a, b) => (mode === "classic" ? a.score - b.score : b.score - a.score));
  rows = rows.slice(0, 15);
  const playerRank = rows.findIndex((r) => r.you) + 1;

  return (
    <MenuShell title="Ranks">
      <div className="mb-5 grid grid-cols-2 gap-2">
        {(["classic", "endless"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              audio.play("click");
            }}
            className={`rounded-xl py-2.5 font-display text-xs font-bold uppercase tracking-wider ${
              mode === m ? "glow-primary bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {m === "classic" ? "Fastest Time" : "Endless Score"}
          </button>
        ))}
      </div>

      {hydrated && playerRank > 0 && (
        <div className="glow-primary mb-4 flex items-center justify-between rounded-2xl border border-primary/50 bg-card px-5 py-3">
          <span className="font-display text-sm font-bold uppercase tracking-widest">Your rank</span>
          <span className="font-display text-2xl font-black text-primary">#{playerRank}</span>
        </div>
      )}
      {hydrated && playerScore === null && (
        <p className="mb-4 rounded-2xl border border-border bg-card px-5 py-3 text-center text-sm text-muted-foreground">
          {mode === "classic" ? "Beat Classic Mode to enter the board!" : "Play Endless to set a score!"}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${r.you ? "border-primary/60 bg-primary/10" : "border-border bg-card"}`}
          >
            <span className={`w-8 text-center font-display font-black ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </span>
            <span className={`flex-1 font-bold ${r.you ? "text-primary" : ""}`}>{r.name}</span>
            <span className="font-display tabular-nums">{mode === "classic" ? `${r.score.toFixed(1)}s` : `${r.score} blades`}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-center text-xs text-muted-foreground">Global sync coming soon — scores shown are this device + daily bots.</p>
    </MenuShell>
  );
}
