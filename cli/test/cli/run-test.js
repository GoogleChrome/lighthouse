/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import path from 'path';
import fs from 'fs';

import * as td from 'testdouble';
import * as jestMock from 'jest-mock';

import * as run from '../../run.js';
import {parseChromeFlags} from '../../run.js';
import {getFlags} from '../../cli-flags.js';
import {LH_ROOT} from '../../../shared/root.js';
import {fnAny, readJson} from '../../../core/test/test-utils.js';

/** @type {LH.Config} */
const testConfig = {
  'extends': 'lighthouse:default',
  'settings': {
    'throttlingMethod': 'devtools',
  },
};

describe('CLI run', function() {
  describe('runLighthouse runs Lighthouse as a node module', () => {
    /** @type {LH.RunnerResult} */
    let passedResults;
    const filename = path.join(process.cwd(), 'run.ts.results.json');
    /** @type {LH.Result} */
    let fileResults;

    before(async () => {
      const url = 'http://localhost:10200/dobetterweb/dbw_tester.html';

      const samplev2ArtifactsPath = LH_ROOT + '/core/test/results/artifacts/';

      const flags = getFlags([
        '--output=json',
        `--extra-headers '{"Cookie":"monster=blue"}'`,
        `--output-path=${filename}`,
        '--plugins=lighthouse-plugin-simple',
        // Use sample artifacts to avoid gathering during a unit test.
        `--audit-mode=${samplev2ArtifactsPath}`,
        url,
      ].join(' '));

      const rawResult = await run.runLighthouse(url, flags, testConfig);

      if (!rawResult || Array.isArray(rawResult)) {
        return assert.fail('no results');
      }
      passedResults = rawResult;

      assert.ok(fs.existsSync(filename));
      fileResults = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    });

    after(() => {
      fs.unlinkSync(filename);
    });

    it('returns results that match the saved results', () => {
      const {lhr} = passedResults;
      assert.equal(fileResults.audits['viewport-insight'].score, 1);

      // passed results match saved results
      assert.strictEqual(fileResults.fetchTime, lhr.fetchTime);
      assert.strictEqual(fileResults.requestedUrl, lhr.requestedUrl);
      assert.strictEqual(fileResults.finalDisplayedUrl, lhr.finalDisplayedUrl);
      assert.strictEqual(
        fileResults.audits['viewport-insight'].score, lhr.audits['viewport-insight'].score);
      assert.strictEqual(
          Object.keys(fileResults.audits).length,
          Object.keys(lhr.audits).length);
      assert.deepStrictEqual(fileResults.timing, lhr.timing);
    });

    it('includes timing information', () => {
      assert.ok(passedResults.lhr.timing.total !== 0);
    });

    it('correctly sets the channel', () => {
      assert.equal(passedResults.lhr.configSettings.channel, 'cli');
    });

    it('merged the plugin into the config', () => {
      // Audits have been pruned because of onlyAudits, but groups get merged in.
      const groupNames = Object.keys(passedResults.lhr.categoryGroups || {});
      assert.ok(groupNames.includes('lighthouse-plugin-simple-new-group'));
    });

    it('includes plugin version in credits', () => {
      assert.equal(passedResults.lhr.environment.credits?.['lighthouse-plugin-simple'], '1.0.0');
    });
  });
}).timeout(60_000);

describe('flag coercing', () => {
  it('should force to array', () => {
    assert.deepStrictEqual(
      getFlags('https://www.example.com --only-audits foo').onlyAudits, ['foo']);
  });

  it('should allow csv', () => {
    assert.deepStrictEqual(
      getFlags('https://www.example.com --output html,json').output, ['html', 'json']);
  });
});

