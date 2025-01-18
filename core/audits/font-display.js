/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import UrlUtils from '../lib/url-utils.js';
import * as i18n from '../lib/i18n/i18n.js';
import {Sentry} from '../lib/sentry.js';
import {NetworkRecords} from '../computed/network-records.js';

const PASSING_FONT_DISPLAY_REGEX = /^(block|fallback|optional|swap)$/;
const CSS_URL_REGEX = /url\((.*?)\)/;
const CSS_URL_GLOBAL_REGEX = new RegExp(CSS_URL_REGEX, 'g');

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on if all the text on a webpage was visible while the page was loading its webfonts. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'All text remains visible during webfont loads',
  /** Title of a diagnostic audit that provides detail on the load of the page's webfonts. Often the text is invisible for seconds before the webfont resource is loaded. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Ensure text remains visible during webfont load',
  /** Description of a Lighthouse audit that tells the user *why* they should use the font-display CSS feature. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description:
    'Leverage the `font-display` CSS feature to ensure text is user-visible while ' +
    'webfonts are loading. ' +
    '[Learn more about `font-display`](https://developer.chrome.com/docs/lighthouse/performance/font-display/).',
  /**
   * @description [ICU Syntax] A warning message that is shown when Lighthouse couldn't automatically check some of the page's fonts, telling the user that they will need to manually check the fonts coming from a certain URL origin.
   * @example {https://font.cdn.com/} fontOrigin
   */
  undeclaredFontOriginWarning:
    '{fontCountForOrigin, plural, ' +
    // eslint-disable-next-line max-len
    '=1 {Lighthouse was unable to automatically check the `font-display` value for the origin {fontOrigin}.} ' +
    // eslint-disable-next-line max-len
    'other {Lighthouse was unable to automatically check the `font-display` values for the origin {fontOrigin}.}}',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class FontDisplay extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'font-display',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      guidanceLevel: 3,
      requiredArtifacts: ['devtoolsLogs', 'Stylesheets', 'URL'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {RegExp} passingFontDisplayRegex
   * @return {{passingURLs: Set<string>, failingURLs: Set<string>}}
   */
  static findFontDisplayDeclarations(artifacts, passingFontDisplayRegex) {
    /** @type {Set<string>} */
    const passingURLs = new Set();
    /** @type {Set<string>} */
    const failingURLs = new Set();

    // Go through all the stylesheets to find all @font-face declarations
    for (const stylesheet of artifacts.Stylesheets) {
      // Eliminate newlines so we can more easily scan through with a regex
      const newlinesStripped = stylesheet.content.replace(/(\r|\n)+/g, ' ');
      // Find the @font-faces
      const fontFaceDeclarations = newlinesStripped.match(/@font-face\s*{(.*?)}/g) || [];
      // Go through all the @font-face declarations to find a declared `font-display: ` property
      for (const declaration of fontFaceDeclarations) {
        // We'll try to find the URL it's referencing.
        const rawFontURLs = declaration.match(CSS_URL_GLOBAL_REGEX);
        // If no URLs, we can't really do anything; bail
        if (!rawFontURLs) continue;
        // Find the font-display value by matching a single token, optionally surrounded by whitespace,
        // followed either by a semicolon or the end of a block.
        const fontDisplayMatch = declaration.match(/font-display\s*:\s*(\w+)\s*(;|\})/);
        const rawFontDisplay = fontDisplayMatch?.[1] || '';
        const hasPassingFontDisplay = passingFontDisplayRegex.test(rawFontDisplay);
        const targetURLSet = hasPassingFontDisplay ? passingURLs : failingURLs;

        // Finally convert the raw font URLs to the absolute URLs and add them to the set.
        const relativeURLs = rawFontURLs
          // @ts-expect-error - guaranteed to match from previous regex, pull URL group out
          .map(s => s.match(CSS_URL_REGEX)[1].trim())
          .map(s => {
            // remove any quotes surrounding the URL
            if (/^('|").*\1$/.test(s)) {
              return s.substr(1, s.length - 2);
            }

            return s;
          });

        // Convert the relative CSS URL to an absolute URL and add it to the target set.
        for (const relativeURL of relativeURLs) {
          try {
            const relativeRoot = UrlUtils.isValid(stylesheet.header.sourceURL) ?
              stylesheet.header.sourceURL : artifacts.URL.finalDisplayedUrl;
            const absoluteURL = new URL(relativeURL, relativeRoot);
            targetURLSet.add(absoluteURL.href);
          } catch (err) {
            Sentry.captureException(err, {tags: {audit: this.meta.id}});
          }
        }
      }
    }

    return {passingURLs, failingURLs};
  }

  /**
   * Some pages load many fonts we can't check, so dedupe on origin.
   * @param {Array<string>} warningUrls
   * @return {Array<LH.IcuMessage>}
   */
  static getWarningsForFontUrls(warningUrls) {
    /** @type {Map<string, number>} */
    const warningCountByOrigin = new Map();
    for (const warningUrl of warningUrls) {
      const origin = UrlUtils.getOrigin(warningUrl);
      if (!origin) continue;

      const count = warningCountByOrigin.get(origin) || 0;
      warningCountByOrigin.set(origin, count + 1);
    }

    const warnings = [...warningCountByOrigin].map(([fontOrigin, fontCountForOrigin]) => {
      return str_(UIStrings.undeclaredFontOriginWarning, {fontCountForOrigin, fontOrigin});
    });
    return warnings;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLogs = artifacts.devtoolsLogs[this.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLogs, context);
    const {passingURLs, failingURLs} =
      FontDisplay.findFontDisplayDeclarations(artifacts, PASSING_FONT_DISPLAY_REGEX);
    /** @type {Array<string>} */
    const warningURLs = [];

    const results = networkRecords
      // Find all fonts...
      .filter(record => record.resourceType === 'Font')
      // ...and that aren't data URLs, the blocking concern doesn't really apply
      .filter(record => !/^data:/.test(record.url))
      .filter(record => !/^blob:/.test(record.url))
      // ...that have a failing font-display value
      .filter(record => {
        // Failing URLs should be considered.
        if (failingURLs.has(record.url)) return true;
        // Everything else shouldn't be, but we should warn if we don't recognize the URL at all.
        if (!passingURLs.has(record.url)) warningURLs.push(record.url);
        return false;
      })
      .map(record => {
        // In reality the end time should be calculated with paint time included
        // all browsers wait 3000ms to block text so we make sure 3000 is our max wasted time
        const wastedMs = Math.min(record.networkEndTime - record.networkRequestTime, 3000);

        return {
          url: record.url,
          wastedMs,
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'ms', label: str_(i18n.UIStrings.columnWastedMs)},
    ];

    const details = Audit.makeTableDetails(headings, results);

    return {
      score: Number(results.length === 0),
      details,
      warnings: FontDisplay.getWarningsForFontUrls(warningURLs),
    };
  }
}

export default FontDisplay;
export {UIStrings};
