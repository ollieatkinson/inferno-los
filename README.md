# Inferno LoS

An Inferno line-of-sight playground and prayer trainer. This repository contains the static React + TypeScript website, built with Vite. Simulation, LoS, training and share codes run entirely in the browser; there is no backend.

The production address is [los.inferno.tips](https://los.inferno.tips/).

The companion RuneLite sidebar lives in [inferno-los-plugin](https://github.com/ollieatkinson/inferno-los-plugin).

## Run the website

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/**. No account or backend is needed. All scene and replay data stays in the link; preferences stay in your browser.

- Click or drag the player to explore tiles. Drag monsters to rearrange them; double-click to remove.
- Enter a **Wave** number and click **Spawn wave** to practise its monster lineup. Waves 1–66 use random assignments to the nine spawn slots; click again for a new layout, or **Reset** to retry the same one. Waves 67–68 load pillar-free Jad setups. Open `https://los.inferno.tips/?wave=63` for a random wave 63; **Share position** saves its exact layout. Wave 69 is not available because Zuk is not simulated. Nibblers appear in their central spawn area, but their movement and pillar damage are not simulated.
- **Space** steps one game tick. The controls, prayer choices and vertical attack timeline sit beside the arena.
- **1 / 2 / 3** select magic / ranged / melee protection; **0** turns prayer off. **P** plays or pauses, **R** resets, and the arrows move the player.
- Toggle pillars, LoS shading and spawn tiles. Orientation and light/dark mode are remembered.
- Paste a position/replay link, compact `IL2-…` share code or Inferno Scouter code into the input. **Share position** copies a compact link including current NPC positions and modeled attack state. **More → Copy share code** copies just the code; **Copy replay link** includes recorded player movement and prayer choices.
- **Prayer trainer** offers ranger/mager, blob/mager, Jad, Triple Jad, or the current stack. Both Jad drills remove pillars and use actual stomp/rear-up animation frames. Triple Jad staggers attacks three ticks apart on nine-tick cycles. Play a 60-tick drill at game speed (600 ms), or slow it down. Scores show protected/missed attacks, streaks, and prayer-off idle ticks. Hide hints to practise reading the animations.

## RuneLite plugin

Clone [inferno-los-plugin](https://github.com/ollieatkinson/inferno-los-plugin) alongside this repository. Its README covers Java 17 setup, development-client launch and Plugin Hub submission. The website does not require Java or the plugin checkout to build or test.

The plugin's **Current LoS** button opens a snapshot of player/NPC positions and pillars on this website. Wave-start links remain available after leaving the Inferno. The plugin defaults to `https://los.inferno.tips/`. Set **Website URL** to `http://localhost:5173/` for local development.

## Tests

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Website tests use a committed plugin contract fixture, so they run independently. Both repositories assert the same IL2 code. For a fresh cross-repository check, build the plugin and run the browser tests with `INFERNO_PLUGIN_FIXTURE_PATH=../inferno-los-plugin/build/fixtures/wave-url.txt`. To use an existing Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Browser tests cover dragging both player and NPCs, double-click deletion, persisted preferences, Scouter codes, replay navigation, trainer timing/scoring, desktop/mobile layout, a Java-generated snapshot, and populated-scene drag performance. The LoS engine caches per-monster maps and batches pointer movement with animation frames.

## Timing and scope

The map uses the established Inferno LoS tool's 29×30 coordinate grid and three pillar footprints. NPC anchors are southwest tiles. RuneLite instance coordinates are normalized to the template region; NPC indices preserve relative ordering.

Blobs scan protection and schedule the opposite ranged/magic attack three ticks later; their cycle is six ticks. Jad has a windup and a prayer check three ticks later. The trainer uses reproducible choices for unknown styles. A pending blob/Jad attack is retained in a shared current-position link. The website never claims to recover live attack cooldowns from a positional snapshot: initial delays are editable.

This is not a complete combat simulator. It does not model player pathfinding, damage/HP, NPC resurrection, nibbler AI, or Zuk/shield mechanics. Movement places the player at the chosen tile, then stepping moves NPCs. Zuk-wave links explicitly identify their supported-adds-only scope. An accuracy score measures this simulator's prayer checks; idle ticks are not a calculation of prayer-point drain. Browser playback pauses when the tab is hidden.

Meleers now burrow: a first check after 50 ticks, then repeatable checks 40–60 ticks apart, provided they cannot attack and have not hit in the last 15 ticks. The practice model uses six ticks underground, two stationary emergence ticks, and a six-tick delay from resurfacing to the next possible attack. Destination selection follows the established LoS tools and avoids terrain. Select a meleer under **Monsters** to edit **Next dig check**; imported positions start with 50 ticks because live dig timers are not captured. The exact pending destination and timers survive position links, stepping back and replay.

Inferno Stats' existing saved-wave URLs can be pasted into the website. A prepared contribution adds this site to its **Wave Tool** selector; see [the integration notes](docs/INFERNO_STATS.md).

## Share format

See [docs/LINKS.md](docs/LINKS.md) for the versioned plugin/website contract and Inferno Scouter compatibility. Scouter codes represent initial spawn slots, so arbitrary moved stacks use full position links instead.

## Deploy

See [Cloudflare hosting and RuneLite release](docs/RELEASE.md) for hosting settings, local plugin testing, and the Plugin Hub submission process.

Deploy through **Cloudflare Pages → Import an existing Git repository**, selecting `ollieatkinson/inferno-los` and branch `trunk`. Use build command `npm run build`, output directory `dist`, and build variable `NODE_VERSION=22`. Leave the root directory at the repository root. Pages Git integration handles deployment without a deploy command or API token. In the Pages project's **Custom domains**, associate `los.inferno.tips` with `inferno-los.pages.dev`. The plugin defaults to `https://los.inferno.tips/`.

The custom domain is being activated; DNS/HTTPS and hosted behavior still need verification. The plugin has not been submitted to the Plugin Hub. Automated verification includes a compiled plugin, Swing sidebar actions, mocked RuneLite scene capture, browser integration, and an isolated real RuneLite startup; it does not constitute an in-game playtest.

## Credits

Inspired by [Supalosa's Colosseum LoS](https://github.com/Supalosa/osrs-colosseum), [Backseat](https://bistools.github.io/inferno.html), [iFreedive](https://ifreedive-osrs.github.io/), [Fortis Colosseum](https://github.com/LlemonDuck/fortis-colosseum), [Inferno Scouter](https://github.com/jeremiah855/inferno-scouter) and [Inferno Trainer](https://github.com/OldSchoolSDK/InfernoTrainer). See [THIRD_PARTY.md](THIRD_PARTY.md) for source and asset attribution.

[PLAN.md](PLAN.md) tracks the requested features and their verification.
