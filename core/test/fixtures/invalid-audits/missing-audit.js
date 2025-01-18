/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../../audits/audit.js';

class MissingAuditFn extends Audit {
  static get meta() {
    return {
      id: 'missing-audit-fn',
      title: 'Missing audit function',
      description: 'This is missing audit function',
      requiredArtifacts: ['HTML'],
    };
  }
}

export default MissingAuditFn;
