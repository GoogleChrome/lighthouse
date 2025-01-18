/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TextEncoding} from './text-encoding.js';

/* eslint-env browser */

function getAppsOrigin() {
  const isVercel = window.location.host.endsWith('.vercel.app');
  const isDev = new URLSearchParams(window.location.search).has('dev');

  if (isVercel) return `https://${window.location.host}/gh-pages`;
  if (isDev) return 'http://localhost:7333';
  return 'https://googlechrome.github.io/lighthouse';
}

/**
 * The popup's window.name is keyed by version+url+fetchTime, so we reuse/select tabs correctly.
 * @param {LH.Result} json
 * @protected
 */
function computeWindowNameSuffix(json) {
  // @ts-expect-error - If this is a v2 LHR, use old `generatedTime`.
  const fallbackFetchTime = /** @type {string} */ (json.generatedTime);
  const fetchTime = json.fetchTime || fallbackFetchTime;
  return `${json.lighthouseVersion}-${json.finalDisplayedUrl}-${fetchTime}`;
}

/**
 * Opens a new tab to an external page and sends data using postMessage.
 * @param {{lhr: LH.Result} | LH.Treemap.Options} data
 * @param {string} url
 * @param {string} windowName
 * @protected
 */
function openTabAndSendData(data, url, windowName) {
  const origin = new URL(url).origin;
  // Chrome doesn't allow us to immediately postMessage to a popup right
  // after it's created. Normally, we could also listen for the popup window's
  // load event, however it is cross-domain and won't fire. Instead, listen
  // for a message from the target app saying "I'm open".
  window.addEventListener('message', function msgHandler(messageEvent) {
    if (messageEvent.origin !== origin) {
      return;
    }
    if (popup && messageEvent.data.opened) {
      popup.postMessage(data, origin);
      window.removeEventListener('message', msgHandler);
    }
  });

  const popup = window.open(url, windowName);
}

/**
 * Opens a new tab to an external page and sends data via base64 encoded url params.
 * @param {{lhr: LH.Result} | LH.Treemap.Options} data
 * @param {string} url_
 * @param {string} windowName
 * @protected
 */
async function openTabWithUrlData(data, url_, windowName) {
  const url = new URL(url_);
  const gzip = Boolean(window.CompressionStream);
  url.hash = await TextEncoding.toBase64(JSON.stringify(data), {
    gzip,
  });
  if (gzip) url.searchParams.set('gzip', '1');
  window.open(url.toString(), windowName);
}

/**
 * Opens a new tab to the online viewer and sends the local page's JSON results
 * to the online viewer using URL.fragment
 * @param {LH.Result} lhr
 * @protected
 */
async function openViewer(lhr) {
  const windowName = 'viewer-' + computeWindowNameSuffix(lhr);
  const url = getAppsOrigin() + '/viewer/';
  await openTabWithUrlData({lhr}, url, windowName);
}

/**
 * Same as openViewer, but uses postMessage.
 * @param {LH.Result} lhr
 * @protected
 */
async function openViewerAndSendData(lhr) {
  const windowName = 'viewer-' + computeWindowNameSuffix(lhr);
  const url = getAppsOrigin() + '/viewer/';
  openTabAndSendData({lhr}, url, windowName);
}

/**
 * Opens a new tab to the treemap app and sends the JSON results using URL.fragment
 * @param {LH.Result} json
 */
function openTreemap(json) {
  const treemapData = json.audits['script-treemap-data'].details;
  if (!treemapData) {
    throw new Error('no script treemap data found');
  }

  /** @type {LH.Treemap.Options} */
  const treemapOptions = {
    lhr: {
      mainDocumentUrl: json.mainDocumentUrl,
      finalUrl: json.finalUrl,
      finalDisplayedUrl: json.finalDisplayedUrl,
      audits: {
        'script-treemap-data': json.audits['script-treemap-data'],
      },
      configSettings: {
        locale: json.configSettings.locale,
      },
    },
  };
  const url = getAppsOrigin() + '/treemap/';
  const windowName = 'treemap-' + computeWindowNameSuffix(json);

  openTabWithUrlData(treemapOptions, url, windowName);
}

export {
  openViewer,
  openViewerAndSendData,
  openTreemap,
};
