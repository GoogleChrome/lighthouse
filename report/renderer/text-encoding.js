/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const btoa_ = typeof btoa !== 'undefined' ?
  btoa :
  /** @param {string} str */
  (str) => Buffer.from(str).toString('base64');
const atob_ = typeof atob !== 'undefined' ?
  atob :
  /** @param {string} str */
  (str) => Buffer.from(str, 'base64').toString();

/**
 * @param {CompressionStream|DecompressionStream} stream
 * @param {Uint8Array<ArrayBuffer>} bytes
 * @return {Promise<Uint8Array<ArrayBuffer>>}
 */
async function transformBytes(stream, bytes) {
  const readable = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(readable).arrayBuffer());
}

/**
 * Takes an UTF-8 string and returns a base64 encoded string.
 * If gzip is true, the UTF-8 bytes are gzipped before base64'd.
 * @param {string} string
 * @param {{gzip: boolean}} options
 * @return {Promise<string>}
 */
async function toBase64(string, options) {
  let bytes = new TextEncoder().encode(string);

  if (options.gzip) {
    bytes = await transformBytes(new CompressionStream('gzip'), bytes);
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
 * @return {Promise<string>}
 */
async function fromBase64(encoded, options) {
  const binaryString = atob_(encoded);
  let bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));

  if (options.gzip) {
    bytes = await transformBytes(new DecompressionStream('gzip'), bytes);
  }

  return new TextDecoder().decode(bytes);
}

export const TextEncoding = {toBase64, fromBase64};
