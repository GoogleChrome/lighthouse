/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';


const Audit = require('./audit.js');
const i18n = require('./../lib/i18n/i18n.js');
const ComputedUserTimings = require('../computed/user-timings.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides a potential cause of CLS. This descriptive title is shown to users when no iframe is injected in a time window before a LayoutShift event. */
  title: 'Injected Iframes likely didn\'t contribute to CLS',
  /** Title of a Lighthouse audit that provides a potential cause of CLS. This descriptive title is shown to users when an iframe is injected in a time window before a LayoutShift event. */
  failureTitle: 'Injected Iframes potentially contributed to CLS',
  /** Description of a Lighthouse audit that tells the user potential causes of CLS. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Injecting an Iframe with a correctly sized container can reduce layout shifting and improve CLS. [Learn More](https://web.dev/optimize-cls/#ads-embeds-and-iframes-without-dimensions)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class PreloadFontsAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'injected-iframes',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['DOMTimeline', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {timestamps, windows} = artifacts.DOMTimeline;
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    let timingNormalization = 0;
    ComputedUserTimings.request(trace, context).then(computedUserTimings => {
      const userTimings = computedUserTimings.filter(timing => timing.name === 'lh_timealign');
      // can we assume that timing in client will always be <= timing on trace ?
      // are assuming that first item in userTimings / smallest will be the one we want
      timingNormalization = userTimings[0].startTime - timestamps[0].time;
    });

    const results = [];
    for (const timestamp of timestamps) {
      const time = timestamp.time + timingNormalization;
      for (const window of windows) {
        if (time > window.start && time < window.end) {
          results.push({
            node: /** @type {LH.Audit.Details.NodeValue} */ ({
              type: 'node',
              path: timestamp.devtoolsNodePath,
              selector: timestamp.selector,
              nodeLabel: timestamp.nodeLabel,
              snippet: timestamp.snippet,
            }),
          });
        }
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(i18n.UIStrings.columnFailingElem)},
    ];

    return {
      score: results.length > 0 ? 0 : 1,
      details: Audit.makeTableDetails(headings, results),
      notApplicable: timestamps.length === 0,
    };
  }
}

module.exports = PreloadFontsAudit;
module.exports.UIStrings = UIStrings;
