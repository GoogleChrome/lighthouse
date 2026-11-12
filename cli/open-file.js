/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A minimal replacement for the `open` npm package, used to open a
 * file (e.g. an HTML report) with the OS default application.
 */

import {spawn, execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';

import log from 'lighthouse-logger';

/** @typedef {{command: string, args: string[]}} OpenCommand */

/**
 * True when running under Windows Subsystem for Linux, but not inside a
 * container hosted on WSL (where Windows interop is typically unavailable).
 * @return {boolean}
 */
function isWsl() {
  if (process.platform !== 'linux') return false;

  try {
    const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    if (!version.includes('microsoft')) return false;
  } catch {
    return false;
  }

  return !fs.existsSync('/.dockerenv') && !fs.existsSync('/run/.containerenv');
}

/**
 * Converts a WSL path to a Windows path using `wslpath`.
 * @param {string} filePath
 * @return {string|undefined}
 */
function toWindowsPath(filePath) {
  try {
    const windowsPath = execFileSync('wslpath', ['-w', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return windowsPath || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Returns the commands to try, in order, to open `filePath`.
 *
 * On Windows (and WSL) `explorer.exe <path>` is used rather than
 * `cmd /c start "" <path>`: arguments to `cmd` are re-parsed by cmd itself, so
 * characters valid in file names such as `&`, `^` and `%` would need
 * cmd-specific escaping (and `%VAR%` is expanded even inside quotes).
 * `explorer.exe` receives the path as a single, normally quoted argument and
 * opens it with the default associated application.
 *
 * @param {string} filePath An absolute path.
 * @param {{platform: NodeJS.Platform, windowsPath?: string}} env `windowsPath`
 *     is the Windows equivalent of `filePath` when running under WSL.
 * @return {OpenCommand[]}
 */
function getOpenCommands(filePath, {platform, windowsPath}) {
  if (platform === 'darwin') return [{command: 'open', args: [filePath]}];
  if (platform === 'win32') return [{command: 'explorer.exe', args: [filePath]}];

  /** @type {OpenCommand[]} */
  const commands = [];
  if (windowsPath) commands.push({command: 'explorer.exe', args: [windowsPath]});
  commands.push({command: 'xdg-open', args: [filePath]});
  return commands;
}

/**
 * Spawns the first command as a detached process, falling back to the next
 * command if it fails to launch (e.g. ENOENT).
 * @param {OpenCommand[]} commands
 * @param {string} filePath
 */
function spawnDetached(commands, filePath) {
  const [{command, args}, ...fallbacks] = commands;

  // Arguments are passed as an array with no shell, so paths are never interpreted.
  // Detaching (and unref'ing) lets the child outlive the CLI, which may exit right away.
  const child = spawn(command, args, {stdio: 'ignore', detached: true});
  child.on('error', err => {
    if (fallbacks.length) {
      spawnDetached(fallbacks, filePath);
      return;
    }

    log.warn('CLI', `Unable to open ${filePath} with \`${command}\` (${err.message}). ` +
      'Open it manually in your browser.');
  });
  child.unref();
}

/**
 * Opens a file with the default application for its type. Does not wait for
 * the application to launch or exit. Failures are logged, not thrown.
 * @param {string} filePath
 */
function openFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const platform = process.platform;
  const windowsPath = isWsl() ? toWindowsPath(absolutePath) : undefined;

  spawnDetached(getOpenCommands(absolutePath, {platform, windowsPath}), absolutePath);
}

export {
  openFile,
  getOpenCommands,
};
