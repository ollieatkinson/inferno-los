import { useEffect, useRef } from "react";
import type { Prayer } from "./model";

const files = [
  "mage-off",
  "mage-on",
  "range-off",
  "range-on",
  "melee-off",
  "melee-on",
];

export function usePrayerSounds(
  enabled: boolean,
  volume: number,
  onError: () => void,
) {
  const audio = useRef<{
    context: AudioContext | null;
    bytes: Promise<ArrayBuffer[]>;
    decoded?: Promise<Map<string, AudioBuffer>>;
    disposed: boolean;
  } | null>(null);
  const pending = useRef(new Set<string>());
  const generation = useRef(0);
  const error = useRef(onError);
  error.current = onError;
  useEffect(() => {
    pending.current.clear();
    if (!enabled) return;
    const abort = new AbortController();
    const instance = {
      context: null as AudioContext | null,
      bytes: Promise.all(
        files.map(async (file) => {
          const response = await fetch(`/sounds/${file}.ogg`, {
            signal: abort.signal,
          });
          if (!response.ok) throw new Error("Prayer sound unavailable");
          return response.arrayBuffer();
        }),
      ),
      disposed: false,
    };
    // Downloads can complete before the first click, without autoplaying audio.
    void instance.bytes.catch(() => {});
    audio.current = instance;
    return () => {
      instance.disposed = true;
      abort.abort();
      void instance.context?.close();
      audio.current = null;
    };
  }, [enabled]);

  async function prepare() {
    const instance = audio.current;
    if (!instance) return;
    try {
      // Unlock/decode on the press; playback waits for the game tick.
      const context = (instance.context ||= new AudioContext());
      const resumed = context.resume();
      instance.decoded ||= instance.bytes.then(
        async (bytes) =>
          new Map(
            await Promise.all(
              bytes.map(
                async (data, i) =>
                  [files[i], await context.decodeAudioData(data)] as const,
              ),
            ),
          ),
      );
      await Promise.all([instance.decoded, resumed]);
    } catch {
      if (!instance.disposed) error.current();
    }
  }
  function play(key: string) {
    if (!enabled || volume === 0 || !audio.current?.context) return;
    const instance = audio.current;
    const ticked = performance.now();
    const run = generation.current;
    void (async () => {
      try {
        const context = instance.context!;
        const buffers = await instance.decoded;
        // Do not replay a tick after slow loading or after leaving a drill.
        if (
          !buffers ||
          instance.disposed ||
          run !== generation.current ||
          performance.now() - ticked > 200
        )
          return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers.get(key)!;
        gain.gain.value = volume / 100;
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
      } catch {
        if (!instance.disposed) error.current();
      }
    })();
  }
  return {
    queue(prayer: Prayer, on: boolean) {
      if (!enabled || volume === 0) return;
      pending.current.add(`${prayer}-${on ? "on" : "off"}`);
      void prepare();
    },
    flush() {
      // The SDK retains one on/off flag per prayer and emits off before on.
      const sounds = files.filter((key) => pending.current.has(key));
      pending.current.clear();
      sounds.forEach(play);
    },
    reset() {
      pending.current.clear();
      generation.current++;
    },
  };
}
