/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const jsdom = require('jsdom');
const reportAssets = require('../../report-assets.js');
const DOM = require('../../renderer/dom.js');
const Util = require('../../renderer/util.js');
const I18n = require('../../renderer/i18n.js');

/* eslint-env jest */

describe('DOM', () => {
  let dom;

  beforeAll(() => {
    global.Util = Util;
    global.Util.i18n = new I18n('en', {...Util.UIStrings});
    const {document} = new jsdom.JSDOM(reportAssets.REPORT_TEMPLATES).window;
    dom = new DOM(document);
    dom.setLighthouseChannel('someChannel');
  });

  afterAll(() => {
    global.Util.i18n = undefined;
    global.Util = undefined;
  });

  describe('createElement', () => {
    it('creates a simple element using default values', () => {
      const el = dom.createElement('div');
      assert.equal(el.localName, 'div');
      assert.equal(el.className, '');
      assert.equal(el.hasAttributes(), false);
    });

    it('creates an element from parameters', () => {
      const el = dom.createElement(
          'div', 'class1 class2', {title: 'title attr', tabindex: 0});
      assert.equal(el.localName, 'div');
      assert.equal(el.className, 'class1 class2');
      assert.equal(el.getAttribute('title'), 'title attr');
      assert.equal(el.getAttribute('tabindex'), '0');
    });
  });

  describe('cloneTemplate', () => {
    it('should clone a template', () => {
      const clone = dom.cloneTemplate('#tmpl-lh-metric', dom.document());
      assert.ok(clone.querySelector('.lh-audit'));
    });

    it('should clone a template from a context scope', () => {
      const heading = dom.cloneTemplate('#tmpl-lh-footer', dom.document());
      const items = dom.cloneTemplate('#tmpl-lh-env__items', heading);
      assert.ok(items.querySelector('.lh-env__item'));
    });

    it('fails when template cannot be found', () => {
      assert.throws(() => dom.cloneTemplate('#unknown-selector', dom.document()));
    });

    it('fails when a template context isn\'t provided', () => {
      assert.throws(() => dom.cloneTemplate('#tmpl-lh-metric'));
    });

    it('does not inject duplicate styles', () => {
      const clone = dom.cloneTemplate('#tmpl-lh-snippet', dom.document());
      const clone2 = dom.cloneTemplate('#tmpl-lh-snippet', dom.document());
      assert.ok(clone.querySelector('style'));
      assert.ok(!clone2.querySelector('style'));
    });
  });

  describe('convertMarkdownLinkSnippets', () => {
    it('correctly converts links', () => {
      let result = dom.convertMarkdownLinkSnippets(
          'Some [link](https://example.com/foo). [Learn more](http://example.com).');
      assert.equal(result.innerHTML,
          'Some <a rel="noopener" target="_blank" href="https://example.com/foo">link</a>. ' +
          '<a rel="noopener" target="_blank" href="http://example.com/">Learn more</a>.');

      result = dom.convertMarkdownLinkSnippets('[link](https://example.com/foo)');
      assert.equal(result.innerHTML,
          '<a rel="noopener" target="_blank" href="https://example.com/foo">link</a>',
          'just a link');

      result = dom.convertMarkdownLinkSnippets(
          '[ Link ](https://example.com/foo) and some text afterwards.');
      assert.equal(result.innerHTML,
          '<a rel="noopener" target="_blank" href="https://example.com/foo"> Link </a> ' +
          'and some text afterwards.', 'link with spaces in brackets');
    });

    it('handles invalid urls', () => {
      const text = 'Text has [bad](https:///) link.';
      assert.throws(() => {
        dom.convertMarkdownLinkSnippets(text);
      });
    });

    it('ignores links that do not start with http', () => {
      const snippets = [
        'Sentence with [link](/local/path).',
        'Sentence with [link](javascript:console.log("pwned")).',
        'Sentence with [link](chrome://settings#give-my-your-password).',
      ];

      for (const text of snippets) {
        const result = dom.convertMarkdownLinkSnippets(text);
        assert.equal(result.innerHTML, text);
      }
    });

    it('handles the case of [text]... [text](url)', () => {
      const text = 'Ensuring `<td>` cells using the `[headers]` are good. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/3.1/td-headers-attr).';
      const result = dom.convertMarkdownLinkSnippets(text);
      assert.equal(result.innerHTML, 'Ensuring `&lt;td&gt;` cells using the `[headers]` are ' +
          'good. <a rel="noopener" target="_blank" href="https://dequeuniversity.com/rules/axe/3.1/td-headers-attr">Learn more</a>.');
    });

    it('appends utm params to the URLs with https://developers.google.com origin', () => {
      const text = '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/description).';

      const result = dom.convertMarkdownLinkSnippets(text);
      assert.equal(result.innerHTML, '<a rel="noopener" target="_blank" href="https://developers.google.com/web/tools/lighthouse/audits/description?utm_source=lighthouse&amp;utm_medium=someChannel">Learn more</a>.');
    });

    it('appends utm params to the URLs with https://web.dev origin', () => {
      const text = '[Learn more](https://web.dev/tap-targets/).';

      const result = dom.convertMarkdownLinkSnippets(text);
      assert.equal(result.innerHTML, '<a rel="noopener" target="_blank" href="https://web.dev/tap-targets/?utm_source=lighthouse&amp;utm_medium=someChannel">Learn more</a>.');
    });

    it('doesn\'t append utm params to other (non-docs) origins', () => {
      const text = '[Learn more](https://example.com/info).';

      const result = dom.convertMarkdownLinkSnippets(text);
      assert.equal(result.innerHTML, '<a rel="noopener" target="_blank" href="https://example.com/info">Learn more</a>.');
    });
  });

  describe('convertMarkdownCodeSnippets', () => {
    it('correctly converts links', () => {
      const result = dom.convertMarkdownCodeSnippets(
          'Here is some `code`, and then some `more code`, and yet event `more`.');
      assert.equal(result.innerHTML, 'Here is some <code>code</code>, and then some ' +
          '<code>more code</code>, and yet event <code>more</code>.');
    });
  });
});
