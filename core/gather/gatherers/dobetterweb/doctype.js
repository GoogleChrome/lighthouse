/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../../base-gatherer.js';

/**
 * Get and return `name`, `publicId`, `systemId` from
 * `document.doctype`
 * and `compatMode` from `document` to check `quirks-mode`
 * @return {{name: string, publicId: string, systemId: string, documentCompatMode: string} | null}
 */
function getDoctype() {
  // An example of this is warnerbros.com/archive/spacejam/movie/jam.htm
  if (!document.doctype) {
    return null;
  }

  const documentCompatMode = document.compatMode;
  const {name, publicId, systemId} = document.doctype;
  return {name, publicId, systemId, documentCompatMode};
}

class Doctype extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['Doctype']>}
   */
  getArtifact(passContext) {
    const driver = passContext.driver;
    return driver.executionContext.evaluate(getDoctype, {
      args: [],
      useIsolation: true,
    });
  }
}

export default Doctype;
