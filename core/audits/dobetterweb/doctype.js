/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {ProcessedTrace} from '../../computed/processed-trace.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the doctype of a page. This descriptive title is shown to users when the pages's doctype is set to HTML. */
  title: 'Page has the HTML doctype',
  /** Title of a Lighthouse audit that provides detail on the doctype of a page. This descriptive title is shown to users when the page's doctype is not set to HTML. */
  failureTitle: 'Page lacks the HTML doctype, thus triggering quirks-mode',
  /** Description of a Lighthouse audit that tells the user why they should define an HTML doctype. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Specifying a doctype prevents the browser ' +
    'from switching to quirks-mode. ' +
    '[Learn more about the doctype declaration](https://developer.chrome.com/docs/lighthouse/best-practices/doctype/).',
  /** Explanatory message stating that the document has no doctype. */
  explanationNoDoctype: 'Document must contain a doctype',
  /** Explanatory message stating that the document has wrong doctype that triggers `quirks-mode` */
  explanationWrongDoctype: 'Document contains a `doctype` that triggers `quirks-mode`',
  /** Explanatory message stating that the document has wrong doctype that triggers `limited-quirks-mode` */
  explanationLimitedQuirks: 'Document contains a `doctype` that triggers `limited-quirks-mode`',
  /** Explanatory message stating that the publicId field is not empty. */
  explanationPublicId: 'Expected publicId to be an empty string',
  /** Explanatory message stating that the systemId field is not empty. */
  explanationSystemId: 'Expected systemId to be an empty string',
  /** Explanatory message stating that the doctype is set, but is not "html" and is therefore invalid. */
  explanationBadDoctype: 'Doctype name must be the string `html`',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class Doctype extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'doctype',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Doctype'],
      __internalOptionalArtifacts: ['InspectorIssues', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    if (!artifacts.Doctype) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationNoDoctype),
      };
    }

    // only set constants once we know there is a doctype
    const doctypeName = artifacts.Doctype.name;
    const doctypePublicId = artifacts.Doctype.publicId;
    const doctypeSystemId = artifacts.Doctype.systemId;
    const compatMode = artifacts.Doctype.documentCompatMode;

    const trace = artifacts.traces?.[Audit.DEFAULT_PASS];

    /** @type {LH.Crdp.Audits.QuirksModeIssueDetails[]} */
    let quirksModeIssues = [];
    if (trace && artifacts.InspectorIssues) {
      const processedTrace = await ProcessedTrace.request(trace, context);
      const mainFrameId = processedTrace.mainFrameInfo.frameId;
      quirksModeIssues =
        artifacts.InspectorIssues.quirksModeIssue.filter(issue => issue.frameId === mainFrameId);
    }

    // Can only determine limited quirks mode with some helps from the protocol via
    // inspector issues. But cannot get inspector issues in snapshot mode, so in that
    // case we cannot distinguish no-quirks-mode from limited-quirks-mode.
    const isLimitedQuirksMode = quirksModeIssues.some(issue => issue.isLimitedQuirksMode);

    if (compatMode === 'CSS1Compat' && !isLimitedQuirksMode) {
      return {
        score: 1,
      };
    }

    if (isLimitedQuirksMode) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationLimitedQuirks),
      };
    }

    if (doctypePublicId !== '') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationPublicId),
      };
    }

    if (doctypeSystemId !== '') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationSystemId),
      };
    }

    /* Note that the casing of this property is normalized to be lowercase.
       see: https://html.spec.whatwg.org/#doctype-name-state */
    if (doctypeName !== 'html') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationBadDoctype),
      };
    }

    // Catch-all for any quirks-mode situations the above checks didn't get.
    // https://github.com/GoogleChrome/lighthouse/issues/10030
    return {
      score: 0,
      explanation: str_(UIStrings.explanationWrongDoctype),
    };
  }
}

export default Doctype;
export {UIStrings};
