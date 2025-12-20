/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/viewport.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('Mobile-friendly: viewport audit', () => {
  const makeMetaElements = viewport => [{name: 'viewport', content: viewport}];
  const fakeContext = {computedCache: new Map()};

  it('fails when HTML does not contain a viewport meta tag', async () => {
    const auditResult = await Audit.audit({
      MetaElements: [],
    }, fakeContext);
    assert.equal(auditResult.score, 0);
    expect(auditResult.explanation).toBeDisplayString('No `<meta name="viewport">` tag found');
  });

  it('fails when HTML contains a non-mobile friendly viewport meta tag', async () => {
    const viewport = 'maximum-scale=1';
    const auditResult = await Audit.audit({MetaElements: makeMetaElements(viewport)}, fakeContext);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.warnings[0], undefined);
  });

  it('passes when a valid viewport is provided', async () => {
    const viewport = 'initial-scale=1';
    const auditResult = await Audit.audit({
      MetaElements: makeMetaElements(viewport),
    }, fakeContext);
    assert.equal(auditResult.score, 1);
  });
});
