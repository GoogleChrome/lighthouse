/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {MainResource} from '../computed/main-resource.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates the security of a page's HSTS header. "HSTS" stands for "HTTP Strict Transport Security". */
  title: 'Use a strong HSTS policy',
  /** Description of a Lighthouse audit that evaluates the security of a page's HSTS header. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. "HSTS" stands for "HTTP Strict Transport Security". */
  description: 'Deployment of the HSTS header significantly ' +
    'reduces the risk of downgrading HTTP connections and eavesdropping attacks. ' +
    'A rollout in stages, starting with a low max-age is recommended. ' +
    '[Learn more about using a strong HSTS policy.](https://developer.chrome.com/docs/lighthouse/best-practices/has-hsts)',
  /** Summary text for the results of a Lighthouse audit that evaluates the HSTS header. This is displayed if no HSTS header is deployed. "HSTS" stands for "HTTP Strict Transport Security". */
  noHsts: 'No HSTS header found',
  /** Summary text for the results of a Lighthouse audit that evaluates the HSTS header. This is displayed if the preload directive is missing. "HSTS" stands for "HTTP Strict Transport Security". */
  noPreload: 'No `preload` directive found',
  /** Summary text for the results of a Lighthouse audit that evaluates the HSTS header. This is displayed if the includeSubDomains directive is missing. "HSTS" stands for "HTTP Strict Transport Security". */
  noSubdomain: 'No `includeSubDomains` directive found',
  /** Summary text for the results of a Lighthouse audit that evaluates the HSTS header. This is displayed if the max-age directive is missing. "HSTS" stands for "HTTP Strict Transport Security". */
  noMaxAge: 'No `max-age` directive',
  /** Summary text for the results of a Lighthouse audit that evaluates the HSTS header. This is displayed if the provided duration for the max-age directive is too low. "HSTS" stands for "HTTP Strict Transport Security". */
  lowMaxAge: '`max-age` is too low',
  /** Table item value calling out the presence of a syntax error. */
  invalidSyntax: 'Invalid syntax',
  /** Label for a column in a data table; entries will be a directive of the HSTS header. "HSTS" stands for "HTTP Strict Transport Security". */
  columnDirective: 'Directive',
  /** Label for a column in a data table; entries will be the severity of an issue with the HSTS header. "HSTS" stands for "HTTP Strict Transport Security". */
  columnSeverity: 'Severity',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class HasHsts extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'has-hsts',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs', 'URL'],
      supportedModes: ['navigation'],
    };
  }


  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<string[]>}
   */
  static async getRawHsts(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const mainResource =
        await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    let hstsHeaders =
        mainResource.responseHeaders
            .filter(h => {
              return h.name.toLowerCase() === 'strict-transport-security';
            })
            .flatMap(h => h.value.split(';'));

    // Sanitize the header value / directives.
    hstsHeaders = hstsHeaders.map(v => v.toLowerCase().replace(/\s/g, ''));

    return hstsHeaders;
  }

  /**
   * @param {string} hstsDirective
   * @param {LH.IcuMessage | string} findingDescription
   * @param {LH.IcuMessage=} severity
   * @return {LH.Audit.Details.TableItem}
   */
  static findingToTableItem(hstsDirective, findingDescription, severity) {
    return {
      directive: hstsDirective,
      description: findingDescription,
      severity,
    };
  }

  /**
   * @param {string[]} hstsHeaders
   * @return {{score: number, results: LH.Audit.Details.TableItem[]}}
   */
  static constructResults(hstsHeaders) {
    const rawHsts = [...hstsHeaders];
    const allowedDirectives = ['max-age', 'includesubdomains', 'preload'];
    const violations = [];
    const warnings = [];
    const syntax = [];

    if (!rawHsts.length) {
      return {
        score: 0,
        results: [{
          severity: str_(i18n.UIStrings.itemSeverityHigh),
          description: str_(UIStrings.noHsts),
          directive: undefined,
        }],
      };
    }

    // No max-age is a violation and renders the HSTS header useless.
    if (!hstsHeaders.toString().includes('max-age')) {
      violations.push({
        severity: str_(i18n.UIStrings.itemSeverityHigh),
        description: str_(UIStrings.noMaxAge),
        directive: 'max-age',
      });
    }

    if (!hstsHeaders.toString().includes('includesubdomains')) {
      // No includeSubdomains might be even wanted. But would be preferred.
      warnings.push({
        severity: str_(i18n.UIStrings.itemSeverityMedium),
        description: str_(UIStrings.noSubdomain),
        directive: 'includeSubDomains',
      });
    }

    if (!hstsHeaders.toString().includes('preload')) {
      // No preload might be even wanted. But would be preferred.
      warnings.push({
        severity: str_(i18n.UIStrings.itemSeverityMedium),
        description: str_(UIStrings.noPreload),
        directive: 'preload',
      });
    }

    for (const actualDirective of hstsHeaders) {
      // We recommend 2y max-age. But if it's lower than 1y, it's a violation.
      if (actualDirective.includes('max-age') &&
          parseInt(actualDirective.split('=')[1], 10) < 31536000) {
        violations.push({
          severity: str_(i18n.UIStrings.itemSeverityHigh),
          description: str_(UIStrings.lowMaxAge),
          directive: 'max-age',
        });
      }

      // If there is a directive that's not an official HSTS directive.
      if (!allowedDirectives.includes(actualDirective) &&
          !actualDirective.includes('max-age')) {
        syntax.push({
          severity: str_(i18n.UIStrings.itemSeverityLow),
          description: str_(UIStrings.invalidSyntax),
          directive: actualDirective,
        });
      }
    }

    const results = [
      ...violations.map(
          f => this.findingToTableItem(
              f.directive, f.description,
              str_(i18n.UIStrings.itemSeverityHigh))),
      ...warnings.map(
          f => this.findingToTableItem(
              f.directive, f.description,
              str_(i18n.UIStrings.itemSeverityMedium))),
      ...syntax.map(
          f => this.findingToTableItem(
              f.directive, f.description,
              str_(i18n.UIStrings.itemSeverityLow))),
    ];
    return {score: violations.length || syntax.length ? 0 : 1, results};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const hstsHeaders = await this.getRawHsts(artifacts, context);
    const {score, results} = this.constructResults(hstsHeaders);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'description', valueType: 'text', subItemsHeading: {key: 'description'}, label: str_(i18n.UIStrings.columnDescription)},
      {key: 'directive', valueType: 'code', subItemsHeading: {key: 'directive'}, label: str_(UIStrings.columnDirective)},
      {key: 'severity', valueType: 'text', subItemsHeading: {key: 'severity'}, label: str_(UIStrings.columnSeverity)},
      /* eslint-enable max-len */
    ];
    const details = Audit.makeTableDetails(headings, results);

    return {
      score,
      notApplicable: !results.length,
      details,
    };
  }
}

export default HasHsts;
export {UIStrings};
