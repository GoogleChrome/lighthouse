/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ManualAudit from '../../audits/manual/manual-audit.js';

// Extend the Audit class but fail to implement meta. It should throw errors.
class TestAudit extends ManualAudit {
  static get meta() {
    return Object.assign({
      id: 'manual-audit',
      description: 'Some help text.',
    }, super.partialMeta);
  }
}

describe('ManualAudit', () => {
  it('sets defaults', () => {
    assert.equal(TestAudit.meta.id, 'manual-audit');
    assert.equal(TestAudit.meta.requiredArtifacts.length, 0);
    assert.equal(TestAudit.meta.scoreDisplayMode, 'manual');
  });
});
