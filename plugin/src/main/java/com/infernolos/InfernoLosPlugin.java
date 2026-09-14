package com.infernolos;

import com.google.gson.Gson;
import com.google.inject.Provides;
import java.awt.Toolkit;
import java.awt.datatransfer.StringSelection;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.inject.Inject;
import javax.swing.SwingUtilities;
import net.runelite.api.ChatMessageType;
import net.runelite.api.Client;
import net.runelite.api.GameState;
import net.runelite.api.events.ChatMessage;
import net.runelite.api.events.GameStateChanged;
import net.runelite.api.events.GameTick;
import net.runelite.api.events.NpcSpawned;
import net.runelite.client.callback.ClientThread;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.util.LinkBrowser;
import net.runelite.client.util.ImageUtil;
import net.runelite.client.util.Text;

@PluginDescriptor(name = "Inferno LoS", description = "Wave-start and current-position links to an interactive Inferno LoS website", tags = {"inferno", "los", "waves"})
public final class InfernoLosPlugin extends Plugin
{
    private static final Pattern WAVE = Pattern.compile("^Wave: (\\d+)$");
    @Inject private Client client;
    @Inject private ClientThread clientThread;
    @Inject private ClientToolbar toolbar;
    @Inject private InfernoLosConfig config;
    @Inject private SceneCapture capture;
    @Inject private Gson gson;
    private final WaveRecorder recorder = new WaveRecorder();
    private InfernoLosPanel panel;
    private NavigationButton navigation;
    private boolean inside;
    private volatile boolean active;

    @Provides InfernoLosConfig provideConfig(ConfigManager manager) { return manager.getConfig(InfernoLosConfig.class); }
    @Override protected void startUp() throws Exception
    {
        active = true;
        onEdt(() -> {
            panel = new InfernoLosPanel(() -> openCurrent(false), () -> openCurrent(true), this::open);
            navigation = NavigationButton.builder().tooltip("Inferno LoS")
                .icon(ImageUtil.resizeImage(ImageUtil.loadImageResource(getClass(), "icon.png"), 32, 32))
                .priority(7).panel(panel).build();
            toolbar.addNavigation(navigation);
        });
    }
    @Override protected void shutDown() throws Exception
    {
        active = false; inside = false; recorder.clear();
        onEdt(() -> { if (navigation != null) toolbar.removeNavigation(navigation); panel = null; navigation = null; });
    }
    private static void onEdt(Runnable action) throws Exception
    {
        if (SwingUtilities.isEventDispatchThread()) action.run();
        else SwingUtilities.invokeAndWait(action);
    }
    @Subscribe public void onChatMessage(ChatMessage event)
    {
        if (event.getType() != ChatMessageType.GAMEMESSAGE || !capture.inInferno()) return;
        Matcher matcher = WAVE.matcher(Text.removeTags(event.getMessage()));
        if (!matcher.matches()) return;
        int wave = Integer.parseInt(matcher.group(1));
        int[] player = capture.player();
        if (wave >= 1 && wave <= 69 && SceneCapture.fits(player, 1))
            recorder.waveStarted(wave, client.getTickCount(), player, capture.pillars());
    }
    @Subscribe public void onNpcSpawned(NpcSpawned event)
    {
        if (!capture.inInferno()) return;
        Snapshot.Mob mob = capture.mob(event.getNpc());
        if (mob != null) recorder.spawned(client.getTickCount(), mob);
    }
    @Subscribe public void onGameTick(GameTick event)
    {
        boolean now = capture.inInferno();
        boolean changed = now != inside;
        if (!now && inside) recorder.leave();
        inside = now;
        Snapshot added = now ? recorder.endTick(client.getTickCount()) : null;
        if (changed || added != null) refresh();
    }
    @Subscribe public void onGameStateChanged(GameStateChanged event)
    {
        if (event.getGameState() == GameState.LOGIN_SCREEN || event.getGameState() == GameState.HOPPING)
        {
            inside = false; recorder.leave(); refresh();
        }
    }
    private void refresh()
    {
        boolean in = inside; Integer wave = recorder.wave(); List<Snapshot> history = recorder.history();
        SwingUtilities.invokeLater(() -> { if (active && panel != null) panel.render(in, wave, history); });
    }
    private void openCurrent(boolean copy)
    {
        clientThread.invokeLater(() -> {
            if (!active) return;
            try { open(capture.current(recorder.wave(), recorder.warnings()), copy); }
            catch (RuntimeException e) { message(e.getMessage()); }
        });
    }
    private void open(Snapshot snapshot, boolean copy)
    {
        if (!active) return;
        try
        {
            String url = snapshot.toUrl(config.websiteUrl(), gson);
            SwingUtilities.invokeLater(() -> {
                if (!active) return;
                if (copy)
                {
                    try { Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(url), null); message("LoS link copied."); }
                    catch (RuntimeException e) { message("Clipboard unavailable. Use the open button."); }
                }
                else LinkBrowser.browse(url);
            });
        }
        catch (IllegalArgumentException e) { message(e.getMessage()); }
    }
    private void message(String message)
    {
        SwingUtilities.invokeLater(() -> { if (active && panel != null) panel.message(message); });
    }
}
