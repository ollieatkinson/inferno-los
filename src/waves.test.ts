import { describe, expect, it } from "vitest";
import { contains, legal } from "./geometry";
import { decodeLink, encodeLink, validateScenario } from "./links";
import { NPCS, SPAWNS, type NpcType } from "./model";
import { waveMonsters, waveScenario } from "./waves";

function random(seed: number) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}
function counts(wave: number) {
  return waveMonsters(wave).reduce<Partial<Record<NpcType, number>>>(
    (result, type) => {
      result[type] = (result[type] ?? 0) + 1;
      return result;
    },
    {},
  );
}

describe("wave practice", () => {
  it("uses the milestone and late-wave monster lineups", () => {
    expect(counts(1)).toEqual({ nibbler: 3, bat: 1 });
    expect(counts(2)).toEqual({ nibbler: 3, bat: 2 });
    for (const wave of [3, 8, 17, 34])
      expect(counts(wave)).toEqual({ nibbler: 6 });
    for (const [wave, type] of [
      [4, "blob"],
      [9, "melee"],
      [18, "ranger"],
      [35, "mager"],
    ] as const)
      expect(counts(wave)).toEqual({ nibbler: 3, [type]: 1 });
    expect(counts(50)).toEqual({ nibbler: 3, ranger: 1, mager: 1 });
    expect(counts(61)).toEqual({
      nibbler: 3,
      bat: 1,
      blob: 1,
      melee: 1,
      ranger: 1,
      mager: 1,
    });
    expect(counts(62)).toEqual({
      nibbler: 3,
      bat: 2,
      blob: 1,
      melee: 1,
      ranger: 1,
      mager: 1,
    });
    expect(counts(63)).toEqual({
      nibbler: 3,
      blob: 2,
      melee: 1,
      ranger: 1,
      mager: 1,
    });
    expect(counts(64)).toEqual({ nibbler: 3, melee: 2, ranger: 1, mager: 1 });
    expect(counts(65)).toEqual({ nibbler: 3, ranger: 2, mager: 1 });
    expect(counts(66)).toEqual({ nibbler: 3, mager: 2 });
  });

  it("places all regular waves legally in the nine slots with separate central nibblers", () => {
    const originalSpawns = structuredClone(SPAWNS);
    for (let wave = 1; wave <= 66; wave++) {
      for (let seed = 0; seed < 20; seed++) {
        const scene = waveScenario(wave, random(seed));
        expect(() => validateScenario(scene)).not.toThrow();
        expect(scene.kind).toBe("custom");
        expect(scene.wave).toBe(wave);
        expect(new Set(scene.mobs.map((m) => `${m.x},${m.y}`)).size).toBe(
          scene.mobs.length,
        );
        for (const mob of scene.mobs) {
          expect(legal(mob, scene)).toBe(true);
          expect(
            contains(mob.x, mob.y, NPCS[mob.type].size, scene.player),
          ).toBe(false);
          if (mob.type !== "nibbler")
            expect(SPAWNS).toContainEqual([mob.x, mob.y]);
          else {
            expect(mob.x).toBeGreaterThanOrEqual(8);
            expect(mob.x).toBeLessThanOrEqual(10);
            expect(mob.y).toBeGreaterThanOrEqual(11);
            expect(mob.y).toBeLessThanOrEqual(13);
          }
        }
      }
    }
    expect(SPAWNS).toEqual(originalSpawns);
  });

  it("can reroll a layout while share links retain the exact generated positions", () => {
    const first = waveScenario(63, random(42));
    const second = waveScenario(63, random(43));
    expect(first.mobs).not.toEqual(second.mobs);
    const link = encodeLink(first, "https://los.inferno.tips/?wave=63");
    expect(new URL(link).search).toBe("");
    expect(decodeLink(link)?.scenario).toEqual(first);
    expect(decodeLink("https://los.inferno.tips/?wave=63")?.scenario.wave).toBe(
      63,
    );
    // A captured position always takes precedence over a wave-number query.
    expect(decodeLink(link.replace("/#", "/?wave=1#"))?.scenario).toEqual(
      first,
    );
  });

  it("uses pillar-free Jad drills and rejects unsupported or invalid wave numbers", () => {
    for (const wave of [67, 68]) {
      const s = waveScenario(wave);
      expect(s.mobs.map((m) => m.type)).toEqual(waveMonsters(wave));
      expect(s.pillars).toEqual([false, false, false]);
      expect(() => validateScenario(s)).not.toThrow();
    }
    expect(waveScenario(68).mobs.map((m) => m.cooldown)).toEqual([4, 7, 10]);
    for (const wave of [0, -1, 1.5, NaN, Infinity, 70])
      expect(() => waveScenario(wave)).toThrow("whole wave number");
    expect(() => waveScenario(69)).toThrow("Zuk");
    expect(() => decodeLink("https://los.inferno.tips/?wave=69")).toThrow(
      "Zuk",
    );
  });
});
