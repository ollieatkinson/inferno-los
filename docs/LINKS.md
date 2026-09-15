# Link contract

## Wave practice links

`https://los.inferno.tips/?wave=63` generates a fresh practice layout for that wave. Whole wave numbers 1–68 are supported; 67–68 use the existing Jad drills with no pillars. Wave 69 is rejected because Zuk is not simulated. Generated scenes use `kind: custom` with their wave number, distinguishing practice setups from captured wave starts. **Share position** converts the generated layout to an IL2 link with exact positions, removing the wave query. An IL2 fragment takes precedence if a URL contains both forms.

## Compact share codes (IL2)

New website and RuneLite links use a compact URL fragment:

```text
https://host/path/#IL2-FKEBBT8CBgPyAikE_AEAANDSVrY
```

The example represents wave 63 with player `(16,5)`, west/south pillars standing, ranger ID 6 at `(22,12)` and mager ID 41 at `(20,8)`. Its code is 31 characters, compared with 346 for the equivalent legacy JSON fragment. Codes are case-sensitive. The input accepts a full link, a bare `IL2-…` code, or `#IL2-…`. **Share position** copies a link; **More → Copy share code** copies just the code. Replay links use the same format.

Each code contains its complete data; no shortening service or database is involved. It is reversible encoding, not encryption. IL2 is the first-release share format. Unreleased JSON links are not supported. Scouter codes remain a separate import/export feature.

### Binary layout

After `IL2-`, the payload is unpadded base64url (`A–Z`, `a–z`, `0–9`, `-`, `_`). Integers use unsigned LEB128 unless marked as one byte. Tiles use `y * 29 + x`. Fields appear in this order:

1. One-byte flags: bits 0–1 are kind (`wave=0`, `current=1`, `custom=2`); bit 2 means wave present, bit 3 pillar HP present, bit 4 warnings present. Other bits are reserved and zero.
2. Player tile, then one-byte standing pillar mask (west=1, north=2, south=4).
3. Optional wave, followed by optional three pillar HP integers in west/north/south order.
4. NPC count, followed by NPC records in array order: ID, one-byte type/flags, tile, then optional cooldown, pending check, attack count. The type occupies the low four bits; bits 4/5/6 indicate the three optional fields; bit 7 indicates optional meleer dig state. A pending check is `(pendingTicks - 1) * 2 + style`, with magic=0, ranged=1. When bit 7 is set, append unsigned varints for dig timer (0–60), check count, ticks since attack (capped at 15), underground ticks remaining (0–6), and stationary recovery ticks (0–2), followed by a packed destination tile only when underground ticks are nonzero. Dig state is allowed only on meleers. Existing plugin links omit bit 7 and retain the same bytes.
5. If warnings are present: count, followed by each UTF-8 byte length and its bytes.
6. Replay run count, followed by each run's value and repetition count. Value is `tile * 4 + prayer` with off=0, magic=1, ranged=2, melee=3. Repeated identical player/prayer inputs are stored as one run. Plugin snapshots write zero runs.
7. Four-byte little-endian FNV-1a checksum of all preceding bytes (offset basis `0x811c9dc5`, prime `0x01000193`, arithmetic modulo 2³²). This detects accidental corruption; it is not authentication.

