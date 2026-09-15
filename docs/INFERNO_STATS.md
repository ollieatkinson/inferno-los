# Inferno Stats integration

[Inferno Stats PR #20](https://github.com/InfernoStats/InfernoStats/pull/20) adds **Inferno Tips** to the existing **Wave Tool** configuration and provides current-position and wave-start links. The contribution is on [our fork's add-inferno-tips branch](https://github.com/ollieatkinson/InfernoStats/tree/add-inferno-tips), with the implementation from `d6cd017` restored at `0dfbd13`. The local patch is `build/inferno-stats-link.patch` (generated, not committed).

## Behaviour

Select **Wave Tool → Inferno Tips**. The existing wave-row link and explicit **Spawn LoS** button then open this website using compact `#IL2-…` codes. **Current LoS** appears above the scrolling wave list and captures current positions when clicked. Changing the configuration updates already-rendered wave links. The existing Line of Sight default and Trainer destination keep their original URL format; this does not silently replace their default site.

- **Current LoS:** player tile, living supported NPC positions and indices, standing pillars, and wave number if observed. Available inside the Inferno, including when enabled mid-wave.
- **Spawn LoS:** player/pillars at wave start and NPC coordinates from the initial spawn events. Frozen captures survive movement and leaving the arena. Missing captures are disabled; no random wave or guessed positions are exported.
- Captures include nibblers, bloblets, Jad and Jad healers. Fight Caves is unsupported. Zuk, his shield and Zuk healers are unsupported, and links for supported Zuk-wave adds carry a warning.
- Attack cooldowns and dig timers are not captured. Links describe geometry, not a fully synchronized combat replay.

Scene access stays on the client thread. Pillars are scanned only on wave starts and explicit current-position requests. Captures are immutable before publication to Swing. Wave-start capture handles chat/NPC event ordering and excludes later resurrections. The reused capture/IL2 code retains its MIT notice; there is no additional runtime dependency.

## Verified

- All 13 Java tests and JAR build pass on Linux and native Windows using Java 17 / Gradle 8.10. The upstream Gradle 6.6.1 wrapper remains unchanged.
- Tests cover capture event ordering, movement, leaving and re-entry, missing starts, NPC indices, rotated instance footprints, pillar objects, codec fixture parity, and config switching on existing wave rows.
- Sidebar test checks a fixed Current LoS action above 66 scrolling waves, availability, and action wiring. The new LoS buttons use a standard sans-serif font.
- Both Java-generated IL2 fixtures opened on the hosted website with exact NPC/player coordinates, standing pillar state, and distinct Wave start / Current positions labels. Screenshots are in local `test-results/inferno-stats-{spawn,current}-compact.png`.
- Older Inferno Stats query-array links remain an import convenience. The contribution no longer generates them for Inferno Tips.

A live Inferno playtest is still outstanding. Maintainer acceptance and Plugin Hub availability are not yet confirmed. The standalone plugin is the primary LoS development path. Keep this full contribution open while the user asks the maintainer whether it fits Inferno Stats; do not reduce or close it without further direction.

## Windows test client

The updated checkout is `C:\Users\olive\source\InfernoStats`. Restart using the **Inferno Stats (development)** Start-menu shortcut, which uses native Windows Java 17 and the existing Jagex login profile. Select **Wave Tool → Inferno Tips** and enter the Inferno. Current LoS works immediately; Spawn LoS becomes available after an observed wave start. Already-running clients must restart to load the new code. Normal Plugin Hub installations receive these changes only after upstream acceptance and release.
