/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';
import LinkHeader from 'http-link-header';

import BaseGatherer from '../../base-gatherer.js';
import RobotsTxt from '../seo/robots-txt.js';
import {pageFunctions} from '../../../lib/page-functions.js';
function getAiCatalogLinkInDOM() {
  const link = document.querySelector('link[rel~="ai-catalog" i]');
  return link instanceof HTMLLinkElement ? link.href : null;
}

class AgentResourceDiscovery extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'RobotsTxt'>} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
    dependencies: {RobotsTxt: RobotsTxt.symbol},
  };

  /**
   * @param {LH.Artifacts['RobotsTxt']|null|undefined} robotsTxt
   * @param {string} finalDisplayedUrl
   * @return {string|null}
   */
  static getRobotsTxtAgentmap(robotsTxt, finalDisplayedUrl) {
    if (!robotsTxt?.content) return null;
    const match = robotsTxt.content.match(/^\s*Agentmap:\s*(\S+)/im);
    if (!match) return null;
    try {
      return new URL(match[1], finalDisplayedUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @param {string} finalDisplayedUrl
   * @return {Promise<string|null>}
   */
  static async getHtmlLinkFromDom(context, finalDisplayedUrl) {
    try {
      const href = await context.driver.executionContext.evaluate(getAiCatalogLinkInDOM, {
        args: [],
        useIsolation: true,
        deps: [pageFunctions.getNodeDetails],
      });
      if (!href) return null;
      return new URL(href, finalDisplayedUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @param {string} finalDisplayedUrl
   * @return {Promise<string|null>}
   */
  static async getHttpHeaderLink(context, finalDisplayedUrl) {
    // Only check in navigation mode
    if (context.gatherMode !== 'navigation') return null;

    try {
      const mainResourceResponse = await context.driver.fetcher.fetchResource(finalDisplayedUrl);
      const linkHeader = mainResourceResponse.headers?.['link'];
      if (!linkHeader) return null;

      const parsed = LinkHeader.parse(linkHeader);
      const aiCatalogRef = parsed.get('rel', 'ai-catalog')[0];
      if (!aiCatalogRef?.uri) return null;

      return new URL(aiCatalogRef.uri, finalDisplayedUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * @param {LH.Gatherer.Context<'RobotsTxt'>} context
   * @return {Promise<LH.Artifacts['AgentResourceDiscovery']>}
   */
  async getArtifact(context) {
    const {finalDisplayedUrl} = context.baseArtifacts.URL;
    const robotsTxt = context.dependencies.RobotsTxt;
    const robotsTxtAgentmap = AgentResourceDiscovery.getRobotsTxtAgentmap(
      robotsTxt, finalDisplayedUrl);
    const [htmlLink, httpHeaderLink] = await Promise.all([
      AgentResourceDiscovery.getHtmlLinkFromDom(context, finalDisplayedUrl),
      AgentResourceDiscovery.getHttpHeaderLink(context, finalDisplayedUrl),
    ]);
    const wellKnown = new URL('/.well-known/ai-catalog.json', finalDisplayedUrl).href;
    const catalogUrl = robotsTxtAgentmap || htmlLink || httpHeaderLink || wellKnown;

    /** @type {string|undefined} */
    let errorMessage;
    const fetchResult = await context.driver.fetcher.fetchResource(catalogUrl)
      .catch(err => {
        log.error('AgentResourceDiscovery', err);
        errorMessage = err.message;
        return {status: null, content: null, headers: null};
      });

    return {
      status: fetchResult.status,
      content: fetchResult.content,
      headers: fetchResult.headers || null,
      catalogUrl,
      discoverySignals: {
        robotsTxtAgentmap,
        htmlLink,
        httpHeaderLink,
        wellKnown,
      },
      errorMessage,
    };
  }
}

export default AgentResourceDiscovery;
