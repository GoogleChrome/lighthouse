/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {LCPBreakdown} from '../computed/metrics/lcp-breakdown.js';
import {LargestContentfulPaint} from '../computed/metrics/largest-contentful-paint.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether the largest above-the-fold image was loaded with sufficient priority. This descriptive title is shown to users when the image was loaded properly. */
  title: 'Largest Contentful Paint image was not lazily loaded',
  /** Title of a Lighthouse audit that provides detail on whether the largest above-the-fold image was loaded with sufficient priority. This descriptive title is shown to users when the image was loaded inefficiently using the `loading=lazy` attribute. */
  failureTitle: 'Largest Contentful Paint image was lazily loaded',
  /** Description of a Lighthouse audit that tells the user why the advice is important. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'Above-the-fold images that are lazily loaded render later in the page lifecycle, which can delay the largest contentful paint. [Learn more about optimal lazy loading](https://web.dev/articles/lcp-lazy-loading).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const ESTIMATED_PERCENT_SAVINGS = 0.15;

class LargestContentfulPaintLazyLoaded extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'lcp-lazy-loaded',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: ['TraceElements', 'ViewportDimensions', 'ImageElements',
        'Trace', 'DevtoolsLog', 'GatherContext', 'URL', 'SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts.ImageElement} image
   * @param {LH.Artifacts.ViewportDimensions} viewportDimensions
   * @return {boolean}
   */
  static isImageInViewport(image, viewportDimensions) {
    const imageTop = image.clientRect.top;
    const viewportHeight = viewportDimensions.innerHeight;
    return imageTop < viewportHeight;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const lcpElement = artifacts.TraceElements.find(element => {
      return element.traceEventType === 'largest-contentful-paint' && element.type === 'image';
    });
    const lcpElementImage = lcpElement ? artifacts.ImageElements.find(elem => {
      return elem.node.devtoolsNodePath === lcpElement.node.devtoolsNodePath;
    }) : undefined;


    if (!lcpElementImage ||
      !this.isImageInViewport(lcpElementImage, artifacts.ViewportDimensions)) {
      return {
        score: null,
        notApplicable: true,
        metricSavings: {LCP: 0},
      };
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: str_(i18n.UIStrings.columnElement)},
    ];

    const details = Audit.makeTableDetails(headings, [
      {
        node: Audit.makeNodeItem(lcpElementImage.node),
      },
    ]);

    const wasLazyLoaded = lcpElementImage.loading === 'lazy';

    const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);
    const {timing: metricLcp} =
      await LargestContentfulPaint.request(metricComputationData, context);
    const lcpBreakdown = await LCPBreakdown.request(metricComputationData, context);
    let lcpSavings = 0;
    if (wasLazyLoaded && lcpBreakdown.loadStart !== undefined) {
      // Estimate the LCP savings using a statistical percentage.
      // https://web.dev/articles/lcp-lazy-loading#causal_performance
      //
      // LCP savings will be at most the LCP load delay.
      const lcpLoadDelay = lcpBreakdown.loadStart - lcpBreakdown.ttfb;
      lcpSavings = Math.min(metricLcp * ESTIMATED_PERCENT_SAVINGS, lcpLoadDelay);
    }

    return {
      score: wasLazyLoaded ? 0 : 1,
      metricSavings: {
        LCP: lcpSavings,
      },
      details,
    };
  }
}

export default LargestContentfulPaintLazyLoaded;
export {UIStrings};
