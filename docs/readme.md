This directory contains useful documentation, examples (keep reading),
and [recipes](./recipes/) to get you started. For an overview of Lighthouse's
internals, see [Lighthouse Architecture](architecture.md).

## Using programmatically

The example below shows how to run Lighthouse programmatically as a Node module. It
assumes you've installed Lighthouse as a dependency (`yarn add --dev lighthouse`).

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

function launchChromeAndRunLighthouse(url, opts, config = null) {
  return chromeLauncher.launch({chromeFlags: opts.chromeFlags}).then(chrome => {
    opts.port = chrome.port;
    return lighthouse(url, opts, config).then(results => {
      // use results.lhr for the JS-consumable output
      // https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
      // use results.report for the HTML/JSON/CSV output as a string
      // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
      return chrome.kill().then(() => results.lhr)
    });
  });
}

const opts = {
  chromeFlags: ['--show-paint-rects']
};

// Usage:
launchChromeAndRunLighthouse('https://example.com', opts).then(results => {
  // Use results!
});

```

### Performance-only Lighthouse run

Many modules consuming Lighthouse are only interested in the performance numbers.
You can limit the audits you run to a particular category or set of audits.

```js
// ...
const flags = {onlyCategories: ['performance']};
launchChromeAndRunLighthouse(url, flags).then( // ...
```

You can also craft your own config (e.g. [experimental-config.js](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/experimental-config.js)) for custom runs. Also see the [basic custom audit recipe](https://github.com/GoogleChrome/lighthouse/tree/master/docs/recipes/custom-audit).

### Differences from CLI flags

Note that some flag functionality is only available to the CLI. The set of shared flags that work in both node and CLI can be found [in our typedefs](https://github.com/GoogleChrome/lighthouse/blob/888bd6dc9d927a734a8e20ea8a0248baa5b425ed/typings/externs.d.ts#L82-L119). In most cases, the functionality is not offered in the node module simply because it is easier and more flexible to do it yourself.

| CLI Flag | Differences in Node |
| - | - |
| `port` | Only specifies which port to use, Chrome is not launched for you. |
| `chromeFlags` | Ignored, Chrome is not launched for you. |
| `outputPath` | Ignored, output is returned as string in `.report` property. |
| `saveAssets` | Ignored, artifacts are returned in `.artifacts` property. |
| `view` | Ignored, use the `open` npm module if you want this functionality. |
| `enableErrorReporting` | Ignored, error reporting is always disabled for node. |
| `listAllAudits` | Ignored, not relevant in programmatic use. |
| `listTraceCategories` | Ignored, not relevant in programmatic use. |
| `configPath` | Ignored, pass the config in as the 3rd argument to `lighthouse`. |
| `preset` | Ignored, pass the config in as the 3rd argument to `lighthouse`. |
| `verbose` | Ignored, use `logLevel` instead. |
| `quiet` | Ignored, use `logLevel` instead. |

### Turn on logging

If you want to see log output as Lighthouse runs, include the `lighthouse-logger` module
and set an appropriate logging level in your code. You'll also need to pass
the `logLevel` flag when calling `lighthouse`.

```javascript
const log = require('lighthouse-logger');

const flags = {logLevel: 'info'};
log.setLevel(flags.logLevel);

launchChromeAndRunLighthouse('https://example.com', flags).then(...);
```

## Configuration
In order to extend the Lighthouse configuration programmatically, you need to pass the config object as the 3rd argument. If omitted, a default configuration is used.

**Example:**
```js
{
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'first-meaningful-paint',
      'speed-index',
      'first-cpu-idle',
      'interactive',
    ],
  },
}
```

You can extend base configuration from [lighthouse:default](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/default-config.js), or you can build up your own configuration from scratch to have complete control.

For more information on the types of config you can provide, see [Lighthouse Configuration](https://github.com/GoogleChrome/lighthouse/blob/master/docs/configuration.md).

## Testing on a site with authentication

When installed globally via `npm i -g lighthouse` or `yarn global add lighthouse`,
`chrome-debug` is added to your `PATH`. This binary launches a standalone Chrome
instance with an open debugging port.

1. Run `chrome-debug`. This will log the debugging port of your Chrome instance
1. Navigate to your site and log in.
1. In a separate terminal tab, run `lighthouse http://mysite.com --port port-number` using the port number from chrome-debug.

## Testing on a site with an untrusted certificate

When testing a site with an untrusted certificate, Chrome will be unable to load the page and so the Lighthouse report will mostly contain errors.

If this certificate **is one you control** and is necessary for development (for instance, `localhost` with a self-signed certificate for local HTTP/2 testing), we recommend you _add the certificate to your locally-trusted certificate store_. In Chrome, see `Settings` > `Privacy and Security` > `Manage certificates` or consult instructions for adding to the certificate store in your operating system.

Alternatively, you can instruct Chrome to ignore the invalid certificate by adding the Lighthouse CLI flag `--chrome-flags="--ignore-certificate-errors"`. However, you must be as careful with this flag as it's equivalent to browsing the web with TLS disabled. Any content loaded by the test page (e.g. third-party scripts or iframed ads) will *also* not be subject to certificate checks, [opening up avenues for MitM attacks](https://www.chromium.org/Home/chromium-security/education/tls#TOC-What-security-properties-does-TLS-give-me-). For these reasons, we recommend the earlier solution of adding the certificate to your local cert store.

## Testing on a mobile device

Lighthouse can run against a real mobile device. You can follow the [Remote Debugging on Android (Legacy Workflow)](https://developer.chrome.com/devtools/docs/remote-debugging-legacy) up through step 3.3, but the TL;DR is install & run adb, enable USB debugging, then port forward 9222 from the device to the machine with Lighthouse.

You'll likely want to use the CLI flags `--emulated-form-factor=none --throttling.cpuSlowdownMultiplier=1` to disable any additional emulation.

```sh
$ adb kill-server

$ adb devices -l
* daemon not running. starting it now on port 5037 *
* daemon started successfully *
00a2fd8b1e631fcb       device usb:335682009X product:bullhead model:Nexus_5X device:bullhead

$ adb forward tcp:9222 localabstract:chrome_devtools_remote

$ lighthouse --port=9222 --emulated-form-factor=none --throttling.cpuSlowdownMultiplier=1 https://example.com
```

## Lighthouse as trace processor

Lighthouse can be used to analyze trace and performance data collected from other tools (like WebPageTest and ChromeDriver). The `traces` and `devtoolsLogs` artifact items can be provided using a string for the absolute path on disk if they're saved with `.trace.json` and `.devtoolslog.json` file extensions, respectively. The `devtoolsLogs` array is captured from the `Network` and `Page` domains (a la ChromeDriver's [enableNetwork and enablePage options]((https://sites.google.com/a/chromium.org/chromedriver/capabilities#TOC-perfLoggingPrefs-object)).

As an example, here's a trace-only run that reports on user timings and critical request chains:

### `config.json`

```json
{
  "settings": {
    "auditMode": "/User/me/lighthouse/lighthouse-core/test/fixtures/artifacts/perflog/",
  },
  "audits": [
    "user-timings",
    "critical-request-chains"
  ],

  "categories": {
    "performance": {
      "name": "Performance Metrics",
      "description": "These encapsulate your web app's performance.",
      "audits": [
        {"id": "user-timings", "weight": 1},
        {"id": "critical-request-chains", "weight": 1}
      ]
    }
  }
}
```

Then, run with: `lighthouse --config-path=config.json http://www.random.url`
