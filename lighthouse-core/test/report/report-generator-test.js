/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const jsdom = require('jsdom');
const ReportGenerator = require('../../report/report-generator.js');
const TEMPLATES_FILE = fs.readFileSync(__dirname + '/../../report/html/templates.html', 'utf8');
const sampleResults = require('../../../lighthouse-core/test/results/sample_v2.json');
const csvValidator = require('csv-validator');

/* eslint-env jest */

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

    it('should inject the report templates', () => {
      const page = new jsdom.JSDOM(ReportGenerator.generateReportHtml({}));
      const templates = new jsdom.JSDOM(TEMPLATES_FILE);
      assert.equal(page.window.document.querySelectorAll('template[id^="tmpl-"]').length,
        templates.window.document.querySelectorAll('template[id^="tmpl-"]').length,
        'all templates injected');
    });

    it('should inject the report CSS', () => {
      const result = ReportGenerator.generateReportHtml({});
      assert.ok(!result.includes('/*%%LIGHTHOUSE_CSS%%*/'));
      assert.ok(result.includes('--color-green'));
    });

    it('should inject the report renderer javascript', () => {
      const result = ReportGenerator.generateReportHtml({});
      assert.ok(result.includes('ReportRenderer'), 'injects the script');
      assert.ok(result.includes('robustness: \\u003c/script'), 'escapes HTML tags in javascript');
      assert.ok(result.includes('pre$`post'), 'does not break from String.replace');
      assert.ok(result.includes('LIGHTHOUSE_JSON'), 'cannot be tricked');
    });
  });

  describe('#generateReport', () => {
    it('creates JSON for results', () => {
      const jsonOutput = ReportGenerator.generateReport(sampleResults, 'json');
      assert.doesNotThrow(_ => JSON.parse(jsonOutput));
    });

    it('creates HTML for results', () => {
      const htmlOutput = ReportGenerator.generateReport(sampleResults, 'html');
      assert.ok(/<!doctype/gim.test(htmlOutput));
      assert.ok(/<html lang="en"/gim.test(htmlOutput));
    });

    it('creates CSV for results', async () => {
      const path = './.results-as-csv.csv';
      const headers = {
        category: '',
        name: '',
        title: '',
        type: '',
        score: 42,
      };

      const csvOutput = ReportGenerator.generateReport(sampleResults, 'csv');
      fs.writeFileSync(path, csvOutput);

      const lines = csvOutput.split('\n');
      expect(lines.length).toBeGreaterThan(100);
      expect(lines.slice(0, 2).join('\n')).toMatchInlineSnapshot(`
        "requestedUrl,finalUrl,category,name,title,type,score
        \\"http://localhost:10200/dobetterweb/dbw_tester.html\\",\\"http://localhost:10200/dobetterweb/dbw_tester.html\\",\\"Performance\\",\\"first-contentful-paint\\",\\"First Contentful Paint\\",\\"numeric\\",\\"0.51\\"
        "
      `);

      try {
        await csvValidator(path, headers);
      } catch (err) {
        assert.fail('CSV parser error:\n' + err.join('\n'));
      } finally {
        fs.unlinkSync(path);
      }
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
