/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import data from 'web-features/data.json' with {type: 'json'};

import {Audit} from './audit.js';
import metadata from '../lib/baseline/web-features-metadata.json' with {type: 'json'};
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of the Baseline audit. Shown when the page is compatible with the target baseline. */
  title: 'Baseline Features',
  /**
   * @description Description of the Baseline audit.
   * @example {2026-03-18} date
   */
  description:
    'Lists web features used on the page and their Baseline status as of {date}. ' +
    '[Learn more about Baseline](https://webstatus.dev/).',
  /** Label for the column displaying the feature ID. */
  columnFeature: 'Web-features',
  /** Label for the column displaying the feature\'s baseline status. */
  columnStatus: 'Baseline Status',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);
const {features} = /** @type {any} */ (data);


/** @typedef {LH.TraceEvent & {args: {feature: string, url?: string, lineNumber?: number, columnNumber?: number}}} DXFeatureEvent */

class Baseline extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'baseline',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description, {date: metadata.date}),
      requiredArtifacts: ['Trace'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const trace = artifacts.Trace;

    /** @type {Map<string, {featureId: string, source: LH.Audit.Details.SourceLocationValue | undefined}>} */
    const featuresMap = new Map();

    const dxEvents = /** @type {DXFeatureEvent[]} */ (
      (trace.traceEvents || []).filter(e => e.cat === 'blink.webdx_feature_usage' &&
        e.args?.feature)
    );

    for (const event of dxEvents) {
      const key = `${event.args.feature}`;

      if (featuresMap.has(key)) continue;

      /** @type {LH.Audit.Details.SourceLocationValue | undefined} */
      let source;

      if (event.args.url) {
        const line = event.args.lineNumber ? event.args.lineNumber - 1 : 0;
        const column = event.args.columnNumber ? event.args.columnNumber - 1 : 0;

        source = Audit.makeSourceLocation(event.args.url, line, column);
      }

      featuresMap.set(key, {
        featureId: event.args.feature,
        source,
      });
    }

    const baselineFeatures = Array.from(featuresMap.values());
    const baselineStatus = [];

    for (const feature of baselineFeatures) {
      if (!feature.featureId) {
        continue;
      }

      const featureData = features[feature.featureId];

      if (!featureData || !('status' in featureData)) {
        continue;
      }

      let displayStatus = 'Limited Availability';
      let baselineTier = 'limited';

      if (featureData.status.baseline === 'high') {
        displayStatus = `Widely Available (${featureData.status.baseline_low_date})`;
        baselineTier = 'high';
      } else if (featureData.status.baseline === 'low') {
        displayStatus = `Newly Available (${featureData.status.baseline_low_date})`;
        baselineTier = 'low';
      }

      baselineStatus.push({
        featureId: {
          type: /** @type {const} */ ('link'),
          text: feature.featureId,
          url: `https://webstatus.dev/features/${feature.featureId}`,
        },
        displayStatus: {
          type: /** @type {const} */ ('baseline-status'),
          status: baselineTier,
          displayString: displayStatus,
        },
        source: feature.source,
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {
        key: 'featureId',
        valueType: 'link',
        label: str_(UIStrings.columnFeature),
      },
      {
        key: 'displayStatus',
        valueType: 'baseline-status',
        label: str_(UIStrings.columnStatus),
      },
      {
        key: 'source',
        valueType: 'source-location',
        label: str_(i18n.UIStrings.columnSource),
      },
    ];

    /**
     * Determines the sorting rank of a baseline status.
     * @param {string} status The display status string.
     * @return {number} The numerical rank (1 is the highest priority).
     */
    const getStatusRank = (status) => {
      if (status.startsWith('Limited')) {
        return 1;
      }
      if (status.startsWith('Newly')) {
        return 2;
      }
      if (status.startsWith('Widely')) {
        return 3;
      }
      return 4;
    };

    const sortedStatuses = baselineStatus.sort((featureA, featureB) => {
      const rankA = getStatusRank(featureA.displayStatus.displayString);
      const rankB = getStatusRank(featureB.displayStatus.displayString);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const hasSourceA = !!featureA.source;
      const hasSourceB = !!featureB.source;

      if (hasSourceA !== hasSourceB) {
        return hasSourceA ? -1 : 1;
      }

      return 0;
    });

    const details = Audit.makeTableDetails(headings, sortedStatuses);

    return {
      score: 1,
      details,
    };
  }
}

export default Baseline;
export {UIStrings};
