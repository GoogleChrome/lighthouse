/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');

const mapJson =
  fs.readFileSync(`${__dirname}/../../../fixtures/source-map/script.js.map`, 'utf-8');
const map = JSON.parse(mapJson);

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for seo tests
 */
const expectations = [
  {
    artifacts: {
      SourceMaps: [
        {
          scriptUrl: 'http://localhost:10200/source-map/source-map-tester.html',
          sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
          map,
        },
        {
          scriptUrl: 'http://localhost:10200/source-map/source-map-tester.html',
          sourceMapUrl: 'http://localhost:10503/source-map/script.js.map',
          map,
        },
      ],
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/source-map/source-map-tester.html',
      finalUrl: 'http://localhost:10200/source-map/source-map-tester.html',
      audits: {},
    },
  },
];

module.exports = expectations;
