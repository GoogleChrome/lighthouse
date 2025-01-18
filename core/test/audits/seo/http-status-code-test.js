/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import HTTPStatusCodeAudit from '../../../audits/seo/http-status-code.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

describe('SEO: HTTP code audit', () => {
  it('fails when status code is unsuccesfull', () => {
    const statusCodes = [403, 404, 500];

    const allRuns = statusCodes.map(statusCode => {
      const mainDocumentUrl = 'https://example.com';
      const mainResource = {
        url: mainDocumentUrl,
        statusCode,
      };
      const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

      const artifacts = {
        GatherContext: {gatherMode: 'timespan'},
        devtoolsLogs: {[HTTPStatusCodeAudit.DEFAULT_PASS]: devtoolsLog},
        URL: {mainDocumentUrl},
      };

      return HTTPStatusCodeAudit.audit(artifacts, {computedCache: new Map()}).then(auditResult => {
        assert.equal(auditResult.score, 0);
        assert.ok(auditResult.displayValue.includes(statusCode), false);
      });
    });

    return Promise.all(allRuns);
  });

  it('passes when status code is successful', () => {
    const mainDocumentUrl = 'https://example.com';
    const mainResource = {
      url: mainDocumentUrl,
      statusCode: 200,
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      devtoolsLogs: {[HTTPStatusCodeAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
    };

    return HTTPStatusCodeAudit.audit(artifacts, {computedCache: new Map()}).then(auditResult => {
      assert.equal(auditResult.score, 1);
    });
  });

  it('throws when main resource cannot be found in navigation', async () => {
    const mainDocumentUrl = 'https://example.com';

    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      devtoolsLogs: {[HTTPStatusCodeAudit.DEFAULT_PASS]: []},
      URL: {mainDocumentUrl},
    };

    const resultPromise = HTTPStatusCodeAudit.audit(artifacts, {computedCache: new Map()});
    await expect(resultPromise).rejects.toThrow();
  });
});
