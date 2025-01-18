/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit a page to see if it's using document.write(). document.write() has terrible performance characteristics.
 *
 * *Intervention*
 * There is a Chrome intervention for the API: https://developers.google.com/web/updates/2016/08/removing-document-write
 * The intervention appears to only be enabled when the user is on a slow connnection. https://chromestatus.com/features#document.write
 * When it's enabled, _some_ calls to document.write() will just not do anything. They're just no-ops.
 *  - "some" == mostly third-party situations. src: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/script/document_write_intervention.cc?l=109&rcl=61a806621861e9abc07b3a57a6f2edae188d1742
 * If this happens, there will be an error message in the console. src: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/script/document_write_intervention.cc?l=51-61&rcl=61a806621861e9abc07b3a57a6f2edae188d1742
 *  - Lighthouse doesn't report here on that situation, though it'll show up in `errors-in-console`
 * The intervention may also not block the .write() (because the connection wasn't slow),
 * but it will emit a console warning.
 *  - Lighthouse will also report that here, as the .write() call succeeded.
 * Demo URL: https://output.jsbin.com/qopijux/quiet
 *
 * *This Audit*
 * This audit reports on document.write() calls which the intervention didn't stop.
 * (They worked as intended). If that happens, the browser emits a verbose-level violation
 * console message (hidden by default) that says:
 *     "Parser was blocked due to document.write(<script>)". src: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/frame/performance_monitor.cc?l=294-300&rcl=40b90cafad9f219e0845879ed8648bdcc96116dc
 */


import ViolationAudit from '../violation-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the page's use of the `document.write` API. This descriptive title is shown to users when the page does not use `document.write`. */
  title: 'Avoids `document.write()`',
  /** Title of a Lighthouse audit that provides detail on the page's use of the `document.write` API. This imperative title is shown to users when the page does use `document.write`. */
  failureTitle: 'Avoid `document.write()`',
  /** Description of a Lighthouse audit that tells the user why they should avoid `document.write`. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'For users on slow connections, external scripts dynamically injected via ' +
      '`document.write()` can delay page load by tens of seconds. ' +
      '[Learn how to avoid document.write()](https://developer.chrome.com/docs/lighthouse/best-practices/no-document-write/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NoDocWriteAudit extends ViolationAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'no-document-write',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      guidanceLevel: 2,
      requiredArtifacts: ['ConsoleMessages', 'SourceMaps', 'Scripts'],
      scoreDisplayMode: ViolationAudit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const results =
      await ViolationAudit.getViolationResults(artifacts, context, /document\.write/);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
    ];
    // TODO(bckenny): see TODO in geolocation-on-start
    const details = ViolationAudit.makeTableDetails(headings, results);

    return {
      score: Number(results.length === 0),
      details,
    };
  }
}

export default NoDocWriteAudit;
export {UIStrings};
