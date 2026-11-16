/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import JsUsage from '../../../gather/gatherers/js-usage.js';
import {createMockContext} from '../../gather/mock-driver.js';
import {flushAllTimersAndMicrotasks, timers} from '../../test-utils.js';

describe('JsUsage gatherer', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  /**
   * `scriptParsedEvents` mocks the `Debugger.scriptParsed` events.
   * `coverage` mocks the result of `Profiler.takePreciseCoverage`.
   * @param {{coverage: Array<Partial<LH.Crdp.Profiler.ScriptCoverage>>, scriptParsedEvents?: Array<Partial<LH.Crdp.Debugger.ScriptParsedEvent>>}} _
   * @return {Promise<LH.Artifacts['JsUsage']>}
   */
  async function runJsUsage({coverage}) {
    const context = createMockContext();
    context.driver._session.sendCommand
      .mockResponse('Profiler.enable', {})
      .mockResponse('Profiler.disable', {})
      .mockResponse('Profiler.startPreciseCoverage', {})
      .mockResponse('Profiler.takePreciseCoverage', {result: coverage})
      .mockResponse('Profiler.stopPreciseCoverage', {});

    const gatherer = new JsUsage();
    await gatherer.startInstrumentation(context.asContext());
    await gatherer.startSensitiveInstrumentation(context.asContext());

    // Needed for protocol events to emit.
    await flushAllTimersAndMicrotasks(1);

    await gatherer.stopSensitiveInstrumentation(context.asContext());
    await gatherer.stopInstrumentation(context.asContext());

    expect(gatherer._scriptUsages).toEqual(coverage);

    return gatherer.getArtifact();
  }

  it('collects coverage data', async () => {
    const coverage = [
      {scriptId: '1', url: 'https://www.example.com'},
      {scriptId: '2', url: 'https://www.example.com'},
    ];
    const artifact = await runJsUsage({coverage});
    expect(artifact).toMatchInlineSnapshot(`
Object {
  "1": Object {
    "scriptId": "1",
    "url": "https://www.example.com",
  },
  "2": Object {
    "scriptId": "2",
    "url": "https://www.example.com",
  },
}
`);
  });

  it('ignore coverage data with empty url', async () => {
    const coverage = [{scriptId: '1', url: ''}];
    const artifact = await runJsUsage({coverage});
    expect(artifact).toMatchInlineSnapshot(`Object {}`);
  });

  it('ignore coverage if for empty url', async () => {
    const coverage = [
      {scriptId: '1', url: 'https://www.example.com'},
      {scriptId: '2', url: ''},
    ];
    const scriptParsedEvents = [
      {scriptId: '1', embedderName: ''},
      {scriptId: '2', embedderName: 'https://www.example.com'},
    ];
    const artifact = await runJsUsage({coverage, scriptParsedEvents});
    expect(artifact).toMatchInlineSnapshot(`
Object {
  "1": Object {
    "scriptId": "1",
    "url": "https://www.example.com",
  },
}
`);
  });

  it('does not have entry for script with no coverage data', async () => {
    const context = createMockContext();
    context.gatherMode = 'timespan';
    context.driver._session.on
      .mockEvent('Debugger.scriptParsed', {
        scriptId: '1',
        embedderName: 'https://www.example.com',
      })
      .mockEvent('Debugger.scriptParsed', {
        scriptId: '2',
        embedderName: 'https://www.example.com/script.js',
      });
    context.driver._session.sendCommand
      .mockResponse('Profiler.enable', {})
      .mockResponse('Profiler.disable', {})
      .mockResponse('Profiler.startPreciseCoverage', {})
      .mockResponse('Profiler.takePreciseCoverage', {
        result: [{
          scriptId: '1',
          url: 'https://www.example.com',
          functions: [],
        }],
      })
      .mockResponse('Profiler.stopPreciseCoverage', {});

    const gatherer = new JsUsage();
    await gatherer.startInstrumentation(context.asContext());
    await gatherer.startSensitiveInstrumentation(context.asContext());

    // Needed for protocol events to emit.
    await flushAllTimersAndMicrotasks(1);

    await gatherer.stopSensitiveInstrumentation(context.asContext());
    await gatherer.stopInstrumentation(context.asContext());

    const artifact = await gatherer.getArtifact();

    expect(artifact).toEqual({
      '1': {
        scriptId: '1',
        url: 'https://www.example.com',
        functions: [],
      },
    });
  });
});
