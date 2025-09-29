/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {EntityClassification} from '../computed/entity-classification.js';
import * as i18n from '../lib/i18n/i18n.js';
import {Util} from '../../shared/util.js';
import UrlUtils from '../lib/url-utils.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on HTTP to HTTPS redirects. This descriptive title is shown to users when HTTP traffic is redirected to HTTPS. */
  title: 'Page has valid source maps',
  /** Title of a Lighthouse audit that provides detail on HTTP to HTTPS redirects. This descriptive title is shown to users when HTTP traffic is not redirected to HTTPS. */
  failureTitle: 'Missing source maps for large first-party JavaScript',
  /** Description of a Lighthouse audit that tells the user that their JavaScript source maps are invalid or missing. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Source maps translate minified code to the original source code. This helps ' +
    'developers debug in production. In addition, Lighthouse is able to provide further ' +
    'insights. Consider deploying source maps to take advantage of these benefits. ' +
    '[Learn more about source maps](https://developer.chrome.com/docs/devtools/javascript/source-maps/).',
  /** Label for a column in a data table. Entries will be URLs to JavaScript source maps. */
  columnMapURL: 'Map URL',
  /** Label for a possible error message indicating that a source map for a large, first-party JavaScript script is missing. */
  missingSourceMapErrorMessage: 'Large JavaScript file is missing a source map',
  /** Label for a possible error message indicating that the content of a source map is invalid because it is missing items in the sourcesContent attribute. */
  missingSourceMapItemsWarningMesssage: `{missingItems, plural,
    =1 {Warning: missing 1 item in \`.sourcesContent\`}
    other {Warning: missing # items in \`.sourcesContent\`}
    }`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const LARGE_JS_BYTE_THRESHOLD = 500 * 1024;

class ValidSourceMaps extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'valid-source-maps',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Scripts', 'SourceMaps', 'URL', 'DevtoolsLog'],
    };
  }

  /**
   * Returns true if the size of the script exceeds a static threshold.
   * @param {LH.Artifacts.Script} script
   * @param {LH.Artifacts.EntityClassification} classifiedEntities
   * @return {boolean}
   */
  static isLargeFirstPartyJS(script, classifiedEntities) {
    const url = script.url;
    if (!script.length || !url) return false;
    if (!UrlUtils.isValid(url)) return false;
    if (!Util.createOrReturnURL(url).protocol.startsWith('http')) return false;

    const isLargeJS = script.length >= LARGE_JS_BYTE_THRESHOLD;
    return classifiedEntities.isFirstParty(url) && isLargeJS;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   */
  static async audit(artifacts, context) {
    const {SourceMaps} = artifacts;
    const devtoolsLog = artifacts.DevtoolsLog;
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);

    /** @type {Set<string>} */
    const isMissingMapForLargeFirstPartyScriptUrl = new Set();

    let missingMapsForLargeFirstPartyFile = false;
    const results = [];
    for (const script of artifacts.Scripts) {
      const sourceMap = SourceMaps.find(m => m.scriptId === script.scriptId);
      const errors = [];
      const isLargeFirstParty = this.isLargeFirstPartyJS(script, classifiedEntities);

      if (isLargeFirstParty && (!sourceMap || !sourceMap.map)) {
        missingMapsForLargeFirstPartyFile = true;
        isMissingMapForLargeFirstPartyScriptUrl.add(script.url);
        errors.push({error: str_(UIStrings.missingSourceMapErrorMessage)});
      }

      if (sourceMap && !sourceMap.map) {
        errors.push({error: sourceMap.errorMessage});
      }

      // Sources content errors.
      if (sourceMap?.map) {
        const sourcesContent = sourceMap.map.sourcesContent || [];
        let missingSourcesContentCount = 0;
        for (let i = 0; i < sourceMap.map.sources.length; i++) {
          if (sourcesContent.length < i || !sourcesContent[i]) missingSourcesContentCount += 1;
        }
        if (missingSourcesContentCount > 0) {
          errors.push({error: str_(UIStrings.missingSourceMapItemsWarningMesssage,
              {missingItems: missingSourcesContentCount})});
        }
      }

      if (sourceMap || errors.length) {
        results.push({
          scriptUrl: script.url,
          sourceMapUrl: sourceMap?.sourceMapUrl,
          subItems: {
            type: /** @type {const} */ ('subitems'),
            items: errors,
          },
        });
      }
    }

    /** @type {LH.Audit.Details.TableColumnHeading[]} */
    const headings = [
      {
        key: 'scriptUrl',
        valueType: 'url',
        subItemsHeading: {key: 'error'},
        label: str_(i18n.UIStrings.columnURL),
      },
      {key: 'sourceMapUrl', valueType: 'url', label: str_(UIStrings.columnMapURL)},
    ];

    results.sort((a, b) => {
      // Show the items that can fail the audit first.
      const missingMapA = isMissingMapForLargeFirstPartyScriptUrl.has(a.scriptUrl);
      const missingMapB = isMissingMapForLargeFirstPartyScriptUrl.has(b.scriptUrl);
      if (missingMapA && !missingMapB) return -1;
      if (!missingMapA && missingMapB) return 1;

      // Then sort by whether one has errors and the other doesn't.
      if (a.subItems.items.length && !b.subItems.items.length) return -1;
      if (!a.subItems.items.length && b.subItems.items.length) return 1;

      // Then sort by script url.
      return b.scriptUrl.localeCompare(a.scriptUrl);
    });

    // Only fails if `missingMapsForLargeFirstPartyFile` is true. All other errors are diagnostical.
    return {
      score: missingMapsForLargeFirstPartyFile ? 0 : 1,
      details: Audit.makeTableDetails(headings, results),
    };
  }
}

export default ValidSourceMaps;
export {UIStrings};
