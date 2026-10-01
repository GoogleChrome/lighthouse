/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit that validates a site's Agentic Resource Discovery (ARD) manifest.
 *
 * Validation itself is done by `third-party/ard/ard.js`, a port of `validate_manifest` from the
 * official ARD conformance test (see that directory's README for the pinned upstream commit).
 * This audit maps its errors and warnings onto a score, and adds discovery-related items the
 * conformance test reports in its publisher-resolution mode.
 * @see https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test
 * @see https://agenticresourcediscovery.org/spec/
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {ConformanceTester} from '../../../third-party/ard/ard.js';

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates whether the site's Agentic Resource Discovery (ARD) manifest conforms to the ARD specification. Shown when valid. "ARD" should not be translated. */
  title: 'ARD manifest is valid',
  /** Title of a Lighthouse audit that evaluates whether the site's Agentic Resource Discovery (ARD) manifest conforms to the ARD specification. Shown when invalid. "ARD" should not be translated. */
  failureTitle: 'ARD manifest is invalid',
  /** Description of a Lighthouse audit that tells the user why their Agentic Resource Discovery (ARD) manifest must match the ARD specification. "ARD", "/.well-known/ard.json" and "rel="ard"" should not be translated. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'A valid Agentic Resource Discovery (ARD) manifest, served at ' +
    '`/.well-known/ard.json` or linked with `rel="ard"`, lets AI agents and registries ' +
    'discover and verify your resources. ' +
    '[Learn more about the ARD specification](https://agenticresourcediscovery.org/spec/).',
  /** Explanatory message stating that the Agentic Resource Discovery (ARD) manifest could not be loaded for schema validation. "ARD" should not be translated. */
  explanation: 'ARD manifest could not be loaded for schema validation.',
  /** Table item describing that the Agentic Resource Discovery (ARD) manifest was only found using older, predecessor discovery names that AI agents are not required to check. "ARD", "/.well-known/ai-catalog.json", "rel="ai-catalog"", "/.well-known/ard.json" and "rel="ard"" should not be translated. */
  legacyDiscovery: 'Manifest was only found through a predecessor name ' +
    '(`/.well-known/ai-catalog.json` or `rel="ai-catalog"`). ARD consumers are not ' +
    'required to check these, so your resources may not be discovered. Serve the manifest ' +
    'at `/.well-known/ard.json` or link it with `rel="ard"`.',
  /**
   * @description Table item describing that a location the site advertises for its Agentic Resource Discovery (ARD) manifest (for example, a link on the page) returned an unsuccessful HTTP status code. "ARD" should not be translated.
   * @example {404} statusCode
   */
  sourceUnavailable: 'Advertised ARD manifest location could not be loaded ' +
    '(HTTP status {statusCode}).',
  /** Table item describing that a location the site advertises for its Agentic Resource Discovery (ARD) manifest (for example, a link on the page) could not be fetched at all. "ARD" should not be translated. */
  sourceFetchFailed: 'Advertised ARD manifest location could not be loaded.',
  /** Header of the table column which displays the issue. */
  columnIssue: 'Issue',
  /** Header of the table column which displays the severity. */
  columnSeverity: 'Severity',
  /** Table item value for an error severity. */
  itemSeverityError: 'Error',
};

/** @type {Set<LH.Artifacts.ArdDiscoverySource>} */
const LEGACY_SOURCES = new Set(['legacyHtmlLink', 'legacyHttpHeaderLink', 'legacyWellKnown']);

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
   * @param {LH.Artifacts['AgentResourceDiscovery']['failedSources'][number]} failedSource
   * @param {LH.IcuMessage} severity
   * @return {{element: string, issue: LH.IcuMessage, severity: LH.IcuMessage}}
   */
  static makeFailedSourceItem({url, status}, severity) {
    const issue = status === null ?
      str_(UIStrings.sourceFetchFailed) :
      str_(UIStrings.sourceUnavailable, {statusCode: status});
    return {element: url, issue, severity};
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
      signals.httpHeaderLink ||
      signals.legacyHtmlLink ||
      signals.legacyHttpHeaderLink
    );
    const hasCatalog = hasExplicitSignal || ard.status === 200;

    if (!hasCatalog) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const itemSeverityError = str_(UIStrings.itemSeverityError);
    const itemSeverityLow = str_(i18n.UIStrings.itemSeverityLow);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'element', valueType: 'text', label: str_(i18n.UIStrings.columnElement)},
      {key: 'issue', valueType: 'text', label: str_(UIStrings.columnIssue)},
      {key: 'severity', valueType: 'text', label: str_(UIStrings.columnSeverity)},
    ];

    if (ard.status !== 200 || !ard.content) {
      const failedItems = ard.failedSources.map(source =>
        ArdSchema.makeFailedSourceItem(source, itemSeverityError));
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
        details: failedItems.length ? Audit.makeTableDetails(headings, failedItems) : undefined,
      };
    }

    /** @type {Array<{element: string, issue: string | LH.IcuMessage, severity: LH.IcuMessage}>} */
    const issues = [];

    const tester = new ConformanceTester();
    tester.validate_manifest(ard.content, ard.catalogUrl);

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

    for (const failedSource of ard.failedSources) {
      issues.push(ArdSchema.makeFailedSourceItem(failedSource, itemSeverityLow));
    }

    if (LEGACY_SOURCES.has(ard.discoverySource)) {
      issues.push({
        element: ard.catalogUrl,
        issue: str_(UIStrings.legacyDiscovery),
        severity: itemSeverityLow,
      });
    }

    const hasErrors = tester.errors.length > 0;
    const score = hasErrors ? 0 : (issues.length ? 0.9 : 1);

    return {
      score,
      details: issues.length ? Audit.makeTableDetails(headings, issues) : undefined,
    };
  }
}

export default ArdSchema;
export {UIStrings};
