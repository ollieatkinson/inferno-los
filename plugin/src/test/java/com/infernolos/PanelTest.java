package com.infernolos;

import java.awt.Component;
import java.awt.Container;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import javax.swing.JButton;
import javax.swing.SwingUtilities;
import org.junit.Test;
import static org.junit.Assert.*;

public class PanelTest
{
    private List<JButton> buttons(Container parent)
    {
        List<JButton> found=new ArrayList<>();
        for(Component c:parent.getComponents()){if(c instanceof JButton)found.add((JButton)c);if(c instanceof Container)found.addAll(buttons((Container)c));}
        return found;
    }
    @Test public void pluginStartsAndStopsOnRunelitesEventThread() throws Exception
    {
        InfernoLosPlugin plugin=new InfernoLosPlugin();
        net.runelite.client.ui.ClientToolbar toolbar=org.mockito.Mockito.mock(net.runelite.client.ui.ClientToolbar.class);
        java.lang.reflect.Field field=InfernoLosPlugin.class.getDeclaredField("toolbar");field.setAccessible(true);field.set(plugin,toolbar);
        SwingUtilities.invokeAndWait(()->{
            try {plugin.startUp();plugin.shutDown();}catch(Exception e){throw new AssertionError(e);}
        });
        org.mockito.Mockito.verify(toolbar).addNavigation(org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(toolbar).removeNavigation(org.mockito.ArgumentMatchers.any());
    }
    @Test public void currentAndSavedWaveActionsRemainAvailableInCorrectStates() throws Exception
    {
        SwingUtilities.invokeAndWait(()->{
            AtomicInteger current=new AtomicInteger(),copies=new AtomicInteger(),opened=new AtomicInteger();
            InfernoLosPanel panel=new InfernoLosPanel(current::incrementAndGet,copies::incrementAndGet,(s,copy)->{if(copy)copies.incrementAndGet();else opened.set(s.wave);});
            Snapshot snapshot=new Snapshot("wave",63,new int[]{16,5},new boolean[]{true,true,true},Collections.emptyList(),Collections.emptyList());
            panel.render(true,63,Collections.singletonList(snapshot));
            JButton now=buttons(panel).stream().filter(b->b.getText().startsWith("Current")).findFirst().get();
            now.doClick();assertEquals(1,current.get());
            buttons(panel).stream().filter(b->b.getText().startsWith("Wave 63")).findFirst().get().doClick();assertEquals(63,opened.get());
            panel.render(false,null,Collections.singletonList(snapshot));assertFalse(now.isEnabled());
            assertTrue(buttons(panel).stream().filter(b->b.getText().startsWith("Wave 63")).findFirst().get().isEnabled());
            buttons(panel).stream().filter(b->b.getText().equals("Copy")&&b.isEnabled()).findFirst().get().doClick();assertEquals(1,copies.get());
        });
    }
}
