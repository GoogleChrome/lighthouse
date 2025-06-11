/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../audits/audit.js';

class ValidCustomAudit extends Audit {
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
}

export default ValidCustomAudit;
