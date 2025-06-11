/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    MainDocumentContent: /Redirect to myself/,
    URL: {
      requestedUrl: 'http://localhost:10200/redirects-self.html',
      mainDocumentUrl: 'http://localhost:10200/redirects-self.html?done=',
      finalDisplayedUrl: 'http://localhost:10200/redirects-self.html',
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/redirects-self.html',
    finalDisplayedUrl: 'http://localhost:10200/redirects-self.html',
    audits: {
    },
    runWarnings: [
      'The page may not be loading as expected because your test URL (http://localhost:10200/redirects-self.html) was redirected to http://localhost:10200/redirects-self.html?done=. Try testing the second URL directly.',
    ],
  },
};

export default {
  id: 'redirects-self',
  expectations,
};

