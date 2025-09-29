/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import zlib from 'zlib';
import {strict as assert} from 'assert';

/**
 * @param {string=} filename
 * @returns TraceEvent[]
 */
function loadTraceEventsFromFile(filename) {
  if (!fs.existsSync(filename)) {
    throw new Error('File not found. ' + filename);
  }
  let fileBuf = fs.readFileSync(filename);
  let data;
  if (isGzip(fileBuf)) {
    data = zlib.gunzipSync(fileBuf);
  } else {
    data = fileBuf.toString('utf8');
  }
  const json = JSON.parse(data);
  // clear memory
  fileBuf = data = '';
  const traceEvents = json.traceEvents ?? json;
  assert.ok(Array.isArray(traceEvents) && traceEvents.length, 'No trace events array');
  return traceEvents;
}

/**
 * Read the first 3 bytes looking for the gzip signature in the file header
 * https://www.rfc-editor.org/rfc/rfc1952#page-6
 * @param {ArrayBuffer} ab
 * @returns boolean
 */
function isGzip(ab) {
  const buf = new Uint8Array(ab);
  if (!buf || buf.length < 3) {
    return false;
  }
  return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
}

export {loadTraceEventsFromFile};
