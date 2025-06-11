/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import path from 'path';
import fs from 'fs';

import * as run from '../../run.js';
import {parseChromeFlags} from '../../run.js';
import {getFlags} from '../../cli-flags.js';
import {LH_ROOT} from '../../../shared/root.js';

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
      // eslint-disable-next-line max-len
      const samplev2ArtifactsPath = LH_ROOT + '/core/test/results/artifacts/';

      // eslint-disable-next-line max-len
      const flags = getFlags([
        '--output=json',
        `--output-path=${filename}`,
        '--plugins=lighthouse-plugin-simple',
        // Use sample artifacts to avoid gathering during a unit test.
        `--audit-mode=${samplev2ArtifactsPath}`,
        url,
      ].join(' '));

      const rawResult = await run.runLighthouse(url, flags, testConfig);

      if (!rawResult) {
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
      assert.equal(fileResults.audits.viewport.score, 1);

      // passed results match saved results
      assert.strictEqual(fileResults.fetchTime, lhr.fetchTime);
      assert.strictEqual(fileResults.requestedUrl, lhr.requestedUrl);
      assert.strictEqual(fileResults.finalDisplayedUrl, lhr.finalDisplayedUrl);
      assert.strictEqual(fileResults.audits.viewport.score, lhr.audits.viewport.score);
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
