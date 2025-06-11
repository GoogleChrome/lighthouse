/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OptimizedImagesAudit from '../../../audits/byte-efficiency/uses-optimized-images.js';

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
      naturalDimensions: image,
      node: {devtoolsNodePath: '1,HTML,1,IMG'},
    });
  }

  return {
    URL: {finalDisplayedUrl: 'http://google.com/'},
    ImageElements: imageElements,
    OptimizedImages: optimizedImages,
  };
}

describe('Page uses optimized images', () => {
  it('ignores files when there is only insignificant savings', () => {
    const artifacts = generateArtifacts([{originalSize: 5000, jpegSize: 4500}]);
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([]);
  });

  it('flags files when there is only small savings', () => {
    const artifacts = generateArtifacts([{originalSize: 15000, jpegSize: 4500}]);
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toMatchObject([
      {
        fromProtocol: true,
        isCrossOrigin: false,
        totalBytes: 15000,
        wastedBytes: 15000 - 4500,
        url: 'http://google.com/image.jpeg',
        node: {path: '1,HTML,1,IMG'},
      },
    ]);
  });

  it('estimates savings on files without jpegSize', () => {
    const artifacts = generateArtifacts([{originalSize: 1e6, width: 1000, height: 1000}]);
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toMatchObject([
      {
        fromProtocol: false,
        isCrossOrigin: false,
        totalBytes: 1e6,
        wastedBytes: 1e6 - 1000 * 1000 * 2 / 8,
        url: 'http://google.com/image.jpeg',
        node: {path: '1,HTML,1,IMG'},
      },
    ]);
  });

  it('estimates savings on cross-origin files', () => {
    const artifacts = generateArtifacts([{
      url: 'http://localhost:1234/image.jpg', originalSize: 50000, jpegSize: 20000,
    }]);
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toMatchObject([
      {
        fromProtocol: true,
        isCrossOrigin: true,
        url: 'http://localhost:1234/image.jpg',
      },
    ]);
  });

  it('ignores files when file type is not JPEG/BMP', () => {
    const artifacts = generateArtifacts([{type: 'png', originalSize: 150000}]);
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([]);
  });

  it('passes when all images are sufficiently optimized', () => {
    const artifacts = generateArtifacts([
      {type: 'png', originalSize: 50000},
      {type: 'jpeg', originalSize: 50000, jpegSize: 50001},
      {type: 'png', originalSize: 50000},
    ]);

    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toEqual([]);
  });

  it('elides data URIs', () => {
    const artifacts = generateArtifacts([
      {type: 'data:jpeg', originalSize: 15000, jpegSize: 4500},
    ]);

    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toHaveLength(1);
    expect(auditResult.items[0].url).toMatch(/^data.{2,40}/);
  });

  it('warns when images have failed', () => {
    const artifacts = generateArtifacts([{failed: true, url: 'http://localhost/image.jpeg'}]);
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toHaveLength(0);
    expect(auditResult.warnings).toHaveLength(1);
  });

  it('warns when missing ImageElement', () => {
    const artifacts = generateArtifacts([{originalSize: 1e6}]);
    artifacts.ImageElements = [];
    const auditResult = OptimizedImagesAudit.audit_(artifacts);

    expect(auditResult.items).toHaveLength(0);
    expect(auditResult.warnings).toHaveLength(1);
  });
});
