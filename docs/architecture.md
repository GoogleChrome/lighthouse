# Architecture

_Some incomplete notes_

![Lighthouse Architecture](https://user-images.githubusercontent.com/6752989/168922741-d574b82c-656c-446a-bc81-43a578c75c06.png)

## Components & Terminology

* **Driver** - Interfaces with [Puppeteer](https://github.com/puppeteer/puppeteer) and [Chrome Debugging Protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)  ([API viewer](https://chromedevtools.github.io/debugger-protocol-viewer/))
* **Gatherers** - Uses Driver to collect information about the page. Minimal post-processing.  Run Lighthouse with `--gather-mode` to see the 3 primary outputs from gathering:
  1. `artifacts.json`: The output from all [gatherers](../core/gather/gatherers).
  2. `defaultPass.trace.json`: Most performance characteristics come from here. You can view it in the DevTools Peformance panel.
  3. `defaultPass.devtoolslog.json`: A log of all the [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) events. Primary signal about network requests and page state.
* **Audit** - The [audits](../core/audits) are tests for a single feature/optimization/metric. Using the Artifacts as input, an audit evaluates a test and resolves to a numeric score. See [Understanding Results](./understanding-results.md) for details of the LHR (Lighthouse Result object).
  * **Computed Artifacts** - [Generated](../core/computed) on-demand from artifacts, these add additional meaning, and are often shared amongst multiple audits.
* **Report** - The report UI, created client-side from the LHR. See [HTML Report Generation Overview](../report/README.md) for details.

### Audit/Report terminology
* **Category** - Roll-up collection of audits and audit groups into a user-facing section of the report (eg. `Best Practices`). Applies weighting and overall scoring to the section. Examples: Accessibility, Best Practices.
* **Audit title** - Short user-visible title for the successful audit. eg. “All image elements have `[alt]` attributes.”
* **Audit failureTitle** - Short user-visible title for a failing audit. eg. “Some image elements do not have `[alt]` attributes.”
* **Audit description** - Explanation of why the user should care about the audit. Not necessarily how to fix it, unless there is no external link that explains it. ([See description guidelines](../CONTRIBUTING.md#audit-description-guidelines)). eg. “Informative elements should aim for short, descriptive alternate text. Decorative elements can be ignored with an empty alt attribute. [Learn more].”

## Protocol

* _Interacting with Chrome:_ The Chrome protocol connection maintained via [WebSocket](https://github.com/websockets/ws) for the CLI [`chrome.debuggger` API](https://developer.chrome.com/extensions/debugger) when in the Chrome extension.
* _Event binding & domains_: Some domains must be `enable()`d so they issue events. Once enabled, they flush any events that represent state. As such, network events will only issue after the domain is enabled. All the protocol agents resolve their `Domain.enable()` callback _after_ they have flushed any pending events. See example:

```js
// will NOT work
driver.defaultSession.sendCommand('Security.enable').then(_ => {
  driver.defaultSession.on('Security.securityStateChanged', state => { /* ... */ });
})

// WILL work! happy happy. :)
driver.defaultSession.on('Security.securityStateChanged', state => { /* ... */ }); // event binding is synchronous
driver.defaultSession.sendCommand('Security.enable');
```

* _Debugging the protocol_: Read [Better debugging of the Protocol](https://github.com/GoogleChrome/lighthouse/issues/184).

## Understanding a Trace

`core/lib/tracehouse/trace-processor.js` provides the core transformation of a trace into more meaningful objects. Each raw trace event has a monotonically increasing timestamp in microseconds, a thread ID, a process ID, a duration in microseconds (potentially), and other applicable metadata properties such as the event type, the task name, the frame, etc. [Learn more about trace events](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview).

### Example Trace Event
```js
{
  'pid': 41904, // process ID
  'tid': 1295, // thread ID
  'ts': 1676836141, // timestamp in microseconds
  'ph': 'X', // trace event type
  'cat': 'toplevel', // trace category from which this event came
  'name': 'MessageLoop::RunTask', // relatively human-readable description of the trace event
  'dur': 64, // duration of the task in microseconds
  'args': {}, // contains additional data such as frame when applicable
}
```

### Processed trace

The processed trace identifies trace events for key moments (navigation start, FCP, LCP, DOM content loaded, trace end, etc) and provides filtered views of just the main process and the main thread events. Because the timestamps are not necessarily interesting in isolation, the processed trace also calculates the times in milliseconds of key moments relative to navigation start, thus providing the typical interpretation of metrics in ms.

```js
{
  processEvents: [/* all trace events in the main process */],
  mainThreadEvents: [/* all trace events on the main thread */],
  timings: {
    timeOrigin: 0, // timeOrigin is always 0 ms
    firstContentfulPaint: 150, // firstContentfulPaint time in ms after time origin
    /* other key moments */
    traceEnd: 16420, // traceEnd time in ms after time origin
  },
  timestamps: {
    timeOrigin: 623000000, // timeOrigin timestamp in microseconds, marks the start of the navigation of interest
    firstContentfulPaint: 623150000, // firstContentfulPaint timestamp in microseconds
    /* other key moments */
    traceEnd: 639420000, // traceEnd timestamp in microseconds
  },
}
```

## Audits

The return value of each audit [takes this shape](https://github.com/GoogleChrome/lighthouse/blob/17b7163486b69239689ed49415bdeee6f7766bfa/types/audit.d.ts#L66-L83).

The `details` object is parsed in report-renderer.js. View other audits for guidance on how to structure `details`.

## Core internal module dependencies

![image](https://user-images.githubusercontent.com/6752989/168904554-082aa9c3-46f3-448f-92b8-20ad3a02258f.png)

(Generated May 17, 2022 via `madge core/index.js --image arch.png --layout dot --exclude="(locales\/)|(stack-packs\/packs)"`)

## Lantern

[Lantern](./lantern.md) is how Lighthouse simulates network and cpu throttling.
