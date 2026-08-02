# BladeRun — "Live Service & Juice" Overhaul

Four feature directions, layered onto the existing engine/store/economy. Ordered so each phase is independently shippable.

## Phase 1 — Combo multiplier + in-run power-ups (the "juice")

Goal: every run feels rewarding and "just one more" through escalating feedback.

**Combo system**
- Track a per-run combo counter in play state (`src/routes/play.tsx`) driven by engine callbacks: `onNearMiss` and `onCoin` increment it, death resets it to 0.
- Combo multiplies coin value: coins earned = base × (1 + floor(combo/5) × 0.5), capped at ×3. Pass the multiplier into `recordRun`'s `coinsEarned`.
- HUD combo badge (`src/routes/play.tsx`): grows + shifts hue as combo climbs, plays the existing `coin_combo` audio every 5-hit milestone, haptic pulse. Resets with a "Combo broken" flash on death.
- Near-miss is already detected in the engine — wire its callback through.

**Power-up pickups (collectibles in the tunnel)**
- Engine (`src/lib/game/engine.ts`): add a `Pickup` entity type spawned along the tunnel (glowing orb + icon). Types: `shield` (1-hit absorb), `magnet` (wider coin pull), `slowmo` (blades 20% slower, 6s), `double` (×2 coins, 8s), `rush` (temp speed boost + invuln, 3s).
- These reuse the existing `SkinEffect` machinery (magnet/slowmo/shield already exist) — pickups activate the same effects for a timed duration instead of permanently.
- Spawn logic: deterministic from level seed, ~1 pickup every 4-6 blades, biased away from blade gaps so they're grabbable. Endless spawns scale frequency up slightly.
- HUD: active-power-up icons with shrinking timer rings (`src/routes/play.tsx`).
- Audio: new `powerup` SFX + a `shield_break` SFX in `src/lib/game/audio.ts`.

## Phase 2 — Player XP & rank profile

Goal: a persistent, visible meta-identity beyond "unlocked level".

**XP & rank**
- Add `playerXP` and a derived `playerLevel` to `src/lib/game/store.ts`. XP formula: base per run + bonuses for win, near-misses, combo milestones, blades passed. Premium doubles XP (ties into existing `premium` flag).
- Rank titles in `src/lib/game/progression.ts`: Rookie → Apprentice → Runner → Veteran → Elite → Master → Legend, each spanning several player levels with a required-XP threshold + an emoji badge.
- `recordRun` awards XP; store exposes `playerLevel`, `playerRank`, `xpIntoLevel`, `xpForNextLevel`.
- Rank-up triggers the existing `levelup` audio + a celebratory toast.

**Profile screen** (new route `src/routes/profile.tsx`)
- Big rank badge, level number, XP progress bar to next rank.
- Lifetime stats grid (runs, wins, deaths, best times, coins, gems, dailies, streak).
- Best per-mode records + total achievements count + season tier summary.
- Add nav link from the main menu (`src/routes/index.tsx`).

## Phase 3 — Season / Battle Pass

Goal: the #1 retention + monetization loop, fed by the XP from Phase 2.

**Season state** (`src/lib/game/store.ts` + `src/lib/game/progression.ts`)
- `seasonXP`, `seasonTier` (0-100), `seasonPremium` (purchased flag), `seasonNumber`.
- Every player XP point also counts as season XP (so playing fills the pass). Premium doubles season XP.
- `SEASON_REWARDS` in progression.ts: 100 tiers. Free track grants coins/gems/basic cosmetics every few tiers; premium track grants exclusive "Season N" skins/trails/themes + bigger gem piles. Reuse the limited-edition cosmetics already flagged in `cosmetics.ts`.
- `claimSeasonTier(tier)` grants both free+premium rewards for that tier (free only if not premium).

**Season screen** (new route `src/routes/season.tsx`)
- Vertical scrolling tier track (free column + premium column), current tier highlighted, claimed tiers dimmed, a "Claim all" button for any reached-but-unclaimed tiers.
- Premium unlock purchase via `PaymentModal` (reuses existing offers flow) → sets `seasonPremium`.
- Season XP progress bar at top + "X XP to next tier".
- Add nav link + a progress widget on the main menu showing "Season N · Tier X".

## Phase 4 — New obstacles + boss blades

Goal: gameplay variety across the 300 levels and a memorable world finale.

**New obstacle types** (`src/lib/game/engine.ts`, extending the existing `Obstacle` interface)
- `laser` — thin horizontal/vertical beam that pulses on/off on a timer; pass during the off-window.
- `hammer` — piston that smashes across the tunnel on a rhythm; telegraphed by a warning glow before strike.
- `sliding` — a bar that slides along the tunnel wall, leaving a moving gap (like a moving blade gap).
- `portal` — a pair of rings; entering one teleports the ball to the other (shortcut/avoidance mechanic).
- All keep the reachability contract: timing windows are capped relative to tunnel traversal time, and each has a guaranteed pass window.

**Boss blades** (`src/lib/game/levels.ts` + engine)
- Every 10th level (world finale) ends with a "Mega Blade": a larger multi-segment blade with 2-3 synchronized rotating rings and a smaller gap, plus a brief intro zoom + name card ("MEGA BLADE — World 3 Boss").
- Config flag `getLevelConfig(level).isBoss = (level % 10 === 0)`. Engine renders the mega blade bigger with a distinct gold tint + extra sparkles.
- Beating a boss awards bonus gems + a guaranteed season-tier bump.

## Technical notes
- Combo + power-up state lives in play component state / engine callbacks, not persisted — keep `recordRun` as the single persistence touchpoint so store stays clean.
- XP/season state is persisted in the existing zustand store; bump the persist key version (`bladerun-save-v1` → `v2`) with a migration that seeds `playerXP: 0`, `seasonTier: 0` etc. so existing players don't break.
- New routes (`/profile`, `/season`) get their own `head()` metadata per the SEO rules.
- All new audio is procedural (Web Audio) to stay zero-asset.

## Verification
- Typecheck after each phase; run the existing Playwright flow script to confirm no regression on the core play loop.
- New Playwright checks: combo HUD increments on near-miss, power-up icon appears on pickup, season screen renders tiers and claims a tier, profile shows rank + XP bar, a boss level (L10) shows the mega blade intro card.
