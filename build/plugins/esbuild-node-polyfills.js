/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lightweight browser shims for Node.js built-in modules used when bundling
 * Lighthouse for Chrome DevTools, Lightrider, and Smokehouse.
 *
 * Modules that are not used at runtime in bundled environments (`fs`, `stream`,
 * `zlib`) are replaced with empty stubs (`export default {}`). Modules used at
 * runtime are backed by native Web APIs (`Uint8Array`, `TextEncoder`,
 * `TextDecoder`, `queueMicrotask`, `URL`).
 */

const EMPTY_STUB = 'module.exports = {};';

const bufferShim = `
let textEncoder;
let textDecoder;

function encodeUtf8(str) {
  if (typeof TextEncoder !== 'undefined') {
    textEncoder ??= new TextEncoder();
    return textEncoder.encode(str);
  }
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
  return bytes;
}

function decodeUtf8(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    textDecoder ??= new TextDecoder();
    return textDecoder.decode(bytes);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return decodeURIComponent(escape(bin));
}

function decodeBase64(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  while (b64.length % 4) b64 += '=';
  if (typeof Uint8Array.fromBase64 === 'function') {
    return Uint8Array.fromBase64(b64);
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export class Buffer extends Uint8Array {
  static alloc(size, fill) {
    const buf = new Buffer(size);
    if (fill !== undefined) buf.fill(fill);
    return buf;
  }

  static isBuffer(obj) {
    return obj instanceof Buffer;
  }

  static from(value, encoding) {
    if (typeof value === 'string') {
      const enc = (typeof encoding === 'string' ? encoding : 'utf8').toLowerCase();
      if (enc === 'base64' || enc === 'base64url') {
        const bytes = decodeBase64(value);
        return new Buffer(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      }
      const bytes = encodeUtf8(value);
      return new Buffer(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    if (ArrayBuffer.isView(value)) {
      return new Buffer(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    }
    return new Buffer(value);
  }

  toString(encoding = 'utf8', start = 0, end = this.length) {
    const sub = (start === 0 && end === this.length) ? this : this.subarray(start, end);
    const enc = encoding.toLowerCase();
    if (enc === 'base64') {
      if (typeof sub.toBase64 === 'function') return sub.toBase64();
      let bin = '';
      for (let i = 0; i < sub.length; i++) bin += String.fromCharCode(sub[i]);
      return btoa(bin);
    }
    return decodeUtf8(sub);
  }
}

export default {Buffer};
`;

const eventsShim = `
export class EventEmitter {
  constructor() {
    this._events = Object.create(null);
  }

  on(type, listener) {
    (this._events[type] ??= []).push(listener);
    return this;
  }

  addListener(type, listener) {
    return this.on(type, listener);
  }

  once(type, listener) {
    const wrapped = (...args) => {
      this.off(type, wrapped);
      listener.apply(this, args);
    };
    wrapped.listener = listener;
    return this.on(type, wrapped);
  }

  off(type, listener) {
    const list = this._events[type];
    if (!list) return this;
    const idx = list.findIndex(fn => fn === listener || fn.listener === listener);
    if (idx !== -1) list.splice(idx, 1);
    return this;
  }

  removeListener(type, listener) {
    return this.off(type, listener);
  }

  removeAllListeners(type) {
    if (type === undefined) {
      this._events = Object.create(null);
    } else {
      delete this._events[type];
    }
    return this;
  }

  emit(type, ...args) {
    const list = this._events[type];
    if (!list || list.length === 0) {
      if (type === 'error') {
        throw args[0] instanceof Error ? args[0] : new Error('Unhandled error.');
      }
      return false;
    }
    for (const fn of [...list]) {
      fn.apply(this, args);
    }
    return true;
  }

  listeners(type) {
    return (this._events[type] || []).map(fn => fn.listener || fn);
  }

  listenerCount(type) {
    return this._events[type]?.length ?? 0;
  }
}

EventEmitter.EventEmitter = EventEmitter;
export default EventEmitter;
`;

