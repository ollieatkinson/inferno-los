import { useRef, useState } from "react";
import type { Prayer } from "./model";
import { usePrayerSounds } from "./usePrayerSounds";

// Same local-circle / tick-committed protection model as inferno-tips.
export function usePrayerController(
  sound: boolean,
  volume: number,
  onError: () => void,
) {
  const selectedRef = useRef<Prayer | null>(null);
  const litRef = useRef<Prayer[]>([]);
  const [selected, setSelected] = useState<Prayer | null>(null);
  const [active, setActive] = useState<Prayer | null>(null);
  const [lit, setLit] = useState<Prayer[]>([]);
  const sounds = usePrayerSounds(sound, volume, onError);
  function display(prayer: Prayer | null) {
    litRef.current = prayer ? [prayer] : [];
    setLit(litRef.current);
    setActive(prayer);
  }
  return {
    selected,
    selectedRef,
    active,
    lit,
    toggle(prayer: Prayer) {
      const wasLit = litRef.current.includes(prayer);
      litRef.current = wasLit
        ? litRef.current.filter((p) => p !== prayer)
        : [...litRef.current, prayer];
      setLit(litRef.current);
      sounds.queue(prayer, !wasLit);
      selectedRef.current = selectedRef.current === prayer ? null : prayer;
      setSelected(selectedRef.current);
    },
    commit(prayer = selectedRef.current) {
      display(prayer);
      sounds.flush();
    },
    restore(prayer: Prayer | null) {
      sounds.reset();
      selectedRef.current = prayer;
      setSelected(prayer);
      display(prayer);
    },
  };
}
