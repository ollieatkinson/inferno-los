package com.infernolos;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Immutable client-thread capture. Contains no account or world information. */
final class Snapshot
{
    final int version = 1;
    final String kind;
    final Integer wave;
    private final int[] player;
    private final boolean[] pillars;
    final List<Mob> mobs;
    final List<String> warnings;

    Snapshot(String kind, Integer wave, int[] player, boolean[] pillars, List<Mob> mobs, List<String> warnings)
    {
        this.kind = kind; this.wave = wave;
        this.player = player.clone(); this.pillars = pillars.clone();
        List<Mob> ordered = new ArrayList<>(mobs); ordered.sort(Comparator.comparingInt(m -> m.id));
        this.mobs = Collections.unmodifiableList(ordered);
        this.warnings = Collections.unmodifiableList(new ArrayList<>(warnings));
    }
    int[] player() { return player.clone(); }
    boolean[] pillars() { return pillars.clone(); }
    String toUrl(String base)
    {
        URI uri;
        try { uri = URI.create(base.trim()); } catch (RuntimeException e) { throw new IllegalArgumentException("Set a valid Website URL in Inferno LoS settings."); }
        if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null)
            throw new IllegalArgumentException("Website URL must be an http:// or https:// address.");
        String path = uri.getRawPath() == null ? "/" : uri.getRawPath();
        return uri.getScheme() + "://" + uri.getRawAuthority() + path + "#" + ShareCode.encode(this);
    }
    static final class Mob
    {
        final int id;
        final String type;
        final int x;
        final int y;
        Mob(int id, NpcKind kind, int x, int y) { this.id = id; this.type = kind.key; this.x = x; this.y = y; }
    }
}
