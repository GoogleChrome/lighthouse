# Basic Custom Audit Recipe

> **Tip**: see [Lighthouse Architecture](../../../docs/architecture.md) for information
on terminology and architecture.

## What this example does

This example shows how to write a custom Lighthouse audit that measures memory usage using the Chrome DevTools Protocol `Memory.startSampling` command. The audit fails if any memory sample exceeds 1 MB.

## The Audit, Gatherer, and Config

- [memory-gatherer.js](memory-gatherer.js) - a [Gatherer](https://github.com/GoogleChrome/lighthouse/blob/main/docs/architecture.md#components--terminology) that collects memory sampling data from the browser.

- [memory-audit.js](memory-audit.js) - an [Audit](https://github.com/GoogleChrome/lighthouse/blob/main/docs/architecture.md#components--terminology) that tests whether or not the memory usage
stays below a 1MB threshold.

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
