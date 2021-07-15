/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for sites with OOPIFS.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/oopif/oopif-outer.html',
      finalUrl: 'http://localhost:10200/oopif/oopif-outer.html',
      audits: {
        'network-requests': {
          details: {
            items: [
              {'url': 'http://localhost:10200/oopif/oopif-outer.html'},
              {'url': 'http://oopifdomain:10503/oopif/oopif-inner.html'},
              {'url': 'http://localhost:10200/favicon.ico'},
            ],
          },
        },
      },
    },
    artifacts: {
      IFrameElements: [
        {
          id: 'oopif',
          src: /^http:\/\/oopifdomain:10503\/oopif\/oopif-inner\.html/,
          clientRect: {
            width: '>0',
            height: '>0',
          },
          isPositionFixed: false,
        },
      ],
    },
  },
];
