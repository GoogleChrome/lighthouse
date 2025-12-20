/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const testUtils = require('../test-utils.js');
const sampleJson = require('../results/sample_v2.json');
const preprocessor = require('../../lib/proto-preprocessor.js');

/* eslint-env jest */

const {describeIfProtoExists, sampleResultsRoundtripStr} = testUtils.getProtoRoundTrip();
const roundTripJson = sampleResultsRoundtripStr && JSON.parse(sampleResultsRoundtripStr);

describeIfProtoExists('round trip JSON comparison subsets', () => {
  let processedLHR;

  beforeEach(() => {
    processedLHR = preprocessor.processForProto(sampleJson);
  });

  it('has the same audit results and details (if applicable)', () => {
    for (const auditId of Object.keys(processedLHR.audits)) {
      expect(roundTripJson.audits[auditId]).toEqual(processedLHR.audits[auditId]);
    }
  });

  it('has the same i18n rendererFormattedStrings', () => {
    expect(roundTripJson.i18n).toMatchObject(processedLHR.i18n);
  });

  it('has the same top level values', () => {
    // Don't test all top level properties that are objects.
    Object.keys(processedLHR).forEach(audit => {
      if (typeof processedLHR[audit] === 'object' && !Array.isArray(processedLHR[audit])) {
        delete processedLHR[audit];
      }
    });

    // Properties set to their type's default value will be omitted in the roundTripJson.
    // For an explicit list of properties, remove sampleJson values if set to a default.
    if (Array.isArray(processedLHR.stackPacks) && processedLHR.stackPacks.length === 0) {
      delete processedLHR.stackPacks;
    }

    expect(roundTripJson).toMatchObject(processedLHR);
  });

  it('has the same config values', () => {
    // Config settings from proto round trip should be a subset of the actual settings.
    expect(processedLHR.configSettings).toMatchObject(roundTripJson.configSettings);
  });
});

describeIfProtoExists('round trip JSON comparison to everything', () => {
  let processedLHR;

  beforeEach(() => {
    processedLHR = preprocessor.processForProto(sampleJson);

    // Proto conversion turns empty summaries into null. This is OK,
    // and is handled in the PSI roundtrip just fine, but messes up the easy
    // jest sub-object matcher. So, we put the empty object back in its place.
    for (const audit of Object.values(roundTripJson.audits)) {
      if (audit.details && audit.details.summary === null) {
        audit.details.summary = {};
      }
    }
  });

  it('has the same JSON overall', () => {
    console.log(roundTripJson.audits);
    expect(processedLHR).toMatchObject(roundTripJson);
  });
});
