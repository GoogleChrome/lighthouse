/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import EfficientAnimatedContent from
  '../../../audits/byte-efficiency/efficient-animated-content.js';
import {NetworkRequest} from '../../../lib/network-request.js';

describe('Page uses videos for animated GIFs', () => {
  it('should flag gifs above 100kb as unoptimized', async () => {
    const networkRecords = [
      {
        resourceType: NetworkRequest.TYPES.Image,
        mimeType: 'image/gif',
        resourceSize: 100240,
        url: 'https://example.com/example.gif',
      },
      {
        resourceType: NetworkRequest.TYPES.Image,
        mimeType: 'image/gif',
        resourceSize: 110000,
        url: 'https://example.com/example2.gif',
      },
    ];
    const artifacts = {
      devtoolsLogs: {[EfficientAnimatedContent.DEFAULT_PASS]: []},
    };

    const {items} = await EfficientAnimatedContent.audit_(artifacts, networkRecords);
    assert.equal(items.length, 1);
    assert.equal(items[0].url, 'https://example.com/example2.gif');
    assert.equal(items[0].totalBytes, 110000);
    assert.equal(Math.round(items[0].wastedBytes), 50600);
  });

  it(`shouldn't flag content that looks like a gif but isn't`, async () => {
    const networkRecords = [
      {
        mimeType: 'image/gif',
        resourceType: NetworkRequest.TYPES.Media,
        resourceSize: 150000,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[EfficientAnimatedContent.DEFAULT_PASS]: []},
    };

    const {items} = await EfficientAnimatedContent.audit_(artifacts, networkRecords);
    assert.equal(items.length, 0);
  });

  it(`shouldn't flag non gif content`, async () => {
    const networkRecords = [
      {
        resourceType: NetworkRequest.TYPES.Document,
        mimeType: 'text/html',
        resourceSize: 150000,
      },
      {
        resourceType: NetworkRequest.TYPES.Stylesheet,
        mimeType: 'text/css',
        resourceSize: 150000,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[EfficientAnimatedContent.DEFAULT_PASS]: []},
    };

    const {items} = await EfficientAnimatedContent.audit_(artifacts, networkRecords);
    assert.equal(items.length, 0);
  });
});
