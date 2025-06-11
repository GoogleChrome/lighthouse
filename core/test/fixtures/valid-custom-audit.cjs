/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = import('../../audits/audit.js').then(({Audit}) => {
  return class ValidCustomAudit extends Audit {
    static get meta() {
      return {
        id: 'valid-audit',
        title: 'Valid Audit',
        failureTitle: 'Valid failing Audit',
        description: 'Valid-sounding description',
        requiredArtifacts: ['HTML'],
      };
    }

    static audit() {}
  };
});
