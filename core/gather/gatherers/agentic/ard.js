/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Gatherer that discovers and fetches a site's Agentic Resource Discovery (ARD)
 * manifest. It follows the discovery mechanisms in ARD §5.1 and also consults the predecessor
 * `ai-catalog` names so that sites that have not yet migrated are still audited.
 * @see https://agenticresourcediscovery.org/spec/
 */

import log from 'lighthouse-logger';
import LinkHeader from 'http-link-header';

import BaseGatherer from '../../base-gatherer.js';
import RobotsTxt from '../seo/robots-txt.js';

/**
 * Link relations for ARD entry sources. `ai-catalog` is the predecessor relation, which
 * consumers MAY consult but are not required to (ARD §5.1).
 */
const REL_ARD = 'ard';
const REL_LEGACY = 'ai-catalog';

const WELL_KNOWN_PATH = '/.well-known/ard.json';
const LEGACY_WELL_KNOWN_PATH = '/.well-known/ai-catalog.json';

const HTTP_OK = 200;

/** @typedef {{ard: string|null, legacy: string|null}} ArdLinks */

/** @typedef {LH.Artifacts['AgentResourceDiscovery']['discoverySignals']} DiscoverySignals */

/**
 * @typedef FetchResult
 * @property {number|null} status
 * @property {string|null} content
 * @property {Record<string, string>|null} headers
 * @property {string} [errorMessage]
 */

/**
 * A location to try when resolving the manifest. `advertised` locations are ones the site
 * points at (robots.txt, link tags, Link headers); the well-known paths are probed by
 * Lighthouse, so a failure there is not the site's fault and is not reported.
 * @typedef ManifestCandidate
 * @property {LH.Artifacts.ArdDiscoverySource} source
 * @property {string|null} url
 * @property {boolean} advertised
 */

/** @type {ReadonlyArray<LH.Artifacts.ArdDiscoverySource>} */
const SOURCE_PRIORITY = [
  'robotsTxtAgentmap',
  'htmlLink',
  'httpHeaderLink',
  'wellKnown',
  'legacyHtmlLink',
  'legacyHttpHeaderLink',
  'legacyWellKnown',
];

/** @type {Set<LH.Artifacts.ArdDiscoverySource>} */
const PROBED_SOURCES = new Set(['wellKnown', 'legacyWellKnown']);

/**
 * @param {DiscoverySignals} discoverySignals
 * @return {ManifestCandidate[]}
 */
function getManifestCandidates(discoverySignals) {
  return SOURCE_PRIORITY.map(source => ({
    source,
    url: discoverySignals[source],
    advertised: !PROBED_SOURCES.has(source),
  }));
}

/**
 * Resolves `href` against `baseUrl`, returning null for empty or unparseable values.
 * @param {string|null|undefined} href
 * @param {string} baseUrl
 * @return {string|null}
 */
function resolveUrl(href, baseUrl) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Runs in the page. Returns the `href` of the first `<link>` for each relation, or null.
 * @param {string} relArd
 * @param {string} relLegacy
 * @return {ArdLinks}
 */
function getArdLinksInDOM(relArd, relLegacy) {
  /** @param {string} rel */
  const getHref = rel => {
    const link = document.querySelector(`link[rel~="${rel}" i]`);
    return link instanceof HTMLLinkElement ? link.href : null;
  };
  return {ard: getHref(relArd), legacy: getHref(relLegacy)};
}

/** @type {ArdLinks} */
const NO_LINKS = {ard: null, legacy: null};

