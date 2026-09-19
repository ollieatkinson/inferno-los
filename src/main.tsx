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
import { waveScenario } from "./waves";
import { initialDig } from "./dig";
import { usePrayerController } from "./usePrayerController";
import { PrayerControls, prayerName } from "./PrayerControls";
import { useGameClock, TICK_MS } from "./GameClock";
import "./style.css";

function usePreference<T extends string | boolean | number>(
  key: string,
  fallback: T,
) {
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
  const [prayerSound, setPrayerSound] = usePreference<boolean>(
    "inferno-los-prayer-sound",
    true,
  );
  const [prayerVolume, setPrayerVolume] = usePreference<number>(
    "inferno-los-prayer-volume",
    50,
  );
  const [soundError, setSoundError] = useState(false);
  const prayerControls = usePrayerController(
    prayerSound,
    Math.max(0, Math.min(100, prayerVolume)),
    () => setSoundError(true),
  );
  const prayer = prayerControls.selected;
  const [tick, setTick] = useState(0),
    [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [clockEpoch, setClockEpoch] = useState(0);
  const [replay, setReplay] = useState(initial.data?.steps ?? []),
    [replayTick, setReplayTick] = useState(0);
  const [trainer, setTrainer] = useState(false),
    [hints, setHints] = useState(true),
    [drill, setDrill] = useState<Drill>("alternating");
  const [finished, setFinished] = useState(false);
  const [waveInput, setWaveInput] = useState(String(scenario.wave ?? 63));
  const jadTraining = scenario.wave === 67 || scenario.wave === 68;
  const stepRef = useRef(() => {}),
    playRef = useRef(playing);
  const clockMode = playing
    ? "playing"
    : !started || finished
      ? "idle"
      : "paused";
  const tickDeadline = useGameClock(
    clockMode,
    clockEpoch,
    () => stepRef.current(),
    () => prayerControls.commit(),
    () => {
      setPlaying(false);
      setMessage("Paused after a browser delay. Resume when you are ready.");
    },
  );
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
    setStarted(false);
    setClockEpoch((epoch) => epoch + 1);
    sim.current = new Simulation(s);
    setScenario(s);
    setTick(0);
    setSelected(null);
    setFinished(false);
    setReplay([]);
    setReplayTick(0);
    prayerControls.restore(null);
    if (s.wave !== undefined) setWaveInput(String(s.wave));
  }
  function spawnWave() {
    try {
      const s = waveScenario(Number(waveInput));
      setTrainer(false);
      setMode("player");
      studyScene.current = structuredClone(s);
      loadScene(s);
      setMessage(
        s.wave! < 67
          ? "Random practice spawn. Spawn wave reshuffles; Reset retries this layout. Nibblers are shown, but their movement and pillar damage are not simulated."
          : "Jad practice setup. Use Space to step or open Prayer trainer → My current stack.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
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
          dig: _____,
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
    setStarted(true);
    const action = replay[replayTick];
    const prayerAtTick = action
      ? action.prayer
      : prayerControls.selectedRef.current;
    const f = sim.current.step(action?.player ?? scenario.player, prayerAtTick);
    if (action) prayerControls.restore(prayerAtTick);
    else prayerControls.commit(prayerAtTick);
    setScenario(f.scenario);
    setTick(sim.current.frames.length);
    if (action) {
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
    setStarted(true);
    setFinished(false);
    sim.current.rewind(tick - 1);
    setScenario(sim.current.scenario);
    setTick(tick - 1);
    prayerControls.restore(sim.current.steps.at(-1)?.prayer ?? null);
    setReplayTick(Math.max(0, replayTick - 1));
  }
  function togglePlaying() {
    if (finished) return;
    setStarted(true);
    setPlaying((v) => !v);
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
      if (key === "p") {
        e.preventDefault();
        togglePlaying();
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
        <details className="site-settings">
          <summary
            onKeyDown={(e) => {
              if (e.key === " ") e.stopPropagation();
            }}
          >
            Settings
          </summary>
          <div>
            <label>
              <input
                type="checkbox"
                checked={prayerSound}
                onChange={(e) => {
                  setPrayerSound(e.target.checked);
                  setSoundError(false);
                }}
              />{" "}
              Prayer sounds
            </label>
            <label>
              Prayer volume{" "}
              <input
                type="range"
                aria-label="Prayer volume"
                min="0"
                max="100"
                value={prayerVolume}
                onChange={(e) => setPrayerVolume(Number(e.target.value))}
              />
              <output>{prayerVolume}%</output>
            </label>
            {soundError && (
              <p role="status">
                Prayer audio is unavailable. You can still use the visual tick
                cue.
              </p>
            )}
          </div>
        </details>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "☾ Dark mode" : "☀ Light mode"}
        </button>
      </header>
      <form
        className="wave-picker"
        onSubmit={(e) => {
          e.preventDefault();
          spawnWave();
        }}
      >
        <label htmlFor="wave-number">Wave</label>
        <input
          id="wave-number"
          type="number"
          min="1"
          max="68"
          step="1"
          required
          value={waveInput}
          onChange={(e) => setWaveInput(e.target.value)}
        />
        <button type="submit">Spawn wave</button>
        <span>1–66 random spawns · 67–68 Jads</span>
      </form>
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
                  : scenario.wave
                    ? "Practice setup"
                    : "Explore freely"}
            </span>
            <span>{scenario.player.join(", ")}</span>
          </div>
          <Arena
            scenario={scenario}
            before={tick ? before : undefined}
            frame={frame}
            activePrayer={prayerControls.active}
            tick={tick}
            mode={mode}
            south={south}
            showLos={showLos}
            showSpawns={showSpawns}
            showPillars={!jadTraining}
            playing={playing}
            tickMs={TICK_MS}
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
              <button disabled={finished} onClick={togglePlaying}>
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
                  <input
                    type="checkbox"
                    checked={hints}
                    onChange={(e) => setHints(e.target.checked)}
                  />
                  Prayer hints
                </label>
              </div>
              <p>
                Click prayers to toggle them. Press Play for a 60-tick drill at
                game speed, or Space to learn one tick at a time.
                {drill === "triple-jad" &&
                  " The three Jads take turns, three ticks apart."}
              </p>
            </section>
          )}
          <section className="prayer-panel">
            <h2>{trainer ? "Your prayer" : "Choose your prayer"}</h2>
            <PrayerControls
              lit={prayerControls.lit}
              active={prayerControls.active}
              onPrayer={prayerControls.toggle}
              deadline={tickDeadline}
              paused={clockMode === "paused"}
            />
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
                      : frame.digs.length
                        ? "Meleer digging"
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
                  {frame.digs.map((d) => (
                    <span key={`dig-${d.id}`}>
                      {d.phase === "burrow"
                        ? "Meleer burrows · emerges in 6 ticks"
                        : "Meleer emerges · attack delay 6 ticks"}
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
                      {m.dig?.remaining ? (
                        `Digging · ${m.dig.remaining} ticks`
                      ) : m.dig?.recovery ? (
                        `Emerging · ${m.cooldown} ticks`
                      ) : m.pendingStyle ? (
                        <>
                          <PrayerImage prayer={m.pendingStyle} />
                          {m.pendingTicks} ticks
                        </>
                      ) : m.type === "nibbler" ? (
                        "Pillar"
                      ) : canAttack(m, scenario.player, scenario.pillars) ? (
                        `Attack in ${Math.max(1, m.cooldown ?? 0)}`
                      ) : m.type === "melee" ? (
                        `Dig check in ${m.dig?.timer ?? 50}`
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
                  {focused.type === "melee" && (
                    <label>
                      Next dig check
                      <input
                        type="number"
                        aria-label="Next dig check"
                        min="0"
                        max="60"
                        value={focused.dig?.timer ?? 50}
                        onChange={(e) => {
                          const timer = Number(e.target.value);
                          if (
                            !Number.isInteger(timer) ||
                            timer < 0 ||
                            timer > 60
                          )
                            return;
                          const id = focused.id;
                          loadScene({
                            ...scenario,
                            mobs: scenario.mobs.map((m) =>
                              m.id === id
                                ? { ...m, dig: { ...initialDig(), timer } }
                                : m,
                            ),
                          });
                          setSelected(id);
                        }}
                      />{" "}
                      ticks
                    </label>
                  )}
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
                              cue = f?.cues.find((c) => c.id === m.id),
                              dig = f?.digs.find((d) => d.id === m.id);
                            return (
                              <td
                                key={m.id}
                                className={
                                  a
                                    ? a.style === f.prayer
                                      ? "covered"
                                      : "missed"
                                    : cue || dig
                                      ? "scan"
                                      : ""
                                }
                              >
                                {a ? (
                                  <PrayerImage prayer={a.style} />
                                ) : dig ? (
                                  <span
                                    title={
                                      dig.phase === "burrow"
                                        ? "Meleer burrows"
                                        : "Meleer emerges"
                                    }
                                  >
                                    {dig.phase === "burrow" ? "↓" : "↑"}
                                  </span>
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
      <section className="help" aria-labelledby="help-title">
        <h2 id="help-title">Controls, timing & credits</h2>
        <p>
          <kbd>Space</kbd> step · <kbd>P</kbd> play/pause · <kbd>R</kbd> reset ·
          arrows move. Click a prayer to toggle it. Double-click a monster to
          remove it. Player placement explores tiles instantly; stepping
          advances NPC movement.
        </p>
        <p>
          Current-position links do not contain live attack cooldowns. Set
          initial delays to practice a known stack. Blobs scan your prayer and
          attack three ticks later; Jad cues precede the prayer check by three
          ticks. Random styles are repeatable for practice. Meleers check for a
          dig after 50 ticks, then every 40–60 ticks, provided they cannot
          attack and have not hit in the last 15 ticks. Burrowing takes six
          ticks; resurfacing starts a six-tick attack delay. The dig schedule is
          repeatable for practice; imported positions start a fresh timer unless
          edited. This is not a full combat simulator: resurrections, nibbler
          AI, damage and Zuk/shield mechanics are not modeled.
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
          . OSRS artwork and sounds © Jagex.{" "}
          <a href="https://github.com/ollieatkinson/inferno-los">Source code</a>
          .
        </p>
      </section>
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
