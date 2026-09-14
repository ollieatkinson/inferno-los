import {
  HEIGHT,
  WIDTH,
  NPCS,
  type Scenario,
  type Replay,
  type Tile,
} from "./model";
import { blocked, legal } from "./geometry";
import { decodeScout } from "./scout";
const integer = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
function tile(v: unknown): v is Tile {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    integer(v[0], 0, WIDTH - 1) &&
    integer(v[1], 0, HEIGHT - 1)
  );
}
export function validateScenario(v: unknown): Scenario {
  if (!v || typeof v !== "object") throw new Error("Missing scenario.");
  const s = v as Scenario;
  if (s.version !== 1)
    throw new Error("This link uses an unsupported version.");
  if (
    !["wave", "current", "custom"].includes(s.kind) ||
    !tile(s.player) ||
    !Array.isArray(s.pillars) ||
    s.pillars.length !== 3 ||
    s.pillars.some((p) => typeof p !== "boolean") ||
    !Array.isArray(s.mobs) ||
    s.mobs.length > 64 ||
    (s.wave !== undefined && !integer(s.wave, 1, 69))
  )
    throw new Error("Invalid scenario data.");
  const ids = new Set<number>();
  if (
    s.warnings !== undefined &&
    (!Array.isArray(s.warnings) ||
      s.warnings.length > 64 ||
      s.warnings.some((w) => typeof w !== "string" || w.length > 300))
  )
    throw new Error("Invalid snapshot notes.");
  if (
    s.pillarHp !== undefined &&
    (!Array.isArray(s.pillarHp) ||
      s.pillarHp.length !== 3 ||
      s.pillarHp.some(
        (hp, i) => !integer(hp, 0, 99) || hp > 0 !== s.pillars[i],
      ))
  )
    throw new Error("Invalid pillar HP.");
  for (const mob of s.mobs) {
    if (
      !mob ||
      !Object.hasOwn(NPCS, mob.type) ||
      !integer(mob.id, 0, 65535) ||
      ids.has(mob.id) ||
      !tile([mob.x, mob.y]) ||
      (mob.cooldown !== undefined && !integer(mob.cooldown, 0, 100))
    )
      throw new Error("Invalid NPC in link.");
    ids.add(mob.id);
    if (
      (mob.pendingStyle !== undefined &&
        (!["mage", "range"].includes(mob.pendingStyle) ||
          !["blob", "jad"].includes(mob.type))) ||
      (mob.pendingTicks !== undefined && !integer(mob.pendingTicks, 1, 3)) ||
      (mob.pendingStyle === undefined) !== (mob.pendingTicks === undefined) ||
      (mob.attackCount !== undefined && !integer(mob.attackCount, 0, 100000))
    )
      throw new Error("Invalid attack state.");
    if (!legal(mob, s, false))
      throw new Error("An NPC is outside the arena or inside a pillar.");
  }
  if (blocked(s.player, s.pillars))
    throw new Error("The player is outside the arena or inside a pillar.");
  return structuredClone(s);
}
export function encodeLink(s: Scenario, base: string, steps?: Replay["steps"]) {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  url.hash =
    "v1=" +
    encodeURIComponent(JSON.stringify(steps ? { scenario: s, steps } : s));
  return url.toString();
}
export function decodeLink(input: string): Replay | null {
  if (!/^https?:\/\//i.test(input.trim()))
    return { scenario: validateScenario(decodeScout(input)), steps: [] };
  const url = new URL(input);
  const scout =
    url.searchParams.get("scout") ??
    (url.hash.startsWith("#[") ? decodeURIComponent(url.hash.slice(1)) : null);
  if (scout)
    return { scenario: validateScenario(decodeScout(scout)), steps: [] };
  if (!url.hash && !url.search) return null;
  if (!url.hash.startsWith("#v1="))
    throw new Error("Unrecognised link. Use an Inferno LoS v1 link.");
  if (url.hash.length > 100000) throw new Error("This link is too large.");
  let data;
  try {
    data = JSON.parse(decodeURIComponent(url.hash.slice(4)));
  } catch {
    throw new Error("The link is incomplete or malformed.");
  }
  const scenario = validateScenario(data.scenario ?? data);
  const steps = data.steps ?? [];
  if (
    !Array.isArray(steps) ||
    steps.length > 256 ||
    steps.some(
      (s) =>
        !s ||
        !tile(s.player) ||
        blocked(s.player, scenario.pillars) ||
        ![null, "melee", "range", "mage"].includes(s.prayer),
    )
  )
    throw new Error("Invalid replay steps.");
  return { scenario, steps };
}