describe('saveResults', () => {
  it('will quit early if we\'re in gather mode', async () => {
    const result = await run.saveResults(
      /** @type {LH.RunnerResult} */ ({}),
      /** @type {LH.CliFlags} */ ({gatherMode: true}));
    assert.equal(result, undefined);
  });

  it('writes reports into outputPath when outputPath is a directory', async () => {
    const outDir = path.join(LH_ROOT, '.tmp', 'cli-run-dir-test');
    fs.mkdirSync(outDir, {recursive: true});
    try {
      /** @type {LH.Result} */
      const lhr = readJson('../../../core/test/results/sample_v2.json', import.meta);
      /** @type {LH.RunnerResult} */
      const mockRunnerResult = {
        lhr,
        // @ts-expect-error - empty artifacts for test
        artifacts: {},
        report: ['{"mock": true}'],
      };
      const flags = getFlags(`https://example.com/ --output=json --output-path=${outDir}`);

      await run.saveResults(mockRunnerResult, flags);
      const files = fs.readdirSync(outDir);
      assert.equal(files.length, 1);
      assert.ok(files[0].startsWith('localhost-dobetterweb-dbw_tester.html_'));
      assert.ok(files[0].endsWith('.report.json'));
    } finally {
      fs.rmSync(outDir, {recursive: true, force: true});
    }
  });
});

