/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ServiceWorkerGather = require('../../../gather/gatherers/service-worker.js');
const assert = require('assert').strict;

describe('service worker gatherer', () => {
  it('obtains the active service worker registration', async () => {
    const url = 'https://example.com/';
    const versions = [{
      registrationId: '123',
      status: 'activated',
      scriptURL: url,
    }];
    const registrations = [{
      registrationId: '123',
      scopeUrl: url,
      isDeleted: false,
    }];

    const serviceWorkerGatherer = new ServiceWorkerGather();
    const artifact = await serviceWorkerGatherer.beforePass({
      driver: {
        async getServiceWorkerVersions() {
          return {versions};
        },
        async getServiceWorkerRegistrations() {
          return {registrations};
        },
      },
      url,
    });

    assert.deepEqual(artifact.versions, versions);
    assert.deepEqual(artifact.registrations, registrations);
  });
});
