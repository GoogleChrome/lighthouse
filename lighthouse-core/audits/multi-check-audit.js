/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Base class for boolean audits that can have multiple reasons for failure
 */

const Audit = require('./audit.js');

class MultiCheckAudit extends Audit {
  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const multiProduct = await this.audit_(artifacts, context);
    return this.createAuditProduct(multiProduct);
  }

  /**
   * @param {{failures: Array<string>, manifestValues?: LH.Artifacts.ManifestValues}} result
   * @return {LH.Audit.Product}
   */
  static createAuditProduct(result) {
    /** @type {LH.Audit.MultiCheckAuditDetails} */
    const detailsItem = {
      ...result,
      ...result.manifestValues,
      manifestValues: undefined,
      allChecks: undefined,
    };

    if (result.manifestValues && result.manifestValues.allChecks) {
      result.manifestValues.allChecks.forEach(check => {
        detailsItem[check.id] = check.passing;
      });
    }

    // Include the detailed pass/fail checklist as a diagnostic.
    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      // TODO: Consider not nesting detailsItem under `items`.
      items: [detailsItem],
    };

    // If we fail, share the failures
    if (result.failures.length > 0) {
      return {
        score: 0,
        // TODO(#7238): make this i18n-able.
        explanation: `Failures: ${result.failures.join(',\n')}.`,
        details,
      };
    }

    // Otherwise, we pass
    return {
      score: 1,
      details,
    };
  }

  /* eslint-disable no-unused-vars */

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{failures: Array<string>, manifestValues?: LH.Artifacts.ManifestValues}>}
   */
  static audit_(artifacts, context) {
    throw new Error('audit_ unimplemented');
  }

  /* eslint-enable no-unused-vars */
}

module.exports = MultiCheckAudit;
