# Cloudflare hosting and RuneLite release

## Current status

The website is maintained at [ollieatkinson/inferno-los](https://github.com/ollieatkinson/inferno-los), and the plugin at [ollieatkinson/inferno-los-plugin](https://github.com/ollieatkinson/inferno-los-plugin). Both have independent build checks. The website builds to `dist/`; it does not need Java. Cloudflare is not authenticated in this workspace, so hosting has not been deployed. Plugin Hub submission and a logged-in Inferno playtest remain outstanding.

## Cloudflare Workers setup screen

The repository includes `wrangler.jsonc` for serving `dist/` as static assets, with single-page-application fallback. No Worker script or backend is needed. On the **Set up your application** screen for Workers, use:

| Setting           | Value                       |
| ----------------- | --------------------------- |
| Repository        | `ollieatkinson/inferno-los` |
| Project name      | `inferno-los`               |
| Build command     | `npm run build`             |
| Deploy command    | `npx wrangler deploy`       |
| Production branch | `trunk`                     |
| Root directory    | Repository root             |
| Build environment | `NODE_VERSION=22`           |
| Cloudflare Access | Off for a public website    |

Non-production branch builds may remain enabled. The Worker name matches the repository config. See [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/get-started/). Use the assigned production URL in the RuneLite plugin after deployment.

## Alternative: Cloudflare Pages

The website is static. It needs no Worker, database or API. Snapshot data is in the URL fragment and is read by the browser.

For automatic deployments, create a **Pages** project under Cloudflare **Workers & Pages**, importing `ollieatkinson/inferno-los`. Use these settings:

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

## Build, test and submit the plugin

Use the separate [plugin development instructions](https://github.com/ollieatkinson/inferno-los-plugin#development) and [submission guide](https://github.com/ollieatkinson/inferno-los-plugin/blob/trunk/RELEASE.md). From that checkout, run `./gradlew test jar` and `./gradlew run` with Java 17.

Once the website is deployed, set the plugin's default `Website URL` to the tested production address. Its Current LoS and wave-start buttons use the [IL2 contract](LINKS.md). Verify the hosted links in a logged-in Inferno playtest, then submit the plugin repository's tested commit to the Plugin Hub.
