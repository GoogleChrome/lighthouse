/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const URL = require('../lib/url-shim.js');
const NetworkRecords = require('../computed/network-records.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the useage of HTTPS on a page. This descriptive title is shown to users when all requests on a page are fufilled using HTTPS. */
  title: 'Uses HTTPS',
  /** Title of a Lighthouse audit that provides detail on the useage of HTTPS on a page. This descriptive title is shown to users when some, or all, requests on the page use HTTP instead of HTTPS. */
  failureTitle: 'Does not use HTTPS',
  /** Description of a Lighthouse audit that tells the user *why* HTTPS use *for all resources* is important. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'All sites should be protected with HTTPS, even ones that don\'t handle ' +
      'sensitive data. This includes avoiding [mixed content](https://developers.google.com/web/fundamentals/security/prevent-mixed-content/what-is-mixed-content), ' +
      'where some resources are loaded over HTTP despite the initial request being served' +
      'over HTTPS. HTTPS prevents intruders from tampering with or passively listening ' +
      'in on the communications between your app and your users, and is a prerequisite for ' +
      'HTTP/2 and many new web platform APIs. ' +
      '[Learn more](https://web.dev/is-on-https).',
  /** [ICU Syntax] Label identifying the number of insecure network requests found by an audit of a web page. */
  displayValue: `{itemCount, plural,
    =1 {1 insecure request found}
    other {# insecure requests found}
    }`,
  /** Label for a column in a data table; entries in the column will be the URLs of insecure (non-HTTPS) network requests. */
  columnInsecureURL: 'Insecure URL',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const SECURE_SCHEMES = ['data', 'https', 'wss', 'blob', 'chrome', 'chrome-extension', 'about',
  'filesystem'];
const SECURE_DOMAINS = ['localhost', '127.0.0.1'];

class HTTPS extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'is-on-https',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {{parsedURL: {scheme: string, host: string}, protocol: string}} record
   * @return {boolean}
   */
  static isSecureRecord(record) {
    return SECURE_SCHEMES.includes(record.parsedURL.scheme) ||
           SECURE_SCHEMES.includes(record.protocol) ||
           SECURE_DOMAINS.includes(record.parsedURL.host);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return NetworkRecords.request(devtoolsLogs, context).then(networkRecords => {
      const insecureURLs = networkRecords
          .filter(record => !HTTPS.isSecureRecord(record))
          .map(record => URL.elideDataURI(record.url));

      const items = Array.from(new Set(insecureURLs)).map(url => ({url}));

      let displayValue = '';
      if (items.length > 0) {
        displayValue = str_(UIStrings.displayValue, {itemCount: items.length});
      }

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', itemType: 'url', text: str_(UIStrings.columnInsecureURL)},
      ];

      return {
        score: Number(items.length === 0),
        displayValue,
        extendedInfo: {
          value: items,
        },
        details: Audit.makeTableDetails(headings, items),
      };
    });
  }
}

module.exports = HTTPS;
module.exports.UIStrings = UIStrings;
