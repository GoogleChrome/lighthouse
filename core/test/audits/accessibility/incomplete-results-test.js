/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'assert/strict';

import AxeAudit from '../../../audits/accessibility/axe-audit.js';
import {Audit} from '../../../audits/audit.js';
import {ReportScoring} from '../../../scoring.js';

class TestAudit extends AxeAudit {
  static get meta() {
    return {
      id: 'test-rule', title: 'Test', description: 'Test', requiredArtifacts: ['Accessibility'],
    };
  }
}

class InformativeAudit extends TestAudit {
  static get meta() {
    return {...super.meta, scoreDisplayMode: 'informative'};
  }
}

const node = selector => ({
  node: {selector, snippet: `<div id="${selector.slice(1)}"></div>`}, relatedNodes: [],
});
const rule = (...selectors) => ({id: 'test-rule', nodes: selectors.map(node)});
const result = (violations, incomplete) => Audit.generateAuditResult(TestAudit,
  TestAudit.audit({Accessibility: {violations, incomplete}}));

describe('Accessibility incomplete results', () => {
  it('preserves violations and manual-review nodes separately in JSON', () => {
    const output = JSON.parse(JSON.stringify(
      result([rule('#bad')], [rule('#uncertain', '#other')])));
    assert.equal(output.score, 0);
    assert.equal(output.scoreDisplayMode, 'binary');
    assert.ok(output.displayValue);
    assert.equal(output.details.type, 'list');
    // A consumer expecting top-level table rows cannot find node values here.
    assert.deepEqual(output.details.items.map(item => item.node), [undefined, undefined]);
    assert.deepEqual(
      output.details.items.map(item => item.value.items.map(row => row.node.selector)),
      [['#bad'], ['#uncertain', '#other']]);
  });

  it('makes incomplete-only results informative and excludes them from category score', () => {
    const output = result([], [rule('#uncertain')]);
    assert.equal(output.scoreDisplayMode, 'informative');
    assert.ok(output.displayValue);
    // Lighthouse stores 1 for informative results; scoreDisplayMode determines interpretation.
    assert.equal(output.score, 1);
    const categories = {accessibility: {auditRefs: [
      {id: 'test-rule', weight: 2}, {id: 'other', weight: 1},
    ]}};
    const scored = ReportScoring.scoreAllCategories(
      categories, {'test-rule': output, 'other': {score: 0}});
    assert.equal(scored.accessibility.score, 0);
    assert.equal(scored.accessibility.auditRefs[0].weight, 0);
  });

  it('keeps ordinary violations as a table with binary score', () => {
    const output = result([rule('#bad')], []);
    assert.equal(output.details.type, 'table');
    assert.equal(output.scoreDisplayMode, 'binary');
    assert.equal(output.score, 0);
    assert.equal(output.displayValue, undefined);
  });
  it('retains category scoring for mixed violations and incomplete results', () => {
    const output = result([rule('#bad')], [rule('#uncertain')]);
    const categories = {accessibility: {auditRefs: [
      {id: 'test-rule', weight: 2}, {id: 'other', weight: 1},
    ]}};
    const scored = ReportScoring.scoreAllCategories(
      categories, {'test-rule': output, 'other': {score: 1}});
    assert.equal(scored.accessibility.score, 0.33);
    assert.equal(scored.accessibility.auditRefs[0].weight, 2);
  });

  it('does not confuse incomplete results from another rule', () => {
    const output = result([], [{id: 'different', nodes: [node('#other')]}]);
    assert.equal(output.scoreDisplayMode, 'binary');
    assert.equal(output.score, 1);
    assert.equal(output.details.type, 'table');
  });

  it('preserves axe errors instead of treating them as manual review', () => {
    const output = result(
      [rule('#bad')], [{...rule('#uncertain'), error: {message: 'axe failed'}}]);
    assert.equal(output.scoreDisplayMode, 'error');
    assert.equal(output.errorMessage, 'axe-core Error: axe failed');
  });
  it('preserves both sets of results for informative audits', () => {
    const artifacts = {Accessibility: {
      violations: [rule('#bad')], incomplete: [rule('#review')],
    }};
    const output = Audit.generateAuditResult(InformativeAudit, InformativeAudit.audit(artifacts));
    assert.equal(output.scoreDisplayMode, 'informative');
    assert.equal(output.score, 1);
    assert.equal(output.details.type, 'list');
    assert.deepEqual(output.details.items.map(section => section.value.items[0].node.selector),
      ['#bad', '#review']);
  });

  it('returns not applicable when an informative audit has no findings', () => {
    const product = InformativeAudit.audit({Accessibility: {violations: [], incomplete: []}});
    const output = Audit.generateAuditResult(InformativeAudit, product);
    assert.equal(output.scoreDisplayMode, 'notApplicable');
    assert.equal(output.score, null);
  });

  it('keeps node explanations and related nodes through JSON serialization', () => {
    const related = {snippet: '<span>related</span>', selector: '#related'};
    const uncertain = {
      ...node('#review'), failureSummary: 'Check manually', relatedNodes: [related],
    };
    const product = TestAudit.audit({Accessibility: {
      violations: [rule('#bad')], incomplete: [{id: 'test-rule', nodes: [uncertain]}],
    }});
    const output = JSON.parse(JSON.stringify(Audit.generateAuditResult(TestAudit, product)));
    const row = output.details.items[1].value.items[0];
    assert.equal(row.node.explanation, 'Check manually');
    assert.equal(row.subItems.items[0].relatedNode.selector, '#related');
  });

  it('retains an error score when a weighted audit fails to run', () => {
    const output = result([], [rule('#review')]);
    const scored = ReportScoring.scoreAllCategories({accessibility: {auditRefs: [
      {id: 'test-rule', weight: 1}, {id: 'broken', weight: 1},
    ]}}, {'test-rule': output, 'broken': {score: null, scoreDisplayMode: 'error'}});
    assert.equal(scored.accessibility.score, null);
    assert.equal(scored.accessibility.auditRefs[1].weight, 1);
  });

  it('ignores the informational audit without changing a remaining valid score', () => {
    const output = result([], [rule('#review')]);
    const scored = ReportScoring.scoreAllCategories({accessibility: {auditRefs: [
      {id: 'test-rule', weight: 2}, {id: 'valid', weight: 1},
    ]}}, {'test-rule': output, 'valid': {score: 1, scoreDisplayMode: 'binary'}});
    assert.equal(scored.accessibility.score, 1);
  });

  it('returns zero for an all-zero-weight category under the existing scoring algorithm', () => {
    const output = result([], [rule('#review')]);
    const scored = ReportScoring.scoreAllCategories(
      {accessibility: {auditRefs: [{id: 'test-rule', weight: 1}]}}, {'test-rule': output});
    assert.equal(scored.accessibility.auditRefs[0].weight, 0);
    assert.equal(scored.accessibility.score, 0);
  });
});