const pathShim = `
function normalizeArray(parts, allowAboveRoot) {
  const res = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (res.length && res[res.length - 1] !== '..') {
        res.pop();
      } else if (allowAboveRoot) {
        res.push('..');
      }
    } else {
      res.push(part);
    }
  }
  return res;
}

const splitPathRe = /^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^/]+?|)(\\.[^./]*|))(?:[/]*)$/;
function splitPath(filename) {
  return splitPathRe.exec(filename).slice(1);
}

export const sep = '/';
export const delimiter = ':';

export function isAbsolute(p) {
  return p.startsWith('/');
}

export function normalize(p) {
  const isAbs = isAbsolute(p);
  const trailingSlash = p.endsWith('/');
  const norm = normalizeArray(p.split('/'), !isAbs).join('/');
  if (!norm && !isAbs) return trailingSlash ? './' : '.';
  return (isAbs ? '/' : '') + norm + (norm && trailingSlash ? '/' : '');
}

export function join(...paths) {
  return normalize(paths.filter(p => {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return Boolean(p);
  }).join('/'));
}

export function resolve(...paths) {
  let resolvedPath = '';
  let resolvedAbsolute = false;
  for (let i = paths.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const p = i >= 0 ? paths[i] : '/';
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    }
    if (!p) continue;
    resolvedPath = p + '/' + resolvedPath;
    resolvedAbsolute = p.startsWith('/');
  }
  resolvedPath = normalizeArray(resolvedPath.split('/'), !resolvedAbsolute).join('/');
  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
}

export function relative(from, to) {
  from = resolve(from).slice(1);
  to = resolve(to).slice(1);
  const fromParts = from ? from.split('/') : [];
  const toParts = to ? to.split('/') : [];
  let same = 0;
  const len = Math.min(fromParts.length, toParts.length);
  while (same < len && fromParts[same] === toParts[same]) same++;
  const out = [];
  for (let i = same; i < fromParts.length; i++) out.push('..');
  out.push(...toParts.slice(same));
  return out.join('/');
}

export function dirname(p) {
  const [root, dir] = splitPath(p);
  if (!root && !dir) return '.';
  return root + (dir ? dir.slice(0, -1) : '');
}

export function basename(p, ext) {
  let f = splitPath(p)[2];
  if (ext && f.endsWith(ext)) f = f.slice(0, -ext.length);
  return f;
}

export function extname(p) {
  return splitPath(p)[3];
}

export default {
  sep,
  delimiter,
  isAbsolute,
  normalize,
  join,
  resolve,
  relative,
  dirname,
  basename,
  extname,
};
`;

const processShim = `
export const browser = true;
export const env = {};
export const version = '';
export const versions = {};
export const platform = '';
export const nextTick = (fn, ...args) => queueMicrotask(() => fn(...args));
export default {
  browser,
  env,
  version,
  versions,
  platform,
  nextTick,
};
`;

const urlShim = `
export const URL = globalThis.URL;
export const fileURLToPath = url => url;
export default {URL, fileURLToPath};
`;

const moduleShim = `
export const createRequire = () => ({});
export default {createRequire};
`;

const assertStrictShim = `
export function ok(value, message) {
  if (!value) {
    throw new Error(message || \`Assertion failed: \${value}\`);
  }
}
export function strictEqual(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    throw new Error(message || \`Expected \${actual} to strictly equal \${expected}\`);
  }
}
export function deepStrictEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || 'Expected values to be deeply strictly equal');
  }
}
const assert = Object.assign(ok, {
  ok,
  equal: strictEqual,
  strictEqual,
  deepEqual: deepStrictEqual,
  deepStrictEqual,
});
assert.strict = assert;
export {
  strictEqual as equal,
  deepStrictEqual as deepEqual,
  assert as strict,
};
export default assert;
`;

/** @type {Record<string, string>} */
const nodeModuleShims = {
  'buffer': bufferShim,
  'events': eventsShim,
  'path': pathShim,
  'process': processShim,
  'url': urlShim,
  'module': moduleShim,
  'assert': assertStrictShim,
  'assert/strict': assertStrictShim,
  // Unused Node-only modules in bundled environments: replace with empty stubs.
  'fs': EMPTY_STUB,
  'stream': EMPTY_STUB,
  'zlib': EMPTY_STUB,
};

export {
  nodeModuleShims,
};
