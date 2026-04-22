/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


import BaseGatherer from '../../base-gatherer.js';

class LlmsTxt extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['LlmsTxt']>}
   */
  async getArtifact(passContext) {
    const {finalDisplayedUrl} = passContext.baseArtifacts.URL;
    const llmUrl = new URL('/llms.txt', finalDisplayedUrl).href;
    return passContext.driver.fetcher.fetchResource(llmUrl)
      .catch(err => ({status: null, content: null, errorMessage: err.message}));
  }
}

export default LlmsTxt;
