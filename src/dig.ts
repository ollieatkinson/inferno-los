import { legal, canAttack } from "./geometry";
import {
  HEIGHT,
  WIDTH,
  type DigState,
  type Mob,
  type Scenario,
  type Tile,
} from "./model";

export const initialDig = (): DigState => ({
  timer: 50,
  count: 0,
  sinceAttack: 15,
  remaining: 0,
  recovery: 0,
});
export interface DigEvent {
  id: number;
  phase: "burrow" | "emerge";
}

// iFreedive's / Inferno Trainer's ordered corners of the player's tile.
// Burrowing ignores NPC collision, but never places a footprint in terrain.
export function digDestination(
  m: Mob,
  s: Scenario,
  player: Tile,
): Tile | undefined {
  const [x, y] = player;
  const candidates: Tile[] = [
    [x - 3, y + 3],
    [x, y],
    [x - 3, y],
    [x, y + 3],
    [x - 1, y + 1],
  ];
  const valid = ([x, y]: Tile) => legal({ ...m, x, y }, s, false);
  const preferred = candidates.find(valid);
  if (preferred) return preferred;
  // Safe fallback for custom layouts near map edges or destroyed/restored pillars.
  const nearby: Tile[] = [];
  for (let yy = 3; yy < HEIGHT; yy++)
    for (let xx = 0; xx <= WIDTH - 4; xx++)
      if (valid([xx, yy])) nearby.push([xx, yy]);
  nearby.sort(
    (a, b) =>
      Math.abs(a[0] - x) +
      Math.abs(a[1] - y) -
      Math.abs(b[0] - x) -
      Math.abs(b[1] - y),
  );
  return nearby[0];
}

/** Returns true while the meleer is underground or recovering from emergence. */
export function advanceDig(
  m: Mob,
  s: Scenario,
  player: Tile,
  events: DigEvent[],
): boolean {
  if (m.type !== "melee") return false;
  const d = (m.dig ??= initialDig());
  d.sinceAttack = Math.min(15, d.sinceAttack + 1);
  d.timer = Math.max(0, d.timer - 1);
  if (d.remaining > 0) {
    d.remaining--;
    if (d.remaining === 0) {
      const target =
        d.target && legal({ ...m, x: d.target[0], y: d.target[1] }, s, false)
          ? d.target
          : digDestination(m, s, player);
      if (target) [m.x, m.y] = target;
      delete d.target;
      d.recovery = 2;
      m.cooldown = 6;
      events.push({ id: m.id, phase: "emerge" });
    }
    return true;
  }
  if (d.recovery > 0) {
    d.recovery--;
    return true;
  }
  if (d.timer === 0) {
    d.count++;
    // Repeatable 40–60 tick checks, so preview/back/replay agree without an RNG stream.
    d.timer =
      40 +
      (((Math.imul(m.id + 1, 1103515245) + Math.imul(d.count, 12345)) >>> 0) %
        21);
    if (d.sinceAttack >= 15 && !canAttack(m, player, s.pillars)) {
      const target = digDestination(m, s, player);
      if (target) {
        d.target = [...target];
        d.remaining = 6;
        events.push({ id: m.id, phase: "burrow" });
        return true;
      }
    }
  }
  return false;
}
