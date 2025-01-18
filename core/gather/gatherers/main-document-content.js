/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import DevtoolsLog from './devtools-log.js';
import {fetchResponseBodyFromCache} from '../driver/network.js';
import {MainResource} from '../../computed/main-resource.js';

/**
 * Collects the content of the main html document.
 */
class MainDocumentContent extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['MainDocumentContent']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const mainResource =
      await MainResource.request({devtoolsLog, URL: context.baseArtifacts.URL}, context);
    const session = context.driver.defaultSession;
    return fetchResponseBodyFromCache(session, mainResource.requestId);
  }
}

export default MainDocumentContent;
