import { useEffect, useRef, type RefObject } from "react";

export const TICK_MS = 600;
export type ClockMode = "idle" | "playing" | "paused";

export function useGameClock(
  mode: ClockMode,
  epoch: number,
  onTick: () => void,
  onIdleTick: () => void,
  onStall: () => void,
) {
  const deadline = useRef<number | null>(null);
  const callbacks = useRef({ onTick, onIdleTick, onStall });
  callbacks.current = { onTick, onIdleTick, onStall };
  useEffect(() => {
    if (mode === "paused") {
      deadline.current = null;
      return;
    }
    let next = performance.now() + TICK_MS;
    deadline.current = next;
    let timer: number;
    const tick = () => {
      const now = performance.now();
      if (mode === "playing" && now - next > 250) {
        deadline.current = null;
        callbacks.current.onStall();
        return;
      }
      next += TICK_MS;
      if (next <= now) next = now + TICK_MS;
      deadline.current = next;
      if (mode === "playing") callbacks.current.onTick();
      else callbacks.current.onIdleTick();
      timer = window.setTimeout(tick, Math.max(0, next - performance.now()));
    };
    timer = window.setTimeout(tick, TICK_MS);
    return () => window.clearTimeout(timer);
  }, [mode, epoch]);
  return deadline;
}

export function TickMeter({
  deadline,
  paused,
}: {
  deadline: RefObject<number | null>;
  paused: boolean;
}) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number;
    const paint = () => {
      const progress =
        deadline.current === null
          ? 0
          : Math.max(
              0,
              Math.min(1, 1 - (deadline.current - performance.now()) / TICK_MS),
            );
      const visible = reducedMotion.matches
        ? Math.floor(progress * 4) / 4
        : progress;
      if (bar.current) bar.current.style.transform = `scaleX(${visible})`;
      frame = window.requestAnimationFrame(paint);
    };
    paint();
    return () => window.cancelAnimationFrame(frame);
  }, [deadline, paused]);
  return (
    <div className="tick-track" aria-hidden="true">
      <div ref={bar} style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
