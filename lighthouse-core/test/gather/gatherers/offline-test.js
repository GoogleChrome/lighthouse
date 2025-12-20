/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const OfflineGather = require('../../../gather/gatherers/offline.js');
const assert = require('assert').strict;
const tracingData = require('../../fixtures/traces/network-records.json');

const mockDriver = {
  goOffline() {
    return Promise.resolve();
  },
  goOnline() {
    return Promise.resolve();
  },
};

describe('Offline gatherer', () => {
  it('returns an artifact set to -1 when offline loading fails', () => {
    const offlineGather = new OfflineGather();
    const options = {
      url: 'https://do-not-match.com/',
      driver: mockDriver,
    };
    const optionsWithQueryString = {
      url: 'https://ifixit-pwa.appspot.com/?history',
      driver: mockDriver,
    };

    return Promise.all([
      offlineGather.afterPass(options, tracingData).then(artifact => {
        assert.strictEqual(artifact, -1);
      }),
      offlineGather.afterPass(optionsWithQueryString, tracingData).then(artifact => {
        assert.strictEqual(artifact, -1);
      }),
    ]);
  });

  it('returns an artifact set to 200 when offline loading succeeds', () => {
    const offlineGather = new OfflineGather();
    const options = {
      url: 'https://ifixit-pwa.appspot.com/',
      driver: mockDriver,
    };
    const optionsWithFragment = {
      url: 'https://ifixit-pwa.appspot.com/#/history',
      driver: mockDriver,
    };
    return Promise.all([
      offlineGather.afterPass(options, tracingData).then(artifact => {
        assert.strictEqual(artifact, 200);
      }),
      offlineGather.afterPass(optionsWithFragment, tracingData).then(artifact => {
        assert.strictEqual(artifact, 200);
      }),
    ]);
  });
});
