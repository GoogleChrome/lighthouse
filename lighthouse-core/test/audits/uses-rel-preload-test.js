/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env jest */

const UsesRelPreload = require('../../audits/uses-rel-preload.js');
const assert = require('assert').strict;

const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const createTestTrace = require('../create-test-trace.js');

const defaultMainResourceUrl = 'http://www.example.com/';
const defaultMainResource = {
  requestId: '1',
  url: defaultMainResourceUrl,
  startTime: 0,
  priority: 'VeryHigh',
  timing: {
    connectStart: 147.848,
    connectEnd: 180.71,
    sslStart: 151.87,
    sslEnd: 180.704,
    sendStart: 181.443,
    sendEnd: 181.553,
    receiveHeadersEnd: 500,
  },
};

describe('Performance: uses-rel-preload audit', () => {
  const mockArtifacts = (networkRecords, finalUrl) => {
    return {
      traces: {[UsesRelPreload.DEFAULT_PASS]: createTestTrace({traceEnd: 5000})},
      devtoolsLogs: {[UsesRelPreload.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalUrl},
    };
  };

  function getMockNetworkRecords() {
    const secondRecordUrl = 'http://www.example.com/script.js';
    return [
      defaultMainResource,
      {
        requestId: '2',
        startTime: 10,
        isLinkPreload: false,
        url: secondRecordUrl,
        timing: defaultMainResource.timing,
        priority: 'High',
        initiator: {
          type: 'parser',
          url: defaultMainResourceUrl,
        },
      }, {
        // Normally this request would be flagged for preloading.
        requestId: '3',
        startTime: 20,
        isLinkPreload: false,
        url: 'http://www.example.com/a-different-script.js',
        timing: defaultMainResource.timing,
        priority: 'High',
        initiator: {
          type: 'parser',
          url: secondRecordUrl,
        },
      },
    ];
  }

  it('should suggest preload resource', () => {
    const rootNodeUrl = 'http://example.com:3000';
    const mainDocumentNodeUrl = 'http://www.example.com:3000';
    const scriptNodeUrl = 'http://www.example.com/script.js';
    const scriptAddedNodeUrl = 'http://www.example.com/script-added.js';
    const scriptSubNodeUrl = 'http://sub.example.com/script-sub.js';
    const scriptOtherNodeUrl = 'http://otherdomain.com/script-other.js';

    const networkRecords = [
      {
        requestId: '2',
        priority: 'High',
        isLinkPreload: false,
        startTime: 0,
        endTime: 0.5,
        timing: {receiveHeadersEnd: 500},
        url: rootNodeUrl,
      },
      {
        requestId: '2:redirect',
        resourceType: 'Document',
        priority: 'High',
        isLinkPreload: false,
        startTime: 0.5,
        endTime: 1,
        timing: {receiveHeadersEnd: 500},
        url: mainDocumentNodeUrl,
      },
      {
        requestId: '3',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        startTime: 1,
        endTime: 2,
        timing: {receiveHeadersEnd: 1000},
        url: scriptNodeUrl,
        initiator: {type: 'parser', url: mainDocumentNodeUrl},
      },
      {
        requestId: '4',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        startTime: 2,
        endTime: 3.25,
        timing: {receiveHeadersEnd: 1250},
        url: scriptAddedNodeUrl,
        initiator: {type: 'script', url: scriptNodeUrl},
      },
      {
        requestId: '5',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        startTime: 2,
        endTime: 3,
        timing: {receiveHeadersEnd: 1000},
        url: scriptSubNodeUrl,
        initiator: {type: 'script', url: scriptNodeUrl},
      },
      {
        requestId: '6',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        startTime: 2,
        endTime: 3.5,
        timing: {receiveHeadersEnd: 1500},
        url: scriptOtherNodeUrl,
        initiator: {type: 'script', url: scriptNodeUrl},
      },
    ];

    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const context = {settings: {}, computedCache: new Map()};
    return UsesRelPreload.audit(artifacts, context).then(
      output => {
        assert.equal(output.details.overallSavingsMs, 330);
        assert.equal(output.details.items.length, 2);
        assert.equal(output.details.items[0].url, scriptSubNodeUrl);
        assert.equal(output.details.items[0].wastedMs, 330);
        assert.equal(output.details.items[1].url, scriptAddedNodeUrl);
        assert.equal(output.details.items[1].wastedMs, 180);
      }
    );
  });

  it(`should suggest preload for worthy records`, () => {
    const networkRecords = getMockNetworkRecords();

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    return UsesRelPreload.audit(artifacts, context).then(output => {
      assert.equal(output.details.overallSavingsMs, 314);
      assert.equal(output.details.items.length, 1);
    });
  });

  it(`should warn about failed preload attempts`, async () => {
    const networkRecords = [
      ...getMockNetworkRecords(),
      {
        requestId: '4',
        startTime: 10,
        isLinkPreload: true,
        url: 'http://www.example.com/preload.css',
        timing: defaultMainResource.timing,
        priority: 'High',
        initiator: {
          type: 'parser',
          url: defaultMainResourceUrl,
        },
      },
      {
        requestId: '5',
        startTime: 15,
        isLinkPreload: false,
        url: 'http://www.example.com/preload.css',
        timing: defaultMainResource.timing,
        priority: 'High',
        initiator: {
          type: 'parser',
          url: defaultMainResourceUrl,
        },
      },
    ];

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreload.audit(artifacts, context);
    expect(result.warnings).toHaveLength(1);
  });

  it(`should not warn about failed preload attempts between frames`, async () => {
    const networkRecords = [
      ...getMockNetworkRecords(),
      {
        frameId: 'frameA',
        requestId: '4',
        startTime: 10,
        isLinkPreload: true,
        url: 'http://www.example.com/preload.css',
        timing: defaultMainResource.timing,
        priority: 'High',
        initiator: {
          type: 'parser',
          url: defaultMainResourceUrl,
        },
      },
      {
        frameId: 'frameB',
        requestId: '5',
        startTime: 15,
        isLinkPreload: false,
        url: 'http://www.example.com/preload.css',
        timing: defaultMainResource.timing,
        priority: 'High',
        initiator: {
          type: 'parser',
          url: defaultMainResourceUrl,
        },
      },
    ];

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreload.audit(artifacts, context);
    expect(result.warnings).toBeUndefined();
  });

  it(`shouldn't suggest preload for already preloaded records`, () => {
    const networkRecords = getMockNetworkRecords();
    networkRecords[2].isLinkPreload = true;

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    return UsesRelPreload.audit(artifacts, context).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.details.overallSavingsMs, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it(`shouldn't suggest preload for requests in other frames`, async () => {
    const networkRecords = getMockNetworkRecords();
    networkRecords[2].frameId = 'not a matching frame';

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    const result = await UsesRelPreload.audit(artifacts, context);
    expect(result).toMatchObject({score: 1, details: {overallSavingsMs: 0, items: []}});
  });

  it(`shouldn't suggest preload for protocol data`, () => {
    const networkRecords = getMockNetworkRecords();
    networkRecords[2].protocol = 'data';

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    return UsesRelPreload.audit(artifacts, context).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.details.overallSavingsMs, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it(`shouldn't suggest preload for protocol blob`, () => {
    const networkRecords = getMockNetworkRecords();
    networkRecords[2].protocol = 'blob';

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    return UsesRelPreload.audit(artifacts, context).then(output => {
      assert.equal(output.numericValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it(`shouldn't suggest preload for protocol intent`, () => {
    const networkRecords = getMockNetworkRecords();
    networkRecords[2].protocol = 'intent';

    const artifacts = mockArtifacts(networkRecords, defaultMainResourceUrl);
    const context = {settings: {}, computedCache: new Map()};
    return UsesRelPreload.audit(artifacts, context).then(output => {
      assert.equal(output.numericValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it('does not throw on a real trace/devtools log', async () => {
    const artifacts = {
      URL: {finalUrl: 'https://pwa.rocks/'},
      traces: {
        [UsesRelPreload.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [UsesRelPreload.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await UsesRelPreload.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.numericValue, 0);
  });
});
