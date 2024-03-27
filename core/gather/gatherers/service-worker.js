/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import * as serviceWorkers from '../driver/service-workers.js';

class ServiceWorker extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['ServiceWorker']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const [{versions}, {registrations}] = await Promise.all([
      serviceWorkers.getServiceWorkerVersions(session),
      serviceWorkers.getServiceWorkerRegistrations(session),
    ]);

    return {
      versions,
      registrations,
    };
  }
}

export default ServiceWorker;
