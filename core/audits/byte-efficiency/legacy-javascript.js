/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Identifies polyfills and transforms that should not be present if needing to support only Baseline browsers.
 * @see https://docs.google.com/document/d/1ItjJwAd6e0Ts6yMbvh8TN3BBh_sAd58rYE1whnpuxaA/edit Design document (old, based on module/nomodule pattern)
 * @see https://docs.google.com/spreadsheets/d/1z28Au8wo8-c2UsM2lDVEOJcI3jOkb2c951xEBqzBKCc/edit?usp=sharing Legacy babel transforms / polyfills
 * ./core/scripts/legacy-javascript - verification tool.
 */

/** @typedef {import('./byte-efficiency-audit.js').ByteEfficiencyProduct} ByteEfficiencyProduct */
/** @typedef {LH.Audit.ByteEfficiencyItem & {subItems: {type: 'subitems', items: SubItem[]}}} Item */
/** @typedef {{signal: string, location: LH.Audit.Details.SourceLocationValue}} SubItem */

import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import {EntityClassification} from '../../computed/entity-classification.js';
import {JSBundles} from '../../computed/js-bundles.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {estimateCompressionRatioForContent} from '../../lib/script-helpers.js';
import {detectLegacyJavaScript} from '../../lib/legacy-javascript/legacy-javascript.js';

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user about legacy polyfills and transforms used on the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Avoid serving legacy JavaScript to modern browsers',
  // eslint-disable-next-line max-len
  // TODO: developer.chrome.com article. this codelab is good starting place: https://web.dev/articles/codelab-serve-modern-code
  /** Description of a Lighthouse audit that tells the user about old JavaScript that is no longer needed. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Polyfills and transforms enable legacy browsers to use new JavaScript features. However, many aren\'t necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/baseline) features, unless you know you must support legacy browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://philipwalton.com/articles/the-state-of-es5-on-the-web/)',
  /** Warning text that an outdated version of the library "core-js" was found, and the developer should upgrade. */
  // eslint-disable-next-line max-len
  detectedCoreJs2Warning: 'Version 2 of core-js was detected on the page. You should upgrade to version 3 for many performance improvements.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LegacyJavascript extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'legacy-javascript',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
      guidanceLevel: 2,
      requiredArtifacts: ['DevtoolsLog', 'Trace', 'Scripts', 'SourceMaps',
        'GatherContext', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const devtoolsLog = artifacts.DevtoolsLog;
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);

    const bundles = await JSBundles.request(artifacts, context);

    /** @type {Item[]} */
    const items = [];

    /** @type {Map<string, number>} */
    const compressionRatioByUrl = new Map();

    for (const script of artifacts.Scripts) {
      const bundle = bundles.find(bundle => bundle.script.scriptId === script.scriptId);
      const {matches, estimatedByteSavings} =
        detectLegacyJavaScript(script.content ?? '', bundle?.map ?? null);
      if (matches.length === 0) continue;

      const compressionRatio = estimateCompressionRatioForContent(
        compressionRatioByUrl, script.url, artifacts, networkRecords);
      const wastedBytes = Math.round(estimatedByteSavings * compressionRatio);
      /** @type {typeof items[number]} */
      const item = {
        url: script.url,
        wastedBytes,
        subItems: {
          type: 'subitems',
          items: [],
        },
        // Not needed, but keeps typescript happy.
        totalBytes: 0,
      };

      for (const match of matches) {
        const {name, line, column} = match;
        /** @type {SubItem} */
        const subItem = {
          signal: name,
          location: ByteEfficiencyAudit.makeSourceLocation(script.url, line, column, bundle),
        };
        item.subItems.items.push(subItem);
      }
      items.push(item);
    }

    const warnings = [];
    for (const bundle of bundles) {
      if (classifiedEntities.isFirstParty(bundle.script.url)) {
        if (bundle.rawMap.sources.some(s => s.match(/node_modules\/core-js\/modules\/es[67]/))) {
          warnings.push(str_(UIStrings.detectedCoreJs2Warning));
          break;
        }
      }
    }

    /** @type {Map<string, number>} */
    const wastedBytesByUrl = new Map();
    for (const item of items) {
      // Only estimate savings if first party code has legacy code.
      if (classifiedEntities.isFirstParty(item.url)) {
        wastedBytesByUrl.set(item.url, item.wastedBytes);
      }
    }

    /** @type {LH.Audit.Details.TableColumnHeading[]} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'url', valueType: 'url', subItemsHeading: {key: 'location', valueType: 'source-location'}, label: str_(i18n.UIStrings.columnURL)},
      {key: null, valueType: 'code', subItemsHeading: {key: 'signal'}, label: ''},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
      /* eslint-enable max-len */
    ];

    return {
      items,
      headings,
      wastedBytesByUrl,
      warnings,
    };
  }
}

export default LegacyJavascript;
export {UIStrings};
