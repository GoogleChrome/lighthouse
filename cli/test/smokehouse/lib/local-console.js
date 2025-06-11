/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A simple buffered log to use in place of `console`.
 */
class LocalConsole {
  constructor() {
    this._log = '';
  }

  /**
   * @param {string} str
   */
  log(str) {
    this._log += str + '\n';
  }

  /**
   * Log but without the ending newline.
   * @param {string} str
   */
  write(str) {
    this._log += str;
  }

  /**
   * @return {string}
   */
  getLog() {
    return this._log;
  }

  /**
   * Append a stdout and stderr to this log.
   * @param {{stdout: string, stderr: string}} stdStrings
   */
  adoptStdStrings(stdStrings) {
    this.write(stdStrings.stdout);
    // stderr accrues many empty lines. Don't log unless there's content.
    if (/\S/.test(stdStrings.stderr)) {
      this.write(stdStrings.stderr);
    }
  }
}

export {LocalConsole};
