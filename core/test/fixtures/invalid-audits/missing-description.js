/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../../audits/audit.js';

class MissingDescription extends Audit {
  static get meta() {
    return {
      id: 'missing-description',
      title: 'Missing description',
      failureTitle: 'Missing description is failing',
      requiredArtifacts: ['HTML'],
    };
  }

  static audit(_) {
    return {
      score: 1,
    };
  }
}

export default MissingDescription;
