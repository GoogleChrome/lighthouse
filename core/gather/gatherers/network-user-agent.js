/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import DevtoolsLogGatherer from './devtools-log.js';

/** @implements {LH.Gatherer.GathererInstance<'DevtoolsLog'>} */
class NetworkUserAgent extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLogGatherer.symbol},
  };

  /**
   * @param {LH.Artifacts['DevtoolsLog']} devtoolsLog
   * @return {string}
   */
  static getNetworkUserAgent(devtoolsLog) {
    for (const entry of devtoolsLog) {
      if (entry.method !== 'Network.requestWillBeSent') continue;
      const userAgent = entry.params.request.headers['User-Agent'];
      if (userAgent) return userAgent;
    }

    return '';
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['NetworkUserAgent']>}
   */
  async getArtifact(context) {
    return NetworkUserAgent.getNetworkUserAgent(context.dependencies.DevtoolsLog);
  }
}

export default NetworkUserAgent;