class AgentResourceDiscovery extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'RobotsTxt'>} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
    dependencies: {RobotsTxt: RobotsTxt.symbol},
  };

  /**
   * Returns the absolute URL from the first `Agentmap:` directive in robots.txt, if any.
   * @param {LH.Artifacts['RobotsTxt']|null|undefined} robotsTxt
   * @param {string} finalDisplayedUrl
   * @return {string|null}
   */
  static getRobotsTxtAgentmap(robotsTxt, finalDisplayedUrl) {
    if (!robotsTxt?.content) return null;
    const match = robotsTxt.content.match(/^\s*Agentmap:\s*(\S+)/im);
    if (!match) return null;
    return resolveUrl(match[1], finalDisplayedUrl);
  }

  /**
   * Finds `<link rel="ard">` and `<link rel="ai-catalog">` in the page.
   * @param {LH.Gatherer.Context} context
   * @param {string} finalDisplayedUrl
   * @return {Promise<ArdLinks>}
   */
  static async getHtmlLinksFromDom(context, finalDisplayedUrl) {
    try {
      const links = await context.driver.executionContext.evaluate(getArdLinksInDOM, {
        args: [REL_ARD, REL_LEGACY],
        useIsolation: true,
      });
      return {
        ard: resolveUrl(links?.ard, finalDisplayedUrl),
        legacy: resolveUrl(links?.legacy, finalDisplayedUrl),
      };
    } catch (err) {
      log.verbose('AgentResourceDiscovery', `Could not read link tags: ${err.message}`);
      return NO_LINKS;
    }
  }

  /**
   * Finds `rel="ard"` and `rel="ai-catalog"` in the main document's HTTP `Link` header.
   * @param {LH.Gatherer.Context} context
   * @param {string} finalDisplayedUrl
   * @return {Promise<ArdLinks>}
   */
  static async getHttpHeaderLinks(context, finalDisplayedUrl) {
    if (context.gatherMode !== 'navigation') return NO_LINKS;

    try {
      const mainResourceResponse = await context.driver.fetcher.fetchResource(finalDisplayedUrl);
      const linkHeader = mainResourceResponse.headers?.link;
      if (!linkHeader) return NO_LINKS;

      const parsed = LinkHeader.parse(linkHeader.replace(/\n/g, ','));
      /** @param {string} rel */
      const getUri = rel =>
        resolveUrl(parsed.refs.find(ref => ref.rel?.toLowerCase() === rel)?.uri, finalDisplayedUrl);
      return {ard: getUri(REL_ARD), legacy: getUri(REL_LEGACY)};
    } catch (err) {
      log.verbose('AgentResourceDiscovery', `Could not read Link header: ${err.message}`);
      return NO_LINKS;
    }
  }

  /**
   * Fetches a candidate manifest URL. Never throws; network errors are returned as a
   * null status with an `errorMessage`.
   * @param {LH.Gatherer.Context} context
   * @param {string} url
   * @return {Promise<FetchResult>}
   */
  static async fetchManifest(context, url) {
    try {
      const {status, content, headers} = await context.driver.fetcher.fetchResource(url);
      return {status, content, headers: headers || null};
    } catch (err) {
      log.error('AgentResourceDiscovery', err);
      return {status: null, content: null, headers: null, errorMessage: err.message};
    }
  }

  /**
   * Tries each candidate in order and returns the first that loads. Advertised candidates
   * that fail are recorded in `failedSources` and skipped. If nothing loads, the result
   * describes the first advertised location that failed, or else the `/.well-known/ard.json`
   * path consumers are required to fetch.
   * @param {LH.Gatherer.Context} context
   * @param {ManifestCandidate[]} candidates
   * @return {Promise<{
   *   discoverySource: LH.Artifacts.ArdDiscoverySource,
   *   catalogUrl: string,
   *   fetchResult: FetchResult,
   *   failedSources: LH.Artifacts['AgentResourceDiscovery']['failedSources'],
   * }>}
   */
  static async resolveManifest(context, candidates) {
    /** @type {Array<{source: LH.Artifacts.ArdDiscoverySource, url: string, advertised: boolean, fetchResult: FetchResult}>} */
    const attempts = [];
    const failedSources = () => attempts
      .filter(attempt => attempt.advertised)
      .map(({source, url, fetchResult}) => ({
        source,
        url,
        status: fetchResult.status,
        errorMessage: fetchResult.errorMessage,
      }));

    for (const {source, url, advertised} of candidates) {
      if (!url || attempts.some(attempt => attempt.url === url)) continue;

      const fetchResult = await AgentResourceDiscovery.fetchManifest(context, url);
      if (fetchResult.status === HTTP_OK && fetchResult.content) {
        return {discoverySource: source, catalogUrl: url, fetchResult,
          failedSources: failedSources()};
      }
      attempts.push({source, url, advertised, fetchResult});
    }

    const fallback = attempts.find(attempt => attempt.advertised) ||
      attempts.find(attempt => attempt.source === 'wellKnown');
    if (!fallback) throw new Error('ARD discovery attempted no candidates');

    return {
      discoverySource: fallback.source,
      catalogUrl: fallback.url,
      fetchResult: fallback.fetchResult,
      failedSources: failedSources(),
    };
  }

  /**
   * Resolves the manifest following ARD §5.1: explicit ARD signals first, then the
   * `/.well-known/ard.json` path consumers MUST fetch, and only then the predecessor
   * `ai-catalog` relation and well-known path, which consumers MAY consult.
   * @param {LH.Gatherer.Context<'RobotsTxt'>} context
   * @return {Promise<LH.Artifacts['AgentResourceDiscovery']>}
   */
  async getArtifact(context) {
    const {finalDisplayedUrl} = context.baseArtifacts.URL;
    const robotsTxtAgentmap = AgentResourceDiscovery.getRobotsTxtAgentmap(
      context.dependencies.RobotsTxt, finalDisplayedUrl);
    const [htmlLinks, httpHeaderLinks] = await Promise.all([
      AgentResourceDiscovery.getHtmlLinksFromDom(context, finalDisplayedUrl),
      AgentResourceDiscovery.getHttpHeaderLinks(context, finalDisplayedUrl),
    ]);

    /** @type {DiscoverySignals} */
    const discoverySignals = {
      robotsTxtAgentmap,
      htmlLink: htmlLinks.ard,
      httpHeaderLink: httpHeaderLinks.ard,
      legacyHtmlLink: htmlLinks.legacy,
      legacyHttpHeaderLink: httpHeaderLinks.legacy,
      wellKnown: new URL(WELL_KNOWN_PATH, finalDisplayedUrl).href,
      legacyWellKnown: new URL(LEGACY_WELL_KNOWN_PATH, finalDisplayedUrl).href,
    };

    const candidates = getManifestCandidates(discoverySignals);
    const {discoverySource, catalogUrl, fetchResult, failedSources} =
      await AgentResourceDiscovery.resolveManifest(context, candidates);

    return {
      ...fetchResult,
      catalogUrl,
      discoverySource,
      discoverySignals,
      failedSources,
    };
  }
}

export default AgentResourceDiscovery;
