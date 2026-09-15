import { emptyScenario, type NpcType, type Scenario } from "./model";

const TYPES: NpcType[] = ["bat", "blob", "melee", "ranger", "mager"];
/** Import Inferno Stats' existing tile-array links without guessing NPC spawns. */
export function decodeInfernoStats(params: URLSearchParams): Scenario | null {
  if (
    params.get("source") !== "inferno-stats" &&
    !TYPES.some((type) => params.has(type))
  )
    return null;
  if (params.has("location") && params.get("location") !== "INFERNO")
    throw new Error(
      "This link is from the Fight Caves. Only Inferno positions are supported.",
    );
  const s = emptyScenario();
  s.kind = "wave";
  if (params.has("wave")) s.wave = Number(params.get("wave"));
  if (s.wave !== undefined && s.wave >= 67)
    throw new Error(
      "Inferno Stats does not capture Jad or Zuk spawns. Use the wave picker for Jad practice.",
    );
  for (const type of TYPES) {
    if (!params.has(type)) continue;
    let tiles: unknown;
    try {
      tiles = JSON.parse(params.get(type)!);
    } catch {
      throw new Error("Invalid Inferno Stats spawn list.");
    }
    if (
      !Array.isArray(tiles) ||
      tiles.length > 64 ||
      s.mobs.length + tiles.length > 64
    )
      throw new Error("Invalid Inferno Stats spawn list.");
    for (const tile of tiles) {
      if (
        !Array.isArray(tile) ||
        tile.length !== 2 ||
        !tile.every(Number.isInteger)
      )
        throw new Error("Invalid Inferno Stats spawn tile.");
      s.mobs.push({ id: s.mobs.length + 1, type, x: tile[0], y: tile[1] });
    }
  }
  s.warnings = [
    "Inferno Stats supplies monster spawns only. Player position, standing pillars and NPC order are practice defaults; nibblers are not captured.",
  ];
  return s;
}
