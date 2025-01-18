/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {DocumentUrls} from '../../computed/document-urls.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {createTestTrace} from '../create-test-trace.js';

describe('DocumentUrls', () => {
  it('should resolve redirects', async () => {
    const trace = createTestTrace({frameUrl: 'https://page.example.com/'});
    const devtoolsLog = networkRecordsToDevtoolsLog([
      {requestId: '0', url: 'http://example.com/'},
      {requestId: '0:redirect', url: 'https://example.com/'},
      {requestId: '0:redirect:redirect', url: 'https://www.example.com/'},
      {requestId: '1', url: 'https://page.example.com/'},
    ]);
    devtoolsLog.push({
      method: 'Page.frameNavigated',
      params: {
        frame: {
          id: 'ROOT_FRAME',
          url: 'https://www.example.com/',
        },
      },
    });
    devtoolsLog.push({
      method: 'Page.frameNavigated',
      params: {
        frame: {
          id: 'ROOT_FRAME',
          url: 'https://page.example.com/',
        },
      },
    });

    const URL = await DocumentUrls.request({devtoolsLog, trace}, {computedCache: new Map()});
    expect(URL).toEqual({
      requestedUrl: 'http://example.com/',
      mainDocumentUrl: 'https://page.example.com/',
    });
  });
});
