import { useEffect, useState } from "react";

/**
 * Simulated in-app purchase confirmation. Real IAP (Google Play Billing /
 * StoreKit) plugs in behind the exact same contract, so callers don't change.
 * This replaces the previous flow of showing a rewarded-ad modal on purchase.
 */
export function PaymentModal({
  title,
  subtitle,
  priceLabel,
  icon = "💎",
  onComplete,
  onCancel,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  icon?: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<"confirm" | "processing" | "done">("confirm");

  useEffect(() => {
    if (phase !== "processing") return;
    const t = setTimeout(() => setPhase("done"), 1100);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => onComplete(), 700);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-6 w-full max-w-sm rounded-3xl border border-primary/40 bg-card p-8 text-center">
        <div className="mb-3 text-5xl" aria-hidden>{phase === "done" ? "✅" : icon}</div>
        <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-widest">
          {phase === "done" ? "Purchase complete" : phase === "processing" ? "Processing…" : "Confirm purchase"}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {phase === "done" ? `${title} added to your account.` : subtitle}
        </p>

        {phase === "confirm" && (
          <>
            <div className="mb-5 rounded-2xl border border-border bg-background/60 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Total</div>
              <div className="font-display text-3xl font-black text-primary">{priceLabel}</div>
            </div>
            <button
              className="glow-primary w-full rounded-2xl bg-primary px-5 py-3 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground active:scale-95"
              onClick={() => setPhase("processing")}
            >
              Pay {priceLabel}
            </button>
            <button className="mt-3 text-xs text-muted-foreground underline" onClick={onCancel}>
              Cancel
            </button>
            <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
              Simulated payment · Store SDK plugs in for release
            </p>
          </>
        )}

        {phase === "processing" && (
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    </div>
  );
}
