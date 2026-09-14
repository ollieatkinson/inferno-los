import { canAttack, styles } from "./geometry";
import { HEIGHT, WIDTH, type Mob, type Scenario } from "./model";
const bits: Record<string, number> = { mage: 1, range: 2, melee: 4 };
/** Bounded cache: cooldowns, prayer choices and player movement never invalidate NPC LoS. */
export class ThreatMapCache {
  private maps = new Map<string, Uint8Array>();
  builds = 0;
  get(m: Mob, pillars: Scenario["pillars"]) {
    const key = `${m.type}:${m.x}:${m.y}:${pillars.map(Number).join("")}`;
    const cached = this.maps.get(key);
    if (cached) return cached;
    const map = new Uint8Array(WIDTH * HEIGHT);
    this.builds++;
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++)
        if (canAttack(m, [x, y], pillars)) {
          for (const style of styles(m, [x, y]))
            map[y * WIDTH + x] |= bits[style] ?? 0;
        }
    if (this.maps.size >= 128) this.maps.delete(this.maps.keys().next().value!);
    this.maps.set(key, map);
    return map;
  }
  combine(mobs: Mob[], pillars: Scenario["pillars"]) {
    const result = new Uint8Array(WIDTH * HEIGHT);
    for (const m of mobs) {
      const tiles = this.get(m, pillars);
      for (let i = 0; i < tiles.length; i++) result[i] |= tiles[i];
    }
    return result;
  }
}
