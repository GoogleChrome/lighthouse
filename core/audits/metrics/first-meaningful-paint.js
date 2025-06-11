/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO(COMPAT): This is just a shell. Remove in future breaking release.

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Description of the First Meaningful Paint (FMP) metric, which marks the time at which a majority of the content has been painted by the browser. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'First Meaningful Paint measures when the primary content of a page is ' +
      'visible. [Learn more about the First Meaningful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-meaningful-paint/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class FirstMeaningfulPaint extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'first-meaningful-paint',
      title: str_(i18n.UIStrings.firstMeaningfulPaintMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['navigation'],
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'GatherContext', 'URL'],
    };
  }

  /**
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit() {
    return {
      score: null,
      notApplicable: true,
    };
  }
}

export default FirstMeaningfulPaint;
export {UIStrings};
