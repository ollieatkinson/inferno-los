import { emptyScenario, type NpcType, type Scenario, type Tile } from "./model";

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
  const kind = params.get("kind") ?? "wave";
  if (kind !== "wave" && kind !== "current")
    throw new Error("Invalid Inferno Stats capture type.");
  s.kind = kind;
  if (params.has("wave")) s.wave = Number(params.get("wave"));
  if (s.wave !== undefined && s.wave >= 67)
    throw new Error(
      "Inferno Stats does not capture Jad or Zuk spawns. Use the wave picker for Jad practice.",
    );
  const parse = (key: string): unknown => {
    try {
      return JSON.parse(params.get(key)!);
    } catch {
      throw new Error(`Invalid Inferno Stats ${key}.`);
    }
  };
  const isTile = (value: unknown): value is Tile =>
    Array.isArray(value) && value.length === 2 && value.every(Number.isInteger);
  if (params.has("player")) {
    const player = parse("player");
    if (!isTile(player)) throw new Error("Invalid Inferno Stats player tile.");
    s.player = player;
  }
  if (params.has("pillars")) {
    const pillars = parse("pillars");
    if (
      !Array.isArray(pillars) ||
      pillars.length !== 3 ||
      pillars.some((p) => typeof p !== "boolean")
    )
      throw new Error("Invalid Inferno Stats pillars.");
    s.pillars = pillars as Scenario["pillars"];
  }
  const indexed = TYPES.some((type) => params.has(type + "Ids"));
  for (const type of TYPES) {
    if (params.has(type + "Ids") && !params.has(type))
      throw new Error("Inferno Stats NPC indices have no matching positions.");
    if (!params.has(type)) continue;
    const tiles = parse(type);
    if (
      !Array.isArray(tiles) ||
      tiles.length > 64 ||
      s.mobs.length + tiles.length > 64
    )
      throw new Error("Invalid Inferno Stats spawn list.");
    const ids = indexed ? parse(type + "Ids") : null;
    if (
      indexed &&
      (!Array.isArray(ids) ||
        ids.length !== tiles.length ||
        ids.some((id) => !Number.isInteger(id)))
    )
      throw new Error("Invalid Inferno Stats NPC indices.");
    for (const [index, tile] of tiles.entries()) {
      if (!isTile(tile)) throw new Error("Invalid Inferno Stats spawn tile.");
      s.mobs.push({
        id: Array.isArray(ids) ? ids[index] : s.mobs.length + 1,
        type,
        x: tile[0],
        y: tile[1],
      });
    }
  }
  const defaults = [
    !params.has("player") && "player position",
    !params.has("pillars") && "standing pillars",
    !indexed && s.mobs.length > 0 && "NPC order",
  ].filter(Boolean);
  s.warnings = defaults.length
    ? [`Inferno Stats: ${defaults.join(", ")} are practice defaults.`]
    : [];
  s.warnings.push(
    "Inferno Stats includes only bats, blobs, meleers, rangers and magers. Nibblers, bloblets, Jad and Zuk are not captured.",
  );
  return s;
}
