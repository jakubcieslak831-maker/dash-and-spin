# BladeRun — Next Feature Plan

You've already got a very complete tunnel-runner: 300-level campaign, Endless, Daily, Season Pass, rank/XP system, shop, monetization offers, achievements, missions, and accessibility. The goal now is to tighten the loop and add the high-leverage features that keep players coming back and spending more.

## Proposed work

### 1. Revive & Continue economy (monetization + retention)
- When the player crashes, offer a continue screen:
  - **Free**: watch one rewarded ad to revive at the same spot with a 3-second shield.
  - **Premium**: spend 5 gems to revive (no ad).
  - **VIP**: first revive each run is free or half-priced.
- Cap revives per run to 2 so it never feels infinite.
- Persist "sessionDeaths" already exists in the store; extend it to track revives used.

### 2. Post-run share / summary screen (virality + satisfaction)
- Replace the simple win/lose overlay with a full run summary:
  - Time, blades passed, coins earned, near-miss count, combo peak, XP gained.
  - One-tap screenshot card with the player's rank, skin, and best moment.
  - Share button (uses Web Share API) to brag times/scores.
  - "Play again" / "Next level" / "Menu" CTAs.

### 3. Loadout presets (engagement + shop value)
- Let players save up to 3 skin + trail + explosion + theme combinations.
- Add a "Loadouts" row in the shop to quickly switch full looks.
- Encourages owning more cosmetics.

### 4. Weekly Tournament leaderboard (retention)
- A 7-day rotating leaderboard separate from the daily bots.
- Tracks total Endless score across all runs that week.
- Reward tiers at the end: top 10% gems, top 50% coins, participation coins.
- Adds a reason to play beyond daily missions.

### 5. Haptic & audio juice upgrades
- Richer haptic patterns: light tap on coin, sharp on near-miss, double-tap on blade pass.
- Add a second music track for Endless mode and a third for boss levels.
- Near-miss audio sting that scales with combo.

### 6. First-run onboarding
- A 3-step tutorial overlay on the first play:
  1. "Drag left/right to steer around the tunnel."
  2. "Line up with the gap."
  3. "Collect coins and aim for near-misses."
- Mark `tutorialSeen` in store; skip afterward.

### 7. More obstacle variety & level modifiers
- **Moving gaps**: blades whose gap rotates back and forth as you approach.
- **Splitter blades**: two narrow gaps, requiring precise timing.
- **Pulse walls**: rings that briefly close/open.
- **Level modifiers**: every 5th level gets a random twist (e.g., "Dense" = more blades, "Spinning" = all blades faster, "Dark" = reduced visibility).

### 8. Cloud save foundation
- Move the persisted Zustand save behind a server-backed profile so progress survives reinstalls.
- Keep the local store as offline cache; sync on login.
- Enables real leaderboards and cross-device play later.

## Out of scope for this round
- Real-time multiplayer (too heavy for a single pass).
- Custom level editor (great, but requires UGC moderation).

## Technical notes
- Revive UI is a new overlay in `src/routes/play.tsx` plus engine state to pause/resume.
- Post-run summary replaces the existing victory overlay in `play.tsx` and the death overlay in `engine.ts`.
- Loadouts need a new store slice and a new preset manager.
- Weekly tournament is local-first with deterministic bot scores, same pattern as `leaderboards.tsx`.
- New obstacles are additions to `src/lib/game/engine.ts` implementing the existing `Obstacle` interface.
- Cloud save uses a TanStack server function with Lovable Cloud persistence.

## Order of implementation
1. Revive economy + post-run summary (biggest impact, monetization + retention).
2. Onboarding + haptic/audio juice (polish, first-time experience).
3. Weekly tournament + loadout presets (long-term retention).
4. New obstacle types and level modifiers (gameplay depth).
5. Cloud save sync (infrastructure).
