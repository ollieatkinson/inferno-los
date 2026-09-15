import {
  NPCS,
  type Mob,
  type Prayer,
  type Replay,
  type Scenario,
  type Tile,
} from "./model";
import { canAttack, contains, legal, styles } from "./geometry";
import { advanceDig, type DigEvent } from "./dig";
export interface Attack {
  id: number;
  styles: Prayer[];
  style: Prayer;
}
export interface Cue {
  id: number;
  style: Prayer;
  kind: "scan" | "windup";
}
export interface Frame {
  scenario: Scenario;
  attacks: Attack[];
  cues: Cue[];
  prayer: Prayer | null;
  digs: DigEvent[];
}
const randomStyle = (m: Mob): Prayer =>
  (((m.id + 1) * 1103515245 + (m.attackCount ?? 0) * 12345) >>> 8) % 2
    ? "range"
    : "mage";
export class Simulation {
  initial: Scenario;
  scenario: Scenario;
  frames: Frame[] = [];
  steps: Replay["steps"] = [];
  constructor(s: Scenario) {
    this.initial = structuredClone(s);
    this.scenario = structuredClone(s);
  }
  preview(player: Tile, prayer: Prayer | null) {
    return new Simulation(this.scenario).step(player, prayer);
  }
  step(player: Tile, prayer: Prayer | null): Frame {
    const s = structuredClone(this.scenario);
    s.player = [...player];
    const attacks: Attack[] = [],
      cues: Cue[] = [],
      digs: DigEvent[] = [];
    s.mobs.sort((a, b) => a.id - b.id);
    const hit = (m: Mob, style: Prayer) => {
      attacks.push({ id: m.id, styles: [style], style });
      m.attackCount = (m.attackCount ?? 0) + 1;
      if (m.dig) m.dig.sinceAttack = 0;
    };
    for (const m of s.mobs) {
      if (m.type === "nibbler") continue;
      m.cooldown = Math.max(0, (m.cooldown ?? 0) - 1);
      if (advanceDig(m, s, player, digs)) continue;
      if (m.pendingStyle && m.pendingTicks !== undefined) {
        m.pendingTicks--;
        if (m.pendingTicks <= 0) {
          hit(m, m.pendingStyle);
          delete m.pendingStyle;
          delete m.pendingTicks;
          if (m.type === "blob") m.cooldown = 3;
        }
      }
      if (!canAttack(m, player, s.pillars)) this.move(m, s, player);
      if (
        !canAttack(m, player, s.pillars) ||
        m.cooldown !== 0 ||
        m.pendingStyle
      )
        continue;
      const possible = styles(m, player);
      const attackSpeed =
        m.type === "jad" && s.wave === 68 ? 9 : NPCS[m.type].speed;
      if (possible.includes("melee")) {
        hit(m, "melee");
        m.cooldown = attackSpeed;
        continue;
      }
      if (m.type === "blob") {
        const style =
          prayer === "mage"
            ? "range"
            : prayer === "range"
              ? "mage"
              : randomStyle(m);
        m.pendingStyle = style;
        m.pendingTicks = 3;
        m.cooldown = 3;
        cues.push({ id: m.id, style, kind: "scan" });
      } else if (m.type === "jad") {
        const style = randomStyle(m);
        m.pendingStyle = style;
        m.pendingTicks = 3;
        m.cooldown = attackSpeed;
        cues.push({ id: m.id, style, kind: "windup" });
      } else {
        hit(m, NPCS[m.type].style as Prayer);
        m.cooldown = NPCS[m.type].speed;
      }
    }
    this.steps.push({ player: [...player], prayer });
    this.scenario = s;
    const frame = { scenario: structuredClone(s), attacks, cues, prayer, digs };
    this.frames.push(frame);
    return frame;
  }
  private move(m: Mob, s: Scenario, player: Tile) {
    const size = NPCS[m.type].size;
    if (contains(m.x, m.y, size, player)) {
      // A dig can emerge underneath the player. Step toward the closest edge
      // rather than trying to path to a tile already inside our footprint.
      const exits = [
        { dx: -1, dy: 0, distance: m.x + size - player[0] },
        { dx: 1, dy: 0, distance: player[0] - m.x + 1 },
        { dx: 0, dy: 1, distance: player[1] - (m.y - size + 1) + 1 },
        { dx: 0, dy: -1, distance: m.y - player[1] + 1 },
      ].sort((a, b) => a.distance - b.distance);
      const exit = exits.find(({ dx, dy }) =>
        legal({ ...m, x: m.x + dx, y: m.y + dy }, s),
      );
      if (exit) {
        m.x += exit.dx;
        m.y += exit.dy;
      }
      return;
    }
    let dx = Math.sign(player[0] - m.x),
      dy = Math.sign(player[1] - m.y);
    if (contains(m.x + dx, m.y + dy, size, player)) dy = 0;
    const valid = (x: number, y: number) =>
      legal({ ...m, x: m.x + x, y: m.y + y }, s);
    if (valid(dx, dy) && (size > 1 || (valid(dx, 0) && valid(0, dy)))) {
      m.x += dx;
      m.y += dy;
    } else if (dx && valid(dx, 0)) m.x += dx;
    else if (dy && valid(0, dy)) m.y += dy;
  }
  rewind(tick: number) {
    this.scenario = structuredClone(
      tick === 0 ? this.initial : this.frames[tick - 1].scenario,
    );
    this.frames = this.frames.slice(0, tick);
    this.steps = this.steps.slice(0, tick);
  }
}
