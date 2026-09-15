package com.infernolos;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

/** IL2 binary snapshots. Wire IDs match the website's documented share contract. */
final class ShareCode
{
    private static final List<String> TYPES = Arrays.asList("bat", "blob", "melee", "ranger", "mager", "nibbler", "mageBlob", "rangeBlob", "meleeBlob", "jad", "healer");
    private ShareCode() {}

    static String encode(Snapshot s)
    {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        int kind = Arrays.asList("wave", "current", "custom").indexOf(s.kind);
        if (kind < 0) throw new IllegalArgumentException("Unknown snapshot kind.");
        bytes.write(kind | (s.wave != null ? 4 : 0) | 16);
        int[] player = s.player();
        uint(bytes, player[1] * 29 + player[0]);
        boolean[] pillars = s.pillars();
        bytes.write((pillars[0] ? 1 : 0) | (pillars[1] ? 2 : 0) | (pillars[2] ? 4 : 0));
        if (s.wave != null) uint(bytes, s.wave);
        uint(bytes, s.mobs.size());
        for (Snapshot.Mob mob : s.mobs)
        {
            int type = TYPES.indexOf(mob.type);
            if (type < 0) throw new IllegalArgumentException("Unknown NPC type.");
            uint(bytes, mob.id);
            bytes.write(type);
            uint(bytes, mob.y * 29 + mob.x);
        }
        uint(bytes, s.warnings.size());
        for (String warning : s.warnings)
        {
            byte[] text = warning.getBytes(StandardCharsets.UTF_8);
            uint(bytes, text.length);
            bytes.write(text, 0, text.length);
        }
        uint(bytes, 0); // No replay runs in client snapshots.
        int hash = 0x811c9dc5;
        for (byte b : bytes.toByteArray()) hash = (hash ^ (b & 255)) * 0x01000193;
        for (int i = 0; i < 4; i++) bytes.write((hash >>> (i * 8)) & 255);
        return "IL2-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes.toByteArray());
    }

    private static void uint(ByteArrayOutputStream bytes, int n)
    {
        if (n < 0) throw new IllegalArgumentException("Invalid snapshot integer.");
        do
        {
            bytes.write((n & 127) | (n >= 128 ? 128 : 0));
            n >>>= 7;
        } while (n != 0);
    }
}
