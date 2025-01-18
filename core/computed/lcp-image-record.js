/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';
import {ProcessedNavigation} from './processed-navigation.js';
import {LighthouseError} from '../lib/lh-error.js';

/**
 * @fileoverview Match the LCP event with the paint event to get the request of the image actually painted.
 * This could differ from the `ImageElement` associated with the nodeId if e.g. the LCP
 * was a pseudo-element associated with a node containing a smaller background-image.
 */

class LCPImageRecord {
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.NetworkRequest|undefined>}
   */
  static async compute_(data, context) {
    const {trace, devtoolsLog} = data;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const processedNavigation = await ProcessedNavigation.request(trace, context);
    if (processedNavigation.timings.largestContentfulPaint === undefined) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP);
    }

    // Use main-frame-only LCP to match the metric value.
    const lcpEvent = processedNavigation.largestContentfulPaintEvt;
    if (!lcpEvent) return;

    const lcpImagePaintEvent = trace.traceEvents.filter(e => {
      return e.name === 'LargestImagePaint::Candidate' &&
          e.args.frame === lcpEvent.args.frame &&
          e.args.data?.DOMNodeId === lcpEvent.args.data?.nodeId &&
          e.args.data?.size === lcpEvent.args.data?.size;
    // Get last candidate, in case there was more than one.
    }).sort((a, b) => b.ts - a.ts)[0];

    const lcpUrl = lcpImagePaintEvent?.args.data?.imageUrl;
    if (!lcpUrl) return;

    const candidates = networkRecords.filter(record => {
      return record.url === lcpUrl &&
          record.finished &&
          // Same frame as LCP trace event.
          record.frameId === lcpImagePaintEvent.args.frame &&
          record.networkRequestTime < (processedNavigation.timestamps.largestContentfulPaint || 0);
    }).map(record => {
      // Follow any redirects to find the real image request.
      while (record.redirectDestination) {
        record = record.redirectDestination;
      }
      return record;
    }).filter(record => {
      // Don't select if also loaded by some other means (xhr, etc). `resourceType`
      // isn't set on redirect _sources_, so have to check after following redirects.
      return record.resourceType === 'Image';
    });

    // If there are still multiple candidates, at this point it appears the page
    // simply made multiple requests for the image. The first loaded is the best
    // guess of the request that made the image available for use.
    return candidates.sort((a, b) => a.networkEndTime - b.networkEndTime)[0];
  }
}

const LCPImageRecordComputed = makeComputedArtifact(LCPImageRecord, ['devtoolsLog', 'trace']);
export {LCPImageRecordComputed as LCPImageRecord};

