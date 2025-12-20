/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/works-offline.js');
const assert = require('assert').strict;

/* eslint-env jest */

const URL = 'https://www.chromestatus.com';

describe('Offline: works-offline audit', () => {
  it('correctly audits a 200 code', () => {
    const output = Audit.audit({
      Offline: 200,
      URL: {requestedUrl: URL, finalUrl: URL},
    });

    assert.equal(output.score, 1);
    assert.ok(!output.explanation);
  });

  it('warns if requested url does not match final url', () => {
    const output = Audit.audit({
      Offline: 404,
      URL: {requestedUrl: URL, finalUrl: `${URL}/features`},
    });

    assert.equal(output.score, 0);
    assert.ok(output.warnings[0]);
  });

  it('correctly audits a non-200 code', () => {
    const output = Audit.audit({
      Offline: 203,
      URL: {requestedUrl: URL, finalUrl: URL},
    });

    assert.equal(output.score, 0);
    assert.ok(!output.explanation);
  });
});
