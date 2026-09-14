package com.infernolos;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.inject.Inject;
import net.runelite.api.Client;
import net.runelite.api.GameObject;
import net.runelite.api.NPC;
import net.runelite.api.Point;
import net.runelite.api.Tile;
import net.runelite.api.WorldView;
import net.runelite.api.coords.LocalPoint;
import net.runelite.api.coords.WorldPoint;

final class SceneCapture
{
    static final int REGION = 9043;
    static final int[][] PILLARS = {{0, 9}, {17, 7}, {10, 23}};
    private final Client client;
    @Inject SceneCapture(Client client) { this.client = client; }

    boolean inInferno()
    {
        if (client.getLocalPlayer() == null) return false;
        LocalPoint local = LocalPoint.fromWorld(client.getLocalPlayer().getWorldView(), client.getLocalPlayer().getWorldLocation());
        return local != null && WorldPoint.fromLocalInstance(client, local).getRegionID() == REGION;
    }
    static int[] grid(WorldPoint point)
    {
        if (point == null || point.getRegionID() != REGION) return null;
        return new int[]{point.getRegionX() - 17, 46 - point.getRegionY()};
    }
    static boolean fits(int[] p, int size)
    {
        return p != null && p[0] >= 0 && p[0] + size <= 29 && p[1] < 30 && p[1] - size + 1 >= 0;
    }
    int[] player()
    {
        if (!inInferno()) return null;
        return grid(WorldPoint.fromLocalInstance(client, LocalPoint.fromWorld(client.getLocalPlayer().getWorldView(), client.getLocalPlayer().getWorldLocation())));
    }
    private int[] footprint(WorldView view, LocalPoint southwest, int size)
    {
        if (southwest == null) return null;
        int minX = Integer.MAX_VALUE, maxY = Integer.MIN_VALUE;
        for (int dx : new int[]{0, size - 1}) for (int dy : new int[]{0, size - 1})
        {
            LocalPoint corner = LocalPoint.fromScene(southwest.getSceneX() + dx, southwest.getSceneY() + dy, view);
            int[] p = grid(WorldPoint.fromLocalInstance(client, corner, view.getPlane()));
            if (p == null) return null;
            minX = Math.min(minX, p[0]); maxY = Math.max(maxY, p[1]);
        }
        return new int[]{minX, maxY};
    }
    Snapshot.Mob mob(NPC npc)
    {
        NpcKind type = NpcKind.fromId(npc.getId());
        if (type == null || npc.isDead()) return null;
        int[] p = footprint(npc.getWorldView(), LocalPoint.fromWorld(npc.getWorldView(), npc.getWorldLocation()), type.size);
        if (!fits(p, type.size)) return null;
        return new Snapshot.Mob(npc.getIndex(), type, p[0], p[1]);
    }
    boolean[] pillars()
    {
        boolean[] present = new boolean[3];
        WorldView view = client.getTopLevelWorldView();
        if (view == null || view.getScene() == null) return present;
        Tile[][] tiles = view.getScene().getTiles()[view.getPlane()];
        for (Tile[] column : tiles) for (Tile tile : column)
        {
            if (tile == null) continue;
            for (GameObject object : tile.getGameObjects())
            {
                if (object == null || object.getId() < 30353 || object.getId() > 30355) continue;
                Point min = object.getSceneMinLocation();
                int[] p = footprint(view, LocalPoint.fromScene(min.getX(), min.getY(), view), 3);
                for (int i = 0; i < PILLARS.length; i++) if (Arrays.equals(p, PILLARS[i])) present[i] = true;
            }
        }
        return present;
    }
    Snapshot current(Integer wave, List<String> warnings)
    {
        int[] player = player();
        if (!fits(player, 1)) throw new IllegalStateException("Enter the Inferno arena to capture current positions.");
        List<Snapshot.Mob> mobs = new ArrayList<>();
        List<String> notes = new ArrayList<>(warnings);
        for (NPC npc : client.getTopLevelWorldView().npcs())
        {
            Snapshot.Mob mob = mob(npc);
            if (mob != null) mobs.add(mob);
            else if (NpcKind.fromId(npc.getId()) != null && !npc.isDead()) notes.add("An NPC outside the supported arena was omitted: " + npc.getId());
        }
        return new Snapshot("current", wave, player, pillars(), mobs, notes);
    }
}
