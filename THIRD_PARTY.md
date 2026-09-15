# Sources and assets

## OSRS artwork

Game artwork is © Jagex Ltd. It is used here to identify game entities in a fan-made practice tool; this project is not affiliated with Jagex. The code license does not grant rights to the game artwork.

Local files in `public/icons/`:

- `bat`, `blob`, `melee`, `ranger`, `mager`, `nibbler`, `mageBlob`, `rangeBlob`, `meleeBlob`, `healer`: corresponding PNGs in [OldSchoolSDK/InfernoTrainer, inferno/assets/images](https://github.com/OldSchoolSDK/InfernoTrainer/tree/06fc103f70f1fa228678ca79910a8d3bb0798a7d/src/content/inferno/assets/images). Its [asset notes](https://github.com/OldSchoolSDK/InfernoTrainer/blob/06fc103f70f1fa228678ca79910a8d3bb0798a7d/assets.md) identify the artwork as Jagex property. The plugin navigation icon uses the same mager PNG.
- `player`: [Supalosa/osrs-colosseum public/player.png](https://github.com/Supalosa/osrs-colosseum/blob/5b1734f06e0580bcc9cb8a0a681c93a13adaf3d3/public/player.png).
- `jad`: [OSRS Wiki JalTok-Jad image](https://oldschool.runescape.wiki/images/JalTok-Jad.png).
- `jad/jad_mage_1.png` through `jad_mage_32.png` and `jad/jad_range_1.png` through `jad_range_13.png`: original OSRS animation captures from [Inferno Trainer's Jad assets](https://github.com/OldSchoolSDK/InfernoTrainer/tree/06fc103f70f1fa228678ca79910a8d3bb0798a7d/src/content/inferno/assets/images/jad), served unmodified. Its animation module records a capture rate of 10 fps (six frames per game tick).
- `protect-magic`, `protect-range`, `protect-melee`: [Protect from Magic](https://oldschool.runescape.wiki/images/Protect_from_Magic.png), [Protect from Missiles](https://oldschool.runescape.wiki/images/Protect_from_Missiles.png), [Protect from Melee](https://oldschool.runescape.wiki/images/Protect_from_Melee.png), from the OSRS Wiki.

All images are served locally, so interacting with the arena does not depend on hotlinked assets.

## Design and behavioral references

The TypeScript and Java implementation was written for this project. These projects were inspected to establish feature behavior, coordinates and game rules:

- [Supalosa/osrs-colosseum](https://github.com/Supalosa/osrs-colosseum/tree/5b1734f06e0580bcc9cb8a0a681c93a13adaf3d3): simple arena controls, NPC dragging, replay links, movement/corner behavior, and tick timeline.
- [Backseat Inferno LoS](https://bistools.github.io/inferno.html) and [iFreedive](https://github.com/ifreedive-osrs/ifreedive-osrs.github.io): Inferno grid dimensions, pillar/spawn positions and NPC dimensions/ranges.
- [Inferno Scouter](https://github.com/jeremiah855/inferno-scouter/tree/ff025377ea34d01c30d3bace220b9b14e359cfcb): the nine-slot code, NPC rank encoding, pillar HP suffix and spawn capture lifecycle.
- [Fortis Colosseum](https://github.com/LlemonDuck/fortis-colosseum): wave/current link sidebar and history behavior.
- [Inferno Trainer](https://github.com/OldSchoolSDK/InfernoTrainer/tree/06fc103f70f1fa228678ca79910a8d3bb0798a7d): blob prayer scan cycles, queued attacks and Jad's three-tick delayed prayer check.
- [Inferno Trainer wave data](https://github.com/OldSchoolSDK/InfernoTrainer/blob/804c23f4e5cd50c1f13e93b502d6893555196769/src/content/inferno/js/InfernoWaves.ts): reference for all 66 regular-wave monster counts, the nine spawn slots, spawn ordering and central nibbler spawn area. `src/waves.ts` implements this project's practice-layout generator using these game facts.
- [OSRS Wiki Inferno strategies](https://oldschool.runescape.wiki/w/Inferno/Strategies#Triple_Jads): wave 68 uses nine-tick Jad attack cycles, staggered three ticks apart; the single Jad uses eight ticks.
- [RuneLite](https://github.com/runelite/runelite): current APIs, NPC/object identifiers and fixed-point line-of-sight coordinate conventions.

Colosseum-specific monsters and invocations have not been transplanted into Inferno.

## Build tooling

npm dependencies retain their respective upstream licenses. The dependency graph is pinned by `package-lock.json`.

The separate [plugin repository's attribution](https://github.com/ollieatkinson/inferno-los-plugin/blob/trunk/THIRD_PARTY.md) covers its Java dependencies, Gradle wrapper and sidebar icon.
