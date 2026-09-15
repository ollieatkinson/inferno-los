import {
  emptyScenario,
  SPAWNS,
  type NpcType,
  type Scenario,
  type Tile,
} from "./model";
import { drillScenario } from "./trainer";

// Game wave composition: nibblers, bats, blobs, meleers, rangers, magers.
// Cross-checked against OldSchoolSDK/InfernoTrainer's InfernoWaves.ts.
const COUNTS = [
  "310000",
  "320000",
  "600000",
  "301000",
  "311000",
  "321000",
  "302000",
  "600000",
  "300100",
  "310100",
  "320100",
  "301100",
  "311100",
  "321100",
  "302100",
  "300200",
  "600000",
  "300010",
  "310010",
  "320010",
  "301010",
  "311010",
  "321010",
  "302010",
  "300110",
  "310110",
  "320110",
  "301110",
  "311110",
  "321110",
  "302110",
  "300210",
  "300020",
  "600000",
  "300001",
  "310001",
  "320001",
  "301001",
  "311001",
  "321001",
  "302001",
  "300101",
  "310101",
  "320101",
  "301101",
  "311101",
  "321101",
  "302101",
  "300201",
  "300011",
  "310011",
  "320011",
  "301011",
  "311011",
  "321011",
  "302011",
  "300111",
  "310111",
  "320111",
  "301111",
  "311111",
  "321111",
  "302111",
  "300211",
  "300021",
  "300002",
] as const;
const TYPES: NpcType[] = ["nibbler", "bat", "blob", "melee", "ranger", "mager"];
const NIBBLER_SPAWNS: Tile[] = Array.from({ length: 9 }, (_, i) => [
  8 + (i % 3),
  11 + Math.floor(i / 3),
]);

function validateWave(wave: number) {
  if (wave === 69)
    throw new Error(
      "Wave 69 (Zuk) is not simulated. Choose a wave from 1 to 68.",
    );
  if (!Number.isInteger(wave) || wave < 1 || wave > 68)
    throw new Error("Choose a whole wave number from 1 to 68.");
}

export function waveMonsters(wave: number): NpcType[] {
  validateWave(wave);
  if (wave >= 67) return Array<NpcType>(wave === 67 ? 1 : 3).fill("jad");
  return TYPES.flatMap((type, i) =>
    Array<NpcType>(Number(COUNTS[wave - 1][i])).fill(type),
  );
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Generates a practice layout, not a capture or prediction of a live wave. */
export function waveScenario(wave: number, random = Math.random): Scenario {
  const roster = waveMonsters(wave);
  if (wave >= 67)
    return drillScenario(wave === 67 ? "jad" : "triple-jad", emptyScenario());
  const scenario = emptyScenario();
  scenario.wave = wave;
  const spawns = shuffled(SPAWNS, random);
  const nibblers = shuffled(NIBBLER_SPAWNS, random);
  // Largest threats first, matching the established practice tool's spawn order.
  scenario.mobs = [...roster].reverse().map((type, i) => {
    const [x, y] = (type === "nibbler" ? nibblers : spawns).shift()!;
    return { id: i + 1, type, x, y };
  });
  return scenario;
}
