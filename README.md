# One Second Games

A no-build, no-dependency browser game platform with 103 playable games. Game sessions, records, preferences, daily challenges, and music run in the browser; there is no account, backend, paid service, or external audio request.

## Run locally

Requires Node.js. From this directory:

```powershell
node serve.mjs
```

Open <http://localhost:8000>. The site uses native ES modules, so opening `index.html` directly is not supported. `node build.mjs` (or `npm run build`) packages the static app into `dist/`; no dependencies or code compilation are needed. HTTPS enables the service worker and PWA installation.

## Game library

Every catalog entry has its own ID, instructions, and playable mechanic. There are intentionally two distinct Fastest Finger games and two distinct Don’t Click games.

- **Reaction:** Reaction Test, Fastest Finger, Flash Click, Red Light, Quick Draw, Lightning Tap, Instant Button, Reaction Chain, Wait For It, Speed Switch, Fast Finger, Blink Catcher.
- **Memory:** Number Memory, Pattern Memory, Sequence Tap, Memory Grid, Color Sequence, Flash Numbers, Icon Sequence, Card Peek, Position Memory, Reverse Memory, Memory Pair, Vanishing Grid, What Changed?, Last One Standing.
- **Accuracy:** Stop the Clock, Moving Target, Target Accuracy, Bullseye, Perfect 1.00, Tiny Target, Moving Bullseye, Three Shots, Perfect Center, Target Rain, One Shot, Safe Zone, Avoid the Red, Precision Line.
- **Math:** Quick Math, Higher Number, Odd or Even, Rapid Addition, Rapid Subtraction, Rapid Multiplication, Number Rush, Lower Number, Prime or Not, Missing Number, Closest Number.
- **Vision:** Color Match, Odd One Out, Shape Match, Visual Counting, Find the Dot, Which Shape?, Color Intruder, Missing Tile, Mirror Image, Flash Memory, Same or Different, Hidden Number, Pixel Hunt, Visual Count.
- **Speed:** Direction Test, Tap Counter.
- **Luck:** Higher or Lower, Coin Flip Streak, Lucky Number, Higher Roll.
- **Logic:** Number Sequence, True or False, Pattern Finish, Sequence Break, Shape Sequence, Direction Sequence, Logic Switch, Odd Rule, Pattern Rotation, Tile Logic, Which Comes Next?, Rule Breaker.
- **Arcade:** Endless Runner, Snake, Block Stack (falling-block puzzle), Dodge!, Catch the Coin, Avoid the Bomb, Mini Pong, Mini Flappy, Jump Now!, Lane Switch, Meteor Dodge, Coin Dash, Laser Escape.
- **Fun:** Don’t Click (safe-object choice), Don’t Blink, Don’t Click (resist the timer), Impossible Button, How Lucky Are You?, Beat the AI, One Chance.

## Structure

- `index.html`, `styles.css`: semantic app shell, responsive design, themes, and shared game UI.
- `js/main.js`: hash routing, home/library/stats views, results, daily challenge, favorites, sharing, and tab lifecycle.
- `js/games/registry.js`: the 103 game definitions and categories.
- `js/games/core.js`: original short-form games and shared lifecycle for prompt games.
- `js/games/extended/`: distinct mechanics grouped by reaction, accuracy, vision, memory, math/logic, and fun.
- `js/games/arcade.js`, `js/games/arcade-extra.js`: Snake, falling-block puzzle, runner, and ten Canvas arcade games with keyboard/touch input.
- `js/lib/storage.js`: guarded local storage with in-memory fallback.
- `js/lib/audio.js`: generated Web Audio effects and procedural category music. Music starts only after Play, stops on result/exit, and uses three generated note-pattern variations per category. No tracks or libraries are downloaded; it costs $0.
- `js/lib/daily.js`: date-seeded daily lineup.
- `manifest.webmanifest`, `sw.js`, `assets/icon.svg`: PWA metadata, original vector icon, and offline cache.
- `serve.mjs`: dependency-free local static server.
- `tests/platform.test.js`: registry, deterministic daily selection, and blocked-storage fallback checks.

Scores, settings, favorites, daily results, recent games, and streaks stay in the current browser. The share action uses Web Share when available or copies a game link. The homepage includes a clearly labeled advertisement placement only; no provider is loaded and no ad is simulated.

## Add a game

Add a unique definition to `js/games/registry.js`, then implement its mode in the relevant core/extended handler. For an arcade game, add a handler to `js/games/arcade-extra.js` or `js/games/arcade.js`. Add new offline assets to the `FILES` list in `sw.js` and update the registry test when the collection size changes.

## Deploy and future advertising

For Netlify, use `node build.mjs` as the build command and `dist` as the publish directory. The build copies the static app and writes `dist/_redirects` with a fallback to `index.html`. Routes are currently hash-based (for example, `#games/reaction-test`), so normal in-app navigation does not require a server rewrite; the fallback also supports direct clean-path visits. A future ad provider can replace the labeled homepage slot in `js/main.js`; keep provider code outside active game sessions and do not cover controls.

## Verification and limits

Run the production packaging build and automated checks with:

```powershell
npm run build
npm test
```

The build is a static packaging step rather than compilation; there are no external dependencies. Automated tests cover registry, arcade routing, daily selection, and storage fallback. Every game has not received a manual browser playthrough across mobile and desktop devices; use that as the remaining release QA step before a public launch.
