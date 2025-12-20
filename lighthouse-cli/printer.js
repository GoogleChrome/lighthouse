/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const log = require('lighthouse-logger');

/**
 * An enumeration of acceptable output modes:
 *   'json': JSON formatted results
 *   'html': An HTML report
 *   'csv': CSV formatted results
 * @type {SelfMap<LH.OutputMode>}
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
    // TODO: make this mkdir to the filePath.
    fs.writeFile(filePath, output, (err) => {
      if (err) {
        return reject(err);
      }
      log.log('Printer', `${OutputMode[outputMode]} output written to ${filePath}`);
      resolve();
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

module.exports = {
  checkOutputPath,
  write,
  OutputMode,
  getValidOutputOptions,
};
