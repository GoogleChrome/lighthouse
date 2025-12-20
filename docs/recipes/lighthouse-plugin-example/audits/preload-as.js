/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('lighthouse').Audit;

/**
 * @fileoverview A fake additional check of the robots.txt file.
 */

// https://fetch.spec.whatwg.org/#concept-request-destination
const allowedTypes = new Set(['font', 'image', 'script', 'serviceworker', 'style', 'worker']);

class PreloadAsAudit extends Audit {
  static get meta() {
    return {
      id: 'preload-as',
      title: 'Preloaded requests have proper `as` attributes',
      failureTitle: 'Some preloaded requests do not have proper `as` attributes',
      description: '`<link rel=preload>` tags need an `as` attribute to specify the type of ' +
          'content being loaded.',

      // The name of the artifact provides input to this audit.
      requiredArtifacts: ['LinkElements'],
    };
  }

  static audit(artifacts) {
    // Check that all `<link rel=preload>` elements had a defined `as` attribute.
    const preloadLinks = artifacts.LinkElements.filter(el => el.rel === 'preload');
    const noAsLinks = preloadLinks.filter(el => !allowedTypes.has(el.as));

    // Audit passes if there are no missing attributes.
    const passed = noAsLinks.length === 0;

    return {
      score: passed ? 1 : 0,
      displayValue: `Found ${noAsLinks.length} preload requests with missing \`as\` attributes`,
    };
  }
}

module.exports = PreloadAsAudit;
