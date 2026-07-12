import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useGameStore } from "@/lib/game/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { audio, haptic } from "@/lib/game/audio";

/** Shared shell for menu screens: back button, title, coin balance. */
export function MenuShell({ title, children }: { title: string; children: ReactNode }) {
  const hydrated = useHydrated();
  const coins = useGameStore((s) => s.coins);
  const haptics = useGameStore((s) => s.hapticsEnabled);

  return (
    <div className="bg-arena flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link
          to="/"
          onClick={() => {
            audio.play("click");
            if (haptics) haptic();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-lg transition-transform active:scale-90"
          aria-label="Back to main menu"
        >
          ←
        </Link>
        <h1 className="text-glow text-lg font-bold uppercase tracking-widest">{title}</h1>
        <CoinBadge amount={hydrated ? coins : 0} />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-10">{children}</main>
    </div>
  );
}

export function CoinBadge({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-card px-3 py-1.5 text-sm font-bold text-gold">
      <span aria-hidden>🪙</span>
      <span className="tabular-nums">{amount.toLocaleString()}</span>
    </div>
  );
}

export function GameButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "accent" | "ghost" | "gold";
  className?: string;
  disabled?: boolean;
}) {
  const haptics = useGameStore((s) => s.hapticsEnabled);
  const base =
    "rounded-2xl px-5 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none";
  const styles = {
    primary: "bg-primary text-primary-foreground glow-primary",
    accent: "bg-accent text-accent-foreground glow-accent",
    ghost: "border border-border bg-card text-foreground",
    gold: "bg-gold text-gold-foreground",
  } as const;
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      disabled={disabled}
      onClick={() => {
        audio.play("click");
        if (haptics) haptic();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
