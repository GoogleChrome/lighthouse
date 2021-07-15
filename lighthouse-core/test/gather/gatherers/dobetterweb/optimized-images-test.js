/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const OptimizedImages = require('../../../../gather/gatherers/dobetterweb/optimized-images.js');
const {createMockContext} = require('../../../fraggle-rock/gather/mock-driver.js');

let context = createMockContext();
let optimizedImages;

const traceData = {
  networkRecords: [
    {
      requestId: '1',
      url: 'http://google.com/image.jpg',
      mimeType: 'image/jpeg',
      resourceSize: 10000000,
      transferSize: 20000000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/transparent.png',
      mimeType: 'image/png',
      resourceSize: 11000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/image.bmp',
      mimeType: 'image/bmp',
      resourceSize: 12000,
      transferSize: 9000, // bitmap was compressed another way
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/image.bmp',
      mimeType: 'image/bmp',
      resourceSize: 12000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/vector.svg',
      mimeType: 'image/svg+xml',
      resourceSize: 13000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://gmail.com/image.jpg',
      mimeType: 'image/jpeg',
      resourceSize: 15000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://gmail.com/image.jpg',
      mimeType: 'image/jpeg',
      resourceSize: 15000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
      sessionId: 'oopif', // ignore for being an oopif
    },
    {
      requestId: '1',
      url: 'data: image/jpeg ; base64 ,SgVcAT32587935321...',
      mimeType: 'image/jpeg',
      resourceType: 'Image',
      resourceSize: 14000,
      transferSize: 20000,
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/big-image.bmp',
      mimeType: 'image/bmp',
      resourceType: 'Image',
      resourceSize: 12000,
      transferSize: 20000,
      finished: false, // ignore for not finishing
    },
    {
      requestId: '1',
      url: 'http://google.com/not-an-image.bmp',
      mimeType: 'image/bmp',
      resourceType: 'Document', // ignore for not really being an image
      resourceSize: 12000,
      transferSize: 20000,
      finished: true,
    },
  ],
};

describe('Optimized images', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    optimizedImages = new OptimizedImages();
    context = createMockContext();
    context.url = 'http://google.com';
    context.driver.defaultSession.sendCommand.mockImplementation((_, params) => {
      const encodedSize = params.encoding === 'webp' ? 60 : 80;
      return Promise.resolve({encodedSize});
    });
  });

  it('returns all images, sorted with sizes', async () => {
    const artifact = await optimizedImages.afterPass(context, traceData);
    expect(artifact).toHaveLength(5);
    expect(artifact).toMatchObject([
      {
        jpegSize: undefined,
        webpSize: undefined,
        originalSize: 10000000,
        url: 'http://google.com/image.jpg',
      },
      {
        jpegSize: 80,
        webpSize: 60,
        originalSize: 15000,
        url: 'http://gmail.com/image.jpg',
      },
      {
        jpegSize: 80,
        webpSize: 60,
        originalSize: 14000,
        url: 'data: image/jpeg ; base64 ,SgVcAT32587935321...',
      },
      {
        jpegSize: 80,
        webpSize: 60,
        originalSize: 11000,
        url: 'http://google.com/transparent.png',
      },
      {
        jpegSize: 80,
        webpSize: 60,
        originalSize: 9000,
        url: 'http://google.com/image.bmp',
      },
    ]);
  });

  it('handles partial driver failure', () => {
    let calls = 0;
    context.driver.defaultSession.sendCommand.mockImplementation(() => {
      calls++;
      if (calls > 2) {
        return Promise.reject(new Error('whoops driver failed'));
      } else {
        return Promise.resolve({encodedSize: 60});
      }
    });

    return optimizedImages.afterPass(context, traceData).then(artifact => {
      const failed = artifact.find(record => record.failed);

      expect(artifact).toHaveLength(5);
      expect(failed && failed.errMsg).toEqual('whoops driver failed');
    });
  });

  it('handles non-standard mime types too', async () => {
    const traceData = {
      networkRecords: [
        {
          requestId: '1',
          url: 'http://google.com/image.bmp?x-ms',
          mimeType: 'image/x-ms-bmp',
          resourceSize: 12000,
          transferSize: 0,
          resourceType: 'Image',
          finished: true,
        },
      ],
    };

    const artifact = await optimizedImages.afterPass(context, traceData);
    expect(artifact).toHaveLength(1);
  });

  it('handles cached images', async () => {
    const traceData = {
      networkRecords: [
        {
          requestId: '1',
          url: 'http://google.com/image.jpg',
          mimeType: 'image/jpeg',
          resourceSize: 10000000,
          transferSize: 0,
          resourceType: 'Image',
          finished: true,
        },
      ],
    };

    const artifact = await optimizedImages.afterPass(context, traceData);
    expect(artifact).toHaveLength(1);
  });
});
