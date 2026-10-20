/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Scripts from '../../../gather/gatherers/scripts.js';
import {createMockContext, createMockSession} from '../mock-driver.js';

describe('Scripts gatherer', () => {
  it('reuses script source from trace rundown events before calling getScriptSource', async () => {
    const gatherer = new Scripts();
    const mockContext = createMockContext();
    const session = mockContext.driver.defaultSession;

    session.sendCommand
      .mockResponse('Debugger.enable')
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

  it('skips getScriptSource when all scripts are in trace', async () => {
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

  it('disambiguates colliding scriptIds across V8 isolates', async () => {
    const gatherer = new Scripts();
    const mockContext = createMockContext();
    const session = mockContext.driver.defaultSession;

    session.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.getScriptSource', {scriptSource: 'console.log("main-2-from-cdp");'})
      .mockResponse('Debugger.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '1',
      executionContextId: 1,
      executionContextAuxData: {frameId: 'MAIN_FRAME'},
      url: 'https://example.com/main.js',
      embedderName: 'https://example.com/main.js',
    }));
    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '2',
      executionContextId: 1,
      executionContextAuxData: {frameId: 'MAIN_FRAME'},
      url: 'https://example.com/missing-in-main-trace.js',
      embedderName: 'https://example.com/missing-in-main-trace.js',
    }));
    gatherer.onScriptParsed(/** @type {any} */ ({
      scriptId: '3',
      executionContextId: 1,
      executionContextAuxData: {frameId: 'MAIN_FRAME'},
      url: 'https://example.com/shared.js',
      embedderName: 'https://example.com/shared.js',
    }));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const trace = {
      traceEvents: [
        // Script 1: present in both main isolate and worker isolate with same scriptId.
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-main',
              scriptId: 1,
              executionContextId: 1,
              url: 'https://example.com/main.js',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-main',
              scriptId: 1,
              sourceText: 'console.log("main-1-from-trace");',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-worker',
              scriptId: 1,
              executionContextId: 1,
              url: 'https://example.com/worker.js',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-worker',
              scriptId: 1,
              sourceText: 'console.log("worker-1-from-trace");',
            },
          },
        },
        // Script 2: only worker isolate has scriptId 2 in trace; main isolate should fall back to CDP.
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-worker',
              scriptId: 2,
              executionContextId: 1,
              url: 'https://example.com/worker-only.js',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-worker',
              scriptId: 2,
              sourceText: 'console.log("worker-2-from-trace");',
            },
          },
        },
        // Script 3: same scriptId, URL, and executionContextId in both main frame and OOPIF/worker,
        // disambiguated via target-rundown frameId.
        {
          cat: 'disabled-by-default-devtools.target-rundown',
          name: 'ScriptCompiled',
          args: {
            data: {
              isolate: 'iso-main',
              scriptId: 3,
              frame: 'MAIN_FRAME',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-main',
              scriptId: 3,
              sourceText: 'console.log("main-3-from-trace");',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.target-rundown',
          name: 'ScriptCompiled',
          args: {
            data: {
              isolate: 'iso-oopif',
              scriptId: 3,
              frame: 'OOPIF_FRAME',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-oopif',
              scriptId: 3,
              sourceText: 'console.log("oopif-3-from-trace");',
            },
          },
        },
      ],
    };

    const artifact = await gatherer.getArtifact({
      ...mockContext.asContext(),
      dependencies: /** @type {any} */ ({Trace: trace}),
    });

    expect(session.sendCommand.findAllInvocations('Debugger.getScriptSource')).toEqual([
      {scriptId: '2'},
    ]);
    expect(artifact.map(s => ({scriptId: s.scriptId, content: s.content}))).toEqual([
      {scriptId: '1', content: 'console.log("main-1-from-trace");'},
      {scriptId: '2', content: 'console.log("main-2-from-cdp");'},
      {scriptId: '3', content: 'console.log("main-3-from-trace");'},
    ]);
  });

  it('collects scripts from iframe targets with targetId-prefixed scriptId', async () => {
    const gatherer = new Scripts();
    const mockContext = createMockContext();
    const pageSession = mockContext.driver.defaultSession;
    const iframeSession = createMockSession();

    pageSession.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.disable');

    iframeSession.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.getScriptSource', {scriptSource: 'console.log("oopif-from-cdp");'});
    iframeSession.sendCommandAndIgnore
      .mockResponse('Debugger.setSkipAllPauses')
      .mockResponse('Debugger.disable');

    mockContext.driver._targetManager.onTargetAttached.mockImplementation(
      /** @param {any} listener */
      async (listener) => {
        await listener({
          target: /** @type {any} */ ({type: 'page', targetId: 'MAIN_FRAME'}),
          session: pageSession,
        });
        await listener({
          target: /** @type {any} */ ({type: 'iframe', targetId: 'OOPIF_FRAME'}),
          session: iframeSession.asSession(),
        });
      }
    );

    await gatherer.startInstrumentation(mockContext.asContext());

    const pageScriptParsed = pageSession.on.getListeners('Debugger.scriptParsed')[0];
    const iframeScriptParsed = iframeSession.on.getListeners('Debugger.scriptParsed')[0];

    pageScriptParsed(/** @type {any} */ ({
      scriptId: '4',
      executionContextId: 1,
      executionContextAuxData: {frameId: 'MAIN_FRAME'},
      url: 'https://example.com/app.js',
      embedderName: 'https://example.com/app.js',
    }));
    iframeScriptParsed(/** @type {any} */ ({
      scriptId: '4',
      executionContextId: 1,
      executionContextAuxData: {frameId: 'OOPIF_FRAME'},
      url: 'https://oopif.example.com/module.js',
      embedderName: 'https://oopif.example.com/module.js',
    }));
    iframeScriptParsed(/** @type {any} */ ({
      scriptId: '5',
      executionContextId: 1,
      executionContextAuxData: {frameId: 'OOPIF_FRAME'},
      url: 'https://oopif.example.com/dynamic.js',
      embedderName: 'https://oopif.example.com/dynamic.js',
    }));

    await gatherer.stopInstrumentation(mockContext.asContext());

    const trace = {
      traceEvents: [
        {
          cat: 'disabled-by-default-devtools.target-rundown',
          name: 'ScriptCompiled',
          args: {data: {isolate: 'iso-main', scriptId: 4, frame: 'MAIN_FRAME'}},
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {isolate: 'iso-main', scriptId: 4, sourceText: 'console.log("main-trace");'},
          },
        },
        // OOPIF isolate emits target-rundown on scriptId 3, and ES module scriptId 4
        // inherits frame by isolate.
        {
          cat: 'disabled-by-default-devtools.target-rundown',
          name: 'ScriptCompiled',
          args: {data: {isolate: 'iso-oopif', scriptId: 3, frame: 'OOPIF_FRAME'}},
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-oopif',
              scriptId: 4,
              executionContextId: 1,
              url: 'https://oopif.example.com/module.js',
            },
          },
        },
        {
          cat: 'disabled-by-default-devtools.v8-source-rundown-sources',
          name: 'ScriptCatchup',
          args: {
            data: {
              isolate: 'iso-oopif',
              scriptId: 4,
              sourceText: 'console.log("oopif-trace");',
            },
          },
        },
      ],
    };

    const artifact = await gatherer.getArtifact({
      ...mockContext.asContext(),
      dependencies: /** @type {any} */ ({Trace: trace}),
    });

    expect(iframeSession.sendCommand.findAllInvocations('Debugger.getScriptSource')).toEqual([
      {scriptId: '5'},
    ]);
    expect(artifact.map(s => ({scriptId: s.scriptId, url: s.url, content: s.content}))).toEqual([
      {
        scriptId: '4',
        url: 'https://example.com/app.js',
        content: 'console.log("main-trace");',
      },
      {
        scriptId: 'OOPIF_FRAME:4',
        url: 'https://oopif.example.com/module.js',
        content: 'console.log("oopif-trace");',
      },
      {
        scriptId: 'OOPIF_FRAME:5',
        url: 'https://oopif.example.com/dynamic.js',
        content: 'console.log("oopif-from-cdp");',
      },
    ]);
  });
});
