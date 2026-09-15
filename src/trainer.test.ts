import { describe, it, expect } from "vitest";
import { Simulation } from "./simulation";
import { emptyScenario } from "./model";
import { drillScenario, score } from "./trainer";
import { decodeScout, encodeScout } from "./scout";
import { decodeLink, encodeLink, validateScenario } from "./links";
import { ThreatMapCache } from "./threatMap";

describe("Scouter interoperability", () => {
  it("loads old nine-slot codes, ranks and N/S/W pillar health", () => {
    const plain = decodeScout("MYBXooooR");
    expect(plain.mobs.map((m) => m.type)).toEqual([
      "mager",
      "bat",
      "blob",
      "melee",
      "ranger",
    ]);
    const s = decodeScout("[M1Rooooooo009999]");
    expect(s.mobs).toEqual([
      { id: 1, type: "mager", x: 1, y: 5 },
      { id: 0, type: "ranger", x: 22, y: 5 },
    ]);
    expect(s.pillars).toEqual([true, false, true]);
    expect(s.pillarHp).toEqual([99, 0, 99]);
    expect(encodeScout(s)).toBe("[M1Rooooooo009999]");
    expect(
      decodeLink("https://example.org/?scout=%5BM1Rooooooo009999%5D")?.scenario,
    ).toEqual(s);
  });
  it("retains last-slot ranks before the numeric HP suffix", () => {
    const s = decodeScout("[MoooooooR1095099]");
    expect(s.pillarHp).toEqual([99, 9, 50]);
    expect(s.mobs[1].id).toBeGreaterThan(s.mobs[0].id);
    expect(encodeScout(s)).toBe("[MoooooooR1095099]");
  });
  it("rejects invalid ranks, malformed codes and encoding of moved stacks", () => {
    for (const code of [
      "[M1R1ooooooo999999]",
      "[M3Rooooooo999999]",
      "o1oooooooo",
      "[Mooooooo]",
      "[ZZZZZZZZZ]",
    ])
      expect(() => decodeScout(code)).toThrow();
    const s = decodeScout("Moooooooo");
    s.mobs[0].x++;
    expect(() => encodeScout(s)).toThrow("initial spawn");
  });
});
describe("prayer training rules", () => {
  it("Jad drills remove pillars and triple Jad stays three ticks apart for the full drill", () => {
    for (const drill of ["jad", "triple-jad"] as const) {
      const s = drillScenario(drill, emptyScenario());
      expect(s.pillars).toEqual([false, false, false]);
      expect(
        decodeLink(encodeLink(s, "https://example.org/"))!.scenario,
      ).toEqual(s);
      const sim = new Simulation(s);
      const checks = new Map<
        number,
        { id: number; style: "mage" | "range" | "melee" }
      >();
      for (let tick = 1; tick <= 60; tick++) {
        const f = sim.step(s.player, checks.get(tick)?.style ?? null);
        for (const cue of f.cues) {
          expect(checks.has(tick + 3)).toBe(false);
          checks.set(tick + 3, cue);
        }
        expect(f.attacks).toHaveLength(checks.has(tick) ? 1 : 0);
        expect(f.scenario.mobs.map(({ x, y }) => [x, y])).toEqual(
          s.mobs.map(({ x, y }) => [x, y]),
        );
      }
      const hits = sim.frames.flatMap((f, i) =>
        f.attacks.map((a) => ({ tick: i + 1, id: a.id })),
      );
      expect(hits.map((h) => h.tick)).toEqual(
        drill === "triple-jad"
          ? Array.from({ length: 18 }, (_, i) => 7 + i * 3)
          : [7, 15, 23, 31, 39, 47, 55],
      );
      if (drill === "triple-jad")
        expect(hits.map((h) => h.id)).toEqual(
          Array.from({ length: 18 }, (_, i) => (i % 3) + 1),
        );
      expect(score(sim.frames).accuracy).toBe(100);
      expect(score(sim.frames).conflicts).toBe(0);
    }
  });
  it("blob scans magic, attacks range three ticks later even after losing LoS", () => {
    const s = emptyScenario();
    s.mobs = [{ id: 1, type: "blob", x: 20, y: 7 }];
    s.player = [16, 10];
    const sim = new Simulation(s);
    expect(sim.step([16, 10], "mage").cues).toEqual([
      { id: 1, kind: "scan", style: "range" },
    ]);
    expect(sim.frames[0].attacks).toHaveLength(0);
    sim.step([16, 5], null);
    sim.step([16, 5], null);
    const f = sim.step([16, 5], "range");
    expect(f.attacks.map((a) => a.style)).toEqual(["range"]);
    expect(score(sim.frames).accuracy).toBe(100);
  });
  it("blob repeats its six-tick scan/attack cycle and responds to scan prayer", () => {
    const s = emptyScenario();
    s.mobs = [{ id: 1, type: "blob", x: 5, y: 5 }];
    s.player = [11, 5];
    const sim = new Simulation(s);
    for (let i = 0; i < 13; i++) sim.step(s.player, "range");
    expect(
      sim.frames.flatMap((f, i) => (f.cues.length ? [i + 1] : [])),
    ).toEqual([1, 7, 13]);
    expect(
      sim.frames.flatMap((f, i) => (f.attacks.length ? [i + 1] : [])),
    ).toEqual([4, 10]);
    expect(sim.frames[3].attacks[0].style).toBe("mage");
    expect(score(sim.frames).missed).toBe(2);
  });
  it("Jad gives a cue, checks prayer three ticks later, and shares pending attacks", () => {
    const s = drillScenario("jad", emptyScenario());
    s.mobs[0].cooldown = 0;
    const sim = new Simulation(s);
    const first = sim.step(s.player, null);
    expect(first.cues).toHaveLength(1);
    expect(first.attacks).toHaveLength(0);
    const shared = decodeLink(
      encodeLink(sim.scenario, "https://example.org/"),
    )!;
    const restored = new Simulation(shared.scenario);
    for (let i = 0; i < 3; i++) {
      sim.step(s.player, first.cues[0].style);
      restored.step(s.player, first.cues[0].style);
    }
    expect(sim.frames[3].attacks).toEqual(restored.frames[2].attacks);
    expect(score(sim.frames).accuracy).toBe(100);
  });
  it("alternating drill is protectable with 2-tick mage/range switches", () => {
    const s = drillScenario("alternating", emptyScenario()),
      sim = new Simulation(s);
    for (let tick = 1; tick <= 60; tick++)
      sim.step(
        s.player,
        tick >= 4 && tick % 4 === 0
          ? "mage"
          : tick >= 6 && tick % 4 === 2
            ? "range"
            : null,
      );
    const result = score(sim.frames);
    expect(result.totalHits).toBeGreaterThan(20);
    expect(result.accuracy).toBe(100);
    expect(result.conflicts).toBe(0);
    expect(result.idleOff).toBe(result.idleTicks);
  });
  it("scores conflicting hits separately, misses, idle prayer and streaks honestly", () => {
    const s = drillScenario("alternating", emptyScenario());
    s.mobs[0].cooldown = 1;
    s.mobs[1].cooldown = 1;
    const sim = new Simulation(s);
    sim.step(s.player, "mage");
    sim.step(s.player, "mage");
    const result = score(sim.frames);
    expect(result.accuracy).toBe(50);
    expect(result.conflicts).toBe(1);
    expect(result.bestStreak).toBe(0);
    expect(result.idleOff).toBe(0);
  });
  it("rejects partial and impossible pending attack states", () => {
    const s = drillScenario("jad", emptyScenario());
    s.mobs[0].pendingStyle = "mage";
    expect(() => validateScenario(s)).toThrow("attack state");
    s.mobs[0].pendingTicks = 0;
    expect(() => validateScenario(s)).toThrow("attack state");
    s.mobs[0].pendingTicks = 3;
    expect(validateScenario(s)).toEqual(s);
  });
});
describe("LoS cache performance contract", () => {
  it("moving player/changing cooldown costs no map rebuild; dragging one mob rebuilds one", () => {
    const s = drillScenario("alternating", emptyScenario()),
      cache = new ThreatMapCache();
    cache.combine(s.mobs, s.pillars);
    expect(cache.builds).toBe(2);
    for (let i = 0; i < 100; i++) {
      s.player = [i % 29, 10];
      s.mobs[0].cooldown = i;
      cache.combine(s.mobs, s.pillars);
    }
    expect(cache.builds).toBe(2);
    s.mobs[0].x++;
    cache.combine(s.mobs, s.pillars);
    expect(cache.builds).toBe(3);
    s.pillars[1] = false;
    cache.combine(s.mobs, s.pillars);
    expect(cache.builds).toBe(5);
  });
});
