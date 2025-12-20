/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ImageAspectRatioAudit = require('../../audits/image-aspect-ratio.js');
const assert = require('assert').strict;

/* eslint-env jest */

function generateImage(clientSize, naturalSize, props, src = 'https://google.com/logo.png') {
  const image = {src, mimeType: 'image/png'};
  Object.assign(image, clientSize, naturalSize, props);
  return image;
}

describe('Images: aspect-ratio audit', () => {
  function testImage(condition, data) {
    const description = `identifies when an image ${condition}`;
    it(description, () => {
      const result = ImageAspectRatioAudit.audit({
        ImageElements: [
          generateImage(
            {displayedWidth: data.clientSize[0], displayedHeight: data.clientSize[1]},
            {naturalWidth: data.naturalSize[0], naturalHeight: data.naturalSize[1]},
            data.props
          ),
        ],
      });

      assert.strictEqual(result.score, data.score, 'score does not match');
      if (data.warning) {
        assert.strictEqual(result.warnings[0], data.warning);
      } else {
        assert.ok(!result.warnings || result.warnings.length === 0, 'should not have warnings');
      }
    });
  }

  testImage('is a css image', {
    score: 1,
    clientSize: [1000, 20],
    naturalSize: [5, 5],
    props: {
      isCss: true,
    },
  });

  testImage('is much larger than natural aspect ratio', {
    score: 0,
    clientSize: [800, 500],
    naturalSize: [200, 200],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is a css image and much larger than natural aspect ratio', {
    score: 1,
    clientSize: [],
    naturalSize: [200, 200],
    props: {
      isCss: true,
      usesObjectFit: false,
    },
  });

  testImage('is larger than natural aspect ratio', {
    score: 0,
    clientSize: [400, 300],
    naturalSize: [200, 200],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('uses object-fit and is much smaller than natural aspect ratio', {
    score: 1,
    clientSize: [200, 200],
    naturalSize: [800, 500],
    props: {
      isCss: false,
      usesObjectFit: true,
    },
  });

  testImage('is much smaller than natural aspect ratio', {
    score: 0,
    clientSize: [200, 200],
    naturalSize: [800, 500],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is smaller than natural aspect ratio', {
    score: 0,
    clientSize: [200, 200],
    naturalSize: [400, 300],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is almost the right aspect ratio', {
    score: 1,
    clientSize: [412, 36],
    naturalSize: [800, 69],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('aspect ratios match', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('has no display sizing information', {
    score: 1,
    clientSize: [0, 0],
    naturalSize: [100, 100],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is placeholder image', {
    score: 1,
    clientSize: [300, 220],
    naturalSize: [1, 1],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  it('skips svg images', () => {
    const result = ImageAspectRatioAudit.audit({
      ImageElements: [
        generateImage(
          {width: 150, height: 150},
          {},
          {
            mimeType: 'image/svg+xml',
            isCss: false,
            usesObjectFit: false,
          }
        ),
      ],
    });

    assert.strictEqual(result.score, 1, 'score does not match');
    assert.equal(result.warnings.length, 0, 'should not have warnings');
  });
});