describe('batch runLighthouse', () => {
  const mockLaunch = fnAny();
  const mockLighthouse = fnAny();
  const mockPrinterWrite = fnAny();
  const mockOpen = fnAny();
  /** @type {typeof import('../../run.js')} */
  let mockedRun;
  /** @type { ReturnType<typeof jestMock.spyOn> } */
  let exitSpy;

  before(async () => {
    await td.replaceEsm('chrome-launcher', {
      launch: mockLaunch,
    });
    await td.replaceEsm('../../../core/index.js', undefined, mockLighthouse);
    await td.replaceEsm('../../printer.js', {
      write: mockPrinterWrite,
      OutputMode: {json: 'json', html: 'html', csv: 'csv'},
    });
    await td.replaceEsm('open', undefined, mockOpen);
    // @ts-expect-error - query string busts ESM cache so td.replaceEsm takes effect
    mockedRun = await import('../../run.js?batch');
  });

  after(() => {
    td.reset();
  });

  beforeEach(() => {
    mockLaunch.mockReset();
    mockLighthouse.mockReset();
    mockPrinterWrite.mockReset();
    mockOpen.mockReset();
    mockPrinterWrite.mockResolvedValue(undefined);
    // @ts-expect-error - process.exit returns never
    exitSpy = jestMock.spyOn(process, 'exit').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('reuses a single Chrome instance across multiple URLs', async () => {
    const mockKill = fnAny();
    mockLaunch.mockResolvedValue({port: 9999, kill: mockKill});
    mockLighthouse.mockImplementation(async (/** @type {string} */ url) => ({
      lhr: {
        finalDisplayedUrl: url,
        fetchTime: '2026-10-21T20:00:00.000Z',
        audits: {},
      },
      artifacts: {},
      report: ['{}'],
    }));

    const urls = ['https://example.com/1', 'https://example.com/2'];
    const flags = getFlags(urls.join(' '));
    const results = await mockedRun.runLighthouse(urls, flags, undefined);

    expect(Array.isArray(results)).toBe(true);
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(mockLighthouse).toHaveBeenCalledTimes(2);
    expect(mockKill).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('continues after an error and exits non-zero at the end by default', async () => {
    const mockKill1 = fnAny();
    const mockKill2 = fnAny();
    mockLaunch
      .mockResolvedValueOnce({port: 9991, kill: mockKill1})
      .mockResolvedValueOnce({port: 9992, kill: mockKill2});
    mockLighthouse
      .mockRejectedValueOnce(new Error('Navigation failed'))
      .mockResolvedValueOnce({
        lhr: {
          finalDisplayedUrl: 'https://example.com/2',
          fetchTime: '2026-10-21T20:00:00.000Z',
          audits: {},
        },
        artifacts: {},
        report: ['{}'],
      });

    const urls = ['https://example.com/1', 'https://example.com/2'];
    const flags = getFlags(urls.join(' '));
    await mockedRun.runLighthouse(urls, flags, undefined);

    expect(mockLighthouse).toHaveBeenCalledTimes(2);
    expect(mockLaunch).toHaveBeenCalledTimes(2);
    expect(mockKill1).toHaveBeenCalledTimes(1);
    expect(mockKill2).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('stops immediately on error when --fail-fast is set', async () => {
    const mockKill = fnAny();
    mockLaunch.mockResolvedValue({port: 9999, kill: mockKill});
    mockLighthouse.mockRejectedValueOnce(new Error('Navigation failed'));

    const urls = ['https://example.com/1', 'https://example.com/2'];
    const flags = getFlags(`${urls.join(' ')} --fail-fast`);
    await mockedRun.runLighthouse(urls, flags, undefined);

    expect(mockLighthouse).toHaveBeenCalledTimes(1);
    expect(mockKill).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('defers opening HTML reports with --view until all batch runs complete', async () => {
    /** @type {Array<string>} */
    const callOrder = [];
    const mockKill = fnAny().mockImplementation(() => callOrder.push('kill'));
    mockLaunch.mockResolvedValue({port: 9999, kill: mockKill});
    mockLighthouse.mockImplementation(async (/** @type {string} */ url) => {
      callOrder.push(`run:${url}`);
      return {
        lhr: {
          finalDisplayedUrl: url,
          fetchTime: '2026-10-21T20:00:00.000Z',
          audits: {},
        },
        artifacts: {},
        report: ['<html></html>'],
      };
    });
    mockOpen.mockImplementation(() => callOrder.push('open'));

    const urls = ['https://example.com/1', 'https://example.com/2'];
    const flags = getFlags(`${urls.join(' ')} --view`);
    await mockedRun.runLighthouse(urls, flags, undefined);

    expect(mockOpen).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual([
      'run:https://example.com/1',
      'run:https://example.com/2',
      'kill',
      'open',
      'open',
    ]);
  });
});

describe('Parsing --chrome-flags', () => {
  it('returns boolean flags that are true as a bare flag', () => {
    assert.deepStrictEqual(parseChromeFlags('--debug'), ['--debug']);
  });

  it('returns boolean flags that are false with value', () => {
    assert.deepStrictEqual(parseChromeFlags('--debug=false'), ['--debug=false']);
  });

  it('keeps --no-flags untouched, #3003', () => {
    assert.deepStrictEqual(parseChromeFlags('--no-sandbox'), ['--no-sandbox']);
  });

  it('handles numeric values', () => {
    assert.deepStrictEqual(parseChromeFlags('--log-level=0'), ['--log-level=0']);
  });

  it('handles flag values with spaces in them (#2817)', () => {
    assert.deepStrictEqual(
      parseChromeFlags('--user-agent="iPhone UA Test"'),
      ['--user-agent=iPhone UA Test']
    );

    assert.deepStrictEqual(
      parseChromeFlags('--host-resolver-rules="MAP www.example.org:443 127.0.0.1:8443"'),
      ['--host-resolver-rules=MAP www.example.org:443 127.0.0.1:8443']
    );
  });

  it('returns all flags as provided', () => {
    assert.deepStrictEqual(
      parseChromeFlags('--spaces="1 2 3 4" --debug=false --verbose --more-spaces="9 9 9"'),
      ['--spaces=1 2 3 4', '--debug=false', '--verbose', '--more-spaces=9 9 9']
    );
  });

  it('handles muliple --chrome-flags', () => {
    assert.deepStrictEqual(
      parseChromeFlags(['--no-sandbox', '--log-level=0']),
      ['--no-sandbox', '--log-level=0']
    );
  });

  it('removes wrapping single quotes', () => {
    assert.deepStrictEqual(
      parseChromeFlags('\'--no-sandbox --log-level=0\''),
      ['--no-sandbox', '--log-level=0']
    );
  });

  it('removes wrapping double quotes', () => {
    assert.deepStrictEqual(
      parseChromeFlags('"--no-sandbox --log-level=0"'),
      ['--no-sandbox', '--log-level=0']
    );
  });

  it('removes wrapping single quotes from arrays', () => {
    assert.deepStrictEqual(
      parseChromeFlags(['\'--no-sandbox --log-level=0\'', '--headless']),
      ['--no-sandbox', '--log-level=0', '--headless']
    );
  });

  it('removes wrapping double quotes from arrays', () => {
    assert.deepStrictEqual(
      parseChromeFlags(['"--no-sandbox --log-level=0"', '--headless']),
      ['--no-sandbox', '--log-level=0', '--headless']
    );
  });
});