Permanent NPC type IDs 0–10 are `bat`, `blob`, `melee`, `ranger`, `mager`, `nibbler`, `mageBlob`, `rangeBlob`, `meleeBlob`, `jad`, `healer`. These IDs must not be reordered. `src/shareCode.ts` implements both directions; [ShareCode.java in the plugin repository](https://github.com/ollieatkinson/inferno-los-plugin/blob/trunk/src/main/java/com/infernolos/ShareCode.java) writes current/wave snapshots. Both languages assert the example above as a fixed compatibility vector.

Decoded data is validated before it becomes a game state or replay. Limits are 64 NPCs, 64 bounded notes, 256 expanded replay ticks and 100,000 encoded characters. Unknown flags/types, truncation, checksum errors, invalid footprints and invalid attack state are rejected.

## Decoded scenario

The IL2 payload decodes into the following in-memory model. The `version: 1` field identifies this model, independently of the binary transport prefix; the JSON itself is not accepted as a share link.

A fragment is not sent to the web server. The plugin contains no character name, account identifier or world number in the payload.

```json
{
  "version": 1,
  "kind": "wave",
  "wave": 63,
  "player": [16, 5],
  "pillars": [true, false, true],
  "mobs": [{ "id": 41, "type": "mager", "x": 20, "y": 8 }]
}
```

- `kind`: `wave`, `current` or `custom`. `wave` is optional, in 1–69.
- `player`: X/Y in the 29×30 grid, X eastward and Y southward.
- `pillars`: west, north, south. Optional `pillarHp` uses that same order. Zero HP means fallen.
- NPC `x,y`: southwest footprint anchor. Size extends east and north. Type keys and sizes are defined in `src/model.ts` and [NpcKind.java](https://github.com/ollieatkinson/inferno-los-plugin/blob/trunk/src/main/java/com/infernolos/NpcKind.java).
- `id`: RuneLite NPC index, or a stable synthetic index for custom/scouted scenes. The simulation processes ascending IDs. Scouter imports preserve relative numeric indices.
- Optional `cooldown`: modeled ticks until next attack (0 means ready). The plugin deliberately omits this unknown state.
- Optional `pendingStyle` plus `pendingTicks`: queued blob or Jad prayer check, with 1–3 ticks remaining. `attackCount` preserves reproducible future style choices in website snapshots.
- Optional `warnings`: bounded plain-text notes shown visibly by the website, for example omitted Zuk mechanics.

Template coordinates are `x = regionX − 17`, `y = 46 − regionY` in region 9043. The plugin maps the corners of the actor/object footprint back through the instance template before finding its southwest anchor. Pillar footprints: west `(0,9)`, north `(17,7)`, south `(10,23)`, all 3×3.

A replay wraps its initial scenario:

```json
{
  "scenario": {
    "version": 1,
    "kind": "custom",
    "player": [16, 5],
    "pillars": [true, true, true],
    "mobs": []
  },
  "steps": [
    { "player": [16, 4], "prayer": "mage" },
    { "player": [16, 4], "prayer": null }
  ]
}
```

Each entry supplies the player's tile and prayer at that tick's simulation update. Maximum 256 steps, 64 monsters, and a 100 KB encoded fragment. Bad versions, coordinates, footprints and state are rejected visibly. Loading a new hash in the same tab replaces the scene.

## Inferno Scouter

Import a bare code, a bracketed code, `?scout=<code>`, or `#[<code>]`:

```text
[M1Rooooooo009999]
```

There are nine slots in north-to-south reading order. `o` is empty; `Y` bat, `B` blob, `X` melee, `R` ranger, `M` mager. Optional digits after monster letters are NPC-index ranks: rank 1 has the highest NPC index, and the lowest rank is omitted. A final six-digit suffix gives north/south/west pillar HP as two digits each. The example has a mager at slot 1, ranger at slot 2, a fallen north pillar, and full south/west pillars.

The nine anchors are `(1,5), (22,5), (3,11), (23,12), (16,17), (5,23), (23,25), (1,28), (15,28)`. Legacy nine-character codes without ranks or HP also work. They have no known NPC order, so reading order is used. Export fails explicitly if the current scene cannot be represented, rather than silently dropping moved NPCs or unsupported types. Full position links are the canonical format for the new plugin because they also represent current locations, player position and non-spawn NPCs.

## Inferno Stats import

The Inferno Stats contribution uses its existing query format for both current positions and saved waves. The standalone Inferno LoS plugin continues to export IL2 directly. Opening an Inferno Stats query and sharing it from this website produces IL2.

Regular NPC parameters `bat`, `blob`, `melee`, `ranger`, and `mager` contain JSON arrays of southwest tile pairs, e.g. `mager=[[1,5]]&copyable`. Coordinates use the same 29×30 grid as this site. Values should be URL-escaped when generating links.

Optional metadata:

| Parameter                                      | Meaning                                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `source=inferno-stats`                         | Identifies the format, including an empty capture.                                                                                       |
| `location=INFERNO`                             | Rejects accidental Fight Caves imports when another location is supplied.                                                                |
| `kind=wave` or `kind=current`                  | Capture type; absent means a saved wave.                                                                                                 |
| `wave=63`                                      | Recorded wave number. Omitted from current captures.                                                                                     |
| `player=[16,5]`                                | Player tile at the capture time.                                                                                                         |
| `pillars=[true,false,true]`                    | Standing west, north and south pillars.                                                                                                  |
| `magerIds=[42]` (and equivalent for each type) | NPC indices matching that type's coordinate pairs. If any indices are supplied, all supplied NPC groups must have matching index arrays. |

Missing player, pillars or NPC ordering are identified as practice defaults. The integration supplies only the five regular enemy types; the website explicitly notes omitted nibblers, bloblets, Jad and Zuk. Saved waves 67–69, Fight Caves, invalid metadata, mismatched or duplicate NPC indices, and invalid geometry are rejected. An IL2 fragment takes precedence over query parameters. Empty marked captures remain empty instead of generating a random wave.
