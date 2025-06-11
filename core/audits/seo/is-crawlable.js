/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import robotsParser from 'robots-parser';

import {Audit} from '../audit.js';
import {MainResource} from '../../computed/main-resource.js';
import * as i18n from '../../lib/i18n/i18n.js';

const BOT_USER_AGENTS = new Set([
  undefined,
  'Googlebot',
  'bingbot',
  'DuckDuckBot',
  'archive.org_bot',
]);

const BLOCKLIST = new Set([
  'noindex',
  'none',
]);
const ROBOTS_HEADER = 'x-robots-tag';
const UNAVAILABLE_AFTER = 'unavailable_after';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if search-engine crawlers are blocked from indexing the page. This title is shown when the page is not blocked from indexing and can be crawled. */
  title: 'Page isn’t blocked from indexing',
  /** Title of a Lighthouse audit that provides detail on if search-engine crawlers are blocked from indexing the page. This title is shown when the page has been configured to block indexing and therefore cannot be indexed by search engines. */
  failureTitle: 'Page is blocked from indexing',
  /** Description of a Lighthouse audit that tells the user *why* allowing search-engine crawling of their page is beneficial. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Search engines are unable to include your pages in search results ' +
      'if they don\'t have permission to crawl them. [Learn more about crawler directives](https://developer.chrome.com/docs/lighthouse/seo/is-crawlable/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * Checks if given directive is a valid unavailable_after directive with a date in the past
 * @param {string} directive
 * @return {boolean}
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
 * @param {string} directives assumes no user-agent prefix
 * @return {boolean}
 */
function hasBlockingDirective(directives) {
  return directives.split(',')
    .map(d => d.toLowerCase().trim())
    .some(d => BLOCKLIST.has(d) || isUnavailable(d));
}

/**
 * Returns user agent if specified in robots header (e.g. `googlebot: noindex`)
 * @param {string} directives
 * @return {string|undefined}
 */
function getUserAgentFromHeaderDirectives(directives) {
  const parts = directives.match(/^([^,:]+):/);

  // Check if directives are prefixed with `googlebot:`, `googlebot-news:`, `otherbot:`, etc.
  // but ignore `unavailable_after:` which is a valid directive
  if (!!parts && parts[1].toLowerCase() !== UNAVAILABLE_AFTER) {
    return parts[1];
  }
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
      supportedModes: ['navigation'],
      requiredArtifacts: ['MetaElements', 'RobotsTxt', 'URL', 'DevtoolsLog'],
    };
  }

  /**
   * @param {LH.Artifacts.MetaElement} metaElement
   */
  static handleMetaElement(metaElement) {
    const content = metaElement.content || '';
    if (hasBlockingDirective(content)) {
      return {
        source: {
          ...Audit.makeNodeItem(metaElement.node),
          snippet: `<meta name="${metaElement.name}" content="${content}" />`,
        },
      };
    }
  }

  /**
   * @param {string|undefined} userAgent
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {LH.Artifacts.MetaElement[]} metaElements
   * @param {import('robots-parser').Robot|undefined} parsedRobotsTxt
   * @param {URL} robotsTxtUrl
   */
  static determineIfCrawlableForUserAgent(userAgent, mainResource, metaElements,
      parsedRobotsTxt, robotsTxtUrl) {
    /** @type {LH.Audit.Details.Table['items']} */
    const blockingDirectives = [];

    // Prefer a meta element specific to a user agent, fallback to generic 'robots' if not present.
    // https://developers.google.com/search/blog/2007/03/using-robots-meta-tag#directing-a-robots-meta-tag-specifically-at-googlebot
    let meta;
    if (userAgent) meta = metaElements.find(meta => meta.name === userAgent.toLowerCase());
    if (!meta) meta = metaElements.find(meta => meta.name === 'robots');
    if (meta) {
      const blockingDirective = IsCrawlable.handleMetaElement(meta);
      if (blockingDirective) blockingDirectives.push(blockingDirective);
    }

    for (const header of mainResource.responseHeaders || []) {
      if (header.name.toLowerCase() !== ROBOTS_HEADER) continue;

      const directiveUserAgent = getUserAgentFromHeaderDirectives(header.value);
      if (directiveUserAgent !== userAgent && directiveUserAgent !== undefined) continue;

      let directiveWithoutUserAgentPrefix = header.value.trim();
      if (userAgent && header.value.startsWith(`${userAgent}:`)) {
        directiveWithoutUserAgentPrefix = header.value.replace(`${userAgent}:`, '');
      }
      if (!hasBlockingDirective(directiveWithoutUserAgentPrefix)) continue;

      blockingDirectives.push({source: `${header.name}: ${header.value}`});
    }

    if (parsedRobotsTxt && !parsedRobotsTxt.isAllowed(mainResource.url, userAgent)) {
      const line = parsedRobotsTxt.getMatchingLineNumber(mainResource.url) || 1;
      blockingDirectives.push({
        source: {
          type: /** @type {const} */ ('source-location'),
          url: robotsTxtUrl.href,
          urlProvider: /** @type {const} */ ('network'),
          line: line - 1,
          column: 0,
        },
      });
    }

    return blockingDirectives;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.DevtoolsLog;
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    const robotsTxtUrl = new URL('/robots.txt', mainResource.url);
    const parsedRobotsTxt = artifacts.RobotsTxt.content ?
      robotsParser(robotsTxtUrl.href, artifacts.RobotsTxt.content) :
      undefined;

    // Only fail if all known bots and generic bots (UserAgent '*' or 'robots' directive)
    // are blocked from crawling.
    // If at least one bot is allowed, we pass the audit. Any known bots that are not allowed
    // will be listed in a warning.

    /** @type {Array<string|undefined>} */
    const blockedUserAgents = [];
    const genericBlockingDirectives = [];

    for (const userAgent of BOT_USER_AGENTS) {
      const blockingDirectives = IsCrawlable.determineIfCrawlableForUserAgent(
        userAgent, mainResource, artifacts.MetaElements, parsedRobotsTxt, robotsTxtUrl);
      if (blockingDirectives.length > 0) {
        blockedUserAgents.push(userAgent);
      }
      if (userAgent === undefined) {
        genericBlockingDirectives.push(...blockingDirectives);
      }
    }

    const score = blockedUserAgents.length === BOT_USER_AGENTS.size ? 0 : 1;
    const warnings = [];
    if (score && blockedUserAgents.length > 0) {
      const list = blockedUserAgents.filter(Boolean).join(', ');
      // eslint-disable-next-line max-len
      warnings.push(`The following bot user agents are blocked from crawling: ${list}. The audit is otherwise passing, because at least one bot was explicitly allowed.`);
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'code', label: 'Blocking Directive Source'},
    ];
    const details = Audit.makeTableDetails(headings, score === 0 ? genericBlockingDirectives : []);

    return {
      score,
      details,
      warnings,
    };
  }
}

export default IsCrawlable;
export {UIStrings};
