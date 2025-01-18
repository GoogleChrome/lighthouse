/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import Audit from '../../audits/viewport.js';

describe('Mobile-friendly: viewport audit', () => {
  const makeMetaElements = viewport => [{name: 'viewport', content: viewport}];
  const fakeContext = {computedCache: new Map()};

  it('fails when HTML does not contain a viewport meta tag', async () => {
    const auditResult = await Audit.audit({
      MetaElements: [],
    }, fakeContext);
    assert.equal(auditResult.score, 0);
    expect(auditResult.explanation).toBeDisplayString('No `<meta name="viewport">` tag found');
    expect(auditResult.metricSavings).toEqual({INP: 300});
  });

  it('fails when HTML contains a non-mobile friendly viewport meta tag', async () => {
    const viewport = 'maximum-scale=1';
    const auditResult = await Audit.audit({MetaElements: makeMetaElements(viewport)}, fakeContext);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.warnings[0], undefined);
    expect(auditResult.metricSavings).toEqual({INP: 300});
  });

  it('passes when a valid viewport is provided', async () => {
    const viewport = 'initial-scale=1';
    const auditResult = await Audit.audit({
      MetaElements: makeMetaElements(viewport),
    }, fakeContext);
    assert.equal(auditResult.score, 1);
    expect(auditResult.metricSavings).toEqual({INP: 0});
  });
});
