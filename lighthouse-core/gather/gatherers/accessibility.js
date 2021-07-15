/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global window, document */

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const axeLibSource = require('../../lib/axe.js').source;
const {getNodeDetails} = require('../../lib/page-functions.js');

/**
 * This is run in the page, not Lighthouse itself.
 * axe.run returns a promise which fulfills with a results object
 * containing any violations.
 * @return {Promise<LH.Artifacts.Accessibility>}
 */
/* c8 ignore start */
async function runA11yChecks() {
  /** @type {import('axe-core/axe')} */
  // @ts-expect-error - axe defined by axeLibSource
  const axe = window.axe;
  const application = `lighthouse-${Math.random()}`;
  axe.configure({
    branding: {
      application,
    },
    noHtml: true,
  });
  const axeResults = await axe.run(document, {
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
      'html-xml-lang-mismatch': {enabled: false},
      'blink': {enabled: false},
      'server-side-image-map': {enabled: false},
      'identical-links-same-purpose': {enabled: false},
      'no-autoplay-audio': {enabled: false},
      'svg-img-alt': {enabled: false},
      'audio-caption': {enabled: false},
      'aria-treeitem-name': {enabled: true},
      // https://github.com/dequelabs/axe-core/issues/2958
      'nested-interactive': {enabled: false},
      'frame-focusable-content': {enabled: false},
    },
  });

  // axe just scrolled the page, scroll back to the top of the page so that element positions
  // are relative to the top of the page
  document.documentElement.scrollTop = 0;

  return {
    violations: axeResults.violations.map(createAxeRuleResultArtifact),
    incomplete: axeResults.incomplete.map(createAxeRuleResultArtifact),
    notApplicable: axeResults.inapplicable.map(result => ({id: result.id})),
    version: axeResults.testEngine.version,
  };
}

/**
 * @param {import('axe-core/axe').Result} result
 * @return {LH.Artifacts.AxeRuleResult}
 */
function createAxeRuleResultArtifact(result) {
  // Simplify `nodes` and collect nodeDetails for each.
  const nodes = result.nodes.map(node => {
    const {target, failureSummary, element} = node;
    // TODO: with `elementRef: true`, `element` _should_ always be defined, but need to verify.
    const nodeDetails = getNodeDetails(/** @type {HTMLElement} */ (element));

    return {
      target,
      failureSummary,
      node: nodeDetails,
    };
  });

  // Ensure errors can be serialized over the protocol.
  /** @type {Error | undefined} */
  // @ts-expect-error - when rules throw an error, axe saves it here.
  // see https://github.com/dequelabs/axe-core/blob/eeff122c2de11dd690fbad0e50ba2fdb244b50e8/lib/core/base/audit.js#L684-L693
  const resultError = result.error;
  let error;
  if (resultError instanceof Error) {
    error = {
      name: resultError.name,
      message: resultError.message,
    };
  }

  return {
    id: result.id,
    impact: result.impact || undefined,
    tags: result.tags,
    nodes,
    error,
  };
}
/* c8 ignore stop */

class Accessibility extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts.Accessibility>}
   */
  getArtifact(passContext) {
    const driver = passContext.driver;

    return driver.executionContext.evaluate(runA11yChecks, {
      args: [],
      useIsolation: true,
      deps: [
        axeLibSource,
        getNodeDetails,
        createAxeRuleResultArtifact,
      ],
    });
  }
}

module.exports = Accessibility;
