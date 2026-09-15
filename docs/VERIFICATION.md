# Verification — 14 September 2026

## Follow-up — 15 September 2026

Compact sharing follow-up: 29 unit tests, 12 browser tests, 12 Java tests and both builds pass. The website and plugin generate identical IL2 bytes for the fixed two-NPC fixture (31 characters versus 346 for its legacy fragment). Tests cover all NPC types, high IDs, HP, Unicode notes, pending attacks, 256-tick replay runs, corruption, semantic validation, bare-code copy/paste, legacy imports, and opening the compiled Java link in Chromium. Encoding happens only when sharing; drag handling and LoS caching are unchanged.

Jad follow-up: 24 unit tests and 11 browser tests pass, plus the production build. Single Jad retains an eight-tick cycle; Triple Jad uses three staggered nine-tick cycles, with 18 fully protectable hits in a 60-tick drill. Both drills remove pillars. Browser checks cover real frame changes, pause, manual steps, reset, both styles, returning to another drill, and successful decoding of all 45 animation PNGs. The dev server needed a restart to discover the new public asset directory; checking `href` alone did not detect its HTML fallback. Nine-monster dragging still measures 33.3 ms median / 33.5 ms p95 across two frames. Java 17 is now installed persistently through mise and Gradle resolves it without a temporary `JAVA_HOME`.

Removed selection-based LoS filtering so all monsters' coverage stays visible during and after dragging. A browser regression test covers selection, movement, release, and newly overlapping coverage. The website checks were rerun: 23 unit tests, 10 browser tests, and the production build pass. With all nine monsters' LoS visible, the same 90-sample drag measurement returned 33.3 ms median / 33.5 ms p95 across two animation frames. Per-monster caching and animation-frame batching remain in place.

## Automated checks

- `npm test`: **23 passing tests** for arena geometry, movement, link/Scouter codecs, queued attacks, trainer scoring and cache invalidation.
- `npm run build`: TypeScript and Vite production build succeed.
- `plugin/gradlew -p plugin test jar`: **12 passing tests** for wave event ordering, immutable snapshots, current capture, instance rotations, pillar footprints, link generation, sidebar actions and EDT startup/shutdown. Plugin JAR created successfully.
- `npm run test:browser`: **9 passing tests** covering the main user interactions, score/timer behavior, Java-generated links, layout, tab visibility, timeline scrolling, and populated-scene performance.
- `npm audit`: zero reported vulnerabilities after updating the test tooling.

Desktop screenshots in dark and light themes were inspected. Browser tests also assert no horizontal overflow at 390 px width.

## Dragging measurement

With nine monsters and LoS shading enabled, 90 samples spanning two animation frames had **33.3 ms median / 33.5 ms p95**, on this machine's headless Chromium. This includes the wait for two frames; it is not a claim that rendering work alone takes 33 ms. The bounded cache test independently proves that player movement does not rebuild NPC LoS maps and moving one monster rebuilds only that monster's map.

## Real RuneLite startup

The client was launched on an isolated Xvfb display with a separate Java home-directory property, so the smoke check used its own RuneLite configuration and no player account. The first run found an EDT lifecycle bug; it was fixed, given a regression test, and the startup check was repeated.

Relevant output from the successful run:

```text
[main] DEBUG PluginManager - Loaded plugin InfernoLosPlugin
[AWT-EventQueue-0] DEBUG PluginManager - Plugin InfernoLosPlugin is now running
[AWT-EventQueue-0] DEBUG EventBus - Registering ... InfernoLosPlugin.onChatMessage
[AWT-EventQueue-0] DEBUG EventBus - Registering ... InfernoLosPlugin.onNpcSpawned
[AWT-EventQueue-0] DEBUG EventBus - Registering ... InfernoLosPlugin.onGameTick
[AWT-EventQueue-0] DEBUG EventBus - Registering ... InfernoLosPlugin.onGameStateChanged
[main] INFO RuneLite - Client initialization took 3196ms.
```

The smoke client was stopped by its 30-second timeout. A logged-in Inferno run has not been performed. No website deployment or Plugin Hub publication is implied by these checks.

For a separate local smoke configuration:

```sh
cd plugin
./gradlew run -PruneliteHome=/tmp/inferno-smoke-home --args='--developer-mode --debug --disable-telemetry --noupdate'
```

The normal website remains available through `npm run dev` at http://localhost:5173/.
