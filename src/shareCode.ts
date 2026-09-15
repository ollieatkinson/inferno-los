import type { NpcType, Prayer, Replay, Scenario, Tile } from "./model";

// Wire IDs are permanent; append new types rather than reordering these lists.
const types: NpcType[] = [
  "bat",
  "blob",
  "melee",
  "ranger",
  "mager",
  "nibbler",
  "mageBlob",
  "rangeBlob",
  "meleeBlob",
  "jad",
  "healer",
];
const prayers: (Prayer | null)[] = [null, "mage", "range", "melee"];
const kinds = ["wave", "current", "custom"] as const;
const packTile = ([x, y]: Tile) => y * 29 + x;
const unpackTile = (n: number): Tile => [n % 29, Math.floor(n / 29)];
const checksum = (bytes: number[] | Uint8Array) => {
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193);
  return hash >>> 0;
};

export function encodeCode(s: Scenario, steps: Replay["steps"] = []): string {
  const bytes: number[] = [];
  const uint = (n: number) => {
    do {
      bytes.push((n & 127) | (n >= 128 ? 128 : 0));
      n >>>= 7;
    } while (n);
  };
  bytes.push(
    kinds.indexOf(s.kind) |
      (s.wave !== undefined ? 4 : 0) |
      (s.pillarHp ? 8 : 0) |
      (s.warnings !== undefined ? 16 : 0),
  );
  uint(packTile(s.player));
  bytes.push(s.pillars.reduce((mask, p, i) => mask | (Number(p) << i), 0));
  if (s.wave !== undefined) uint(s.wave);
  if (s.pillarHp) s.pillarHp.forEach(uint);
  uint(s.mobs.length);
  for (const m of s.mobs) {
    uint(m.id);
    bytes.push(
      types.indexOf(m.type) |
        (m.cooldown !== undefined ? 16 : 0) |
        (m.pendingStyle !== undefined ? 32 : 0) |
        (m.attackCount !== undefined ? 64 : 0) |
        (m.dig !== undefined ? 128 : 0),
    );
    uint(packTile([m.x, m.y]));
    if (m.cooldown !== undefined) uint(m.cooldown);
    if (m.pendingStyle !== undefined)
      uint((m.pendingTicks! - 1) * 2 + Number(m.pendingStyle === "range"));
    if (m.attackCount !== undefined) uint(m.attackCount);
    if (m.dig) {
      uint(m.dig.timer);
      uint(m.dig.count);
      uint(m.dig.sinceAttack);
      uint(m.dig.remaining);
      uint(m.dig.recovery);
      if (m.dig.remaining) uint(packTile(m.dig.target!));
    }
  }
  if (s.warnings !== undefined) {
    uint(s.warnings.length);
    for (const warning of s.warnings) {
      const text = new TextEncoder().encode(warning);
      uint(text.length);
      bytes.push(...text);
    }
  }
  const runs: { value: number; count: number }[] = [];
  for (const step of steps) {
    const value = packTile(step.player) * 4 + prayers.indexOf(step.prayer);
    const last = runs.at(-1);
    if (last?.value === value) last.count++;
    else runs.push({ value, count: 1 });
  }
  uint(runs.length);
  for (const run of runs) {
    uint(run.value);
    uint(run.count);
  }
  const hash = checksum(bytes);
  for (let i = 0; i < 4; i++) bytes.push((hash >>> (i * 8)) & 255);
  const code =
    "IL2-" +
    btoa(bytes.map((b) => String.fromCharCode(b)).join(""))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
  if (code.length > 100000) throw new Error("This link is too large.");
  return code;
}

export function decodeCode(code: string): Replay {
  if (code.length > 100000) throw new Error("This link is too large.");
  const fail = () => {
    throw new Error("The share code is incomplete or damaged. Copy it again.");
  };
  if (!/^IL2-[A-Za-z0-9_-]+$/.test(code) || code.length % 4 === 1)
    return fail();
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(
      atob(code.slice(4).replaceAll("-", "+").replaceAll("_", "/")),
      (c) => c.charCodeAt(0),
    );
  } catch {
    return fail();
  }
  const end = bytes.length - 4;
  if (end < 4) return fail();
  const hash = new DataView(bytes.buffer).getUint32(end, true);
  if (checksum(bytes.subarray(0, end)) !== hash) return fail();
  let offset = 0;
  const byte = () => (offset < end ? bytes[offset++] : fail());
  const uint = () => {
    let n = 0;
    for (let i = 0; i < 5; i++) {
      const b = byte();
      if (i === 4 && b > 15) return fail();
      n += (b & 127) * 2 ** (7 * i);
      if (!(b & 128)) return n;
    }
    return fail();
  };
  const flags = byte();
  if (flags > 31 || (flags & 3) === 3) return fail();
  const player = unpackTile(uint()),
    mask = byte();
  if (mask > 7) return fail();
  const scenario: Scenario = {
    version: 1,
    kind: kinds[flags & 3],
    player,
    pillars: [!!(mask & 1), !!(mask & 2), !!(mask & 4)],
    mobs: [],
  };
  if (flags & 4) scenario.wave = uint();
  if (flags & 8) scenario.pillarHp = [uint(), uint(), uint()];
  const count = uint();
  if (count > 64) return fail();
  for (let i = 0; i < count; i++) {
    const id = uint(),
      tag = byte(),
      [x, y] = unpackTile(uint());
    if ((tag & 15) >= types.length) return fail();
    const mob: Scenario["mobs"][number] = { id, type: types[tag & 15], x, y };
    if (tag & 16) mob.cooldown = uint();
    if (tag & 32) {
      const pending = uint();
      if (pending > 5) return fail();
      mob.pendingStyle = pending % 2 ? "range" : "mage";
      mob.pendingTicks = Math.floor(pending / 2) + 1;
    }
    if (tag & 64) mob.attackCount = uint();
    if (tag & 128) {
      mob.dig = {
        timer: uint(),
        count: uint(),
        sinceAttack: uint(),
        remaining: uint(),
        recovery: uint(),
      };
      if (mob.dig.remaining) mob.dig.target = unpackTile(uint());
    }
    scenario.mobs.push(mob);
  }
  if (flags & 16) {
    const count = uint();
    if (count > 64) return fail();
    scenario.warnings = [];
    for (let i = 0; i < count; i++) {
      const length = uint();
      if (length > 1200 || offset + length > end) return fail();
      try {
        scenario.warnings.push(
          new TextDecoder("utf-8", { fatal: true }).decode(
            bytes.subarray(offset, offset + length),
          ),
        );
      } catch {
        return fail();
      }
      offset += length;
    }
  }
  const runs = uint(),
    steps: Replay["steps"] = [];
  if (runs > 256) return fail();
  for (let i = 0; i < runs; i++) {
    const value = uint(),
      count = uint();
    if (count < 1 || steps.length + count > 256) return fail();
    for (let j = 0; j < count; j++)
      steps.push({
        player: unpackTile(Math.floor(value / 4)),
        prayer: prayers[value % 4],
      });
  }
  if (offset !== end) return fail();
  return { scenario, steps };
}
