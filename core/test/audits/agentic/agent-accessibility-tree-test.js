/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import AgentAccessibilityTreeAudit from '../../../audits/agentic/agent-accessibility-tree.js';


describe('Agentic: agent-accessibility-tree audit', () => {
  it('passes when there are no accessibility violations', () => {
    const artifacts = {
      Accessibility: {
        violations: [],
      },
    };

    const auditResult = AgentAccessibilityTreeAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details, undefined);
    assert.equal(auditResult.displayValue.formattedDefault, 'All audits passed');
  });

  it('passes when there are violations but none are in the target list', () => {
    const artifacts = {
      Accessibility: {
        violations: [
          {id: 'color-contrast', help: 'Elements must have sufficient color contrast'},
        ],
      },
    };

    const auditResult = AgentAccessibilityTreeAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details, undefined);
    assert.equal(auditResult.displayValue.formattedDefault, 'All audits passed');
  });

  it('fails when there are violations in the target list', () => {
    const artifacts = {
      Accessibility: {
        violations: [
          {
            id: 'button-name',
            help: 'Buttons must have discernible text',
            nodes: [{node: {snippet: '<button>'}}],
          },
          {
            id: 'label',
            help: 'Form elements must have labels',
            nodes: [{node: {snippet: '<input>'}}],
          },
        ],
      },
    };

    const auditResult = AgentAccessibilityTreeAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.type, 'list');
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].title.formattedDefault, 'Failed Audits');
    const items = auditResult.details.items[0].value.items;
    assert.equal(items.length, 2);
    assert.equal(items[0].description, 'Buttons must have discernible text');
    assert.ok(items[0].node);
    assert.equal(items[1].description, 'Form elements must have labels');
    assert.ok(items[1].node);
  });

  it('handles missing Accessibility artifact gracefully', () => {
    const artifacts = {};
    const auditResult = AgentAccessibilityTreeAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.displayValue.formattedDefault, 'All audits passed');
  });
});
