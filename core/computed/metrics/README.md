# Computed Metrics

This directory contains computed metric implementations used by Lighthouse audits.

## Long Task Metrics (TBT, TTI)

Metrics that depend on long task detection (Total Blocking Time, Time to Interactive) measure tasks on the main thread that block responsiveness.

### `isInputPending` API Caveat

Chrome 87+ ships the [`navigator.scheduling.isInputPending`](https://developer.chrome.com/articles/isinputpending/) API, which allows pages to check for pending user input before yielding during long tasks. Pages using this API correctly may legitimately avoid yielding (keeping tasks long) when no input is pending, since there is no responsiveness impact.

This means TBT and TTI scores may be pessimistic for pages that use `isInputPending`-aware cooperative scheduling (e.g. via `scheduler.yield()` or manual `isInputPending` checks), because the long tasks recorded in the trace do not actually block user input in those cases.

This is a known limitation of trace-based long task detection and is tracked upstream.
