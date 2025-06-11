# Lighthouse HTML Report Renderer

## Overview

Lighthouse has an independent report renderer that takes the **LHR** (Lighthouse Result object) and creates a DOM tree of the report. It's all done client-side.

Example standalone HTML report, delivered by the CLI: [`dbwtest-3.0.3.html`](https://googlechrome.github.io/lighthouse/reports/dbwtest-3.0.3.html) _(View the source! 📖)_

### Report Renderer components

1. [`report/generator/report-generator.js`](https://github.com/GoogleChrome/lighthouse/blob/main/report/generator/report-generator.js) is the entry point for generating the HTML from Node. It compiles together the HTML string with everything required within it.
   - It runs natively in Node.js but can run in the browser after a compile step is applied during our bundling pipeline. That compile step uses `inline-fs`, which takes any `fs.readFileSync()` calls and replaces them with the stringified file content.
1. [`report/renderer`](https://github.com/GoogleChrome/lighthouse/tree/main/report/renderer) are all client-side JS files. They transform an LHR object into a report DOM tree. They are all executed within the browser.
1. [`report/assets/standalone-template.html`](https://github.com/GoogleChrome/lighthouse/blob/main/report/assets/standalone-template.html) is where the client-side build of the DOM report is typically kicked off ([with these four lines](https://github.com/GoogleChrome/lighthouse/blob/eda3a3e2e271249f261655f9504fd542d6acf0f8/lighthouse-core/report/html/report-template.html#L29-L33)) However, see _Current Uses.._ below for more possibilities.


### Data Hydration
`innerHTML` is deliberately not used. The renderer relies on basic `createElement` as well as multiple components defined in `<template>` tags that are added via [`document.importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) and filled in via the `querySelector`/`textContent` combo.

Examples:

* [`templates.html`](https://github.com/GoogleChrome/lighthouse/blob/main/report/assets/templates.html)
* [`performance-category-renderer.js`](https://github.com/GoogleChrome/lighthouse/blob/main/report/renderer/performance-category-renderer.js)

### Current uses of report renderer

The renderer was designed to be portable across various environments.

1. _LH CLI_: It [creates the HTML as the runner finishes up](https://github.com/GoogleChrome/lighthouse/blob/da3c865d698abc9365fa7bb087a08ce8c89b0a05/core/runner.js#L130-L131) and [saves it to disk](https://github.com/GoogleChrome/lighthouse/blob/da3c865d698abc9365fa7bb087a08ce8c89b0a05/cli/printer.js#L52-L70).
1. _Chrome DevTools Lighthouse Panel_: The `renderer` files are rolled into the Chromium repo, and they execute within the DevTools context. The Lighthouse panel [receives the LHR object from a WebWorker](https://github.com/ChromeDevTools/devtools-frontend/blob/e540d8037c1f724d61ae70553cc630a0453efebe/front_end/panels/lighthouse/LighthouseProtocolService.ts#L122-L142), through a `postMessage` and then runs [the renderer within DevTools UI](https://github.com/ChromeDevTools/devtools-frontend/blob/e540d8037c1f724d61ae70553cc630a0453efebe/front_end/panels/lighthouse/LighthousePanel.ts#L293-L317), making a few [simplifications](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/panels/lighthouse/LighthouseReportRenderer.ts).
1. _Hosted [Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/)_: It's a webapp that has the renderer (along with some [additional features](https://github.com/GoogleChrome/lighthouse/blob/main/report/renderer/report-ui-features.js)) all compiled into a [`main-XXX.js`](https://github.com/GoogleChrome/lighthouse/tree/main/viewer/app/src) file. Same [basic approach](https://github.com/GoogleChrome/lighthouse/blob/da3c865d698abc9365fa7bb087a08ce8c89b0a05/viewer/app/src/lighthouse-report-viewer.js#L235-L239) there.
