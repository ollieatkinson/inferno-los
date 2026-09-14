package com.infernolos;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Captures spawn-event coordinates before the first movement update. */
final class WaveRecorder
{
    private final Map<Integer, Map<Integer, Snapshot.Mob>> batches = new LinkedHashMap<>();
    private final Map<Integer, Snapshot> history = new LinkedHashMap<>();
    private Integer wave;
    private int pendingTick = -1;
    private int[] startPlayer;
    private boolean[] startPillars;

    void spawned(int tick, Snapshot.Mob mob)
    {
        batches.computeIfAbsent(tick, ignored -> new LinkedHashMap<>()).putIfAbsent(mob.id, mob);
    }
    void waveStarted(int number, int tick, int[] player, boolean[] pillars)
    {
        // Duplicate chat messages must not erase a finished capture.
        if (wave != null && wave == number) return;
        if (number == 1) history.clear();
        wave = number; pendingTick = tick;
        startPlayer = player.clone(); startPillars = pillars.clone();
    }
    Snapshot endTick(int tick)
    {
        Snapshot record = null;
        if (pendingTick >= 0)
        {
            List<Snapshot.Mob> spawns = new ArrayList<>();
            // Chat and NPC events can arrive in either order within the same game tick.
            // Wait one full tick, allowing the next spawn update but never later resurrections.
            for (int t = pendingTick; t <= Math.min(tick, pendingTick + 1); t++)
                spawns.addAll(batches.getOrDefault(t, Collections.emptyMap()).values());
            if (tick > pendingTick && !spawns.isEmpty())
            {
                Map<Integer, Snapshot.Mob> unique = new LinkedHashMap<>();
                for (Snapshot.Mob spawn : spawns) unique.putIfAbsent(spawn.id, spawn);
                record = new Snapshot("wave", wave, startPlayer, startPillars, new ArrayList<>(unique.values()), warnings());
                history.put(wave, record); pendingTick = -1;
            }
            else if (tick > pendingTick + 1) pendingTick = -1;
        }
        batches.keySet().removeIf(t -> t < tick - 2);
        return record;
    }
    List<String> warnings()
    {
        return wave != null && wave == 69 ? Collections.singletonList("Zuk, the shield and Zuk healers are not simulated. This link contains supported adds only.") : Collections.emptyList();
    }
    Integer wave() { return wave; }
    List<Snapshot> history() { return new ArrayList<>(history.values()); }
    void leave() { wave = null; pendingTick = -1; batches.clear(); }
    void clear() { leave(); history.clear(); }
}
