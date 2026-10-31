/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import vm from 'vm';

import esbuild from 'esbuild';

import * as plugins from '../../esbuild-plugins.js';

describe('esbuild-node-polyfills (nodeModuleShims)', () => {
  /**
   * @param {string} entryCode
   */
  async function bundleAndEvaluate(entryCode, sandboxExtras = {}) {
    const res = await esbuild.build({
      stdin: {
        contents: entryCode,
        resolveDir: process.cwd(),
        loader: 'js',
      },
      bundle: true,
      write: false,
      format: 'iife',
      globalName: 'testBundle',
      plugins: [
        plugins.replaceModules(plugins.nodeModuleShims, {disableUnusedError: true}),
      ],
    });
    const code = res.outputFiles[0].text;
    const context = vm.createContext({
      atob: globalThis.atob,
      btoa: globalThis.btoa,
      URL: globalThis.URL,
      queueMicrotask: globalThis.queueMicrotask,
      ...sandboxExtras,
    });
    vm.runInContext(code, context);
    return context.testBundle;
  }

  it('shims buffer with UTF-8, base64, and bare VM fallback support', async () => {
    const code = `
      import {Buffer} from 'buffer';
      export function run() {
        const utf8Buf = Buffer.from('Hello Lighthouse 🚀', 'utf8');
        const b64 = utf8Buf.toString('base64');
        const roundTrip = Buffer.from(b64, 'base64').toString('utf-8');
        const urlSafeRoundTrip = Buffer.from('SGVsbG8tV29ybGRf', 'base64').toString('utf8');
        const allocBuf = Buffer.alloc(4, 0x41);
        return {
          isBuf: Buffer.isBuffer(utf8Buf),
          roundTrip,
          urlSafeRoundTrip,
          allocStr: allocBuf.toString('utf8'),
        };
      }
    `;

    // Test with native TextEncoder/TextDecoder
    const withTextEncoder = await bundleAndEvaluate(code, {
      TextEncoder: globalThis.TextEncoder,
      TextDecoder: globalThis.TextDecoder,
    });
    expect(withTextEncoder.run()).toEqual({
      isBuf: true,
      roundTrip: 'Hello Lighthouse 🚀',
      urlSafeRoundTrip: 'Hello-World_',
      allocStr: 'AAAA',
    });

    // Test in bare VM sandbox without TextEncoder/TextDecoder (like Lightrider VM test)
    const withoutTextEncoder = await bundleAndEvaluate(code);
    expect(withoutTextEncoder.run()).toEqual({
      isBuf: true,
      roundTrip: 'Hello Lighthouse 🚀',
      urlSafeRoundTrip: 'Hello-World_',
      allocStr: 'AAAA',
    });
  });

  it('shims events EventEmitter', async () => {
    const mod = await bundleAndEvaluate(`
      import EventEmitter, {EventEmitter as NamedEE} from 'events';
      export function run() {
        const ee = new EventEmitter();
        const calls = [];
        const onMsg = x => calls.push('on:' + x);
        ee.on('msg', onMsg);
        ee.once('msg', x => calls.push('once:' + x));
        ee.emit('msg', 1);
        ee.emit('msg', 2);
        ee.off('msg', onMsg);
        ee.emit('msg', 3);
        return {
          sameClass: EventEmitter === NamedEE,
          calls,
          count: ee.listenerCount('msg'),
        };
      }
    `);
    expect(mod.run()).toEqual({
      sameClass: true,
      calls: ['on:1', 'once:1', 'on:2'],
      count: 0,
    });
  });

  it('shims path POSIX utilities', async () => {
    const mod = await bundleAndEvaluate(`
      import path, {dirname, basename, extname, join, resolve, relative} from 'path';
      export function run() {
        return {
          sep: path.sep,
          dir: dirname('/a/b/c.js'),
          base: basename('/a/b/c.js', '.js'),
          ext: extname('/a/b/c.js'),
          joined: join('/a', 'b', '../c', './d.txt'),
          resolved: resolve('/a/b', '../c', 'd'),
          rel: relative('/a/b/c', '/a/d/e'),
        };
      }
    `);
    expect(mod.run()).toEqual({
      sep: '/',
      dir: '/a/b',
      base: 'c',
      ext: '.js',
      joined: '/a/c/d.txt',
      resolved: '/a/c/d',
      rel: '../../d/e',
    });
  });

  it('shims assert and assert/strict', async () => {
    const mod = await bundleAndEvaluate(`
      import assert from 'assert/strict';
      export function run() {
        assert(true);
        assert.strictEqual(2 + 2, 4);
        assert.deepStrictEqual({a: [1, 2]}, {a: [1, 2]});
        let threw = false;
        try {
          assert.strictEqual(1, 2, 'mismatch');
        } catch (err) {
          threw = err.message;
        }
        return threw;
      }
    `);
    expect(mod.run()).toBe('mismatch');
  });

  it('shims process, url, module, and replaces fs, stream, zlib with empty stubs', async () => {
    const mod = await bundleAndEvaluate(`
      import process from 'process';
      import url from 'url';
      import {createRequire} from 'module';
      import fs from 'fs';
      import stream from 'stream';
      import zlib from 'zlib';

      export async function run() {
        let ticked = false;
        await new Promise(resolve => {
          process.nextTick((val) => {
            ticked = val;
            resolve();
          }, true);
        });
        return {
          ticked,
          browser: process.browser,
          filePath: url.fileURLToPath('file:///path/to/file.js'),
          emptyRequire: Object.keys(createRequire('file:///a.js')).length === 0,
          fsEmpty: Object.keys(fs).length === 0,
          streamEmpty: Object.keys(stream).length === 0,
          zlibEmpty: Object.keys(zlib).length === 0,
        };
      }
    `);
    expect(await mod.run()).toEqual({
      ticked: true,
      browser: true,
      filePath: 'file:///path/to/file.js',
      emptyRequire: true,
      fsEmpty: true,
      streamEmpty: true,
      zlibEmpty: true,
    });
  });
});
