/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EventEmitter} from 'events';
import path from 'path';

import * as td from 'testdouble';
import * as jestMock from 'jest-mock';

import {getOpenCommands} from '../../open-file.js';
import {fnAny} from '../../../core/test/test-utils.js';

describe('getOpenCommands', () => {
  const filePath = '/tmp/some dir/report & stuff.html';

  it('uses `open` on macOS', () => {
    expect(getOpenCommands(filePath, {platform: 'darwin'})).toEqual([
      {command: 'open', args: [filePath]},
    ]);
  });

  it('uses `explorer.exe` on Windows', () => {
    const winPath = 'C:\\Users\\me\\some dir\\report & 100%.html';
    expect(getOpenCommands(winPath, {platform: 'win32'})).toEqual([
      {command: 'explorer.exe', args: [winPath]},
    ]);
  });

  it('uses `xdg-open` on Linux and other platforms', () => {
    expect(getOpenCommands(filePath, {platform: 'linux'})).toEqual([
      {command: 'xdg-open', args: [filePath]},
    ]);
    expect(getOpenCommands(filePath, {platform: 'freebsd'})).toEqual([
      {command: 'xdg-open', args: [filePath]},
    ]);
  });

  it('uses `explorer.exe` with the Windows path on WSL, falling back to `xdg-open`', () => {
    const windowsPath = '\\\\wsl.localhost\\Ubuntu\\tmp\\some dir\\report & stuff.html';
    expect(getOpenCommands(filePath, {platform: 'linux', windowsPath})).toEqual([
      {command: 'explorer.exe', args: [windowsPath]},
      {command: 'xdg-open', args: [filePath]},
    ]);
  });
});

describe('openFile', () => {
  /** @type {Array<EventEmitter & {unref: jestMock.Mock}>} */
  let children = [];
  const mockSpawn = fnAny().mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), {unref: jestMock.fn()});
    children.push(child);
    return child;
  });
  const mockWarn = fnAny();
  const mockReadFileSync = fnAny();
  const mockExecFileSync = fnAny();

  /** @type {typeof import('../../open-file.js')} */
  let openFileModule;

  before(async () => {
    await td.replaceEsm('child_process', {
      spawn: mockSpawn,
      execFileSync: mockExecFileSync,
    });
    await td.replaceEsm('fs', undefined, {
      readFileSync: mockReadFileSync,
      existsSync: () => false,
    });
    await td.replaceEsm('lighthouse-logger', undefined, {warn: mockWarn});
    // @ts-expect-error - query string busts ESM cache so td.replaceEsm takes effect
    openFileModule = await import('../../open-file.js?mocked');
  });

  after(() => {
    td.reset();
  });

  beforeEach(() => {
    children = [];
    mockSpawn.mockClear();
    mockWarn.mockClear();
    mockExecFileSync.mockReset();
    mockReadFileSync.mockReset();
    mockReadFileSync.mockReturnValue('Linux version 6.8.0 (gcc) #1 SMP');
  });

  it('spawns a detached, unref\'d process with an absolute path and no shell', () => {
    openFileModule.openFile('report.html');

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    const [command, args, options] = mockSpawn.mock.calls[0];
    const expectedCommands = getOpenCommands(path.resolve('report.html'), {
      platform: process.platform,
    });
    expect(command).toEqual(expectedCommands[0].command);
    expect(args).toEqual(expectedCommands[0].args);
    expect(options).toEqual({stdio: 'ignore', detached: true});
    expect(children[0].unref).toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('logs a warning instead of throwing when the command cannot be spawned', () => {
    openFileModule.openFile('/tmp/report.html');

    const error = Object.assign(new Error('spawn xdg-open ENOENT'), {code: 'ENOENT'});
    children[children.length - 1].emit('error', error);

    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0][0]).toEqual('CLI');
    expect(mockWarn.mock.calls[0][1]).toContain('ENOENT');
  });

  // isWsl() only checks /proc/version on Linux.
  const itOnLinux = process.platform === 'linux' ? it : it.skip;
  itOnLinux('opens via Windows on WSL, falling back to `xdg-open`', () => {
    mockReadFileSync.mockReturnValue('Linux version 5.15.0-microsoft-standard-WSL2');
    mockExecFileSync.mockReturnValue('\\\\wsl.localhost\\Ubuntu\\tmp\\report.html\n');
    openFileModule.openFile('/tmp/report.html');

    expect(mockExecFileSync.mock.calls[0].slice(0, 2))
      .toEqual(['wslpath', ['-w', '/tmp/report.html']]);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockSpawn.mock.calls[0].slice(0, 2))
      .toEqual(['explorer.exe', ['\\\\wsl.localhost\\Ubuntu\\tmp\\report.html']]);

    children[0].emit('error', new Error('spawn explorer.exe ENOENT'));
    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(mockSpawn.mock.calls[1].slice(0, 2)).toEqual(['xdg-open', ['/tmp/report.html']]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
