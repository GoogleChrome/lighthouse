/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import data from '../lib/baseline/web-features-data.json' with {type: 'json'};
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


/** @typedef {LH.TraceEvent & {args: {feature: string, url?: string, lineNumber?: number, columnNumber?: number}}} DXFeatureEvent */

class Baseline extends Audit {
  static featureData = data;

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
   * Determines the baseline status and display string for a given feature ID.
   * @param {string} featureId
   * @param {{high: Record<string, string>, low: Record<string, string>, limited: string[]}} featureData
   * @param {Date} currentDate
   * @return {{displayStatus: string, baselineTier: 'high' | 'low' | 'limited'} | null}
   */
  static getFeatureStatus(featureId, featureData, currentDate) {
    if (featureId in featureData.high) {
      const highData = /** @type {Record<string, string>} */ (featureData.high);
      return {
        displayStatus: `Widely Available (${highData[featureId]})`,
        baselineTier: 'high',
      };
    }

    if (featureId in featureData.low) {
      const lowData = /** @type {Record<string, string>} */ (featureData.low);
      const widelyAvailableDate = new Date(lowData[featureId]);
      widelyAvailableDate.setUTCMonth(widelyAvailableDate.getUTCMonth() + 30);
      const widelyAvailableDateStr = widelyAvailableDate.toISOString().slice(0, 10);

      if (widelyAvailableDate <= currentDate) {
        return {
          displayStatus: `Widely Available (${widelyAvailableDateStr})`,
          baselineTier: 'high',
        };
      } else {
        return {
          displayStatus: `Newly Available (${lowData[featureId]})`,
          baselineTier: 'low',
        };
      }
    }

    if (featureData.limited.includes(featureId)) {
      return {
        displayStatus: 'Limited Availability',
        baselineTier: 'limited',
      };
    }

    return null;
  }

  /**
   * @param {string} featureId
   * @param {{high: Record<string, string>, low: Record<string, string>, limited: string[]}} featureData
   * @return {string|null}
   */
  static getLowDate(featureId, featureData) {
    if (featureId in featureData.low) {
      const lowData = /** @type {Record<string, string>} */ (featureData.low);
      return lowData[featureId];
    }
    if (featureId in featureData.high) {
      const highData = /** @type {Record<string, string>} */ (featureData.high);
      const date = new Date(highData[featureId]);
      date.setUTCMonth(date.getUTCMonth() - 30);
      return date.toISOString().slice(0, 10);
    }
    return null;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const trace = artifacts.Trace;

    /** @type {Map<string, {featureId: string, source: LH.Audit.Details.SourceLocationValue | undefined}>} */
    const featuresMap = new Map();

    for (const e of trace.traceEvents || []) {
      if (e.cat !== 'blink.webdx_feature_usage' || !e.args?.feature) {
        continue;
      }
      const event = /** @type {DXFeatureEvent} */ (e);

      const feature = /** @type {string} */ (event.args.feature);
      if (featuresMap.has(feature)) continue;

      /** @type {LH.Audit.Details.SourceLocationValue | undefined} */
      let source;

      if (event.args.url) {
        const line = event.args.lineNumber ? event.args.lineNumber - 1 : 0;
        const column = event.args.columnNumber ? event.args.columnNumber - 1 : 0;

        source = Audit.makeSourceLocation(event.args.url, line, column);
      }

      featuresMap.set(feature, {
        featureId: feature,
        source,
      });
    }

    const baselineFeatures = Array.from(featuresMap.values());
    const baselineStatus = [];
    const currentDate = new Date;

    for (const feature of baselineFeatures) {
      if (!feature.featureId) {
        continue;
      }

      const featureId = feature.featureId;

      const status = Baseline.getFeatureStatus(featureId, Baseline.featureData, currentDate);
      if (!status) continue;
      const {displayStatus, baselineTier} = status;

      const lowDate = Baseline.getLowDate(featureId, Baseline.featureData) || '';

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
        lowDate,
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const webFeatureHeadings = [
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

    /** @type {Record<string, number>} */
    const TIER_RANKS = {
      limited: 1,
      low: 2,
      high: 3,
    };

    const sortedStatuses = baselineStatus.sort((featureA, featureB) => {
      const rankA = TIER_RANKS[featureA.displayStatus.status] || 4;
      const rankB = TIER_RANKS[featureB.displayStatus.status] || 4;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return featureB.lowDate.localeCompare(featureA.lowDate);
    });

    const hasLimited = baselineStatus.some(item => item.displayStatus.status === 'limited');

    let displayValue;
    if (!hasLimited && sortedStatuses.length > 0) {
      const newestFeature = sortedStatuses[0];
      const featureName = newestFeature.featureId.text;
      const lowDate = newestFeature.lowDate;
      if (lowDate) {
        const year = lowDate.substring(0, 4);
        displayValue = `Baseline ${year} based on ${featureName} (${lowDate})`;
      }
    }

    // Remove `lowDate` property from items before generating details table.
    const tableItems = sortedStatuses.map(item => {
      const {lowDate: _, ...rest} = item;
      return rest;
    });

    const details = Audit.makeTableDetails(webFeatureHeadings, tableItems);

    return {
      score: 1,
      displayValue,
      details,
    };
  }
}

export default Baseline;
export {UIStrings};
