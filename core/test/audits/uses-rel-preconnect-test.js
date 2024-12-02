/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import UsesRelPreconnect from '../../audits/uses-rel-preconnect.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {createTestTrace} from '../create-test-trace.js';

const mainResource = {
  url: 'https://www.example.com/',
  timing: {receiveHeadersEnd: 0.5},
  networkEndTime: 1000,
  priority: 'High',
};

function buildArtifacts(networkRecords, fcpTs) {
  for (const record of networkRecords) {
    record.transferSize = record.transferSize ?? 1000;
  }

  const trace = createTestTrace({
    timeOrigin: 0,
    largestContentfulPaint: 5000,
    firstContentfulPaint: fcpTs ? fcpTs : 5000,
    topLevelTasks: [{ts: 1000, duration: 50}],
  });
  const devtoolsLog = networkRecordsToDevtoolsLog(networkRecords);

  return {
    LinkElements: [],
    URL: {
      requestedUrl: mainResource.url,
      mainDocumentUrl: mainResource.url,
      finalDisplayedUrl: mainResource.url,
    },
    devtoolsLogs: {defaultPass: devtoolsLog},
    traces: {defaultPass: trace},
  };
}

describe('Performance: uses-rel-preconnect audit', () => {
  it(`shouldn't suggest preconnect for same origin`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://www.example.com/request',
        timing: {receiveHeadersEnd: 3},
      },
    ];

    const artifacts = buildArtifacts(networkRecords);
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

    const artifacts = buildArtifacts(networkRecords);
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

    const artifacts = buildArtifacts(networkRecords);
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

    const artifacts = buildArtifacts(networkRecords);
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
        networkRequestTime: 1_600,
        timing: {receiveHeadersEnd: 20},
      },
    ];

    const artifacts = buildArtifacts(networkRecords);
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
        networkRequestTime: 2000,
        timing: {
          dnsStart: 100,
          connectStart: 150,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
      },
    ];

    const artifacts = {
      ...buildArtifacts(networkRecords),
      LinkElements: [{rel: 'preconnect', href: 'https://cdn.example.com/'}],
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
        networkRequestTime: 2000,
        timing: {
          dnsStart: 100,
          connectStart: 150,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
        priority: 'High',
      },
      {
        url: 'https://cdn.example.com/second',
        initiator: {},
        networkRequestTime: 3000,
        timing: {
          dnsStart: 300,
          connectStart: 350,
          connectEnd: 400,
          receiveHeadersEnd: 3.4,
        },
        priority: 'High',
      },
    ];

    const artifacts = buildArtifacts(networkRecords);
    const context = {settings: {}, computedCache: new Map()};
    const {numericValue, details, metricSavings} =
      await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(numericValue, 300);
    assert.equal(details.items.length, 1);
    assert.deepStrictEqual(details.items, [
      {url: 'https://cdn.example.com', wastedMs: 300},
    ]);
    assert.deepStrictEqual(metricSavings, {LCP: 300, FCP: 300});
  });

  it(`should give a list of important preconnected origins`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'http://cdn.example.com/first',
        initiator: {},
        networkRequestTime: 2000,
        timing: {
          dnsStart: 100,
          connectStart: 250,
          connectEnd: 300,
          receiveHeadersEnd: 2.3,
        },
        priority: 'High',
      },
      {
        url: 'https://othercdn.example.com/second',
        initiator: {},
        networkRequestTime: 1_200,
        timing: {
          dnsStart: 100,
          connectStart: 200,
          connectEnd: 600,
          receiveHeadersEnd: 1.8,
        },
        priority: 'High',
      },
      {
        url: 'https://unimportant.example.com/second',
        initiator: {},
        networkRequestTime: 6000,
        networkEndTime: 8000, // ends *after* LCP
        timing: {
          dnsStart: 100,
          connectStart: 200,
          connectEnd: 600,
          receiveHeadersEnd: 1.8,
        },
        priority: 'High',
      },
    ];

    const artifacts = buildArtifacts(networkRecords);
    const context = {settings: {}, computedCache: new Map()};
    const {
      numericValue,
      details,
      warnings,
      metricSavings,
    } = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(numericValue, 300);
    assert.equal(details.items.length, 2);
    assert.deepStrictEqual(details.items, [
      {url: 'https://othercdn.example.com', wastedMs: 300},
      {url: 'http://cdn.example.com', wastedMs: 150},
    ]);
    assert.deepStrictEqual(metricSavings, {LCP: 300, FCP: 300});
    assert.equal(warnings.length, 0);
  });

  it('should pass if the correct number of preconnects found', async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn1.example.com/first',
        initiator: {},
        networkRequestTime: 2000,
        timing: {
          dnsStart: 100,
          dnsEnd: 100,
          connectStart: 250,
          connectEnd: 250,
          receiveHeadersEnd: 2.3,
        },
      },
      {
        url: 'https://cdn2.example.com/first',
        initiator: {},
        networkRequestTime: 2000,
        timing: {
          dnsStart: 100,
          dnsEnd: 100,
          connectStart: 250,
          connectEnd: 250,
          receiveHeadersEnd: 2.3,
        },
      },
    ];

    const artifacts = {
      ...buildArtifacts(networkRecords),
      LinkElements: [
        {rel: 'preconnect', href: 'https://cdn1.example.com/'},
        {rel: 'preconnect', href: 'https://cdn2.example.com/'},
      ],
    };

    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.deepStrictEqual(result.warnings, []);
  });

  it('should pass with a warning if too many preconnects found', async () => {
    const timing = {
      dnsStart: 100,
      dnsEnd: 100,
      connectStart: 250,
      connectEnd: 250,
      receiveHeadersEnd: 2.1,
    };

    const networkRecords = [
      mainResource,
      {url: 'https://cdn1.example.com/first', initiator: {}, networkRequestTime: 2000, timing},
      {url: 'https://cdn2.example.com/first', initiator: {}, networkRequestTime: 2000, timing},
      {url: 'https://cdn3.example.com/first', initiator: {}, networkRequestTime: 2000, timing},
    ];

    const artifacts = {
      ...buildArtifacts(networkRecords),
      LinkElements: [
        {rel: 'preconnect', href: 'https://cdn1.example.com/'},
        {rel: 'preconnect', href: 'https://cdn2.example.com/'},
        {rel: 'preconnect', href: 'https://cdn3.example.com/'},
      ],
    };

    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.warnings.length, 1);
  });

  it('should pass with a warning if the page preconnects to an origin that isnt used', async () => {
    const artifacts = {
      ...buildArtifacts([mainResource]),
      LinkElements: [
        {rel: 'preconnect', href: 'https://definitely-not-used.example.com/'},
      ],
    };

    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.warnings.length, 1);
  });

  it('should have LCP savings and not FCP savings', async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/second',
        initiator: {},
        networkRequestTime: 4000, // starts *after* FCP
        networkEndTime: 4500, // ends *before* LCP
        timing: {
          dnsStart: 100,
          connectStart: 200,
          connectEnd: 300,
        },
        priority: 'High',
      },
    ];

    const artifacts = buildArtifacts(networkRecords, 4000);
    const context = {settings: {}, computedCache: new Map()};
    const {numericValue, details, metricSavings} =
      await UsesRelPreconnect.audit(artifacts, context);
    assert.equal(numericValue, 300);
    assert.equal(details.items.length, 1);
    assert.deepStrictEqual(details.items, [
      {url: 'https://cdn.example.com', wastedMs: 300},
    ]);
    assert.deepStrictEqual(metricSavings, {LCP: 300, FCP: 0});
  });
});
