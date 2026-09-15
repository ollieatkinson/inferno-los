import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Arena, icon, prayerIcon } from "./Arena";
import {
  NPCS,
  PILLARS,
  emptyScenario,
  exampleScenario,
  type Mob,
  type NpcType,
  type Prayer,
  type Scenario,
  type Tile,
} from "./model";
import { blocked, canAttack, legal, styles } from "./geometry";
import { decodeLink, encodeLink, encodeShareCode } from "./links";
import { encodeScout } from "./scout";
import { Simulation } from "./simulation";
import { DRILLS, drillScenario, score, type Drill } from "./trainer";
import "./style.css";

function usePreference<T extends string | boolean>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      return typeof saved === typeof fallback ? saved : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage may be disabled. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
const prayers: Prayer[] = ["mage", "range", "melee"];
const prayerName: Record<Prayer, string> = {
  mage: "Magic",
  range: "Missiles",
  melee: "Melee",
};
const basics: NpcType[] = [
  "bat",
  "blob",
  "melee",
  "ranger",
  "mager",
  "nibbler",
  "jad",
];
function PrayerImage({ prayer }: { prayer: Prayer }) {
  return (
    <img
      src={prayerIcon(prayer)}
      alt={prayerName[prayer]}
      width="27"
      height="27"
    />
  );
}

