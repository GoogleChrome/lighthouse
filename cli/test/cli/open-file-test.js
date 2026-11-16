/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EventEmitter} from 'events';
import path from 'path';

import * as td from 'testdouble';

import {fnAny} from '../../../core/test/test-utils.js';

describe('openFile', () => {
  const originalPlatform = process.platform;
  const filePath = path.resolve('report, a=b.html');
  const mockWarn = fnAny();
  const mockUnref = fnAny();
  /** @type {EventEmitter} */
  let child;
  const mockSpawn = fnAny().mockImplementation(() => {
    child = Object.assign(new EventEmitter(), {unref: mockUnref});
    return child;
  });

  /** @type {typeof import('../../open-file.js').openFile} */
  let openFile;

  before(async () => {
    await td.replaceEsm('child_process', {spawn: mockSpawn});
    await td.replaceEsm('../../../core/lib/lighthouse-logger.js', undefined, {warn: mockWarn});
    // @ts-expect-error - query string busts ESM cache so td.replaceEsm takes effect
    ({openFile} = await import('../../open-file.js?mocked'));
  });

  after(() => {
    td.reset();
    Object.defineProperty(process, 'platform', {value: originalPlatform});
  });

  beforeEach(() => {
    mockSpawn.mockClear();
    mockUnref.mockClear();
    mockWarn.mockClear();
  });

  const cases = [
    {platform: 'darwin', command: 'open', args: [filePath], options: {}},
    {platform: 'linux', command: 'xdg-open', args: [filePath], options: {}},
    {
      platform: 'win32',
      command: 'explorer.exe',
      args: [`"${filePath}"`],
      options: {windowsVerbatimArguments: true},
    },
  ];

  for (const {platform, command, args, options} of cases) {
    it(`spawns ${command} on ${platform} and warns on error`, () => {
      Object.defineProperty(process, 'platform', {value: platform});
      openFile('report, a=b.html');

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(command, args,
        {stdio: 'ignore', detached: true, ...options});
      expect(mockUnref).toHaveBeenCalled();

      child.emit('error', new Error(`spawn ${command} ENOENT`));
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockWarn.mock.calls[0][0]).toEqual('CLI');
      expect(mockWarn.mock.calls[0][1]).toContain('ENOENT');
    });
  }
});
