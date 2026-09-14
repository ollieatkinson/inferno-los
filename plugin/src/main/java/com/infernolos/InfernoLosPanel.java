package com.infernolos;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.util.List;
import java.util.function.BiConsumer;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;
import net.runelite.client.ui.PluginPanel;

final class InfernoLosPanel extends PluginPanel
{
    private final JButton current = new JButton("Current LoS ↗");
    private final JButton copyCurrent = new JButton("Copy");
    private final JLabel status = new JLabel("Enter the Inferno to capture positions.");
    private final JPanel history = new JPanel();
    private final BiConsumer<Snapshot, Boolean> open;

    InfernoLosPanel(Runnable openCurrent, Runnable copy, BiConsumer<Snapshot, Boolean> open)
    {
        this.open = open;
        setLayout(new BorderLayout(0, 12));
        JPanel heading = new JPanel(); heading.setLayout(new BoxLayout(heading, BoxLayout.Y_AXIS));
        JLabel title = new JLabel("Inferno · Line of sight", SwingConstants.CENTER);
        title.setForeground(new Color(224, 194, 149));
        heading.add(title); heading.add(Box.createVerticalStrut(12));
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT, 2, 0));
        buttons.add(current); buttons.add(copyCurrent); heading.add(buttons);
        current.addActionListener(e -> openCurrent.run()); copyCurrent.addActionListener(e -> copy.run());
        current.setEnabled(false); copyCurrent.setEnabled(false);
        status.setBorder(BorderFactory.createEmptyBorder(10, 2, 0, 2));
        heading.add(status);
        JLabel help = new JLabel("<html><br>Wave starts are kept after leaving.<br>Open a link to move your character<br>and explore line of sight on the website.</html>");
        help.setForeground(Color.GRAY); heading.add(help);
        add(heading, BorderLayout.NORTH);
        history.setLayout(new BoxLayout(history, BoxLayout.Y_AXIS)); add(history, BorderLayout.CENTER);
        setBorder(BorderFactory.createEmptyBorder(14, 8, 14, 8));
    }
    void render(boolean inside, Integer wave, List<Snapshot> snapshots)
    {
        current.setEnabled(inside); copyCurrent.setEnabled(inside);
        status.setText(inside ? (wave == null ? "Current positions available." : "Wave " + wave) : "Outside Inferno · saved wave starts");
        history.removeAll();
        for (int i = snapshots.size() - 1; i >= 0; i--)
        {
            Snapshot snapshot = snapshots.get(i);
            JPanel row = new JPanel(new BorderLayout(4, 0));
            JButton start = new JButton("Wave " + snapshot.wave + " · Start ↗");
            start.setToolTipText(snapshot.mobs.size() + " NPCs captured at spawn");
            JButton copy = new JButton("Copy");
            start.addActionListener(e -> open.accept(snapshot, false)); copy.addActionListener(e -> open.accept(snapshot, true));
            row.add(start, BorderLayout.CENTER); row.add(copy, BorderLayout.EAST);
            row.setMaximumSize(new Dimension(Integer.MAX_VALUE, 32)); history.add(row); history.add(Box.createVerticalStrut(5));
        }
        if (snapshots.isEmpty()) history.add(new JLabel("No wave-start captures yet."));
        revalidate(); repaint();
    }
    void message(String text) { status.setText(text); status.setToolTipText(text); }
}
