/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to see if it is requesting the geolocation API on
 * page load. This is often a sign of poor user experience because it lacks context.
 */


import ViolationAudit from '../violation-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on geolocation permission requests while the page is loading. This descriptive title is shown to users when the page does not ask for geolocation permissions on load. */
  title: 'Avoids requesting the geolocation permission on page load',
  /** Title of a Lighthouse audit that provides detail on geolocation permissions requests. This descriptive title is shown to users when the page does ask for geolocation permissions on load. */
  failureTitle: 'Requests the geolocation permission on page load',
  /** Description of a Lighthouse audit that tells the user why they should not ask for geolocation permissions on load. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Users are mistrustful of or confused by sites that request their ' +
    'location without context. Consider tying the request to a user action instead. ' +
    '[Learn more about the geolocation permission](https://developer.chrome.com/docs/lighthouse/best-practices/geolocation-on-start/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class GeolocationOnStart extends ViolationAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'geolocation-on-start',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['ConsoleMessages', 'SourceMaps', 'Scripts'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    // 'Only request geolocation information in response to a user gesture.'
    const results = await ViolationAudit.getViolationResults(artifacts, context, /geolocation/);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
    ];
    // TODO(bckenny): there should actually be a ts error here. results[0].stackTrace
    // should violate the results type. Shouldn't be removed from details items regardless.
    const details = ViolationAudit.makeTableDetails(headings, results);

    return {
      score: Number(results.length === 0),
      details,
    };
  }
}

export default GeolocationOnStart;
export {UIStrings};
