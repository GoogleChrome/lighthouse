# Architecture

_Some incomplete notes_

![Lighthouse Architecture](https://raw.githubusercontent.com/GoogleChrome/lighthouse/master/assets/architecture.jpg)

## Components & Terminology

* **Driver** - Interfaces with [Chrome Debugging Protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)  ([API viewer](https://chromedevtools.github.io/debugger-protocol-viewer/))
* **Gatherers** - Uses Driver to collect information about the page. Minimal post-processing.
  * **Artifacts** - output of a gatherer
* **Audit** - Tests for a single feature/optimization/metric. Using the Artifacts as input, an audit evaluates a test and resolves to a numeric score. See [Understanding Results](./understanding-results.md) for details of the LHR (Lighthouse Result object).
  * **Computed Artifacts** - Generated on-demand from artifacts, these add additional meaning, and are often shared amongst multiple audits.
* **Report** - The report UI, created client-side from the LHR. See [HTML Report Generation Overview](../lighthouse-core/report/html/readme.md) for details.

### Audit/Report terminology
* **Category** - Roll-up collection of audits and audit groups into a user-facing section of the report (eg. `Best Practices`). Applies weighting and overall scoring to the section. Examples: PWA, Accessibility, Best Practices.
* **Audit title** - Short user-visible title for the successful audit. eg. “All image elements have `[alt]` attributes.”
* **Audit failureTitle** - Short user-visible title for a failing audit. eg. “Some image elements do not have `[alt]` attributes.”
* **Audit description** - Explanation of why the user should care about the audit. Not necessarily how to fix it, unless there is no external link that explains it. ([See description guidelines](CONTRIBUTING.md#description-guidelines)). eg. “Informative elements should aim for short, descriptive alternate text. Decorative elements can be ignored with an empty alt attribute. [Learn more].”

## Protocol

* _Interacting with Chrome:_ The Chrome protocol connection maintained via [WebSocket](https://github.com/websockets/ws) for the CLI [`chrome.debuggger` API](https://developer.chrome.com/extensions/debugger) when in the Chrome extension.
* _Event binding & domains_: Some domains must be `enable()`d so they issue events. Once enabled, they flush any events that represent state. As such, network events will only issue after the domain is enabled. All the protocol agents resolve their `Domain.enable()` callback _after_ they have flushed any pending events. See example:

```js
// will NOT work
driver.sendCommand('Security.enable').then(_ => {
  driver.on('Security.securityStateChanged', state => { /* ... */ });
})

// WILL work! happy happy. :)
driver.on('Security.securityStateChanged', state => { /* ... */ }); // event binding is synchronous
driver.sendCommand('Security.enable');
```

* _Debugging the protocol_: Read [Better debugging of the Protocol](https://github.com/GoogleChrome/lighthouse/issues/184).

## Understanding a Trace

`lighthouse-core/lib/tracehouse/trace-processor.js` provides the core transformation of a trace into more meaningful objects. Each raw trace event has a monotonically increasing timestamp in microseconds, a thread ID, a process ID, a duration in microseconds (potentially), and other applicable metadata properties such as the event type, the task name, the frame, etc. [Learn more about trace events](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview).

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

### Trace-of-Tab

Trace-of-tab identifies trace events for key moments (navigation start, first meaningful paint, DOM content loaded, trace end, etc) and provides filtered views of just the main process and the main thread events. Because the timestamps are not necessarily interesting in isolation, trace-of-tab also calculates the times in milliseconds of key moments relative to navigation start, thus providing the typical interpretation of first meaningful paint in ms.

```js
{
  processEvents: [/* all trace events in the main process */],
  mainThreadEvents: [/* all trace events on the main thread */],
  timings: {
    navigationStart: 0,
    firstPaint: 150, // firstPaint time in ms after nav start
    /* other key moments */
    traceEnd: 16420, // traceEnd time in ms after nav start
  },
  timestamps: {
    navigationStart: 623000000, // navigationStart timestamp in microseconds
    firstPaint: 623150000, // firstPaint timestamp in microseconds
    /* other key moments */
    traceEnd: 639420000, // traceEnd timestamp in microseconds
  },
}
```

### Tracing Processor

Tracing processor takes the output of trace of tab and identifies the top-level main thread tasks, their durations, and corresponding impact on page responsiveness. Tracing processor also translates task timestamps to milliseconds since navigation start for easier interpretation in computed gatherers and audits.

## Audits

The return value of each audit [takes this shape](https://github.com/GoogleChrome/lighthouse/blob/623b789497f6c87f85d366b4038deae5dc701c90/types/audit.d.ts#L69-L87).

The `details` object is parsed in report-renderer.js. View other audits for guidance on how to structure `details`.

## Lighthouse-core internal module dependencies

![image](https://user-images.githubusercontent.com/39191/42241426-609d15f6-7ebf-11e8-9e40-411d9ede43e6.png)

(Generated July 3, 2018 via `madge lighthouse-core/index.js --image arch.png --layout dot --backgroundColor "#fafafa" --nodeColor "#4d4afc" --noDependencyColor "#48ad00"`)

## Lantern

[Lantern](./lantern.md) is how Lighthouse simulates network and cpu throttling.
