/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const EfficientAnimatedContent =
  require('../../../audits/byte-efficiency/efficient-animated-content.js');
const NetworkRequest = require('../../../lib/network-request.js');
const assert = require('assert').strict;

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
