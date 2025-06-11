/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audits/audit.js';

/**
 * Clamp figure to 2 decimal places
 * @param {number} val
 * @return {number}
 */
const clampTo2Decimals = val => Math.round(val * 100) / 100;

class ReportScoring {
  /**
   * Computes the weighted-average of the score of the list of items.
   * @param {Array<{score: number|null, weight: number}>} items
   * @return {number|null}
   */
  static arithmeticMean(items) {
    // Filter down to just the items with a weight as they have no effect on score
    items = items.filter(item => item.weight > 0);
    // If there is 1 null score, return a null average
    if (items.some(item => item.score === null)) return null;

    const results = items.reduce(
      (result, item) => {
        const score = item.score;
        const weight = item.weight;

        return {
          weight: result.weight + weight,
          sum: result.sum + /** @type {number} */ (score) * weight,
        };
      },
      {weight: 0, sum: 0}
    );

    return clampTo2Decimals(results.sum / results.weight || 0);
  }

  /**
   * Returns the report JSON object with computed scores.
   * @param {Object<string, LH.Config.Category>} configCategories
   * @param {Object<string, LH.RawIcu<LH.Audit.Result>>} resultsByAuditId
   * @return {Object<string, LH.RawIcu<LH.Result.Category>>}
   */
  static scoreAllCategories(configCategories, resultsByAuditId) {
    /** @type {Record<string, LH.RawIcu<LH.Result.Category>>} */
    const scoredCategories = {};

    for (const [categoryId, configCategory] of Object.entries(configCategories)) {
      // Copy category audit members
      const auditRefs = configCategory.auditRefs.map(configMember => {
        const member = {...configMember};

        // If a result was not applicable, meaning its checks did not run against anything on
        // the page, force it's weight to 0. It will not count during the arithmeticMean() but
        // will still be included in the final report json and displayed in the report as
        // "Not Applicable".
        const result = resultsByAuditId[member.id];
        if (result.scoreDisplayMode === Audit.SCORING_MODES.NOT_APPLICABLE ||
            result.scoreDisplayMode === Audit.SCORING_MODES.INFORMATIVE ||
            result.scoreDisplayMode === Audit.SCORING_MODES.MANUAL) {
          member.weight = 0;
        }

        return member;
      });

      const scores = auditRefs.map(auditRef => ({
        score: resultsByAuditId[auditRef.id].score,
        weight: auditRef.weight,
      }));
      const score = ReportScoring.arithmeticMean(scores);

      scoredCategories[categoryId] = {
        ...configCategory,
        auditRefs,
        id: categoryId,
        score,
      };
    }

    return scoredCategories;
  }
}

export {ReportScoring};
