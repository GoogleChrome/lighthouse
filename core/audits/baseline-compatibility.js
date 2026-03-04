/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {getFeatureStatus} from '../lib/baseline/baseline-features.js';

const UIStrings = {
  /** Title of the Baseline Compatibility audit. Shown when the page is compatible with the target baseline. */
  title: 'Baseline Compatibility',
  /** Description of the Baseline Compatibility audit. */
  description:
    'Checks if WebDX features used on the page are compatible with your target Baseline. ' +
    '[Learn more about Baseline](https://webstatus.dev/).',
  /** Label for the column displaying the feature ID. */
  columnFeature: 'WebDX Feature',
  /** Label for the column displaying the feature\'s baseline status. */
  columnStatus: 'Baseline Status',
  /** Label for the column displaying the line of code using the feature. */
  columnLine: 'Line',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class BaselineCompatibility extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'baseline-compatibility',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Trace'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const trace = artifacts.Trace;

    const baselineFeatures =
      /** @type {any} */ (trace).BaselineFeatureArtifact || [];

    const baselineStatus = [];

    for (const feature of baselineFeatures) {
      if (!feature.featureId) {
        continue;
      }

      const featureData = getFeatureStatus(feature.featureId);

      if (!featureData) {
        continue;
      }

      let displayStatus = 'Limited Availability';

      if (featureData.status === 'high') {
        displayStatus = `Widely Available (${featureData.baseline_high_date})`;
      } else if (featureData.status === 'low') {
        displayStatus = `Newly Available (${featureData.baseline_low_date})`;
      } else {
        displayStatus = 'Limited Availability';
      }

      baselineStatus.push({
        featureId: {
          type: /** @type {const} */ ('link'),
          text: feature.featureId,
          url: `https://webstatus.dev/features/${feature.featureId}`,
        },
        displayStatus,
        source:
          feature.source && feature.line
            ? Audit.makeSourceLocation(feature.source, feature.line, 0)
            : 'Unknown',
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
        valueType: 'text',
        label: str_(UIStrings.columnStatus),
      },
      {
        key: 'source',
        valueType: 'source-location',
        label: str_(i18n.UIStrings.columnSource),
      },
    ];

    const details = Audit.makeTableDetails(headings, baselineStatus);

    return {
      score: baselineStatus.length === 0 ? 1 : 0,
      details,
    };
  }
}

export default BaselineCompatibility;
export {UIStrings};
