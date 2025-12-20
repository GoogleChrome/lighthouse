/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FCP3G = require('../../../audits/metrics/first-contentful-paint-3g.js');
const options = FCP3G.defaultOptions;

const pwaTrace = require('../../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Performance: first-contentful-paint-3g audit', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      traces: {
        [FCP3G.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [FCP3G.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const result = await FCP3G.audit(artifacts, {settings: {}, options, computedCache: new Map()});
    // Use InlineSnapshot here so changes to Lantern coefficients can be easily updated en masse
    expect({score: result.score, value: Math.round(result.numericValue)}).toMatchInlineSnapshot(`
Object {
  "score": 0.99,
  "value": 2087,
}
`);
  });
});
