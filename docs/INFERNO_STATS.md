# Inferno Stats integration

[PR #20](https://github.com/InfernoStats/InfernoStats/pull/20) adds **Inferno Tips** to the existing **Wave Tool** setting. The Line of Sight default and Trainer option remain unchanged. The contribution is on [add-inferno-tips](https://github.com/ollieatkinson/InfernoStats/tree/add-inferno-tips).

## Minimal integration

- **Wave spawns:** click the existing wave row. This uses the existing `WaveHandler` and `WaveNpc` records, augmented with player/pillars at wave start and NPC indices. There is no additional per-wave button or sidebar redesign.
- **Current LoS:** one button, shown when Inferno Tips is selected and enabled in the arena, reads current regular NPC positions, player tile and standing pillars on click.
- Both use the existing JSON coordinate-pair query format. Optional player, pillar, capture-kind and NPC-index parameters carry the extra data; no IL2 encoder is included in the plugin.
- The website accepts these queries and generates compact IL2 codes when sharing. Other destinations keep their previous links.

The contribution has two small helpers: scene-coordinate/pillar reads and shared URL construction. Wave recording remains in the upstream handler; there is no separate recorder, snapshot model or duplicate NPC type catalogue. Instance normalization handles rotated NPC footprints, and the existing wave NPC list permits safe sidebar reads while new spawns arrive. Pillars are scanned only on wave starts and explicit current-position requests.

## Scope

This deliberately follows Inferno Stats' five regular monster types. Nibblers, bloblets, Jad and Zuk are not captured; the website identifies that limitation. Fight Caves and saved waves 67–69 are unavailable for Inferno Tips. Current captures omit the wave number because the plugin may have been enabled mid-wave. Attack cooldowns and dig timers are not captured.

Older links without extra fields still work, with missing player/pillar/order data labelled as practice defaults. Empty marked captures stay empty. The standalone plugin continues to provide its richer capture and direct IL2 exports independently.

## Validation and Windows use

Six Java tests cover current movement, dead NPC exclusion, instance rotation, pillar footprints, reuse of the wave handler, frozen spawn coordinates, unchanged original URLs, existing-row config switching and Current LoS UI wiring. The website has 47 unit tests and 17 browser tests, including both Java-generated query fixtures, captured geometry, metadata validation, and conversion to compact share codes.

Use the native Windows **Inferno Stats (development)** shortcut after rebuilding/restarting, select **Wave Tool → Inferno Tips**, then use Current LoS or click a wave row. A logged-in Inferno playtest and maintainer acceptance remain outstanding. The generated local patch is `build/inferno-stats-link.patch`.
