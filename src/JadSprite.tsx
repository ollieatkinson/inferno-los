import { useLayoutEffect, useRef, type SVGProps } from "react";
import type { Prayer } from "./model";

type Style = "mage" | "range";
const counts = { mage: 32, range: 13 };
const frameUrl = (style: Style, frame: number) =>
  `./icons/jad/jad_${style}_${frame}.png`;
const idle = frameUrl("mage", 1);
let preloaded = false;

// Original captures are 10 fps: six image frames per game tick.
// Only this SVG image changes between ticks; LoS and React's arena stay idle.
export function JadSprite({
  tick,
  playing,
  tickMs,
  pendingStyle,
  pendingTicks,
  ...props
}: SVGProps<SVGImageElement> & {
  tick: number;
  playing: boolean;
  tickMs: number;
  pendingStyle?: Prayer;
  pendingTicks?: number;
}) {
  const image = useRef<SVGImageElement>(null);
  const animation = useRef<{ style: Style; startTick: number } | null>(null);
  const progress = useRef({ tick: -1, fraction: 0 });
  useLayoutEffect(() => {
    if (!preloaded) {
      preloaded = true;
      for (const style of ["mage", "range"] as const)
        for (let frame = 1; frame <= counts[style]; frame++)
          new Image().src = frameUrl(style, frame);
    }
    if (tick === 0 || tick < progress.current.tick) animation.current = null;
    if (
      (pendingStyle === "mage" || pendingStyle === "range") &&
      pendingTicks !== undefined
    )
      animation.current = {
        style: pendingStyle,
        startTick: tick - (3 - pendingTicks),
      };
    if (progress.current.tick !== tick)
      progress.current = { tick, fraction: 0 };
    const current = animation.current;
    const node = image.current!;
    if (!current) {
      node.setAttribute("href", idle);
      return;
    }
    const start = performance.now();
    const fraction = progress.current.fraction;
    let request = 0;
    let previous = "";
    const paint = (now: number) => {
      const withinTick = Math.min(
        0.999,
        fraction + (playing ? (now - start) / tickMs : 0),
      );
      progress.current.fraction = withinTick;
      const frame = Math.floor((tick - current.startTick + withinTick) * 6) + 1;
      const url =
        frame <= counts[current.style] ? frameUrl(current.style, frame) : idle;
      if (url !== previous) {
        node.setAttribute("href", url);
        previous = url;
      }
      if (playing && frame < counts[current.style] && withinTick < 0.999)
        request = requestAnimationFrame(paint);
    };
    paint(start);
    return () => cancelAnimationFrame(request);
  }, [tick, playing, tickMs, pendingStyle, pendingTicks]);
  return <image {...props} ref={image} href={idle} data-testid="jad-sprite" />;
}
