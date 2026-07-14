import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MenuShell, GameButton } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { audio } from "@/lib/game/audio";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BladeRun" },
      { name: "description", content: "Adjust music, sound effects and haptics, remove ads, or go Premium in BladeRun." },
      { property: "og:title", content: "BladeRun Settings" },
      { property: "og:description", content: "Audio, haptics and premium options." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useHydrated();
  const store = useGameStore();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!hydrated)
    return (
      <MenuShell title="Settings">
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      </MenuShell>
    );

  const setMusic = (v: number) => {
    store.setAudio(v, store.sfxVolume);
    audio.setVolumes(v, store.sfxVolume);
  };
  const setSfx = (v: number) => {
    store.setAudio(store.musicVolume, v);
    audio.setVolumes(store.musicVolume, v);
    audio.play("click");
  };

  return (
    <MenuShell title="Settings">
      <section className="mb-6 flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Audio</h2>
        <Slider label="🎵 Music" value={store.musicVolume} onChange={setMusic} />
        <Slider label="🔊 Sound effects" value={store.sfxVolume} onChange={setSfx} />
        <Toggle
          label="📳 Haptic feedback"
          on={store.hapticsEnabled}
          onToggle={() => {
            store.setHaptics(!store.hapticsEnabled);
            audio.play("click");
          }}
        />
      </section>

      <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Accessibility</h2>
        <Toggle
          label="🌿 Reduced motion"
          on={store.reducedMotion}
          onToggle={() => {
            store.setReducedMotion(!store.reducedMotion);
            audio.play("click");
          }}
        />
        <p className="text-xs text-muted-foreground">
          Turns off screen shake and cuts particle intensity for calmer gameplay. No effect on difficulty.
        </p>
      </section>

      <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Upgrades</h2>
        {store.adsRemoved ? (
          <p className="text-sm text-success">✓ Ads removed — thank you!</p>
        ) : (
          <GameButton variant="ghost" onClick={() => store.setAdsRemoved(true)}>
            🚫 Remove ads · £2.99
          </GameButton>
        )}
        {store.premium ? (
          <p className="text-sm text-gold">★ Premium active — no ads, double coins, exclusive cosmetics.</p>
        ) : (
          <GameButton variant="gold" onClick={() => store.setPremium(true)}>
            ★ Premium · £4.99/month
          </GameButton>
        )}
        <p className="text-xs text-muted-foreground">
          Purchases are simulated in this build — real in-app purchases require the native App Store / Play Store release.
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Stats</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat k="Runs" v={store.stats.totalRuns} />
          <Stat k="Wins" v={store.stats.classicWins} />
          <Stat k="Deaths" v={store.stats.totalDeaths} />
          <Stat k="Lifetime coins" v={store.stats.lifetimeCoins} />
        </div>
      </section>

      <section className="rounded-2xl border border-destructive/40 bg-card p-5">
        {confirmReset ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-destructive">Delete ALL progress? This cannot be undone.</p>
            <div className="grid grid-cols-2 gap-2">
              <GameButton
                variant="ghost"
                onClick={() => {
                  localStorage.removeItem("bladerun-save-v1");
                  location.href = "/";
                }}
              >
                Yes, reset
              </GameButton>
              <GameButton variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </GameButton>
            </div>
          </div>
        ) : (
          <GameButton variant="ghost" className="w-full !text-destructive" onClick={() => setConfirmReset(true)}>
            Reset all progress
          </GameButton>
        )}
      </section>
    </MenuShell>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex justify-between font-bold">
        {label}
        <span className="tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--primary)]"
      />
    </label>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="font-display font-bold tabular-nums">{v.toLocaleString()}</div>
    </div>
  );
}
