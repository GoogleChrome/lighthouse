/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expectations of CSP results with a default Lighthouse run.
 */
const expectations = {
  artifacts: {
    RobotsTxt: {
      status: 200,
    },
    InspectorIssues: {contentSecurityPolicyIssue: []},
    SourceMaps: [{
      sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
      map: {},
      errorMessage: undefined,
    }],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/csp.html',
    finalDisplayedUrl: 'http://localhost:10200/csp.html',
    audits: {},
  },
};

export default {
  id: 'csp-allow-all',
  expectations,
};
