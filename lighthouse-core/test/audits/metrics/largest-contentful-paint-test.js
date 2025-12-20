/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LCPAudit = require('../../../audits/metrics/largest-contentful-paint.js');
const defaultOptions = LCPAudit.defaultOptions;

const trace = require('../../fixtures/traces/lcp-m78.json');
const devtoolsLog = require('../../fixtures/traces/lcp-m78.devtools.log.json');

function generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice}) {
  return {
    traces: {[LCPAudit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[LCPAudit.DEFAULT_PASS]: devtoolsLog},
    TestedAsMobileDevice,
  };
}

function generateContext({throttlingMethod}) {
  const settings = {throttlingMethod};
  return {options: defaultOptions, settings, computedCache: new Map()};
}
/* eslint-env jest */

describe('Performance: largest-contentful-paint audit', () => {
  it('adjusts scoring based on form factor', async () => {
    const artifactsMobile = generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice: true});
    const contextMobile = generateContext({throttlingMethod: 'provided'});

    const outputMobile = await LCPAudit.audit(artifactsMobile, contextMobile);
    expect(outputMobile.numericValue).toBeCloseTo(1121.711, 1);
    expect(outputMobile.score).toBe(1);
    expect(outputMobile.displayValue).toBeDisplayString('1.1\xa0s');

    const artifactsDesktop = generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice: false});
    const contextDesktop = generateContext({throttlingMethod: 'provided'});

    const outputDesktop = await LCPAudit.audit(artifactsDesktop, contextDesktop);
    expect(outputDesktop.numericValue).toBeCloseTo(1121.711, 1);
    expect(outputDesktop.score).toBe(0.92);
    expect(outputDesktop.displayValue).toBeDisplayString('1.1\xa0s');
  });
});
