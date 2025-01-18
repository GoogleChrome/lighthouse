/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import log from 'lighthouse-logger';

/**
 * An enumeration of acceptable output modes:
 *   'json': JSON formatted results
 *   'html': An HTML report
 *   'csv': CSV formatted results
 * @type {LH.Util.SelfMap<LH.OutputMode>}
 */
const OutputMode = {
  json: 'json',
  html: 'html',
  csv: 'csv',
};

/**
 * Verify output path to use, either stdout or a file path.
 * @param {string} path
 * @return {string}
 */
function checkOutputPath(path) {
  if (!path) {
    log.warn('Printer', 'No output path set; using stdout');
    return 'stdout';
  }
  return path;
}

/**
 * Writes the output to stdout.
 * @param {string} output
 * @return {Promise<void>}
 */
function writeToStdout(output) {
  return new Promise(resolve => {
    // small delay to avoid race with debug() logs
    setTimeout(_ => {
      process.stdout.write(`${output}\n`);
      resolve();
    }, 50);
  });
}

/**
 * Writes the output to a file.
 * @param {string} filePath
 * @param {string} output
 * @param {LH.OutputMode} outputMode
 * @return {Promise<void>}
 */
function writeFile(filePath, output, outputMode) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path.dirname(filePath), {recursive: true}, (err) => {
      if (err && err.code !== 'EEXIST') {
        return reject(err);
      }
      fs.writeFile(filePath, output, (err) => {
        if (err) {
          return reject(err);
        }
        log.log('Printer', `${OutputMode[outputMode]} output written to ${filePath}`);
        resolve();
      });
    });
  });
}

/**
 * Writes the output.
 * @param {string} output
 * @param {LH.OutputMode} mode
 * @param {string} path
 * @return {Promise<void>}
 */
async function write(output, mode, path) {
  const outputPath = checkOutputPath(path);
  return outputPath === 'stdout' ?
    writeToStdout(output) :
    writeFile(outputPath, output, mode);
}

/**
 * Returns a list of valid output options.
 * @return {Array<string>}
 */
function getValidOutputOptions() {
  return Object.keys(OutputMode);
}

export {
  checkOutputPath,
  write,
  OutputMode,
  getValidOutputOptions,
};
