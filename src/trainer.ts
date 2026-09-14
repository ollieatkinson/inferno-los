import { emptyScenario, type Scenario } from "./model";
import type { Frame } from "./simulation";
export const DRILLS = {
  alternating: "Ranger + mager",
  blob: "Blob + mager",
  jad: "Jad",
  current: "My current stack",
} as const;
export type Drill = keyof typeof DRILLS;
export function drillScenario(drill: Drill, current: Scenario): Scenario {
  if (drill === "current") return structuredClone(current);
  const s = emptyScenario();
  s.player = [16, 10];
  if (drill === "jad")
    s.mobs = [{ id: 1, type: "jad", x: 7, y: 10, cooldown: 4 }];
  else
    s.mobs = [
      { id: 1, type: "mager", x: 8, y: 10, cooldown: 4 },
      drill === "blob"
        ? { id: 2, type: "blob", x: 13, y: 5 }
        : { id: 2, type: "ranger", x: 13, y: 5, cooldown: 6 },
    ];
  return s;
}
export function score(frames: Frame[]) {
  let protectedHits = 0,
    totalHits = 0,
    streak = 0,
    bestStreak = 0,
    idleTicks = 0,
    idleOff = 0,
    conflicts = 0;
  for (const f of frames) {
    if (f.attacks.length === 0) {
      idleTicks++;
      if (f.prayer === null) idleOff++;
      continue;
    }
    const protectedNow = f.attacks.filter((a) => a.style === f.prayer).length;
    protectedHits += protectedNow;
    totalHits += f.attacks.length;
    if (new Set(f.attacks.map((a) => a.style)).size > 1) conflicts++;
    streak = protectedNow === f.attacks.length ? streak + 1 : 0;
    bestStreak = Math.max(streak, bestStreak);
  }
  return {
    protectedHits,
    totalHits,
    missed: totalHits - protectedHits,
    accuracy: totalHits ? Math.round((100 * protectedHits) / totalHits) : null,
    streak,
    bestStreak,
    idleTicks,
    idleOff,
    conflicts,
  };
}
