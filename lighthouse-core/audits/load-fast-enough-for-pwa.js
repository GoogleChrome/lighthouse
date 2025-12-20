/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 *  This audit evaluates if a page's load performance is fast enough for it to be considered a PWA.
 *  We are doublechecking that the network requests were throttled (or slow on their own)
 *  Afterwards, we report if the TTI is less than 10 seconds.
 */

const isDeepEqual = require('lodash.isequal');
const Audit = require('./audit.js');
const mobileThrottling = require('../config/constants.js').throttling.mobileSlow4G;
const Interactive = require('../computed/metrics/interactive.js');
const i18n = require('../lib/i18n/i18n.js');

// Maximum TTI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTI = 10 * 1000;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user that their page has loaded fast enough to be considered a Progressive Web App. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Page load is fast enough on mobile networks',
  /** Imperative title of a Lighthouse audit that tells the user that their page has loaded fast enough to be considered a Progressive Web App. This imperative title is shown to users when the web page has loaded too slowly to be considered a Progressive Web App. */
  failureTitle: 'Page load is not fast enough on mobile networks',
  /** Description of a Lighthouse audit that tells the user *why* they need to load fast enough on mobile networks. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'A fast page load over a cellular network ensures a good mobile user experience. [Learn more](https://web.dev/load-fast-enough-for-pwa).',
  /** Label for the audit identifying the time it took for the page to become interactive. */
  displayValueText: 'Interactive at {timeInMs, number, seconds}\xa0s',
  /** Label for the audit identifying the time it took for the page to become interactive on a mobile network. */
  displayValueTextWithOverride: 'Interactive on simulated mobile network at ' +
  '{timeInMs, number, seconds}\xa0s',
  /** Explanatory message displayed when a web page loads too slowly to be considered quickly interactive. This references another Lighthouse auditing category, "Performance", that can give additional details on performance debugging.  */
  explanationLoadSlow: 'Your page loads too slowly and is not interactive within 10 seconds. ' +
    'Look at the opportunities and diagnostics in the "Performance" section to learn how to ' +
    'improve.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LoadFastEnough4Pwa extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'load-fast-enough-for-pwa',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    // If throttling was default devtools or lantern slow 4G throttling, then reuse the given settings
    // Otherwise, we'll force the usage of lantern slow 4G.
    const settingOverrides = {throttlingMethod: 'simulate', throttling: mobileThrottling};

    // Override settings for interactive if provided throttling was used or network
    // throttling was not consistent with standard `mobile network throttling`
    const override = context.settings.throttlingMethod === 'provided' ||
      !isDeepEqual(context.settings.throttling, mobileThrottling);

    const displayValueTemplate = override ?
      UIStrings.displayValueTextWithOverride : UIStrings.displayValueText;

    const settings = override ? Object.assign({}, context.settings, settingOverrides) :
      context.settings;

    const metricComputationData = {trace, devtoolsLog, settings};
    const tti = await Interactive.request(metricComputationData, context);

    const score = Number(tti.timing < MAXIMUM_TTI);

    /** @type {string|undefined} */
    let displayValue;
    /** @type {string|undefined} */
    let explanation;
    if (!score) {
      displayValue = str_(displayValueTemplate, {timeInMs: tti.timing});
      explanation = str_(UIStrings.explanationLoadSlow);
    }

    return {
      score,
      displayValue,
      explanation,
      numericValue: tti.timing,
      numericUnit: 'millisecond',
    };
  }
}

module.exports = LoadFastEnough4Pwa;
module.exports.UIStrings = UIStrings;
