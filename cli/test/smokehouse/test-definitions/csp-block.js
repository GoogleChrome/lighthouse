/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {[string, string][]} headers
 * @return {string}
 */
function headersParam(headers) {
  const headerString = new URLSearchParams(headers).toString();
  return new URLSearchParams([['extra_header', headerString]]).toString();
}

/**
 * `default-src 'none'` is wildly restrictive and not realsistic to what we'd see in the wild.
 * Therefore, `connect-src 'self'` is needed for our Fetcher to load robots.txt and sourcemaps.
 * Without it the 'none' wouldn't let a same-origin fetch succeed, even when going through `Network.loadNetworkResource`. https://github.com/GoogleChrome/lighthouse/issues/16597
 *
 * Some script are required for the test, so allow via the attribute nonce="00000000".
 */
const blockAllExceptInlineScriptCsp = headersParam([[
  'Content-Security-Policy',
  `default-src 'none'; connect-src 'self'; script-src 'nonce-00000000'`,
]]);

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    RobotsTxt: {
      status: 200,
    },
    InspectorIssues: {
      contentSecurityPolicyIssue: undefined,
    },
    SourceMaps: [{
      sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
      map: {},
      errorMessage: undefined,
    }],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/csp.html?' + blockAllExceptInlineScriptCsp,
    finalDisplayedUrl: 'http://localhost:10200/csp.html?' + blockAllExceptInlineScriptCsp,
    audits: {},
  },
};

const testDefn = {
  id: 'csp-block',
  expectations,
};

export {
  blockAllExceptInlineScriptCsp,
  testDefn as default,
};
