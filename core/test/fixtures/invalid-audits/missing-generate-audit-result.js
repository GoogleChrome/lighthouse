/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

class MissingGenerateAuditResult {
  static get meta() {
    return {
      id: 'missing-required-artifacts',
      title: 'Missing required artifacts',
      description: 'This is missing required artifacts',
      requiredArtifacts: ['HTML'],
    };
  }

  static audit(_) {
    return {
      score: 1,
    };
  }
}

export default MissingGenerateAuditResult;
