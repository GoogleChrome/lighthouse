/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable max-len */

import fs from 'fs';
import path from 'path';

import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';

import {LH_ROOT} from '../shared/root.js';
import {isObjectOfUnknownValues} from '../shared/type-verifiers.js';

/**
 * @param {string=} manualArgv
 */
function getYargsParser(manualArgv) {
  const y = manualArgv ?
    // @ts-expect-error - undocumented, but yargs() supports parsing a single `string`.
    yargs(manualArgv) :
    yargs(yargsHelpers.hideBin(process.argv));

  return y.help('help')
    .version(JSON.parse(fs.readFileSync(`${LH_ROOT}/package.json`, 'utf-8')).version)
    .showHelpOnFail(false, 'Specify --help for available options')

    .usage('lighthouse <url> <options>')
    .example(
        'lighthouse <url> --view', 'Opens the HTML report in a browser after the run completes')
    .example(
        'lighthouse <url> --config-path=./myconfig.js',
        'Runs Lighthouse with your own configuration: custom audits, report generation, etc.')
    .example(
        'lighthouse <url> --output=json --output-path=./report.json --save-assets',
        'Save trace, screenshots, and named JSON report.')
    .example(
        'lighthouse <url> --screenEmulation.disabled --throttling-method=provided --no-emulated-user-agent',
        'Disable emulation and all throttling')
    .example(
        'lighthouse <url> --chrome-flags="--window-size=412,660"',
        'Launch Chrome with a specific window size')
    .example(
        'lighthouse <url> --quiet --chrome-flags="--headless"',
        'Launch Headless Chrome, turn off logging')
    .example(
        'lighthouse <url> --extra-headers "{\\"Cookie\\":\\"monster=blue\\", \\"x-men\\":\\"wolverine\\"}"',
        'Stringify\'d JSON HTTP Header key/value pairs to send in requests')
    .example(
        'lighthouse <url> --extra-headers=./path/to/file.json',
        'Path to JSON file of HTTP Header key/value pairs to send in requests')
    .example(
        'lighthouse <url> --only-categories=performance,seo',
        'Only run the specified categories. Available categories: accessibility, best-practices, performance, seo')

    // We only have the single string positional argument, the url.
    .option('_', {
      array: true, // Always an array, but this lets the type system know.
      type: 'string',
    })

    /*
     * Also accept a file for all of these flags. Yargs will merge in and override the file-based
     * flags with the command-line flags.
     *
     * i.e. when command-line `--throttling-method=provided` and file `throttlingMethod: "devtools"`,
     * throttlingMethod will be `provided`.
     *
     * @see https://github.com/yargs/yargs/blob/a6e67f15a61558d0ba28bfe53385332f0ce5d431/docs/api.md#config
     */
    .option('cli-flags-path', {
      config: true,
      describe: 'The path to a JSON file that contains the desired CLI flags to apply. Flags specified at the command line will still override the file-based ones.',
    })

    // Logging
    .options({
      'verbose': {
        type: 'boolean',
        default: false,
        describe: 'Displays verbose logging',
      },
      'quiet': {
        type: 'boolean',
        default: false,
        describe: 'Displays no progress, debug logs, or errors',
      },
    })
    .group(['verbose', 'quiet'], 'Logging:')

    // Configuration
    .options({
      'save-assets': {
        type: 'boolean',
        default: false,
        describe: 'Save the trace contents & devtools logs to disk',
      },
      'list-all-audits': {
        type: 'boolean',
        default: false,
        describe: 'Prints a list of all available audits and exits',
      },
      'list-locales': {
        type: 'boolean',
        default: false,
        describe: 'Prints a list of all supported locales and exits',
      },
      'list-trace-categories': {
        type: 'boolean',
        default: false,
        describe: 'Prints a list of all required trace categories and exits',
      },
      'debug-navigation': {
        type: 'boolean',
        describe: 'Pause after page load to wait for permission to continue the run, evaluate `continueLighthouseRun` in the console to continue.',
      },
      'additional-trace-categories': {
        type: 'string',
        describe: 'Additional categories to capture with the trace (comma-delimited).',
      },
      'config-path': {
        type: 'string',
        describe: `The path to the config JSON.
          An example config file: core/config/lr-desktop-config.js`,
      },
      'preset': {
        type: 'string',
        describe: `Use a built-in configuration.
        WARNING: If the --config-path flag is provided, this preset will be ignored.`,
      },
      'chrome-flags': {
        type: 'string',
        default: '',
        describe: `Custom flags to pass to Chrome (space-delimited). For a full list of flags, see https://bit.ly/chrome-flags
          Additionally, use the CHROME_PATH environment variable to use a specific Chrome binary. Requires Chromium version 66.0 or later. If omitted, any detected Chrome Canary or Chrome stable will be used.`,
      },
      'port': {
        type: 'number',
        default: 0,
        describe: 'The port to use for the debugging protocol. Use 0 for a random port',
      },
      'hostname': {
        type: 'string',
        default: '127.0.0.1',
        describe: 'The hostname to use for the debugging protocol.',
      },
      'form-factor': {
        type: 'string',
        describe: 'Determines how performance metrics are scored and if mobile-only audits are skipped. For desktop, --preset=desktop instead.',
      },
      'screenEmulation': {
        describe: 'Sets screen emulation parameters. See also --preset. Use --screenEmulation.disabled to disable. Otherwise set these 4 parameters individually: --screenEmulation.mobile --screenEmulation.width=360 --screenEmulation.height=640 --screenEmulation.deviceScaleFactor=2',
        coerce: coerceScreenEmulation,
      },
      'emulatedUserAgent': {
        type: 'string',
        coerce: coerceOptionalStringBoolean,
        describe: 'Sets useragent emulation',
      },
      'max-wait-for-load': {
        type: 'number',
        describe: 'The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability',
      },
      'enable-error-reporting': {
        type: 'boolean',
        describe: 'Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More: https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md',
      },
      'gather-mode': {
        alias: 'G',
        coerce: coerceOptionalStringBoolean,
        describe: 'Collect artifacts from a connected browser and save to disk. (Artifacts folder path may optionally be provided). If audit-mode is not also enabled, the run will quit early.',
      },
      'audit-mode': {
        alias: 'A',
        coerce: coerceOptionalStringBoolean,
        describe: 'Process saved artifacts from disk. (Artifacts folder path may be provided, otherwise defaults to ./latest-run/)',
      },
      'only-audits': {
        array: true,
        type: 'string',
        coerce: splitCommaSeparatedValues,
        describe: 'Only run the specified audits',
      },
      'only-categories': {
        array: true,
        type: 'string',
        coerce: splitCommaSeparatedValues,
        describe: 'Only run the specified categories. Available categories: accessibility, best-practices, performance, seo',
      },
      'skip-audits': {
        array: true,
        type: 'string',
        coerce: splitCommaSeparatedValues,
        describe: 'Run everything except these audits',
      },
      'disable-full-page-screenshot': {
        type: 'boolean',
        describe: 'Disables collection of the full page screenshot, which can be quite large',
      },
      'ignore-status-code': {
        type: 'boolean',
        describe: 'Disables failing on all error status codes, and instead issues a warning.',
      },
    })
    .group([
      'save-assets', 'list-all-audits', 'list-locales', 'list-trace-categories', 'additional-trace-categories',
      'config-path', 'preset', 'chrome-flags', 'port', 'hostname', 'form-factor', 'screenEmulation', 'emulatedUserAgent',
      'max-wait-for-load', 'enable-error-reporting', 'gather-mode', 'audit-mode',
      'only-audits', 'only-categories', 'skip-audits', 'disable-full-page-screenshot', 'ignore-status-code',
    ], 'Configuration:')

    // Output
    .options({
      'output': {
        type: 'array',
        default: /** @type {const} */ (['html']),
        coerce: coerceOutput,
        describe: 'Reporter for the results, supports multiple values. choices: "json", "html", "csv"',
      },
      'output-path': {
        type: 'string',
        coerce: coerceOutputPath,
        describe: `The file path to output the results. Use 'stdout' to write to stdout.
If using JSON output, default is stdout.
If using HTML or CSV output, default is a file in the working directory with a name based on the test URL and date.
If using multiple outputs, --output-path is appended with the standard extension for each output type. "reports/my-run" -> "reports/my-run.report.html", "reports/my-run.report.json", etc.
Example: --output-path=./lighthouse-results.html`,
      },
      'view': {
        type: 'boolean',
        default: false,
        describe: 'Open HTML report in your browser',
      },
    })
    .group(['output', 'output-path', 'view'], 'Output:')

    // Other options.
    .options({
      'locale': {
        coerce: coerceLocale,
        describe: 'The locale/language the report should be formatted in',
      },
      'blocked-url-patterns': {
        array: true,
        type: 'string',
        describe: 'Block any network requests to the specified URL patterns',
      },
      'disable-storage-reset': {
        type: 'boolean',
        describe: 'Disable clearing the browser cache and other storage APIs before a run',
      },
      'throttling-method': {
        type: 'string',
        describe: 'Controls throttling method',
      },
    })

    // Throttling settings, parsed as an object.
    .option('throttling', {
      coerce: coerceThrottling,
    })
    .describe({
      'throttling.rttMs': 'Controls simulated network RTT (TCP layer)',
      'throttling.throughputKbps': 'Controls simulated network download throughput',
      'throttling.requestLatencyMs': 'Controls emulated network RTT (HTTP layer)',
      'throttling.downloadThroughputKbps': 'Controls emulated network download throughput',
      'throttling.uploadThroughputKbps': 'Controls emulated network upload throughput',
      'throttling.cpuSlowdownMultiplier': 'Controls simulated + emulated CPU throttling',
    })

    .options({
      'extra-headers': {
        coerce: coerceExtraHeaders,
        describe: 'Set extra HTTP Headers to pass with request',
      },
      'precomputed-lantern-data-path': {
        type: 'string',
        describe: 'Path to the file where lantern simulation data should be read from, overwriting the lantern observed estimates for RTT and server latency.',
      },
      'lantern-data-output-path': {
        type: 'string',
        describe: 'Path to the file where lantern simulation data should be written to, can be used in a future run with the `precomputed-lantern-data-path` flag.',
      },
      'plugins': {
        array: true,
        type: 'string',
        coerce: splitCommaSeparatedValues,
        describe: 'Run the specified plugins',
      },
      'channel': {
        type: 'string',
        default: 'cli',
      },
      'chrome-ignore-default-flags': {
        type: 'boolean',
        default: false,
      },
    })

    // Choices added outside of `options()` and cast so tsc picks them up.
    .choices('form-factor', /** @type {const} */ (['mobile', 'desktop']))
    .choices('throttling-method', /** @type {const} */ (['devtools', 'provided', 'simulate']))
    .choices('preset', /** @type {const} */ (['perf', 'experimental', 'desktop']))

    .check(argv => {
      // Lighthouse doesn't need a URL if...
      //   - We're just listing the available options.
      //   - We're just printing the config.
      //   - We're in auditMode (and we have artifacts already)
      // If one of these don't apply, if no URL, stop the program and ask for one.
      const isPrintSomethingMode = argv.listAllAudits || argv.listLocales || argv.listTraceCategories;
      const isOnlyAuditMode = !!argv.auditMode && !argv.gatherMode;
      if (isPrintSomethingMode || isOnlyAuditMode) {
        return true;
      } else if (argv._.length > 0) {
        return true;
      }

      throw new Error('Please provide a url');
    })
    .epilogue('For more information on Lighthouse, see https://developers.google.com/web/tools/lighthouse/.')
    .wrap(y.terminalWidth());
}

