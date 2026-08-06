/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit that validates ai-catalog.json manifests against the Agentic Resource Discovery (ARD) specification.
 *
 * This implementation is a direct JavaScript port of `validate_manifest` from the official ARD Conformance Test suite:
 * @see https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test
 * @see https://agenticresourcediscovery.org/spec/
 * @version ARD Spec 1.0 / ADR-0003
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {ConformanceTester} from '../../../third-party/ard/ard.js';

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates whether ai-catalog.json conforms to the ARD specification. Shown when valid. */
  title: '`ai-catalog.json` schema is valid',
  /** Title of a Lighthouse audit that evaluates whether ai-catalog.json conforms to the ARD specification. Shown when invalid. */
  failureTitle: '`ai-catalog.json` schema is invalid',
  /** Description of a Lighthouse audit that tells the user why ai-catalog.json must match the ARD specification. */
  description: 'Valid `ai-catalog.json` manifests are required for autonomous ' +
    'AI agents and registries to discover and verify your resources. ' +
    '[Learn more about the ARD specification](https://agenticresourcediscovery.org/spec/).',
  /** Explanatory message stating that ai-catalog.json could not be loaded for schema validation. */
  explanation: 'Catalog file could not be loaded for schema validation.',
  /** Header of the table column which displays the issue. */
  columnIssue: 'Issue',
  /** Header of the table column which displays the severity. */
  columnSeverity: 'Severity',
  /** Table item value for an error severity. */
  itemSeverityError: 'Error',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ArdSchema extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'ard-schema',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['AgentResourceDiscovery'],
      supportedModes: ['navigation', 'snapshot'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const ard = artifacts.AgentResourceDiscovery;
    const signals = ard.discoverySignals;

    const hasExplicitSignal = Boolean(
      signals.robotsTxtAgentmap ||
      signals.htmlLink ||
      signals.httpHeaderLink
    );
    const hasCatalog = hasExplicitSignal || ard.status === 200;

    if (!hasCatalog) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    if (ard.status !== 200 || !ard.content) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
      };
    }

    const itemSeverityError = str_(UIStrings.itemSeverityError);
    const itemSeverityLow = str_(i18n.UIStrings.itemSeverityLow);

    /** @type {Array<{element: string, issue: string | LH.IcuMessage, severity: LH.IcuMessage}>} */
    const issues = [];

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'element', valueType: 'text', label: str_(i18n.UIStrings.columnElement)},
      {key: 'issue', valueType: 'text', label: str_(UIStrings.columnIssue)},
      {key: 'severity', valueType: 'text', label: str_(UIStrings.columnSeverity)},
    ];

    const tester = new ConformanceTester();
    tester.validate_manifest(ard.content, 'ai-catalog.json');

    for (const err of tester.errors) {
      issues.push({
        element: err.element,
        issue: err.message,
        severity: itemSeverityError,
      });
    }

    for (const warn of tester.warnings) {
      issues.push({
        element: warn.element,
        issue: warn.message,
        severity: itemSeverityLow,
      });
    }

    const hasErrors = issues.some(i => i.severity === itemSeverityError);
    const hasLowSeverity = issues.some(i => i.severity === itemSeverityLow);

    let score = 1;
    if (hasErrors) {
      score = 0;
    } else if (hasLowSeverity) {
      score = 0.9;
    }

    return {
      score,
      details: issues.length ? Audit.makeTableDetails(headings, issues) : undefined,
    };
  }
}

export default ArdSchema;
export {UIStrings};
