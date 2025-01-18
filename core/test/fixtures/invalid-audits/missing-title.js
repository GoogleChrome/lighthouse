/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../../audits/audit.js';

class MissingTitle extends Audit {
  static get meta() {
    return {
      id: 'missing-title',
      description: 'This is missing required title (and failureTitle)',
      requiredArtifacts: ['HTML'],
    };
  }

  static audit(_) {
    return {
      score: 1,
    };
  }
}

export default MissingTitle;