/**
 * @param {string=} manualArgv
 * @param {{noExitOnFailure?: boolean}=} options
 * @return {LH.CliFlags}
 */
function getFlags(manualArgv, options = {}) {
  let parser = getYargsParser(manualArgv);

  if (options.noExitOnFailure) {
    // Silence console.error() logging and don't process.exit().
    // `parser.fail(false)` can be used in yargs once v17 is released.
    parser = parser.fail((msg, err) => {
      if (err) throw err;
      else if (msg) throw new Error(msg);
    });
  }

  // Augmenting yargs type with auto-camelCasing breaks in tsc@4.1.2 and @types/yargs@15.0.11,
  // so for now cast to add yarg's camelCase properties to type.
  const argv = /** @type {Awaited<typeof parser.argv>} */ (parser.argv);
  const cliFlags = /** @type {typeof argv & LH.Util.CamelCasify<typeof argv>} */ (argv);

  // yargs will return `undefined` for options that have a `coerce` function but
  // are not actually present in the user input. Instead of passing properties
  // explicitly set to undefined, delete them from the flags object.
  for (const [k, v] of Object.entries(cliFlags)) {
    if (v === undefined) delete cliFlags[k];
  }

  return cliFlags;
}

/**
 * Support comma-separated values for some array flags by splitting on any ',' found.
 * @param {Array<string>=} strings
 * @return {Array<string>=}
 */
