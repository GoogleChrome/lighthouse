/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';

/**
 * @fileoverview This artifact identifies the main resource on the page. Current solution assumes
 * that the main resource is the first non-redirected one.
 */
class MainResource {
  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.NetworkRequest>}
   */
  static async compute_(data, context) {
    const {mainDocumentUrl} = data.URL;
    if (!mainDocumentUrl) throw new Error('mainDocumentUrl must exist to get the main resource');
    const records = await NetworkRecords.request(data.devtoolsLog, context);

    // We could have more than one record matching the main doucment url,
    // if the page did `location.reload()`. Since `mainDocumentUrl` refers to the _last_
    // document request, we should return the last candidate here. Besides, the browser
    // would have evicted the first request by the time `MainDocumentRequest` (a consumer
    // of this computed artifact) attempts to fetch the contents, resulting in a protocol error.
    const mainResource =
      Lantern.Core.NetworkAnalyzer.findLastDocumentForUrl(records, mainDocumentUrl);
    if (!mainResource) {
      throw new Error('Unable to identify the main resource');
    }

    return mainResource;
  }
}

const MainResourceComputed = makeComputedArtifact(MainResource, ['URL', 'devtoolsLog']);
export {MainResourceComputed as MainResource};