function App() {
  const [initial] = useState(() => {
    try {
      return { data: decodeLink(location.href), error: "" };
    } catch (e) {
      return { data: null, error: (e as Error).message };
    }
  });
  const [scenario, setScenario] = useState<Scenario>(
    initial.data?.scenario ?? exampleScenario(),
  );
  const sim = useRef(new Simulation(scenario));
  const studyScene = useRef(scenario);
  const [mode, setMode] = useState<NpcType | "player">("player");
  const [selected, setSelected] = useState<number | null>(null);
  const [south, setSouth] = usePreference<boolean>("inferno-los-south", false);
  const [theme, setTheme] = usePreference<"dark" | "light">(
    "inferno-los-theme",
    "dark",
  );
  const [showLos, setShowLos] = useState(true),
    [showSpawns, setShowSpawns] = useState(false);
  const [message, setMessage] = useState(initial.error),
    [input, setInput] = useState("");
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [tick, setTick] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(600);
  const [replay, setReplay] = useState(initial.data?.steps ?? []),
    [replayTick, setReplayTick] = useState(0);
  const [trainer, setTrainer] = useState(false),
    [hints, setHints] = useState(true),
    [drill, setDrill] = useState<Drill>("alternating");
  const [finished, setFinished] = useState(false);
  const jadTraining = trainer && (drill === "jad" || drill === "triple-jad");
  const stepRef = useRef(() => {}),
    playRef = useRef(playing);
  const tapeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tape = tapeRef.current;
    const latest = tape?.querySelector("tr.latest");
    if (!tape) return;
    if (tick === 0) {
      tape.scrollTop = 0;
      return;
    }
    if (latest) {
      const row = latest.getBoundingClientRect(),
        area = tape.getBoundingClientRect();
      if (row.bottom > area.bottom) tape.scrollTop += row.bottom - area.bottom;
      else if (row.top < area.top + 30)
        tape.scrollTop -= area.top + 30 - row.top;
    }
  }, [tick]);
  playRef.current = playing;
  const frame = sim.current.frames.at(-1),
    before =
      tick > 1 ? sim.current.frames[tick - 2]?.scenario : sim.current.initial;
  const preview = sim.current.preview(scenario.player, prayer);
  const nextStyles = [...new Set(preview.attacks.map((a) => a.style))];
  const results = score(sim.current.frames);
  const focused = scenario.mobs.find((m) => m.id === selected);
  const visible = scenario.mobs.filter((m) =>
    canAttack(m, scenario.player, scenario.pillars),
  );
  const threatStyles = [
    ...new Set(visible.flatMap((m) => styles(m, scenario.player))),
  ];
  useEffect(() => {
    document.documentElement.dataset.theme =
      theme === "light" ? "light" : "dark";
  }, [theme]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => stepRef.current(), speed);
    return () => clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden && playRef.current) {
        setPlaying(false);
        setMessage(
          "Paused while this tab is hidden. Resume when you are ready.",
        );
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  function loadScene(s: Scenario) {
    setPlaying(false);
    sim.current = new Simulation(s);
    setScenario(s);
    setTick(0);
    setSelected(null);
    setFinished(false);
    setReplay([]);
    setReplayTick(0);
    setPrayer(null);
  }
  function edit(s: Scenario) {
    loadScene({
      ...s,
      kind: "custom",
      mobs: s.mobs.map(
        ({
          cooldown: _,
          pendingStyle: __,
          pendingTicks: ___,
          attackCount: ____,
          ...m
        }) => m,
      ),
    });
  }
  function movePlayer(p: Tile) {
    if (blocked(p, scenario.pillars) || finished) return;
    setScenario({ ...scenario, player: p });
    if (replay.length) {
      setPlaying(false);
      setReplay([]);
    }
  }
  function place(p: Tile) {
    if (mode === "player") return;
    if (scenario.mobs.length >= 64) {
      setMessage("The scene supports up to 64 monsters.");
      return;
    }
    const m: Mob = {
      id: Math.max(0, ...scenario.mobs.map((m) => m.id)) + 1,
      type: mode,
      x: p[0],
      y: p[1],
    };
    if (legal(m, scenario)) {
      edit({ ...scenario, mobs: [...scenario.mobs, m] });
      setMode("player");
      setSelected(m.id);
    } else setMessage("There is not enough space for that monster here.");
  }
  function drag(m: Mob) {
    if (legal(m, scenario)) {
      edit({
        ...scenario,
        mobs: scenario.mobs.map((n) => (n.id === m.id ? m : n)),
      });
      setSelected(m.id);
    }
  }
  function remove(id: number) {
    edit({ ...scenario, mobs: scenario.mobs.filter((m) => m.id !== id) });
  }
  function step() {
    if (finished) return;
    if (tick >= (trainer ? 60 : 256)) {
      setPlaying(false);
      setFinished(trainer);
      return;
    }
    const action = replay[replayTick];
    const f = sim.current.step(
      action?.player ?? scenario.player,
      action ? action.prayer : prayer,
    );
    setScenario(f.scenario);
    setTick(sim.current.frames.length);
    if (action) {
      setPrayer(action.prayer);
      setReplayTick(replayTick + 1);
      if (replayTick + 1 >= replay.length) setPlaying(false);
    }
    if (trainer && sim.current.frames.length >= 60) {
      setPlaying(false);
      setFinished(true);
    }
  }
  stepRef.current = step;
  function reset() {
    const initial = structuredClone(sim.current.initial),
      saved = replay;
    loadScene(initial);
    setReplay(saved);
  }
  function back() {
    if (tick === 0) return;
    setPlaying(false);
    setFinished(false);
    sim.current.rewind(tick - 1);
    setScenario(sim.current.scenario);
    setTick(tick - 1);
    setPrayer(sim.current.steps.at(-1)?.prayer ?? null);
    setReplayTick(Math.max(0, replayTick - 1));
  }
  function togglePrayer(p: Prayer | null) {
    setPrayer((old) => (old === p ? null : p));
  }
  function chooseDrill(d: Drill) {
    setDrill(d);
    loadScene(drillScenario(d, studyScene.current));
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,textarea,select") ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      const key = e.key.toLowerCase();
      if (key === " ") {
        e.preventDefault();
        if (!playing) step();
        return;
      }
      if (e.repeat) return;
      if (["1", "2", "3", "0"].includes(key)) {
        e.preventDefault();
        togglePrayer(key === "0" ? null : prayers[Number(key) - 1]);
        return;
      }
      if (key === "p") {
        e.preventDefault();
        if (!finished) setPlaying((v) => !v);
      }
      if (key === "r") {
        e.preventDefault();
        reset();
      }
      if (key === "delete" && selected !== null) {
        e.preventDefault();
        remove(selected);
      }
      const directions: Record<string, Tile> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (directions[e.key]) {
        e.preventDefault();
        const d = directions[e.key],
          factor = south ? -1 : 1;
        movePlayer([
          scenario.player[0] + factor * d[0],
          scenario.player[1] + factor * d[1],
        ]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(label + " copied.");
    } catch {
      setInput(value);
      setMessage("Copy the text from the link/code field.");
    }
  }
  function loadInput() {
    try {
      const data = decodeLink(input);
      if (!data) throw new Error("Paste a position link or Scouter code.");
      loadScene(data.scenario);
      setReplay(data.steps);
      setMessage(
        data.steps.length ? "Replay loaded. Press Play." : "Scene loaded.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function exportCode() {
    try {
      void copy(encodeScout(scenario), "Scouter code");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <main>
      <header>
        <h1>
          <img src={icon("mager")} alt="" /> Inferno <span>LoS</span>
        </h1>
        <nav aria-label="Tool mode">
          <button
            aria-pressed={!trainer}
            onClick={() => {
              if (trainer) {
                setTrainer(false);
                loadScene(structuredClone(studyScene.current));
              }
            }}
          >
            Explore
          </button>
          <button
            aria-pressed={trainer}
            onClick={() => {
              if (!trainer) {
                studyScene.current = structuredClone(scenario);
                setTrainer(true);
                chooseDrill(drill);
              }
            }}
          >
            Prayer trainer
          </button>
        </nav>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "☾ Dark mode" : "☀ Light mode"}
        </button>
      </header>
      <section className="toolbar" aria-label="Scene tools">
        <button
          className="unit"
          aria-pressed={mode === "player"}
          onClick={() => setMode("player")}
        >
          <img src={icon("player")} alt="" />
          Player
        </button>
        {basics.map((type) => (
          <button
            className="unit"
            key={type}
            aria-pressed={mode === type}
            onClick={() => setMode(type)}
          >
            <img src={icon(type)} alt="" />
            {NPCS[type].name}
          </button>
        ))}
        <details className="more-units">
          <summary>More ▾</summary>
          <div>
            {(
              ["meleeBlob", "rangeBlob", "mageBlob", "healer"] as NpcType[]
            ).map((type) => (
              <button key={type} onClick={() => setMode(type)}>
                <img src={icon(type)} alt="" />
                {NPCS[type].name}
              </button>
            ))}
          </div>
        </details>
        <button onClick={() => loadScene(emptyScenario())}>Clear</button>
      </section>
      <div className="options">
        {!jadTraining && <span>Pillars:</span>}
        {!jadTraining &&
          PILLARS.map((p, i) => (
            <button
              key={p.name}
              aria-pressed={scenario.pillars[i]}
              onClick={() => {
                const pillars = [...scenario.pillars] as Scenario["pillars"];
                pillars[i] = !pillars[i];
                const s = { ...scenario, pillars, pillarHp: undefined };
                if (
                  blocked(s.player, pillars) ||
                  s.mobs.some((m) => !legal(m, s, false))
                ) {
                  setMessage("Move away from that pillar before restoring it.");
                  return;
                }
                edit(s);
              }}
            >
              {p.name} {scenario.pillars[i] ? "✓" : "×"}
            </button>
          ))}
        <label>
          <input
            type="checkbox"
            checked={south}
            onChange={(e) => setSouth(e.target.checked)}
          />
          South at top
        </label>
        <label>
          <input
            type="checkbox"
            checked={showLos}
            onChange={(e) => setShowLos(e.target.checked)}
          />
          LoS tiles
        </label>
        <label>
          <input
            type="checkbox"
            checked={showSpawns}
            onChange={(e) => setShowSpawns(e.target.checked)}
          />
          Spawns
        </label>
      </div>
      <form
        className="link-input"
        onSubmit={(e) => {
          e.preventDefault();
          loadInput();
        }}
      >
        <input
          aria-label="Position link or Scouter code"
          placeholder="Paste a share link, IL2 code or Inferno Scouter code…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Load</button>
        <button
          type="button"
          onClick={() =>
            copy(encodeLink(scenario, location.href), "Position link")
          }
        >
          Share position
        </button>
        <details>
          <summary>More ▾</summary>
          <div>
            <button
              type="button"
              onClick={() => copy(encodeShareCode(scenario), "Share code")}
            >
              Copy share code
            </button>
            <button type="button" onClick={exportCode}>
              Copy Scouter code
            </button>
            <button
              type="button"
              disabled={tick === 0}
              onClick={() =>
                copy(
                  encodeLink(
                    sim.current.initial,
                    location.href,
                    sim.current.steps,
                  ),
                  "Replay link",
                )
              }
            >
              Copy replay link
            </button>
            <button type="button" onClick={() => loadScene(exampleScenario())}>
              Example stack
            </button>
          </div>
        </details>
      </form>
      {message && (
        <div className="notice" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {scenario.warnings?.map((w, i) => (
        <div className="notice" key={i}>
          {w}
        </div>
      ))}
      <div className="workbench">
        <section className="board">
          <div className="board-header">
            <strong>
              {scenario.wave
                ? `Wave ${scenario.wave}`
                : trainer
                  ? DRILLS[drill]
                  : "Custom stack"}
            </strong>
            <span>
              {scenario.kind === "wave"
                ? "Wave start"
                : scenario.kind === "current"
                  ? "Current positions"
                  : "Explore freely"}
            </span>
            <span>{scenario.player.join(", ")}</span>
          </div>
          <Arena
            scenario={scenario}
            before={tick ? before : undefined}
            frame={frame}
            tick={tick}
            mode={mode}
            south={south}
            showLos={showLos}
            showSpawns={showSpawns}
            showPillars={!jadTraining}
            playing={playing}
            tickMs={speed}
            selected={selected}
            onMove={movePlayer}
            onPlace={place}
            onDrag={drag}
            onSelect={setSelected}
            onRemove={remove}
          />
        </section>
        <aside>
          <section className="right-controls">
            {" "}
            <div className="playback">
              <button aria-label="Reset simulation" onClick={reset}>
                ↺ Reset
              </button>
              <button
                aria-label="Back one tick"
                disabled={tick === 0 || playing}
                onClick={back}
              >
                ← Back
              </button>
              <button disabled={finished} onClick={() => setPlaying(!playing)}>
                {playing ? "Ⅱ Pause" : "▶ Play"}
              </button>
              <button
                className="primary"
                disabled={playing || finished}
                onClick={step}
              >
                Step +1 <kbd>Space</kbd>
              </button>
              <strong data-testid="tick-count">
                Tick {tick}
                {trainer ? " / 60" : ""}
              </strong>
            </div>
            <div className="tick-track">
              {playing && (
                <div
                  key={`${tick}-${speed}`}
                  style={{ animationDuration: `${speed}ms` }}
                />
              )}
            </div>
          </section>
          {trainer && (
            <section className="trainer-controls">
              <label>
                Practice{" "}
                <select
                  aria-label="Practice drill"
                  value={drill}
                  onChange={(e) => chooseDrill(e.target.value as Drill)}
                >
                  {Object.entries(DRILLS).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="trainer-options">
                <label>
                  Tick speed{" "}
                  <select
                    aria-label="Tick speed"
                    value={speed}
                    onChange={(e) => {
                      setPlaying(false);
                      setSpeed(Number(e.target.value));
                    }}
                  >
                    <option value={600}>Game · 0.6s</option>
                    <option value={1000}>Slow · 1s</option>
                    <option value={1500}>Learn · 1.5s</option>
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={hints}
                    onChange={(e) => setHints(e.target.checked)}
                  />
                  Prayer hints
                </label>
              </div>
              <p>
                Use 1 / 2 / 3 to switch prayers. Press Play for a 60-tick drill,
                or Space to learn one tick at a time.
                {drill === "triple-jad" &&
                  " The three Jads take turns, three ticks apart."}
              </p>
            </section>
          )}
          <section className="prayer-panel">
            <h2>{trainer ? "Your prayer" : "Choose your prayer"}</h2>
            <div className="prayers">
              {prayers.map((p, i) => (
                <button
                  key={p}
                  aria-label={"Protect from " + prayerName[p]}
                  aria-pressed={prayer === p}
                  onClick={() => togglePrayer(p)}
                >
                  <PrayerImage prayer={p} />
                  <span>{prayerName[p]}</span>
                  <kbd>{i + 1}</kbd>
                </button>
              ))}
              <button
                className="off"
                aria-pressed={prayer === null}
                onClick={() => setPrayer(null)}
              >
                Off<kbd>0</kbd>
              </button>
            </div>
            {(!trainer || hints) && (
              <div className="next-prayer" aria-live="polite">
                <span className="label">NEXT TICK</span>
                <div className="recommendation">
                  {nextStyles.length === 0 ? (
                    <strong>No attack</strong>
                  ) : (
                    nextStyles.map((p) => (
                      <span key={p}>
                        <PrayerImage prayer={p} />
                        <strong>{prayerName[p]}</strong>
                      </span>
                    ))
                  )}
                </div>
                <p>
                  {nextStyles.length > 1
                    ? "Conflicting attacks — move or change the stack timing."
                    : nextStyles.length === 1
                      ? `Protect from ${prayerName[nextStyles[0]]} before stepping.`
                      : preview.cues.some((c) => c.kind === "scan")
                        ? "Blob scan next: choose magic or ranged; switch three ticks later."
                        : "A chance to turn your prayer off."}
                </p>
              </div>
            )}
            {trainer && !hints && (
              <p className="muted">
                {jadTraining
                  ? "Hints hidden. Watch Jad’s attack animation and switch prayers before the hit."
                  : "Hints hidden. Read the attack countdowns and keep the rhythm."}
              </p>
            )}
            {frame && (
              <div
                className={
                  "last-tick " +
                  (frame.attacks.length
                    ? frame.attacks.every((a) => a.style === frame.prayer)
                      ? "success"
                      : "failure"
                    : "")
                }
                role="status"
              >
                <strong>
                  Tick {tick}:{" "}
                  {frame.attacks.length
                    ? frame.attacks.every((a) => a.style === frame.prayer)
                      ? "Protected ✓"
                      : "Missed prayer ✕"
                    : frame.cues.length
                      ? "Watch the cue"
                      : "No attack"}
                </strong>
                <div>
                  {frame.attacks.map((a) => (
                    <span key={a.id}>
                      <PrayerImage prayer={a.style} />
                      {
                        NPCS[scenario.mobs.find((m) => m.id === a.id)!.type]
                          .name
                      }
                    </span>
                  ))}
                  {frame.cues.map((c) => (
                    <span key={c.id}>
                      {c.kind === "scan" ? "Blob scanned" : "Jad winds up"} →{" "}
                      <PrayerImage prayer={c.style} /> in 3 ticks
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
          {trainer && (
            <section className="score-panel">
              <h2>
                {finished ? "Drill complete" : "Your score"}{" "}
                <strong>
                  {results.accuracy === null ? "—" : results.accuracy + "%"}
                </strong>
              </h2>
              <div className="stats">
                <span>
                  <b>
                    {results.protectedHits}/{results.totalHits}
                  </b>
                  Protected
                </span>
                <span>
                  <b>{results.missed}</b>Missed
                </span>
                <span>
                  <b>{results.bestStreak}</b>Best streak
                </span>
              </div>
              <p>
                Prayer off on {results.idleOff}/{results.idleTicks} idle ticks.
                {results.conflicts > 0
                  ? ` ${results.conflicts} ticks had conflicting styles.`
                  : ""}
              </p>
              {finished && (
                <button className="primary" onClick={reset}>
                  Try again
                </button>
              )}
            </section>
          )}
          <details className="mob-details">
            <summary>Monsters · {visible.length} can see you ▾</summary>
            <section className="mob-list">
              {scenario.mobs.length === 0 ? (
                <p className="muted">
                  Choose a monster above, then click the arena.
                </p>
              ) : (
                scenario.mobs.map((m) => (
                  <button
                    className={selected === m.id ? "selected" : ""}
                    key={m.id}
                    onClick={() => setSelected(selected === m.id ? null : m.id)}
                  >
                    <img src={icon(m.type)} alt="" />
                    <span>
                      {NPCS[m.type].name}
                      <small>#{m.id}</small>
                    </span>
                    <span className="mob-status">
                      {m.pendingStyle ? (
                        <>
                          <PrayerImage prayer={m.pendingStyle} />
                          {m.pendingTicks} ticks
                        </>
                      ) : m.type === "nibbler" ? (
                        "Pillar"
                      ) : canAttack(m, scenario.player, scenario.pillars) ? (
                        `Attack in ${Math.max(1, m.cooldown ?? 0)}`
                      ) : (
                        "Blocked"
                      )}
                    </span>
                  </button>
                ))
              )}
              {focused && (
                <div className="edit-npc">
                  <label>
                    Initial attack delay{" "}
                    <input
                      type="number"
                      aria-label="Initial attack delay"
                      min="0"
                      max="100"
                      value={focused.cooldown ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isInteger(v) && v >= 0 && v <= 100) {
                          const id = focused.id;
                          loadScene({
                            ...scenario,
                            mobs: scenario.mobs.map((m) =>
                              m.id === id
                                ? {
                                    ...m,
                                    cooldown: v,
                                    pendingStyle: undefined,
                                    pendingTicks: undefined,
                                  }
                                : m,
                            ),
                          });
                          setSelected(id);
                        }
                      }}
                    />{" "}
                    ticks
                  </label>
                  <button onClick={() => remove(focused.id)}>
                    Remove monster
                  </button>
                </div>
              )}
              {!trainer && (
                <p className="muted">
                  {threatStyles.length === 0
                    ? "No attacks have line of sight from the current positions."
                    : "Visible styles: " + threatStyles.join(" / ") + "."}{" "}
                  All monsters’ LoS stays visible when selecting or dragging.
                </p>
              )}
            </section>
          </details>
          <section className="timeline">
            <h2>
              Ticks{" "}
              <small>
                {replay.length
                  ? `Replay ${replayTick} / ${replay.length}`
                  : "Attack / scan"}
              </small>
            </h2>
            <div className="tape vertical" ref={tapeRef}>
              <table>
                <thead>
                  <tr>
                    <th>Tick</th>
                    {sim.current.initial.mobs
                      .filter((m) => m.type !== "nibbler")
                      .map((m) => (
                        <th key={m.id}>
                          <img
                            src={icon(m.type)}
                            alt={NPCS[m.type].name}
                            title={`${NPCS[m.type].name} #${m.id}`}
                          />
                        </th>
                      ))}
                    <th>You</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(8, tick) }, (_, i) => {
                    const f = sim.current.frames[i];
                    return (
                      <tr key={i} className={i === tick - 1 ? "latest" : ""}>
                        <th>{i + 1}</th>
                        {sim.current.initial.mobs
                          .filter((m) => m.type !== "nibbler")
                          .map((m) => {
                            const a = f?.attacks.find((a) => a.id === m.id),
                              cue = f?.cues.find((c) => c.id === m.id);
                            return (
                              <td
                                key={m.id}
                                className={
                                  a
                                    ? a.style === f.prayer
                                      ? "covered"
                                      : "missed"
                                    : cue
                                      ? "scan"
                                      : ""
                                }
                              >
                                {a ? (
                                  <PrayerImage prayer={a.style} />
                                ) : cue ? (
                                  <span
                                    title={
                                      cue.kind === "scan"
                                        ? "Blob prayer scan"
                                        : "Jad windup"
                                    }
                                  >
                                    {cue.kind === "scan" ? "◎" : "↑"}
                                  </span>
                                ) : i < tick ? (
                                  "·"
                                ) : (
                                  ""
                                )}
                              </td>
                            );
                          })}
                        <td>
                          {f?.prayer ? (
                            <PrayerImage prayer={f.prayer} />
                          ) : i < tick ? (
                            "—"
                          ) : (
                            ""
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
      <details className="help">
        <summary>Controls, timing & credits</summary>
        <p>
          <kbd>Space</kbd> step · <kbd>P</kbd> play/pause · <kbd>R</kbd> reset ·
          arrows move · <kbd>1</kbd> magic · <kbd>2</kbd> ranged · <kbd>3</kbd>{" "}
          melee · <kbd>0</kbd> off. Double-click a monster to remove it. Player
          placement explores tiles instantly; stepping advances NPC movement.
        </p>
        <p>
          Current-position links do not contain live attack cooldowns. Set
          initial delays to practice a known stack. Blobs scan your prayer and
          attack three ticks later; Jad cues precede the prayer check by three
          ticks. Random styles are repeatable for practice. This is a LoS and
          prayer tool, not a full combat simulator: melee digs, resurrections,
          nibbler AI, damage and Zuk/shield mechanics are not modeled.
        </p>
        <p>
          Scouter codes describe the nine initial spawn slots, with optional
          index ranks and pillar HP. Use position links for moved stacks.
          Trainer scores measure protection at simulated prayer checks; an
          idle-tick count is not a prayer-point drain calculation.
        </p>
        <p>
          Inspired by{" "}
          <a href="https://github.com/Supalosa/osrs-colosseum">
            Supalosa's Colosseum LoS
          </a>
          , <a href="https://ifreedive-osrs.github.io/">iFreedive</a>,{" "}
          <a href="https://bistools.github.io/inferno.html">Backseat</a>,{" "}
          <a href="https://github.com/jeremiah855/inferno-scouter">
            Inferno Scouter
          </a>{" "}
          and{" "}
          <a href="https://github.com/OldSchoolSDK/InfernoTrainer">
            Inferno Trainer
          </a>
          . OSRS artwork © Jagex; prayer icons via the OSRS Wiki.{" "}
          <a href="https://github.com/ollieatkinson/inferno-los">Source code</a>
          .
        </p>
      </details>
    </main>
  );
}
const root = createRoot(document.getElementById("root")!);
const render = () =>
  root.render(
    <React.StrictMode>
      <App key={location.hash + location.search} />
    </React.StrictMode>,
  );
window.addEventListener("hashchange", render);
window.addEventListener("popstate", render);
render();
