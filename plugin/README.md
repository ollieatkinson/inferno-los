# Inferno LoS — RuneLite plugin

A standalone RuneLite plugin project. Open and copy links for wave starts or current positions in the Inferno LoS website.

## Development

Install JDK 17 and ensure `JAVA_HOME` points to it, then:

```sh
./gradlew test jar
./gradlew run
```

`run` launches a development RuneLite client with Inferno LoS loaded. Enable the plugin and open its sidebar. Run the website with `npm run dev` in the parent project. The default Website URL is `http://localhost:5173/`; set it to a hosted site when one is deployed.

The sidebar uses explicit user clicks to open a browser or copy links. It captures coordinates and pillar state, and provides no in-game prayer recommendations. Current snapshots are taken on the client thread; Swing UI updates run on the EDT. The website handles LoS exploration and prayer practice.

Links use compact `IL2-…` codes. Deploy the matching website before distributing this plugin version; older websites that only accept `#v1=` cannot read the new codes. The updated website can still read old links.

Wave-start capture reads NPC spawn events before NPC movement. A short bounded batch joins chat/spawn events in either order. Missing spawn batches are not substituted with a later resurrection or a mid-wave snapshot. History persists after leaving until a new wave 1, plugin shutdown, or client restart. Enabling the plugin mid-wave only provides current positions until a genuine next wave start is observed.

## Packaging

`./gradlew jar` produces `build/libs/inferno-los-plugin-0.1.0.jar`. The test launcher is for local development, not a Plugin Hub installation route. This directory can be copied into a separate repository; it has its own Gradle wrapper, settings, source, tests and `runelite-plugin.properties`. The compiled fixture tests have no dependency on the parent website source.

A published Plugin Hub entry would need its own repository, review/submission and a deployed website URL. None has been submitted automatically. See the parent [plan](../PLAN.md) and [link contract](../docs/LINKS.md).

The parent [release guide](../docs/RELEASE.md) includes Cloudflare Pages settings, Windows/Linux build commands, an in-game test checklist, and the Plugin Hub submission manifest. The Hub build mode is explicitly `standard`; local test dependencies are not bundled into the plugin.
