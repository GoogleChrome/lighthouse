/**
* @license Copyright 2017 Google LLC
* SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ConsoleMessagesGatherer from '../../../gather/gatherers/console-messages.js';

class MockSession {
  constructor() {
    this.listeners = new Map();
  }

  on(command, cb) {
    this.listeners.set(command, cb);
  }

  off() {}

  sendCommand() {
    return Promise.resolve();
  }

  fireForTest(command, event) {
    this.listeners.get(command)(event);
  }
}

class MockDriver {
  defaultSession = new MockSession;
}

describe('ConsoleMessages', () => {
  it('captures the exceptions raised', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const runtimeEx =
      {
        'timestamp': 1506535813608.003,
        'exceptionDetails': {
          'url': 'http://www.example.com/fancybox.js',
          'lineNumber': 28,
          'columnNumber': 20,
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

    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Runtime.exceptionThrown', runtimeEx);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].source, 'exception');
    assert.equal(artifact[0].level, 'error');
    assert.equal(artifact[0].text,
      `TypeError: Cannot read property 'msie' of undefined`);
    assert.equal(artifact[0].url, 'http://www.example.com/fancybox.js');
    assert.equal(artifact[0].lineNumber, 28);
    assert.equal(artifact[0].columnNumber, 20);
  });

  it('captures console.warn calls', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const consoleWarnEvent =
      {
        type: 'warning',
        args: [
          {
            type: 'string',
            value: 'This is a warning!',
          },
        ],
        executionContextId: 4,
        timestamp: 1605300392523.653,
        stackTrace: {
          callFrames: [
            {
              url: 'http://www.example.com/fancybox.js',
              lineNumber: 28,
              columnNumber: 20,
            },
          ],
        },
      };

    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Runtime.consoleAPICalled', consoleWarnEvent);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].source, 'console.warn');
    assert.equal(artifact[0].level, 'warning');
    assert.equal(artifact[0].text, 'This is a warning!');
    assert.equal(artifact[0].url, 'http://www.example.com/fancybox.js');
    assert.equal(artifact[0].lineNumber, 28);
    assert.equal(artifact[0].columnNumber, 20);
  });

  it('captures falsey values', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const consoleWarnEvent =
      {
        type: 'warning',
        args: [
          {type: 'number', value: 0, description: '0'},
          {type: 'string', value: ''},
          {type: 'undefined'},
          {type: 'object', subtype: 'null', value: 'null'},
          {type: 'boolean', value: false},
          {type: 'number', unserializableValue: 'NaN', description: 'NaN'},
        ],
      };

    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Runtime.consoleAPICalled', consoleWarnEvent);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].source, 'console.warn');
    assert.equal(artifact[0].level, 'warning');
    assert.equal(artifact[0].text, '0  undefined null false NaN');
  });

  it('captures console.warn calls with non-string args', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const consoleWarnEvent =
      {
        type: 'warning',
        args: [
          {type: 'string', value: 'Testing'},
          // Not JSON (the window)
          {
            type: 'object',
            className: 'Window',
            description: 'Window',
            objectId: '{"injectedScriptId":4,"id":1}',
            preview: [
              {
                type: 'object',
                description: 'Window',
                overflow: true,
                properties: [
                  {name: 'window', type: 'object', value: 'Window'},
                  {name: 'self', type: 'object', value: 'Window'},
                  {
                    name: 'document',
                    type: 'object',
                    value: '#document',
                    subtype: 'node',
                  },
                  {name: 'name', type: 'string', value: ''},
                  {name: 'location', type: 'object', value: 'Location'},
                ],
              },
            ],
          },
          // JSON: {isJson: true}
          {
            type: 'object',
            className: 'Object',
            description: 'Object',
            objectId: '{"injectedScriptId":4,"id":2}',
            preview: {
              type: 'object',
              description: 'Object',
              overflow: false,
              properties: [{name: 'json', type: 'boolean', value: 'true'}],
            },
          },
          // An array
          {
            type: 'object',
            subtype: 'array',
            className: 'Array',
            description: 'Array(4)',
            objectId: '{"injectedScriptId":4,"id":5}',
            preview: {
              type: 'object',
              subtype: 'array',
              description: 'Array(4)', // Array(3) despite having 4 elements.
              overflow: false,
              properties: [
                {name: '0', type: 'object', value: 'Window'},
                {name: '1', type: 'string', value: '2'},
                {name: '2', type: 'string', value: '3'},
                {name: '3', type: 'function', value: ''},
              ],
            },
          },
          // A native function: console.log
          {
            type: 'function',
            className: 'Function',
            description: 'function log() { [native code] }',
            objectId: '{"injectedScriptId":4,"id":3}',
          },
          // A defined function
          {
            type: 'function',
            className: 'Function',
            description: '() => {}',
            objectId: '{"injectedScriptId":4,"id":4}',
          },
          // A Date
          {
            type: 'object',
            subtype: 'date',
            className: 'Date',
            description: 'Tue Dec 01 2020 16:25:58 GMT-0500',
            objectId: '{"injectedScriptId":4,"id":9}',
            preview: {
              type: 'object',
              subtype: 'date',
              description: 'Tue Dec 01 2020 16:25:58 GMT-0500',
              overflow: false,
              properties: [],
            },
          },
        ],
        executionContextId: 4,
        timestamp: 1605301791372.538,
        stackTrace: {
          callFrames: [
            {
              functionName: '',
              scriptId: '14',
              url: 'http://localhost:8000/test.html',
              lineNumber: 3,
              columnNumber: 8,
            },
          ],
        },
      };
    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Runtime.consoleAPICalled', consoleWarnEvent);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].source, 'console.warn');
    assert.equal(artifact[0].level, 'warning');
    assert.equal(artifact[0].text,
      'Testing [object Window] [object Object] Array(4) ' +
      'function log() { [native code] } () => {} ' +
      'Tue Dec 01 2020 16:25:58 GMT-0500');
    assert.equal(artifact[0].url, 'http://localhost:8000/test.html');
    assert.equal(artifact[0].lineNumber, 3);
    assert.equal(artifact[0].columnNumber, 8);
  });

  it('captures console.error calls', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const consoleErrorEvent =
      {
        type: 'error',
        args: [
          {
            type: 'string',
            value: 'Error! Error!',
          },
          {
            type: 'object',
            subtype: 'error',
            description: 'TypeError: test exception\n    at http://localhost:8000/test.html:8:15',
            overflow: false,
            properties: [
              {
                name: 'stack',
                type: 'string',
                value: 'TypeError: test exception\n    at http://localhost:8000/test.html:8:15',
              },
              {name: 'message', type: 'string', value: 'test exception'},
            ],
          },
        ],
        executionContextId: 4,
        timestamp: 1605300392523.653,
        stackTrace: {
          callFrames: [
            {
              url: 'http://www.example.com/fancybox.js',
              lineNumber: 28,
              columnNumber: 20,
            },
          ],
        },
      };

    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Runtime.consoleAPICalled', consoleErrorEvent);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].source, 'console.error');
    assert.equal(artifact[0].level, 'error');
    assert.equal(
      artifact[0].text,
      'Error! Error! TypeError: test exception\n    at http://localhost:8000/test.html:8:15');
  });

  it('ignores console.log calls', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const consoleLog =
      {
        type: 'log',
        args: [
          {
            type: 'string',
            value: 'I am just a log',
          },
        ],
        executionContextId: 4,
        timestamp: 1605300392523.653,
        stackTrace: {
          callFrames: [
            {
              url: 'http://www.example.com/fancybox.js',
              lineNumber: 28,
              columnNumber: 20,
            },
          ],
        },
      };

    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Runtime.consoleAPICalled', consoleLog);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 0);
  });

  it('captures log entries', async () => {
    const consoleGatherer = new ConsoleMessagesGatherer();
    const logEntries = [
      {
        entry: {
          source: 'violation',
          level: 'verbose',
          text: 'Avoid using document.write(). https://developers.google.com/web/updates/2016/08/removing-document-write',
          timestamp: 1605302299155.652,
          url: 'http://localhost:8000/test.html',
          lineNumber: 4,
          stackTrace: {
            callFrames: [
              {
                functionName: '',
                scriptId: '14',
                url: 'http://localhost:8000/test.html',
                lineNumber: 3,
                columnNumber: 8,
              },
            ],
          },
        },
      },
      {
        entry: {
          source: 'network',
          level: 'error',
          text:
              'Failed to load resource: the server responded with a status of 404 (File not found)',
          timestamp: 1605302299179.507,
          url: 'http://localhost:8000/favicon.ico',
          networkRequestId: '82074.2',
        },
      },
    ];

    const driver = new MockDriver();
    const options = {driver};

    await consoleGatherer.startInstrumentation(options);
    driver.defaultSession.fireForTest('Log.entryAdded', logEntries[0]);
    driver.defaultSession.fireForTest('Log.entryAdded', logEntries[1]);

    await consoleGatherer.stopInstrumentation(options);
    const artifact = await consoleGatherer.getArtifact(options);

    assert.equal(artifact.length, 2);

    assert.equal(artifact[0].source, 'violation');
    assert.equal(artifact[0].level, 'verbose');
    assert.equal(artifact[0].text, 'Avoid using document.write(). https://developers.google.com/web/updates/2016/08/removing-document-write');
    assert.equal(artifact[0].url, 'http://localhost:8000/test.html');

    assert.equal(artifact[1].source, 'network');
    assert.equal(artifact[1].level, 'error');
    assert.equal(
      artifact[1].text,
      'Failed to load resource: the server responded with a status of 404 (File not found)');
    assert.equal(artifact[1].url, 'http://localhost:8000/favicon.ico');
  });
});
