# Cloudflare Pages and RuneLite release

## Current status

As of 15 September 2026, the website builds to `dist/` and the plugin builds to `plugin/build/libs/inferno-los-plugin-0.1.0.jar`. The plugin's pinned RuneLite version, 1.12.38, matches the Plugin Hub version checked on this date. Website and plugin automated checks pass; a logged-in Inferno playtest is still required. Cloudflare credentials are not configured in this workspace, no Git remote is configured, and neither hosting nor Plugin Hub submission has happened.

## Host on Cloudflare Pages

The website is static. It needs no Worker, database or API. Snapshot data is in the URL fragment and is read by the browser.

For automatic deployments, publish this repository to GitHub, then create a **Pages** project under Cloudflare **Workers & Pages**, importing that repository. Use these settings:

| Setting                | Value             |
| ---------------------- | ----------------- |
| Root directory         | Repository root   |
| Production branch      | `trunk`           |
| Build command          | `npm run build`   |
| Build output directory | `dist`            |
| Environment variable   | `NODE_VERSION=22` |

Cloudflare supplies the final `pages.dev` address. Use the actual assigned address, or a custom domain, in the plugin. See [Cloudflare's Vite guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/).

For a quick manual deployment, run `npm ci && npm run build` and upload the contents of `dist/` in the Pages dashboard. The prepared `build/inferno-los-pages.zip` contains those files with `index.html` at the archive root. Rebuild the archive after website changes. Alternatively, from the repository root:

```sh
npx wrangler@4 login
npx wrangler@4 pages project create inferno-los --production-branch trunk
npx wrangler@4 pages deploy dist --project-name inferno-los --branch trunk
```

Choose Git integration at creation time if you want Cloudflare to build on pushes: a Direct Upload project cannot later be converted to Git integration. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

After deployment, open the production address and paste a copied plugin link. Check that sprites load, the positions/pillars match, dragging keeps all monsters' LoS visible, Space steps, and a shared link survives a reload. Use the stable production address in `InfernoLosConfig.websiteUrl()` before publishing the plugin.

## Build and test the plugin locally

Install JDK 17, set `JAVA_HOME`, and run from the repository root:

```sh
plugin/gradlew -p plugin test jar
plugin/gradlew -p plugin run
```

On Windows PowerShell, use `plugin\gradlew.bat -p plugin test jar` and `plugin\gradlew.bat -p plugin run`. For a Jagex account, follow RuneLite's [development login guide](https://github.com/runelite/runelite/wiki/Using-Jagex-Accounts).

Enable **Inferno LoS** in the development client. Set its **Website URL** to `http://localhost:5173/` while `npm run dev` is running, or to the Cloudflare production address. Enter the Inferno and click **Current LoS ↗** in the sidebar. It captures the current player/NPC positions and pillar state on the client thread, then opens that snapshot in the browser. **Copy** copies the same link. This is a snapshot when clicked, not a continuously updating feed; live attack cooldowns are not captured.

Before submission, verify current captures after NPC movement, standing and destroyed pillars, wave-start captures, and history after leaving/re-entering. Check that the site agrees with the actual game positions. Automated mocks and a successful client startup do not replace these game checks.

For the complete automated suite, run Java tests first because they write the fixture used by Playwright:

```sh
npm ci
plugin/gradlew -p plugin test jar
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

## Submit to the Plugin Hub

Publish the contents of `plugin/` as a standalone public repository, with `build.gradle` and `runelite-plugin.properties` at its root. Keep the source, Gradle wrapper, license and attribution. Update the default website URL to the tested production address and make the standalone README link to that site. The plugin uses `build=standard`; its runtime dependencies come from RuneLite. Local JUnit/Mockito dependencies are only for tests.

Fork [runelite/plugin-hub](https://github.com/runelite/plugin-hub), create a branch, and add `plugins/inferno-los` containing the public plugin repository URL and its full, tested 40-character commit hash:

```ini
repository=https://github.com/ollieatkinson/inferno-los-plugin.git
commit=REPLACE_WITH_FULL_TESTED_COMMIT_HASH
```

The repository name above is a proposed name, not an existing published repository. Open a pull request describing the sidebar, wave/current links and external website. Include the production website URL and the live/automated testing performed. Address Hub CI/review feedback by updating the same PR's commit hash. RuneLite reviews and merges submissions before they become available through the Hub; distributing the local JAR is not the submission process. See the [official submission instructions](https://github.com/runelite/plugin-hub#submitting-a-plugin).
