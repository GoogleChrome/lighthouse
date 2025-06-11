/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// NOTE: this require path does not resolve correctly.
// eslint-disable-next-line local-rules/require-file-extension
import LighthouseAudit from '../terrible/path/come/on/audit.js';

class RequireErrorAudit extends LighthouseAudit {
  static get meta() {
    return {
      id: 'require-error',
      title: 'Require Error',
      description: 'This one has a bad require()',
      requiredArtifacts: ['HTML'],
    };
  }

  static audit() {}
}

export default RequireErrorAudit;
