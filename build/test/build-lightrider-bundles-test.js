/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import vm from 'vm';

import {LH_ROOT} from '../../shared/root.js';
import {buildEntryPoint, buildReportGenerator, buildStaticServerBundle} from '../build-lightrider-bundles.js';

describe('Lightrider Bundle builds', () => {
  const distDir = path.join(LH_ROOT, 'dist', 'lightrider');
  const lrBundlePath = path.join(distDir, 'lighthouse-lr-bundle.js');
  const reportGenBundlePath = path.join(distDir, 'report-generator-bundle.js');
  const staticServerPath = path.join(distDir, 'static-server.js');

  before(async () => {
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, {recursive: true});
    }
  });

  it('builds the LR bundle and exports APIs for CommonJS and browser', async () => {
    await buildEntryPoint();
    expect(fs.existsSync(lrBundlePath)).toBe(true);
    const content = fs.readFileSync(lrBundlePath, 'utf8');
    expect(content).toContain('Lighthouse');

    const origProcess = globalThis.process;
    try {
      // Test CommonJS environment (Smashberry / Calypso / Node.js in Google3).
      /** @type {Record<string, any>} */
      const cjsModule = {exports: {}};
      /** @type {Record<string, any>} */
      const cjsSandbox = {
        console,
        Buffer,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Event,
        EventTarget,
        CustomEvent,
        module: cjsModule,
        exports: cjsModule.exports,
      };
      cjsSandbox.globalThis = cjsSandbox;
      cjsSandbox.global = cjsSandbox;
      cjsSandbox.window = cjsSandbox;
      cjsSandbox.self = cjsSandbox;
      const cjsContext = vm.createContext(cjsSandbox);
      vm.runInContext(content, cjsContext);

      /** @type {Record<string, any>} */
      const exports = cjsModule.exports;
      expect(typeof exports.lighthouse).toBe('function');
      expect(typeof exports.runLighthouseInLR).toBe('function');
      expect(typeof exports.api).toBe('object');
      expect(typeof exports.index).toBe('object');
      expect(typeof exports.index.startFlow).toBe('function');
      expect(typeof exports.api.startFlow).toBe('function');
      expect(typeof exports.listenForStatus).toBe('function');
      expect(typeof exports.computeBenchmarkIndex).toBe('function');
      expect(exports.LR_PRESETS).toBeDefined();
      expect(typeof exports.LR_PRESETS.mobile).toBe('object');
      expect(typeof exports.LR_PRESETS.desktop).toBe('object');

      // Test Browser / WRS environment.
      /** @type {Record<string, any>} */
      const browserSandbox = {
        console,
        Buffer,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Event,
        EventTarget,
        CustomEvent,
      };
      browserSandbox.globalThis = browserSandbox;
      browserSandbox.global = browserSandbox;
      browserSandbox.window = browserSandbox;
      browserSandbox.self = browserSandbox;
      const browserContext = vm.createContext(browserSandbox);
      vm.runInContext(content, browserContext);

      expect(typeof browserSandbox.runLighthouseInLR).toBe('function');
      expect(typeof browserSandbox.listenForStatus).toBe('function');
      expect(typeof browserSandbox.lighthouseBundle).toBe('object');
      expect(typeof browserSandbox.lighthouseBundle.lighthouse).toBe('function');
      expect(typeof browserSandbox.lighthouseBundle.index.startFlow).toBe('function');
    } finally {
      globalThis.process = origProcess;
    }
  });

  it('builds the report generator bundle', async () => {
    await buildReportGenerator();
    expect(fs.existsSync(reportGenBundlePath)).toBe(true);
    const content = fs.readFileSync(reportGenBundlePath, 'utf8');
    // UMD bundle for ReportGenerator
    expect(content).toContain('ReportGenerator');
  });

  it('builds the static server bundle', async () => {
    await buildStaticServerBundle();
    expect(fs.existsSync(staticServerPath)).toBe(true);
    const content = fs.readFileSync(staticServerPath, 'utf8');
    expect(content).toContain('module.exports');
  });
});