function splitCommaSeparatedValues(strings) {
  if (!strings) return;

  return strings.flatMap(value => value.split(','));
}

/**
 * @param {unknown} value
 * @return {boolean|string|undefined}
 */
function coerceOptionalStringBoolean(value) {
  if (value === undefined) return;

  if (typeof value !== 'string' && typeof value !== 'boolean') {
    throw new Error('Invalid value: Argument must be a string or a boolean');
  }
  return value;
}

/**
 * Coerce output CLI input to `LH.SharedFlagsSettings['output']` or throw if not possible.
 * @param {Array<unknown>} values
 * @return {Array<LH.OutputMode>}
 */
function coerceOutput(values) {
  const outputTypes = ['json', 'html', 'csv'];
  const errorHint = `Argument 'output' must be an array from choices "${outputTypes.join('", "')}"`;
  if (!values.every(item => typeof item === 'string')) {
    throw new Error('Invalid values. ' + errorHint);
  }
  // Allow parsing of comma-separated values.
  const strings = values.flatMap(value => value.split(','));
  const validValues = strings.filter(/** @return {str is LH.OutputMode} */ str => {
    if (!outputTypes.includes(str)) {
      throw new Error(`"${str}" is not a valid 'output' value. ` + errorHint);
    }
    return true;
  });

  return validValues;
}

