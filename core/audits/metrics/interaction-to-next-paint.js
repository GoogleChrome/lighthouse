/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import {Responsiveness as ComputedResponsivenes} from '../../computed/metrics/responsiveness.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Description of the Interaction to Next Paint metric. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Interaction to Next Paint measures page responsiveness, how long it ' +
               'takes the page to visibly respond to user input. ' +
               '[Learn more about the Interaction to Next Paint metric](https://web.dev/articles/inp).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @fileoverview This metric gives a high-percentile measure of responsiveness to input.
 */
class InteractionToNextPaint extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'interaction-to-next-paint',
      title: str_(i18n.UIStrings.interactionToNextPaint),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['timespan'],
      requiredArtifacts: ['Trace'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // https://web.dev/articles/inp
      // This is using the same threshold as field tools since only supported in
      // unsimulated user flows for now.
      // see https://www.desmos.com/calculator/4xtrhg51th
      p10: 200,
      median: 500,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {settings} = context;
    // TODO: responsiveness isn't yet supported by lantern.
    if (settings.throttlingMethod === 'simulate') {
      return {score: null, notApplicable: true};
    }

    const trace = artifacts.Trace;
    const metricData = {trace, settings};
    const interactionEvent = await ComputedResponsivenes.request(metricData, context);

    // TODO: include the no-interaction state in the report instead of using n/a.
    if (interactionEvent === null) {
      return {score: null, notApplicable: true};
    }

    const timing = interactionEvent.args.data.duration;

    return {
      score: Audit.computeLogNormalScore({p10: context.options.p10, median: context.options.median},
        timing),
      numericValue: timing,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: timing}),
    };
  }
}

export default InteractionToNextPaint;
export {UIStrings};
