/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../../audits/audit.js';

class MissingRequiredArtifacts extends Audit {
  static get meta() {
    return {
      id: 'missing-required-artifacts',
      title: 'Missing required artifacts',
      failureTitle: 'Missing required artifacts is failing',
      description: 'This is missing required artifacts',
    };
  }

  static audit(_) {
    return {
      score: 1,
    };
  }
}

export default MissingRequiredArtifacts;
