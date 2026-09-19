import type { RefObject } from "react";
import type { Prayer } from "./model";
import { TickMeter } from "./GameClock";

export const prayerName: Record<Prayer, string> = {
  mage: "Magic",
  range: "Missiles",
  melee: "Melee",
};
const prayers: Prayer[] = ["mage", "range", "melee"];

export function PrayerControls({
  lit,
  active,
  onPrayer,
  onRetry,
  deadline,
  paused,
}: {
  lit: Prayer[];
  active: Prayer | null;
  onPrayer: (prayer: Prayer) => void;
  onRetry?: () => void;
  deadline: RefObject<number | null>;
  paused: boolean;
}) {
  return (
    <>
      <div className="prayers">
        {prayers.map((prayer) => (
          <button
            key={prayer}
            type="button"
            aria-label={`Protect from ${prayerName[prayer]}`}
            aria-pressed={lit.includes(prayer)}
            data-lit={lit.includes(prayer)}
            onPointerDown={(event) => {
              if (
                event.button !== 0 ||
                (!event.isPrimary && event.pointerType !== "touch")
              )
                return;
              // Pointer input keeps keyboard focus where it was, so Space can
              // still step the map after a mouse/touch prayer press.
              event.preventDefault();
              onPrayer(prayer);
            }}
            onClick={(event) => {
              if (event.detail === 0) onPrayer(prayer);
            }}
            onKeyDown={(event) => {
              if (event.key === " ") event.stopPropagation();
            }}
          >
            <span className="prayer-icon">
              <img
                src={`./prayers/${prayer}.png`}
                width="30"
                height="30"
                alt=""
                draggable={false}
              />
            </span>
            <span>{prayerName[prayer]}</span>
          </button>
        ))}
      </div>
      <div className="prayer-clock">
        <span>
          {paused ? "Tick paused" : "Next tick"}
          <span>0.6s cycle</span>
        </span>
        <TickMeter deadline={deadline} paused={paused} />
      </div>
      <div className="active-prayer">
        <span>
          {onRetry
            ? "Drill complete"
            : `Active: ${active ? prayerName[active] : "None"}`}
        </span>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
      <p className="prayer-help">
        Click a prayer to toggle it. Circles settle on the tick.
      </p>
    </>
  );
}
