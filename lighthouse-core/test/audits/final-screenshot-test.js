/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;

const FinalScreenshotAudit = require('../../audits/final-screenshot.js');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');

/* eslint-env jest */

describe('Final screenshot', () => {
  it('should extract a final screenshot from a trace', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
    });
    const results = await FinalScreenshotAudit.audit(artifacts, {computedCache: new Map()});

    assert.equal(results.score, 1);
    assert.equal(results.details.timing, 818);
    assert.equal(results.details.timestamp, 225414990064);
    assert.ok(results.details.data.startsWith('data:image/jpeg;base64,/9j/4AAQSkZJRgABA'));
  });
});
