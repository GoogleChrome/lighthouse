/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import NetworkRequests from '../../audits/network-requests.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {readJson} from '../test-utils.js';

const cutoffLoadDevtoolsLog = readJson('../fixtures/traces/cutoff-load-m83.devtoolslog.json', import.meta);

const GatherContext = {
  gatherMode: 'navigation',
};

describe('Network requests audit', () => {
  it('should report finished and unfinished network requests', async () => {
    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: cutoffLoadDevtoolsLog,
      },
      URL: {mainDocumentUrl: 'https://googlechrome.github.io/lighthouse/viewer/'},
      GatherContext,
    };

    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items[0]).toMatchObject({
      rendererStartTime: 0,
      networkRequestTime: expect.toBeApproximately(1, 0),
      networkEndTime: expect.toBeApproximately(702, 0),
      finished: true,
      transferSize: 11358,
      resourceSize: 39471,
      statusCode: 200,
      mimeType: 'text/html',
      resourceType: 'Document',
      priority: 'VeryHigh',
    });
    expect(output.details.items[2]).toMatchObject({
      rendererStartTime: expect.toBeApproximately(710, 0),
      networkRequestTime: expect.toBeApproximately(712, 0),
      networkEndTime: expect.toBeApproximately(1289, 0),
      finished: false,
      transferSize: 26441,
      resourceSize: 0,
      statusCode: 200,
      mimeType: 'image/png',
      resourceType: 'Image',
      priority: 'Low',
    });
    expect(output.details.items[5]).toMatchObject({
      rendererStartTime: expect.toBeApproximately(713, 0),
      networkRequestTime: expect.toBeApproximately(717, 0),
      networkEndTime: expect.toBeApproximately(1297, 0),
      finished: false,
      transferSize: 58571,
      resourceSize: 0,
      statusCode: 200,
      mimeType: 'application/javascript',
      resourceType: 'Script',
      priority: 'Medium',
    });

    expect(output.details.debugData).toStrictEqual({
      type: 'debugdata',
      networkStartTimeTs: 360725780729,
    });
  });

  it('should handle times correctly', async () => {
    const records = [
      {url: 'https://example.com/0', rendererStartTime: 14, networkRequestTime: 15.0, networkEndTime: 15.5},
      {url: 'https://example.com/1', rendererStartTime: 14, networkRequestTime: 15.5, networkEndTime: -1},
    ];

    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: networkRecordsToDevtoolsLog(records),
      },
      URL: {mainDocumentUrl: 'https://example.com/0'},
      GatherContext,
    };
    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items).toMatchObject([{
      rendererStartTime: 0,
      networkRequestTime: 1,
      networkEndTime: 1.5,
      finished: true,
    }, {
      rendererStartTime: 0,
      networkRequestTime: 1.5,
      networkEndTime: undefined,
      finished: true,
    }]);
  });

  it('should report if records are from the main frame', async () => {
    const records = [
      {url: 'https://example.com/', frameId: 'main'},
      {url: 'https://iframed.local/', frameId: '71D866EC199B90A2E0B2D9CF88DCBC4E'},
    ];

    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: networkRecordsToDevtoolsLog(records),
      },
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext,
    };
    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items).toMatchObject([{
      url: 'https://example.com/',
      experimentalFromMainFrame: true,
    }, {
      url: 'https://iframed.local/',
      experimentalFromMainFrame: undefined,
    }]);
  });

  it('should not include main frame information outside of navigations', async () => {
    const records = [
      {url: 'https://example.com/', frameId: 'main'},
      {url: 'https://iframed.local/', frameId: '71D866EC199B90A2E0B2D9CF88DCBC4E'},
    ];

    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: networkRecordsToDevtoolsLog(records),
      },
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'timespan'},
    };
    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items).toMatchObject([{
      url: 'https://example.com/',
      experimentalFromMainFrame: undefined,
    }, {
      url: 'https://iframed.local/',
      experimentalFromMainFrame: undefined,
    }]);
  });

  it('should include if network request was preloaded', async () => {
    const records = [
      {url: 'https://example.com/'},
      {url: 'https://example.com/img.jpg', isLinkPreload: true},
    ];

    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: networkRecordsToDevtoolsLog(records),
      },
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext,
    };
    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items).toMatchObject([{
      url: 'https://example.com/',
      isLinkPreload: undefined,
    }, {
      url: 'https://example.com/img.jpg',
      isLinkPreload: true,
    }]);
  });

  it('should include if network request was first or third party', async () => {
    const records = [
      {url: 'https://example.com/'},
      {url: 'https://www.googletagmanager.com/gtm.js'},
    ];

    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: networkRecordsToDevtoolsLog(records),
      },
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext,
    };
    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items).toMatchObject([{
      url: 'https://example.com/',
      entity: 'example.com',
    }, {
      url: 'https://www.googletagmanager.com/gtm.js',
      entity: 'Google Tag Manager',
    }]);
  });
});
