/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const lighthouse = require('../../index.js');
const defaultConfig = require('../../config/default-config.js');

/* eslint-env jest */

describe('Default Config', () => {
  it('only has opportunity audits that return opportunities details', async () => {
    const flags = {
      auditMode: __dirname + '/../results/artifacts/',

      // sample_v2 was run with these settings, so need to match them.
      throttlingMethod: 'devtools',
      channel: 'cli',
    };
    const {lhr} = await lighthouse('', flags);

    const opportunityResults = lhr.categories.performance.auditRefs
      .filter(ref => ref.group === 'load-opportunities')
      .map(ref => lhr.audits[ref.id]);

    // Check all expected opportunities were found.
    assert.strictEqual(opportunityResults.indexOf(undefined), -1);
    const defaultCount = defaultConfig.categories.performance.auditRefs
      .filter(ref => ref.group === 'load-opportunities').length;
    assert.strictEqual(opportunityResults.length, defaultCount);

    // And that they have the correct shape.
    opportunityResults.forEach(auditResult => {
      expect(auditResult).toMatchObject({details: {type: 'opportunity'}});
      assert.ok(!auditResult.errorMessage, `${auditResult.id}: ${auditResult.errorMessage}`);
      assert.ok(auditResult.details.overallSavingsMs !== undefined,
          `${auditResult.id} has an undefined overallSavingsMs`);
    });
  });
});
