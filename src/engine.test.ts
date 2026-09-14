import { describe, expect, it } from "vitest";
import {
  emptyScenario,
  exampleScenario,
  type Mob,
  type Scenario,
} from "./model";
import { blocked, canAttack, legal, ray, styles } from "./geometry";
import { decodeLink, encodeLink, validateScenario } from "./links";
import { Simulation } from "./simulation";

describe("Inferno geometry", () => {
  it("matches north, south and west pillar footprints", () => {
    const p = emptyScenario().pillars;
    for (const t of [
      [0, 7],
      [2, 9],
      [17, 5],
      [19, 7],
      [10, 21],
      [12, 23],
    ] as [number, number][])
      expect(blocked(t, p)).toBe(true);
    expect(blocked([16, 5], p)).toBe(false);
    expect(blocked([20, 5], p)).toBe(false);
    expect(blocked([17, 5], [true, false, true])).toBe(false);
    expect(blocked([29, 0], p)).toBe(true);
    expect(blocked([0, 30], p)).toBe(true);
  });
  it("blocks ranged attacks through the north pillar and restores LoS when fallen", () => {
    const m: Mob = { id: 1, type: "ranger", x: 20, y: 7 };
    expect(canAttack(m, [16, 5], [true, true, true])).toBe(false);
    expect(canAttack(m, [16, 5], [true, false, true])).toBe(true);
    expect(canAttack(m, [16, 4], [true, true, true])).toBe(false);
  });
  it("melee requires cardinal adjacency, not a diagonal or overlapping footprint", () => {
    const m: Mob = { id: 1, type: "melee", x: 5, y: 8 };
    const p: Scenario["pillars"] = [false, false, false];
    expect(canAttack(m, [4, 5], p)).toBe(true);
    expect(canAttack(m, [4, 4], p)).toBe(false);
    expect(canAttack(m, [5, 5], p)).toBe(false);
    expect(canAttack(m, [9, 7], p)).toBe(true);
  });
  it("uses closest footprint tile, limited bat range, and both crossing tiles", () => {
    const m: Mob = { id: 1, type: "bat", x: 5, y: 5 };
    const p: Scenario["pillars"] = [true, true, true];
    expect(canAttack(m, [10, 5], p)).toBe(true);
    expect(canAttack(m, [11, 5], p)).toBe(false);
    expect(ray([16, 4], [17, 5], p)).toBe(false);
    expect(ray([16, 4], [20, 4], p)).toBe(true);
  });
  it("rejects footprints crossing any arena boundary", () => {
    const s = emptyScenario();
    for (const [x, y] of [
      [-1, 5],
      [27, 5],
      [5, 1],
      [5, 30],
    ])
      expect(legal({ id: 1, type: "melee", x, y }, s)).toBe(false);
  });
  it("does not give a single prayer for blobs, Jad or adjacent mager", () => {
    expect(styles({ id: 1, type: "blob", x: 5, y: 5 }, [10, 10])).toEqual([
      "range",
      "mage",
    ]);
    expect(styles({ id: 2, type: "jad", x: 5, y: 5 }, [4, 5])).toContain(
      "melee",
    );
    expect(styles({ id: 3, type: "mager", x: 5, y: 5 }, [4, 5])).toEqual([
      "melee",
      "mage",
    ]);
  });
});
describe("shared links", () => {
  it("round trips current snapshots including NPC indices, cooldowns, wave and fallen pillars", () => {
    const s: Scenario = {
      version: 1,
      kind: "current",
      wave: 63,
      player: [16, 5],
      pillars: [true, false, true],
      mobs: [{ id: 401, type: "mager", x: 20, y: 8, cooldown: 3 }],
    };
    expect(decodeLink(encodeLink(s, "https://example.org/inferno/"))).toEqual({
      scenario: s,
      steps: [],
    });
  });
  it("round trips replay with stationary ticks and prayer choices", () => {
    const s = exampleScenario(),
      steps = [
        { player: [16, 4] as [number, number], prayer: null },
        { player: [16, 4] as [number, number], prayer: "mage" as const },
      ];
    const url = encodeLink(s, "https://example.org/inferno/?old#old", steps);
    expect(new URL(url).pathname).toBe("/inferno/");
    expect(new URL(url).search).toBe("");
    expect(decodeLink(url)).toEqual({ scenario: s, steps });
  });
  it("rejects malformed, out of bounds, unknown-type, duplicate-id and oversized links", () => {
    expect(() => decodeLink("https://example.org/#v1=%7B")).toThrow(
      "malformed",
    );
    const s = exampleScenario();
    expect(() => validateScenario({ ...s, version: 2 })).toThrow("version");
    expect(() => validateScenario({ ...s, player: [29, 0] })).toThrow();
    expect(() =>
      validateScenario({
        ...s,
        mobs: [{ id: 1, type: "constructor", x: 5, y: 5 }],
      }),
    ).toThrow();
    expect(() =>
      validateScenario({ ...s, mobs: [s.mobs[0], s.mobs[0]] }),
    ).toThrow();
    expect(() => validateScenario({ ...s, player: [17, 5] })).toThrow("pillar");
    expect(() =>
      decodeLink("https://example.org/#v1=" + "a".repeat(100001)),
    ).toThrow("large");
  });
});
describe("movement and replay", () => {
  it("keeps a blocked stack still, then moves once the player exposes a path", () => {
    const s = exampleScenario();
    s.mobs = [{ id: 1, type: "ranger", x: 20, y: 5 }];
    const sim = new Simulation(s);
    sim.step([16, 5], null);
    expect(sim.scenario.mobs[0]).toMatchObject({ x: 20, y: 5 });
    sim.step([16, 10], null);
    sim.step([16, 10], null);
    sim.step([16, 10], null);
    expect(sim.scenario.mobs[0]).toMatchObject({ x: 20, y: 7 });
    expect(canAttack(sim.scenario.mobs[0], [16, 10], s.pillars)).toBe(true);
  });
  it("one-tile creatures cannot cut a pillar corner", () => {
    const s = emptyScenario();
    s.mobs = [{ id: 1, type: "meleeBlob", x: 17, y: 4 }];
    const sim = new Simulation(s);
    sim.step([16, 10], null);
    expect(sim.scenario.mobs[0]).toMatchObject({ x: 16, y: 4 });
    sim.step([16, 10], null);
    expect(sim.scenario.mobs[0]).toMatchObject({ x: 16, y: 5 });
  });
  it("preserves tick cadence and replays deterministically after sharing", () => {
    const s = emptyScenario();
    s.mobs = [{ id: 1, type: "ranger", x: 5, y: 5 }];
    const sim = new Simulation(s);
    for (let i = 0; i < 9; i++) sim.step([8, 5], null);
    expect(
      sim.frames.map((f, i) => (f.attacks.length ? i + 1 : 0)).filter(Boolean),
    ).toEqual([1, 5, 9]);
    const decoded = decodeLink(
      encodeLink(sim.initial, "https://example.org/", sim.steps),
    )!;
    const second = new Simulation(decoded.scenario);
    decoded.steps.forEach((a) => second.step(a.player, a.prayer));
    expect(second.frames).toEqual(sim.frames);
    sim.rewind(4);
    sim.step([8, 5], null);
    expect(sim.frames[4]).toEqual(second.frames[4]);
  });
  it("honours a captured/edited cooldown without changing the input snapshot", () => {
    const s = emptyScenario();
    s.mobs = [{ id: 1, type: "ranger", x: 5, y: 5, cooldown: 3 }];
    const sim = new Simulation(s);
    for (let i = 0; i < 3; i++) sim.step([8, 5], null);
    expect(sim.frames.map((f) => f.attacks.length)).toEqual([0, 0, 1]);
    expect(s.mobs[0].cooldown).toBe(3);
  });
});
