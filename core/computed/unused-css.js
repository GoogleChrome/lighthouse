/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';
import {Util} from '../../shared/util.js';
import {estimateCompressedContentSize} from '../lib/script-helpers.js';

const PREVIEW_LENGTH = 100;

/** @typedef {LH.Artifacts.CSSStyleSheetInfo & {networkRecord: LH.Artifacts.NetworkRequest, usedRules: Array<LH.Crdp.CSS.RuleUsage>}} StyleSheetInfo */

class UnusedCSS {
  /**
   * @param {Array<LH.Artifacts.CSSStyleSheetInfo>} styles The output of the Styles gatherer.
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Object<string, StyleSheetInfo>} A map of styleSheetId to stylesheet information.
   */
  static indexStylesheetsById(styles, networkRecords) {
    const indexedNetworkRecords = networkRecords
        // Some phantom network records appear with a 0 resourceSize that aren't real.
        // A network record that has no size data is just as good as no network record at all for our
        // purposes, so we'll just filter them out. https://github.com/GoogleChrome/lighthouse/issues/9684#issuecomment-532381611
        .filter(record => record.resourceSize > 0)
        .reduce((indexed, record) => {
          indexed[record.url] = record;
          return indexed;
        }, /** @type {Object<string, LH.Artifacts.NetworkRequest>} */ ({}));

    return styles.reduce((indexed, stylesheet) => {
      indexed[stylesheet.header.styleSheetId] = Object.assign({
        usedRules: [],
        networkRecord: indexedNetworkRecords[stylesheet.header.sourceURL],
      }, stylesheet);
      return indexed;
    }, /** @type {Object<string, StyleSheetInfo>} */ ({}));
  }

  /**
   * Adds used rules to their corresponding stylesheet.
   * @param {Array<LH.Crdp.CSS.RuleUsage>} rules The output of the CSSUsage gatherer.
   * @param {Object<string, StyleSheetInfo>} indexedStylesheets Stylesheet information indexed by id.
   */
  static indexUsedRules(rules, indexedStylesheets) {
    rules.forEach(rule => {
      const stylesheetInfo = indexedStylesheets[rule.styleSheetId];

      if (!stylesheetInfo) {
        return;
      }

      if (rule.used) {
        stylesheetInfo.usedRules.push(rule);
      }
    });
  }

  /**
   * @param {StyleSheetInfo} stylesheetInfo
   * @return {{wastedBytes: number, totalBytes: number, wastedPercent: number}}
   */
  static computeUsage(stylesheetInfo) {
    let usedUncompressedBytes = 0;
    const totalUncompressedBytes = stylesheetInfo.content.length;

    for (const usedRule of stylesheetInfo.usedRules) {
      usedUncompressedBytes += usedRule.endOffset - usedRule.startOffset;
    }

    const compressedSize = estimateCompressedContentSize(
        stylesheetInfo.networkRecord, totalUncompressedBytes, 'Stylesheet');
    const percentUnused = (totalUncompressedBytes - usedUncompressedBytes) / totalUncompressedBytes;
    const wastedBytes = Math.round(percentUnused * compressedSize);

    return {
      wastedBytes,
      wastedPercent: percentUnused * 100,
      totalBytes: compressedSize,
    };
  }

  /**
   * Trims stylesheet content down to the first rule-set definition.
   * @param {string=} content
   * @return {string}
   */
  static determineContentPreview(content) {
    let preview = Util.truncate(content || '', PREVIEW_LENGTH * 5, '')
        .replace(/( {2,}|\t)+/g, '  ') // remove leading indentation if present
        .replace(/\n\s+}/g, '\n}') // completely remove indentation of closing braces
        .trim(); // trim the leading whitespace

    if (preview.length > PREVIEW_LENGTH) {
      const firstRuleStart = preview.indexOf('{');
      const firstRuleEnd = preview.indexOf('}');

      if (firstRuleStart === -1 || firstRuleEnd === -1 ||
          firstRuleStart > firstRuleEnd ||
          firstRuleStart > PREVIEW_LENGTH) {
        // We couldn't determine the first rule-set or it's not within the preview
        preview = Util.truncate(preview, PREVIEW_LENGTH);
      } else if (firstRuleEnd < PREVIEW_LENGTH) {
        // The entire first rule-set fits within the preview
        preview = preview.slice(0, firstRuleEnd + 1) + ' …';
      } else {
        // The first rule-set doesn't fit within the preview, just show as many as we can
        const truncated = Util.truncate(preview, PREVIEW_LENGTH, '');
        const lastSemicolonIndex = truncated.lastIndexOf(';');
        preview = lastSemicolonIndex < firstRuleStart ?
            truncated + '… } …' :
            preview.slice(0, lastSemicolonIndex + 1) + ' … } …';
      }
    }

    return preview;
  }

  /**
   * @param {StyleSheetInfo} stylesheetInfo The stylesheetInfo object.
   * @return {LH.Audit.ByteEfficiencyItem}
   */
  static mapSheetToResult(stylesheetInfo) {
    let url = stylesheetInfo.header.sourceURL;
    if (!url || stylesheetInfo.header.isInline) {
      const contentPreview = UnusedCSS.determineContentPreview(stylesheetInfo.content);
      url = contentPreview;
    }

    const usage = UnusedCSS.computeUsage(stylesheetInfo);
    return {url, ...usage};
  }

  /**
   * @param {{Stylesheets: LH.Artifacts['Stylesheets'], CSSUsage: LH.Artifacts['CSSUsage'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Audit.ByteEfficiencyItem[]>}
  */
  static async compute_(data, context) {
    const {CSSUsage, Stylesheets, devtoolsLog} = data;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const indexedSheets = UnusedCSS.indexStylesheetsById(Stylesheets, networkRecords);
    UnusedCSS.indexUsedRules(CSSUsage, indexedSheets);

    const items = Object.keys(indexedSheets)
      .map(sheetId => UnusedCSS.mapSheetToResult(indexedSheets[sheetId]));
    return items;
  }
}

const UnusedCSSComputed = makeComputedArtifact(UnusedCSS,
  ['Stylesheets', 'CSSUsage', 'devtoolsLog']);
export {UnusedCSSComputed as UnusedCSS};
