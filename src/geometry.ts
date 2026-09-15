import {
  HEIGHT,
  WIDTH,
  NPCS,
  PILLARS,
  type Mob,
  type Scenario,
  type Tile,
} from "./model";

export function contains(x: number, y: number, size: number, tile: Tile) {
  return (
    tile[0] >= x && tile[0] < x + size && tile[1] <= y && tile[1] > y - size
  );
}
export function overlaps(
  a: { x: number; y: number },
  sa: number,
  b: { x: number; y: number },
  sb: number,
) {
  return a.x < b.x + sb && b.x < a.x + sa && a.y > b.y - sb && b.y > a.y - sa;
}
export function blocked(tile: Tile, pillars: Scenario["pillars"]) {
  const [x, y] = tile;
  return (
    x < 0 ||
    x >= WIDTH ||
    y < 0 ||
    y >= HEIGHT ||
    PILLARS.some((p, i) => pillars[i] && contains(p.x, p.y, 3, tile))
  );
}
export function legal(mob: Mob, s: Scenario, checkMobs = true) {
  const size = NPCS[mob.type].size;
  for (let x = mob.x; x < mob.x + size; x++)
    for (let y = mob.y; y > mob.y - size; y--) {
      if (blocked([x, y], s.pillars)) return false;
    }
  return (
    !checkMobs ||
    !s.mobs.some(
      (other) =>
        other.id !== mob.id &&
        !other.dig?.remaining &&
        other.type !== "nibbler" &&
        mob.type !== "nibbler" &&
        overlaps(mob, size, other, NPCS[other.type].size),
    )
  );
}
// RuneScape traces tile centres along the dominant axis using 16-bit fixed point.
// Both tiles at a row/column crossing are checked, including the negative rounding bias.
export function ray(from: Tile, to: Tile, pillars: Scenario["pillars"]) {
  if (blocked(from, pillars) || blocked(to, pillars)) return false;
  const dx = to[0] - from[0],
    dy = to[1] - from[1];
  if (!dx && !dy) return true;
  const major = Math.abs(dx) > Math.abs(dy) ? 0 : 1;
  const minor = 1 - major;
  const delta = to[major] - from[major],
    cross = to[minor] - from[minor];
  let tile = from[major],
    fixed = from[minor] * 65536 + 32768 - (cross < 0 ? 1 : 0);
  const slope = Math.trunc((cross * 65536) / Math.abs(delta));
  const point = (a: number, b: number): Tile => (major === 0 ? [a, b] : [b, a]);
  while (tile !== to[major]) {
    tile += Math.sign(delta);
    if (blocked(point(tile, Math.floor(fixed / 65536)), pillars)) return false;
    fixed += slope;
    if (blocked(point(tile, Math.floor(fixed / 65536)), pillars)) return false;
  }
  return true;
}
export function canAttack(
  mob: Mob,
  player: Tile,
  pillars: Scenario["pillars"],
) {
  const { size, range } = NPCS[mob.type];
  if (
    mob.type === "nibbler" ||
    !!mob.dig?.remaining ||
    contains(mob.x, mob.y, size, player) ||
    blocked(player, pillars)
  )
    return false;
  const closest: Tile = [
    Math.max(mob.x, Math.min(mob.x + size - 1, player[0])),
    Math.max(mob.y - size + 1, Math.min(mob.y, player[1])),
  ];
  const dx = Math.abs(closest[0] - player[0]),
    dy = Math.abs(closest[1] - player[1]);
  if (range === 1 || (mob.type === "jad" && dx + dy === 1))
    return dx + dy === 1;
  return Math.max(dx, dy) <= range && ray(player, closest, pillars);
}
export function styles(mob: Mob, player: Tile): string[] {
  const { style, size } = NPCS[mob.type];
  const dx = Math.max(mob.x - player[0], 0, player[0] - (mob.x + size - 1));
  const dy = Math.max(mob.y - size + 1 - player[1], 0, player[1] - mob.y);
  if (style === "blob")
    return dx + dy === 1 ? ["melee", "range", "mage"] : ["range", "mage"];
  if (style === "jad")
    return dx + dy === 1 ? ["melee", "range", "mage"] : ["range", "mage"];
  // Ranger and mager can melee when adjacent, so position alone cannot choose a prayer.
  if ((mob.type === "mager" || mob.type === "ranger") && dx + dy === 1)
    return ["melee", style];
  return style === "pillar" ? [] : [style];
}
