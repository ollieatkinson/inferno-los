export type Tile = [number, number];
export type Prayer = "melee" | "range" | "mage";
export const NPCS = {
  bat: {
    name: "Bat",
    gameId: 7692,
    size: 2,
    range: 4,
    speed: 3,
    style: "range",
    color: "#c49af0",
    symbol: "B",
  },
  blob: {
    name: "Blob",
    gameId: 7693,
    size: 3,
    range: 15,
    speed: 6,
    style: "blob",
    color: "#d5c16c",
    symbol: "Bl",
  },
  melee: {
    name: "Meleer",
    gameId: 7697,
    size: 4,
    range: 1,
    speed: 4,
    style: "melee",
    color: "#e78868",
    symbol: "M",
  },
  ranger: {
    name: "Ranger",
    gameId: 7698,
    size: 3,
    range: 15,
    speed: 4,
    style: "range",
    color: "#91be81",
    symbol: "R",
  },
  mager: {
    name: "Mager",
    gameId: 7699,
    size: 4,
    range: 15,
    speed: 4,
    style: "mage",
    color: "#81b8e5",
    symbol: "Z",
  },
  nibbler: {
    name: "Nibbler",
    gameId: 7691,
    size: 1,
    range: 1,
    speed: 4,
    style: "pillar",
    color: "#b6b4ae",
    symbol: "N",
  },
  meleeBlob: {
    name: "Melee bloblet",
    gameId: 7696,
    size: 1,
    range: 1,
    speed: 4,
    style: "melee",
    color: "#e78868",
    symbol: "m",
  },
  rangeBlob: {
    name: "Range bloblet",
    gameId: 7695,
    size: 1,
    range: 15,
    speed: 4,
    style: "range",
    color: "#91be81",
    symbol: "r",
  },
  mageBlob: {
    name: "Mage bloblet",
    gameId: 7694,
    size: 1,
    range: 15,
    speed: 4,
    style: "mage",
    color: "#81b8e5",
    symbol: "z",
  },
  jad: {
    name: "Jad",
    gameId: 7700,
    size: 5,
    range: 15,
    speed: 8,
    style: "jad",
    color: "#eead72",
    symbol: "J",
  },
  healer: {
    name: "Jad healer",
    gameId: 7701,
    size: 1,
    range: 1,
    speed: 4,
    style: "melee",
    color: "#d9a6a6",
    symbol: "H",
  },
} as const;
export type NpcType = keyof typeof NPCS;
export interface Mob {
  id: number;
  type: NpcType;
  x: number;
  y: number;
  cooldown?: number;
  pendingStyle?: Prayer;
  pendingTicks?: number;
  attackCount?: number;
}
export interface Scenario {
  version: 1;
  kind: "wave" | "current" | "custom";
  wave?: number;
  player: Tile;
  pillars: [boolean, boolean, boolean];
  mobs: Mob[];
  pillarHp?: [number, number, number];
  warnings?: string[];
}
export interface Replay {
  scenario: Scenario;
  steps: { player: Tile; prayer: Prayer | null }[];
}
export const WIDTH = 29,
  HEIGHT = 30;
// Coordinates are the southwest tile of each footprint; screen Y increases south.
export const PILLARS = [
  { name: "West", x: 0, y: 9 },
  { name: "North", x: 17, y: 7 },
  { name: "South", x: 10, y: 23 },
];
export const SPAWNS: Tile[] = [
  [1, 5],
  [22, 5],
  [3, 11],
  [23, 12],
  [16, 17],
  [5, 23],
  [23, 25],
  [1, 28],
  [15, 28],
];
export const emptyScenario = (): Scenario => ({
  version: 1,
  kind: "custom",
  player: [16, 5],
  pillars: [true, true, true],
  mobs: [],
});
export const exampleScenario = (): Scenario => ({
  ...emptyScenario(),
  mobs: [
    { id: 1, type: "mager", x: 20, y: 8 },
    { id: 2, type: "ranger", x: 20, y: 11 },
    { id: 3, type: "melee", x: 14, y: 11 },
  ],
});
