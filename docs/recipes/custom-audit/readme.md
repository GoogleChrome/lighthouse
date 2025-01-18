# Basic Custom Audit Recipe

> **Tip**: see [Lighthouse Architecture](../../../docs/architecture.md) for information
on terminology and architecture.

## What this example does

This example shows how to write a custom Lighthouse audit for a hypothetical search page. The page is considered fully initialized when the main search box (the page's "hero element") is ready to be used. When this happens, the page uses `performance.now()` to mark the time it took to become ready and saves the value in a global variable called `window.myLoadMetrics.searchableTime`.

## The Audit, Gatherer, and Config

- [searchable-gatherer.js](searchable-gatherer.js) - a [Gatherer](https://github.com/GoogleChrome/lighthouse/blob/main/docs/architecture.md#components--terminology) that collects `window.myLoadMetrics.searchableTime`
from the context of the page.

- [searchable-audit.js](searchable-audit.js) - an [Audit](https://github.com/GoogleChrome/lighthouse/blob/main/docs/architecture.md#components--terminology) that tests whether or not `window.myLoadMetrics.searchableTime`
stays below a 4000ms threshold. In other words, Lighthouse will consider the audit "passing"
in the report if the search box initializes within 4s.

- [custom-config.js](custom-config.js) - this file tells Lighthouse where to
find the gatherer and audit files, when to run them, and how to incorporate their
output into the Lighthouse report. This example extends [Lighthouse's
default configuration](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js).

**Note**: when extending the default configuration file, all arrays will be concatenated and primitive values will override the defaults.

## Run the configuration

Run Lighthouse with the custom audit by using the `--config-path` flag with your configuration file:

```sh
lighthouse --config-path=custom-config.js https://example.com
```
