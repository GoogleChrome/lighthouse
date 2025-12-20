/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global window, document, getOuterHTMLSnippet, getNodePath, getNodeLabel */

const Gatherer = require('./gatherer.js');
const fs = require('fs');
const axeLibSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const pageFunctions = require('../../lib/page-functions.js');

/**
 * This is run in the page, not Lighthouse itself.
 * axe.run returns a promise which fulfills with a results object
 * containing any violations.
 * @return {Promise<LH.Artifacts.Accessibility>}
 */
/* istanbul ignore next */
function runA11yChecks() {
  // @ts-ignore axe defined by axeLibSource
  return window.axe.run(document, {
    elementRef: true,
    runOnly: {
      type: 'tag',
      values: [
        'wcag2a',
        'wcag2aa',
      ],
    },
    resultTypes: ['violations', 'inapplicable'],
    rules: {
      'tabindex': {enabled: true},
      'accesskeys': {enabled: true},
      'heading-order': {enabled: true},
      'meta-viewport': {enabled: true},
      'duplicate-id': {enabled: false},
      'table-fake-caption': {enabled: false},
      'td-has-header': {enabled: false},
      'marquee': {enabled: false},
      'area-alt': {enabled: false},
      'aria-dpub-role-fallback': {enabled: false},
      'html-xml-lang-mismatch': {enabled: false},
      'blink': {enabled: false},
      'server-side-image-map': {enabled: false},
      'identical-links-same-purpose': {enabled: false},
      'no-autoplay-audio': {enabled: false},
      'svg-img-alt': {enabled: false},
      'audio-caption': {enabled: false},
    },
    // @ts-ignore
  }).then(axeResult => {
    // @ts-ignore
    const augmentAxeNodes = result => {
      // @ts-ignore
      result.nodes.forEach(node => {
        // @ts-ignore - getNodePath put into scope via stringification
        node.path = getNodePath(node.element);
        // @ts-ignore - getOuterHTMLSnippet put into scope via stringification
        node.snippet = getOuterHTMLSnippet(node.element);
        // @ts-ignore - getNodeLabel put into scope via stringification
        node.nodeLabel = getNodeLabel(node.element);
        // avoid circular JSON concerns
        node.element = node.any = node.all = node.none = undefined;
      });

      // Ensure errors can be serialized over the protocol
      if (result.error instanceof Error) {
        result.error = {
          name: result.error.name,
          message: result.error.message,
          stack: result.error.stack,
          errorNode: result.error.errorNode,
        };
      }
    };

    // Augment the node objects with outerHTML snippet & custom path string
    axeResult.violations.forEach(augmentAxeNodes);
    axeResult.incomplete.forEach(augmentAxeNodes);

    // We only need violations, and circular references are possible outside of violations
    axeResult = {
      violations: axeResult.violations,
      notApplicable: axeResult.inapplicable,
      incomplete: axeResult.incomplete,
    };
    return axeResult;
  });
}

class Accessibility extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.Accessibility>}
   */
  afterPass(passContext) {
    const driver = passContext.driver;
    const expression = `(function () {
      ${pageFunctions.getOuterHTMLSnippetString};
      ${pageFunctions.getNodePathString};
      ${pageFunctions.getNodeLabelString};
      ${axeLibSource};
      return (${runA11yChecks.toString()}());
    })()`;

    return driver.evaluateAsync(expression, {useIsolation: true}).then(returnedValue => {
      if (!returnedValue) {
        throw new Error('No axe-core results returned');
      }
      if (!Array.isArray(returnedValue.violations)) {
        throw new Error('Unable to parse axe results' + returnedValue);
      }
      return returnedValue;
    });
  }
}

module.exports = Accessibility;
