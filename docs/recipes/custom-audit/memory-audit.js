/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from 'lighthouse';

const MAX_MEMORY_USAGE = 1_000_000;

/**
 * @fileoverview Tests that the memory usage is below a certain threshold.
 */

class MemoryUsage extends Audit {
  static get meta() {
    return {
      id: 'memory-audit',
      title: 'Did not find any large memory usage',
      failureTitle: 'Found large memory usage',
      description: 'Detects if any memory sample was larger than 1 MB',

      // The name of the custom gatherer class that provides input to this audit.
      requiredArtifacts: ['MemoryProfile'],
    };
  }

  static audit(artifacts) {
    let largestMemoryUsage = 0;
    for (const sample of artifacts.MemoryProfile.samples) {
      if (sample.total > largestMemoryUsage) {
        largestMemoryUsage = sample.total;
      }
    }

    return {
      numericValue: largestMemoryUsage,
      score: largestMemoryUsage > MAX_MEMORY_USAGE ? 0 : 1,
    };
  }
}

export default MemoryUsage;
