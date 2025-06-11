/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {MainResource} from '../computed/main-resource.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates whether the set CSP header and Trusted Types directive is mitigating DOM-based XSS. "CSP" stands for "Content-Security-Policy" and should not be translated. "XSS" stands for "Cross Site Scripting" and should not be translated. */
  title: 'Mitigate DOM-based XSS with Trusted Types',
  /** Description of a Lighthouse audit that evaluates whether the set CSP header and Trusted Types directive is mitigating DOM-based XSS. This is displayed after a user expands the section to see more. "CSP" stands for "Content-Security-Policy" and should not be translated. "XSS" stands for "Cross Site Scripting" and should not be translated. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'The `require-trusted-types-for` directive in the `Content-Security-Policy` (CSP) header instructs user agents to control the data passed to DOM XSS sink functions. [Learn more about mitigating DOM-based XSS](https://developer.chrome.com/docs/lighthouse/best-practices/TODO).',
  /** Summary text for the results of a Lighthouse audit that evaluates whether the set CSP header and Trusted Types directive is mitigating DOM-based XSS. This text is displayed if the page does not respond with a CSP header and a Trusted Types directive. "CSP" stands for "Content-Security-Policy" and should not be translated. "XSS" stands for "Cross Site Scripting" and should not be translated. */
  noTrustedTypesToMitigateXss: 'No Content-Security-Policy header with Trusted Types directive found',
  /** Label for a column in a data table; entries will be the severity of an issue with the page's CSP and Trusted Types directive. */
  columnSeverity: 'Severity',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TrustedTypesXss extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'trusted-types-xss',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['DevtoolsLog', 'URL'],
      supportedModes: ['navigation'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<string[]>}
   */
  static async getRawCsp(artifacts, context) {
    const devtoolsLog = artifacts.DevtoolsLog;
    const mainResource =
        await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    const cspHeaders = mainResource.responseHeaders
        .filter(h => {
          return h.name.toLowerCase() === 'content-security-policy';
        })
        .flatMap(h => h.value.split(','))
        .filter(rawCsp => rawCsp.replace(/\s/g, ''));

    return cspHeaders;
  }

  /**
   * @param {LH.IcuMessage | string} findingDescription
   * @param {LH.IcuMessage=} severity
   * @return {LH.Audit.Details.TableItem}
   */
  static findingToTableItem(findingDescription, severity) {
    return {
      description: findingDescription,
      severity,
    };
  }

  /**
   * @param {string[]} cspHeaders
   * @return {{score: number, results: LH.Audit.Details.TableItem[]}}
   */
  static constructResults(cspHeaders) {
    // Check for require-trusted-types-for 'script' in CSP.
    for (const cspHeader of cspHeaders) {
      for (const directive of cspHeader.split(';')) {
        if (directive.includes('require-trusted-types-for') &&
            directive.includes('script')) {
          return {score: 1, results: []};
        }
      }
    }

    return {
      score: 0,
      results: [{
        severity: str_(i18n.UIStrings.itemSeverityHigh),
        description: str_(UIStrings.noTrustedTypesToMitigateXss),
      }],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const cspHeaders = await this.getRawCsp(artifacts, context);
    const {score, results} = this.constructResults(cspHeaders);

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

export default TrustedTypesXss;
export {UIStrings};
