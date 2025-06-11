/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import * as i18n from '../../lib/i18n/i18n.js';

/* eslint-disable max-len */
const UIStrings = {
  /**
   * @description A warning that previously-saved data may have affected the measured performance and instructions on how to avoid the problem. "locations" will be a list of possible types of data storage locations, e.g. "IndexedDB",  "Local Storage", or "Web SQL".
   * @example {IndexedDB, Local Storage} locations
   */
  warningData: `{locationCount, plural,
    =1 {There may be stored data affecting loading performance in this location: {locations}. ` +
      `Audit this page in an incognito window to prevent those resources ` +
      `from affecting your scores.}
    other {There may be stored data affecting loading ` +
      `performance in these locations: {locations}. ` +
      `Audit this page in an incognito window to prevent those resources ` +
      `from affecting your scores.}
  }`,
  /** A warning that the data in the browser cache may have affected the measured performance because the operation to clear the browser cache timed out. */
  warningCacheTimeout: 'Clearing the browser cache timed out. Try auditing this page again and file a bug if the issue persists.',
  /** A warning that the data on the page's origin may have affected the measured performance because the operation to clear the origin data timed out. */
  warningOriginDataTimeout: 'Clearing the origin data timed out. Try auditing this page again and file a bug if the issue persists.',
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);


/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {string} url
 * @param {LH.Config.Settings['clearStorageTypes']} clearStorageTypes
 * @return {Promise<LH.IcuMessage[]>}
 */
async function clearDataForOrigin(session, url, clearStorageTypes) {
  const status = {msg: 'Cleaning origin data', id: 'lh:storage:clearDataForOrigin'};
  log.time(status);

  const warnings = [];

  const origin = new URL(url).origin;

  const typesToClear = clearStorageTypes.join(',');

  // `Storage.clearDataForOrigin` is one of our PROTOCOL_TIMEOUT culprits and this command is also
  // run in the context of PAGE_HUNG to cleanup. We'll keep the timeout low and just warn if it fails.
  session.setNextProtocolTimeout(5000);

  try {
    await session.sendCommand('Storage.clearDataForOrigin', {
      origin: origin,
      storageTypes: typesToClear,
    });
  } catch (err) {
    if (/** @type {LH.LighthouseError} */ (err).code === 'PROTOCOL_TIMEOUT') {
      log.warn('Driver', 'clearDataForOrigin timed out');
      warnings.push(str_(UIStrings.warningOriginDataTimeout));
    } else {
      throw err;
    }
  } finally {
    log.timeEnd(status);
  }

  return warnings;
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {string} url
 * @return {Promise<LH.IcuMessage | undefined>}
 */
async function getImportantStorageWarning(session, url) {
  const usageData = await session.sendCommand('Storage.getUsageAndQuota', {
    origin: url,
  });
  /** @type {Record<string, string>} */
  const storageTypeNames = {
    local_storage: 'Local Storage',
    indexeddb: 'IndexedDB',
    websql: 'Web SQL',
  };
  const locations = usageData.usageBreakdown
    .filter(usage => usage.usage)
    .map(usage => storageTypeNames[usage.storageType] || '')
    .filter(Boolean);
  if (locations.length) {
    // TODO(#11495): Use Intl.ListFormat with Node 12
    return str_(UIStrings.warningData, {
      locations: locations.join(', '),
      locationCount: locations.length,
    });
  }
}


/**
 * Clear the network cache on disk and in memory.
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<LH.IcuMessage[]>}
 */
async function clearBrowserCaches(session) {
  const status = {msg: 'Cleaning browser cache', id: 'lh:storage:clearBrowserCaches'};
  log.time(status);

  const warnings = [];

  try {
    // Wipe entire disk cache
    await session.sendCommand('Network.clearBrowserCache');
    // Toggle 'Disable Cache' to evict the memory cache
    await session.sendCommand('Network.setCacheDisabled', {cacheDisabled: true});
    await session.sendCommand('Network.setCacheDisabled', {cacheDisabled: false});
  } catch (err) {
    if (/** @type {LH.LighthouseError} */ (err).code === 'PROTOCOL_TIMEOUT') {
      log.warn('Driver', 'clearBrowserCaches timed out');
      warnings.push(str_(UIStrings.warningCacheTimeout));
    } else {
      throw err;
    }
  } finally {
    log.timeEnd(status);
  }

  return warnings;
}

export {
  clearDataForOrigin,
  clearBrowserCaches,
  getImportantStorageWarning,
  UIStrings,
};
