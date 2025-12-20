/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env jest */

const UsesRelPreconnect = require('../../audits/uses-rel-preconnect.js');
const assert = require('assert').strict;
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

const mainResource = {
  url: 'https://www.example.com/',
  parsedURL: {
    securityOrigin: 'https://www.example.com',
  },
  endTime: 1,
};

describe('Performance: uses-rel-preconnect audit', () => {
  it(`shouldn't suggest preconnect for same origin`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://www.example.com/request',
        timing: {receiveHeadersEnd: 3},
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, numericValue, details} = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(score, 1);
    assert.equal(numericValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when initiator is main resource`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: {
          type: 'parser',
          url: mainResource.url,
        },
        timing: {receiveHeadersEnd: 3},
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, numericValue, details} = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(score, 1);
    assert.equal(numericValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest non http(s) protocols as preconnect`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'data:text/plain;base64,hello',
        initiator: {},
        timing: {receiveHeadersEnd: 3},
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, numericValue, details} = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(score, 1);
    assert.equal(numericValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when already connected to the origin`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: {},
        timing: {
          dnsStart: -1,
          dnsEnd: -1,
          connectEnd: -1,
          connectStart: -1,
          receiveHeadersEnd: 3,
        },
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, numericValue, details} = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(score, 1);
    assert.equal(numericValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when request has been fired after 15s`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: {},
        startTime: 16,
        timing: {receiveHeadersEnd: 20},
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, numericValue, details} = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(score, 1);
    assert.equal(numericValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`warns when origin has preconnect directive but not used`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 150,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
      },
    ];
    const artifacts = {
      LinkElements: [{rel: 'preconnect', href: 'https://cdn.example.com/'}],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, warnings} = await UsesRelPreconnect.audit(artifacts, context);
    expect(score).toBe(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toBeDisplayString(/cdn.example.com.*not used/);
  });

  it(`should only list an origin once`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/first',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 150,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
      },
      {
        url: 'https://cdn.example.com/second',
        initiator: {},
        startTime: 3,
        timing: {
          dnsStart: 300,
          connectStart: 350,
          connectEnd: 400,
          receiveHeadersEnd: 3.4,
        },
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {numericValue, extendedInfo} = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(numericValue, 300);
    assert.equal(extendedInfo.value.length, 1);
    assert.deepStrictEqual(extendedInfo.value, [
      {url: 'https://cdn.example.com', wastedMs: 300},
    ]);
  });

  it(`should give a list of preconnected origins`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'http://cdn.example.com/first',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 250,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
      },
      {
        url: 'https://othercdn.example.com/second',
        initiator: {},
        startTime: 1.2,
        timing: {
          dnsStart: 100,
          connectStart: 200,
          connectEnd: 600,
          receiveHeadersEnd: 1.8,
        },
      },
    ];
    const artifacts = {
      LinkElements: [],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const {
      numericValue,
      extendedInfo,
      warnings,
    } = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(numericValue, 300);
    assert.equal(extendedInfo.value.length, 2);
    assert.deepStrictEqual(extendedInfo.value, [
      {url: 'https://othercdn.example.com', wastedMs: 300},
      {url: 'http://cdn.example.com', wastedMs: 150},
    ]);
    assert.equal(warnings.length, 0);
  });

  it('should pass if the correct number of preconnects found', async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'http://cdn.example.com/first',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 250,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
      },
    ];
    const artifacts = {
      LinkElements: [
        {rel: 'preconnect', href: 'https://cdn1.example.com/'},
        {rel: 'preconnect', href: 'https://cdn2.example.com/'},
      ],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.deepStrictEqual(result.warnings, []);
  });

  it('should pass with a warning if too many preconnects found', async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'http://cdn.example.com/first',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 250,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
      },
    ];
    const artifacts = {
      LinkElements: [
        {rel: 'preconnect', href: 'https://cdn1.example.com/'},
        {rel: 'preconnect', href: 'https://cdn2.example.com/'},
        {rel: 'preconnect', href: 'https://cdn3.example.com/'},
      ],
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl: mainResource.url},
    };

    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.warnings.length, 1);
  });
});
