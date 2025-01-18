/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import {generateTraceEvents, createTraceString} from '../../lib/timing-trace-saver.js';

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
