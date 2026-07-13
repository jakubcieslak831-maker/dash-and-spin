import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MenuShell, GameButton } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { SKINS, TRAILS, EXPLOSIONS, THEMES } from "@/lib/game/cosmetics";
import { audio, haptic } from "@/lib/game/audio";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — BladeRun" },
      { name: "description", content: "Unlock 20 ball skins, 15 trails, 10 explosion effects and 6 tunnel themes with your coins." },
      { property: "og:title", content: "BladeRun Shop" },
      { property: "og:description", content: "Unlock skins, trails, explosions and tunnel themes." },
    ],
  }),
  component: ShopPage,
});

type Tab = "skin" | "trail" | "explosion" | "theme";

function ShopPage() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("skin");
  const store = useGameStore();

  const tabs: { id: Tab; label: string }[] = [
    { id: "skin", label: "Balls" },
    { id: "trail", label: "Trails" },
    { id: "explosion", label: "Booms" },
    { id: "theme", label: "Themes" },
  ];

  const items =
    tab === "skin"
      ? SKINS.map((s) => ({ id: s.id, name: s.name, price: s.price, color: s.color, extra: "", limited: !!s.limited, limitedTag: s.limitedTag }))
      : tab === "trail"
        ? TRAILS.map((t) => ({ id: t.id, name: t.name, price: t.price, color: t.color, extra: "", limited: !!t.limited, limitedTag: t.limitedTag }))
        : tab === "explosion"
          ? EXPLOSIONS.map((e) => ({ id: e.id, name: e.name, price: e.price, color: e.colors[0], extra: "", limited: false, limitedTag: undefined }))
          : THEMES.map((t) => ({ id: t.id, name: t.name, price: t.price, color: t.accent, extra: t.emoji, limited: false, limitedTag: undefined }));

  const ownedKey = tab === "skin" ? store.ownedSkins : tab === "trail" ? store.ownedTrails : tab === "explosion" ? store.ownedExplosions : store.ownedThemes;
  const equipped = tab === "skin" ? store.equippedSkin : tab === "trail" ? store.equippedTrail : tab === "explosion" ? store.equippedExplosion : store.equippedTheme;

  const act = (id: string, price: number, owned: boolean) => {
    if (owned) {
      store.equip(tab, id);
      audio.play("click");
    } else if (store.buyItem(tab, id, price)) {
      store.equip(tab, id);
      audio.play("purchase");
      if (store.hapticsEnabled) haptic([20, 30, 20]);
    } else {
      audio.play("lose");
    }
  };

  return (
    <MenuShell title="Shop">
      <div className="mb-5 grid grid-cols-4 gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              audio.play("click");
            }}
            className={`rounded-xl py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === t.id ? "glow-primary bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hydrated ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const owned = ownedKey.includes(item.id);
            const isEquipped = equipped === item.id;
            const affordable = store.coins >= item.price;
            return (
              <div key={item.id} className={`flex flex-col items-center gap-2 rounded-2xl border p-4 ${isEquipped ? "border-primary/60 glow-primary" : "border-border"} bg-card`}>
                <div
                  className="h-14 w-14 rounded-full border-2 border-border"
                  style={{ background: `radial-gradient(circle at 35% 30%, ${item.color}, #000000cc)`, boxShadow: `0 0 18px ${item.color}66` }}
                  aria-hidden
                >
                  {item.extra && <span className="flex h-full items-center justify-center text-2xl">{item.extra}</span>}
                </div>
                <div className="text-center">
                  <div className="font-display text-sm font-bold">{item.name}</div>
                  {!owned && <div className={`text-xs font-bold ${affordable ? "text-gold" : "text-muted-foreground"}`}>🪙 {item.price.toLocaleString()}</div>}
                </div>
                <GameButton
                  variant={isEquipped ? "ghost" : owned ? "primary" : affordable ? "gold" : "ghost"}
                  className="w-full !px-2 !py-2 text-[11px]"
                  disabled={isEquipped || (!owned && !affordable)}
                  onClick={() => act(item.id, item.price, owned)}
                >
                  {isEquipped ? "Equipped" : owned ? "Equip" : affordable ? "Buy" : "Locked"}
                </GameButton>
              </div>
            );
          })}
        </div>
      )}
    </MenuShell>
  );
}
