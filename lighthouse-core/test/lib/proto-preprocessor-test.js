/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {processForProto} = require('../../lib/proto-preprocessor.js');
const sampleJson = require('../results/sample_v2.json');

/* eslint-env jest */
describe('processing for proto', () => {
  it('doesn\'t modify the input object', () => {
    const input = JSON.parse(JSON.stringify(sampleJson));
    processForProto(input);
    expect(input).toEqual(sampleJson);
  });

  it('keeps only necessary configSettings', () => {
    const input = {
      'configSettings': {
        'output': [
          'json',
        ],
        'maxWaitForLoad': 45000,
        'throttlingMethod': 'devtools',
        'throttling': {
          'rttMs': 150,
          'throughputKbps': 1638.4,
          'requestLatencyMs': 562.5,
          'downloadThroughputKbps': 1474.5600000000002,
          'uploadThroughputKbps': 675,
          'cpuSlowdownMultiplier': 4,
        },
        'gatherMode': false,
        'disableStorageReset': false,
        'emulatedFormFactor': 'mobile',
        'locale': 'en-US',
        'blockedUrlPatterns': null,
        'additionalTraceCategories': null,
        'extraHeaders': null,
        'onlyAudits': null,
        'onlyCategories': null,
        'skipAudits': null,
      },
    };
    const expectation = {
      'configSettings': {
        'emulatedFormFactor': 'mobile',
        'locale': 'en-US',
        'onlyCategories': null,
      },
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });

  it('cleans up default runtimeErrors', () => {
    const input = {
      'runtimeError': {
        'code': 'NO_ERROR',
      },
    };

    const output = processForProto(input);

    expect(output).not.toHaveProperty('runtimeError');
  });

  it('non-default runtimeErrors are untouched', () => {
    const input = {
      'runtimeError': {
        'code': 'ERROR_NO_DOCUMENT_REQUEST',
      },
    };

    const output = processForProto(input);

    expect(output).toMatchObject(input);
  });

  it('cleans up audits', () => {
    const input = {
      'audits': {
        'critical-request-chains': {
          'scoreDisplayMode': 'not-applicable',
          'numericValue': 14.3,
          'displayValue': ['hello %d', 123],
        },
      },
    };
    const expectation = {
      'audits': {
        'critical-request-chains': {
          'scoreDisplayMode': 'notApplicable',
          'displayValue': 'hello %d | 123',
        },
      },
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });


  it('removes i18n icuMessagePaths', () => {
    const input = {
      'i18n': {
        'icuMessagePaths': {
          'content': 'paths',
        },
      },
    };
    const expectation = {
      'i18n': {},
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });

  it('removes empty strings', () => {
    const input = {
      'audits': {
        'critical-request-chains': {
          'details': {
            'chains': {
              '1': '',
            },
          },
        },
      },
      'i18n': {
        'icuMessagePaths': {
          'content': 'paths',
        },
        '2': '',
        '3': [
          {
            'hello': 'world',
            '4': '',
          },
        ],
      },
    };
    const expectation = {
      'audits': {
        'critical-request-chains': {
          'details': {
            'chains': {},
          },
        },
      },
      'i18n': {
        '3': [
          {'hello': 'world'},
        ],
      },
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });
});
