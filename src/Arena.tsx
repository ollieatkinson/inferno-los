import { memo, useEffect, useRef } from "react";
import { blocked, contains } from "./geometry";
import { ThreatMapCache } from "./threatMap";
import {
  NPCS,
  PILLARS,
  SPAWNS,
  WIDTH,
  HEIGHT,
  type Mob,
  type NpcType,
  type Scenario,
  type Tile,
} from "./model";
import type { Frame } from "./simulation";
export const icon = (name: string) => `./icons/${name}.png`;
export const prayerIcon = (name: string) =>
  icon("protect-" + (name === "mage" ? "magic" : name));
const colors: Record<string, string> = {
  mage: "#74b6ef",
  range: "#93cc74",
  melee: "#ed927d",
};
const Tiles = memo(
  function Tiles({
    mobs,
    pillars,
    enabled,
    selected,
  }: {
    mobs: Mob[];
    pillars: Scenario["pillars"];
    enabled: boolean;
    selected: number | null;
  }) {
    const cache = useRef(new ThreatMapCache());
    const maps = enabled
      ? cache.current.combine(
          mobs.filter((m) => selected === null || selected === m.id),
          pillars,
        )
      : new Uint8Array(WIDTH * HEIGHT);
    return (
      <>
        {Array.from({ length: WIDTH * HEIGHT }, (_, i) => {
          const x = i % WIDTH,
            y = Math.floor(i / WIDTH),
            kind = maps[i];
          return (
            <rect
              key={i}
              x={x * 20}
              y={y * 20}
              width="20"
              height="20"
              className={
                "tile " +
                ((x + y) % 2 ? "odd" : "even") +
                (kind === 1
                  ? " mage"
                  : kind === 2
                    ? " range"
                    : kind === 4
                      ? " melee"
                      : kind
                        ? " mixed"
                        : "")
              }
            />
          );
        })}
      </>
    );
  },
  (a, b) =>
    a.enabled === b.enabled &&
    a.selected === b.selected &&
    a.pillars.every((p, i) => p === b.pillars[i]) &&
    a.mobs.length === b.mobs.length &&
    a.mobs.every(
      (m, i) =>
        m.id === b.mobs[i].id &&
        m.type === b.mobs[i].type &&
        m.x === b.mobs[i].x &&
        m.y === b.mobs[i].y,
    ),
);
interface Props {
  scenario: Scenario;
  before?: Scenario;
  frame?: Frame;
  tick: number;
  mode: NpcType | "player";
  south: boolean;
  showLos: boolean;
  showSpawns: boolean;
  selected: number | null;
  onMove: (p: Tile) => void;
  onPlace: (p: Tile) => void;
  onDrag: (m: Mob) => void;
  onSelect: (id: number | null) => void;
  onRemove: (id: number) => void;
}
export function Arena({
  scenario: s,
  before,
  frame,
  tick,
  mode,
  south,
  showLos,
  showSpawns,
  selected,
  onMove,
  onPlace,
  onDrag,
  onSelect,
  onRemove,
}: Props) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{ id: number; offset: Tile } | "player" | null>(null);
  const scheduled = useRef<number | null>(null),
    pending = useRef<Tile | null>(null),
    last = useRef<Tile | null>(null);
  const actions = useRef({ s, onMove, onDrag });
  actions.current = { s, onMove, onDrag };
  useEffect(
    () => () => {
      if (scheduled.current !== null) cancelAnimationFrame(scheduled.current);
    },
    [],
  );
  function tile(e: React.PointerEvent | React.MouseEvent): Tile {
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    );
    const x = Math.floor(point.x / 20),
      y = Math.floor(point.y / 20);
    return south ? [WIDTH - 1 - x, HEIGHT - 1 - y] : [x, y];
  }
  const getMob = (p: Tile) =>
    s.mobs.find((m) => contains(m.x, m.y, NPCS[m.type].size, p));
  function down(e: React.PointerEvent<SVGSVGElement>) {
    const p = tile(e);
    if (blocked(p, s.pillars)) return;
    last.current = p;
    if (mode !== "player") {
      onPlace(p);
      return;
    }
    if (p[0] === s.player[0] && p[1] === s.player[1]) {
      drag.current = "player";
      onSelect(null);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const m = getMob(p);
    if (m) {
      drag.current = { id: m.id, offset: [p[0] - m.x, p[1] - m.y] };
      onSelect(m.id);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      drag.current = "player";
      onMove(p);
      onSelect(null);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const p = tile(e);
    if (last.current?.[0] === p[0] && last.current?.[1] === p[1]) return;
    pending.current = p;
    if (scheduled.current === null)
      scheduled.current = requestAnimationFrame(flush);
  }
  function flush() {
    scheduled.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p || !drag.current) return;
    last.current = p;
    const { s, onMove, onDrag } = actions.current;
    if (drag.current === "player") {
      onMove(p);
      return;
    }
    const { id, offset } = drag.current,
      m = s.mobs.find((n) => n.id === id);
    if (m) onDrag({ ...m, x: p[0] - offset[0], y: p[1] - offset[1] });
  }
  function endDrag() {
    if (scheduled.current !== null) cancelAnimationFrame(scheduled.current);
    flush();
    drag.current = null;
    last.current = null;
  }
  const upright = (x: number, y: number) =>
    south ? `rotate(180 ${x} ${y})` : undefined;
  return (
    <div className="arena-wrap">
      <div className="north">{south ? "SOUTH" : "NORTH"} ↑</div>
      <svg
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 580 600"
        className="arena"
        role="img"
        aria-label="Inferno arena. Click to move; drag monsters; double-click to remove."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => {
          const m = getMob(tile(e));
          if (m) {
            drag.current = null;
            onRemove(m.id);
          }
        }}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#eadcba" />
          </marker>
        </defs>
        <g transform={south ? "translate(580 600) rotate(180)" : undefined}>
          <Tiles
            mobs={s.mobs}
            pillars={s.pillars}
            enabled={showLos}
            selected={selected}
          />
          {showSpawns &&
            SPAWNS.map(([x, y], i) => (
              <g key={i}>
                <rect
                  x={x * 20}
                  y={(y - 2) * 20}
                  width="60"
                  height="60"
                  fill="none"
                  stroke="#a39c8b"
                  strokeDasharray="3 4"
                />
                <text
                  x={(x + 1.5) * 20}
                  y={(y - 0.5) * 20}
                  fill="#b6b2a8"
                  fontSize="13"
                  textAnchor="middle"
                  transform={upright((x + 1.5) * 20, (y - 0.5) * 20)}
                >
                  {i + 1}
                </text>
              </g>
            ))}
          {PILLARS.map((p, i) => (
            <g key={p.name}>
              <rect
                x={p.x * 20 + 1}
                y={(p.y - 2) * 20 + 1}
                width="58"
                height="58"
                className={"pillar " + (s.pillars[i] ? "standing" : "fallen")}
              />
              <text
                x={(p.x + 1.5) * 20}
                y={(p.y - 0.5) * 20 + 4}
                className="pillar-label"
                fontSize="11"
                textAnchor="middle"
                transform={upright((p.x + 1.5) * 20, (p.y - 0.5) * 20)}
              >
                {p.name[0]}
                {s.pillarHp?.[i] !== undefined ? " " + s.pillarHp[i] : ""}
              </text>
            </g>
          ))}
          {s.mobs.map((m) => {
            const n = NPCS[m.type],
              old = before?.mobs.find((o) => o.id === m.id);
            return old && (old.x !== m.x || old.y !== m.y) ? (
              <g key={"move" + m.id} className="movement">
                <rect
                  x={old.x * 20 + 2}
                  y={(old.y - n.size + 1) * 20 + 2}
                  width={n.size * 20 - 4}
                  height={n.size * 20 - 4}
                  fill="none"
                  stroke={n.color}
                  strokeDasharray="4 3"
                  opacity=".7"
                />
                <line
                  x1={(old.x + n.size / 2) * 20}
                  y1={(old.y + 1 - n.size / 2) * 20}
                  x2={(m.x + n.size / 2) * 20}
                  y2={(m.y + 1 - n.size / 2) * 20}
                  stroke="#eadcba"
                  strokeWidth="2.5"
                  markerEnd="url(#arrow)"
                />
              </g>
            ) : null;
          })}
          {s.mobs.map((m) => {
            const n = NPCS[m.type],
              cx = (m.x + n.size / 2) * 20,
              cy = (m.y + 1 - n.size / 2) * 20;
            const attack = frame?.attacks.find((a) => a.id === m.id),
              cue = frame?.cues.find((c) => c.id === m.id),
              pending = m.pendingStyle;
            const imageSize = Math.max(n.size * 20 - 4, 22);
            return (
              <g key={m.id} data-testid={`mob-${m.id}`}>
                <rect
                  x={m.x * 20 + 2}
                  y={(m.y - n.size + 1) * 20 + 2}
                  width={n.size * 20 - 4}
                  height={n.size * 20 - 4}
                  rx="2"
                  fill={n.color}
                  fillOpacity=".06"
                  stroke={n.color}
                  strokeWidth={selected === m.id ? 3 : 1}
                />
                <image
                  href={icon(m.type)}
                  x={cx - imageSize / 2}
                  y={cy - imageSize / 2}
                  width={imageSize}
                  height={imageSize}
                  transform={upright(cx, cy)}
                  pointerEvents="none"
                />
                <rect
                  x={m.x * 20 + 3}
                  y={m.y * 20 + 13}
                  width="4"
                  height="4"
                  fill={n.color}
                />
                {(attack || cue || pending) && (
                  <g transform={upright(cx, cy)}>
                    <rect
                      x={cx - 25}
                      y={cy - imageSize / 2 - 18}
                      width="50"
                      height="17"
                      rx="3"
                      fill="#111d"
                    />
                    <text
                      x={cx}
                      y={cy - imageSize / 2 - 6}
                      fill={attack ? colors[attack.style] : "#eee0a3"}
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {attack
                        ? "ATTACK"
                        : cue?.kind === "scan"
                          ? "SCAN"
                          : pending
                            ? `IN ${m.pendingTicks}`
                            : "CUE"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {frame?.attacks.map((a) => {
            const m = s.mobs.find((m) => m.id === a.id)!;
            return (
              <line
                key={`${tick}-${a.id}`}
                className="attack-ray"
                x1={(m.x + NPCS[m.type].size / 2) * 20}
                y1={(m.y + 1 - NPCS[m.type].size / 2) * 20}
                x2={s.player[0] * 20 + 10}
                y2={s.player[1] * 20 + 10}
                stroke={colors[a.style]}
                strokeWidth="3"
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            );
          })}
          <g
            data-testid="player"
            transform={upright(s.player[0] * 20 + 10, s.player[1] * 20 + 10)}
            pointerEvents="none"
          >
            <circle
              cx={s.player[0] * 20 + 10}
              cy={s.player[1] * 20 + 10}
              r="10"
              fill="#1e1b15"
              stroke="#eee1a8"
              strokeWidth="2"
            />
            <image
              href={icon("player")}
              x={s.player[0] * 20}
              y={s.player[1] * 20 - 2}
              width="20"
              height="24"
            />
            {frame?.prayer && (
              <image
                href={prayerIcon(frame.prayer)}
                x={s.player[0] * 20 + 1}
                y={s.player[1] * 20 - 21}
                width="18"
                height="18"
              />
            )}
          </g>
        </g>
      </svg>
      <div className="arena-help">
        Click to move · Drag to arrange · Double-click to remove
      </div>
    </div>
  );
}
