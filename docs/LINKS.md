# Link contract, version 1

Full positions and replays use a URL fragment:

```text
https://host/path/#v1=<percent-encoded UTF-8 JSON>
```

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
- NPC `x,y`: southwest footprint anchor. Size extends east and north. Type keys and sizes are defined in `src/model.ts` and `plugin/.../NpcKind.java`.
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
