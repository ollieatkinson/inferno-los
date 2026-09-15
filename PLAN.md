# Inferno LoS product plan

This tracks the full request, including follow-up messages. A checked item means it has been implemented and verified; code existing on disk alone does not count.

## Product requirements

- [x] Build and verify the website first, then the RuneLite integration.
- [x] Keep the website simple, similar to Supalosa's Colosseum LoS tool: the arena and a compact toolbar are the main interface.
- [x] Use actual OSRS monster sprites and prayer icons, with asset attribution.
- [x] Keep dark mode by default; offer a remembered light/dark toggle.
- [x] Offer north/south orientation and remember “south at top.”
- [x] Click to move the player and drag monsters to arrange a stack.
- [x] Drag the player continuously across tiles, just like dragging monsters.
- [x] Put the tick counter, prayer feedback and compact vertical attack timeline to the right of the arena; condense the old “Read the position” area.
- [x] Double-click a monster to remove it.
- [x] Keep Space to advance one tick; offer visible Step, Back, Play/Pause and Reset controls.
- [x] Make stepping easy to understand: show movement, attacks, blob scans, and the relevant prayer, using OSRS icons.
- [x] Keep monster/player dragging responsive: cache LoS per monster, avoid redundant tile updates, coalesce pointer events with animation frames, and measure performance in a populated scene.
- [x] Keep every monster’s LoS visible when selecting a monster, throughout dragging, and after release; retain per-monster caching. Verified on 15 September with a browser regression test and the nine-monster performance test (33.5 ms p95 across two animation frames).
- [x] Show current LoS/range and pillar blocking for Inferno monsters.
- [x] Support standing/destroyed pillars in the editor and shared snapshots.
- [x] Share arbitrary current positions, wave starts and recorded replays as links.
- [x] Replace verbose JSON share links with compact, self-contained `IL2-…` codes in the website and RuneLite plugin; support copying/pasting bare codes and verify corruption handling and Java/browser compatibility. Unreleased JSON-link support was removed at the user's request when splitting repositories.
- [x] Import Inferno Scouter spawn codes, including optional NPC ranks and north/south/west pillar HP. Export compatible codes when a scene fits that format.
- [x] Add a prayer trainer with clickable prayers, keyboard controls, tick timing, practice drills, and feedback/accuracy/streak statistics.
- [x] Add Triple Jad practice with three staggered Jads and a nine-tick cycle; remove pillars and their controls from both Jad drills.
- [x] Show actual OSRS Jad stomp/rear-up animation frames, synchronized with ticks, speed, pause/resume and manual stepping; keep image animation independent of LoS rendering and verify all 45 assets decode in the browser.
- [x] Make scoring reflect prayer checks, including the blob's scan/attack cycle and Jad's delayed prayer check. Clearly distinguish modeled timing from live-game timing.
- [x] Preserve relevant Colosseum improvements: draggable NPCs, improved corner pathing, tick timeline, replay sharing, and convenient wave/current links. Colosseum-specific mobs/modifiers do not belong here.
- [x] Keep the website available locally for review.
- [x] Enter a wave number to generate a practice setup: correct lineups for waves 1–66, random unique standard spawn slots, central nibblers, and existing pillar-free Jad drills for 67–68. Repeat **Spawn wave** for a new layout, **Reset** to retry, and share exact positions with IL2 links. Support `?wave=63`; reject unsupported Zuk wave 69. Verified all 66 lineups against reference data, legal placements across 1,320 generated layouts, and browser generation/reset/reshuffle/sharing/Jad transitions. All 33 unit tests and 13 browser tests pass, including drag performance.
- [x] Provide a RuneLite sidebar inspired by Fortis Colosseum, with wave-start and current-position LoS buttons and copy links. Verified in a real RuneLite startup after fixing the EDT lifecycle issue.
- [x] Simplify the RuneLite sidebar to one large **Current LoS** button and one full-width button per saved wave, newest first. Remove copy buttons and extra sections, use a standard UI font, and keep the current-position action fixed above the scrolling wave list. Verified empty/full-run layouts and all 13 plugin tests on Windows and Linux; Windows checkout rebuilt for the next client restart.
- [x] Capture NPC coordinates on spawn, preserve wave history after leaving, and start fresh on a new run.
- [x] Capture current player/NPC positions on the client thread when requested; carry instance coordinates, NPC order and pillar state correctly into the website.
- [x] Keep the plugin independently buildable, so it can become its own repository if desired.
- [x] Split into [the website](https://github.com/ollieatkinson/inferno-los) and [the plugin](https://github.com/ollieatkinson/inferno-los-plugin), each with independent CI, tool setup and docs. Keep the IL2 contract and fixtures consistent without requiring sibling checkouts for ordinary tests.
- [x] Configure the website URL; document local use and deployment.
- [x] Verify the full Java-generated-link-to-browser path, not just each component separately.

## Hosting and submission follow-up (15 September 2026)

- [x] Document Cloudflare Pages deployment, local plugin testing, and Plugin Hub submission in `docs/RELEASE.md`; prepare a static upload ZIP.
- [ ] Authenticate Cloudflare, deploy the site and verify the production URL.
- Production domain selected: `https://los.inferno.tips/`. User purchased `inferno.tips` and added a CNAME. Initial checks returned NXDOMAIN from local, Google and Cloudflare resolvers; verify Pages **Custom domains** association, DNS and HTTPS. The user subsequently requested switching the plugin default in advance of activation.
- [x] Set the plugin's default website URL to `https://los.inferno.tips/` ahead of activation at the user's request; update setup docs and the Windows checkout. DNS/HTTPS verification remains outstanding.
- [ ] Complete a logged-in Inferno playtest of current positions and wave captures.
- [x] Publish the standalone plugin source repository.
- [ ] Submit a tested plugin commit to the Plugin Hub after hosting and live validation.
- [x] Use Cloudflare Pages as requested: Git integration, branch `trunk`, build `npm run build`, output `dist`, and `NODE_VERSION=22`. Remove the mistakenly added Workers config and instructions.

## Working preferences

- Continue autonomously; the user has granted full permissions and asked not to be interrupted with permission questions.
- The user is going to sleep; keep making progress.
- Prefer the requested simple interface over the initial three-column dashboard.
- Follow the layout in the user's Colosseum screenshot and [example position](https://los.colosim.com/?10074u.11102.08286.): big arena, compact controls, vertical tick tape immediately to its right.
- Keep this plan updated as requirements are implemented and verified.

## Current state (updated 15 September 2026)

- Website built successfully with TypeScript and Vite; served locally at http://localhost:5173/.
- Simplified arena-first layout, right-hand tick/prayer controls and vertical tape are implemented and visually inspected in both themes.
- Actual OSRS images are local, credited, and checked for successful loading in the browser.
- 29 engine/trainer/codec/cache tests pass, including complete single/triple-Jad drill timing/scoring and compact-code compatibility, state preservation and invalid input handling.
- 12 Java tests pass: capture lifecycle, immutable snapshots, URI generation, NPC/region mapping, rotated instance footprints, pillar objects, and sidebar actions.
- 12 browser tests pass: both kinds of dragging, all-monster LoS during selection and dragging, removal, storage preferences, compact share codes, Scouter codes, replay navigation, trainer timing/scoring, Jad animations and pillar removal, responsive layout, compiled Java link import, and nine-monster drag performance.
- The nine-monster drag test's two-animation-frame samples measured 33.3 ms median and 33.5 ms p95 (90 samples on this machine). This is a local measurement, not a hardware-independent frame-rate guarantee. A cache test verifies that moving the player rebuilds no NPC maps and moving one NPC rebuilds only its map.
- The plugin JAR is built at `build/libs/inferno-los-plugin-0.1.0.jar` inside the separate plugin checkout. That repository has its own Gradle wrapper, Java 17 setup, CI, README, license and attribution.
- README, link-contract documentation, attribution, CI and a manually triggered Pages workflow are present.
- Isolated RuneLite startup under Xvfb succeeded: `Plugin InfernoLosPlugin is now running` and all four event subscriptions registered. Startup/shutdown on RuneLite's EDT also has a regression test.
- Source repositories are published separately. Cloudflare deployment is being configured by the user; no hosted deployment or Plugin Hub publication has been verified. Automated plugin/browser integration is verified; an actual logged-in Inferno playtest has not been performed.
- Remaining validation and release caveats are documented rather than represented as completed game mechanics.

## Completed execution order

1. Simplify the website and integrate the actual OSRS assets and remembered preferences.
2. Finish and test stepping, prayer feedback, Scouter codes and replay consistency.
3. Build the trainer and verify its timing, scoring, pause/resume and keyboard interactions.
4. Test the standalone plugin's capture lifecycle, coordinate conversion and sidebar actions.
5. Exercise plugin snapshots in the real browser and inspect desktop/mobile rendering.
6. Add documentation, asset/source acknowledgements, CI, deployment configuration and release instructions.
7. Audit every requirement above against current source and test/runtime evidence before declaring completion.

## Sources inspected

- [Fortis Colosseum plugin](https://github.com/LlemonDuck/fortis-colosseum), also present at `~/src/github.com/LlemonDuck/fortis-colosseum`.
- [Supalosa's Colosseum LoS](https://github.com/Supalosa/osrs-colosseum).
- [Inferno Scouter](https://github.com/jeremiah855/inferno-scouter).
- [iFreedive's Inferno LoS](https://github.com/ifreedive-osrs/ifreedive-osrs.github.io) and [Backseat's tool](https://bistools.github.io/inferno.html).
- [Inferno Trainer](https://github.com/OldSchoolSDK/InfernoTrainer), including blob scan and Jad prayer-check behavior.
- [RuneLite API source](https://github.com/runelite/runelite) for current instance-coordinate APIs and Inferno NPC/object IDs.
- [OSRS Wiki](https://oldschool.runescape.wiki/) for prayer icons and Jad artwork. Game artwork belongs to Jagex.

## Accuracy and release gates

- Do not label an arbitrary mid-wave capture as a true wave start.
- Do not imply imported current positions contain known attack cooldowns.
- Do not silently present omitted/unsupported Zuk mechanics as a complete Zuk simulation.
- Scouter codes encode spawn slots, not arbitrary moved stacks. Use full position links for moved scenes.
- Trainer scores measure this simulator's prayer checks, not a live-game validation or damage/HP simulation.
- Stop playback when the tab becomes hidden so throttled browser timers do not corrupt trainer results.
- Keep meaningful tests for geometry, movement, stateful attacks, code validation, replay, trainer scoring, instance coordinates and wave-capture event ordering.

## Completion evidence

| Requirement group                                      | Evidence                                                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Simple UI, real icons, right-side feedback, two themes | `src/main.tsx`, `src/Arena.tsx`, `src/style.css`; desktop dark/light screenshots in `test-results/`; browser layout and image assertions |
| Dragging, removal, preferences, Space                  | Browser interaction tests in `tests/website.spec.ts`                                                                                     |
| Geometry, pillars, movement                            | `src/engine.test.ts`, including cardinal melee and one-tile pillar corners                                                               |
| Scouter codes and full links                           | `src/trainer.test.ts`, `src/engine.test.ts`, browser imports and Java-generated URL fixture                                              |
| Trainer, scans, delayed Jad checks, scoring, timing    | Unit fixtures plus full 60-tick browser drill; current-stack preservation browser test                                                   |
| Performance                                            | `ThreatMapCache` rebuild-count test; RAF-batched pointer handler; measured populated-scene browser test                                  |
| Plugin/sidebar integration                             | Separate plugin repository's `IntegrationTest.java`, `PanelTest.java`; committed/fresh Java fixtures opened by Playwright               |
| Local use and independently buildable plugin           | Successful Vite build, Gradle test/JAR; root and plugin READMEs                                                                          |
| Reproducible validation/release path                   | `package-lock.json`, pinned RuneLite API, `.github/workflows/verify.yml`, manual Pages workflow                                          |

The checklist covers the requested LoS/prayer-practice product. It does not assert support for combat mechanics explicitly excluded by the documented simulator scope, or claim live-game validation or publication.
