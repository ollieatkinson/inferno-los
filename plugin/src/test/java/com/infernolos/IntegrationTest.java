package com.infernolos;

import com.google.gson.Gson;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import net.runelite.api.*;
import net.runelite.api.coords.WorldPoint;
import org.junit.Test;
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

public class IntegrationTest
{
    private final int[] player={16,5};
    private final boolean[] pillars={true,false,true};
    private Snapshot.Mob ranger(int id,int x){return new Snapshot.Mob(id,NpcKind.RANGER,x,5);}
    @Test public void eventOrderAndSpawnCoordinatesSurviveMovement()
    {
        for(boolean spawnFirst:new boolean[]{true,false})
        {
            WaveRecorder r=new WaveRecorder();
            if(spawnFirst)r.spawned(100,ranger(40,22));
            r.waveStarted(31,100,player,pillars);
            if(!spawnFirst)r.spawned(100,ranger(40,22));
            assertNull(r.endTick(100));r.spawned(101,ranger(40,21));
            Snapshot s=r.endTick(101);assertEquals(22,s.mobs.get(0).x);assertEquals(Integer.valueOf(31),s.wave);
            r.spawned(105,ranger(45,1));r.endTick(105);assertEquals(1,r.history().get(0).mobs.size());
        }
    }
    @Test public void historySurvivesLeavingAndResetsOnNewRun()
    {
        WaveRecorder r=new WaveRecorder();r.waveStarted(30,1,player,pillars);r.spawned(1,ranger(1,1));r.endTick(2);
        r.leave();assertEquals(1,r.history().size());assertNull(r.wave());
        r.waveStarted(1,10,player,pillars);assertTrue(r.history().isEmpty());
        r.spawned(10,new Snapshot.Mob(2,NpcKind.NIBBLER,5,5));r.endTick(11);
        r.waveStarted(1,11,player,pillars);assertEquals(1,r.history().size());
    }
    @Test public void lateResurrectionsAreNotWaveStarts()
    {
        WaveRecorder r=new WaveRecorder();r.waveStarted(63,100,player,pillars);r.endTick(101);r.endTick(102);
        r.spawned(103,ranger(2,22));assertNull(r.endTick(103));assertTrue(r.history().isEmpty());
    }
    @Test public void snapshotsAreImmutableAndFinalWaveIsExplicit()
    {
        Snapshot s=new Snapshot("current",63,player,pillars,Collections.singletonList(ranger(1,22)),Collections.emptyList());
        player[0]=0;pillars[0]=false;s.player()[0]=1;
        assertArrayEquals(new int[]{16,5},s.player());assertTrue(s.pillars()[0]);
        WaveRecorder r=new WaveRecorder();r.waveStarted(69,1,player,pillars);assertTrue(r.warnings().get(0).contains("Zuk"));
    }
    @Test public void javaProducesTheBrowserFixture() throws Exception
    {
        Snapshot s=new Snapshot("wave",63,player,pillars,Arrays.asList(new Snapshot.Mob(41,NpcKind.MAGER,20,8),new Snapshot.Mob(6,NpcKind.RANGER,22,12)),Collections.emptyList());
        Gson gson=new Gson();String url=s.toUrl("https://example.org/inferno/?old#old",gson);
        assertEquals("/inferno/",URI.create(url).getPath());assertNull(URI.create(url).getQuery());
        String json=URLDecoder.decode(URI.create(url).getRawFragment().substring(3),StandardCharsets.UTF_8);
        assertEquals(gson.toJson(s),json);assertEquals(6,s.mobs.get(0).id);
        Path fixture=Path.of("build","fixtures","wave-url.txt");Files.createDirectories(fixture.getParent());
        Files.writeString(fixture,s.toUrl("http://127.0.0.1:5173/",gson));
    }
    @Test public void invalidUrlsAreRejected()
    {
        Snapshot s=new Snapshot("current",null,player,pillars,Collections.emptyList(),Collections.emptyList());
        for(String base:Arrays.asList("javascript:alert(1)","file:///tmp/test","data:text/html,test","https://user:pass@example.org","not a url"))
        {try{s.toUrl(base,new Gson());fail(base);}catch(IllegalArgumentException expected){}}
    }
    @Test public void npcMappingsAndRegionBoundsMatchTheWebsite()
    {
        assertArrayEquals(new int[]{16,5},SceneCapture.grid(WorldPoint.fromRegion(9043,33,41,0)));
        assertNull(SceneCapture.grid(WorldPoint.fromRegion(9042,33,41,0)));
        assertEquals(NpcKind.MAGE_BLOB,NpcKind.fromId(7694));assertEquals(NpcKind.MELEE_BLOB,NpcKind.fromId(7696));assertEquals(NpcKind.RANGER,NpcKind.fromId(7702));
        assertFalse(SceneCapture.fits(new int[]{27,5},4));
    }
    @Test public void currentCaptureReadsPlayerAndLiveNpcsAtClickTime()
    {
        Client c=mock(Client.class);WorldView v=mock(WorldView.class);Scene scene=mock(Scene.class);
        when(c.getTopLevelWorldView()).thenReturn(v);when(c.getWorldView(-1)).thenReturn(v);when(v.getId()).thenReturn(-1);
        when(v.getBaseX()).thenReturn(1000);when(v.getBaseY()).thenReturn(2000);when(v.getSizeX()).thenReturn(104);when(v.getSizeY()).thenReturn(104);
        when(v.isInstance()).thenReturn(true);when(v.getScene()).thenReturn(scene);when(scene.getTiles()).thenReturn(new Tile[4][1][1]);
        int[][][] chunks=new int[4][13][13];
        for(int x=0;x<13;x++)for(int y=0;y<13;y++)chunks[0][x][y]=((2240/8+x)<<14)|((5312/8+y)<<3);
        when(v.getInstanceTemplateChunks()).thenReturn(chunks);
        Player p=mock(Player.class);when(c.getLocalPlayer()).thenReturn(p);when(p.getWorldView()).thenReturn(v);when(p.getWorldLocation()).thenReturn(new WorldPoint(1033,2041,0));
        NPC n=mock(NPC.class);when(n.getId()).thenReturn(7699);when(n.getIndex()).thenReturn(42);when(n.getWorldView()).thenReturn(v);when(n.getWorldLocation()).thenReturn(new WorldPoint(1037,2038,0));
        NPC dead=mock(NPC.class);when(dead.getId()).thenReturn(7698);when(dead.isDead()).thenReturn(true);
        IndexedObjectSet<NPC> npcs=mock(IndexedObjectSet.class);doReturn(npcs).when(v).npcs();
        when(npcs.iterator()).thenAnswer(ignored->Arrays.asList(n,dead).iterator());
        SceneCapture capture=new SceneCapture(c);Snapshot first=capture.current(63,Collections.emptyList());
        assertEquals("current",first.kind);assertArrayEquals(new int[]{16,5},first.player());assertEquals(1,first.mobs.size());assertEquals(20,first.mobs.get(0).x);
        when(n.getWorldLocation()).thenReturn(new WorldPoint(1038,2038,0));
        Snapshot second=capture.current(63,Collections.emptyList());assertEquals(21,second.mobs.get(0).x);assertEquals(20,first.mobs.get(0).x);
    }
    @Test public void pillarObjectsAreReadAtTheirFootprintRatherThanTheirCentre()
    {
        Client c=mock(Client.class);WorldView v=mock(WorldView.class);Scene scene=mock(Scene.class);
        when(c.getTopLevelWorldView()).thenReturn(v);when(c.getWorldView(-1)).thenReturn(v);when(v.getId()).thenReturn(-1);
        when(v.isInstance()).thenReturn(true);when(v.getScene()).thenReturn(scene);
        int[][][] chunks=new int[4][13][13];
        for(int x=0;x<13;x++)for(int y=0;y<13;y++)chunks[0][x][y]=((2240/8+x)<<14)|((5312/8+y)<<3);
        when(v.getInstanceTemplateChunks()).thenReturn(chunks);
        Tile tile=mock(Tile.class);GameObject north=mock(GameObject.class);
        when(north.getId()).thenReturn(30354);when(north.getSceneMinLocation()).thenReturn(new Point(34,39));
        when(tile.getGameObjects()).thenReturn(new GameObject[]{north});
        Tile[][][] tiles=new Tile[4][1][1];tiles[0][0][0]=tile;when(scene.getTiles()).thenReturn(tiles);
        SceneCapture capture=new SceneCapture(c);assertArrayEquals(new boolean[]{false,true,false},capture.pillars());
        when(tile.getGameObjects()).thenReturn(new GameObject[0]);assertArrayEquals(new boolean[]{false,false,false},capture.pillars());
    }
    @Test public void instanceFootprintsAndRotatedChunksUseSouthwestAnchor()
    {
        Client c=mock(Client.class);WorldView v=mock(WorldView.class);
        when(c.getTopLevelWorldView()).thenReturn(v);when(c.getWorldView(-1)).thenReturn(v);
        when(v.getId()).thenReturn(-1);when(v.getBaseX()).thenReturn(1000);when(v.getBaseY()).thenReturn(2000);
        when(v.isInstance()).thenReturn(true);when(v.getSizeX()).thenReturn(104);when(v.getSizeY()).thenReturn(104);
        int[][][] chunks=new int[4][13][13];
        for(int x=0;x<13;x++)for(int y=0;y<13;y++)chunks[0][x][y]=((2240/8+x)<<14)|((5312/8+y)<<3);
        when(v.getInstanceTemplateChunks()).thenReturn(chunks);
        NPC n=mock(NPC.class);when(n.getId()).thenReturn(7699);when(n.getIndex()).thenReturn(42);when(n.getWorldView()).thenReturn(v);when(n.getWorldLocation()).thenReturn(new WorldPoint(1037,2038,0));
        SceneCapture capture=new SceneCapture(c);Snapshot.Mob m=capture.mob(n);
        assertNotNull(m);assertEquals(20,m.x);assertEquals(8,m.y);assertEquals(42,m.id);
        chunks[0][4][5]|=1<<1;when(n.getId()).thenReturn(7698);when(n.getWorldLocation()).thenReturn(new WorldPoint(1033,2041,0));
        m=capture.mob(n);assertNotNull(m);assertEquals(19,m.x);assertEquals(5,m.y);
        when(n.isDead()).thenReturn(true);assertNull(capture.mob(n));
    }
}