/**
 * Verifies outputPath is something we can actually write to.
 * @param {unknown=} value
 * @return {string=}
 */
function coerceOutputPath(value) {
  if (value === undefined) return;

  if (typeof value !== 'string' || !value || !fs.existsSync(path.dirname(value))) {
    throw new Error(`--output-path (${value}) cannot be written to`);
  }

  return value;
}

/**
 * Verifies value is a string, then coerces type to LH.Locale for convenience. However, don't
 * allowlist specific locales. Why? So we can support the user who requests 'es-MX' (unsupported)
 * and we'll fall back to 'es' (supported).
 * @param {unknown} value
 * @return {LH.Locale|undefined}
 */
function coerceLocale(value) {
  if (value === undefined) return;

  if (typeof value !== 'string') throw new Error(`Invalid value: Argument 'locale' must be a string`);
  return /** @type {LH.Locale} */ (value);
}

/**
 * `--extra-headers` comes in as a JSON string or a path to a JSON string, but the flag value
 * needs to be the parsed object. Load file (if necessary) and returns the parsed object.
 * @param {unknown} value
 * @return {LH.SharedFlagsSettings['extraHeaders']}
 */
function coerceExtraHeaders(value) {
  // TODO: this function does not actually verify the object type.
  if (value === undefined) return value;
  if (typeof value === 'object') return /** @type {LH.SharedFlagsSettings['extraHeaders']} */ (value);
  if (typeof value !== 'string') {
    throw new Error(`Invalid value: Argument 'extra-headers' must be a string`);
  }

  // (possibly) load and parse extra headers from JSON.
  if (!value.startsWith('{')) {
    // If not a JSON object, assume it's a path to a JSON file.
    return JSON.parse(fs.readFileSync(value, 'utf-8'));
  }
  return JSON.parse(value);
}

