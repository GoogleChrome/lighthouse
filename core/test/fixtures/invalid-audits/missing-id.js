/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../../audits/audit.js';

class MissingID extends Audit {
  static get meta() {
    return {
      title: 'Missing id',
      description: 'This is missing required id',
      requiredArtifacts: ['HTML'],
    };
  }

  static audit(_) {
    return {
      score: 1,
    };
  }
}

export default MissingID;
