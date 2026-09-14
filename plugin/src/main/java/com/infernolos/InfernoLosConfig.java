package com.infernolos;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;

@ConfigGroup("infernolos")
public interface InfernoLosConfig extends Config
{
    @ConfigItem(keyName = "websiteUrl", name = "Website URL", description = "Base URL of the Inferno LoS website. Local development: http://localhost:5173/", position = 0)
    default String websiteUrl() { return "http://localhost:5173/"; }
}
