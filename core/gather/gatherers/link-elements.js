/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LinkHeader from 'http-link-header';

import BaseGatherer from '../base-gatherer.js';
import {pageFunctions} from '../../lib/page-functions.js';
import DevtoolsLog from './devtools-log.js';
import {MainResource} from '../../computed/main-resource.js';
import {Util} from '../../../shared/util.js';
import * as i18n from '../../lib/i18n/i18n.js';

/* globals getNodeDetails */

/**
 * @fileoverview
 * This gatherer collects all the effect `link` elements, both in the page and declared in the
 * headers of the main resource.
 */

const UIStrings = {
  /**
   * @description Warning message explaining that there was an error parsing a link header in an HTTP response. `error` will be an english string with more details on the error. `header` will be the value of the header that caused the error. `link` is a type of HTTP header and should not be translated.
   * @example {Expected attribute delimiter at offset 94} error
   * @example {<https://assets.calendly.com/assets/booking/css/booking-d0ac32b1.css>; rel=preload; as=style; nopush} error
   */
  headerParseWarning: 'Error parsing `link` header ({error}): `{header}`',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 *
 * @param {string} url
 * @param {string} finalDisplayedUrl
 * @return {string|null}
 */
function normalizeUrlOrNull(url, finalDisplayedUrl) {
  try {
    return new URL(url, finalDisplayedUrl).href;
  } catch (_) {
    return null;
  }
}

/**
 * @param {string|undefined} value
 * @return {LH.Artifacts.LinkElement['crossOrigin']}
 */
function getCrossoriginFromHeader(value) {
  if (value === 'anonymous') return 'anonymous';
  if (value === 'use-credentials') return 'use-credentials';
  return null;
}

/**
 * @return {LH.Artifacts['LinkElements']}
 */
/* c8 ignore start */
function getLinkElementsInDOM() {
  /** @type {Array<HTMLOrSVGElement>} */
  // @ts-expect-error - getElementsInDocument put into scope via stringification
  const browserElements = getElementsInDocument('link'); // eslint-disable-line no-undef
  /** @type {LH.Artifacts['LinkElements']} */
  const linkElements = [];

  for (const link of browserElements) {
    // We're only interested in actual LinkElements, not `<link>` tagName elements inside SVGs.
    // https://github.com/GoogleChrome/lighthouse/issues/9764
    if (!(link instanceof HTMLLinkElement)) continue;

    const hrefRaw = link.getAttribute('href') || '';
    const source = link.closest('head') ? 'head' : 'body';

    linkElements.push({
      rel: link.rel,
      href: link.href,
      hreflang: link.hreflang,
      as: link.as,
      crossOrigin: link.crossOrigin,
      hrefRaw,
      source,
      fetchPriority: link.fetchPriority,
      // @ts-expect-error - put into scope via stringification
      node: getNodeDetails(link),
    });
  }

  return linkElements;
}
/* c8 ignore stop */

class LinkElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  static getLinkElementsInDOM(context) {
    // We'll use evaluateAsync because the `node.getAttribute` method doesn't actually normalize
    // the values like access from JavaScript does.
    return context.driver.executionContext.evaluate(getLinkElementsInDOM, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getNodeDetails,
        pageFunctions.getElementsInDocument,
      ],
    });
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @param {LH.Artifacts['DevtoolsLog']} devtoolsLog
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  static async getLinkElementsInHeaders(context, devtoolsLog) {
    const mainDocument =
      await MainResource.request({devtoolsLog, URL: context.baseArtifacts.URL}, context);

    /** @type {LH.Artifacts['LinkElements']} */
    const linkElements = [];

    for (const header of mainDocument.responseHeaders) {
      if (header.name.toLowerCase() !== 'link') continue;

      /** @type {LinkHeader.Reference[]} */
      let parsedRefs = [];

      try {
        parsedRefs = LinkHeader.parse(header.value).refs;
      } catch (err) {
        const truncatedHeader = Util.truncate(header.value, 100);
        const warning = str_(UIStrings.headerParseWarning, {
          error: err.message,
          header: truncatedHeader,
        });
        context.baseArtifacts.LighthouseRunWarnings.push(warning);
      }

      for (const link of parsedRefs) {
        linkElements.push({
          rel: link.rel || '',
          href: normalizeUrlOrNull(link.uri, context.baseArtifacts.URL.finalDisplayedUrl),
          hrefRaw: link.uri || '',
          hreflang: link.hreflang || '',
          as: link.as || '',
          crossOrigin: getCrossoriginFromHeader(link.crossorigin),
          source: 'headers',
          fetchPriority: link.fetchpriority,
          node: null,
        });
      }
    }

    return linkElements;
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const fromDOM = await LinkElements.getLinkElementsInDOM(context);
    const fromHeaders = await LinkElements.getLinkElementsInHeaders(context, devtoolsLog);
    const linkElements = fromDOM.concat(fromHeaders);

    for (const link of linkElements) {
      // Normalize the rel for easy consumption/filtering
      link.rel = link.rel.toLowerCase();
    }

    return linkElements;
  }
}

export default LinkElements;
export {UIStrings};
