/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {strict as assert} from 'assert';

import PastePreventingInputsAudit from '../../../audits/dobetterweb/paste-preventing-inputs.js';

describe('Inputs can be pasted into', () => {
  it('passes when there are no inputs preventing paste', () => {
    const auditResult = PastePreventingInputsAudit.audit({
      Inputs: {
        inputs: [],
      },
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when there are inputs preventing paste', () => {
    const auditResult = PastePreventingInputsAudit.audit({
      Inputs: {
        inputs: [
          {node: {snippet: 'bad'}, preventsPaste: true},
          {node: {snippet: ''}, preventsPaste: false},
          {node: {snippet: ''}},
        ],
      },
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].node.snippet, 'bad');
  });
});
