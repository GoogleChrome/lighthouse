/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure that resource loaded over its own
 * origin are over the http/2 protocol.
 */

'use strict';

const URL = require('../../lib/url-shim.js');
const Audit = require('../audit.js');
const NetworkRecords = require('../../computed/network-records.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether the webpage uses HTTP/2 for resources it requests over the network. This descriptive title is shown to users when the page uses HTTP/2 for its requests. */
  title: 'Uses HTTP/2 for its own resources',
  /** Title of a Lighthouse audit that provides detail on whether the webpage uses HTTP/2 for resources it requests over the network. This descriptive title is shown to users when the page does not use HTTP/2 for its requests. */
  failureTitle: 'Does not use HTTP/2 for all of its resources',
  /** Description of a Lighthouse audit that tells the user why they should use HTTP/2. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'HTTP/2 offers many benefits over HTTP/1.1, including binary headers, ' +
      'multiplexing, and server push. [Learn more](https://web.dev/uses-http2).',
  /** [ICU Syntax] Label identifying the number of network requests that were not served with HTTP/2. */
  displayValue: `{itemCount, plural,
    =1 {1 request not served via HTTP/2}
    other {# requests not served via HTTP/2}
    }`,
  /**  Label for a column in a data table; entries in the column will be the HTTP Protocol used to make a network request. */
  columnProtocol: 'Protocol',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class UsesHTTP2Audit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-http2',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['URL', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return NetworkRecords.request(devtoolsLogs, context).then(networkRecords => {
      const finalHost = new URL(artifacts.URL.finalUrl).host;

      const seenURLs = new Set();
      // Filter requests that are on the same host as the page and not over h2.
      const resources = networkRecords.filter(record => {
        // check if record is not served through the service worker, servicer worker uses http/1.1 as a protocol
        // these can generate false positives (bug: https://github.com/GoogleChrome/lighthouse/issues/7158)
        if (record.fetchedViaServiceWorker) return false;
        // test the protocol first to avoid (potentially) expensive URL parsing
        const isOldHttp = /HTTP\/[01][.\d]?/i.test(record.protocol);
        if (!isOldHttp) return false;
        const requestHost = new URL(record.url).host;
        return requestHost === finalHost;
      }).map(record => {
        return {
          protocol: record.protocol,
          url: record.url,
        };
      }).filter(record => {
        if (seenURLs.has(record.url)) return false;
        seenURLs.add(record.url);
        return true;
      });

      let displayValue = '';
      if (resources.length > 0) {
        displayValue = str_(UIStrings.displayValue, {itemCount: resources.length});
      }

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
        {key: 'protocol', itemType: 'text', text: str_(UIStrings.columnProtocol)},
      ];
      const details = Audit.makeTableDetails(headings, resources);

      return {
        score: Number(resources.length === 0),
        displayValue: displayValue,
        extendedInfo: {
          value: {
            results: resources,
          },
        },
        details,
      };
    });
  }
}

module.exports = UsesHTTP2Audit;
module.exports.UIStrings = UIStrings;
