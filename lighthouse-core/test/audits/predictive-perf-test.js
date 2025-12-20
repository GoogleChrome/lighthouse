/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const PredictivePerf = require('../../audits/predictive-perf.js');

const acceptableTrace = require('../fixtures/traces/lcp-m78.json');
const acceptableDevToolsLog = require('../fixtures/traces/lcp-m78.devtools.log.json');

/* eslint-env jest */
describe('Performance: predictive performance audit', () => {
  it('should compute the predicted values', () => {
    const artifacts = {
      traces: {
        [PredictivePerf.DEFAULT_PASS]: acceptableTrace,
      },
      devtoolsLogs: {
        [PredictivePerf.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    };
    const context = {computedCache: new Map(), settings: {locale: 'en'}};

    return PredictivePerf.audit(artifacts, context).then(output => {
      const metrics = output.details.items[0];
      for (const [key, value] of Object.entries(metrics)) {
        metrics[key] = Math.round(value);
      }

      expect(metrics).toMatchSnapshot();
    });
  });
});
