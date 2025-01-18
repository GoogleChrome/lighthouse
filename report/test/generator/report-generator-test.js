/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

/* eslint-disable no-irregular-whitespace */

import assert from 'assert/strict';
import fs from 'fs';

import csvValidator from 'csv-validator';

import {ReportGenerator} from '../../generator/report-generator.js';
import {readJson} from '../../../core/test/test-utils.js';

const sampleResults = readJson('core/test/results/sample_v2.json');
const sampleFlowResult = readJson('core/test/fixtures/user-flows/reports/sample-flow-result.json');

describe('ReportGenerator', () => {
  describe('#replaceStrings', () => {
    it('should replace all occurrences', () => {
      const source = '%foo! %foo %bar!';
      const result = ReportGenerator.replaceStrings(source, [
        {search: '%foo', replacement: 'hey'},
        {search: '%bar', replacement: 'you'},
      ]);

      assert.equal(result, 'hey! hey you!');
    });

    it('should not replace serial occurences', () => {
      const result = ReportGenerator.replaceStrings('%1', [
        {search: '%1', replacement: '%2'},
        {search: '%2', replacement: 'pwnd'},
      ]);

      assert.equal(result, '%2');
    });
  });

  describe('#generateHtmlReport', () => {
    it('should return html', () => {
      const result = ReportGenerator.generateReportHtml({});
      assert.ok(result.includes('doctype html'), 'includes doctype');
      assert.ok(result.trim().match(/<\/html>$/), 'ends with HTML tag');
    });

    it('should inject the report JSON', () => {
      const code = 'hax\u2028hax</script><script>console.log("pwned");%%LIGHTHOUSE_JAVASCRIPT%%';
      const result = ReportGenerator.generateReportHtml({code});
      assert.ok(result.includes('"code":"hax\\u2028'), 'injects the json');
      assert.ok(result.includes('hax\\u003c/script'), 'escapes HTML tags');
      assert.ok(result.includes('LIGHTHOUSE_JAVASCRIPT'), 'cannot be tricked');
    });

    it('should inject the report CSS', () => {
      const result = ReportGenerator.generateReportHtml({});
      assert.ok(!result.includes('/*%%LIGHTHOUSE_CSS%%*/'));
      assert.ok(result.includes('--color-green'));
    });

    it('should inject the report renderer javascript', () => {
      const result = ReportGenerator.generateReportHtml({});
      assert.ok(result.includes('configSettings.channel||"unknown"'), 'injects the script');
      assert.ok(result.includes('robustness: <\\/script'), 'escapes HTML tags in javascript');
      assert.ok(result.includes('pre$`post'), 'does not break from String.replace');
      assert.ok(result.includes('LIGHTHOUSE_JSON'), 'cannot be tricked');
    });
  });

  describe('#generateReport', () => {
    it('creates JSON for results', () => {
      const jsonOutput = ReportGenerator.generateReport(sampleResults, 'json');
      assert.doesNotThrow(_ => JSON.parse(jsonOutput));
    });

    it('creates JSON for flow result', () => {
      const jsonOutput = ReportGenerator.generateReport(sampleFlowResult, 'json');
      assert.doesNotThrow(_ => JSON.parse(jsonOutput));
    });

    it('creates HTML for results', () => {
      const htmlOutput = ReportGenerator.generateReport(sampleResults, 'html');
      assert.ok(/<!doctype/gim.test(htmlOutput));
      assert.ok(/<html lang="en"/gim.test(htmlOutput));
    });

    it('creates HTML for flow result', () => {
      const htmlOutput = ReportGenerator.generateReport(sampleFlowResult, 'html');
      assert.ok(/<!doctype/gim.test(htmlOutput));
      assert.ok(/<html lang="en"/gim.test(htmlOutput));
    });

    it('creates CSV for results', async () => {
      const path = './.results-as-csv.csv';

      const csvOutput = ReportGenerator.generateReport(sampleResults, 'csv');
      fs.writeFileSync(path, csvOutput);

      const lines = csvOutput.split('\n');
      expect(lines.length).toBeGreaterThan(100);
      expect(lines.slice(0, 15).join('\n')).toMatchInlineSnapshot(`
"\\"requestedUrl\\",\\"finalDisplayedUrl\\",\\"fetchTime\\",\\"gatherMode\\"
\\"http://localhost:10200/dobetterweb/dbw_tester.html\\",\\"http://localhost:10200/dobetterweb/dbw_tester.html\\",\\"2024-04-18T17:02:05.457Z\\",\\"navigation\\"

category,score
\\"performance\\",\\"0.32\\"
\\"accessibility\\",\\"0.74\\"
\\"best-practices\\",\\"0.36\\"
\\"seo\\",\\"0.75\\"

category,audit,score,displayValue,description
\\"performance\\",\\"first-contentful-paint\\",\\"0.01\\",\\"6.8 s\\",\\"First Contentful Paint marks the time at which the first text or image is painted. [Learn more about the First Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint/).\\"
\\"performance\\",\\"largest-contentful-paint\\",\\"0\\",\\"11.0 s\\",\\"Largest Contentful Paint marks the time at which the largest text or image is painted. [Learn more about the Largest Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint/)\\"
\\"performance\\",\\"total-blocking-time\\",\\"0.25\\",\\"1,070 ms\\",\\"Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. [Learn more about the Total Blocking Time metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time/).\\"
\\"performance\\",\\"cumulative-layout-shift\\",\\"0.9\\",\\"0.1\\",\\"Cumulative Layout Shift measures the movement of visible elements within the viewport. [Learn more about the Cumulative Layout Shift metric](https://web.dev/articles/cls).\\"
\\"performance\\",\\"speed-index\\",\\"0.18\\",\\"8.5 s\\",\\"Speed Index shows how quickly the contents of a page are visibly populated. [Learn more about the Speed Index metric](https://developer.chrome.com/docs/lighthouse/performance/speed-index/).\\"
"
`);

      try {
        await csvValidator(path);
      } catch (err) {
        assert.fail('CSV parser error:\n' + err.join('\n'));
      } finally {
        fs.unlinkSync(path);
      }
    });

    it('creates CSV for results including categories', () => {
      const csvOutput = ReportGenerator.generateReport(sampleResults, 'csv');
      expect(csvOutput).toContain('performance');
      expect(csvOutput).toContain('accessibility');
      expect(csvOutput).toContain('best-practices');
      expect(csvOutput).toContain('seo');
    });

    it('throws when creating CSV for flow result', () => {
      expect(() => {
        ReportGenerator.generateReport(sampleFlowResult, 'csv');
      }).toThrow('CSV output is not support for user flows');
    });

    it('writes extended info', () => {
      const htmlOutput = ReportGenerator.generateReport(sampleResults, 'html');
      const outputCheck = new RegExp('dobetterweb/dbw_tester.css', 'i');
      assert.ok(outputCheck.test(htmlOutput));
    });
  });

  it('handles array of outputs', () => {
    const [json, html] = ReportGenerator.generateReport(sampleResults, ['json', 'html']);
    assert.doesNotThrow(_ => JSON.parse(json));
    assert.ok(/<!doctype/gim.test(html));
    assert.ok(/<html lang="en"/gim.test(html));
  });
});
