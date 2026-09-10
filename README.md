# BladeRun Studio

Build a Complete Mobile Game Called "BladeRun"



Create a polished mobile game for Android and iOS called BladeRun.



Core Gameplay



The player controls a small ball inside a long cylindrical tunnel.



The objective is to reach the treasure chest at the end before the timer reaches zero.



The camera follows behind the ball in a smooth third-person perspective.



The ball constantly rolls forward automatically.



The player taps anywhere on the screen to perform a short forward dash that helps time movement through spinning obstacles. Controls should feel smooth and responsive.



If the ball touches any obstacle, the player instantly loses.



If the timer reaches zero before the finish, the player loses.



If the player reaches the treasure chest, they win and receive coins.



---



Obstacles



There are 15 spinning fan blades.



Each blade has one or more gaps.



Every blade spins faster than the previous one.



Randomize the starting rotation so every run feels different.



Later blades may:



- Reverse rotation.

- Speed up unexpectedly.

- Slow down briefly before accelerating.

- Have smaller openings than earlier blades.



Future obstacle types should be easy to add, including:



- Moving lasers

- Wall spikes

- Crushing pistons

- Wind zones

- Rotating hammers



---



Difficulty



The game should gradually become harder.



Difficulty increases through:



- Faster obstacle speed.

- Smaller gaps.

- Less time available.

- More complex obstacle patterns.



---



Game Modes



Classic



15 blades with one treasure chest.



Endless



Procedurally generates obstacles forever.

The objective is to survive as long as possible.



Daily Challenge



A fixed level that resets every 24 hours.

Everyone plays the same challenge.



---



Currency



Coins are earned by:



- Completing a level.

- Daily rewards.

- Missions.

- Watching rewarded ads.



Coins can purchase:



- Ball skins.

- Trail effects.

- Explosion effects.

- Victory animations.

- Tunnel themes.



---



Shop



Include a polished shop with categories.



Balls



20 unlockable skins.



Trails



15 trail effects.



Explosions



10 death animations.



Themes



- Ice

- Lava

- Space

- Factory

- Neon

- Jungle



---



Daily Rewards



Reward players for consecutive logins.



Example:



Day 1 - 100 Coins



Day 2 - 150 Coins



Day 3 - Skin



Day 4 - 250 Coins



Day 5 - Trail



Day 6 - 500 Coins



Day 7 - Epic Skin



---



Missions



Examples:



- Finish 5 runs.

- Reach blade 10.

- Collect 1000 coins.

- Watch one rewarded ad.

- Beat Classic Mode.



Reward players with coins or cosmetics.



---



Leaderboards



Global leaderboard:



- Fastest completion time.

- Highest Endless score.



Display player rank.



---



Achievements



Include at least 30 achievements.



Examples:



- First Win

- 100 Deaths

- Reach Blade 15

- Unlock 10 Skins

- Finish Without Dying

- Complete Daily Challenge



---



UI



Modern minimalist interface.



Main Menu:



- Play

- Endless

- Daily Challenge

- Shop

- Missions

- Leaderboards

- Settings



During gameplay display:



- Timer

- Coins

- Current blade

- Pause button



Game Over screen:



- Score

- Coins earned

- Restart

- Main Menu

- Watch Ad to Continue (one use per run)



---



Audio



Include:



- Menu music.

- Gameplay music.

- Winning sound.

- Losing sound.

- Button clicks.

- Coin collection.

- Fan spinning effects.



Allow players to separately adjust music and sound effects.



---



Monetization



Implement Google AdMob.



Rewarded Ads:



- Continue after dying.

- Double earned coins.



Interstitial Ads:



- Every 3–5 completed runs.



Remove Ads purchase:

£2.99



Premium Membership:

£4.99/month



Premium includes:



- No ads.

- Daily gems.

- Exclusive skins.

- Exclusive trails.

- Premium badge.

- Double coin rewards.



---



Performance



The game must:



- Run smoothly on low-end Android devices.

- Maintain 60 FPS where possible.

- Save all progress locally.

- Be structured so cloud save can be added later.



---



Polish



Include:



- Smooth animations.

- Screen shake on impact.

- Particle effects.

- Haptic feedback.

- Clean transitions.

- Loading screen.

- Settings menu.

- Pause menu.

- Tutorial for first-time players.

- Auto-save.

- Error handling.



Write clean, modular, well-documented code that is easy to extend with new worlds, obstacles, cosmetics, and game modes in future updates.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/52169e4b-5657-4d7d-85fb-4f51f3d83771).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
