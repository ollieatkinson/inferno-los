package com.infernolos;

import net.runelite.client.RuneLite;
import net.runelite.client.externalplugins.ExternalPluginManager;

public final class InfernoLosLauncher
{
    public static void main(String[] args) throws Exception
    {
        ExternalPluginManager.loadBuiltin(InfernoLosPlugin.class);
        RuneLite.main(args);
    }
}
