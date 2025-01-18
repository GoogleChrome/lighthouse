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
 * Some script are required for the test.
 * Allow scripts with the attribute nonce="00000000".
 */
const blockAllExceptInlineScriptCsp = headersParam([[
  'Content-Security-Policy',
  `default-src 'none'; script-src 'nonce-00000000'`,
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
      contentSecurityPolicyIssue: [],
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
  id: 'csp-block-all',
  expectations,
};

export {
  blockAllExceptInlineScriptCsp,
  testDefn as default,
};
