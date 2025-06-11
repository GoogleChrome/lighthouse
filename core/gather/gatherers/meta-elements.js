/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import {pageFunctions} from '../../lib/page-functions.js';

/* globals getElementsInDocument getNodeDetails */

/* c8 ignore start */
function collectMetaElements() {
  const functions = /** @type {typeof pageFunctions} */({
    // @ts-expect-error - getElementsInDocument put into scope via stringification
    getElementsInDocument,
    // @ts-expect-error - getNodeDetails put into scope via stringification
    getNodeDetails,
  });

  const metas = functions.getElementsInDocument('head meta');
  return metas.map(meta => {
    /** @param {string} name */
    const getAttribute = name => {
      const attr = meta.attributes.getNamedItem(name);
      if (!attr) return;
      return attr.value;
    };
    return {
      name: meta.name.toLowerCase(),
      content: meta.content,
      property: getAttribute('property'),
      httpEquiv: meta.httpEquiv ? meta.httpEquiv.toLowerCase() : undefined,
      charset: getAttribute('charset'),
      node: functions.getNodeDetails(meta),
    };
  });
}
/* c8 ignore stop */

class MetaElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['MetaElements']>}
   */
  getArtifact(passContext) {
    const driver = passContext.driver;

    // We'll use evaluateAsync because the `node.getAttribute` method doesn't actually normalize
    // the values like access from JavaScript does.
    return driver.executionContext.evaluate(collectMetaElements, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getElementsInDocument,
        pageFunctions.getNodeDetails,
      ],
    });
  }
}

export default MetaElements;
