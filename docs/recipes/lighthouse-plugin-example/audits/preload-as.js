/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from 'lighthouse';

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

export default PreloadAsAudit;
