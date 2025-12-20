/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const WebPImagesAudit = require('../../../audits/byte-efficiency/uses-webp-images.js');

function generateArtifacts(images) {
  const optimizedImages = [];
  const imageElements = [];

  for (const image of images) {
    let {type = 'jpeg'} = image;
    const isData = /^data:/.test(type);
    if (isData) {
      type = type.slice('data:'.length);
    }

    const mimeType = image.mimeType || `image/${type}`;
    const url = isData
      ? `data:${mimeType};base64,reaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaly ` +
        'reaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaly long'
      : `http://google.com/image.${type}`;

    optimizedImages.push({
      url,
      mimeType,
      ...image,
    });

    imageElements.push({
      src: url,
      naturalWidth: image.width,
      naturalHeight: image.height,
    });
  }

  return {
    URL: {finalUrl: 'http://google.com/'},
    ImageElements: imageElements,
    OptimizedImages: optimizedImages,
  };
}

/* eslint-env jest */

describe('Page uses optimized images', () => {
  it('ignores files when there is only insignificant savings', () => {
    const artifacts = generateArtifacts([{originalSize: 5000, webpSize: 4500}]);
    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([]);
  });

  it('flags files when there is only small savings', () => {
    const artifacts = generateArtifacts([{originalSize: 15000, webpSize: 4500}]);
    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([
      {
        fromProtocol: true,
        isCrossOrigin: false,
        totalBytes: 15000,
        wastedBytes: 15000 - 4500,
        url: 'http://google.com/image.jpeg',
      },
    ]);
  });

  it('estimates savings on files without webpSize', () => {
    const artifacts = generateArtifacts([{originalSize: 1e6, width: 1000, height: 1000}]);
    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([
      {
        fromProtocol: false,
        isCrossOrigin: false,
        totalBytes: 1e6,
        wastedBytes: 1e6 - 1000 * 1000 * 2 / 10,
        url: 'http://google.com/image.jpeg',
      },
    ]);
  });

  it('estimates savings on cross-origin files', () => {
    const artifacts = generateArtifacts([{
      url: 'http://localhost:1234/image.jpeg', originalSize: 50000, webpSize: 20000,
    }]);
    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toMatchObject([
      {
        fromProtocol: true,
        isCrossOrigin: true,
        url: 'http://localhost:1234/image.jpeg',
      },
    ]);
  });

  it('passes when all images are sufficiently optimized', () => {
    const artifacts = generateArtifacts([
      {type: 'png', originalSize: 50000, webpSize: 50001},
      {type: 'jpeg', originalSize: 50000, webpSize: 50001},
      {type: 'bmp', originalSize: 4000, webpSize: 2000},
    ]);

    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([]);
  });

  it('elides data URIs', () => {
    const artifacts = generateArtifacts([
      {type: 'data:webp', originalSize: 15000, webpSize: 4500},
    ]);

    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toHaveLength(1);
    expect(auditResult.items[0].url).toMatch(/^data.{2,40}/);
  });

  it('warns when images have failed', () => {
    const artifacts = generateArtifacts([{failed: true, url: 'http://localhost/image.jpeg'}]);
    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toHaveLength(0);
    expect(auditResult.warnings).toHaveLength(1);
  });

  it('warns when missing ImageElement', () => {
    const artifacts = generateArtifacts([{originalSize: 1e6}]);
    artifacts.ImageElements = [];
    const auditResult = WebPImagesAudit.audit_(artifacts);

    expect(auditResult.items).toHaveLength(0);
    expect(auditResult.warnings).toHaveLength(1);
  });
});
