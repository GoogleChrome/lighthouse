# Lighthouse HTML Report Renderer

[Source on Github](https://github.com/GoogleChrome/lighthouse/tree/master/lighthouse-core/report/html)


## Overview

Lighthouse has an indepedent report renderer that takes the **LHR** (Lighthouse Result object) and creates a DOM tree of the report. It's all done client-side.

Example standalone HTML report, delivered by the CLI: [`dbwtest-3.0.3.html`](https://googlechrome.github.io/lighthouse/reports/dbwtest-3.0.3.html) _(View the source! 📖)_

### Report Renderer components

1. [`lighthouse-core/report/report-generator.js`](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/report/report-generator.js) is the current entry point. It compiles together the HTML string with everything required within it.
   - It runs natively in Node.js but can run in the browser after a compile step is applied during our bundling pipeline. That compile step uses a browserify transform that takes any `fs.readFileSync()` calls and replaces them with the stringified file content.
1. [`lighthouse-core/report/html/`](https://github.com/GoogleChrome/lighthouse/tree/master/lighthouse-core/report/html) has everything required to create the HTML report.
1. [`lighthouse-core/report/html/renderer`](https://github.com/GoogleChrome/lighthouse/tree/master/lighthouse-core/report/html/renderer) are all client-side JS files. They transform an LHR object into a report DOM tree. They are all executed within the browser.
1. [`lighthouse-core/report/html/report-template.html`](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/report/html/report-template.html) is where the client-side build of the DOM report is typically kicked off ([with these four lines](https://github.com/GoogleChrome/lighthouse/blob/eda3a3e2e271249f261655f9504fd542d6acf0f8/lighthouse-core/report/html/report-template.html#L29-L33)) However, see _Current Uses.._ below for more possibilities.


### Data Hydration
`innerHTML` is deliberately not used. The renderer relies on basic `createElement` as well as multiple components defined in `<template>` tags that are added via [`document.importNode()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/importNode) and filled in via the `querySelector`/`textContent` combo.

Examples:

* [`templates.html`](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/report/html/templates.html)
* [`performance-category-renderer.js`](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/report/html/renderer/performance-category-renderer.js)

### Current uses of report renderer

The renderer was designed to be portable across various environments.

1. _LH Chrome Extension_: It [creates the HTML as the runner finishes up](https://github.com/GoogleChrome/lighthouse/blob/440155cdda377c458c0efce006bc3a69ce2a351c/lighthouse-core/runner.js#L137-L138) and transforms it [into a blob url in the background page](https://github.com/GoogleChrome/lighthouse/blob/440155cdda377c458c0efce006bc3a69ce2a351c/lighthouse-extension/app/src/lighthouse-ext-background.js#L129-L143).
1. _LH CLI_: It [creates the HTML as the runner finishes up](https://github.com/GoogleChrome/lighthouse/blob/440155cdda377c458c0efce006bc3a69ce2a351c/lighthouse-core/runner.js#L137-L138) and [saves it to disk](https://github.com/GoogleChrome/lighthouse/blob/440155cdda377c458c0efce006bc3a69ce2a351c/lighthouse-cli/printer.js#L71-L92).
1. _Chrome DevTools Audits Panel_: The `renderer` files are rolled into the Chromium repo, and they execute within the DevTools context. The audits panel [receives the LHR object from a WebWorker](https://github.com/ChromeDevTools/devtools-frontend/blob/aa1532c2f8bdc37c9886255644ed90ad01c61c77/front_end/audits/AuditsProtocolService.js#L27-L35), through a `postMessage` and then runs [the renderer within DevTools UI](https://github.com/ChromeDevTools/devtools-frontend/blob/aa1532c2f8bdc37c9886255644ed90ad01c61c77/front_end/audits/AuditsPanel.js#L123-L157), making a few [simplifications](https://github.com/ChromeDevTools/devtools-frontend/blob/master/front_end/audits/AuditsReportRenderer.js).
1. _Hosted [Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/)_: It's a webapp that has the renderer (along with some [additional features](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/report/html/renderer/report-ui-features.js)) all compiled into a [`viewer.js`](https://googlechrome.github.io/lighthouse/viewer/src/viewer.js) file. Same [basic approach](https://github.com/GoogleChrome/lighthouse/blob/440155cdda377c458c0efce006bc3a69ce2a351c/lighthouse-viewer/app/src/lighthouse-report-viewer.js#L116-L117) there.

### Polyfills

The [`details-element-polyfill`](https://www.npmjs.com/package/details-element-polyfill/v/2.1.1) is pulled in to provide [support](https://caniuse.com/#feat=details) for Microsoft Edge.
