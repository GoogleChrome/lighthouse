/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UsesResponsiveImagesAudit =
    require('../../../audits/byte-efficiency/uses-responsive-images.js');
const assert = require('assert').strict;

/* eslint-env jest */
function generateRecord(resourceSizeInKb, durationInMs, url = 'https://google.com/logo.png', mimeType = 'image/png') {
  return {
    mimeType,
    resourceSize: resourceSizeInKb * 1024,
    transferSize: resourceSizeInKb * 1024,
    endTime: durationInMs / 1000,
    responseReceivedTime: 0,
    statusCode: 200,
    finished: true,
    url,
  };
}

function generateSize(width, height, prefix = 'displayed') {
  const size = {};
  size[`${prefix}Width`] = width;
  size[`${prefix}Height`] = height;
  return size;
}

function generateImage(clientSize, naturalDimensions, src = 'https://google.com/logo.png') {
  return {src, ...clientSize, naturalDimensions};
}

describe('Page uses responsive images', () => {
  function testImage(condition, data) {
    const description = `identifies when an image is ${condition}`;
    const artifacts = {
      ViewportDimensions: {
        innerWidth: 1000,
        innerHeight: 1000,
        devicePixelRatio: data.devicePixelRatio || 1,
      },
      ImageElements: [
        generateImage(
          generateSize(...data.clientSize),
          {width: data.naturalSize[0], height: data.naturalSize[1]}
        ),
      ],
    };
    it(description, async () => {
      // eslint-disable-next-line max-len
      const result = await UsesResponsiveImagesAudit.audit_(
        artifacts,
        [generateRecord(data.sizeInKb, data.durationInMs || 200)],
        {computedCache: new Map()}
      );
      expect(result.items).toHaveLength(data.listed ? 1 : 0);
      if (data.listed) {
        assert.equal(Math.round(result.items[0].wastedBytes / 1024), data.expectedWaste);
      }
    });
  }

  testImage('larger than displayed size', {
    listed: true,
    devicePixelRatio: 2,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    sizeInKb: 200,
    expectedWaste: 111, // 200 * 5/9
  });

  testImage('smaller than displayed size', {
    listed: false,
    devicePixelRatio: 2,
    clientSize: [200, 200],
    naturalSize: [300, 300],
    sizeInKb: 200,
  });

  testImage('small in file size', {
    listed: true,
    devicePixelRatio: 2,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    sizeInKb: 10,
    expectedWaste: 6, // 10 * 5/9
  });

  testImage('very small in file size', {
    listed: false,
    devicePixelRatio: 2,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    sizeInKb: 1,
  });

  testImage('offscreen and within viewport size', {
    listed: false,
    devicePixelRatio: 2,
    clientSize: [0, 0], // 0 dimensions will be treated as 2 viewport sized
    naturalSize: [2000, 3000],
    sizeInKb: 1000,
  });

  testImage('offscreen and larger than viewport size', {
    listed: true,
    devicePixelRatio: 2,
    clientSize: [0, 0], // 0 dimensions will be treated as 2 viewport sized
    naturalSize: [5000, 5000],
    sizeInKb: 1000,
    expectedWaste: 840, // 1000 * 21/25
  });

  it('handles images without network record', async () => {
    const auditResult = await UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 2},
      ImageElements: [
        generateImage(
          generateSize(100, 100),
          {width: 300, height: 300},
          null
        ),
      ],
    },
      [],
      {computedCache: new Map()}
    );

    assert.equal(auditResult.items.length, 0);
  });

  it('identifies when images are not wasteful', async () => {
    const networkRecords = [generateRecord(100, 300, 'https://google.com/logo.png'), generateRecord(90, 500, 'https://google.com/logo2.png'), generateRecord(20, 100, 'data:image/jpeg;base64,foobar')];
    const auditResult = await UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 2},
      ImageElements: [
        generateImage(
          generateSize(200, 200),
          {width: 450, height: 450},
          'https://google.com/logo.png'
        ),
        generateImage(
          generateSize(100, 100),
          {width: 210, height: 210},
          'https://google.com/logo2.png'
        ),
        generateImage(
          generateSize(100, 100),
          {width: 80, height: 80},
          'data:image/jpeg;base64,foobar'
        ),
      ],
    },
      networkRecords,
      {computedCache: new Map()}
    );

    assert.equal(auditResult.items.length, 2);
  });

  it('ignores vectors', async () => {
    const urlA = 'https://google.com/logo.svg';
    const naturalSizeA = {width: 450, height: 450};
    const image =
      {...generateImage(generateSize(10, 10), naturalSizeA, urlA)};
    const auditResult = await UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        image,
      ],
    },
      [generateRecord(100, 300, urlA, 'image/svg+xml')],
      {computedCache: new Map()}
    );
    assert.equal(auditResult.items.length, 0);
  });

  it('ignores CSS', async () => {
    const urlA = 'https://google.com/logo.png';
    const naturalSizeA = {width: 450, height: 450};

    const auditResult = await UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        {...generateImage(generateSize(10, 10), naturalSizeA, urlA), isCss: true},
      ],
    },
      [generateRecord(100, 300, urlA)],
      {computedCache: new Map()}
    );

    assert.equal(auditResult.items.length, 0);
  });

  it('handles failure', async () => {
    const urlA = 'https://google.com/logo.png';
    const naturalSizeA = {width: NaN, height: 450};
    const auditResult = await UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        generateImage(generateSize(10, 10), naturalSizeA, urlA),
      ],
    },
      [generateRecord(100, 300, urlA)],
      {computedCache: new Map()}
    );

    assert.equal(auditResult.items.length, 0);
  });

  it('de-dupes images', async () => {
    const urlA = 'https://google.com/logo.png';
    const naturalSizeA = {width: 450, height: 450};
    const recordA = generateRecord(100, 300, urlA);
    const urlB = 'https://google.com/logoB.png';
    const naturalSizeB = {width: 1000, height: 1000};
    const recordB = generateRecord(10, 20, urlB); // make it small to keep test passing
    const networkRecords = [recordA, recordB];

    const auditResult = await UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        generateImage(generateSize(10, 10), naturalSizeA, urlA),
        generateImage(generateSize(450, 450), naturalSizeA, urlA),
        generateImage(generateSize(30, 30), naturalSizeA, urlA),
        generateImage(generateSize(500, 500), naturalSizeB, urlB),
        generateImage(generateSize(100, 100), naturalSizeB, urlB),
      ],
    },
      networkRecords,
      {computedCache: new Map()}
    );

    assert.equal(auditResult.items.length, 1);
    assert.equal(auditResult.items[0].wastedPercent, 75, 'correctly computes wastedPercent');
  });

  it('handles cached images', () => {
    const networkRecord = {
      mimeType: 'image/png',
      resourceSize: 1024 * 100,
      transferSize: 0,
      url: 'https://google.com/logo.png',
    };
    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        generateImage(
          generateSize(500, 500),
          {width: 1000, height: 1000},
          'https://google.com/logo.png'
        ),
      ],
    },
      [networkRecord]
    );

    assert.equal(auditResult.items.length, 1);
    assert.equal(auditResult.items[0].wastedBytes / 1024, 75, 'correctly computes wastedBytes');
  });
});
