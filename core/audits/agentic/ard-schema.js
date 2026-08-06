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
  failureTitle: '`ai-catalog.json` schema is invalid or has warnings',
  /** Description of a Lighthouse audit that tells the user why ai-catalog.json must match the ARD specification. */
  description: 'Valid `ai-catalog.json` manifests are required for autonomous ' +
    'AI agents and registries to discover and verify your resources. ' +
    '[Learn more about the ARD specification](https://agenticresourcediscovery.org/spec/).',
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
        explanation: 'Catalog file could not be loaded for schema validation.',
      };
    }

    /** @type {Array<{element: string, issue: string, severity: 'Error' | 'Warning'}>} */
    const issues = [];

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'element', valueType: 'text', label: 'Element'},
      {key: 'issue', valueType: 'text', label: 'Issue'},
      {key: 'severity', valueType: 'text', label: 'Severity'},
    ];

    const tester = new ConformanceTester();
    tester.validate_manifest(ard.content, 'ai-catalog.json');

    for (const msg of tester.errors) {
      let element = 'Root';
      let issue = msg;
      const match = msg.match(/^\[(.*?)\] (.*)/);
      if (match) {
        element = match[1];
        issue = match[2];
      }
      issues.push({element, issue, severity: 'Error'});
    }

    for (const msg of tester.warnings) {
      let element = 'Root';
      let issue = msg;
      const match = msg.match(/^\[(.*?)\] (.*)/);
      if (match) {
        element = match[1];
        issue = match[2];
      }
      issues.push({element, issue, severity: 'Warning'});
    }

    // Lighthouse Best Practice: Recommend representativeQueries for better discoverability
    try {
      const manifest = JSON.parse(ard.content);
      if (manifest && Array.isArray(manifest.entries)) {
        for (let i = 0; i < manifest.entries.length; i++) {
          const entry = manifest.entries[i];
          if (!entry.representativeQueries || entry.representativeQueries.length === 0) {
            const label = entry.displayName || entry.identifier || `Entry #${i}`;
            issues.push({
              element: label,
              issue: 'Missing \'representativeQueries\'. Providing examples ' +
                'significantly improves discoverability.',
              severity: 'Warning',
            });
          }
        }
      }
    } catch (e) {
      // Ignore parse errors as ConformanceTester catches them
    }

    const hasErrors = issues.some(i => i.severity === 'Error');
    const hasWarnings = issues.some(i => i.severity === 'Warning');

    let score = 1;
    if (hasErrors) {
      score = 0;
    } else if (hasWarnings) {
      score = 0.5;
    }

    return {
      score,
      details: issues.length ? Audit.makeTableDetails(headings, issues) : undefined,
    };
  }
}

export default ArdSchema;
export {UIStrings};
