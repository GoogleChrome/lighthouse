/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Opens a file (e.g. the HTML report for `--view`) with the OS default application.
 */

import {spawn} from 'child_process';
import path from 'path';

import log from 'lighthouse-logger';

/**
 * Opens a file with its default application, without waiting for it. Failures are logged, not
 * thrown.
 * @param {string} filePath
 */
function openFile(filePath) {
  const absolutePath = path.resolve(filePath);

  /** @type {import('child_process').SpawnOptions} */
  const options = {stdio: 'ignore', detached: true};
  let command = 'xdg-open';
  let args = [absolutePath];
  if (process.platform === 'darwin') {
    command = 'open';
  } else if (process.platform === 'win32') {
    // explorer.exe (unlike `cmd /c start`) doesn't expand `%VAR%` or treat `&` specially, but it
    // does split unquoted `,` and `=`, which report filenames can contain. Windows paths can't
    // contain `"`, so quoting verbatim is safe.
    command = 'explorer.exe';
    args = [`"${absolutePath}"`];
    options.windowsVerbatimArguments = true;
  }

  // Detached and unref'd so the CLI can exit without waiting for (or killing) the child.
  const child = spawn(command, args, options);
  child.on('error', err => {
    log.warn('CLI', `Unable to open ${absolutePath} with \`${command}\` (${err.message}). ` +
      'Open it manually in your browser.');
  });
  child.unref();
}

export {openFile};
