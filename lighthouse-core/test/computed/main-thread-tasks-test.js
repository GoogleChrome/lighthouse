/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const MainThreadTasks = require('../../computed/main-thread-tasks.js');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');

describe('MainThreadTasksComputed', () => {
  it('computes the artifact', async () => {
    const context = {computedCache: new Map()};
    const tasks = await MainThreadTasks.request(pwaTrace, context);
    expect(tasks.length).toEqual(4784);
  });
});
