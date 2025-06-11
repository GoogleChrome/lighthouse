/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An extension of Error that includes any stdout or stderr from a child
 * process. Based on the error thrown by `child_process.exec()`.
 * https://github.com/nodejs/node/blob/3aeae8d81b7b78668c37f7a07a72d94781126d49/lib/child_process.js#L150-L176
 */
class ChildProcessError extends Error {
  /**
   * @param {string} message
   * @param {string=} stdout
   * @param {string=} stderr
   */
  constructor(message, stdout = '', stderr = '') {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export {ChildProcessError};
