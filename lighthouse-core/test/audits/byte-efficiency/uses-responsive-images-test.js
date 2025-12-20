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
function generateRecord(resourceSizeInKb, durationInMs, mimeType = 'image/png') {
  return {
    mimeType,
    resourceSize: resourceSizeInKb * 1024,
    endTime: durationInMs / 1000,
    responseReceivedTime: 0,
  };
}

function generateSize(width, height, prefix = 'displayed') {
  const size = {};
  size[`${prefix}Width`] = width;
  size[`${prefix}Height`] = height;
  return size;
}

function generateImage(clientSize, naturalSize, networkRecord, src = 'https://google.com/logo.png') {
  Object.assign(networkRecord || {}, {url: src});
  const image = {src, ...networkRecord};
  Object.assign(image, clientSize, naturalSize);
  return image;
}

describe('Page uses responsive images', () => {
  function testImage(condition, data) {
    const description = `identifies when an image is ${condition}`;
    it(description, () => {
      const result = UsesResponsiveImagesAudit.audit_({
        ViewportDimensions: {
          innerWidth: 1000,
          innerHeight: 1000,
          devicePixelRatio: data.devicePixelRatio || 1,
        },
        ImageElements: [
          generateImage(
            generateSize(...data.clientSize),
            generateSize(...data.naturalSize, 'natural'),
            generateRecord(data.sizeInKb, data.durationInMs || 200)
          ),
        ],
      });

      assert.equal(result.items.length, data.listed ? 1 : 0);
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

  it('handles images without network record', () => {
    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 2},
      ImageElements: [
        generateImage(
          generateSize(100, 100),
          generateSize(300, 300, 'natural'),
          null
        ),
      ],
    });

    assert.equal(auditResult.items.length, 0);
  });

  it('identifies when images are not wasteful', () => {
    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 2},
      ImageElements: [
        generateImage(
          generateSize(200, 200),
          generateSize(450, 450, 'natural'),
          generateRecord(100, 300),
          'https://google.com/logo.png'
        ),
        generateImage(
          generateSize(100, 100),
          generateSize(210, 210, 'natural'),
          generateRecord(90, 500),
          'https://google.com/logo2.png'
        ),
        generateImage(
          generateSize(100, 100),
          generateSize(80, 80, 'natural'),
          generateRecord(20, 100),
          'data:image/jpeg;base64,foobar'
        ),
      ],
    });

    assert.equal(auditResult.items.length, 2);
  });

  it('ignores vectors', () => {
    const urlA = 'https://google.com/logo.svg';
    const naturalSizeA = generateSize(450, 450, 'natural');
    const recordA = generateRecord(100, 300, 'image/svg+xml');

    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        generateImage(generateSize(10, 10), naturalSizeA, recordA, urlA),
      ],
    });

    assert.equal(auditResult.items.length, 0);
  });

  it('ignores CSS', () => {
    const urlA = 'https://google.com/logo.png';
    const naturalSizeA = generateSize(450, 450, 'natural');
    const recordA = generateRecord(100, 300);

    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        {...generateImage(generateSize(10, 10), naturalSizeA, recordA, urlA), isCss: true},
      ],
    });

    assert.equal(auditResult.items.length, 0);
  });

  it('handles failure', () => {
    const urlA = 'https://google.com/logo.png';
    const naturalSizeA = generateSize(NaN, 450, 'natural');
    const recordA = generateRecord(100, 300);

    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        generateImage(generateSize(10, 10), naturalSizeA, recordA, urlA),
      ],
    });

    assert.equal(auditResult.items.length, 0);
    assert.equal(auditResult.warnings.length, 1);
  });

  it('de-dupes images', () => {
    const urlA = 'https://google.com/logo.png';
    const naturalSizeA = generateSize(450, 450, 'natural');
    const recordA = generateRecord(100, 300);
    const urlB = 'https://google.com/logoB.png';
    const naturalSizeB = generateSize(1000, 1000, 'natural');
    const recordB = generateRecord(10, 20); // make it small to still test passing

    const auditResult = UsesResponsiveImagesAudit.audit_({
      ViewportDimensions: {innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1},
      ImageElements: [
        generateImage(generateSize(10, 10), naturalSizeA, recordA, urlA),
        generateImage(generateSize(450, 450), naturalSizeA, recordA, urlA),
        generateImage(generateSize(30, 30), naturalSizeA, recordA, urlA),
        generateImage(generateSize(500, 500), naturalSizeB, recordB, urlB),
        generateImage(generateSize(100, 100), naturalSizeB, recordB, urlB),
      ],
    });

    assert.equal(auditResult.items.length, 1);
    assert.equal(auditResult.items[0].wastedPercent, 75, 'correctly computes wastedPercent');
  });
});
