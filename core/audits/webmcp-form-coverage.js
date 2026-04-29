/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that lists forms found in the page for WebMCP coverage. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  title: 'WebMCP form coverage',
  /** Description of a Lighthouse audit that lists forms found in the page and indicates whether they have WebMCP declarative tool annotations. This is displayed after a user expands the section to see more. No character length limits. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  description: 'Consider adding WebMCP annotations to the forms listed below. This helps AI ' +
  'agents identify and interact with these forms more reliably.', // TODO: add a learn more link once available
  /** [ICU Syntax] Label for the audit identifying the number of forms missing annotations. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  displayValue: `{itemCount, plural,
    =1 {1 form missing annotations}
    other {# forms missing annotations}
    }`,
  /** Label for a column in a data table; entries will be the form element found on the page. */
  columnForm: 'Form',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class WebMcpFormCoverage extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'webmcp-form-coverage',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Inputs', 'WebMCP'],
      supportedModes: ['navigation', 'snapshot'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const forms = artifacts.Inputs.forms;
    if (forms.length === 0 || !artifacts.WebMCP.isSupported) {
      return {
        notApplicable: true,
        score: 1,
      };
    }
    const withoutTools = [];

    for (const form of forms) {
      const hasToolName = !!form.webMcpToolname;
      const hasToolDescription = !!form.webMcpTooldescription;

      if (!hasToolName && !hasToolDescription) {
        withoutTools.push({
          node: Audit.makeNodeItem(form.node),
        });
      }
    }

    if (withoutTools.length === 0) {
      return {
        notApplicable: true,
        score: 1,
      };
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: str_(UIStrings.columnForm)},
    ];

    const details = Audit.makeTableDetails(headings, withoutTools);

    return {
      score: 1,
      displayValue: str_(UIStrings.displayValue, {itemCount: withoutTools.length}),
      details,
    };
  }
}

export default WebMcpFormCoverage;
export {UIStrings};
