/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const ViewportMeta = require('../../computed/viewport-meta.js');

describe('ViewportMeta computed artifact', () => {
  const makeMetaElements = viewport => [{name: 'viewport', content: viewport}];

  it('is not mobile optimized when page does not contain a viewport meta tag', async () => {
    const {hasViewportTag, isMobileOptimized} = await ViewportMeta.compute_([]);
    assert.equal(hasViewportTag, false);
    assert.equal(isMobileOptimized, false);
  });

  /* eslint-disable-next-line max-len */
  it('is not mobile optimized when HTML contains a non-mobile friendly viewport meta tag', async () => {
    const viewport = 'maximum-scale=1';
    const {hasViewportTag, isMobileOptimized} =
      await ViewportMeta.compute_(makeMetaElements(viewport));
    assert.equal(hasViewportTag, true);
    assert.equal(isMobileOptimized, false);
  });

  it('is not mobile optimized when HTML contains an invalid viewport meta tag key', async () => {
    const viewport = 'nonsense=true';
    const {hasViewportTag, isMobileOptimized} =
      await ViewportMeta.compute_(makeMetaElements(viewport));
    assert.equal(hasViewportTag, true);
    assert.equal(isMobileOptimized, false);
  });

  it('is not mobile optimized when HTML contains an invalid viewport meta tag value', async () => {
    const viewport = 'initial-scale=microscopic';
    const {isMobileOptimized, parserWarnings} =
      await ViewportMeta.compute_(makeMetaElements(viewport));
    assert.equal(isMobileOptimized, false);
    assert.equal(parserWarnings[0], 'Invalid values found: {"initial-scale":"microscopic"}');
  });

  /* eslint-disable-next-line max-len */
  it('is not mobile optimized when HTML contains an invalid viewport meta tag key and value', async () => {
    const viewport = 'nonsense=true, initial-scale=microscopic';
    const {isMobileOptimized, parserWarnings} =
      await ViewportMeta.compute_(makeMetaElements(viewport));
    assert.equal(isMobileOptimized, false);
    assert.equal(parserWarnings[0], 'Invalid properties found: {"nonsense":"true"}');
    assert.equal(parserWarnings[1], 'Invalid values found: {"initial-scale":"microscopic"}');
  });

  it('is mobile optimized when a valid viewport is provided', async () => {
    const viewports = [
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1',
      'width = device-width, initial-scale = 1',
      'initial-scale=1',
      'width=device-width     ',
    ];

    await Promise.all(viewports.map(async viewport => {
      const {isMobileOptimized} =
        await ViewportMeta.compute_(makeMetaElements(viewport));
      assert.equal(isMobileOptimized, true);
    }));
  });

  it('doesn\'t throw when viewport contains "invalid" iOS properties', async () => {
    const viewports = [
      'width=device-width, shrink-to-fit=no',
      'width=device-width, viewport-fit=cover',
    ];
    await Promise.all(viewports.map(async viewport => {
      const {isMobileOptimized, parserWarnings} =
        await ViewportMeta.compute_(makeMetaElements(viewport));
      assert.equal(isMobileOptimized, true);
      assert.equal(parserWarnings[0], undefined);
    }));
  });
});

