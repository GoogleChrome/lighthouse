/**
* @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const RuntimeExceptionsGatherer = require('../../../gather/gatherers/runtime-exceptions.js');
const assert = require('assert').strict;

const mockDriver = {
  off() {},
};

const wrapSendCommand = (mockDriver, runtimeEx) => {
  mockDriver = Object.assign({}, mockDriver);

  mockDriver.on = (name, cb) => {
    if (name === 'Runtime.exceptionThrown') {
      cb(runtimeEx);
    }
  };

  mockDriver.sendCommand = () => {
    return Promise.resolve();
  };

  return mockDriver;
};

describe('RuntimeExceptions', () => {
  it('captures the exceptions raised', () => {
    const runtimeExceptionsGatherer = new RuntimeExceptionsGatherer();
    const runtimeEx =
      {
        'timestamp': 1506535813608.003,
        'exceptionDetails': {
          'url': 'http://www.example.com/fancybox.js',
          'stackTrace': {
            'callFrames': [
              {
                'url': 'http://www.example.com/fancybox.js',
                'lineNumber': 28,
                'columnNumber': 20,
              },
            ],
          },
          'exception': {
            'className': 'TypeError',
            'description': 'TypeError: Cannot read property \'msie\' of undefined',
          },
          'executionContextId': 3,
        },
      };

    const options = {
      driver: wrapSendCommand(mockDriver, runtimeEx),
    };

    return Promise.resolve(
      runtimeExceptionsGatherer.beforePass(options))
      .then(_ => runtimeExceptionsGatherer.afterPass(options))
      .then((artifact) => {
        assert.equal(artifact[0].exceptionDetails.exception.description,
          `TypeError: Cannot read property 'msie' of undefined`);
        assert.equal(artifact[0].exceptionDetails.url,
          'http://www.example.com/fancybox.js');
      });
  });
});
