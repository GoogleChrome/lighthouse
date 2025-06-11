/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global CompressionStream */

const btoa_ = typeof btoa !== 'undefined' ?
  btoa :
  /** @param {string} str */
  (str) => Buffer.from(str).toString('base64');
const atob_ = typeof atob !== 'undefined' ?
  atob :
  /** @param {string} str */
  (str) => Buffer.from(str, 'base64').toString();

/**
 * Takes an UTF-8 string and returns a base64 encoded string.
 * If gzip is true, the UTF-8 bytes are gzipped before base64'd, using
 * CompressionStream (currently only in Chrome), falling back to pako
 * (which is only used to encode in our Node tests).
 * @param {string} string
 * @param {{gzip: boolean}} options
 * @return {Promise<string>}
 */
async function toBase64(string, options) {
  let bytes = new TextEncoder().encode(string);

  if (options.gzip) {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const compAb = await new Response(cs.readable).arrayBuffer();
      bytes = new Uint8Array(compAb);
    } else {
      /** @type {import('pako')=} */
      const pako = window.pako;
      bytes = pako.gzip(string);
    }
  }

  let binaryString = '';
  // This is ~25% faster than building the string one character at a time.
  // https://jsbench.me/2gkoxazvjl
  const chunkSize = 5000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binaryString += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa_(binaryString);
}

/**
 * @param {string} encoded
 * @param {{gzip: boolean}} options
 * @return {string}
 */
function fromBase64(encoded, options) {
  const binaryString = atob_(encoded);
  const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));

  if (options.gzip) {
    /** @type {import('pako')=} */
    const pako = window.pako;
    return pako.ungzip(bytes, {to: 'string'});
  } else {
    return new TextDecoder().decode(bytes);
  }
}

export const TextEncoding = {toBase64, fromBase64};
