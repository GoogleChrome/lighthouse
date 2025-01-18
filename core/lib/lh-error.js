/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as i18n from './i18n/i18n.js';

/* eslint-disable max-len */
const UIStrings = {
  /**
   * @description Error message explaining that the Lighthouse run was not able to collect screenshots through Chrome.
   * @example {NO_SPEEDLINE_FRAMES} errorCode
   * */
  didntCollectScreenshots: `Chrome didn't collect any screenshots during the page load. Please make sure there is content visible on the page, and then try re-running Lighthouse. ({errorCode})`,
  /**
   * @description Error message explaining that the performance trace was not able to be recorded for the Lighthouse run.
   * @example {NO_TRACING_STARTED} errorCode
   * */
  badTraceRecording: 'Something went wrong with recording the trace over your page load. Please run Lighthouse again. ({errorCode})',
  /**
   * @description Error message explaining that the First Contentful Paint metric was not seen during the page load.
   * @example {NO_FCP} errorCode
   * */
  noFcp: 'The page did not paint any content. Please ensure you keep the browser window in the foreground during the load and try again. ({errorCode})',
  /**
   * @description Error message explaining that the Largest Contentful Paint metric was not seen during the page load.
   * @example {NO_LCP} errorCode
   * */
  noLcp: 'The page did not display content that qualifies as a Largest Contentful Paint (LCP). Ensure the page has a valid LCP element and then try again. ({errorCode})',
  /**
   * @description Error message explaining that the page loaded too slowly to perform a Lighthouse run.
   * @example {NO_TTI_CPU_IDLE_PERIOD} errorCode
   * */
  pageLoadTookTooLong: 'Your page took too long to load. Please follow the opportunities in the report to reduce your page load time, and then try re-running Lighthouse. ({errorCode})',
  /** Error message explaining that Lighthouse could not load the requested URL and the steps that might be taken to fix the unreliability. */
  pageLoadFailed: 'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests.',
  /**
   * @description Error message explaining that Lighthouse could not load the requested URL and the steps that might be taken to fix the unreliability.
   * @example {404} statusCode
   * */
  pageLoadFailedWithStatusCode: 'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests. (Status code: {statusCode})',
  /**
   * @description Error message explaining that Lighthouse could not load the requested URL and the steps that might be taken to fix the unreliability.
   * @example {FAILED_DOCUMENT_REQUEST} errorDetails
   * */
  pageLoadFailedWithDetails: 'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests. (Details: {errorDetails})',
  /**
   * @description Error message explaining that the security certificate of the page Lighthouse observed was invalid, so the URL cannot be accessed. securityMessages will be replaced with one or more strings from the browser explaining what was insecure about the page load.
   * @example {net::ERR_CERT_DATE_INVALID} securityMessages
   * */
  pageLoadFailedInsecure: 'The URL you have provided does not have a valid security certificate. {securityMessages}',
  /** Error message explaining that Chrome prevented the page from loading and displayed an interstitial screen instead, so the URL cannot be accessed. */
  pageLoadFailedInterstitial: 'Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests.',
  /** Error message explaining that Chrome has encountered an error during the Lighthouse run, and that Chrome should be restarted. */
  internalChromeError: 'An internal Chrome error occurred. Please restart Chrome and try re-running Lighthouse.',
  /** Error message explaining that fetching the resources of the webpage has taken longer than the maximum time. */
  requestContentTimeout: 'Fetching resource content has exceeded the allotted time',
  /**
   * @description Error message explaining that the webpage is non-HTML, so audits are ill-defined.
   * @example {application/xml} mimeType
   * */
  notHtml: 'The page provided is not HTML (served as MIME type {mimeType}).',
  /** Error message explaining that the provided URL Lighthouse points to is not valid, and cannot be loaded. */
  urlInvalid: 'The URL you have provided appears to be invalid.',
  /**
   * @description Error message explaining that the Chrome Devtools protocol has exceeded the maximum timeout allowed.
   * @example {Network.enable} protocolMethod
   * */
  protocolTimeout: 'Waiting for DevTools protocol response has exceeded the allotted time. (Method: {protocolMethod})',
  /** Error message explaining that the requested page could not be resolved by the DNS server. */
  dnsFailure: 'DNS servers could not resolve the provided domain.',
  /** Error message explaining that Lighthouse couldn't complete because the page has stopped responding to its instructions. */
  pageLoadFailedHung: 'Lighthouse was unable to reliably load the URL you requested because the page stopped responding.',
  /** Error message explaining that Lighthouse timed out while waiting for the initial connection to the Chrome Devtools protocol. */
  criTimeout: 'Timeout waiting for initial Debugger Protocol connection.',
  /**
   * @description Error message explaining that a resource that was required for testing was never collected. "artifactName" will be replaced with the name of the resource that wasn't collected.
   * @example {MainDocumentContent} artifactName
   * */
  missingRequiredArtifact: 'Required {artifactName} gatherer did not run.',
  /**
   * @description Error message explaining that there was an error while trying to collect a resource that was required for testing. "artifactName" will be replaced with the name of the resource that wasn't collected; "errorMessage" will be replaced with a string description of the error that occurred.
   * @example {MainDocumentContent} artifactName
   * @example {Could not find main document} errorMessage
   * */
  erroredRequiredArtifact: 'Required {artifactName} gatherer encountered an error: {errorMessage}',

  /**
   * @description Error message explaining that a feature is unavailable due to an old version of Chrome. "featureName" will be replaced by the name of the feature which is not supported.
   * @example {Largest Contentful Paint} featureName
   * */
  oldChromeDoesNotSupportFeature: 'This version of Chrome is too old to support \'{featureName}\'. Use a newer version to see full results.',

  /** Error message explaining that the browser tab that Lighthouse is inspecting has crashed. */
  targetCrashed: 'Browser tab has unexpectedly crashed.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);


/**
 * @typedef LighthouseErrorDefinition
 * @property {string} code
 * @property {string} message
 * @property {RegExp} [pattern]
 * @property {boolean} [lhrRuntimeError] True if it should appear in the top-level LHR.runtimeError property.
 */

const LHERROR_SENTINEL = '__LighthouseErrorSentinel';
const ERROR_SENTINEL = '__ErrorSentinel';
/**
 * @typedef {{sentinel: '__LighthouseErrorSentinel', code: string, stack?: string, cause?: unknown, properties?: {[p: string]: string|undefined}}} SerializedLighthouseError
 * @typedef {{sentinel: '__ErrorSentinel', message: string, code?: string, stack?: string, cause?: unknown}} SerializedBaseError
 */

/**
 * The {@link ErrorOptions} type wasn't added until es2022 (Node 16), so we recreate it here to support ts targets before es2022.
 * TODO: Just use `ErrorOptions` if we can't support targets before es2022 in the docs test.
 * @typedef {{cause: unknown}} LHErrorOptions
 */

class LighthouseError extends Error {
  /**
   * @param {LighthouseErrorDefinition} errorDefinition
   * @param {Record<string, string|undefined>=} properties
   * @param {LHErrorOptions=} options
   */
  constructor(errorDefinition, properties, options) {
    super(errorDefinition.code, options);
    this.name = 'LighthouseError';
    this.code = errorDefinition.code;
    // Add additional properties to be ICU replacements in the error string.
    // `code` is always added as `errorCode` so callers don't need to specify the code multiple times.
    this.friendlyMessage = str_(errorDefinition.message, {errorCode: this.code, ...properties});
    this.lhrRuntimeError = !!errorDefinition.lhrRuntimeError;
    if (properties) Object.assign(this, properties);

    Error.captureStackTrace(this, LighthouseError);
  }

  /**
   * @param {string} method
   * @param {{message: string, data?: string|undefined}} protocolError
   * @return {Error|LighthouseError}
   */
  static fromProtocolMessage(method, protocolError) {
    // extract all errors with a regex pattern to match against.
    // if we find one, use the friendly LighthouseError definition
    const matchedErrorDefinition = Object.values(LighthouseError.errors)
      .filter(e => e.pattern)
      .find(e => e.pattern && e.pattern.test(protocolError.message));
    if (matchedErrorDefinition) {
      return new LighthouseError(matchedErrorDefinition);
    }

    // otherwise fallback to building a generic Error
    let errMsg = `(${method}): ${protocolError.message}`;
    if (protocolError.data) errMsg += ` (${protocolError.data})`;
    const error = new Error(`Protocol error ${errMsg}`);
    return Object.assign(error, {protocolMethod: method, protocolError: protocolError.message});
  }

  /**
   * A JSON.stringify replacer to serialize LighthouseErrors and (as a fallback) Errors.
   * Returns a simplified version of the error object that can be reconstituted
   * as a copy of the original error at parse time.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter
   * @param {Error|LighthouseError} err
   * @return {SerializedBaseError|SerializedLighthouseError}
   */
  static stringifyReplacer(err) {
    if (err instanceof LighthouseError) {
      // Remove class props so that remaining values were what was passed in as `properties`.
      // eslint-disable-next-line no-unused-vars
      const {name, code, message, friendlyMessage, lhrRuntimeError, stack, cause, ...properties} = err;

      return {
        sentinel: LHERROR_SENTINEL,
        code,
        stack,
        cause,
        properties: /** @type {{ [p: string]: string | undefined }} */ (properties),
      };
    }

    // Unexpected errors won't be LighthouseErrors, but we want them serialized as well.
    if (err instanceof Error) {
      const {message, stack, cause} = err;
      // @ts-expect-error - code can be helpful for e.g. node errors, so preserve it if it's present.
      const code = err.code;
      return {
        sentinel: ERROR_SENTINEL,
        message,
        code,
        stack,
        cause,
      };
    }

    throw new Error('Invalid value for LighthouseError stringification');
  }

  /**
   * A JSON.parse reviver. If any value passed in is a serialized Error or
   * LighthouseError, the error is recreated as the original object. Otherwise, the
   * value is passed through unchanged.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#Using_the_reviver_parameter
   * @param {string} key
   * @param {any} possibleError
   * @return {any}
   */
  static parseReviver(key, possibleError) {
    if (typeof possibleError === 'object' && possibleError !== null) {
      if (possibleError.sentinel === LHERROR_SENTINEL) {
        // Include sentinel in destructuring so it doesn't end up in `properties`.
        // eslint-disable-next-line no-unused-vars
        const {code, stack, cause, properties} = /** @type {SerializedLighthouseError} */ (possibleError);
        const errorDefinition = LighthouseError.errors[/** @type {keyof typeof ERRORS} */ (code)];
        const lhError = new LighthouseError(errorDefinition, properties, {cause});
        lhError.stack = stack;

        return lhError;
      }

      if (possibleError.sentinel === ERROR_SENTINEL) {
        const {message, code, stack, cause} = /** @type {SerializedBaseError} */ (possibleError);
        const opts = cause ? {cause} : undefined;
        const error = new Error(message, opts);
        Object.assign(error, {code, stack});
        return error;
      }
    }

    return possibleError;
  }
}

const ERRORS = {
  // Screenshot/speedline errors
  NO_SPEEDLINE_FRAMES: {
    code: 'NO_SPEEDLINE_FRAMES',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  SPEEDINDEX_OF_ZERO: {
    code: 'SPEEDINDEX_OF_ZERO',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  NO_SCREENSHOTS: {
    code: 'NO_SCREENSHOTS',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  INVALID_SPEEDLINE: {
    code: 'INVALID_SPEEDLINE',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },

  // Trace parsing errors
  NO_TRACING_STARTED: {
    code: 'NO_TRACING_STARTED',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_RESOURCE_REQUEST: {
    code: 'NO_RESOURCE_REQUEST',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_NAVSTART: {
    code: 'NO_NAVSTART',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_FCP: {
    code: 'NO_FCP',
    message: UIStrings.noFcp,
    lhrRuntimeError: true,
  },
  NO_DCL: {
    code: 'NO_DCL',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_FMP: {
    code: 'NO_FMP',
    message: UIStrings.badTraceRecording,
  },
  NO_LCP: {
    code: 'NO_LCP',
    message: UIStrings.noLcp,
  },
  NO_LCP_ALL_FRAMES: {
    code: 'NO_LCP_ALL_FRAMES',
    message: UIStrings.noLcp,
  },
  UNSUPPORTED_OLD_CHROME: {
    code: 'UNSUPPORTED_OLD_CHROME',
    message: UIStrings.oldChromeDoesNotSupportFeature,
  },

  // TTI calculation failures
  NO_TTI_CPU_IDLE_PERIOD: {code: 'NO_TTI_CPU_IDLE_PERIOD', message: UIStrings.pageLoadTookTooLong},
  NO_TTI_NETWORK_IDLE_PERIOD: {
    code: 'NO_TTI_NETWORK_IDLE_PERIOD',
    message: UIStrings.pageLoadTookTooLong,
  },

  // Page load failures
  NO_DOCUMENT_REQUEST: {
    code: 'NO_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailed,
    lhrRuntimeError: true,
  },
  /* Used when DevTools reports loading failed. Usually an internal (Chrome) issue.
   * Requries an additional `errorDetails` field for translation.
   */
  FAILED_DOCUMENT_REQUEST: {
    code: 'FAILED_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailedWithDetails,
    lhrRuntimeError: true,
  },
  /* Used when status code is 4xx or 5xx.
   * Requires an additional `statusCode` field for translation.
   */
  ERRORED_DOCUMENT_REQUEST: {
    code: 'ERRORED_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailedWithStatusCode,
    lhrRuntimeError: true,
  },
  /* Used when security error prevents page load.
   * Requires an additional `securityMessages` field for translation.
   */
  INSECURE_DOCUMENT_REQUEST: {
    code: 'INSECURE_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailedInsecure,
    lhrRuntimeError: true,
  },
  /* Used when any Chrome interstitial error prevents page load.
   */
  CHROME_INTERSTITIAL_ERROR: {
    code: 'CHROME_INTERSTITIAL_ERROR',
    message: UIStrings.pageLoadFailedInterstitial,
    lhrRuntimeError: true,
  },
  /* Used when the page stopped responding and did not finish loading. */
  PAGE_HUNG: {
    code: 'PAGE_HUNG',
    message: UIStrings.pageLoadFailedHung,
    lhrRuntimeError: true,
  },
  /* Used when the page is non-HTML. */
  NOT_HTML: {
    code: 'NOT_HTML',
    message: UIStrings.notHtml,
    lhrRuntimeError: true,
  },

  // Protocol internal failures
  TRACING_ALREADY_STARTED: {
    code: 'TRACING_ALREADY_STARTED',
    message: UIStrings.internalChromeError,
    pattern: /Tracing.*started/,
    lhrRuntimeError: true,
  },
  PARSING_PROBLEM: {
    code: 'PARSING_PROBLEM',
    message: UIStrings.internalChromeError,
    pattern: /Parsing problem/,
    lhrRuntimeError: true,
  },
  READ_FAILED: {
    code: 'READ_FAILED',
    message: UIStrings.internalChromeError,
    pattern: /Read failed/,
    lhrRuntimeError: true,
  },

  // URL parsing failures
  INVALID_URL: {
    code: 'INVALID_URL',
    message: UIStrings.urlInvalid,
  },

  /* Protocol timeout failures
   * Requires an additional `protocolMethod` field for translation.
   */
  PROTOCOL_TIMEOUT: {
    code: 'PROTOCOL_TIMEOUT',
    message: UIStrings.protocolTimeout,
    lhrRuntimeError: true,
  },

  // DNS failure on main document (no resolution, timed out, etc)
  DNS_FAILURE: {
    code: 'DNS_FAILURE',
    message: UIStrings.dnsFailure,
    lhrRuntimeError: true,
  },

  /** A timeout in the initial connection to the debugger protocol. */
  CRI_TIMEOUT: {
    code: 'CRI_TIMEOUT',
    message: UIStrings.criTimeout,
    lhrRuntimeError: true,
  },

  /**
   * Error internal to Runner used when an artifact required for an audit is missing.
   * Requires an additional `artifactName` field for translation.
  */
  MISSING_REQUIRED_ARTIFACT: {
    code: 'MISSING_REQUIRED_ARTIFACT',
    message: UIStrings.missingRequiredArtifact,
  },

  /**
   * Error internal to Runner used when an artifact required for an audit was an error.
   * Requires additional `artifactName` and `errorMessage` fields for translation.
  */
  ERRORED_REQUIRED_ARTIFACT: {
    code: 'ERRORED_REQUIRED_ARTIFACT',
    message: UIStrings.erroredRequiredArtifact,
  },

  /** The page has crashed and will no longer respond to 99% of CDP commmands. */
  TARGET_CRASHED: {
    code: 'TARGET_CRASHED',
    message: UIStrings.targetCrashed,
    lhrRuntimeError: true,
  },

  // Hey! When adding a new error type, update lighthouse-result.proto too.
  // Only necessary for runtime errors, which come from artifacts or pageLoadErrors.
};

/** @type {Record<keyof typeof ERRORS, LighthouseErrorDefinition>} */
LighthouseError.errors = ERRORS;
LighthouseError.NO_ERROR = 'NO_ERROR';
LighthouseError.UNKNOWN_ERROR = 'UNKNOWN_ERROR';

export {LighthouseError, UIStrings};
