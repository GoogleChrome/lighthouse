# Building Lighthouse

Lighthouse is built into browser-friendly bundles for two clients:

* Chrome DevTools (CDT) Lighthouse Panel
* Lightrider, the backend of PageSpeed Insights

Additionally, there are build processes for:

* [The Lighthouse report viewer](../viewer/)
* The chrome extension (as of Nov 2019 is a thin-client that defers to the viewer)

## Building for DevTools

To build the Lighthouse bundle for CDT and roll them into a local checkout of the CDT repo:

```sh
yarn devtools
```

One of the commands that the above runs - `yarn build-devtools` - creates these files:

```
dist
├── dt-report-resources
│   ├── report-generator.mjs
│   └── report-generator.mjs.d.ts
├── lighthouse-dt-bundle.js
├── lighthouse-dt-bundle.js.map
└── report
    ├── bundle.esm.js
```

1. the biggest file is `lighthouse-dt-bundle.js`. This is a bundle of `core` via `clients/devtools/devtools-entry.js`, and is run inside a worker in CDT.
1. the much smaller `report-generator.mjs` bundle. This is assigned to the global object as `Lighthouse.ReportGenerator`
    - This bundle has inlined the `dist/report/standalone.js` and `standalone-template.html` files (these are not transformed in any way). We call these the report generator assets.
    - `report-generator.mjs.d.ts` is an empty type definition file to make the CDT build happy
1. Finally, `report/bundle.esm.js` is an ES modules bundle of the report code (note: this is copied to CDT as `report/bundle.js`).

### How the Lighthouse Panel uses the Lighthouse CDT build artifacts

`[LighthouseWorkerService`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/entrypoints/lighthouse_worker/LighthouseWorkerService.ts) uses `self.navigation`, one of the exports of `lighthouse-dt-bundle.js`. It also uses the other Lighthouse modes based on what the user selects in the Lighthouse Panel.

`LighthousePanel` uses `LighthouseReportRenderer`, which wraps `LighthouseReport.renderReport`, ([defined here](https://github.com/GoogleChrome/lighthouse/blob/main/report/renderer/report-renderer.js)) which is exported by `report.js`. This renderer takes a Lighthouse result and a `rootEl` DOM element - it then renders the report to the target element. The CSS used by the report is embedded inside `bundle.esm.js` and is injected by the `ReportRenderer` via a call to `dom.createComponent('styles')`.

A Lighthouse report (including what is shown within the Lighthouse panel) can also Export as HTML. Normally the report just uses `documentElement.outerHTML`, but from DevTools we get quine-y and use `Lighthouse.ReportGenerator`. This generator is defined in `report-generator.js`.

`report-generator.js` takes a Lighthouse result and creates an HTML file - it concats all of the report generator assets to create a standalone HTML document. See: https://github.com/GoogleChrome/lighthouse/blob/ee3a9dfd665135b9dc03c18c9758b27464df07e0/core/report/report-generator.js#L35 . Normally when run in Node.js the report assets (JavaScript, which also contains the css; and the html template) are read from disk. But in DevTools, these assets have been inlined in the `report-generator.mjs` bundle.

In short, a Lighthouse report is rendered in two ways inside DevTools:

1. The LighthousePanel presents a report to the user via: the renderer as exported by `bundle.esm.js`. This file has inlined all the CSS and JS necessary to render a report.

2. The Lighthouse report exposes a "Save as HTML" feature: we can't scrape the outerHTML like we normally do, because we render some things a bit
special for DevTools, and we're not the only thing in that DOM (we would get _all_ of DevTools). So we override the `getReportHtml` function in the renderer [here](undefined/blob/ba1bef52cea582fd2b9eed5b0f18ef739ff2e7b4/front_end/panels/lighthouse/LighthouseReportRenderer.ts#L175) to instead use `Lighthouse.ReportGenerator`, as defined by `report-generator.js`.
