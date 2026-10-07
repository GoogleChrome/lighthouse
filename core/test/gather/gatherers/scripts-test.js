/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Scripts from '../../../gather/gatherers/scripts.js';
import {createMockContext} from '../mock-driver.js';

describe('Scripts gatherer', () => {
  it('reuses script source from trace rundown events before calling getScriptSource', async () => {
    const gatherer = new Scripts();
    const mockContext = createMockContext();
    const session = mockContext.driver.defaultSession;

    session.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.disable')
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.getScriptSource', {scriptSource: 'console.log("from-cdp");'})
      .mockResponse('Debugger.disable');

    await gatherer.startInstrumentation(mockContext.asContext());

    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '1',
      url: 'https://example.com/a.js',
      embedderName: 'https://example.com/a.js',
    }));
    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '2',
      url: 'https://example.com/b.js',
      embedderName: 'https://example.com/b.js',
    }));
    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '3',
      url: 'https://example.com/c.js',
      embedderName: 'https://example.com/c.js',
    }));

    await gatherer.stopInstrumentation(mockContext.asContext());

    const trace = {
      traceEvents: [
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {data: {scriptId: 1, sourceText: 'console.log("from-trace");'}},
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'LargeScriptCatchup',
          args: {data: {scriptId: 2, sourceText: 'part1-'}},
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'LargeScriptCatchup',
          args: {data: {scriptId: 2, sourceText: 'part2'}},
        },
      ],
    };

    const artifact = await gatherer.getArtifact({
      ...mockContext.asContext(),
      dependencies: /** @type {any} */ ({Trace: trace}),
    });

    expect(session.sendCommand.mock.calls.map(c => c[0])).toEqual([
      'Debugger.enable',
      'Debugger.disable',
      'Debugger.enable',
      'Debugger.getScriptSource',
      'Debugger.disable',
    ]);
    expect(session.sendCommand.findAllInvocations('Debugger.getScriptSource')).toEqual([
      {scriptId: '3'},
    ]);
    expect(artifact).toEqual([
      {
        name: 'https://example.com/a.js',
        scriptId: '1',
        url: 'https://example.com/a.js',
        embedderName: 'https://example.com/a.js',
        content: 'console.log("from-trace");',
      },
      {
        name: 'https://example.com/b.js',
        scriptId: '2',
        url: 'https://example.com/b.js',
        embedderName: 'https://example.com/b.js',
        content: 'part1-part2',
      },
      {
        name: 'https://example.com/c.js',
        scriptId: '3',
        url: 'https://example.com/c.js',
        embedderName: 'https://example.com/c.js',
        content: 'console.log("from-cdp");',
      },
    ]);
  });

  it('does not re-enable Debugger in getArtifact when all scripts are in trace', async () => {
    const gatherer = new Scripts();
    const mockContext = createMockContext();
    const session = mockContext.driver.defaultSession;

    session.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '1',
      url: 'https://example.com/a.js',
      embedderName: 'https://example.com/a.js',
    }));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const trace = {
      traceEvents: [
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {data: {scriptId: 1, sourceText: 'console.log("from-trace");'}},
        },
      ],
    };

    const artifact = await gatherer.getArtifact({
      ...mockContext.asContext(),
      dependencies: /** @type {any} */ ({Trace: trace}),
    });

    expect(session.sendCommand.mock.calls.map(c => c[0])).toEqual([
      'Debugger.enable',
      'Debugger.disable',
    ]);
    expect(artifact[0].content).toBe('console.log("from-trace");');
  });
});
