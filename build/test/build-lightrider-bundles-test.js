/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';

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

  it('builds the LR entry point bundle', async () => {
    await buildEntryPoint();
    expect(fs.existsSync(lrBundlePath)).toBe(true);
    const content = fs.readFileSync(lrBundlePath, 'utf8');
    expect(content).toContain('Lighthouse');
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
