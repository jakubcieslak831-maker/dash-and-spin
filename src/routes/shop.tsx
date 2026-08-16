import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MenuShell, GameButton } from "@/components/game/MenuShell";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { SKINS, TRAILS, EXPLOSIONS, THEMES, GEM_BUNDLES, OFFERS, skinById, trailById, themeById, type OfferDef } from "@/lib/game/cosmetics";
import { CosmeticPreview } from "@/components/game/CosmeticPreview";
import { AdModal } from "@/components/game/AdModal";
import { PaymentModal } from "@/components/game/PaymentModal";
import { audio, haptic } from "@/lib/game/audio";


export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — BladeRun" },
      { name: "description", content: "Unlock ball skins, trails, explosion effects, tunnel themes and gem bundles." },
      { property: "og:title", content: "BladeRun Shop" },
      { property: "og:description", content: "Unlock cosmetics with coins or premium 💎 gems." },
    ],
  }),
  component: ShopPage,
});

type Tab = "skin" | "trail" | "explosion" | "theme" | "gems" | "loadouts";

type Item = {
  id: string;
  name: string;
  price: number;
  gemPrice?: number;
  color: string;
  extra: string;
  limited: boolean;
  limitedTag?: string;
};

function ShopPage() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("skin");
  const [ad, setAd] = useState<null | "freegem">(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [payBundle, setPayBundle] = useState<null | { gems: number; label: string }>(null);
  const [payOffer, setPayOffer] = useState<null | OfferDef>(null);
  const store = useGameStore();


  const tabs: { id: Tab; label: string }[] = [
    { id: "skin", label: "Balls" },
    { id: "trail", label: "Trails" },
    { id: "explosion", label: "Booms" },
    { id: "theme", label: "Themes" },
    { id: "loadouts", label: "Presets" },
    { id: "gems", label: "💎 Gems" },
  ];

  const buildItems = (): Item[] => {
    if (tab === "skin") return SKINS.map((s) => ({ id: s.id, name: s.name, price: s.price, gemPrice: s.gemPrice, color: s.color, extra: "", limited: !!s.limited, limitedTag: s.limitedTag }));
    if (tab === "trail") return TRAILS.map((t) => ({ id: t.id, name: t.name, price: t.price, gemPrice: t.gemPrice, color: t.color, extra: "", limited: !!t.limited, limitedTag: t.limitedTag }));
    if (tab === "explosion") return EXPLOSIONS.map((e) => ({ id: e.id, name: e.name, price: e.price, gemPrice: e.gemPrice, color: e.colors[0], extra: "", limited: !!e.limited, limitedTag: e.limitedTag }));
    return THEMES.map((t) => ({ id: t.id, name: t.name, price: t.price, gemPrice: t.gemPrice, color: t.accent, extra: t.emoji, limited: !!t.limited, limitedTag: t.limitedTag }));
  };

  const ownedKey =
    tab === "skin"
      ? store.ownedSkins
      : tab === "trail"
        ? store.ownedTrails
        : tab === "explosion"
          ? store.ownedExplosions
          : tab === "theme"
            ? store.ownedThemes
            : [];
  const equipped =
    tab === "skin"
      ? store.equippedSkin
      : tab === "trail"
        ? store.equippedTrail
        : tab === "explosion"
          ? store.equippedExplosion
          : tab === "theme"
            ? store.equippedTheme
            : "";

  const act = (item: Item, owned: boolean) => {
    if (tab === "gems" || tab === "loadouts") return;
    if (owned) {
      store.equip(tab, item.id);
      audio.play("click");
      return;
    }
    // gem-priced items
    if (item.gemPrice && item.gemPrice > 0) {
      if (store.buyItemGems(tab, item.id, item.gemPrice)) {
        store.equip(tab, item.id);
        audio.play("gem");
        if (store.hapticsEnabled) haptic([25, 30, 25]);
      } else audio.play("lose");
      return;
    }
    if (store.buyItem(tab, item.id, item.price)) {
      store.equip(tab, item.id);
      audio.play("purchase");
      if (store.hapticsEnabled) haptic([20, 30, 20]);
    } else audio.play("lose");
  };

  const items = buildItems();

  const previewSkin = (tab === "skin" && preview) || store.equippedSkin;
  const previewTrail = (tab === "trail" && preview) || store.equippedTrail;
  const previewTheme = (tab === "theme" && preview) || store.equippedTheme;
  const showPreview = hydrated && (tab === "skin" || tab === "trail" || tab === "theme");

  return (
    <MenuShell title="Shop">
      <div className="mb-5 grid grid-cols-5 gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setPreview(null);
              audio.play("click");
            }}
            className={`rounded-xl py-2.5 font-display text-[10px] font-bold uppercase tracking-wider transition-colors ${
              tab === t.id ? "glow-primary bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showPreview && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
          <CosmeticPreview skinId={previewSkin} trailId={previewTrail} themeId={previewTheme} className="block h-40 w-full" />
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Live preview</span>
            <span className="text-primary">
              {tab === "skin" ? skinById(previewSkin).name : tab === "trail" ? trailById(previewTrail).name : themeById(previewTheme).name}
            </span>
          </div>
        </div>
      )}


      {!hydrated ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : tab === "gems" ? (
        <GemsTab
          onBundle={(b) => setPayBundle({ gems: b.gems + (b.bonus ?? 0), label: b.priceLabel })}
          onOffer={(o) => setPayOffer(o)}
          onFree={() => setAd("freegem")}
          gems={store.gems}
          vip={store.vip}
          vipClaimable={store.vip && store.vipLastClaim !== new Date().toISOString().slice(0, 10)}
          onVipClaim={() => {
            const r = store.claimVipDaily();
            if (r.ok) {
              audio.play("gem");
              if (store.hapticsEnabled) haptic([25, 30, 25]);
            }
          }}
        />
      ) : tab === "loadouts" ? (
        <LoadoutsTab />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const owned = ownedKey.includes(item.id);
            const isEquipped = equipped === item.id;
            const usesGems = !!item.gemPrice && item.gemPrice > 0;
            const affordable = usesGems ? store.gems >= (item.gemPrice ?? 0) : store.coins >= item.price;
            return (
              <div
                key={item.id}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 ${
                  isEquipped ? "border-primary/60 glow-primary" : item.limited ? "border-gold/60" : usesGems ? "border-primary/40" : "border-border"
                } bg-card`}
              >
                {item.limited && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/60 bg-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                    ✦ {item.limitedTag ?? "Limited"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreview(item.id);
                    audio.play("click");
                  }}
                  className="relative h-14 w-14 rounded-full border-2 border-border"
                  style={{
                    background: `radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${item.color} 30%, #000000cc 90%)`,
                    boxShadow: `0 0 22px ${item.color}88, inset 0 -6px 12px #00000099`,
                  }}
                  aria-hidden
                >
                  {item.extra && <span className="flex h-full items-center justify-center text-2xl">{item.extra}</span>}
                </button>
                <div className="text-center">
                  <div className="font-display text-sm font-bold">{item.name}</div>
                  {!owned && (
                    <div className={`text-xs font-bold ${affordable ? (usesGems ? "text-primary" : "text-gold") : "text-muted-foreground"}`}>
                      {usesGems ? `💎 ${item.gemPrice}` : `🪙 ${item.price.toLocaleString()}`}
                    </div>
                  )}
                </div>
                <GameButton
                  variant={isEquipped ? "ghost" : owned ? "primary" : usesGems ? "primary" : affordable ? "gold" : "ghost"}
                  className="w-full !px-2 !py-2 text-[11px]"
                  disabled={isEquipped || (!owned && !affordable)}
                  onClick={() => act(item, owned)}
                >
                  {isEquipped ? "Equipped" : owned ? "Equip" : affordable ? "Buy" : "Locked"}
                </GameButton>
              </div>
            );
          })}
        </div>
      )}

      {ad === "freegem" && (
        <AdModal
          kind="rewarded"
          onSkip={() => setAd(null)}
          onComplete={() => {
            store.recordAdWatch();
            store.addGems(1);
            audio.play("gem");
            setAd(null);
          }}
        />
      )}
      {payBundle && (
        <PaymentModal
          title={`${payBundle.gems} gems`}
          subtitle="Confirm your gem purchase. Payment is simulated in this build."
          priceLabel={payBundle.label}
          icon="💎"
          onCancel={() => setPayBundle(null)}
          onComplete={() => {
            store.addGems(payBundle.gems);
            audio.play("gem");
            if (store.hapticsEnabled) haptic([30, 40, 30, 40, 60]);
            setPayBundle(null);
          }}
        />
      )}
      {payOffer && (
        <PaymentModal
          title={payOffer.title}
          subtitle={payOffer.subtitle}
          priceLabel={payOffer.priceLabel}
          icon={payOffer.icon}
          onCancel={() => setPayOffer(null)}
          onComplete={() => {
            if (payOffer.id === "removeAds") store.setAdsRemoved(true);
            else if (payOffer.id === "premium") store.setPremium(true);
            else if (payOffer.id === "starterPack") {
              store.addCoins(500);
              store.addGems(40);
              store.grantItem("skin", "ember");
            } else if (payOffer.id === "vip") {
              store.setVip(true);
              store.claimVipDaily();
            } else if (payOffer.id === "goldVault") {
              store.addCoins(25000);
            } else if (payOffer.id === "levelSkip") {
              store.skipLevels(5);
            } else if (payOffer.id === "ultimate") {
              store.setVip(true);
              store.setPremium(true);
              store.setAdsRemoved(true);
              store.addGems(1200);
              store.addCoins(25000);
              for (const id of ["aurelian", "midnight", "cyberdream", "phoenixegg", "midasorb"]) store.grantItem("skin", id);
              for (const id of ["comet", "stardust"]) store.grantItem("trail", id);
            }
            audio.play("purchase");
            if (store.hapticsEnabled) haptic([20, 40, 20]);
            setPayOffer(null);
          }}
        />
      )}
    </MenuShell>
  );
}


