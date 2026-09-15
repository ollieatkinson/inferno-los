# Inferno LoS

An Inferno line-of-sight playground and prayer trainer, with a RuneLite sidebar for wave-start and current-position links.

## Run the website

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/**. No account or backend is needed. All scene and replay data stays in the link; preferences stay in your browser.

- Click or drag the player to explore tiles. Drag monsters to rearrange them; double-click to remove.
- **Space** steps one game tick. The controls, prayer choices and vertical attack timeline sit beside the arena.
- **1 / 2 / 3** select magic / ranged / melee protection; **0** turns prayer off. **P** plays or pauses, **R** resets, and the arrows move the player.
- Toggle pillars, LoS shading and spawn tiles. Orientation and light/dark mode are remembered.
- Paste a position/replay link, compact `IL2-…` share code or Inferno Scouter code into the input. **Share position** copies a compact link including current NPC positions and modeled attack state. **More → Copy share code** copies just the code; **Copy replay link** includes recorded player movement and prayer choices. Existing JSON links still load.
- **Prayer trainer** offers ranger/mager, blob/mager, Jad, Triple Jad, or the current stack. Both Jad drills remove pillars and use actual stomp/rear-up animation frames. Triple Jad staggers attacks three ticks apart on nine-tick cycles. Play a 60-tick drill at game speed (600 ms), or slow it down. Scores show protected/missed attacks, streaks, and prayer-off idle ticks. Hide hints to practise reading the animations.

## RuneLite plugin

The [standalone Gradle project](plugin/README.md) is in `plugin/`. It builds against RuneLite 1.12.38 and can be moved into a separate repository without restructuring.

```sh
cd plugin
./gradlew run
```

Requires a JDK 17 installation. This launches a development RuneLite client with the plugin loaded. Enable **Inferno LoS**, open its sidebar, and leave the website URL set to `http://localhost:5173/` while developing locally.

With mise installed, the repository's `mise.toml` selects Java 17: run `mise install` once, then `mise exec -- plugin/gradlew -p plugin run` from the repository root. This also works in shells where Java is not already on `PATH`.

The sidebar captures NPC coordinates from spawn events, stores a button per wave, and keeps those buttons after leaving the Inferno. **Current LoS** captures current positions when clicked. Both actions have copy buttons. The next run's wave 1 clears the previous history. History is held for the current plugin session.

## Tests

```sh
npm test
npm run build
cd plugin && ./gradlew test jar && cd ..
npx playwright install chromium
npm run test:browser
```

Run Java tests before browser tests: they generate the link fixture used to verify the real Java-to-browser contract. To use an existing Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Browser tests cover dragging both player and NPCs, double-click deletion, persisted preferences, Scouter codes, replay navigation, trainer timing/scoring, desktop/mobile layout, a Java-generated snapshot, and populated-scene drag performance. The LoS engine caches per-monster maps and batches pointer movement with animation frames.

## Timing and scope

The map uses the established Inferno LoS tool's 29×30 coordinate grid and three pillar footprints. NPC anchors are southwest tiles. RuneLite instance coordinates are normalized to the template region; NPC indices preserve relative ordering.

Blobs scan protection and schedule the opposite ranged/magic attack three ticks later; their cycle is six ticks. Jad has a windup and a prayer check three ticks later. The trainer uses reproducible choices for unknown styles. A pending blob/Jad attack is retained in a shared current-position link. The website never claims to recover live attack cooldowns from a positional snapshot: initial delays are editable.

This is not a complete combat simulator. It does not model player pathfinding, damage/HP, melee digs, NPC resurrection, nibbler AI, or Zuk/shield mechanics. Movement places the player at the chosen tile, then stepping moves NPCs. Zuk-wave links explicitly identify their supported-adds-only scope. An accuracy score measures this simulator's prayer checks; idle ticks are not a calculation of prayer-point drain. Browser playback pauses when the tab is hidden.

## Share format

See [docs/LINKS.md](docs/LINKS.md) for the versioned plugin/website contract and Inferno Scouter compatibility. Scouter codes represent initial spawn slots, so arbitrary moved stacks use full position links instead.

## Deploy

See [Cloudflare Pages and RuneLite release](docs/RELEASE.md) for hosting settings, local plugin testing, and the Plugin Hub submission process.

`npm run build` produces a static `dist/` directory that can be served on any static host. Relative asset paths support subdirectory hosting. The optional GitHub Pages workflow can be run manually after creating a repository and enabling Pages with GitHub Actions. Set the plugin's **Website URL** to that deployed address.

No site has been published and the plugin has not been submitted to the Plugin Hub. Automated verification includes a compiled plugin, Swing sidebar actions, mocked RuneLite scene capture, browser integration, and an isolated real RuneLite startup; it does not constitute an in-game playtest.

## Credits

Inspired by [Supalosa's Colosseum LoS](https://github.com/Supalosa/osrs-colosseum), [Backseat](https://bistools.github.io/inferno.html), [iFreedive](https://ifreedive-osrs.github.io/), [Fortis Colosseum](https://github.com/LlemonDuck/fortis-colosseum), [Inferno Scouter](https://github.com/jeremiah855/inferno-scouter) and [Inferno Trainer](https://github.com/OldSchoolSDK/InfernoTrainer). See [THIRD_PARTY.md](THIRD_PARTY.md) for source and asset attribution.

[PLAN.md](PLAN.md) tracks the requested features and their verification.
