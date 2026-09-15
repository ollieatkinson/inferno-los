# Inferno Stats integration

Contributing to [InfernoStats/InfernoStats](https://github.com/InfernoStats/InfernoStats) is the preferred first route for saved-wave links. It already captures waves and offers a **Wave Tool** choice between Line of Sight and Trainer. RuneLite's [contribution guide](https://github.com/runelite/plugin-hub#contribute-to-existing-plugins) also encourages extending existing plugins when the feature fits.

The contribution branch is `add-inferno-tips` in the sibling Inferno Stats checkout; commit `d725924` adds **Inferno Tips** as an optional destination. A patch is available locally at `build/inferno-stats-link.patch` (generated artifact, not committed). Submitted for maintainer review as [Inferno Stats PR #20](https://github.com/InfernoStats/InfernoStats/pull/20). The branch is published in [our fork](https://github.com/ollieatkinson/InfernoStats/tree/add-inferno-tips).

The production change is one enum entry plus wave/location query metadata and URL encoding of the spawn arrays. Existing destinations and the default remain unchanged. A JUnit test generates a real saved-wave URL and verifies the original default URL too. The website accepts Inferno Stats' existing JSON tile arrays, so the contribution needs neither our IL2 encoder nor another capture implementation.

## Verified

- Patched Inferno Stats compiled and its JUnit test passed on both Linux and Windows using Java 17 / Gradle 8.10. Its upstream Gradle 6.6.1 wrapper was not changed.
- The Java-generated fixture was opened in the local browser: wave 63, one mager, exact captured southwest tile `(1,5)`.
- Website tests cover old Inferno Stats URLs, new wave/location metadata, exact-position IL2 sharing, empty captures, invalid coordinates and unsupported Fight Caves/Jad/Zuk imports.

## Scope

Inferno Stats supplies the five regular enemy types' starting positions. Its links do not supply player position, pillar state, nibblers or NPC indices. The website clearly marks those defaults. This contribution adds saved-wave support; our standalone plugin remains useful for current-position capture and pillar state.

The next step is a live playtest and maintainer review of this optional destination. Acceptance is up to that project's maintainers. Keep the standalone plugin available until the integration is accepted and any remaining current-position requirements are addressed.

## Windows test client

The Windows checkout is `C:\Users\olive\source\InfernoStats`. The **Inferno Stats (development)** Start-menu shortcut runs the contribution using the existing native Windows Java 17 installation and Jagex login profile. Open the plugin settings and select **Wave Tool → Inferno Tips**, then click a saved Inferno wave. Normal Plugin Hub installations receive the option only after upstream acceptance and release.
