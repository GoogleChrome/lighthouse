/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for visibility tests.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/visibility.html',
      finalUrl: 'http://localhost:10200/visibility.html',
      audits: {},
      runWarnings: [],
    },
    artifacts: {
      Visibility: [{state: 'visible'}],
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/visibility.html?hidden',
      finalUrl: 'http://localhost:10200/visibility.html?hidden',
      audits: {},
      runWarnings: ['Window was hidden for part of all of the audit. Metrics may be inaccurate.'],
    },
    artifacts: {
      Visibility: [
        {state: 'visible'},
        {state: 'hidden'},
      ],
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/visibility.html?toggle=3',
      finalUrl: 'http://localhost:10200/visibility.html?toggle=3',
      audits: {},
      runWarnings: ['Window was hidden for part of all of the audit. Metrics may be inaccurate.'],
    },
    artifacts: {
      Visibility: [
        {state: 'visible'},
        {state: 'hidden'},
        {state: 'visible'},
        {state: 'hidden'},
        {state: 'visible'},
        {state: 'hidden'},
        {state: 'visible'},
      ],
    },
  },
];
