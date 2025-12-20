/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/content-width.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('Mobile-friendly: content-width audit', () => {
  it('fails when scroll width differs from viewport width', () => {
    const result = Audit.audit({
      TestedAsMobileDevice: true,
      ViewportDimensions: {
        innerWidth: 100,
        outerWidth: 300,
      },
    });

    assert.equal(result.score, 0);
    assert.ok(result.explanation);
  });

  it('passes when widths match', () => {
    return assert.equal(Audit.audit({
      HostUserAgent: '',
      ViewportDimensions: {
        innerWidth: 300,
        outerWidth: 300,
      },
    }, {settings: {emulatedFormFactor: 'mobile'}}).score, 1);
  });

  it('not applicable when run on desktop', () => {
    return assert.equal(Audit.audit({
      TestedAsMobileDevice: false,
      ViewportDimensions: {
        innerWidth: 300,
        outerWidth: 450,
      },
    }).notApplicable, true);
  });
});
