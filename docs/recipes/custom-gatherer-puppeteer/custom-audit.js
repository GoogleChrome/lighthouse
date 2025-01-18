/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from 'lighthouse';

class CustomAudit extends Audit {
  static get meta() {
    return {
      id: 'custom-audit',
      title: 'First text input field accepts `123` as input',
      failureTitle: 'First text input field doesn\'t accept `123` as input',
      description: 'Example custom audit which relies on a fancy gatherer.',

      // The name of the custom gatherer class that provides input to this audit.
      requiredArtifacts: ['CustomGatherer'],
    };
  }

  static audit(artifacts) {
    const value = artifacts.CustomGatherer.value;
    const success = value === '123';

    return {
      // Cast true/false to 1/0
      score: Number(success),
    };
  }
}

export default CustomAudit;
