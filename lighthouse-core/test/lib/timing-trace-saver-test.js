/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

/* eslint-disable no-console */

const {generateTraceEvents, createTraceString} = require('../../lib/timing-trace-saver.js');

const mockEntries = [{
  startTime: 650,
  name: 'lh:init:config',
  duration: 210,
  entryType: 'measure',
},
{
  startTime: 870,
  name: 'lh:runner:run',
  duration: 120,
  entryType: 'measure',
},
{
  startTime: 990,
  name: 'lh:runner:auditing',
  duration: 750,
  entryType: 'measure',
},
{
  startTime: 1010,
  name: 'lh:audit:is-on-https',
  duration: 10,
  entryType: 'measure',
},
];

describe('generateTraceEvents', () => {
  it('generates a pair of trace events', () => {
    const events = generateTraceEvents([mockEntries[0]]);
    expect(events.slice(0, 2)).toMatchSnapshot();
  });
});

describe('createTraceString', () => {
  it('creates a real trace', () => {
    const jsonStr = createTraceString({
      timing: {
        entries: mockEntries,
      },
    });
    const traceJson = JSON.parse(jsonStr);
    const eventsWithoutMetadata = traceJson.traceEvents.filter(e => e.cat !== '__metadata');
    expect(eventsWithoutMetadata).toMatchSnapshot();
  });
});
