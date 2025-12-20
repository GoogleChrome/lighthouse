# Building Lighthouse

Lighthouse is built into browser-friendly bundles for two clients:

* Chrome DevTools Audits Panel
* Lightrider, the backend of PageSpeed Insights

Additionally, there are build processes for: 

* [The Lighthouse report viewer](../lighthouse-viewer/)
* The chrome extension (as of Nov 2019 is a thin-client that defers to the viewer)

## Building for DevTools

To build the devtools files and roll them into a local checkout of Chromium:

```sh
yarn build-devtools && yarn devtools
```


`yarn build-devtools` creates these files:

```
dist
├── dt-report-resources
│   ├── report-generator.js
│   ├── report.css
│   ├── report.js
│   ├── template.html
│   └── templates.html
└── lighthouse-dt-bundle.js
```

1. the big `lighthouse-dt-bundle.js` bundle
1. the much smaller `report-generator.js` bundle (just two modules). This is exported as ReportGenerator
1. copies all the `report.{js,css}` / `template(s).html` files (these are not transformed in any way). We call these the report assets.

### How the Audits Panel uses the Lighthouse assets

`AuditsService` uses `self.runLighthouseInWorker`, the main export of the big bundle.

`AuditsPanel` uses `new Audits.ReportRenderer(dom)`, which overrides `self.ReportRenderer`, which is [exported](https://github.com/GoogleChrome/lighthouse/blob/ee3a9dfd665135b9dc03c18c9758b27464df07e0/lighthouse-core/report/html/renderer/report-renderer.js#L255) by `report.js`. This renderer takes a Lighthouse result, `templates.html`, and a target DOM element - it then renders the report to the target element.

`AuditsPanel` also registers `report.css`.

`report-generator.js` takes a Lighthouse result and creates an HTML file - it concats all of the report assets to create a singular HTML document. See: https://github.com/GoogleChrome/lighthouse/blob/ee3a9dfd665135b9dc03c18c9758b27464df07e0/lighthouse-core/report/report-generator.js#L35

A Lighthouse report (including what is shown within the Audits panel) can also Export as HTML. Normally the report just uses `documentElement.outerHTML`, but from DevTools we get quine-y and use `Lighthouse.ReportGenerator`. I only mention this because this is why the report assets are seperate files - there is a dual purpose.

1. Create the report within the Audits Panel DOM. `report.js` exports the renderer, and `report.css` and `templates.html` are pulled from `.cachedResources`.

2. Export the report as HTML. We can't just scrape the outerHTML like we normally do, because we render some thing a bit
special for DevTools, and we're not the only thing in that DOM (we would get _all_ of DevTools). So we use `Lighthouse.ReportGenerator` (important: this is only used here!) to create this HTML export. It requires all of the report assets, so to prevent double-bundling we [shim](https://github.com/GoogleChrome/lighthouse/blob/https://github.com/GoogleChrome/lighthouse/blob/ee3a9dfd665135b9dc03c18c9758b27464df07e0/lighthouse-core/report/report-generator.js#L35/clients/devtools-report-assets.js) its report assets module to just read from the `.cacheResources`.
