/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UsesHTTP2Audit = require('../../../audits/dobetterweb/uses-http2.js');
const assert = require('assert').strict;
const networkRecordsToDevtoolsLog = require('../../network-records-to-devtools-log.js');

const URL = 'https://webtide.com/http2-push-demo/';
const networkRecords = require('../../fixtures/networkRecords-mix.json');

/* eslint-env jest */

describe('Resources are fetched over http/2', () => {
  function getArtifacts(networkRecords, finalUrl) {
    // networkRecords-mix.json is an old network request format, so don't verify round-trip.
    const devtoolsLog = networkRecordsToDevtoolsLog(networkRecords, {skipVerification: true});

    return {
      URL: {finalUrl},
      devtoolsLogs: {[UsesHTTP2Audit.DEFAULT_PASS]: devtoolsLog},
    };
  }

  it('fails when some resources were requested via http/1.x', () => {
    return UsesHTTP2Audit.audit(getArtifacts(networkRecords, URL), {computedCache: new Map()}).then(
      auditResult => {
        assert.equal(auditResult.score, 0);
        expect(auditResult.displayValue).toBeDisplayString('3 requests not served via HTTP/2');
        assert.equal(auditResult.details.items.length, 3);
        assert.equal(
          auditResult.details.items[0].url,
          'https://webtide.com/wp-content/plugins/wp-pagenavi/pagenavi-css.css?ver=2.70'
        );
        const headers = auditResult.details.headings;
        expect(headers[0].text).toBeDisplayString('URL');
        expect(headers[1].text).toBeDisplayString('Protocol');
      }
    );
  });

  it('displayValue is correct when only one resource fails', () => {
    const entryWithHTTP1 = networkRecords.slice(1, 2);
    return UsesHTTP2Audit.audit(getArtifacts(entryWithHTTP1, URL), {computedCache: new Map()}).then(
      auditResult => {
        expect(auditResult.displayValue).toBeDisplayString('1 request not served via HTTP/2');
      }
    );
  });

  it('passes when all resources were requested via http/2', () => {
    const h2Records = JSON.parse(JSON.stringify(networkRecords));
    h2Records.forEach(record => {
      record.protocol = 'h2';
    });

    return UsesHTTP2Audit.audit(getArtifacts(h2Records, URL), {computedCache: new Map()}).then(
      auditResult => {
        assert.equal(auditResult.score, 1);
        assert.ok(auditResult.displayValue === '');
      }
    );
  });

  it('results are correct when some requests are handled by service worker', () => {
    const clonedNetworkRecords = JSON.parse(JSON.stringify(networkRecords));
    clonedNetworkRecords.forEach(record => {
      // convert http 1.1 to service worker requests
      if (record.protocol === 'http/1.1') {
        record.fetchedViaServiceWorker = true;
      }
    });

    return UsesHTTP2Audit.audit(getArtifacts(clonedNetworkRecords, URL), {
      computedCache: new Map(),
    }).then(auditResult => {
      assert.equal(auditResult.score, 0);
      expect(auditResult.displayValue).toBeDisplayString('1 request not served via HTTP/2');
      // Protocol is http/1.0 which we don't mark as fetched fetchedViaServiceWorker on line 73.
      assert.equal(
        auditResult.details.items[0].url,
        'https://webtide.com/wp-content/themes/clean-retina-pro/library/js/tinynav.js?ver=4.5.4'
      );
      assert.equal(auditResult.details.items[0].protocol, 'http/1.0');
    });
  });
});