/**
 * Take yarg's unchecked object value and ensure it's proper throttling settings.
 * @param {unknown} value
 * @return {LH.ThrottlingSettings|undefined}
 */
function coerceThrottling(value) {
  if (value === undefined) return;

  if (!isObjectOfUnknownValues(value)) {
    throw new Error(`Invalid value: Argument 'throttling' must be an object, specified per-property ('throttling.rttMs', 'throttling.throughputKbps', etc)`);
  }

  /** @type {Array<keyof LH.ThrottlingSettings>} */
  const throttlingKeys = [
    'rttMs',
    'throughputKbps',
    'requestLatencyMs',
    'downloadThroughputKbps',
    'uploadThroughputKbps',
    'cpuSlowdownMultiplier',
  ];

  /** @type {LH.ThrottlingSettings} */
  const throttlingSettings = {};
  for (const key of throttlingKeys) {
    const possibleSetting = value[key];
    if (possibleSetting !== undefined && typeof possibleSetting !== 'number') {
      throw new Error(`Invalid value: 'throttling.${key}' must be a number`);
    }
    // Note: this works type-wise because the throttling settings all have the same type.
    throttlingSettings[key] = possibleSetting;
  }

  return throttlingSettings;
}

/**
 * Take yarg's unchecked object value and ensure it is a proper LH.screenEmulationSettings.
 * @param {unknown} value
 * @return {Partial<LH.ScreenEmulationSettings>|undefined}
 */
function coerceScreenEmulation(value) {
  if (value === undefined) return;

  if (!isObjectOfUnknownValues(value)) {
    throw new Error(`Invalid value: Argument 'screenEmulation' must be an object, specified per-property ('screenEmulation.width', 'screenEmulation.deviceScaleFactor', etc)`);
  }

  /** @type {Array<keyof LH.ScreenEmulationSettings>} */
  const keys = ['width', 'height', 'deviceScaleFactor', 'mobile', 'disabled'];
  /** @type {Partial<LH.ScreenEmulationSettings>} */
  const screenEmulationSettings = {};

  for (const key of keys) {
    const possibleSetting = value[key];
    switch (key) {
      case 'width':
      case 'height':
      case 'deviceScaleFactor':
        if (possibleSetting !== undefined && typeof possibleSetting !== 'number') {
          throw new Error(`Invalid value: 'screenEmulation.${key}' must be a number`);
        }
        screenEmulationSettings[key] = possibleSetting;

        break;
      case 'mobile':
      case 'disabled':
        // Manually coerce 'true'/'false' strings to booleans since nested property types aren't set.
        if (possibleSetting === 'true') {
          screenEmulationSettings[key] = true;
        } else if (possibleSetting === 'false') {
          screenEmulationSettings[key] = false;
        } else if (possibleSetting === undefined || typeof possibleSetting === 'boolean') {
          screenEmulationSettings[key] = possibleSetting;
        } else {
          throw new Error(`Invalid value: 'screenEmulation.${key}' must be a boolean`);
        }

        break;
      default:
        throw new Error(`Unrecognized screenEmulation option: ${key}`);
    }
  }

  return screenEmulationSettings;
}

export {
  getFlags,
  getYargsParser,
};
