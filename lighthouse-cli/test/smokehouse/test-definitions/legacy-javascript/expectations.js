/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for sites with polyfills.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/legacy-javascript.html',
      finalUrl: 'http://localhost:10200/legacy-javascript.html',
      audits: {
        'legacy-javascript': {
          details: {
            items: [
              {
                url: 'http://localhost:10200/legacy-javascript.js',
                signals: [
                  '@babel/plugin-transform-classes',
                  '@babel/plugin-transform-regenerator',
                  '@babel/plugin-transform-spread',
                ],
              },
              {
                url: 'http://localhost:10200/legacy-javascript.html',
                signals: [
                  'String.prototype.includes',
                ],
              },
            ],
          },
        },
      },
    },
  },
];
