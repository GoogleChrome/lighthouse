# Lighthouse Viewer

Online at https://googlechrome.github.io/lighthouse/viewer/

## Development

Run the following in the root folder of a Lighthouse checkout:

* `yarn`
* `yarn build-viewer`
* `yarn serve-gh-pages`
* `open http://localhost:7333/viewer/`

This compiles and minifies `app/src/main.js`. Results are written to `dist/gh-pages/viewer/`.

## Deploy

Deploys should be done as part of the Lighthouse release process. To push the viewer to the `gh-pages` branch under `viewer/`, run the following in the root folder of a Lighthouse checkout:

```sh
yarn deploy-viewer
```

For more information on deployment, see `releasing.md`.

## Usage

### Load JSON from Gist

Pass the GitHub Gist identifier as `gist` query parameter.

e.g., `http://localhost:7333/?gist=bd1779783a5bbcb348564a58f80f7099`

### Load JSON from URL

Pass the absolute URL as `jsonurl` query parameter.

e.g., `http://localhost:7333/?jsonurl=https://gist.githubusercontent.com/Kikobeats/d570a1aa285c5d1d97bbda10b92fb97f/raw/4b0f14a5914edd25c95b4bd9d09728ab42181c3e/lighthouse.json`

### Run and load from PageSpeed Insights

Pass target URL `psiurl` query parameter.

e.g., `http://localhost:7333/?psiurl=https://www.example.com&category=seo`

The following query parameters are also supported as options:

`category` - Category to enable. One per category.
`strategy` - mobile, desktop
`locale` - locale to render report with
`utm_source` - id that identifies the tool using the viewer
