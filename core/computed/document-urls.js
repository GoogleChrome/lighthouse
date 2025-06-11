/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';
import {ProcessedTrace} from './processed-trace.js';

/**
 * @fileoverview Compute the navigation specific URLs `requestedUrl` and `mainDocumentUrl` in situations where
 * the `URL` artifact is not present. This is not a drop-in replacement for `URL` but can be helpful in situations
 * where getting the `URL` artifact is difficult.
 */

class DocumentUrls {
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<{requestedUrl: string, mainDocumentUrl: string}>}
   */
  static async compute_(data, context) {
    const processedTrace = await ProcessedTrace.request(data.trace, context);
    const networkRecords = await NetworkRecords.request(data.devtoolsLog, context);

    const mainFrameId = processedTrace.mainFrameInfo.frameId;

    /** @type {string|undefined} */
    let requestedUrl;
    /** @type {string|undefined} */
    let mainDocumentUrl;
    for (const event of data.devtoolsLog) {
      if (event.method === 'Page.frameNavigated' && event.params.frame.id === mainFrameId) {
        const {url} = event.params.frame;
        // Only set requestedUrl on the first main frame navigation.
        if (!requestedUrl) requestedUrl = url;
        mainDocumentUrl = url;
      }
    }
    if (!requestedUrl || !mainDocumentUrl) throw new Error('No main frame navigations found');

    const initialRequest =
      Lantern.Core.NetworkAnalyzer.findResourceForUrl(networkRecords, requestedUrl);
    if (initialRequest?.redirects?.length) requestedUrl = initialRequest.redirects[0].url;

    return {requestedUrl, mainDocumentUrl};
  }
}

const DocumentUrlsComputed = makeComputedArtifact(DocumentUrls, ['devtoolsLog', 'trace']);
export {DocumentUrlsComputed as DocumentUrls};

