import { describe, expect, it } from "vitest";
import { decodeLink, encodeLink, encodeShareCode } from "./links";
import { encodeCode } from "./shareCode";
import {
  emptyScenario,
  exampleScenario,
  NPCS,
  type Replay,
  type Scenario,
} from "./model";

describe("compact share codes", () => {
  it("matches the Java fixture byte for byte and accepts a bare code or URL", () => {
    const scenario: Scenario = {
      version: 1,
      kind: "wave",
      wave: 63,
      player: [16, 5],
      pillars: [true, false, true],
      mobs: [
        { id: 6, type: "ranger", x: 22, y: 12 },
        { id: 41, type: "mager", x: 20, y: 8 },
      ],
      warnings: [],
    };
    const code = "IL2-FKEBBT8CBgPyAikE_AEAANDSVrY";
    expect(encodeShareCode(scenario)).toBe(code);
    for (const input of [code, ` #${code}\n`, `https://example.org/#${code}`])
      expect(decodeLink(input)).toEqual({ scenario, steps: [] });
  });
  it("preserves every NPC type, large IDs, optional state, HP and Unicode notes", () => {
    const scenario: Scenario = {
      ...emptyScenario(),
      kind: "current",
      wave: 68,
      pillars: [false, false, true],
      pillarHp: [0, 0, 37],
      warnings: ["Jad 🦎 — café", "Two lines\nof notes"],
      mobs: (Object.keys(NPCS) as (keyof typeof NPCS)[]).map((type, i) => ({
        id: 65535 - i,
        type,
        x: 5,
        y: 10,
        cooldown: i,
        attackCount: 100000,
      })),
    };
    for (const mob of scenario.mobs)
      if (mob.type === "jad" || mob.type === "blob")
        Object.assign(mob, {
          pendingStyle: mob.type === "jad" ? "mage" : "range",
          pendingTicks: 3,
        });
    expect(decodeLink(encodeShareCode(scenario))).toEqual({
      scenario,
      steps: [],
    });
  });
  it("packs all replay prayers and repeated ticks without losing order", () => {
    const scenario = exampleScenario();
    const steps: Replay["steps"] = Array.from({ length: 256 }, (_, i) => ({
      player: [16, 4 + Math.floor(i / 64)],
      prayer: [null, "mage", "range", "melee"][
        Math.floor(i / 64)
      ] as Replay["steps"][number]["prayer"],
    }));
    const code = encodeShareCode(scenario, steps);
    expect(code.length).toBeLessThan(100);
    expect(decodeLink(code)).toEqual({ scenario, steps });
    expect(
      decodeLink(encodeLink(scenario, "https://example.org/", steps)),
    ).toEqual(decodeLink(code));
  });
  it("rejects corruption, truncation and invalid scenes or replays even with valid checksums", () => {
    const scenario = exampleScenario(),
      code = encodeShareCode(scenario);
    for (const input of [
      code.slice(0, -3),
      code.slice(0, 9) + (code[9] === "A" ? "B" : "A") + code.slice(10),
      "IL2-???",
    ])
      expect(() => decodeLink(input)).toThrow(/damaged/);
    expect(() => decodeLink("IL2-" + "A".repeat(100000))).toThrow(/large/);
    // Raw codec builds checksummed fixtures; public encoders/decoders validate game rules.
    expect(() =>
      decodeLink(encodeCode({ ...scenario, player: [16, 30] })),
    ).toThrow();
    expect(() =>
      decodeLink(
        encodeCode({ ...scenario, mobs: [scenario.mobs[0], scenario.mobs[0]] }),
      ),
    ).toThrow();
    const steps: Replay["steps"] = Array.from({ length: 257 }, () => ({
      player: [16, 5],
      prayer: null,
    }));
    expect(() => decodeLink(encodeCode(scenario, steps))).toThrow();
    expect(() => encodeShareCode(scenario, steps)).toThrow();
  });
  it("makes the default position substantially shorter and preserves hosted subpaths", () => {
    const scenario = exampleScenario();
    const code = encodeShareCode(scenario);
    expect(code).toMatch(/^IL2-[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(60);
    expect(code.length).toBeLessThan(
      encodeURIComponent(JSON.stringify(scenario)).length / 4,
    );
    const url = new URL(
      encodeLink(scenario, "https://example.org/inferno/?old#old"),
    );
    expect(url.pathname).toBe("/inferno/");
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#${code}`);
  });
});
