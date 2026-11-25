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
 * `default-src 'none'` is wildly restrictive and not realistic to what we'd see in the wild.
 * `connect-src 'none'` blocks our Fetcher from loading source maps, since `Network.loadNetworkResource`
 * enforces the page's CSP. `robots.txt` is a site-wide resource and is fetched independently of the
 * page's policy, so the audit still passes. https://github.com/GoogleChrome/lighthouse/issues/17292
 *
 * Some script are required for the test, so allow via the attribute nonce="00000000".
 */
const blockAllExceptInlineScriptCsp = headersParam([[
  'Content-Security-Policy',
  `default-src 'none'; connect-src 'none'; script-src 'nonce-00000000'`,
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
      // DevTools frontend makes an internal fetch to com.chrome.devtools.json which triggers an extraneous CSP violation under connect-src 'none'.
      _excludeRunner: 'devtools',
      contentSecurityPolicyIssue: undefined,
    },
    SourceMaps: [{
      sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
      // Source maps are page resources, so the page's CSP still applies to fetching them.
      map: undefined,
      errorMessage: /CSP violation/,
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
