/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import Audit from '../../../audits/seo/meta-description.js';

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
