# Cloudflare Pages and RuneLite release

## Current status

The website is maintained at [ollieatkinson/inferno-los](https://github.com/ollieatkinson/inferno-los), and the plugin at [ollieatkinson/inferno-los-plugin](https://github.com/ollieatkinson/inferno-los-plugin). Both have independent build checks. The website builds to `dist/`; it does not need Java. The user is configuring Cloudflare Pages at `inferno-los.pages.dev` with custom domain `los.inferno.tips`. DNS/HTTPS and hosted behavior still need verification. Plugin Hub submission and a logged-in Inferno playtest remain outstanding.

## Cloudflare Pages Git setup

The website is static. It needs no Worker, database or API. Snapshot data is in the URL fragment and is read by the browser.

Go to **Workers & Pages → Create application → Pages → Import from an existing Git repository**, then select `ollieatkinson/inferno-los`. Use these settings:

| Setting                | Value             |
| ---------------------- | ----------------- |
| Root directory         | Repository root   |
| Production branch      | `trunk`           |
| Build command          | `npm run build`   |
| Build output directory | `dist`            |
| Environment variable   | `NODE_VERSION=22` |

Pages Git integration needs a build command and output directory, with no deploy command or API token to enter. A screen asking for `npx wrangler deploy` is the Workers setup flow; go back and select Pages.

The Pages address is `inferno-los.pages.dev`. In **Pages project → Custom domains → Set up a domain**, add `los.inferno.tips`. Its CNAME points to `inferno-los.pages.dev`; wait for the custom domain to become active. The plugin is already configured to use `https://los.inferno.tips/`. See [Cloudflare's Vite guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/).

For a quick manual deployment, run `npm ci && npm run build` and upload the contents of `dist/` in the Pages dashboard. The prepared `build/inferno-los-pages.zip` contains those files with `index.html` at the archive root. Rebuild the archive after website changes. Alternatively, from the repository root:

```sh
npx wrangler@4 login
npx wrangler@4 pages project create inferno-los --production-branch trunk
npx wrangler@4 pages deploy dist --project-name inferno-los --branch trunk
```

Choose Git integration at creation time if you want Cloudflare to build on pushes: a Direct Upload project cannot later be converted to Git integration. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

After activation, open `https://los.inferno.tips/`, then open a position using the plugin's **Current LoS** or saved-wave button. Check that sprites load, the positions/pillars match, dragging keeps all monsters' LoS visible, Space steps, and a shared link survives a reload. Verify the configured production address before publishing the plugin.

## Build, test and submit the plugin

Use the separate [plugin development instructions](https://github.com/ollieatkinson/inferno-los-plugin#development) and [submission guide](https://github.com/ollieatkinson/inferno-los-plugin/blob/trunk/RELEASE.md). From that checkout, run `./gradlew test jar` and `./gradlew run` with Java 17.

The plugin's default **Website URL** is `https://los.inferno.tips/`; existing installations with a saved localhost setting must update it. Its Current LoS and wave-start buttons use the [IL2 contract](LINKS.md). Verify the hosted links in a logged-in Inferno playtest, then submit the plugin repository's tested commit to the Plugin Hub.
