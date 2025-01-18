/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../../base-gatherer.js';

class RobotsTxt extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['RobotsTxt']>}
   */
  async getArtifact(passContext) {
    const {finalDisplayedUrl} = passContext.baseArtifacts.URL;
    const robotsUrl = new URL('/robots.txt', finalDisplayedUrl).href;
    return passContext.driver.fetcher.fetchResource(robotsUrl)
      .catch(err => ({status: null, content: null, errorMessage: err.message}));
  }
}

export default RobotsTxt;