function GemsTab({
  onBundle,
  onOffer,
  onFree,
  gems,
  vip,
  vipClaimable,
  onVipClaim,
}: {
  onBundle: (b: (typeof GEM_BUNDLES)[number]) => void;
  onOffer: (o: OfferDef) => void;
  onFree: () => void;
  gems: number;
  vip: boolean;
  vipClaimable: boolean;
  onVipClaim: () => void;
}) {

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-primary/40 bg-card p-4 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Your gems</div>
        <div className="mt-1 font-display text-3xl font-black text-primary">💎 {gems.toLocaleString()}</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Gems unlock elite &amp; limited-edition cosmetics. Earn a few by winning levels or grab a bundle below.
        </p>
      </div>

      {vip && (
        <div className="flex items-center justify-between rounded-2xl border border-gold/60 bg-gradient-to-r from-gold/15 to-transparent px-4 py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold">⭐ VIP active</div>
            <div className="text-[11px] text-muted-foreground">No ads · 2× coins · 5 💎 daily</div>
          </div>
          <GameButton
            variant={vipClaimable ? "gold" : "ghost"}
            className="!px-3 !py-2 text-[11px]"
            disabled={!vipClaimable}
            onClick={onVipClaim}
          >
            {vipClaimable ? "Claim 5 💎" : "Claimed"}
          </GameButton>
        </div>
      )}

      <button
        onClick={onFree}
        className="animate-pulse-glow flex items-center justify-between rounded-2xl border border-gold/50 bg-card px-4 py-4 text-left active:scale-95"
      >
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Free gem</div>
          <div className="font-display text-lg font-bold text-gold">📺 Watch ad · +1 💎</div>
        </div>
        <span className="text-3xl" aria-hidden>🎁</span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {GEM_BUNDLES.map((b) => (
          <div
            key={b.id}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 ${
              b.best ? "border-gold/60 glow-primary" : "border-border"
            } bg-card`}
          >
            {b.best && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/60 bg-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                ★ Best value
              </span>
            )}
            <div className="text-3xl" aria-hidden>💎</div>
            <div className="text-center">
              <div className="font-display text-xl font-black text-primary">{b.gems.toLocaleString()}</div>
              {b.bonus && <div className="text-[10px] font-bold uppercase text-gold">+{b.bonus} bonus</div>}
            </div>
            <GameButton variant="gold" className="w-full !px-2 !py-2 text-[11px]" onClick={() => onBundle(b)}>
              {b.priceLabel}
            </GameButton>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Special offers</div>
        <div className="flex flex-col gap-2">
          {OFFERS.map((o) => (
            <button
              key={o.id}
              onClick={() => onOffer(o)}
              className={`relative flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-left active:scale-95 ${
                o.best ? "border-gold/60 glow-primary" : "border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{o.icon}</span>
                <div>
                  <div className="font-display text-sm font-bold">{o.title}</div>
                  <div className="text-[11px] text-muted-foreground">{o.subtitle}</div>
                </div>
              </div>
              <span className="flex flex-col items-end">
                {o.wasLabel && (
                  <span className="text-[10px] text-muted-foreground line-through">{o.wasLabel}</span>
                )}
                <span className="font-display text-sm font-black text-gold">{o.priceLabel}</span>
              </span>
              {o.best && (
                <span className="absolute -top-2 left-4 rounded-full border border-gold/60 bg-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                  ★ Most popular
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Purchases are simulated in this build. Real in-app purchases plug in at native release.
      </p>
    </div>

  );
}

function LoadoutsTab() {
  const store = useGameStore();
  const [name, setName] = useState("");
  const skin = SKINS.find((s) => s.id === store.equippedSkin);
  const trail = TRAILS.find((t) => t.id === store.equippedTrail);
  const explosion = EXPLOSIONS.find((e) => e.id === store.equippedExplosion);
  const theme = THEMES.find((t) => t.id === store.equippedTheme);

  const save = () => {
    const l = store.saveLoadout(name);
    if (l) {
      audio.play("click");
      if (store.hapticsEnabled) haptic([20, 30, 20]);
      setName("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest">Current equipped</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Ball" value={skin?.name ?? "—"} color={skin?.color} />
          <Stat label="Trail" value={trail?.name ?? "—"} color={trail?.color} />
          <Stat label="Explosion" value={explosion?.name ?? "—"} color={explosion?.colors[0]} />
          <Stat label="Theme" value={theme?.name ?? "—"} color={theme?.accent} />
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Loadout name"
            maxLength={18}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <GameButton onClick={save} disabled={store.loadouts.length >= 8} className="!px-3 !py-2 text-[11px]">
            Save
          </GameButton>
        </div>
        {store.loadouts.length >= 8 && (
          <p className="mt-2 text-xs text-destructive">Max 8 loadouts. Delete one to save more.</p>
        )}
      </div>

      <div className="space-y-2">
        {store.loadouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No saved loadouts yet.</p>
        ) : (
          store.loadouts.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <div>
                <div className="font-display text-sm font-bold">{l.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {l.skin} · {l.trail} · {l.explosion} · {l.theme}
                </div>
              </div>
              <div className="flex gap-2">
                <GameButton
                  variant="primary"
                  className="!px-3 !py-2 text-[11px]"
                  onClick={() => {
                    store.applyLoadout(l.id);
                    audio.play("click");
                    if (store.hapticsEnabled) haptic([20, 30, 20]);
                  }}
                >
                  Equip
                </GameButton>
                <button
                  onClick={() => {
                    store.deleteLoadout(l.id);
                    audio.play("click");
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/40 text-destructive active:scale-95"
                  aria-label="Delete loadout"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5 font-display text-sm font-bold">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
        {value}
      </div>
    </div>
  );
}

