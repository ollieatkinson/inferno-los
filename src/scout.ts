import { emptyScenario, SPAWNS, type NpcType, type Scenario } from "./model";
const letters: Record<string, NpcType> = {
  Y: "bat",
  B: "blob",
  X: "melee",
  R: "ranger",
  M: "mager",
};

// Nine reading-order slots; optional descending NPC-index ranks;
// optional six-digit pillar HP suffix (north/south/west). Lowest rank is omitted.
export function decodeScout(input: string): Scenario {
  let code = input.trim();
  if (code.startsWith("[") && code.endsWith("]")) code = code.slice(1, -1);
  const suffix = code.match(/(\d{6})$/)?.[1];
  if (suffix) code = code.slice(0, -6);
  const tokens = [...code.matchAll(/([oYBXRM])([1-9]?)/g)];
  if (tokens.length !== 9 || tokens.map((t) => t[0]).join("") !== code)
    throw new Error(
      "Use a nine-slot Inferno Scouter code, for example [M1Rooooooo999999].",
    );
  const count = tokens.filter((t) => t[1] !== "o").length;
  const explicit = tokens.some((t) => t[2]);
  const ranks = new Set<number>();
  const s = emptyScenario();
  s.kind = "wave";
  s.mobs = tokens.flatMap((t, i) => {
    if (t[1] === "o") {
      if (t[2]) throw new Error("Empty spawn slots cannot have a rank.");
      return [];
    }
    const rank = t[2] ? Number(t[2]) : count;
    if (explicit && (rank > count || ranks.has(rank)))
      throw new Error("The NPC ranks in this Scouter code are invalid.");
    ranks.add(rank);
    return [
      {
        id: explicit ? count - rank : i,
        type: letters[t[1]],
        x: SPAWNS[i][0],
        y: SPAWNS[i][1],
      },
    ];
  });
  if (suffix) {
    const n = Number(suffix.slice(0, 2)),
      south = Number(suffix.slice(2, 4)),
      w = Number(suffix.slice(4));
    s.pillarHp = [w, n, south];
    s.pillars = [w > 0, n > 0, south > 0];
  }
  return s;
}
export function encodeScout(s: Scenario): string {
  const slots = new Map<number, (typeof s.mobs)[number]>();
  for (const m of s.mobs) {
    const i = SPAWNS.findIndex((p) => p[0] === m.x && p[1] === m.y);
    if (i < 0 || slots.has(i) || !Object.values(letters).includes(m.type))
      throw new Error(
        "Scouter codes only describe the nine initial spawn tiles. Share a position link for this scene.",
      );
    slots.set(i, m);
  }
  const order = [...s.mobs].sort((a, b) => b.id - a.id);
  const code = SPAWNS.map((_, i) => {
    const m = slots.get(i);
    if (!m) return "o";
    const letter = Object.keys(letters).find((k) => letters[k] === m.type)!;
    const rank = order.findIndex((n) => n.id === m.id) + 1;
    return letter + (rank < order.length ? rank : "");
  }).join("");
  const hp = s.pillarHp ?? s.pillars.map((alive) => (alive ? 99 : 0));
  return (
    "[" +
    code +
    [hp[1], hp[2], hp[0]].map((n) => String(n).padStart(2, "0")).join("") +
    "]"
  );
}
