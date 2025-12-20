/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const jsdom = require('jsdom');
const DOM = require('../../../../report/html/renderer/dom.js');
const Util = require('../../../../report/html/renderer/util.js');
const I18n = require('../../../../report/html/renderer/i18n.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');
const SnippetRenderer = require('../../../../report/html/renderer/snippet-renderer.js');
const CrcDetailsRenderer = require('../../../../report/html/renderer/crc-details-renderer.js');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

/* eslint-env jest */

describe('DetailsRenderer', () => {
  let renderer;

  beforeAll(() => {
    global.Util = Util;
    global.Util.i18n = new I18n('en', {...Util.UIStrings});
    global.CriticalRequestChainRenderer = CrcDetailsRenderer;
    global.SnippetRenderer = SnippetRenderer;
    const {document} = new jsdom.JSDOM(TEMPLATE_FILE).window;
    const dom = new DOM(document);
    renderer = new DetailsRenderer(dom);
    renderer.setTemplateContext(dom.document());
  });

  afterAll(() => {
    global.Util.i18n = undefined;
    global.Util = undefined;
    global.CriticalRequestChainRenderer = undefined;
    global.SnippetRenderer = undefined;
  });

  describe('render', () => {
    it('renders filmstrips', () => {
      const el = renderer.render({
        type: 'filmstrip',
        items: [
          {timing: 1020, data: 'data:image/jpeg;base64,foobar'},
          {timing: 3030, data: 'data:image/jpeg;base64,foobaz'},
        ],
      });

      assert.ok(el.localName === 'div');
      assert.ok(el.classList.contains('lh-filmstrip'));

      const frames = [...el.querySelectorAll('.lh-filmstrip__frame')];
      assert.equal(frames.length, 2);

      const thumbnails = [...el.querySelectorAll('.lh-filmstrip__thumbnail')];
      assert.equal(thumbnails.length, 2);
      assert.equal(thumbnails[0].src, 'data:image/jpeg;base64,foobar');
      assert.ok(thumbnails[0].alt, 'did not set alt text');
    });

    it('renders tables', () => {
      const el = renderer.render({
        type: 'table',
        headings: [
          {text: 'First', key: 'a', itemType: 'text'},
          {text: 'Second', key: 'b', itemType: 'text'},
          {text: 'Preview', key: 'c', itemType: 'thumbnail'},
        ],
        items: [
          {
            a: 'value A.1',
            b: 'value A.2',
            c: 'http://example.com/image.jpg',
          },
          {
            a: 'value B.1',
            b: 'value B.2',
            c: 'unknown',
          },
        ],
      });

      assert.equal(el.localName, 'table', 'did not render table');
      assert.ok(el.querySelector('img'), 'did not render recursive items');
      assert.equal(el.querySelectorAll('th').length, 3, 'did not render header items');
      assert.equal(el.querySelectorAll('td').length, 6, 'did not render table cells');
      assert.equal(el.querySelectorAll('.lh-table-column--text').length, 6, '--text not set');
      assert.equal(el.querySelectorAll('.lh-table-column--thumbnail').length, 3,
          '--thumbnail not set');
    });

    it('renders critical request chains', () => {
      const details = {
        type: 'criticalrequestchain',
        longestChain: {
          duration: 2,
          length: 1,
          transferSize: 221,
        },
        chains: {
          F3B687683512E0F003DD41EB23E2091A: {
            request: {
              url: 'https://example.com',
              startTime: 0,
              endTime: 2,
              responseReceivedTime: 1,
              transferSize: 221,
            },
            children: {},
          },
        },
      };

      const crcEl = renderer.render(details);
      assert.ok(crcEl.classList.contains('lh-crc-container'));
      assert.strictEqual(crcEl.querySelectorAll('.crc-node').length, 1);
    });

    it('renders opportunity details as a table', () => {
      const details = {
        type: 'opportunity',
        headings: [
          {key: 'url', valueType: 'url', label: 'URL'},
          {key: 'totalBytes', valueType: 'bytes', label: 'Size (KB)'},
          {key: 'wastedBytes', valueType: 'bytes', label: 'Potential Savings (KB)'},
        ],
        items: [{
          url: 'https://example.com',
          totalBytes: 71654,
          wastedBytes: 30470,
          wastedPercent: 42,
        }],
        overallSavingsMs: 150,
        overallSavingsBytes: 30470,
      };

      const oppEl = renderer.render(details);
      assert.equal(oppEl.localName, 'table');
      assert.ok(oppEl.querySelector('.lh-text__url').title === 'https://example.com', 'did not render recursive items');
      assert.equal(oppEl.querySelectorAll('th').length, 3, 'did not render header items');
      assert.equal(oppEl.querySelectorAll('td').length, 3, 'did not render table cells');
      assert.equal(oppEl.querySelectorAll('.lh-table-column--url').length, 2, 'url column not set');
      assert.equal(oppEl.querySelectorAll('.lh-table-column--bytes').length, 4, 'bytes not set');
    });

    it('renders lists', () => {
      const snippet = {
        type: 'snippet',
        lines: [{lineNumber: 1, content: ''}],
        title: 'Some snippet',
        lineMessages: [],
        generalMessages: [],
        lineCount: 100,
      };

      const el = renderer.render({
        type: 'list',
        items: [snippet, snippet],
      });

      assert.equal(el.localName, 'div');
      assert.ok(el.classList.contains('lh-list'), 'has list class');
      assert.ok(el.children.length, 2, 'renders all items');
      assert.ok(el.children[0].textContent.includes('Some snippet'), 'renders item content');
    });

    it('does not render internal-only screenshot details', () => {
      const details = {
        type: 'screenshot',
        timestamp: 185600000,
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRYP/2Q==',
      };

      const screenshotEl = renderer.render(details);
      assert.strictEqual(screenshotEl, null);
    });

    it('does not render internal-only diagnostic details', () => {
      const details = {
        type: 'debugdata',
        items: [{
          failures: ['No manifest was fetched'],
          isParseFailure: true,
          parseFailureReason: 'No manifest was fetched',
        }],
      };

      const diagnosticEl = renderer.render(details);
      assert.strictEqual(diagnosticEl, null);
    });

    it('renders an unknown details type', () => {
      // Disallowed by type system, but test that we get an error message out just in case.
      const details = {
        type: 'imaginary',
        items: 5,
      };

      const el = renderer.render(details);
      const summaryEl = el.querySelector('summary');
      expect(summaryEl.textContent)
        .toContain('We don\'t know how to render audit details of type `imaginary`');
      assert.strictEqual(el.lastChild.textContent, JSON.stringify(details, null, 2));
    });
  });

  describe('Table rendering', () => {
    it('renders text values', () => {
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'text', text: 'Heading'}],
        items: [{content: 'My text content'}],
      };

      const el = renderer.render(details);
      const textEls = el.querySelectorAll('.lh-text');
      assert.strictEqual(textEls[0].textContent, 'Heading');
      assert.strictEqual(textEls[1].textContent, 'My text content');
    });

    it('renders not much if items are empty', () => {
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'text', text: 'Heading'}],
        items: [],
      };

      const el = renderer.render(details);
      assert.strictEqual(el.outerHTML, '<span></span>');
    });

    it('renders an empty cell if item is missing a property', () => {
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'text', text: 'Heading'}],
        items: [
          {},
          {content: undefined},
          {content: 'a thing'},
        ],
      };

      const el = renderer.render(details);
      const itemEls = el.querySelectorAll('td');
      assert.strictEqual(itemEls.length, 3);

      // missing prop
      assert.ok(itemEls[0].classList.contains('lh-table-column--empty'));
      assert.strictEqual(itemEls[0].innerHTML, '');

      // undefined prop
      assert.ok(itemEls[1].classList.contains('lh-table-column--empty'));
      assert.strictEqual(itemEls[1].innerHTML, '');

      // defined prop
      assert.ok(itemEls[2].classList.contains('lh-table-column--text'));
      assert.strictEqual(itemEls[2].textContent, 'a thing');
    });

    it('renders code values from a string', () => {
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'code', text: 'Heading'}],
        items: [{content: 'code snippet'}],
      };

      const el = renderer.render(details);
      const codeEl = el.querySelector('.lh-code');
      assert.ok(codeEl.localName === 'pre');
      assert.equal(codeEl.textContent, 'code snippet');
    });

    it('renders code values from a code details object', () => {
      const code = {
        type: 'code',
        value: 'code object',
      };

      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'code', text: 'Heading'}],
        items: [{content: code}],
      };

      const el = renderer.render(details);
      const codeEl = el.querySelector('.lh-code');
      assert.ok(codeEl.localName === 'pre');
      assert.equal(codeEl.textContent, 'code object');
    });

    it('renders thumbnail values', () => {
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'thumbnail', text: 'Heading'}],
        items: [{content: 'http://example.com/my-image.jpg'}],
      };

      const el = renderer.render(details);
      const thumbnailEl = el.querySelector('img');
      assert.ok(thumbnailEl.classList.contains('lh-thumbnail'));
      assert.strictEqual(thumbnailEl.src, 'http://example.com/my-image.jpg');
      assert.strictEqual(thumbnailEl.title, 'http://example.com/my-image.jpg');
      assert.strictEqual(thumbnailEl.alt, '');
    });

    it('renders link values', () => {
      const linkText = 'Example Site';
      const linkUrl = 'https://example.com/';
      const link = {
        type: 'link',
        text: linkText,
        url: linkUrl,
      };
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'link', text: 'Heading'}],
        items: [{content: link}],
      };

      const el = renderer.render(details);
      const anchorEl = el.querySelector('a');
      assert.equal(anchorEl.textContent, linkText);
      assert.equal(anchorEl.href, linkUrl);
      assert.equal(anchorEl.rel, 'noopener');
      assert.equal(anchorEl.target, '_blank');
    });

    it('renders link value as text if URL is not allowed', () => {
      const linkText = 'Evil Link';
      const linkUrl = 'javascript:alert(5)';
      const link = {
        type: 'link',
        text: linkText,
        url: linkUrl,
      };
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'link', text: 'Heading'}],
        items: [{content: link}],
      };

      const el = renderer.render(details);
      const linkEl = el.querySelector('td.lh-table-column--link > .lh-text');
      assert.equal(linkEl.localName, 'div');
      assert.equal(linkEl.textContent, linkText);
    });

    it('renders link value as text if URL is invalid', () => {
      const linkText = 'Invalid Link';
      const linkUrl = 'link nonsense';
      const link = {
        type: 'link',
        text: linkText,
        url: linkUrl,
      };
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'link', text: 'Heading'}],
        items: [{content: link}],
      };

      const el = renderer.render(details);
      const linkEl = el.querySelector('td.lh-table-column--link > .lh-text');
      assert.equal(linkEl.localName, 'div');
      assert.equal(linkEl.textContent, linkText);
    });

    it('renders node values', () => {
      const node = {
        type: 'node',
        path: '3,HTML,1,BODY,5,DIV,0,H2',
        selector: 'h2',
        snippet: '<h2>Do better web tester page</h2>',
      };
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'node', text: 'Heading'}],
        items: [{content: node}],
      };

      const el = renderer.render(details);
      const nodeEl = el.querySelector('.lh-node');
      assert.strictEqual(nodeEl.localName, 'span');
      assert.equal(nodeEl.textContent, node.snippet);
      assert.equal(nodeEl.title, node.selector);
      assert.equal(nodeEl.getAttribute('data-path'), node.path);
      assert.equal(nodeEl.getAttribute('data-selector'), node.selector);
      assert.equal(nodeEl.getAttribute('data-snippet'), node.snippet);
    });

    it('renders source-location values', () => {
      const sourceLocation = {
        type: 'source-location',
        url: 'https://www.example.com/script.js',
        urlProvider: 'network',
        line: 10,
        column: 5,
      };
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'source-location', text: 'Heading'}],
        items: [{content: sourceLocation}],
      };

      const el = renderer.render(details);
      const sourceLocationEl = el.querySelector('.lh-source-location');
      const anchorEl = sourceLocationEl.querySelector('a');
      assert.strictEqual(sourceLocationEl.localName, 'div');
      assert.equal(anchorEl.href, 'https://www.example.com/script.js');
      assert.equal(sourceLocationEl.textContent, '/script.js:11:5(www.example.com)');
      assert.equal(sourceLocationEl.getAttribute('data-source-url'), sourceLocation.url);
      assert.equal(sourceLocationEl.getAttribute('data-source-line'), `${sourceLocation.line}`);
      assert.equal(sourceLocationEl.getAttribute('data-source-column'), `${sourceLocation.column}`);
    });

    it('renders source-location values that aren\'t network resources', () => {
      const sourceLocation = {
        type: 'source-location',
        url: 'https://www.example.com/script.js',
        urlProvider: 'comment',
        line: 0,
        column: 0,
      };
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'source-location', text: 'Heading'}],
        items: [{content: sourceLocation}],
      };

      const el = renderer.render(details);
      const sourceLocationEl = el.querySelector('.lh-source-location');
      const anchorEl = sourceLocationEl.querySelector('a');
      assert.ok(!anchorEl);
      assert.strictEqual(sourceLocationEl.localName, 'div');
      assert.equal(sourceLocationEl.textContent, 'https://www.example.com/script.js:1:0 (from sourceURL)');
      assert.equal(sourceLocationEl.getAttribute('data-source-url'), sourceLocation.url);
      assert.equal(sourceLocationEl.getAttribute('data-source-line'), `${sourceLocation.line}`);
      assert.equal(sourceLocationEl.getAttribute('data-source-column'), `${sourceLocation.column}`);
    });

    it('renders text URL values from a string', () => {
      const urlText = 'https://example.com/';
      const displayUrlText = 'https://example.com';

      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'url', text: 'Heading'}],
        items: [{content: urlText}],
      };

      const el = renderer.render(details);
      const urlEl = el.querySelector('td.lh-table-column--url > .lh-text__url');

      assert.equal(urlEl.localName, 'div');
      assert.equal(urlEl.title, urlText);
      assert.equal(urlEl.dataset.url, urlText);
      assert.equal(urlEl.firstChild.nodeName, 'A');
      assert.equal(urlEl.firstChild.href, urlText);
      assert.equal(urlEl.firstChild.rel, 'noopener');
      assert.equal(urlEl.firstChild.target, '_blank');
      assert.equal(urlEl.textContent, displayUrlText);
    });

    it('renders text URL values from a url details object', () => {
      const urlText = 'https://example.com/';
      const displayUrlText = 'https://example.com';
      const url = {
        type: 'url',
        value: urlText,
      };

      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'url', text: 'Heading'}],
        items: [{content: url}],
        overallSavingsMs: 100,
      };

      const el = renderer.render(details);
      const urlEl = el.querySelector('td.lh-table-column--url > .lh-text__url');

      assert.equal(urlEl.localName, 'div');
      assert.equal(urlEl.title, urlText);
      assert.equal(urlEl.dataset.url, urlText);
      assert.equal(urlEl.firstChild.nodeName, 'A');
      assert.equal(urlEl.textContent, displayUrlText);
    });

    it('renders text URL values as code if not an allowed URL', () => {
      const urlText = 'invalid-url://example.com/';

      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'url', text: 'Heading'}],
        items: [{content: urlText}],
      };

      const el = renderer.render(details);
      const codeItemEl = el.querySelector('td.lh-table-column--url');
      assert.strictEqual(codeItemEl.innerHTML, '<pre class="lh-code">invalid-url://example.com/</pre>');
    });

    it('renders an unknown heading itemType', () => {
      // Disallowed by type system, but test that we get an error message out just in case.
      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'notRealValueType', text: 'Heading'}],
        items: [{content: 'some string'}],
      };

      const el = renderer.render(details);
      const unknownEl = el.querySelector('td.lh-table-column--notRealValueType .lh-unknown');
      const summaryEl = unknownEl.querySelector('summary');
      expect(summaryEl.textContent)
        .toContain('We don\'t know how to render audit details of type `notRealValueType`');
      assert.strictEqual(unknownEl.lastChild.textContent, '"some string"');
    });

    it('renders an unknown item object type', () => {
      // Disallowed by type system, but test that we get an error message out just in case.
      const item = {
        type: 'imaginaryItem',
        items: 'alllll the items',
      };

      const details = {
        type: 'table',
        headings: [{key: 'content', itemType: 'url', text: 'Heading'}],
        items: [{content: item}],
      };

      const el = renderer.render(details);
      const unknownEl = el.querySelector('td.lh-table-column--url .lh-unknown');
      const summaryEl = unknownEl.querySelector('summary');
      expect(summaryEl.textContent)
        .toContain('We don\'t know how to render audit details of type `imaginaryItem`');
      assert.strictEqual(unknownEl.lastChild.textContent, JSON.stringify(item, null, 2));
    });

    it('uses the item\'s type over the heading type', () => {
      const details = {
        type: 'table',
        // itemType is overriden by code object
        headings: [{key: 'content', itemType: 'url', text: 'Heading'}],
        items: [
          {content: {type: 'code', value: 'https://codeobject.com'}},
          {content: 'https://example.com'},
        ],
      };

      const el = renderer.render(details);
      const itemElements = el.querySelectorAll('td.lh-table-column--url');

      // First item's value uses its own type.
      const codeEl = itemElements[0].firstChild;
      assert.equal(codeEl.localName, 'pre');
      assert.ok(codeEl.classList.contains('lh-code'));
      assert.equal(codeEl.textContent, 'https://codeobject.com');

      // Second item uses the heading's specified type for the column.
      const urlEl = itemElements[1].firstChild;
      assert.equal(urlEl.localName, 'div');
      assert.ok(urlEl.classList.contains('lh-text__url'));
      assert.equal(urlEl.title, 'https://example.com');
      assert.equal(urlEl.textContent, 'https://example.com');
    });

    describe('subRows', () => {
      it('renders', () => {
        const details = {
          type: 'table',
          headings: [{key: 'url', itemType: 'url', subRows: {key: 'sources', itemType: 'code'}}],
          items: [
            {url: 'https://www.example.com', sources: ['a', 'b', 'c']},
          ],
        };

        const el = renderer.render(details);
        const columnElement = el.querySelector('td.lh-table-column--url');

        // First element is the url.
        const codeEl = columnElement.firstChild;
        assert.equal(codeEl.localName, 'div');
        assert.ok(codeEl.classList.contains('lh-text__url'));
        assert.equal(codeEl.textContent, 'https://www.example.com');

        // Second element lists the multiple values.
        const subRowsEl = columnElement.children[1];
        assert.equal(subRowsEl.localName, 'div');
        assert.ok(subRowsEl.classList.contains('lh-sub-rows'));

        const multiValueEls = subRowsEl.querySelectorAll('.lh-sub-row');
        assert.equal(multiValueEls[0].textContent, 'a');
        assert.ok(multiValueEls[0].classList.contains('lh-code'));
        assert.equal(multiValueEls[1].textContent, 'b');
        assert.ok(multiValueEls[1].classList.contains('lh-code'));
        assert.equal(multiValueEls[2].textContent, 'c');
        assert.ok(multiValueEls[2].classList.contains('lh-code'));
      });

      it('renders, uses heading properties as fallback', () => {
        const details = {
          type: 'table',
          headings: [{key: 'url', itemType: 'url', subRows: {key: 'sources'}}],
          items: [
            {
              url: 'https://www.example.com',
              sources: [
                'https://www.a.com',
                {type: 'code', value: 'https://www.b.com'},
                'https://www.c.com',
              ],
            },
          ],
        };

        const el = renderer.render(details);
        const columnElement = el.querySelector('td.lh-table-column--url');

        // First element is the url.
        const codeEl = columnElement.firstChild;
        assert.equal(codeEl.localName, 'div');
        assert.ok(codeEl.classList.contains('lh-text__url'));
        assert.equal(codeEl.textContent, 'https://www.example.com');

        // Second element lists the multiple values.
        const subRowsEl = columnElement.children[1];
        assert.equal(subRowsEl.localName, 'div');
        assert.ok(subRowsEl.classList.contains('lh-sub-rows'));

        const multiValueEls = subRowsEl.querySelectorAll('.lh-sub-row');
        assert.equal(multiValueEls[0].textContent, 'https://www.a.com');
        assert.ok(multiValueEls[0].classList.contains('lh-text__url'));
        assert.equal(multiValueEls[1].textContent, 'https://www.b.com');
        assert.ok(multiValueEls[1].classList.contains('lh-code'));
        assert.equal(multiValueEls[2].textContent, 'https://www.c.com');
        assert.ok(multiValueEls[2].classList.contains('lh-text__url'));
      });
    });
  });
});
