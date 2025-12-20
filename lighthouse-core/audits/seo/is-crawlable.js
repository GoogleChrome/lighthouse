/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const robotsParser = require('robots-parser');
const URL = require('../../lib/url-shim.js');
const MainResource = require('../../computed/main-resource.js');
const BLOCKLIST = new Set([
  'noindex',
  'none',
]);
const ROBOTS_HEADER = 'x-robots-tag';
const UNAVAILABLE_AFTER = 'unavailable_after';
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if search-engine crawlers are blocked from indexing the page. This title is shown when the page is not blocked from indexing and can be crawled. */
  title: 'Page isn’t blocked from indexing',
  /** Title of a Lighthouse audit that provides detail on if search-engine crawlers are blocked from indexing the page. This title is shown when the page has been configured to block indexing and therefore cannot be indexed by search engines. */
  failureTitle: 'Page is blocked from indexing',
  /** Description of a Lighthouse audit that tells the user *why* allowing search-engine crawling of their page is beneficial. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Search engines are unable to include your pages in search results ' +
      'if they don\'t have permission to crawl them. [Learn more](https://web.dev/is-crawable).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * Checks if given directive is a valid unavailable_after directive with a date in the past
 * @param {string} directive
 * @returns {boolean}
 */
function isUnavailable(directive) {
  const parts = directive.split(':');

  if (parts.length <= 1 || parts[0] !== UNAVAILABLE_AFTER) {
    return false;
  }

  const date = Date.parse(parts.slice(1).join(':'));

  return !isNaN(date) && date < Date.now();
}

/**
 * Returns true if any of provided directives blocks page from being indexed
 * @param {string} directives
 * @returns {boolean}
 */
function hasBlockingDirective(directives) {
  return directives.split(',')
    .map(d => d.toLowerCase().trim())
    .some(d => BLOCKLIST.has(d) || isUnavailable(d));
}

/**
 * Returns true if robots header specifies user agent (e.g. `googlebot: noindex`)
 * @param {string} directives
 * @returns {boolean}
 */
function hasUserAgent(directives) {
  const parts = directives.match(/^([^,:]+):/);

  // Check if directives are prefixed with `googlebot:`, `googlebot-news:`, `otherbot:`, etc.
  // but ignore `unavailable_after:` which is a valid directive
  return !!parts && parts[1].toLowerCase() !== UNAVAILABLE_AFTER;
}

class IsCrawlable extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'is-crawlable',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['MetaElements', 'RobotsTxt', 'URL', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metaRobots = artifacts.MetaElements.find(meta => meta.name === 'robots');

    return MainResource.request({devtoolsLog, URL: artifacts.URL}, context)
      .then(mainResource => {
        /** @type {LH.Audit.Details.Table['items']} */
        const blockingDirectives = [];

        if (metaRobots) {
          const metaRobotsContent = metaRobots.content || '';
          const isBlocking = hasBlockingDirective(metaRobotsContent);

          if (isBlocking) {
            blockingDirectives.push({
              source: {
                type: /** @type {'node'} */ ('node'),
                snippet: `<meta name="robots" content="${metaRobotsContent}" />`,
              },
            });
          }
        }

        mainResource.responseHeaders && mainResource.responseHeaders
          .filter(h => h.name.toLowerCase() === ROBOTS_HEADER && !hasUserAgent(h.value) &&
            hasBlockingDirective(h.value))
          .forEach(h => blockingDirectives.push({source: `${h.name}: ${h.value}`}));

        if (artifacts.RobotsTxt.content) {
          const robotsFileUrl = new URL('/robots.txt', mainResource.url);
          const robotsTxt = robotsParser(robotsFileUrl.href, artifacts.RobotsTxt.content);

          if (!robotsTxt.isAllowed(mainResource.url)) {
            const line = robotsTxt.getMatchingLineNumber(mainResource.url) || 1;
            blockingDirectives.push({
              source: {
                type: /** @type {'source-location'} */ ('source-location'),
                url: robotsFileUrl.href,
                urlProvider: /** @type {'network'} */ ('network'),
                line: line - 1,
                column: 0,
              },
            });
          }
        }

        /** @type {LH.Audit.Details.Table['headings']} */
        const headings = [
          {key: 'source', itemType: 'code', text: 'Blocking Directive Source'},
        ];
        const details = Audit.makeTableDetails(headings, blockingDirectives);

        return {
          score: Number(blockingDirectives.length === 0),
          details,
        };
      });
  }
}

module.exports = IsCrawlable;
module.exports.UIStrings = UIStrings;
