/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import PredictivePerf from '../../audits/predictive-perf.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';

const acceptableTrace = readJson('../fixtures/traces/lcp-m78.json', import.meta);
const acceptableDevToolsLog = readJson('../fixtures/traces/lcp-m78.devtools.log.json', import.meta);

describe('Performance: predictive performance audit', () => {
  it('should compute the predicted values', async () => {
    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(acceptableDevToolsLog),
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [PredictivePerf.DEFAULT_PASS]: acceptableTrace,
      },
      devtoolsLogs: {
        [PredictivePerf.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    };
    const context = {computedCache: new Map(), settings: {locale: 'en'}};

    const output = await PredictivePerf.audit(artifacts, context);
    expect(output.displayValue).toBeDisplayString('4,590 ms');
    const metrics = output.details.items[0];
    for (const [key, value] of Object.entries(metrics)) {
      metrics[key] = value === undefined ? value : Math.round(value);
    }
    expect(metrics).toMatchSnapshot();
  });
});
