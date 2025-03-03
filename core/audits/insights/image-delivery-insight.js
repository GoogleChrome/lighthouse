/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings, ImageOptimizationType} from '@paulirish/trace_engine/models/trace/insights/ImageDelivery.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/ImageDelivery.js', UIStrings);

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
      requiredArtifacts: ['traces', 'TraceElements'],
      replacesAudits: [
        'modern-image-formats',
        'uses-optimized-images',
        'efficient-animated-content',
        'uses-responsive-images',
      ],
    };
  }

  /**
   * Note: This function is a copy of the `getOptimizationMessage` function found in the imported
   * module. We could re-use the output of that function but it's output is shimmed to a {i18nId, values} object
   * which is not consistent with the TS return type.
   *
   * We also can't change the function to output the untranslated strings because the responsive
   * size string has placeholders that need to be resolved here.
   *
   * @param {import('@paulirish/trace_engine/models/trace/insights/ImageDelivery.js').ImageOptimization} optimization
   * @returns
   */
  static getOptimizationMessage(optimization) {
    switch (optimization.type) {
      case ImageOptimizationType.ADJUST_COMPRESSION:
        return str_(UIStrings.useCompression);
      case ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION:
        return str_(UIStrings.useModernFormat);
      case ImageOptimizationType.VIDEO_FORMAT:
        return str_(UIStrings.useVideoFormat);
      case ImageOptimizationType.RESPONSIVE_SIZE:
        return str_(UIStrings.useResponsiveSize, {
          PH1: `${optimization.fileDimensions.width}x${optimization.fileDimensions.height}`,
          PH2: `${optimization.displayDimensions.width}x${optimization.displayDimensions.height}`,
        });
    }
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'ImageDelivery', (insight) => {
      if (!insight.optimizableImages.length) {
        // TODO: show UIStrings.noOptimizableImages?
        return;
      }

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
            reason: this.getOptimizationMessage(optimization),
            wastedBytes: optimization.byteSavings,
          })),
        },
      }));

      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default ImageDeliveryInsight;
