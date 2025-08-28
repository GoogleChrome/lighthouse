/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as ImageDeliveryInsightModule from '@paulirish/trace_engine/models/trace/insights/ImageDelivery.js';
import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/ImageDelivery.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';
import {TraceEngineResult} from '../../computed/trace-engine-result.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/ImageDelivery.js', UIStrings);

const getOptimizationMessage =
  TraceEngineResult.localizeFunction(str_, ImageDeliveryInsightModule.getOptimizationMessage);

class ImageDeliveryInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'image-delivery-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: [
        'modern-image-formats',
        'uses-optimized-images',
        'efficient-animated-content',
        'uses-responsive-images',
      ],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'ImageDelivery', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL), subItemsHeading: {key: 'reason', valueType: 'text'}},
        {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnResourceSize)},
        {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes), subItemsHeading: {key: 'wastedBytes', valueType: 'bytes'}},
        /* eslint-enable max-len */
      ];

      /** @type {LH.Audit.Details.Table['items']} */
      const items = insight.optimizableImages.map(image => ({
        url: image.request.args.data.url,
        totalBytes: image.request.args.data.decodedBodyLength,
        wastedBytes: image.byteSavings,
        subItems: {
          type: /** @type {const} */ ('subitems'),
          items: image.optimizations.map(optimization => ({
            reason: getOptimizationMessage(optimization),
            wastedBytes: optimization.byteSavings,
          })),
        },
      }));

      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default ImageDeliveryInsight;
