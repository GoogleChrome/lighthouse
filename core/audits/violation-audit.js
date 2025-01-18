/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {JSBundles} from '../computed/js-bundles.js';

class ViolationAudit extends Audit {
  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @param {RegExp} pattern
   * @return {Promise<Array<{source: LH.Audit.Details.SourceLocationValue}>>}
   */
  static async getViolationResults(artifacts, context, pattern) {
    const bundles = await JSBundles.request(artifacts, context);

    /**
     * @template T
     * @param {T} value
     * @return {value is Exclude<T, undefined>}
     */
    function filterUndefined(value) {
      return value !== undefined;
    }

    const seen = new Set();
    return artifacts.ConsoleMessages
        .filter(entry => entry.url && entry.source === 'violation' && pattern.test(entry.text))
        .map(entry => {
          const bundle = bundles.find(bundle => bundle.script.scriptId === entry.scriptId);
          return Audit.makeSourceLocationFromConsoleMessage(entry, bundle);
        })
        .filter(filterUndefined)
        .filter(source => {
          // Filter out duplicate entries since they are not differentiable to the user
          // @see https://github.com/GoogleChrome/lighthouse/issues/5218
          const key = `${source.url}!${source.line}!${source.column}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(source => ({source}));
  }
}

export default ViolationAudit;
