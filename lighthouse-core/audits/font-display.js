/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const URL = require('../lib/url-shim.js');
const PASSING_FONT_DISPLAY_REGEX = /^(block|fallback|optional|swap)$/;
const CSS_URL_REGEX = /url\((.*?)\)/;
const CSS_URL_GLOBAL_REGEX = new RegExp(CSS_URL_REGEX, 'g');
const i18n = require('../lib/i18n/i18n.js');
const Sentry = require('../lib/sentry.js');
const NetworkRecords = require('../computed/network-records.js');

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on if all the text on a webpage was visible while the page was loading its webfonts. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'All text remains visible during webfont loads',
  /** Title of a diagnostic audit that provides detail on the load of the page's webfonts. Often the text is invisible for seconds before the webfont resource is loaded. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Ensure text remains visible during webfont load',
  /** Description of a Lighthouse audit that tells the user *why* they should use the font-display CSS feature. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description:
    'Leverage the font-display CSS feature to ensure text is user-visible while ' +
    'webfonts are loading. ' +
    '[Learn more](https://web.dev/font-display).',
  /**
   * @description A warning message that is shown when Lighthouse couldn't automatically check some of the page's fonts and that the user will need to manually check it.
   * @example {https://font.cdn.com/} fontURL
   */
  undeclaredFontURLWarning: 'Lighthouse was unable to automatically check the font-display value ' +
    'for the following URL: {fontURL}.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['devtoolsLogs', 'CSSUsage', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {{passingURLs: Set<string>, failingURLs: Set<string>}}
   */
  static findFontDisplayDeclarations(artifacts) {
    /** @type {Set<string>} */
    const passingURLs = new Set();
    /** @type {Set<string>} */
    const failingURLs = new Set();

    // Go through all the stylesheets to find all @font-face declarations
    for (const stylesheet of artifacts.CSSUsage.stylesheets) {
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
        const rawFontDisplay = (fontDisplayMatch && fontDisplayMatch[1]) || '';
        const hasPassingFontDisplay = PASSING_FONT_DISPLAY_REGEX.test(rawFontDisplay);
        const targetURLSet = hasPassingFontDisplay ? passingURLs : failingURLs;

        // Finally convert the raw font URLs to the absolute URLs and add them to the set.
        const relativeURLs = rawFontURLs
          // @ts-ignore - guaranteed to match from previous regex, pull URL group out
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
            const relativeRoot = URL.isValid(stylesheet.header.sourceURL) ?
              stylesheet.header.sourceURL : artifacts.URL.finalUrl;
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
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLogs = artifacts.devtoolsLogs[this.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLogs, context);
    const {passingURLs, failingURLs} = FontDisplay.findFontDisplayDeclarations(artifacts);
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
        const wastedMs = Math.min((record.endTime - record.startTime) * 1000, 3000);

        return {
          url: record.url,
          wastedMs,
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', itemType: 'ms', text: str_(i18n.UIStrings.columnWastedMs)},
    ];

    const details = Audit.makeTableDetails(headings, results);

    return {
      score: Number(results.length === 0),
      details,
      warnings: warningURLs.map(fontURL => str_(UIStrings.undeclaredFontURLWarning, {fontURL})),
    };
  }
}

module.exports = FontDisplay;
module.exports.UIStrings = UIStrings;
