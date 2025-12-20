/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../../audits/seo/meta-description.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('SEO: description audit', () => {
  const makeMetaElements = content => [{name: 'description', content}];

  it('fails when HTML does not contain a description meta tag', () => {
    const auditResult = Audit.audit({
      MetaElements: [],
    });
    assert.equal(auditResult.score, 0);
  });

  it('fails when HTML contains an empty description meta tag', () => {
    const auditResult = Audit.audit({
      MetaElements: makeMetaElements(''),
    });
    assert.equal(auditResult.score, 0);
    expect(auditResult.explanation).toBeDisplayString('Description text is empty.');
  });

  it('fails when description consists only of whitespace', () => {
    const auditResult = Audit.audit({
      MetaElements: makeMetaElements('\t\xa0'),
    });
    assert.equal(auditResult.score, 0);
    expect(auditResult.explanation).toBeDisplayString('Description text is empty.');
  });

  it('passes when a description text is provided', () => {
    return assert.equal(Audit.audit({
      MetaElements: makeMetaElements('description text'),
    }).score, 1);
  });
});
