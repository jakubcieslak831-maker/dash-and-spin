import { useEffect, useState } from "react";

/**
 * Simulated ad player. Real AdMob only works inside a native app shell
 * (Capacitor + AdMob plugin) — this component keeps the exact same contract
 * (onComplete / onSkip) so the real SDK can be dropped in later.
 */
export function AdModal({
  kind,
  onComplete,
  onSkip,
}: {
  kind: "rewarded" | "interstitial";
  onComplete: () => void;
  onSkip?: () => void;
}) {
  const [left, setLeft] = useState(kind === "rewarded" ? 4 : 3);

  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left <= 0 && kind === "interstitial") onComplete();
  }, [left, kind, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-6 w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center">
        <div className="animate-float mb-4 text-5xl" aria-hidden>
          📺
        </div>
        <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
          {kind === "rewarded" ? "Rewarded Ad" : "Advertisement"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Ad placeholder — AdMob hooks in here in the native build.
        </p>
        {left > 0 ? (
          <div className="font-display text-4xl font-black tabular-nums text-primary">{left}</div>
        ) : kind === "rewarded" ? (
          <button
            className="glow-primary w-full rounded-2xl bg-primary px-5 py-3 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground active:scale-95"
            onClick={onComplete}
          >
            Claim Reward
          </button>
        ) : null}
        {kind === "rewarded" && left > 0 && onSkip && (
          <button className="mt-4 text-xs text-muted-foreground underline" onClick={onSkip}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
