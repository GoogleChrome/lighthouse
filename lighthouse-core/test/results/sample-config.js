/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Config used for generating the sample_v2 golden LHR.
 */

/** @type {LH.Config.Json} */
const budgetedConfig = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
    budgets: [{
      path: '/',
      resourceCounts: [
        {resourceType: 'total', budget: 10},
        {resourceType: 'stylesheet', budget: 2},
        {resourceType: 'image', budget: 2},
        {resourceType: 'media', budget: 0},
        {resourceType: 'font', budget: 1},
        {resourceType: 'script', budget: 2},
        {resourceType: 'document', budget: 1},
        {resourceType: 'other', budget: 2},
        {resourceType: 'third-party', budget: 1},
      ],
      resourceSizes: [
        {resourceType: 'total', budget: 100},
        {resourceType: 'stylesheet', budget: 5},
        {resourceType: 'image', budget: 30},
        {resourceType: 'media', budget: 0},
        {resourceType: 'font', budget: 20},
        {resourceType: 'script', budget: 30},
        {resourceType: 'document', budget: 15},
        {resourceType: 'other', budget: 5},
        {resourceType: 'third-party', budget: 25},
      ],
      timings: [
        {metric: 'first-contentful-paint', budget: 3000},
        {metric: 'first-cpu-idle', budget: 2900},
        {metric: 'interactive', budget: 2900},
        {metric: 'first-meaningful-paint', budget: 2000},
        {metric: 'max-potential-fid', budget: 100},
      ],
    }],
  },
};

module.exports = budgetedConfig;
