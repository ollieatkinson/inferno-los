# Verification — 14 September 2026

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
