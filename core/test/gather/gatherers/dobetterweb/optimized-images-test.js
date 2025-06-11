/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OptimizedImages from '../../../../gather/gatherers/dobetterweb/optimized-images.js';
import {createMockContext} from '../../../gather/mock-driver.js';
import {networkRecordsToDevtoolsLog} from '../../../network-records-to-devtools-log.js';

describe('Optimized images', () => {
  let context = createMockContext();
  let optimizedImages;

  // Reset the Gatherer before each test.
  beforeEach(() => {
    optimizedImages = new OptimizedImages();
    context = createMockContext();
    context.url = 'http://google.com';
    context.driver.defaultSession.sendCommand.mockImplementation((_, params) => {
      const encodedSize = params.encoding === 'webp' ? 60 : 80;
      return Promise.resolve({encodedSize});
    });

    context.dependencies.DevtoolsLog = networkRecordsToDevtoolsLog([
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
        requestId: '2',
        url: 'http://google.com/transparent.png',
        mimeType: 'image/png',
        resourceSize: 11000,
        transferSize: 20000,
        resourceType: 'Image',
        finished: true,
      },
      {
        requestId: '3',
        url: 'http://google.com/image.bmp',
        mimeType: 'image/bmp',
        resourceSize: 12000,
        transferSize: 9000, // bitmap was compressed another way
        resourceType: 'Image',
        finished: true,
      },
      {
        requestId: '4',
        url: 'http://google.com/image.bmp',
        mimeType: 'image/bmp',
        resourceSize: 12000,
        transferSize: 20000,
        resourceType: 'Image',
        finished: true,
      },
      {
        requestId: '5',
        url: 'http://google.com/vector.svg',
        mimeType: 'image/svg+xml',
        resourceSize: 13000,
        transferSize: 20000,
        resourceType: 'Image',
        finished: true,
      },
      {
        requestId: '6',
        url: 'http://gmail.com/image.jpg',
        mimeType: 'image/jpeg',
        resourceSize: 15000,
        transferSize: 20000,
        resourceType: 'Image',
        finished: true,
      },
      {
        requestId: '7',
        url: 'http://gmail.com/image-oopif.jpg',
        mimeType: 'image/jpeg',
        resourceSize: 15000,
        transferSize: 20000,
        resourceType: 'Image',
        finished: true,
        sessionTargetType: 'iframe', // ignore for being an oopif
      },
      {
        requestId: '8',
        url: 'data: image/jpeg ; base64 ,SgVcAT32587935321...',
        mimeType: 'image/jpeg',
        resourceType: 'Image',
        resourceSize: 14000,
        transferSize: 20000,
        finished: true,
      },
      {
        requestId: '9',
        url: 'http://google.com/big-image.bmp',
        mimeType: 'image/bmp',
        resourceType: 'Image',
        finished: false, // ignore for not finishing
      },
      {
        requestId: '10',
        url: 'http://google.com/not-an-image.bmp',
        mimeType: 'image/bmp',
        resourceType: 'Document', // ignore for not really being an image
        resourceSize: 12000,
        transferSize: 20000,
        finished: true,
      },
      {
        requestId: '11',
        url: 'http://gmail.com/image-worker.jpg',
        mimeType: 'image/jpeg',
        resourceSize: 15000,
        transferSize: 20000,
        resourceType: 'Image',
        finished: true,
        sessionTargetType: 'worker', // ignore for being a worker
      },
    ]);
  });

  it('returns all images, sorted with sizes', async () => {
    const artifact = await optimizedImages.getArtifact(context);
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

    return optimizedImages.getArtifact(context).then(artifact => {
      const failed = artifact.find(record => record.failed);

      expect(artifact).toHaveLength(5);
      expect(failed?.errMsg).toEqual('whoops driver failed');
    });
  });

  it('handles non-standard mime types too', async () => {
    context.dependencies.DevtoolsLog = networkRecordsToDevtoolsLog([
      {
        requestId: '1',
        url: 'http://google.com/image.bmp?x-ms',
        mimeType: 'image/x-ms-bmp',
        resourceSize: 12000,
        transferSize: 0,
        resourceType: 'Image',
        finished: true,
      },
    ]);
    const artifact = await optimizedImages.getArtifact(context);
    expect(artifact).toHaveLength(1);
  });

  it('handles cached images', async () => {
    context.dependencies.DevtoolsLog = networkRecordsToDevtoolsLog([
      {
        requestId: '1',
        url: 'http://google.com/image.jpg',
        mimeType: 'image/jpeg',
        resourceSize: 10000000,
        transferSize: 0,
        resourceType: 'Image',
        finished: true,
      },
    ]);
    const artifact = await optimizedImages.getArtifact(context);
    expect(artifact).toHaveLength(1);
  });
});
