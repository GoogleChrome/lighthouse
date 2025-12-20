/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MetricsAudit = require('../../audits/metrics.js');
const TTIComputed = require('../../computed/metrics/interactive.js');

const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const lcpTrace = require('../fixtures/traces/lcp-m78.json');
const lcpDevtoolsLog = require('../fixtures/traces/lcp-m78.devtools.log.json');

const artifactsTrace = require('../results/artifacts/defaultPass.trace.json');
const artifactsDevtoolsLog = require('../results/artifacts/defaultPass.devtoolslog.json');

/* eslint-env jest */

describe('Performance: metrics', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input correctly (throttlingMethod=provided)', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with lcp) correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with CLS) correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: artifactsTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: artifactsDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0].cumulativeLayoutShift).toMatchInlineSnapshot(`0.42`);
    expect(details.items[0].observedCumulativeLayoutShift).toMatchInlineSnapshot(`0.42`);
  });

  it('does not fail the entire audit when TTI errors', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const mockTTIFn = jest.spyOn(TTIComputed, 'request');
    mockTTIFn.mockRejectedValueOnce(new Error('TTI failed'));
    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0].interactive).toEqual(undefined);
  });
});
