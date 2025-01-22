/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {MainResource} from '../computed/main-resource.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates whether the set CSP or XFO header is mitigating clickjacking attacks. "XFO" stands for "X-Frame-Options" and should not be translated. "CSP" stands for "Content-Security-Policy" and should not be translated. "clickjacking" should not be translated. */
  title: 'Mitigate clickjacking with XFO or CSP',
  /** Description of a Lighthouse audit that evaluates whether the set CSP or XFO header is mitigating clickjacking attacks. This is displayed after a user expands the section to see more. "clickjacking" should not be translated. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. "XFO" stands for "X-Frame-Options" and should not be translated. "CSP" stands for "Content-Security-Policy" and should not be translated. */
  description: 'The `X-Frame-Options` (XFO) header or the `frame-ancestors` directive in the `Content-Security-Policy` (CSP) header control where a page can be embedded. These can mitigate clickjacking attacks by blocking some or all sites from embedding the page. [Learn more about mitigating clickjacking](https://developer.chrome.com/docs/lighthouse/best-practices/clickjacking-mitigation).',
  /** Summary text for the results of a Lighthouse audit that evaluates whether the page is mitigating clickjacking attacks with a frame control policy. This text is displayed if the page does not control how it can be embedded on other pages. */
  noClickjackingMitigation: 'No frame control policy found',
  /** Label for a column in a data table; entries will be the severity of an issue with the page's frame control policy. */
  columnSeverity: 'Severity',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ClickjackingMitigation extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'clickjacking-mitigation',
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
   * @return {Promise<{cspHeaders: string[], xfoHeaders: string[]}>}
   */
  static async getRawCspsAndXfo(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const mainResource =
        await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    const cspHeaders = mainResource.responseHeaders
        .filter(h => {
          return h.name.toLowerCase() === 'content-security-policy';
        })
        .flatMap(h => h.value.split(','))
        .filter(rawCsp => rawCsp.replace(/\s/g, ''));
    let xfoHeaders = mainResource.responseHeaders
                         .filter(h => {
                           return h.name.toLowerCase() === 'x-frame-options';
                         })
                         .flatMap(h => h.value);

    // Sanitize the XFO header value.
    xfoHeaders = xfoHeaders.map(v => v.toLowerCase().replace(/\s/g, ''));

    return {cspHeaders, xfoHeaders};
  }

  /**
   * @param {string | undefined} directive
   * @param {LH.IcuMessage | string} findingDescription
   * @param {LH.IcuMessage=} severity
   * @return {LH.Audit.Details.TableItem}
   */
  static findingToTableItem(directive, findingDescription, severity) {
    return {
      description: findingDescription,
      severity,
    };
  }

  /**
   * @param {string[]} cspHeaders
   * @param {string[]} xfoHeaders
   * @return {{score: number, results: LH.Audit.Details.TableItem[]}}
   */
  static constructResults(cspHeaders, xfoHeaders) {
    const allowedDirectives = ['deny', 'sameorigin'];

    // Check for frame-ancestors in CSP.
    for (const cspHeader of cspHeaders) {
      if (cspHeader.includes('frame-ancestors')) {
        // Pass the audit if frame-ancestors is present.
        return {score: 1, results: []};
      }
    }

    for (const actualDirective of xfoHeaders) {
      if (allowedDirectives.includes(actualDirective)) {
        // DENY or SAMEORIGIN are present.
        return {score: 1, results: []};
      }
    }

    return {
      score: 0,
      results: [{
        severity: str_(i18n.UIStrings.itemSeverityHigh),
        description: str_(UIStrings.noClickjackingMitigation),
      }],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {cspHeaders, xfoHeaders} = await this.getRawCspsAndXfo(artifacts, context);
    const {score, results} = this.constructResults(cspHeaders, xfoHeaders);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'description', valueType: 'text', subItemsHeading: {key: 'description'}, label: str_(i18n.UIStrings.columnDescription)},
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

export default ClickjackingMitigation;
export {UIStrings};
