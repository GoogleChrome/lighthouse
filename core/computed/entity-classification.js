/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';
import {Util} from '../../shared/util.js';
import UrlUtils from '../lib/url-utils.js';
import thirdPartyWeb from '../lib/third-party-web.js';

/** @typedef {Map<string, LH.Artifacts.Entity>} EntityCache */

class EntityClassification {
  /**
   * @param {EntityCache} entityCache
   * @param {string} url
   * @param {string=} extensionName
   * @return {LH.Artifacts.Entity}
   */
  static makeupChromeExtensionEntity_(entityCache, url, extensionName) {
    const origin = Util.getChromeExtensionOrigin(url);
    const host = new URL(origin).host;
    const name = extensionName || host;

    const cachedEntity = entityCache.get(origin);
    if (cachedEntity) return cachedEntity;

    const chromeExtensionEntity = {
      name,
      company: name,
      category: 'Chrome Extension',
      homepage: 'https://chromewebstore.google.com/detail/' + host,
      categories: [],
      domains: [],
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      totalOccurrences: 0,
    };

    entityCache.set(origin, chromeExtensionEntity);
    return chromeExtensionEntity;
  }

  /**
   * @param {EntityCache} entityCache
   * @param {string} url
   * @return {LH.Artifacts.Entity | undefined}
   */
  static _makeUpAnEntity(entityCache, url) {
    if (!UrlUtils.isValid(url)) return;

    const parsedUrl = Util.createOrReturnURL(url);
    if (parsedUrl.protocol === 'chrome-extension:') {
      return EntityClassification.makeupChromeExtensionEntity_(entityCache, url);
    }

    // Make up an entity only for valid http/https URLs.
    if (!parsedUrl.protocol.startsWith('http')) return;

    const rootDomain = UrlUtils.getRootDomain(url);
    if (!rootDomain) return;
    if (entityCache.has(rootDomain)) return entityCache.get(rootDomain);

    const unrecognizedEntity = {
      name: rootDomain,
      company: rootDomain,
      category: '',
      categories: [],
      domains: [rootDomain],
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      totalOccurrences: 0,
      isUnrecognized: true,
    };
    entityCache.set(rootDomain, unrecognizedEntity);
    return unrecognizedEntity;
  }

  /**
   * Preload Chrome extensions found in the devtoolsLog into cache.
   * @param {EntityCache} entityCache
   * @param {LH.DevtoolsLog} devtoolsLog
   */
  static _preloadChromeExtensionsToCache(entityCache, devtoolsLog) {
    for (const entry of devtoolsLog.values()) {
      if (entry.method !== 'Runtime.executionContextCreated') continue;

      const origin = entry.params.context.origin;
      if (!origin.startsWith('chrome-extension:')) continue;
      if (entityCache.has(origin)) continue;

      EntityClassification.makeupChromeExtensionEntity_(entityCache, origin,
        entry.params.context.name);
    }
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.EntityClassification>}
   */
  static async compute_(data, context) {
    const networkRecords = await NetworkRecords.request(data.devtoolsLog, context);
    /** @type {EntityCache} */
    const madeUpEntityCache = new Map();
    /** @type {Map<string, LH.Artifacts.Entity>} */
    const entityByUrl = new Map();
    /** @type {Map<LH.Artifacts.Entity, Set<string>>} */
    const urlsByEntity = new Map();

    EntityClassification._preloadChromeExtensionsToCache(madeUpEntityCache, data.devtoolsLog);

    for (const record of networkRecords) {
      const {url} = record;
      if (entityByUrl.has(url)) continue;

      const entity = thirdPartyWeb.getEntity(url) ||
        EntityClassification._makeUpAnEntity(madeUpEntityCache, url);
      if (!entity) continue;

      const entityURLs = urlsByEntity.get(entity) || new Set();
      entityURLs.add(url);
      urlsByEntity.set(entity, entityURLs);
      entityByUrl.set(url, entity);
    }

    // When available, first party identification will be done via
    // `mainDocumentUrl` (for navigations), and falls back to `finalDisplayedUrl` (for timespan/snapshot).
    // See https://github.com/GoogleChrome/lighthouse/issues/13706
    const firstPartyUrl = data.URL.mainDocumentUrl || data.URL.finalDisplayedUrl;
    const firstParty = thirdPartyWeb.getEntity(firstPartyUrl) ||
      EntityClassification._makeUpAnEntity(madeUpEntityCache, firstPartyUrl);

    /**
     * Convenience function to check if a URL belongs to first party.
     * @param {string} url
     * @return {boolean}
     */
    function isFirstParty(url) {
      const entityUrl = entityByUrl.get(url);
      return entityUrl === firstParty;
    }

    return {
      entityByUrl,
      urlsByEntity,
      firstParty,
      isFirstParty,
    };
  }
}

const EntityClassificationComputed = makeComputedArtifact(EntityClassification,
  ['URL', 'devtoolsLog']);
export {EntityClassificationComputed as EntityClassification};
