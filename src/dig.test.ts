import { describe, expect, it } from "vitest";
import { digDestination, initialDig } from "./dig";
import { emptyScenario, type Mob } from "./model";
import { canAttack, legal } from "./geometry";
import { Simulation } from "./simulation";
import { decodeLink, encodeLink, validateScenario } from "./links";
import { ThreatMapCache } from "./threatMap";

function trapped() {
  const s = emptyScenario();
  s.mobs = [{ id: 1, type: "melee", x: 20, y: 7 }];
  return s;
}

describe("meleer's dig", () => {
  it("lets multiple meleers emerge on the same tile and resume attacking", () => {
    const s = trapped();
    s.mobs.push({ id: 2, type: "melee", x: 3, y: 11 });
    for (const mob of s.mobs) mob.dig = { ...initialDig(), timer: 1 };
    const sim = new Simulation(s);
    for (let i = 0; i < 13; i++) sim.step(s.player, "melee");
    expect(sim.frames[6].digs).toHaveLength(2);
    expect(sim.frames[12].attacks).toHaveLength(2);
  });
  it("checks at tick 50, burrows for six ticks and attacks six ticks after emergence", () => {
    const s = trapped(),
      sim = new Simulation(s);
    for (let tick = 1; tick <= 62; tick++) sim.step(s.player, "melee");
    expect(
      sim.frames.flatMap((f, i) => f.digs.map((d) => [i + 1, d.phase])),
    ).toEqual([
      [50, "burrow"],
      [56, "emerge"],
    ]);
    expect(
      sim.frames.flatMap((f, i) => (f.attacks.length ? [i + 1] : [])),
    ).toEqual([62]);
    expect(sim.frames[49].scenario.mobs[0].dig).toMatchObject({
      remaining: 6,
      target: [13, 8],
    });
    expect(sim.frames[55].scenario.mobs[0]).toMatchObject({
      x: 13,
      y: 8,
      cooldown: 6,
    });
    expect(sim.frames[56].scenario.mobs[0]).toMatchObject({ x: 13, y: 8 });
    expect(sim.frames[57].scenario.mobs[0]).toMatchObject({ x: 13, y: 8 });
    expect(s.mobs[0].dig).toBeUndefined();
  });

  it("does not dig in attack range or within 15 ticks of an attack", () => {
    const s = trapped();
    s.mobs[0].dig = { ...initialDig(), timer: 1, sinceAttack: 0 };
    const sim = new Simulation(s);
    expect(sim.step(s.player, null).digs).toEqual([]);
    s.mobs[0] = {
      id: 1,
      type: "melee",
      x: 12,
      y: 8,
      dig: { ...initialDig(), timer: 1 },
    };
    const attacking = new Simulation(s).step(s.player, "melee");
    expect(attacking.digs).toEqual([]);
    expect(attacking.attacks).toHaveLength(1);
    expect(attacking.scenario.mobs[0].dig?.sinceAttack).toBe(0);
  });

  it("locks the destination at dig start even if the player moves", () => {
    const s = trapped();
    s.mobs[0].dig = { ...initialDig(), timer: 1 };
    const sim = new Simulation(s);
    sim.step(s.player, null);
    for (let i = 0; i < 6; i++) sim.step([5, 20], null);
    expect(sim.scenario.mobs[0]).toMatchObject({ x: 13, y: 8, cooldown: 6 });
    expect(sim.frames.at(-1)?.attacks).toEqual([]);
  });

  it("chooses legal destinations at pillars and map edges, ignoring other NPCs", () => {
    const s = trapped(),
      m = s.mobs[0];
    for (const player of [
      [0, 0],
      [28, 29],
      [16, 5],
      [20, 5],
      [13, 21],
    ] as [number, number][]) {
      const target = digDestination(m, s, player)!;
      expect(legal({ ...m, x: target[0], y: target[1] }, s, false)).toBe(true);
    }
    s.mobs.push({ id: 2, type: "mager", x: 13, y: 8 });
    expect(digDestination(m, s, s.player)).toEqual([13, 8]);
  });

  it("keeps dig state and future ticks identical through share, preview, rewind and replay", () => {
    const s = trapped(),
      sim = new Simulation(s);
    for (let i = 0; i < 52; i++) sim.step(s.player, null);
    const snapshot = structuredClone(sim.scenario);
    const shared = decodeLink(
      encodeLink(snapshot, "https://los.inferno.tips/"),
    )!;
    expect(shared.scenario).toEqual(snapshot);
    const resumed = new Simulation(shared.scenario);
    for (let i = 0; i < 15; i++) {
      const preview = sim.preview(s.player, "melee");
      expect(sim.step(s.player, "melee")).toEqual(preview);
      expect(resumed.step(s.player, "melee")).toEqual(preview);
    }
    const replay = decodeLink(
      encodeLink(sim.initial, "https://los.inferno.tips/", sim.steps),
    )!;
    const restored = new Simulation(replay.scenario);
    for (const step of replay.steps) restored.step(step.player, step.prayer);
    expect(restored.frames).toEqual(sim.frames);
    sim.rewind(49);
    expect(sim.step(s.player, null)).toEqual(restored.frames[49]);
  });

  it("keeps later checks in the 40–60 tick window", () => {
    const s = trapped(),
      sim = new Simulation(s);
    const checks: number[] = [];
    for (let i = 1; i <= 256; i++) {
      const before = sim.scenario.mobs[0].dig?.count ?? 0;
      sim.step(s.player, null);
      if (sim.scenario.mobs[0].dig!.count !== before) checks.push(i);
    }
    expect(checks[0]).toBe(50);
    for (let i = 1; i < checks.length; i++) {
      expect(checks[i] - checks[i - 1]).toBeGreaterThanOrEqual(40);
      expect(checks[i] - checks[i - 1]).toBeLessThanOrEqual(60);
    }
  });

  it("removes underground threats and collision without rebuilding maps each countdown tick", () => {
    const s = trapped(),
      cache = new ThreatMapCache(),
      m = s.mobs[0];
    const normal = cache.get(m, s.pillars);
    m.dig = { ...initialDig(), remaining: 6, target: [13, 8] };
    expect(canAttack(m, [24, 7], s.pillars)).toBe(false);
    expect(cache.get(m, s.pillars).some(Boolean)).toBe(false);
    m.dig.remaining = 5;
    cache.get(m, s.pillars);
    expect(cache.builds).toBe(2);
    expect(legal({ id: 2, type: "mager", x: 20, y: 7 }, s)).toBe(true);
    delete m.dig;
    expect(cache.get(m, s.pillars)).toBe(normal);
  });

  it("rejects invalid dig timers, destinations, phases and non-meleer dig state", () => {
    for (const dig of [
      { ...initialDig(), timer: -1 },
      { ...initialDig(), timer: 61 },
      { ...initialDig(), remaining: 1 },
      { ...initialDig(), target: [13, 8] },
      { ...initialDig(), remaining: 1, target: [17, 5] },
      { ...initialDig(), remaining: 1, recovery: 1, target: [13, 8] },
    ]) {
      const s = trapped();
      s.mobs[0].dig = dig as Mob["dig"];
      expect(() => validateScenario(s)).toThrow("dig state");
    }
    const s = trapped();
    s.mobs[0].type = "mager";
    s.mobs[0].dig = initialDig();
    expect(() => validateScenario(s)).toThrow("dig state");
  });
});
