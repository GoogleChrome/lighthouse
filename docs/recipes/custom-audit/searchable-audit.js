/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('lighthouse').Audit;

const MAX_SEARCHABLE_TIME = 4000;

/**
 * @fileoverview Tests that `window.myLoadMetrics.searchableTime` was below the
 * test threshold value.
 */

class LoadAudit extends Audit {
  static get meta() {
    return {
      id: 'searchable-audit',
      title: 'Search box initialized and ready',
      failureTitle: 'Search box slow to initialize',
      description: 'Used to measure time from navigationStart to when the search' +
          ' box is initialized and ready to search.',

      // The name of the custom gatherer class that provides input to this audit.
      requiredArtifacts: ['TimeToSearchable'],
    };
  }

  static audit(artifacts) {
    const loadMetrics = artifacts.TimeToSearchable;

    // Audit will pass when the search box loaded in less time than our threshold.
    // This score will be binary, so will get a red ✘ or green ✓ in the report.
    const belowThreshold = loadMetrics.searchableTime <= MAX_SEARCHABLE_TIME;

    return {
      numericValue: loadMetrics.searchableTime,
      // Cast true/false to 1/0
      score: Number(belowThreshold),
    };
  }
}

module.exports = LoadAudit;
