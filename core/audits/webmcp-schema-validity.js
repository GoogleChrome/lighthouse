/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates WebMCP schema validity. This descriptive title is shown to users when there are no schema validity issues. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  title: 'WebMCP schemas are valid',
  /** Title of a Lighthouse audit that provides detail on WebMCP schema validity. This descriptive title is shown to users when there are schema validity issues. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  failureTitle: 'WebMCP schemas are invalid',
  /** Description of a Lighthouse audit that tells the user why they should ensure WebMCP schemas are valid. This is displayed after a user expands the section to see more. No character length limits. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  description: 'Valid WebMCP schemas are required for AI agents to ' +
  ' understand and interact with tools correctly. ' +
      'Please fix any errors or warnings reported by the browser.',
  /** Header of the table column which displays the element. */
  columnElement: 'Element',
  /** Header of the table column which displays the issue. */
  columnIssue: 'Issue',
  /** Descriptive reason for why a form fails WebMCP validation due to missing `toolname` attribute. */
  missingToolName: 'Form level `toolname` attribute is missing. Add it to define the tool name.',
  /** Descriptive reason for why a form fails WebMCP validation due to missing `tooldescription` attribute. */
  missingToolDescription: 'Form level `tooldescription` attribute is missing. ' +
  'Add it to describe the tool for AI agents.',
  /** Descriptive reason for why a form field fails WebMCP validation due to missing `name` attribute for a required field. */
  missingRequiredParamName: 'Missing `name` attribute for a required field. ' +
  'Add it to define the parameter name.',
  /** Descriptive reason for why a form field fails WebMCP validation due to missing `name` attribute for an optional field. */
  missingOptionalParamName: 'Missing `name` attribute for an optional field. ' +
  'Add it to define the parameter name.',
  /** Descriptive reason for why a form field fails WebMCP validation due to missing description. */
  missingParamDescription: 'Add a description to make this form more accessible for AI agents.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class WebMcpSchemaValidity extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'webmcp-schema-validity',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['WebMCP', 'WebMcpSchemaIssues'],
      supportedModes: ['navigation', 'snapshot'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    if (!artifacts.WebMCP.isSupported) {
      return {
        notApplicable: true,
        score: 1,
      };
    }

    /** @enum {number} */
    const Severity = {
      ERROR: 1,
      WARNING: 2,
    };

    /** @type {Record<string, {severity: Severity, description: LH.IcuMessage}>} */
    const issueConfigs = {
      'FormModelContextMissingToolName': {
        severity: Severity.ERROR,
        description: str_(UIStrings.missingToolName),
      },
      'FormModelContextMissingToolDescription': {
        severity: Severity.ERROR,
        description: str_(UIStrings.missingToolDescription),
      },
      'FormModelContextRequiredParameterMissingName': {
        severity: Severity.ERROR,
        description: str_(UIStrings.missingRequiredParamName),
      },
      'FormModelContextParameterMissingTitleAndDescription': {
        severity: Severity.WARNING,
        description: str_(UIStrings.missingParamDescription),
      },
      'FormModelContextParameterMissingName': {
        severity: Severity.WARNING,
        description: str_(UIStrings.missingOptionalParamName),
      },
    };

    const rawIssues = artifacts.WebMcpSchemaIssues;

    const uniqueIssues = [
      ...new Map(
      rawIssues.map(issue => [`${issue.violatingNodeId}_${issue.errorType}`, issue])
      ).values(),
    ];
    const sortedUniqueIssues = uniqueIssues.sort((a, b) => {
      return (issueConfigs[a.errorType]?.severity || Severity.ERROR) -
      (issueConfigs[b.errorType]?.severity || Severity.ERROR);
    });
    const items = sortedUniqueIssues.map(issue => {
      return {
        element: issue.nodeDetails ? Audit.makeNodeItem(issue.nodeDetails) : undefined,
        issue: issueConfigs[issue.errorType]?.description || '',
      };
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'element', valueType: 'node', label: str_(UIStrings.columnElement)},
      {key: 'issue', valueType: 'text', label: str_(UIStrings.columnIssue)},
    ];

    const details = Audit.makeTableDetails(headings, items);

    const hasErrors =
    sortedUniqueIssues.some(issue => issueConfigs[issue.errorType]?.severity === Severity.ERROR);

    if ((artifacts.WebMCP.tools?.length || 0) === 0 && rawIssues.length === 0) {
      return {
        notApplicable: true,
        score: 1,
      };
    }

    return {
      score: hasErrors ? 0 : (items.length > 0 ? 0.5 : 1),
      details: items.length > 0 ? details : undefined,
    };
  }
}

export default WebMcpSchemaValidity;
export {UIStrings};
